# Lab 4 Sprint Engineering Specification
**TokTickIT Actions Taken, Dashboards, and Final Regression**

---

## 1. Sprint Goal

Deliver the complete, production-ready TokTickIT service-desk increment by implementing the **Actions Taken** work-logging parent-child aggregate, enforcing authoritative **Ticket status lifecycles and backend resolution gates**, providing **role-appropriate operational dashboards** for Requesters, IT Staff, and Administrators, and executing **full-system hardening and regression verification** across all features delivered in Labs 1 to 3 under the Zen Green design system.

---

## 2. Stakeholder Request Interpretation

The IT Department and stakeholders require TokTickIT to mature from basic ticket intake and communication into an active operational work management platform. 

While primary ticket ownership remains assigned to a coordinating IT Staff member, actual technical investigation, repair, configuration, and follow-ups are performed across different team members over time. Therefore, each Ticket must record multiple **Actions Taken** entries. Each action should contain Action Date/Time, Action Description, Result, Performed by (auto), Follow-Up Required?, Follow-up Note (required when follow-up is needed), and Attachment Notes (what file to look for images etc.). Requesters must be able to view these actions transparently to track progress on their issues, but cannot create or modify them. 

Furthermore, the stakeholder requires the ticket status workflow to be formal and authoritative: while Requesters may continue to indicate that the problem appears resolved, this signal is strictly advisory and IT Staff must review the work and formally update the Ticket.

Finally, stakeholders and end users require concise, role-appropriate **Dashboards** that summarize operational queues and personal workloads without duplicating existing list views, supported by end-to-end polish, responsive behavior across mobile, tablet, and desktop devices, and zero regression of any previously delivered capabilities.

---

## 3. Scope

### 3.1 Included Scope
- **Actions Taken Aggregate**:
  - `ActionTaken` child model linked 1:N under `Ticket`.
  - Fields: Action Date/Time, Action Description, Result, Performed by (auto-captured from session), Follow-Up Required? (boolean), Follow-up Note (mandatory when Follow-Up is true; set to null when false), and Attachment Notes (what file to look for images, logs, etc.).
  - Multi-staff collaboration: Actions can be recorded by any active IT Staff or Administrator, independent of primary ticket ownership.
  - Role-based permissions: IT Staff and Admins can create and edit actions; Requesters have read-only visibility for owned tickets; unowned ticket actions are forbidden.
  - Inactive staff protection: Rejection of inactive users as performers or assignees.
- **Ticket Workflow & Resolution Gate**:
  - Formal 8-status transition matrix: `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled` with explicit role permissions.
  - Actions Taken Prerequisite for Resolution: Transitioning to `RESOLVED` or `CLOSED` requires at least one ($\ge 1$) recorded Action Taken.
  - Backend enforcement of the Resolution Gate: Requester "Problem Appears Resolved" remains strictly advisory; only IT Staff/Admin can execute transitions to `Resolved` and `Closed`.
  - Optimistic concurrency control using record versions to prevent silent overwrites and return HTTP 409 Conflict.
  - Append-only workflow history and status refresh feedback.
- **Role-Appropriate Dashboards**:
  - **Requester Dashboard**: 4 authoritative personal metrics (`totalOpen`, `waitingForRequester`, `recentlyUpdated`, `recentlyResolved`), recent ticket list, quick actions, and filter drill-downs with strict ownership isolation.
  - **IT Staff Dashboard**: 5 operational queue metrics (`newTickets`, `openTickets`, `inProgressTickets`, `waitingForRequesterTickets`, `myAssignedTickets`), recent/urgent tickets list, quick actions, and queue filter drill-downs.
  - **Administrator Dashboard**: Inherits IT Staff triage metrics plus concise user account summary statistics (`activeRequesters`, `activeStaff`, `activeAdmins`, `totalUsers`).
  - Authoritative backend aggregation queries, zero-state handling, and safe error boundaries.
- **Database Evolution & Seed Data**:
  - Non-destructive Prisma migration preserving all Lab 1–3 Users, Tickets, Attachments, Comments, and Notes.
  - Performance indexes for dashboard aggregates and composite work-log retrieval.
  - Safe backfill strategy for legacy tickets with zero Actions Taken.
  - Tested hand-written rollback SQL script (`rollback_lab04.sql`).
  - Idempotent seed data generating realistic tickets across all statuses, priorities, ownership states, and actions-taken counts (0, 1, and >1).
- **Final Hardening & Regression**:
  - Full automated regression test suites covering Labs 1, 2, and 3.
  - Zen Green design language polish across desktop, tablet, and mobile breakpoints.
  - Accessibility (WCAG 2.1 AA keyboard navigation, visible focus rings, non-color cues).
  - Clean console (zero runtime warnings/errors, safe API failure feedback, duplicate submit prevention).

### 3.2 Explicitly Excluded Scope
- Automatic SLA clocks, countdown timers, escalation engines, and breach alerts.
- External notification integrations (Email, SMS, LINE, Webhooks, Push).
- Inventory parts consumption, spare-parts tracking, and service billing/payroll.
- Multi-level hierarchical approval workflows or digital cryptographic signatures.
- Custom business-intelligence report builders or analytical warehouse exports.
- Multi-tenant cloud partitioning or department directory sync (e.g., Active Directory / LDAP).
- Hard deletion of tickets or actions taken records (no `DELETE` endpoints).
- Historical time-series delta tracking ("from yesterday" indicators).

---

## 4. Functional Requirements (FR)

### Actions Taken Management
- **FR-01**: The system shall allow authorized IT Staff and Administrators to record an Action Taken on any accessible ticket.
- **FR-02**: The system shall automatically record the authenticated user as the performer (`performedById`) of an Action Taken without allowing client override.
- **FR-03**: The system shall require an Action Date/Time, Action Description, and Result for every Action Taken record.
- **FR-04**: The system shall require a non-empty Follow-Up Note whenever "Follow-Up Required?" is checked (`true`); if unchecked (`false`), the backend shall strictly store `null`.
- **FR-05**: The system shall store optional Attachment Notes indicating referenced filenames or visual evidence.
- **FR-06**: The system shall allow authorized IT Staff and Administrators to update existing Action Taken records following a Last-Write-Wins (LWW) update policy.
- **FR-07**: The system shall allow Requesters to view all Action Taken records associated with tickets they own in read-only mode.
- **FR-08**: The system shall forbid Requesters from creating, modifying, or deleting Action Taken records.

### Ticket Workflow & Concurrency
- **FR-09**: The system shall enforce permitted status transitions according to the defined Ticket Status Transition Matrix and role permissions.
- **FR-10**: The system shall allow Requesters to submit an advisory "Problem Appears Resolved" indication without changing the ticket status to `Resolved`.
- **FR-11**: The system shall restrict the transition of ticket status to `Resolved` and `Closed` exclusively to IT Staff and Administrators, requiring at least one recorded Action Taken.
- **FR-12**: The system shall detect stale or concurrent updates during ticket workflow operations using version matching and reject conflicting submissions with HTTP 409 Conflict.
- **FR-13**: The system shall update the ticket summary header and history immediately upon successful status transitions.

### Dashboards & Analytics
- **FR-14**: The system shall provide a Requester Dashboard displaying 4 authoritative personal metrics: Total Open (`totalOpen`), Waiting for Requester (`waitingForRequester`), Recently Updated (`recentlyUpdated`), and Recently Resolved (`recentlyResolved`) for the authenticated user only.
- **FR-15**: The system shall provide an IT Staff Dashboard displaying 5 operational metrics: New (`newTickets`), Open (`openTickets`), In Progress (`inProgressTickets`), Waiting for Requester (`waitingForRequesterTickets`), and My Assigned (`myAssignedTickets`).
- **FR-16**: The system shall provide an Administrator Dashboard displaying IT Staff operational metrics alongside concise user account metrics (`activeRequesters`, `activeStaff`, `activeAdmins`, `totalUsers`).
- **FR-17**: The system shall support clickable drill-down navigation from dashboard metric cards directly to pre-filtered ticket list views.
- **FR-18**: The system shall render graceful empty-state placeholders when dashboard metric counts or recent list queries return zero records.

### Regression & Hardening
- **FR-19**: The system shall maintain all existing capabilities for authentication, session cookies, first-login password resets, ticket creation, file attachments, public comments, internal notes, and administrator user management.
- **FR-20**: The system shall prevent duplicate submissions caused by rapid repeated clicks or network retries by disabling action buttons during active requests.
- **FR-21**: The system shall preserve form input data across recoverable client validation errors.
- **FR-22**: The system shall provide accessible, responsive layouts adhering to the Zen Green design system without horizontal scrolling or clipped controls on mobile (375px), tablet (768px), and desktop ($\ge 1024$px).

---

## 5. Business Rules (BR)

### Actions Taken Rules
- **BR-01**: **Single Parent Ticket**: An Action Taken belongs to exactly one Ticket (`ticketId` is immutable and required).
- **BR-02**: **Collaborative Multi-Staff Action**: A Ticket has one primary Ticket Owner, but Actions Taken may be performed and recorded by any active IT Staff or Administrator.
- **BR-03**: **Automatic Performer Attribution**: The `performedById` attribute must be derived server-side from the authenticated session and cannot be spoofed by client payloads.
- **BR-04**: **Active Performer & Assignee Rule**: An Action Taken cannot be created or updated by, or assigned to, an inactive or deactivated user account.
- **BR-05**: **Conditional Follow-Up Constraint**:
  - If `followUpRequired == true`: `followUpNote` must be non-empty (minimum 3 non-whitespace characters).
  - If `followUpRequired == false`: `followUpNote` is strictly set to `null` by the backend.
- **BR-06**: **Temporal Validity**: The Action Date/Time cannot be set to a future date/time beyond a 5-minute clock-skew allowance.
- **BR-07**: **Immutable History Ordering**: Actions Taken must be returned in deterministic chronological order: descending by `actionDateTime` with secondary sort `createdAt` desc.

### Ticket Status & Resolution Gate Rules
- **BR-08**: **Authorized Status Lifecycle & Role Matrix**: Ticket status transitions must strictly conform to the permitted transition matrix and authorized roles:

| From Status | To Status | Permitted Roles | Business Rule & Precondition |
|---|---|---|---|
| `NEW` | `OPEN` | `IT_STAFF`, `ADMIN` | Initial triage and acknowledgement. |
| `NEW` | `CANCELLED` | `REQUESTER` (owner), `IT_STAFF`, `ADMIN` | Cancellation before work begins. |
| `OPEN` | `IN_PROGRESS` | `IT_STAFF`, `ADMIN` | Work actively underway. |
| `OPEN` | `WAITING_FOR_REQUESTER` | `IT_STAFF`, `ADMIN` | Awaiting additional details or verification. |
| `OPEN` | `CANCELLED` | `IT_STAFF`, `ADMIN` | Administrative or requester-requested cancellation. |
| `IN_PROGRESS` | `WAITING_FOR_REQUESTER` | `IT_STAFF`, `ADMIN` | Diagnostic paused pending user feedback. |
| `IN_PROGRESS` | `RESOLVED` | `IT_STAFF`, `ADMIN` | Requires $\ge 1$ Action Taken (**BR-09.1**). |
| `IN_PROGRESS` | `CANCELLED` | `IT_STAFF`, `ADMIN` | Abandoned or duplicate request. |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS` | `IT_STAFF`, `ADMIN` | Resumed upon receiving requester response. |
| `WAITING_FOR_REQUESTER` | `RESOLVED` | `IT_STAFF`, `ADMIN` | Requires $\ge 1$ Action Taken (**BR-09.1**). |
| `WAITING_FOR_REQUESTER` | `CANCELLED` | `IT_STAFF`, `ADMIN` | No response or cancelled by staff. |
| `RESOLVED` | `CLOSED` | `IT_STAFF`, `ADMIN` | Requires $\ge 1$ Action Taken (**BR-09.1**); final closure. |
| `RESOLVED` | `REOPENED` | `IT_STAFF`, `ADMIN` | Issue recurred after initial resolution. |
| `CLOSED` | `REOPENED` | `IT_STAFF`, `ADMIN` | Formal administrative reopen after historical close. |
| `REOPENED` | `IN_PROGRESS` | `IT_STAFF`, `ADMIN` | Resumed investigation. |
| `REOPENED` | `RESOLVED` | `IT_STAFF`, `ADMIN` | Requires $\ge 1$ Action Taken (**BR-09.1**). |
| `REOPENED` | `CANCELLED` | `IT_STAFF`, `ADMIN` | Cancellation of reopened inquiry. |
| `CANCELLED` | *(None)* | *(None)* | **Terminal State**: No transitions permitted. |

*Note on Requester Reopen*: Requesters **cannot** directly transition a ticket to `REOPENED`. If an issue recurs on a `RESOLVED` ticket, the Requester posts a Public Comment; IT Staff review the comment and formally transition the ticket to `REOPENED`.
- **BR-09**: **Resolution Authority Gate**: Only authenticated IT Staff and Administrators may transition a ticket to `RESOLVED` or `CLOSED`. Any Requester attempt to set status to `RESOLVED` or `CLOSED` must be rejected with HTTP 403 Forbidden.
- **BR-09.1**: **Actions Taken Prerequisite for Resolution**: A ticket cannot transition to `RESOLVED` or `CLOSED` unless there is at least one ($\ge 1$) Action Taken record associated with that ticket. Any attempt to resolve or close a ticket with zero Actions Taken must be rejected with HTTP 422 Unprocessable Entity and error code `RESOLUTION_REQUIRES_ACTION_TAKEN`.
- **BR-10**: **Requester Advisory Resolution**: A Requester's "Problem Appears Resolved" action appends an advisory public comment `[Requester Feedback: Problem Appears Resolved]` indicating user satisfaction, but leaves the operational status unchanged for staff review.
- **BR-11**: **Concurrency Conflict Detection & Evaluation Order**:
  - The client must supply the known `version` integer when mutating ticket workflow. If `submittedVersion !== ticket.version`, the server rejects the request with HTTP 409 Conflict.
  - Individual Action Taken mutations (`PATCH /api/tickets/:id/actions-taken/:actionId`) follow Last-Write-Wins (LWW) timestamp auditing via `updatedAt`.
  - **Evaluation Order for Status Mutations (`PATCH /api/tickets/:id/workflow`)**:
    1. `401 Unauthorized`: Unauthenticated request.
    2. `403 Forbidden`: Role check (e.g. Requester attempting status transition or non-owner).
    3. `400 Bad Request`: Syntactic / Schema validation (missing version, invalid status enum).
    4. `409 Conflict`: Optimistic concurrency check (`submittedVersion !== ticket.version`).
    5. `422 Unprocessable Entity`: Semantic domain rules (invalid transition matrix jump, or `RESOLUTION_REQUIRES_ACTION_TAKEN`).

### Dashboard Calculation Rules
- **BR-12**: **Requester Data Boundary**: Requester dashboard metrics must filter strictly by `requesterId == authenticatedUser.id`. No aggregated metrics may include tickets owned by other users.
- **BR-13**: **Requester Metric Definitions & Drill-Downs**:
  - `totalOpen`: Count of owned tickets where `status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER')`. Drill-down: `/tickets?filter=open`.
  - `waitingForRequester`: Count of owned tickets where `status == 'WAITING_FOR_REQUESTER'`. Drill-down: `/tickets?status=WAITING_FOR_REQUESTER`.
  - `recentlyUpdated`: Count of owned tickets where `updatedAt >= NOW() - 7 days` (rolling 7 days: `Date.now() - 7 * 86,400,000` ms in UTC). Drill-down: `/tickets?filter=recent`.
  - `recentlyResolved`: Count of owned tickets where `status == 'RESOLVED'` and `updatedAt >= NOW() - 30 days` (rolling 30 days: `Date.now() - 30 * 86,400,000` ms in UTC). **Strictly excludes `CLOSED`** to eliminate overlap. Drill-down: `/tickets?status=RESOLVED`.
- **BR-14**: **IT Staff Metric Definitions & Drill-Downs**:
  - `newTickets`: Count of all tickets across system where `status == 'NEW'`. Drill-down: `/staff/queue?status=NEW`.
  - `openTickets`: Count of all tickets across system where `status == 'OPEN'`. Drill-down: `/staff/queue?status=OPEN`.
  - `inProgressTickets`: Count of all tickets across system where `status == 'IN_PROGRESS'`. Drill-down: `/staff/queue?status=IN_PROGRESS`.
  - `waitingForRequesterTickets`: Count of all tickets where `status == 'WAITING_FOR_REQUESTER'`. Drill-down: `/staff/queue?status=WAITING_FOR_REQUESTER`.
  - `myAssignedTickets`: Count of tickets where `assignedStaffId == authenticatedUser.id` and `status IN ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')`. **Explicitly excludes `RESOLVED`, `CLOSED`, and `CANCELLED`**. Drill-down: `/staff/queue?assigned=me`.
- **BR-15**: **Admin User Metrics**:
  - Counts of active accounts: `activeRequesters`, `activeStaff`, `activeAdmins`, and `totalUsers`.
- **BR-16**: **Authoritative Server Aggregation & Time Boundaries**: All metrics are computed server-side via SQL/Prisma aggregations in UTC. Display strings are rendered by client browsers in local time (Asia/Bangkok, GMT+7).

---

## 6. UI Specification Summary

*(Full details documented in [ui-spec.md](./ui-spec.md))*

- **Application Shell & Navigation**:
  - Persistent Zen Green top navigation header.
  - Role-aware Dashboard tab (`/dashboard`) dynamically routing to Requester or IT Staff Dashboard with active link indicator.
- **IT Staff Dashboard Screen (`/dashboard`)**:
  - Greeting header: "Welcome back, {Name}!" with queue summary subtitle and "Refresh" action.
  - Top Metric Cards: 5 concise cards (`New`, `Open`, `In Progress`, `Waiting for Requester`, `My Assigned`) displaying large bold counts and drill-down links.
  - Responsive Grid: 5 columns on desktop ($\ge 1024$px), 2 columns on tablet ($768$px–$1023$px), 1 column on mobile ($< 768$px).
  - Lower Grid: "My Recent Tickets" table (columns: Ticket #, Title, Status badge, Updated timestamp) and "Quick Actions" panel (`Create Ticket`, `Search Tickets`, `My Queue`).
- **Requester Dashboard Screen (`/dashboard`)**:
  - Greeting header: "Welcome, {Name}!" with personal ticket status subtitle.
  - Metric Cards: 4 cards (`My Open Tickets`, `Waiting for Me`, `Recently Updated`, `Recently Resolved`) with accessible drill-down links.
  - Responsive Grid: 4 columns on desktop, 2 columns on tablet, 1 column on mobile.
  - Lower Grid: "My Recent Tickets" list with status badges and "Create Ticket" / "View My Tickets" quick actions.
- **Actions Taken on Ticket Detail (`/tickets/:id` & `/staff/tickets/:id`)**:
  - Dedicated "Actions Taken" panel below Ticket Information.
  - Actions table on desktop / card stack on mobile displaying: Date/Time, Performer Name, Description, Result, Follow-Up indicator & note, Attachment notes, and Action menu (Edit).
  - "Add Action Taken" button (visible only to IT Staff and Admin).
  - Modal form supporting create and edit modes with responsive inputs, dynamic follow-up validation, and submission loading states.
  - Requesters see all actions in read-only mode with no edit/create buttons.
- **Ticket Workflow & Status Controls**:
  - Ticket Detail displays the current status badge and a contextual Status Transition dropdown showing strictly permitted next statuses.
  - Prominent warning banners for `409 Conflict` (with "Refresh Ticket" button) and `422 RESOLUTION_REQUIRES_ACTION_TAKEN`.

---

## 7. Data Changes & Justifications

### 7.1 Prisma Schema Additions

```prisma
model ActionTaken {
  id                String    @id @default(uuid())
  ticketId          String
  ticket            Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  actionDateTime    DateTime  @default(now())
  description       String
  result            String
  performedById     String
  performedBy       User      @relation(fields: [performedById], references: [id], onDelete: Restrict)
  followUpRequired  Boolean   @default(false)
  followUpNote      String?
  attachmentNotes   String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([ticketId, actionDateTime])
  @@index([ticketId, createdAt])
  @@index([performedById])
}
```

```prisma
// Ticket model extensions for optimistic locking and dashboard aggregates:
model Ticket {
  // ... existing fields preserved ...
  actionsTaken      ActionTaken[]
  version           Int           @default(1)

  @@index([status])
  @@index([requesterId, status])
  @@index([assignedStaffId, status])
}
```

### 7.2 Database Design Decisions & Justifications

1. **Justification 1: Integer Version Field (`version`) for Optimistic Concurrency Control**:
   - *Rationale*: A high-throughput service desk involves multiple actors (Ticket Owner, assisting IT Staff, and Requesters) inspecting and mutating the same ticket concurrently. Relying solely on `updatedAt` timestamps can introduce race conditions due to sub-millisecond database precision discrepancies and clock skew across distributed runtimes. An explicit integer `version` field incremented atomically via `UPDATE "Ticket" SET version = version + 1 WHERE id = $id AND version = $expectedVersion` guarantees deterministic concurrency conflict detection.
2. **Justification 2: Restrict Deletion (`onDelete: Restrict`) on `performedBy` User Relation**:
   - *Rationale*: Actions Taken represent formal audit logs of technical work performed on IT infrastructure. If an IT Staff user account is deactivated, the historical integrity of who performed past diagnostic and repair actions must never be purged or orphaned. `onDelete: Restrict` prevents accidental cascade deletion of critical audit trails, aligning with the project's requirement to deactivate rather than hard-delete user accounts.
3. **Justification 3: Composite Indexing on `(ticketId, actionDateTime)` and Dashboard Indexes**:
   - *Rationale*: The predominant query pattern for Actions Taken is fetching all actions for a specific ticket ordered chronologically by `actionDateTime DESC`. Adding a composite index on `(ticketId, actionDateTime)` eliminates in-memory sorting. Adding composite indexes on `Ticket(requesterId, status)` and `Ticket(assignedStaffId, status)` allows dashboard aggregation queries to execute via index-only scans without scanning entire tables.
4. **Justification 4: `onDelete: Cascade` on Ticket Foreign Key Reconciled with No Hard Deletion**:
   - *Rationale*: At the application business layer, tickets are never hard-deleted (they transition to `CANCELLED` or `CLOSED`). However, `onDelete: Cascade` is specified at the PostgreSQL foreign key constraint level strictly to allow automated test fixture teardown and idempotent seed resets to cleanly purge parent and child records in test environments without foreign key constraint errors.

### 7.3 Migration & Backfill Strategy
- **Migration Plan**: Generate a non-destructive Prisma migration (`2026xxxx_add_actions_taken_and_version`).
- **Legacy Ticket Handling**: Existing tickets created in Labs 1–3 default to `version = 1` and have an empty list (`[]`) of Actions Taken.
- **Rollback Procedure**: Prisma does not automatically generate down-migrations. A tested hand-written SQL script (`prisma/migrations/rollback_lab04.sql`) is provided to drop the `ActionTaken` table, drop dashboard indexes, and remove the `version` column from `Ticket` safely if rollback is required.

### 7.4 Seed Data Strategy
- Maintain an idempotent `prisma/seed.ts` script safe to re-run multiple times.
- Seed tickets representing all 8 statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
- Seed realistic variation of Actions Taken:
  - Multiple tickets with **0 Actions Taken** (verifying resolution gate rejections and zero states).
  - Multiple tickets with **1 Action Taken**.
  - Multiple tickets with **2 to 4 Actions Taken** showing different IT Staff performers, follow-up flags, and attachment notes.
- Seed data ensuring non-zero metrics on IT Staff dashboard and at least one user with zero tickets to verify empty states.

---

## 8. API Contract Summary

*(Full endpoint schemas documented in [api-spec.md](./api-spec.md))*

| Method | Endpoint | Allowed Roles | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/dashboard/requester` | `REQUESTER` | Retrieve authenticated Requester's metrics & recent tickets | `200`, `401`, `403` |
| `GET` | `/api/dashboard/staff` | `IT_STAFF`, `ADMIN` | Retrieve IT operational metrics & recent/urgent queue | `200`, `401`, `403` |
| `GET` | `/api/dashboard/admin` | `ADMIN` | Retrieve IT operational metrics + user account statistics | `200`, `401`, `403` |
| `GET` | `/api/tickets/:id/actions-taken` | `REQUESTER` (owner), `IT_STAFF`, `ADMIN` | List all actions taken for a ticket (sorted `actionDateTime` desc) | `200`, `401`, `403`, `404` |
| `POST` | `/api/tickets/:id/actions-taken` | `IT_STAFF`, `ADMIN` | Create a new action taken record under ticket | `201`, `400`, `401`, `403`, `404` |
| `PATCH` | `/api/tickets/:id/actions-taken/:actionId` | `IT_STAFF`, `ADMIN` | Update an existing action taken record (Last-Write-Wins) | `200`, `400`, `401`, `403`, `404` |
| `PATCH` | `/api/tickets/:id/workflow` | `REQUESTER` (advisory only), `IT_STAFF`, `ADMIN` | Update ticket status, resolution notes, and concurrency version | `200`, `400`, `401`, `403`, `404`, `409`, `422` |

*Note on Ticket Identification & Deletion*:
- `GET /api/tickets/:id` and `GET /api/staff/tickets/:id` return the `version` integer used for optimistic locking.
- **No DELETE endpoints exist**: Hard-deletion of tickets or actions taken is strictly forbidden.

---

## 9. Acceptance Criteria (AC)

- **AC-01**: Given an authenticated IT Staff or Admin and valid payload, when creating an Action Taken on an accessible ticket, then the record is created with `performedById` bound to the authenticated user and HTTP 201 is returned.
- **AC-02**: Given an Action Taken creation request with `followUpRequired = true` but an empty `followUpNote`, then the backend rejects the request with HTTP 400 and code `VALIDATION_ERROR`.
- **AC-02b**: Given an Action Taken creation or update request with `followUpRequired = false`, then `followUpNote` is strictly set to `null` in the persisted record.
- **AC-03**: Given an Action Taken creation or update request with `actionDateTime` set in the future (> 5 minutes ahead), then the backend rejects the request with HTTP 400 and code `VALIDATION_ERROR`.
- **AC-04**: Given an authenticated Requester viewing a ticket they own, when requesting `GET /api/tickets/:id/actions-taken`, then all actions taken are returned with full details in read-only format.
- **AC-05**: Given an authenticated Requester, when attempting to `POST` or `PATCH` on `/api/tickets/:id/actions-taken`, then the backend rejects the request with HTTP 403 Forbidden.
- **AC-06**: Given an authenticated Requester attempting to view actions taken on a ticket owned by another user, then the backend returns HTTP 403 Forbidden or 404 Not Found.
- **AC-07**: Given a ticket in `OPEN` or `IN_PROGRESS` status having $\ge 1$ Action Taken, when an IT Staff user transitions the status to `RESOLVED` with the current ticket version, then the status updates to `RESOLVED` and HTTP 200 is returned.
- **AC-07b**: Given a ticket with zero (`0`) Actions Taken records, when an IT Staff or Admin user attempts to transition the status to `RESOLVED` or `CLOSED`, then the backend rejects the request with HTTP 422 Unprocessable Entity and code `RESOLUTION_REQUIRES_ACTION_TAKEN`.
- **AC-08**: Given an authenticated Requester, when submitting an advisory "Problem Appears Resolved" indication, then an advisory comment is recorded, but the ticket status remains unchanged.
- **AC-09**: Given an authenticated Requester attempting to submit a status transition to `RESOLVED` or `CLOSED`, then the backend rejects the operation with HTTP 403 Forbidden.
- **AC-10**: Given a status update request with a mismatched or stale `version` (optimistic concurrency failure), then the backend rejects the update with HTTP 409 Conflict without modifying the ticket.
- **AC-11**: Given an unpermitted status transition (e.g. `NEW` $\rightarrow$ `CLOSED`), then the backend rejects the update with HTTP 400 or HTTP 422.
- **AC-12**: Given an authenticated Requester, when retrieving `/api/dashboard/requester`, then all 4 metrics (`totalOpen`, `waitingForRequester`, `recentlyUpdated`, `recentlyResolved`) reflect only tickets where `requesterId == authenticatedUser.id`.
- **AC-13**: Given an authenticated IT Staff user, when retrieving `/api/dashboard/staff`, then operational queue counts match database queries, and `myAssignedTickets` excludes `RESOLVED`, `CLOSED`, and `CANCELLED`.
- **AC-14**: Given an IT Staff user clicking the "Waiting for Requester" metric card on the dashboard, then the user is navigated to `/staff/queue?status=WAITING_FOR_REQUESTER`.
- **AC-15**: Given a user with zero matching tickets on any dashboard list, then a clean Zen Green empty-state component is displayed with helpful guidance.
- **AC-16**: Given any form submission on Actions Taken or Ticket Workflow, when the submit button is clicked, then it is disabled during network transit to prevent duplicate submissions.
- **AC-17**: Given a form submission that fails with an API error (400 or 422), then the entered form values are preserved in the UI so the user does not need to retype.
- **AC-18**: Given viewports of 375px (Mobile), 768px (Tablet), and 1280px (Desktop), all Lab 4 dashboard and Ticket Detail screens render without horizontal scrolling or overlapping elements.
- **AC-19**: All interactive elements (buttons, inputs, cards, links) exhibit visible focus rings during keyboard navigation (Tab / Shift+Tab).
- **AC-20**: All regression capabilities from Labs 1, 2, and 3 (auth, first-login password change, ticket creation, attachments, public comments, internal notes, admin user management) continue to function without errors.
- **AC-21**: Given an inactive or deactivated IT Staff user, when attempting to create or update an Action Taken, then the backend rejects the operation with HTTP 403 Forbidden (**BR-04**).
- **AC-22**: Given multiple Actions Taken on a ticket, when fetched via `GET /api/tickets/:id/actions-taken`, then records are returned ordered chronologically descending by `actionDateTime` (**BR-07**).
- **AC-23**: Given an authenticated Administrator, when retrieving `/api/dashboard/admin`, then operational queue counts plus user account counts (`activeRequesters`, `activeStaff`, `activeAdmins`, `totalUsers`) are returned (**BR-15**).

---

## 10. Definition of Done (DoD)

A deliverable is considered **Done** for Sprint 4 only when all items below are fulfilled:

1. **Specification & Contracts**:
   - `docs/lab-04/specification.md`, `ui-spec.md`, `api-spec.md`, and `tests.md` are committed to git and verified.
2. **Database & Migrations**:
   - Prisma schema updated with `ActionTaken` model, relations, indexes, and `version` concurrency field.
   - Migration applied cleanly and backward compatibility with Lab 1–3 data verified.
   - Tested rollback SQL script committed.
   - Idempotent seed script runs repeatedly and creates realistic multi-role tickets and actions.
3. **Backend Implementation & APIs**:
   - REST endpoints for Actions Taken CRUD, Requester Dashboard, Staff Dashboard, Admin Dashboard, and Ticket Workflow implemented with strict role authorization.
   - Concurrency conflict handling (HTTP 409) and validation rules enforced server-side.
4. **Frontend Implementation & Zen Green UI**:
   - Responsive Dashboards for Requester, IT Staff, and Admin implemented with drill-down navigation.
   - Actions Taken panel on Ticket Detail supporting list, create, and edit modes with form validation.
   - Contextual status transition controls implemented with safe disable states.
5. **Quality Assurance & Traceability**:
   - Every Acceptance Criterion (`AC-01` through `AC-23`) is mapped to an automated test file in `tests.md`.
   - Unit tests, API integration tests, React component tests, and Playwright E2E tests pass with 100% success rate on `main`.
6. **Hardening & Accessibility**:
   - Zero console errors, warnings, or broken links in browser developer tools.
   - Full keyboard accessibility and non-color cues verified.
   - Desktop, tablet, and mobile layouts verified without overflow.
7. **Process & Git Evidence**:
   - Feature branches developed and merged into `lab4-staging`, then merged into `main`.
   - All GitHub Project issues moved to "Done".
   - Peer review audit logged in `docs/lab-04/reviewer.md` with PR links and approvals.
   - AI usage documented with reflection in `docs/lab-04/ai-use.md`.
   - Screenshot artifacts saved under `artifacts/lab-04/screenshots/`.

---

## 11. Assumptions and Decisions

1. **Dashboard Route Sharing**: The frontend route `/dashboard` serves as the universal dashboard entry point. It inspects the authenticated session role and seamlessly renders `RequesterDashboard`, `StaffDashboard`, or `AdminDashboard` accordingly.
2. **Advisory Resolution Storage**: The Requester's "Problem Appears Resolved" action is recorded as an advisory comment `[Requester Feedback: Problem Appears Resolved]`, providing immediate audit visibility in the comment thread without mutating operational ticket status.
3. **Omission of "From Yesterday" Deltas**: While visual conceptual mockups showed "+1 from yesterday" trend badges, Sprint 4 explicitly omits time-series delta calculation from the API and UI because historical snapshot logging is outside the sprint scope.
4. **Timezone Handling**: All database timestamps are stored in UTC (`ISO 8601`). The backend computes rolling windows using UTC timestamps. Frontend components format timestamps into the user's localized browser timezone (Asia/Bangkok GMT+7).
5. **Last-Write-Wins on Action Taken Items**: Unlike Ticket status/ownership updates which require optimistic concurrency version checking, editing individual Action Taken work log lines adopts a Last-Write-Wins (LWW) strategy.
