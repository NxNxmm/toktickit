# Lab 3 REST API Specification

## 1. Overview & Global Conventions

The TokTickIT Lab 3 API delivers enterprise authentication, role-based access control (RBAC), operational IT Staff workflows, and administrator user management. All endpoints consume and emit standard JSON payloads with consistent HTTP status codes and uniform error structures.

### 1.1 Authentication & Session Handling
- **Mechanism**: Authenticated sessions are established upon login and transmitted via standard `Authorization: Bearer <token>` header or secure HTTP-only session cookie `toktickit_session`.
- **Token Payload**: Contains `userId`, `email`, `role`, and `requiresPasswordChange`.
- **Decoupling**: The server validates the token on every request, verifying that the user exists and is active (`isActive = true`).
- **First-Login Constraint**: If `requiresPasswordChange = true`, calls to any operational endpoint outside of `/api/auth/me`, `/api/auth/logout`, and `/api/auth/change-password` return HTTP 403 Forbidden with error code `PASSWORD_CHANGE_REQUIRED`.
- **Property Standardization**: The property name `requiresPasswordChange` is strictly used across all endpoints, database fields, and token payloads (no deprecated variants such as `mustChangePassword`).

### 1.2 Standard Error Response Shape
All 4xx and 5xx error responses return standard structured JSON:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed on user creation",
  "details": [
    {
      "field": "email",
      "message": "Email address already in use"
    }
  ],
  "timestamp": "2026-09-17T08:00:00.000Z"
}
```

---

## 2. Authentication & Profile Endpoints

### 2.1 User Login
Authenticate credentials, verify account is active, and initiate a session.
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "email": "alex.turner@toktickit.kmutt.ac.th",
  "password": "Password123!"
}
```
- **Response 200 OK**:
```json
{
  "user": {
    "id": 5,
    "name": "Alex Turner",
    "email": "alex.turner@toktickit.kmutt.ac.th",
    "role": "IT_STAFF",
    "requiresPasswordChange": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsIn..."
}
```
- **Errors**: `400 Bad Request` (malformed input), `401 Unauthorized` ("Invalid email or password" for wrong password or inactive account).

### 2.2 Get Current User Identity
Retrieve profile information for the currently authenticated session.
- **Endpoint**: `GET /api/auth/me`
- **Access**: Authenticated (`REQUESTER`, `IT_STAFF`, `ADMIN`)
- **Response 200 OK**:
```json
{
  "id": 5,
  "name": "Alex Turner",
  "email": "alex.turner@toktickit.kmutt.ac.th",
  "role": "IT_STAFF",
  "requiresPasswordChange": false
}
```
- **Errors**: `401 Unauthorized` (missing/expired session).

### 2.3 User Logout
Terminate current session and invalidate credentials.
- **Endpoint**: `POST /api/auth/logout`
- **Access**: Authenticated
- **Response 200 OK**:
```json
{
  "message": "Logged out successfully"
}
```

### 2.4 Change Password
Update user password (mandatory for first-time login or administrative reset).
- **Endpoint**: `POST /api/auth/change-password`
- **Access**: Authenticated
- **Request Body**:
```json
{
  "currentPassword": "InitialPassword123!",
  "newPassword": "NewSecurePassword456!"
}
```
- **Response 200 OK**:
```json
{
  "message": "Password updated successfully",
  "requiresPasswordChange": false
}
```
- **Errors**: `400 Bad Request` (password does not satisfy complexity policy or wrong current password).

---

## 3. Requester Ticket & Comment Endpoints

### 3.1 Get Requester Tickets
List tickets belonging exclusively to the authenticated requester.
- **Endpoint**: `GET /api/tickets`
- **Access**: `REQUESTER`
- **Query Parameters**: `page` (default 1), `pageSize` (default 10), `search`, `category`, `status`
- **Response 200 OK**:
```json
{
  "tickets": [
    {
      "id": 1,
      "ticketNo": "TKT-2026-000001",
      "summary": "Cannot connect to campus Wi-Fi",
      "category": { "id": 4, "name": "Network" },
      "requestedPriority": "HIGH",
      "currentStatus": "IN_PROGRESS",
      "createdAt": "2026-09-17T08:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalCount": 1,
    "totalPages": 1
  }
}
```

### 3.2 Create Ticket
Create a ticket using the authenticated user's ID as `requesterId`.
- **Endpoint**: `POST /api/tickets`
- **Access**: `REQUESTER`
- **Request Body**:
```json
{
  "categoryId": 4,
  "relatedSystemId": 2,
  "requestedPriority": "HIGH",
  "summary": "Campus Wi-Fi drops intermittently",
  "description": "Connecting in building CB2 drops connection every 5 minutes."
}
```
- **Response 201 Created**: Returns created ticket object with status `NEW`.

### 3.3 Get Requester Ticket Detail
Retrieve full details for an owned ticket. Crucially, the response includes attachments and Public Comments, but **strictly omits `internalNotes`**.
- **Endpoint**: `GET /api/tickets/:id`
- **Access**: Ticket Owner (`REQUESTER`), `IT_STAFF`, `ADMIN`
- **Response 200 OK**:
```json
{
  "id": 1,
  "ticketNo": "TKT-2026-000001",
  "summary": "Campus Wi-Fi drops intermittently",
  "description": "Connecting in building CB2 drops connection every 5 minutes.",
  "requestedPriority": "HIGH",
  "currentStatus": "IN_PROGRESS",
  "resolvedIndicated": false,
  "resolvedIndicatedAt": null,
  "createdAt": "2026-09-17T08:30:00.000Z",
  "updatedAt": "2026-09-17T09:00:00.000Z",
  "category": { "id": 4, "name": "Network" },
  "relatedSystem": { "id": 2, "name": "Campus Wi-Fi" },
  "requester": {
    "id": 2,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@kmutt.ac.th"
  },
  "attachments": [
    {
      "id": 1,
      "originalName": "wifi-error.png",
      "fileSize": 1048576,
      "mimeType": "image/png",
      "isRemoved": false
    }
  ],
  "publicComments": [
    {
      "id": 10,
      "author": { "id": 2, "name": "Jennifer Anderson", "role": "REQUESTER" },
      "content": "Added a screenshot of the disconnect dialog.",
      "createdAt": "2026-09-17T08:45:00.000Z"
    }
  ]
}
```
- **Errors**: `403 Forbidden` / `404 Not Found` (when a Requester requests another user's ticket).

### 3.4 Get Ticket Public Comments
Retrieve only the public comments thread for a ticket.
- **Endpoint**: `GET /api/tickets/:id/comments`
- **Access**: Ticket Owner (`REQUESTER`), `IT_STAFF`, `ADMIN`
- **Response 200 OK**:
```json
[
  {
    "id": 10,
    "ticketId": 1,
    "author": { "id": 2, "name": "Jennifer Anderson", "role": "REQUESTER" },
    "content": "Added a screenshot of the disconnect dialog.",
    "createdAt": "2026-09-17T08:45:00.000Z"
  }
]
```

### 3.5 Post Public Comment
Append a public comment to a ticket.
- **Endpoint**: `POST /api/tickets/:id/comments`
- **Access**: Ticket Owner (`REQUESTER`), `IT_STAFF`, or `ADMIN`
- **Request Body**:
```json
{
  "content": "I noticed the disconnect happens specifically in room 401."
}
```
- **Response 201 Created**:
```json
{
  "id": 12,
  "ticketId": 1,
  "author": {
    "id": 2,
    "name": "Jennifer Anderson",
    "role": "REQUESTER"
  },
  "content": "I noticed the disconnect happens specifically in room 401.",
  "createdAt": "2026-09-17T09:15:00.000Z"
}
```
- **Errors**: `400 Bad Request` (content empty or > 2000 chars), `403 Forbidden` (non-owner requester).

### 3.6 Problem Appears Resolved Indication
Requester signals problem appears solved without modifying formal status.
- **Endpoint**: `POST /api/tickets/:id/resolve-indication`
- **Access**: Ticket Owner (`REQUESTER`)
- **Response 200 OK**:
```json
{
  "message": "Resolution indication recorded",
  "resolvedIndicated": true,
  "resolvedIndicatedAt": "2026-09-17T10:00:00.000Z"
}
```

---

## 4. IT Staff Ticket Operations Endpoints

### 4.0 Get Assignable IT Staff / Admins
List active `IT_STAFF` and `ADMIN` users eligible for primary ticket ownership (BR-08). Powers the Ticket Owner dropdown on the Staff Ticket Detail screen.
- **Endpoint**: `GET /api/staff/assignees`
- **Access**: `IT_STAFF`, `ADMIN`
- **Response 200 OK**:
```json
[
  {
    "id": 5,
    "name": "Alex Turner",
    "email": "alex.turner@toktickit.kmutt.ac.th",
    "role": "IT_STAFF"
  },
  {
    "id": 9,
    "name": "System Admin",
    "email": "admin@toktickit.kmutt.ac.th",
    "role": "ADMIN"
  }
]
```
- **Errors**: `403 Forbidden` (Requesters attempting access).

### 4.1 IT Staff Ticket Queue
Fetch paginated tickets across all requesters with filtering and sorting.
- **Endpoint**: `GET /api/staff/tickets`
- **Access**: `IT_STAFF`, `ADMIN`
- **Query Parameters**:
  - `page`: integer (default 1)
  - `pageSize`: integer (10, 20, 50; default 10)
  - `search`: string (ticketNo or summary)
  - `categoryId`: integer
  - `status`: string (`NEW`, `OPEN`, `IN_PROGRESS`, etc.)
  - `requestedPriority`: string (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - `itPriority`: string (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - `ownerId`: integer or `"unassigned"`
  - `sortBy`: string (`createdAt`, `itPriority`, `currentStatus`, `ticketNo`; default `createdAt`)
  - `sortOrder`: `"asc"` | `"desc"` (default `"desc"`)
- **Response 200 OK**:
```json
{
  "tickets": [
    {
      "id": 1,
      "ticketNo": "TKT-2026-000001",
      "summary": "Campus Wi-Fi drops intermittently",
      "category": { "id": 4, "name": "Network" },
      "requester": { "id": 2, "name": "Jennifer Anderson", "email": "jennifer.anderson@kmutt.ac.th" },
      "owner": { "id": 5, "name": "Alex Turner" },
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "currentStatus": "IN_PROGRESS",
      "resolvedIndicated": false,
      "createdAt": "2026-09-17T08:30:00.000Z",
      "updatedAt": "2026-09-17T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalCount": 42,
    "totalPages": 5
  }
}
```
- **Errors**: `403 Forbidden` (Requesters attempting access).

### 4.2 Get IT Staff Ticket Detail
Retrieve full operational details for a ticket, including attachments, public comments, **and confidential internal notes**.
- **Endpoint**: `GET /api/staff/tickets/:id`
- **Access**: `IT_STAFF`, `ADMIN`
- **Response 200 OK**:
```json
{
  "id": 1,
  "ticketNo": "TKT-2026-000001",
  "summary": "Campus Wi-Fi drops intermittently",
  "description": "Connecting in building CB2 drops connection every 5 minutes.",
  "requestedPriority": "HIGH",
  "itPriority": "HIGH",
  "currentStatus": "IN_PROGRESS",
  "resolvedIndicated": false,
  "resolvedIndicatedAt": null,
  "createdAt": "2026-09-17T08:30:00.000Z",
  "updatedAt": "2026-09-17T09:00:00.000Z",
  "category": { "id": 4, "name": "Network" },
  "relatedSystem": { "id": 2, "name": "Campus Wi-Fi" },
  "requester": {
    "id": 2,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@kmutt.ac.th"
  },
  "owner": {
    "id": 5,
    "name": "Alex Turner",
    "email": "alex.turner@toktickit.kmutt.ac.th"
  },
  "attachments": [
    {
      "id": 1,
      "originalName": "wifi-error.png",
      "fileSize": 1048576,
      "mimeType": "image/png",
      "isRemoved": false
    }
  ],
  "publicComments": [
    {
      "id": 10,
      "author": { "id": 2, "name": "Jennifer Anderson", "role": "REQUESTER" },
      "content": "Added a screenshot of the disconnect dialog.",
      "createdAt": "2026-09-17T08:45:00.000Z"
    }
  ],
  "internalNotes": [
    {
      "id": 3,
      "author": { "id": 5, "name": "Alex Turner", "role": "IT_STAFF" },
      "content": "Network engineer rebooted the CB2 AP switch at 09:00.",
      "createdAt": "2026-09-17T09:02:00.000Z"
    }
  ]
}
```
- **Errors**: `403 Forbidden` (Requesters attempting access).

### 4.3 Claim or Reassign Ticket Ownership
Assign primary ticket ownership to an active IT Staff or Administrator.
- **Endpoint**: `PATCH /api/staff/tickets/:id/ownership`
- **Access**: `IT_STAFF`, `ADMIN`
- **Request Body**:
```json
{
  "ownerId": 5
}
```
*(Passing `ownerId = null` sets ticket to unassigned)*
- **Response 200 OK**: Returns updated ticket with new owner.
- **Errors**: `400 Bad Request` (owner is not an active staff/admin), `403 Forbidden`.

### 4.4 Update IT Priority
Calibrate the internal operational priority of a ticket.
- **Endpoint**: `PATCH /api/staff/tickets/:id/priority`
- **Access**: `IT_STAFF`, `ADMIN`
- **Request Body**:
```json
{
  "itPriority": "URGENT"
}
```
- **Response 200 OK**: Returns updated ticket with new IT priority.

### 4.5 Update Ticket Status
Transition ticket through permitted state workflow.
- **Endpoint**: `PATCH /api/staff/tickets/:id/status`
- **Access**: `IT_STAFF`, `ADMIN`
- **Request Body**:
```json
{
  "status": "RESOLVED"
}
```
- **Response 200 OK**: Returns updated ticket with new status.
- **Errors**: `422 Unprocessable Entity` (transition violates state transition matrix).

### 4.6 Internal Notes (Get & Post)
Retrieve and create confidential operational notes.
- **Endpoints**:
  - `GET /api/tickets/:id/notes`
  - `POST /api/tickets/:id/notes`
- **Access**: `IT_STAFF`, `ADMIN` (Strictly rejected with `403 Forbidden` for `REQUESTER`)
- **Request Body for POST**:
```json
{
  "content": "Rebooted access point AP-CB2-401. Signal strength returned to normal."
}
```
- **Response 201 Created**: Returns created internal note object.

---

## 5. Administrator User Management Endpoints

### 5.1 List Users
Retrieve user directory with optional search and role filtering.
- **Endpoint**: `GET /api/admin/users`
- **Access**: `ADMIN`
- **Query Parameters**: `search` (name or email), `role` (`REQUESTER`, `IT_STAFF`, `ADMIN`)
- **Response 200 OK**:
```json
[
  {
    "id": 1,
    "name": "System Admin",
    "email": "admin@toktickit.kmutt.ac.th",
    "role": "ADMIN",
    "isActive": true,
    "requiresPasswordChange": false,
    "createdAt": "2026-09-01T00:00:00.000Z"
  }
]
```
- **Errors**: `403 Forbidden` for non-admin users.

### 5.2 Create User
Create a new user account with initial password.
- **Endpoint**: `POST /api/admin/users`
- **Access**: `ADMIN`
- **Request Body**:
```json
{
  "name": "David Smith",
  "email": "david.smith@toktickit.kmutt.ac.th",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "InitialPassword123!"
}
```
- **Response 201 Created**: Returns created user (password hash excluded) with `requiresPasswordChange = true`.
- **Errors**: `400 Bad Request` (validation failure), `409 Conflict` (duplicate email).

### 5.3 Edit User
Update user name, email, role, or active status.
- **Endpoint**: `PATCH /api/admin/users/:id`
- **Access**: `ADMIN`
- **Request Body**:
```json
{
  "name": "David Smith",
  "email": "david.smith@toktickit.kmutt.ac.th",
  "role": "IT_STAFF",
  "isActive": false
}
```
- **Response 200 OK**: Returns updated user object.
- **Errors**:
  - `409 Conflict`: Duplicate email.
  - `422 Unprocessable Entity`: Admin attempting self-deactivation (`userId == currentAdmin.id`).
  - `422 Unprocessable Entity`: Attempting to deactivate or change role of the last active Administrator.

### 5.4 Reset User Initial Password
Reset a user's password to a temporary password, forcing a change on next login.
- **Endpoint**: `POST /api/admin/users/:id/reset-password`
- **Access**: `ADMIN`
- **Request Body**:
```json
{
  "newInitialPassword": "TemporaryPass123!"
}
```
- **Response 200 OK**:
```json
{
  "message": "Initial password reset successfully",
  "requiresPasswordChange": true
}
```
