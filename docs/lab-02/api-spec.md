# Lab 2 REST API Specification

## 1. Overview & Global Conventions

The TokTickIT Lab 2 API provides backend services supporting the Requester-facing IT Ticketing MVP. All endpoints follow REST principles with standard JSON payloads, consistent error reporting, and testing identity emulation.

### 1.1 Authentication & Context Header
Because production authentication arrives in Lab 3, Sprint 2 uses the `X-Requester-Id` header to identify the active Development Requester:
```http
X-Requester-Id: <integer>
```
- **Validation**: If `X-Requester-Id` is missing, invalid, or belongs to an inactive requester, the API responds with `401 Unauthorized` or `403 Forbidden`.
- **Decoupling**: This header is abstracted at the controller/middleware layer, allowing seamless migration to `Authorization: Bearer <jwt>` in Lab 3 without rewriting service business logic.

### 1.2 Standard Error Response Shape
All 4xx and 5xx error responses conform to the following schema:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed on ticket submission",
  "details": [
    {
      "field": "summary",
      "message": "Summary must be between 5 and 150 characters"
    }
  ],
  "timestamp": "2026-09-04T15:30:00.000Z"
}
```

---

## 2. Reference Data & Development Requester APIs

### 2.1 Get Active Development Requesters
Retrieve the list of active requesters to populate the Development Requester selection dropdown. Inactive requesters (`isActive: false`) are strictly excluded.

- **Endpoint**: `GET /api/requesters/active`
- **Headers**: None required
- **Response 200 OK**:
```json
[
  {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@kmutt.ac.th",
    "department": "Engineering"
  },
  {
    "id": 2,
    "name": "Michael Brown",
    "email": "michael.brown@kmutt.ac.th",
    "department": "Human Resources"
  },
  {
    "id": 3,
    "name": "Sarah Johnson",
    "email": "sarah.johnson@kmutt.ac.th",
    "department": "Finance"
  },
  {
    "id": 4,
    "name": "David Lee",
    "email": "david.lee@kmutt.ac.th",
    "department": "Marketing"
  }
]
```

---

### 2.2 Get Active Ticket Categories
Retrieve all available ticket categories for classification dropdowns.

- **Endpoint**: `GET /api/categories`
- **Headers**: None required
- **Response 200 OK**:
```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

---

### 2.3 Get Active Related Systems
Retrieve all active related systems (services, devices, or platforms affected by tickets).

- **Endpoint**: `GET /api/related-systems`
- **Headers**: None required
- **Response 200 OK**:
```json
[
  { "id": 1, "name": "Email" },
  { "id": 2, "name": "Campus Wi-Fi" },
  { "id": 3, "name": "VPN" },
  { "id": 4, "name": "LEB2 App" },
  { "id": 5, "name": "Grade Submission App" },
  { "id": 6, "name": "Printer" },
  { "id": 7, "name": "Corporate Laptop" }
]
```

---

## 3. Tickets API

### 3.1 Create a Ticket
Create a new support ticket associated with the requester identified in the `X-Requester-Id` header. Generates a unique Ticket Number and sets status to `NEW`.

- **Endpoint**: `POST /api/tickets`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Requester-Id: <id>`
- **Request Body**:
```json
{
  "categoryId": 2,
  "relatedSystemId": 7,
  "requestedPriority": "MEDIUM",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update."
}
```
- **Validation Rules**:
  - `categoryId`: Required integer, must exist in `Category` table.
  - `relatedSystemId`: Required integer, must exist in `RelatedSystem` table.
  - `requestedPriority`: Required enum (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - `summary`: Required string, trimmed, 5 to 150 characters.
  - `description`: Required string, trimmed, 10 to 2000 characters.

- **Response 201 Created**:
```json
{
  "id": 1,
  "ticketNo": "TKT-2026-001234",
  "requesterId": 1,
  "categoryId": 2,
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystemId": 7,
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update.",
  "requestedPriority": "MEDIUM",
  "itPriority": null,
  "currentStatus": "NEW",
  "createdAt": "2026-09-04T10:00:00.000Z",
  "updatedAt": "2026-09-04T10:00:00.000Z",
  "attachments": []
}
```
- **Response 400 Bad Request**: Input validation failure.
- **Response 403 Forbidden**: Inactive requester or invalid identity.

---

### 3.2 List Requester's Tickets (Query, Filter, Sort, Page)
Retrieve a paginated list of tickets owned strictly by the active requester. Search matches against `ticketNo` and `summary` (case-insensitive).

- **Endpoint**: `GET /api/tickets`
- **Headers**:
  - `X-Requester-Id: <id>`
- **Query Parameters**:

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `search` | string | No | `""` | Substring match on `ticketNo` or `summary` |
| `categoryId` | integer | No | null | Filter by Category ID |
| `requestedPriority` | string | No | null | Filter by requested priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) |
| `status` | string | No | null | Filter by status (`NEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED`) |
| `sortBy` | string | No | `createdAt` | Sort field: `createdAt`, `ticketNo`, `requestedPriority`, `updatedAt` |
| `sortOrder` | string | No | `desc` | Sort direction: `asc` or `desc` |
| `page` | integer | No | `1` | 1-indexed page number |
| `pageSize` | integer | No | `10` | Number of items per page (allowed: 5, 10, 20, 50) |

- **Response 200 OK**:
```json
{
  "items": [
    {
      "id": 1,
      "ticketNo": "TKT-2026-001234",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
      "requestedPriority": "MEDIUM",
      "itPriority": null,
      "currentStatus": "NEW",
      "createdAt": "2026-09-04T10:00:00.000Z",
      "updatedAt": "2026-09-04T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalCount": 1,
    "totalPages": 1,
    "hasPrevious": false,
    "hasNext": false
  }
}
```
- **Response 400 Bad Request**: Invalid query parameters (e.g. invalid sort column or negative page).

---

### 3.3 Get Single Ticket Details (Ownership Enforced)
Retrieve full ticket details and attachment metadata for a ticket owned by the active requester.

- **Endpoint**: `GET /api/tickets/:id`
- **Headers**:
  - `X-Requester-Id: <id>`
- **Response 200 OK**:
```json
{
  "id": 1,
  "ticketNo": "TKT-2026-001234",
  "requesterId": 1,
  "requester": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@kmutt.ac.th"
  },
  "categoryId": 2,
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystemId": 7,
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update.",
  "requestedPriority": "MEDIUM",
  "itPriority": null,
  "currentStatus": "NEW",
  "createdAt": "2026-09-04T10:00:00.000Z",
  "updatedAt": "2026-09-04T10:00:00.000Z",
  "attachments": [
    {
      "id": 1,
      "originalName": "battery-report.pdf",
      "fileSize": 1048576,
      "mimeType": "application/pdf",
      "isRemoved": false,
      "removedAt": null,
      "removalReason": null,
      "createdAt": "2026-09-04T10:00:00.000Z"
    },
    {
      "id": 2,
      "originalName": "wrong-log.png",
      "fileSize": 524288,
      "mimeType": "image/png",
      "isRemoved": true,
      "removedAt": "2026-09-04T10:30:00.000Z",
      "removalReason": "Uploaded incorrect log screenshot",
      "createdAt": "2026-09-04T10:00:00.000Z"
    }
  ]
}
```
- **Response 403 Forbidden**: Ticket exists but belongs to a different requester (`ticket.requesterId !== X-Requester-Id`).
- **Response 404 Not Found**: Ticket ID does not exist in the database.

---

## 4. Attachments API

### 4.1 Upload Attachment to Ticket
Upload an attachment file to an existing ticket owned by the requester.

- **Endpoint**: `POST /api/tickets/:id/attachments`
- **Headers**:
  - `Content-Type: multipart/form-data`
  - `X-Requester-Id: <id>`
- **Form Data**:
  - `file`: Binary file upload (field name: `file`)
- **Constraints & Validations**:
  - Permitted MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
  - Max file size: `5 MB` (`5,242,880 bytes`).
  - Active attachment quota: Ticket must have fewer than 5 active (`isRemoved: false`) attachments.
- **Response 201 Created**:
```json
{
  "id": 3,
  "ticketId": 1,
  "originalName": "battery-graph.png",
  "fileSize": 834120,
  "mimeType": "image/png",
  "isRemoved": false,
  "removedAt": null,
  "removalReason": null,
  "createdAt": "2026-09-04T11:00:00.000Z"
}
```
- **Response 400 Bad Request**: Invalid file type, file exceeds 5 MB, or ticket already has 5 active attachments.
- **Response 403 Forbidden**: Ticket belongs to a different requester.
- **Response 404 Not Found**: Ticket not found.

---

### 4.2 Download Active Attachment Binary
Stream the raw binary of an active attachment.

- **Endpoint**: `GET /api/attachments/:id/download`
- **Headers**:
  - `X-Requester-Id: <id>`
- **Response 200 OK**:
  - `Content-Type: <attachment.mimeType>`
  - `Content-Disposition: attachment; filename="<attachment.originalName>"`
  - Body: Binary stream
- **Response 403 Forbidden**: Attachment belongs to a ticket owned by another requester.
- **Response 404 Not Found**: Attachment ID does not exist.
- **Response 410 Gone**: Attachment has been soft-removed; binary download is permanently blocked.
```json
{
  "statusCode": 410,
  "error": "Gone",
  "message": "This attachment has been soft-removed and is no longer available for download.",
  "removalReason": "Uploaded incorrect log screenshot",
  "removedAt": "2026-09-04T10:30:00.000Z"
}
```

---

### 4.3 Soft-Remove an Attachment
Mark an attachment as soft-removed by providing an audit removal reason.

- **Endpoint**: `POST /api/attachments/:id/remove`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Requester-Id: <id>`
- **Request Body**:
```json
{
  "reason": "Contains outdated battery report; uploaded newer diagnostic"
}
```
- **Validation Rules**:
  - `reason`: Required non-empty string, trimmed, 3 to 250 characters.
- **Response 200 OK**:
```json
{
  "id": 1,
  "ticketId": 1,
  "originalName": "battery-report.pdf",
  "isRemoved": true,
  "removedAt": "2026-09-04T11:15:00.000Z",
  "removalReason": "Contains outdated battery report; uploaded newer diagnostic"
}
```
- **Response 400 Bad Request**: Missing or blank removal reason, or attachment is already removed.
- **Response 403 Forbidden**: Attachment belongs to another requester's ticket.
- **Response 404 Not Found**: Attachment ID does not exist.
