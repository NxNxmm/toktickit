# Lab 4 REST API Specification
**TokTickIT Actions Taken, Dashboards, and Workflow Endpoints**

---

## 1. Overview & General Conventions

This document specifies the authoritative REST API contract for TokTickIT Sprint 4. All endpoints adhere to standard HTTP semantics, consume and produce JSON payloads, enforce session authentication, and apply strict role-based authorization.

### 1.1 Authentication & Authorization
- **Session Identification**: Authenticated requests must include an HTTP-only session cookie (or `Bearer <token>` authorization header).
- **Roles**:
  - `REQUESTER`: Standard service consumer.
  - `IT_STAFF`: Service desk support engineer.
  - `ADMIN`: System administrator (inherits all `IT_STAFF` privileges plus user management & admin dashboard).
- **Strict Role Enforcement**:
  - `401 Unauthorized`: Unauthenticated request or expired session.
  - `403 Forbidden`: Authenticated user lacks required role or ownership.
  - `404 Not Found`: Ticket or action record does not exist.
  - `409 Conflict`: Concurrency conflict (stale ticket update version).
  - `422 Unprocessable Entity`: Semantic domain rule violation (e.g. invalid status jump, or resolution without Actions Taken).
  - `400 Bad Request`: Payload validation failure (missing version, malformed date, empty required string).

### 1.2 Standard Error Response Shape
All error responses throughout the system adhere to a single standardized JSON shape:
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

### 1.3 Absence of DELETE Endpoints
In accordance with service-desk auditability and business rules, **no DELETE endpoints exist** in TokTickIT (`DELETE /api/tickets/:id` and `DELETE /api/tickets/:id/actions-taken/:actionId` are not implemented). Tickets transition through lifecycle statuses (including `CANCELLED`), and Action Taken records are immutable work history entries with technical edit capabilities.

---

## 2. Dashboard Endpoints

### 2.1 Requester Dashboard Data
Retrieves authoritative summary metrics and recent tickets for the authenticated Requester.

- **Method**: `GET`
- **Path**: `/api/dashboard/requester`
- **Allowed Roles**: `REQUESTER` (Requesters only)
- **Headers**: `Cookie: session_token=...`

#### Request Parameters
*None.* Scoped automatically and strictly to `req.session.userId`.

#### Calculation Rules (UTC Rolling Windows):
- `totalOpen`: Count of owned tickets with `status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER')`.
- `waitingForRequester`: Count of owned tickets with `status == 'WAITING_FOR_REQUESTER'`.
- `recentlyUpdated`: Count of owned tickets where `updatedAt >= NOW() - 7 days` (rolling 7 days: `Date.now() - 7 * 86,400,000` ms).
- `recentlyResolved`: Count of owned tickets where `status == 'RESOLVED'` and `updatedAt >= NOW() - 30 days` (rolling 30 days: `Date.now() - 30 * 86,400,000` ms). **Strictly excludes `CLOSED`** to eliminate overlap.

#### Success Response: `200 OK`
```json
{
  "metrics": {
    "totalOpen": 3,
    "waitingForRequester": 1,
    "recentlyUpdated": 2,
    "recentlyResolved": 5
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
- `401 Unauthorized`:
  ```json
  { "error": { "code": "UNAUTHORIZED", "message": "Authentication required." } }
  ```
- `403 Forbidden`:
  ```json
  { "error": { "code": "FORBIDDEN", "message": "Access restricted to Requester accounts." } }
  ```

---

### 2.2 IT Staff Dashboard Data
Retrieves operational triage counts and recent queue activity across all system tickets.

- **Method**: `GET`
- **Path**: `/api/dashboard/staff`
- **Allowed Roles**: `IT_STAFF`, `ADMIN`
- **Headers**: `Cookie: session_token=...`

#### Calculation Rules:
- `newTickets`: Count of all tickets where `status == 'NEW'`.
- `openTickets`: Count of all tickets where `status == 'OPEN'`.
- `inProgressTickets`: Count of all tickets where `status == 'IN_PROGRESS'`.
- `waitingForRequesterTickets`: Count of all tickets where `status == 'WAITING_FOR_REQUESTER'`.
- `myAssignedTickets`: Count of tickets where `assignedStaffId == req.session.userId` and `status IN ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')`. **Explicitly excludes `RESOLVED`, `CLOSED`, and `CANCELLED`**.

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
- `403 Forbidden`: User is a Requester or inactive account.

---

### 2.3 Administrator Dashboard Data
Retrieves operational triage counts plus user account summary statistics.

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

#### Error Responses
- `401 Unauthorized`: Unauthenticated.
- `403 Forbidden`: User lacks Administrator role.

---

## 3. Actions Taken Endpoints

### 3.1 List Actions Taken for Ticket
Lists all Action Taken work items recorded under a ticket, sorted chronologically descending (`actionDateTime` DESC, secondary `createdAt` DESC).

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
- `performedById`: **Derived automatically** from session. Any client-sent `performedById` is ignored. Inactive accounts are rejected with 403 (**BR-04**).
- `followUpRequired`: Required boolean.
- `followUpNote`:
  - If `followUpRequired == true`: Required non-empty string (3–1000 characters).
  - If `followUpRequired == false`: **Strictly set to `null`** in database (client input cleared).
- `attachmentNotes`: Optional string (up to 500 characters).

#### Success Response: `201 Created`
Returns the created `ActionTaken` entity including the populated `performedBy` user object.

#### Error Responses
- `400 Bad Request`: Validation failure:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validation failed on one or more fields.",
      "details": [
        { "field": "followUpNote", "message": "Follow-up note cannot be blank when follow-up is required." }
      ]
    }
  }
  ```
- `401 Unauthorized`: Not logged in.
- `403 Forbidden`: Caller has `REQUESTER` role or is an inactive account.
- `404 Not Found`: Ticket not found.

---

### 3.3 Update Action Taken Record
Updates an existing Action Taken record following **Last-Write-Wins (LWW)** semantics.

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
- `403 Forbidden`: Requester role or deactivated account.
- `404 Not Found`: Ticket or Action Taken record not found.

---

## 4. Ticket Workflow & Concurrency Endpoints

### 4.1 Update Ticket Workflow & Status Transition
Transitions ticket status, calibrates priority, or records advisory resolution with optimistic concurrency protection.

- **Method**: `PATCH`
- **Path**: `/api/tickets/:id/workflow`
- **Allowed Roles**: 
  - `REQUESTER` (Only for advisory resolution note `isRequesterAdvisory: true`; cannot transition status to `RESOLVED` or `CLOSED`)
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

#### Business Rules & Strict Evaluation Order:
The backend evaluates workflow mutations in the following exact sequence:
1. **Step 1: `401 Unauthorized`** (User authentication check).
2. **Step 2: `403 Forbidden`** (Role check):
   - If caller is `REQUESTER` and attempts any status transition (e.g. `status === "RESOLVED"` or `"CLOSED"`), return 403.
   - If caller is `REQUESTER` attempting advisory resolution on a ticket they do NOT own, return 403.
3. **Step 3: `400 Bad Request`** (Syntactic / Schema validation):
   - Missing `version` parameter.
   - Invalid status string not recognized in `TicketStatus` enum.
4. **Step 4: `409 Conflict`** (Optimistic Concurrency check):
   - If `submittedVersion !== ticket.version`, reject immediately without database mutation.
5. **Step 5: `422 Unprocessable Entity`** (Semantic Domain Rules):
   - If status transition is not permitted by BR-08 transition matrix, return 422 (`code: "INVALID_STATUS_TRANSITION"`).
   - If target status is `RESOLVED` or `CLOSED` and ticket has zero Actions Taken records, return 422 (`code: "RESOLUTION_REQUIRES_ACTION_TAKEN"`).

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
- `400 Bad Request`:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Version number is required for optimistic concurrency control."
    }
  }
  ```
- `401 Unauthorized`:
  ```json
  {
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Authentication required."
    }
  }
  ```
- `403 Forbidden`:
  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "Requesters cannot set ticket status to Resolved or Closed."
    }
  }
  ```
- `404 Not Found`:
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "Ticket not found."
    }
  }
  ```
- `409 Conflict`:
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
- `422 Unprocessable Entity` (Actions Taken Prerequisite):
  ```json
  {
    "error": {
      "code": "RESOLUTION_REQUIRES_ACTION_TAKEN",
      "message": "A ticket cannot be resolved or closed without at least one recorded Action Taken documenting the work performed."
    }
  }
  ```
- `422 Unprocessable Entity` (Invalid Matrix Transition):
  ```json
  {
    "error": {
      "code": "INVALID_STATUS_TRANSITION",
      "message": "Status transition from NEW to CLOSED is not permitted by the status transition matrix."
    }
  }
  ```
