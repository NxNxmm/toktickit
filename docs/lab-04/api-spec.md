# Lab 4 REST API Specification
**TokTickIT Actions Taken, Dashboards, and Workflow Endpoints**

---

## 1. Overview & General Conventions

This document specifies the REST API contract for TokTickIT Sprint 4. All endpoints adhere to standard HTTP semantics, use JSON payloads, and enforce session authentication and strict role-based access control.

### 1.1 Authentication & Authorization
- **Session Identification**: Authenticated requests must include the HTTP-only session cookie (or `Bearer <token>` header).
- **Roles**:
  - `REQUESTER`: Standard service consumer.
  - `IT_STAFF`: Service desk support engineer.
  - `ADMIN`: System administrator (inherits all `IT_STAFF` privileges).
- **Error Codes**:
  - `401 Unauthorized`: Unauthenticated request or expired session.
  - `403 Forbidden`: Authenticated user lacks required role or ownership.
  - `404 Not Found`: Ticket or action record does not exist.
  - `409 Conflict`: Concurrency conflict (stale ticket update).
  - `400 Bad Request`: Payload validation failure with detailed field messages.

### 1.2 Standard Error Response Shape
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed on one or more fields.",
    "details": [
      { "field": "followUpNote", "message": "Follow-up note is required when follow-up is requested." }
    ]
  }
}
```

---

## 2. Dashboard Endpoints

### 2.1 Requester Dashboard Data
Retrieves authoritative summary metrics and recent tickets for the authenticated Requester.

- **Method**: `GET`
- **Path**: `/api/dashboard/requester`
- **Allowed Roles**: `REQUESTER` (Requesters only)
- **Headers**: `Cookie: session_token=...`

#### Request Parameters
*None.* Scoped automatically to `req.session.userId`.

#### Success Response: `200 OK`
```json
{
  "metrics": {
    "totalOpen": 3,
    "inProgress": 1,
    "waitingForRequester": 1,
    "recentlyResolved": 5,
    "closed": 12
  },
  "recentTickets": [
    {
      "id": "c7a8b3e2-...",
      "ticketNumber": "TKT-2026-001234",
      "title": "Laptop battery drains quickly",
      "status": "IN_PROGRESS",
      "requestedPriority": "MEDIUM",
      "updatedAt": "2026-05-12T09:14:00.000Z"
    }
  ]
}
```

#### Error Responses
- `401 Unauthorized`: User is not authenticated.
- `403 Forbidden`: User role is not `REQUESTER`.

---

### 2.2 IT Staff Dashboard Data
Retrieves operational triage counts and recent queue activity across all tickets.

- **Method**: `GET`
- **Path**: `/api/dashboard/staff`
- **Allowed Roles**: `IT_STAFF`, `ADMIN`
- **Headers**: `Cookie: session_token=...`

#### Success Response: `200 OK`
```json
{
  "metrics": {
    "newTickets": 14,
    "openTickets": 23,
    "inProgressTickets": 18,
    "waitingForRequesterTickets": 7,
    "myAssignedTickets": 16
  },
  "recentTickets": [
    {
      "id": "d9e8f7a6-...",
      "ticketNumber": "TKT-2026-000234",
      "title": "Printer large drawing offline",
      "status": "OPEN",
      "itPriority": "HIGH",
      "assignedStaff": {
        "id": "u1-...",
        "name": "Michael IT"
      },
      "requester": {
        "id": "u2-...",
        "name": "Jennifer Requester"
      },
      "updatedAt": "2026-05-12T10:15:00.000Z"
    }
  ]
}
```

#### Error Responses
- `401 Unauthorized`: User is not authenticated.
- `403 Forbidden`: Authenticated user is `REQUESTER`.

---

### 2.3 Administrator Dashboard Data
Retrieves operational triage counts plus high-level user account statistics.

- **Method**: `GET`
- **Path**: `/api/dashboard/admin`
- **Allowed Roles**: `ADMIN`

#### Success Response: `200 OK`
```json
{
  "operational": {
    "newTickets": 14,
    "openTickets": 23,
    "inProgressTickets": 18,
    "waitingForRequesterTickets": 7,
    "myAssignedTickets": 5
  },
  "userStats": {
    "activeRequesters": 45,
    "activeStaff": 8,
    "activeAdmins": 2,
    "totalUsers": 55
  }
}
```

---

## 3. Actions Taken Endpoints

### 3.1 List Actions Taken for Ticket
Lists all Action Taken work items recorded under a ticket, sorted chronologically.

- **Method**: `GET`
- **Path**: `/api/tickets/:id/actions-taken`
- **Allowed Roles**: 
  - `REQUESTER` (Must be the owner of the ticket)
  - `IT_STAFF`, `ADMIN` (Can view on any accessible ticket)

#### Success Response: `200 OK`
```json
{
  "ticketId": "c7a8b3e2-...",
  "actionsTaken": [
    {
      "id": "act-101-...",
      "ticketId": "c7a8b3e2-...",
      "actionDateTime": "2026-05-12T10:30:00.000Z",
      "description": "Replaced thermal paste and dusted internal heatsink.",
      "result": "Completed diagnostic stress test. CPU temperatures stabilized under 70C.",
      "performedBy": {
        "id": "staff-02-...",
        "name": "Sarah Technician",
        "email": "sarah.tech@toktickit.kmutt.ac.th",
        "role": "IT_STAFF"
      },
      "followUpRequired": true,
      "followUpNote": "Check battery discharge rates tomorrow morning.",
      "attachmentNotes": "Thermal benchmark log thermal_run1.txt in share",
      "createdAt": "2026-05-12T10:35:00.000Z",
      "updatedAt": "2026-05-12T10:35:00.000Z"
    }
  ]
}
```

#### Error Responses
- `401 Unauthorized`: Not logged in.
- `403 Forbidden`: Requester trying to view another user's ticket actions.
- `404 Not Found`: Ticket ID does not exist.

---

### 3.2 Create Action Taken Record
Creates a new work entry under a Ticket.

- **Method**: `POST`
- **Path**: `/api/tickets/:id/actions-taken`
- **Allowed Roles**: `IT_STAFF`, `ADMIN` (Requesters forbidden)

#### Request Body Schema
```json
{
  "actionDateTime": "2026-05-12T10:30:00.000Z",
  "description": "Inspected network wall jack in building 3 floor 2.",
  "result": "Re-crimped RJ45 connector and restored 1Gbps link.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "Cable tester photo cable_test.jpg"
}
```

#### Field Validation Rules:
- `actionDateTime`: Required ISO 8601 string. Cannot be in the future (> 5 min allowance). Defaults to `now()` if omitted.
- `description`: Required string, 5–2000 characters.
- `result`: Required string, 3–1000 characters.
- `performedById`: **Derived automatically** from session. Any client-sent `performedById` is ignored.
- `followUpRequired`: Required boolean.
- `followUpNote`:
  - If `followUpRequired == true`: Required non-empty string (3–1000 characters).
  - If `followUpRequired == false`: Optional string or null.
- `attachmentNotes`: Optional string (up to 500 characters).

#### Success Response: `201 Created`
Returns the created `ActionTaken` object including the populated `performedBy` user object.

#### Error Responses
- `400 Bad Request`: Validation failure (e.g. missing follow-up note when required, future date).
- `401 Unauthorized`: Not logged in.
- `403 Forbidden`: Caller has `REQUESTER` role or is deactivated.
- `404 Not Found`: Ticket not found.

---

### 3.3 Update Action Taken Record
Updates an existing Action Taken record.

- **Method**: `PATCH`
- **Path**: `/api/tickets/:id/actions-taken/:actionId`
- **Allowed Roles**: `IT_STAFF`, `ADMIN`

#### Request Body Schema
```json
{
  "actionDateTime": "2026-05-12T10:30:00.000Z",
  "description": "Updated description with additional benchmark details.",
  "result": "Pass - battery health verified at 94%.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "Updated log file benchmark_final.txt"
}
```

#### Success Response: `200 OK`
Returns the updated `ActionTaken` entity.

#### Error Responses
- `400 Bad Request`: Validation failed.
- `401 Unauthorized`: Not logged in.
- `403 Forbidden`: Requester role or deactivated staff.
- `404 Not Found`: Ticket or Action Taken record not found.

---

## 4. Ticket Workflow & Concurrency Endpoints

### 4.1 Update Ticket Workflow & Status Transition
Transitions ticket status, calibrates priority, or records advisory resolution with optimistic concurrency protection.

- **Method**: `PATCH`
- **Path**: `/api/tickets/:id/workflow`
- **Allowed Roles**: 
  - `REQUESTER` (Only for advisory resolution note; cannot transition status to `RESOLVED`)
  - `IT_STAFF`, `ADMIN` (Full status transition matrix)

#### Request Body Schema
```json
{
  "status": "RESOLVED",
  "itPriority": "HIGH",
  "resolutionNote": "Replaced RAM module. Problem resolved and verified.",
  "isRequesterAdvisory": false,
  "version": 3
}
```

#### Validation & Business Rules:
1. **Optimistic Locking**:
   - `version` is **mandatory**.
   - If `version` does not match the database `version`, reject immediately with `409 Conflict`.
2. **Resolution Authority Gate**:
   - If `status == "RESOLVED"` or `"CLOSED"` and caller role is `REQUESTER`:
     - Reject with `403 Forbidden` (`message: "Requesters cannot set ticket status to Resolved."`).
3. **Requester Advisory Resolution**:
   - If `isRequesterAdvisory == true` and caller is `REQUESTER`:
     - Do NOT mutate `Ticket.status`.
     - Append an advisory comment: `[Requester Feedback: Problem Appears Resolved]`.
     - Increment `version` and return `200 OK`.
4. **Permitted Status Transition Matrix**:
   - Check `currentStatus -> targetStatus` validity against BR-08. If invalid, return `400 Bad Request`.

#### Success Response: `200 OK`
```json
{
  "id": "c7a8b3e2-...",
  "status": "RESOLVED",
  "version": 4,
  "updatedAt": "2026-05-12T11:00:00.000Z",
  "message": "Ticket status successfully updated."
}
```

#### Error Responses
- `400 Bad Request`: Invalid transition (e.g. `NEW -> CLOSED`).
- `401 Unauthorized`: Not logged in.
- `403 Forbidden`: Unauthorized role transition attempt.
- `404 Not Found`: Ticket not found.
- `409 Conflict`: Concurrency conflict:
  ```json
  {
    "error": {
      "code": "CONCURRENCY_CONFLICT",
      "message": "The ticket was updated by another user. Please refresh and review latest changes.",
      "currentVersion": 4,
      "submittedVersion": 3
    }
  }
  ```
