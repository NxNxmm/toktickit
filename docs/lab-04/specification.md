# Lab 4 Sprint Engineering Specification
**TokTickIT Actions Taken, Dashboards, and Final Regression**

---

## 1. Sprint Goal

Deliver the complete, production-ready TokTickIT service-desk increment by implementing the **Actions Taken** work-logging parent-child aggregate, enforcing authoritative **Ticket status lifecycles and backend resolution gates**, providing **role-appropriate operational dashboards** for Requesters, IT Staff, and Administrators, and executing **full-system hardening and regression verification** across all features delivered in Labs 1 to 3 under the Zen Green design system.

---

## 2. Stakeholder Request Interpretation

The IT Department and stakeholders require TokTickIT to mature from basic ticket intake and communication into an active operational work management platform. 

While primary ticket ownership remains assigned to a coordinating IT Staff member, actual technical investigation, repair, configuration, and follow-ups are performed across different team members over time. Therefore, each Ticket must record multiple **Actions Taken** entries capturing when the action occurred, what was done, the result, an automatically captured record of who performed it, follow-up flags with mandatory notes when required, and cross-references to external attachments or artifacts. Requesters must be able to view these actions transparently to track progress on their issues, but cannot create or modify them. 

Furthermore, the stakeholder requires the ticket status workflow to be formal and authoritative: while Requesters may indicate that their issue appears resolved, this signal is strictly advisory and only IT Staff can formally transition a ticket to `Resolved`. 

Finally, stakeholders and end users require concise, role-appropriate **Dashboards** that summarize operational queues and personal workloads without duplicating existing list views, supported by end-to-end polish, responsive behavior across mobile, tablet, and desktop devices, and zero regression of any previously delivered capabilities.

---

## 3. Scope

### 3.1 Included Scope
- **Actions Taken Aggregate**:
  - `ActionTaken` child model linked 1:N under `Ticket`.
  - Fields: Action Date/Time, Action Description, Result, Performed by (auto-captured from session), Follow-Up Required? (boolean), Follow-up Note (mandatory when Follow-Up is true), Attachment Notes.
  - Multi-staff collaboration: Actions can be recorded by any active IT Staff or Administrator, independent of primary ticket ownership.
  - Role-based permissions: IT Staff and Admins can create and edit actions; Requesters have read-only visibility for owned tickets; unowned ticket actions are forbidden.
  - Inactive staff protection: Rejection of inactive users as performers or assignees.
- **Ticket Workflow & Resolution Gate**:
  - Formal 8-status transition matrix: `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`.
  - Backend enforcement of the Resolution Gate: Requester "Problem Appears Resolved" remains strictly advisory; only IT Staff/Admin can execute transitions to `Resolved`.
  - Optimistic concurrency control using record versions / timestamps to prevent silent overwrites and return HTTP 409 Conflict.
  - Append-only workflow history and status refresh feedback.
- **Role-Appropriate Dashboards**:
  - **Requester Dashboard**: Personal metrics (Total Open, Waiting for Requester, Recently Updated, Recently Resolved) with strict ownership isolation, recent ticket list, quick actions, and filter drill-downs.
  - **IT Staff Dashboard**: Operational queue metrics (New, Open, In Progress, Waiting for Requester, My Assigned), recent/urgent tickets list, quick actions, and queue filter drill-downs.
  - **Administrator Dashboard**: Inherits IT Staff triage metrics plus concise user account summary statistics.
  - Authoritative backend aggregation queries, zero-state handling, and safe error boundaries.
- **Database Evolution & Seed Data**:
  - Non-destructive Prisma migration preserving all Lab 1–3 Users, Tickets, Attachments, Comments, and Notes.
  - Safe backfill strategy for legacy tickets with zero Actions Taken.
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
- Hard deletion of tickets or actions taken records.

---

## 4. Functional Requirements (FR)

### Actions Taken Management
- **FR-01**: The system shall allow authorized IT Staff and Administrators to record an Action Taken on any accessible ticket.
- **FR-02**: The system shall automatically record the authenticated user as the performer (`performedById`) of an Action Taken without allowing client override.
- **FR-03**: The system shall require an Action Date/Time, Action Description, and Result for every Action Taken record.
- **FR-04**: The system shall require a Follow-Up Note whenever "Follow-Up Required?" is checked (`true`); if unchecked (`false`), the note is optional or cleared.
- **FR-05**: The system shall store optional Attachment Notes indicating referenced filenames or visual evidence.
- **FR-06**: The system shall allow authorized IT Staff and Administrators to update existing Action Taken records.
- **FR-07**: The system shall allow Requesters to view all Action Taken records associated with tickets they own in read-only mode.
- **FR-08**: The system shall forbid Requesters from creating, modifying, or deleting Action Taken records.

### Ticket Workflow & Concurrency
- **FR-09**: The system shall enforce permitted status transitions according to the defined Ticket Status Transition Matrix.
- **FR-10**: The system shall allow Requesters to submit an advisory "Problem Appears Resolved" indication without changing the ticket status to `Resolved`.
- **FR-11**: The system shall restrict the transition of ticket status to `Resolved` exclusively to IT Staff and Administrators.
- **FR-12**: The system shall detect stale or concurrent updates during ticket workflow operations using versioning or timestamp matching and reject conflicting submissions with HTTP 409 Conflict.
- **FR-13**: The system shall update the ticket summary header and history immediately upon successful status transitions.

### Dashboards & Analytics
- **FR-14**: The system shall provide a Requester Dashboard displaying authoritative metrics: Total Open Tickets, Tickets Waiting for Requester, Recently Updated Tickets, and Recently Resolved Tickets for the authenticated user only.
- **FR-15**: The system shall provide an IT Staff Dashboard displaying operational metrics: New Tickets, Open Tickets, In Progress Tickets, Waiting for Requester Tickets, and Tickets Assigned to the authenticated IT Staff user.
- **FR-16**: The system shall provide an Administrator Dashboard displaying IT Staff operational metrics alongside concise user account metrics (e.g., active user counts by role).
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
- **BR-04**: **Active Performer & Assignee Rule**: An Action Taken cannot be created or updated by or assigned to an inactive or deactivated user account.
- **BR-05**: **Conditional Follow-Up Constraint**: If `followUpRequired` is `true`, `followUpNote` must be non-empty (minimum 3 non-whitespace characters). If `followUpRequired` is `false`, `followUpNote` may be null or blank.
- **BR-06**: **Temporal Validity**: The Action Date/Time cannot be set to a future date/time beyond a 5-minute clock-skew allowance.
- **BR-07**: **Immutable History Ordering**: Actions Taken must be returned in deterministic chronological order (defaulting to descending by `actionDateTime` with secondary sort `createdAt` desc).

### Ticket Status & Resolution Gate Rules
- **BR-08**: **Authorized Status Lifecycle**: Ticket status transitions must strictly conform to the permitted transition matrix:
  - `NEW` $\rightarrow$ `OPEN`, `CANCELLED`
  - `OPEN` $\rightarrow$ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - `IN_PROGRESS` $\rightarrow$ `WAITING_FOR_REQUESTER`, `RESOLVED`, `OPEN`, `CANCELLED`
  - `WAITING_FOR_REQUESTER` $\rightarrow$ `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
  - `RESOLVED` $\rightarrow$ `CLOSED`, `REOPENED`
  - `CLOSED` $\rightarrow$ `REOPENED` (Admin or IT Staff only)
  - `REOPENED` $\rightarrow$ `IN_PROGRESS`, `OPEN`, `RESOLVED`, `CANCELLED`
  - `CANCELLED` $\rightarrow$ Terminal state (no further transitions permitted except by Administrator override).
- **BR-09**: **Resolution Authority Gate**: Only authenticated IT Staff and Administrators may transition a ticket to `RESOLVED` or `CLOSED`. Any Requester attempt to set status to `RESOLVED` must be rejected with HTTP 403 Forbidden.
- **BR-10**: **Requester Advisory Resolution**: A Requester's "Problem Appears Resolved" action appends an audit trail entry / system comment indicating requester satisfaction, but leaves the operational status unchanged for staff review.
- **BR-11**: **Concurrency Conflict Detection**: When updating a ticket's status, priority, or ownership, the client must supply the known `updatedAt` timestamp or `version` integer. If the record in the database has changed, the server must reject the mutation with HTTP 409 Conflict without applying updates.

### Dashboard Calculation Rules
- **BR-12**: **Requester Data Boundary**: Requester dashboard metrics must filter strictly by `requesterId == authenticatedUser.id`. No aggregated metrics may include tickets owned by other users.
- **BR-13**: **Requester Metric Definitions**:
  - `Total Open Tickets`: Count of owned tickets where `status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER')`.
  - `Waiting for Requester`: Count of owned tickets where `status == 'WAITING_FOR_REQUESTER'`.
  - `Recently Updated Tickets`: Count of owned tickets with updates in the last 7 days.
  - `Recently Resolved Tickets`: Count of owned tickets where `status IN ('RESOLVED', 'CLOSED')` within the last 30 days.
- **BR-14**: **IT Staff Metric Definitions**:
  - `New Tickets`: Count of all tickets across system where `status == 'NEW'`.
  - `Open Tickets`: Count of all tickets across system where `status == 'OPEN'`.
  - `In Progress Tickets`: Count of all tickets across system where `status == 'IN_PROGRESS'`.
  - `Waiting for Requester Tickets`: Count of all tickets where `status == 'WAITING_FOR_REQUESTER'`.
  - `My Assigned Tickets`: Count of tickets where `assignedStaffId == authenticatedUser.id` and `status NOT IN ('CLOSED', 'CANCELLED')`.
- **BR-15**: **Admin User Metrics**:
  - Total Active Requesters, Total Active IT Staff, Total Active Administrators.
- **BR-16**: **Authoritative Server Aggregation**: All dashboard metrics must be computed directly by backend SQL/Prisma aggregation queries rather than transferring complete ticket datasets to the frontend.

---

## 6. UI Specification Summary

*(Full details documented in [docs/lab-04/ui-spec.md](file:///c:/Year3/Semester%201/CPE334%20Software%20Engineering/toktickit/docs/lab-04/ui-spec.md))*

- **Application Shell & Navigation**:
  - Persistent Zen Green top navigation header.
  - Role-aware Dashboard tab (`/dashboard`) dynamically routing to Requester or IT Staff Dashboard with active link indicator.
- **IT Staff Dashboard Screen (`/dashboard`)**:
  - Greeting header: "Welcome back, {Name}!" with queue summary subtitle and "Refresh" action.
  - Top Metric Cards: 5 concise cards (`New`, `Open`, `In Progress`, `Waiting for Requester`, `My Assigned`) displaying large bold counts and subtle delta/subtext.
  - Interactive drill-down: Clicking any card navigates to `/staff/queue` with the corresponding status or assignment filter applied.
  - Lower Grid: "My Recent Tickets" table (columns: Ticket #, Title, Status badge, Updated timestamp) and "Quick Actions" panel (`Create Ticket`, `Search Tickets`, `My Queue`).
- **Requester Dashboard Screen (`/dashboard`)**:
  - Greeting header: "Welcome, {Name}!" with personal ticket status subtitle.
  - Metric Cards: 4 cards (`My Open Tickets`, `In Progress`, `Resolved`, `Closed`) with accessible labels and "View all" drill-down links to `/tickets`.
  - Lower Grid: "My Recent Tickets" list with status badges and "Create Ticket" / "View My Tickets" quick actions.
- **Actions Taken on Ticket Detail (`/tickets/:id` & `/staff/tickets/:id`)**:
  - Dedicated "Actions Taken" panel below Ticket Information and above/alongside Comments.
  - Actions table/card list displaying: Date/Time, Performer Name, Description, Result, Follow-Up indicator & note, Attachment notes, and Action menu (Edit).
  - "Add Action Taken" button (visible only to IT Staff and Admin).
  - Modal or collapsible inline form supporting create and edit modes with responsive inputs, dynamic follow-up validation, and submission loading states.
  - Requesters see all actions in read-only mode with no edit/create buttons.
- **Ticket Workflow & Status Controls**:
  - Ticket Detail displays the current status badge and a contextual Status Transition dropdown/action bar showing strictly permitted next statuses.
  - "Problem Appears Resolved" button for Requesters triggers a confirmation dialog that posts an advisory resolution note without altering status.
  - Conflict error banner displayed when HTTP 409 occurs with a "Refresh Ticket" button.
- **Responsive & Accessibility Rules**:
  - Mobile layout: Metric cards stack into 2-column or 1-column grids; tables switch to responsive cards; zero horizontal scroll at 375px.
  - Tablet layout: 2-column grid at 768px.
  - Desktop layout: Full multi-column view at $\ge 1024$px.
  - Full keyboard focus rings, semantic HTML headings, and non-color status badges.

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

  @@index([ticketId])
  @@index([performedById])
  @@index([actionDateTime])
}
```

```prisma
// Ticket model extensions for optimistic locking and relation:
model Ticket {
  // ... existing fields preserved ...
  actionsTaken      ActionTaken[]
  version           Int           @default(1)
  // ...
}
```

### 7.2 Database Design Decisions & Justifications

1. **Justification 1: Integer Version Field (`version`) for Optimistic Concurrency Control**:
   - *Rationale*: A high-throughput service desk involves multiple actors (Ticket Owner, assisting IT Staff, and Requesters) inspecting and mutating the same ticket concurrently. Relying solely on `updatedAt` timestamps can introduce race conditions due to sub-millisecond database precision discrepancies and clock skew across distributed or containerized runtimes. Introducing an explicit integer `version` field incremented atomically via `UPDATE "Ticket" SET version = version + 1 WHERE id = $id AND version = $expectedVersion` guarantees deterministic concurrency conflict detection and eliminates silent overwrites.
2. **Justification 2: Restrict Deletion (`onDelete: Restrict`) on `performedBy` User Relation**:
   - *Rationale*: Actions Taken represent formal audit logs of technical work performed on IT infrastructure. If an IT Staff user account is deactivated or modified, the historical integrity of who performed past diagnostic and repair actions must never be purged or orphaned. `onDelete: Restrict` prevents accidental cascade deletion of critical audit trails, aligning with the project's requirement to deactivate rather than hard-delete user accounts.
3. **Justification 3: Composite Indexing on `ticketId` and `actionDateTime`**:
   - *Rationale*: The predominant query pattern for Actions Taken is fetching all actions for a specific ticket ordered chronologically by `actionDateTime DESC`. Adding indexes on `ticketId` and `actionDateTime` ensures that work-log retrieval on Ticket Detail scales efficiently as historical action records accumulate over time.

### 7.3 Migration & Backfill Strategy
- **Migration Plan**: Generate a non-destructive Prisma migration (`2026xxxx_add_actions_taken_and_version`).
- **Legacy Ticket Handling**: Existing tickets created in Labs 1–3 default to `version = 1` and have an empty list (`[]`) of Actions Taken.
- **Rollback Procedure**: In the event of a rollback, a down-migration script drops the `ActionTaken` table and removes the `version` column from `Ticket` without altering any existing user or ticket records.

### 7.4 Seed Data Strategy
- Maintain an idempotent `prisma/seed.ts` script safe to re-run multiple times.
- Seed tickets representing all 8 statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
- Seed realistic variation of Actions Taken:
  - Multiple tickets with **0 Actions Taken** (e.g., brand new tickets).
  - Multiple tickets with **1 Action Taken**.
  - Multiple tickets with **2 to 4 Actions Taken** showing different IT Staff performers, follow-up flags, and attachment notes.
- Seed data ensuring non-zero metrics on IT Staff dashboard and at least one user with zero tickets to verify empty states.

---

## 8. API Contract Summary

*(Full endpoint schemas documented in [docs/lab-04/api-spec.md](file:///c:/Year3/Semester%201/CPE334%20Software%20Engineering/toktickit/docs/lab-04/api-spec.md))*

| Method | Endpoint | Allowed Roles | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/dashboard/requester` | `REQUESTER` | Retrieve authenticated Requester's metrics & recent tickets | `200`, `401`, `403` |
| `GET` | `/api/dashboard/staff` | `IT_STAFF`, `ADMIN` | Retrieve IT operational metrics & recent/urgent queue | `200`, `401`, `403` |
| `GET` | `/api/dashboard/admin` | `ADMIN` | Retrieve IT operational metrics + user account statistics | `200`, `401`, `403` |
| `GET` | `/api/tickets/:id/actions-taken` | `REQUESTER` (owner), `IT_STAFF`, `ADMIN` | List all actions taken for a ticket | `200`, `401`, `403`, `404` |
| `POST` | `/api/tickets/:id/actions-taken` | `IT_STAFF`, `ADMIN` | Create a new action taken record under ticket | `201`, `400`, `401`, `403`, `404` |
| `PATCH` | `/api/tickets/:id/actions-taken/:actionId` | `IT_STAFF`, `ADMIN` | Update an existing action taken record | `200`, `400`, `401`, `403`, `404` |
| `PATCH` | `/api/tickets/:id/workflow` | `REQUESTER` (advisory only), `IT_STAFF`, `ADMIN` | Update ticket status, resolution notes, and concurrency version | `200`, `400`, `401`, `403`, `404`, `409` |

---

## 9. Acceptance Criteria (AC)

- **AC-01**: Given an authenticated IT Staff or Admin and valid payload, when creating an Action Taken on an accessible ticket, then the record is created with `performedById` bound to the authenticated user and HTTP 201 is returned.
- **AC-02**: Given an Action Taken creation request with `followUpRequired = true` but an empty `followUpNote`, then the backend rejects the request with HTTP 400 and an informative error message.
- **AC-03**: Given an Action Taken creation or update request with `actionDateTime` set in the future (> 5 minutes ahead), then the backend rejects the request with HTTP 400.
- **AC-04**: Given an authenticated Requester viewing a ticket they own, when requesting `GET /api/tickets/:id/actions-taken`, then all actions taken are returned with full details in read-only format.
- **AC-05**: Given an authenticated Requester, when attempting to `POST` or `PATCH` on `/api/tickets/:id/actions-taken`, then the backend rejects the request with HTTP 403 Forbidden.
- **AC-06**: Given an authenticated Requester attempting to view actions taken on a ticket owned by another user, then the backend returns HTTP 403 Forbidden or 404 Not Found.
- **AC-07**: Given a ticket in `OPEN` status, when an IT Staff user transitions the status to `RESOLVED` with the current ticket version, then the status updates to `RESOLVED` and HTTP 200 is returned.
- **AC-08**: Given an authenticated Requester, when submitting an advisory "Problem Appears Resolved" indication, then a resolution audit comment is recorded, but the ticket status remains unchanged.
- **AC-09**: Given an authenticated Requester attempting to submit a status transition to `RESOLVED`, then the backend rejects the operation with HTTP 403 Forbidden.
- **AC-10**: Given a status update request with a mismatched or stale `version` (optimistic concurrency failure), then the backend rejects the update with HTTP 409 Conflict without modifying the ticket.
- **AC-11**: Given an unpermitted status transition (e.g. `NEW` $\rightarrow$ `CLOSED`), then the backend rejects the update with HTTP 400.
- **AC-12**: Given an authenticated Requester, when retrieving `/api/dashboard/requester`, then all counts and recent tickets reflect only tickets where `requesterId == authenticatedUser.id`.
- **AC-13**: Given an authenticated IT Staff user, when retrieving `/api/dashboard/staff`, then system-wide queue counts (`New`, `Open`, `In Progress`, `Waiting for Requester`) and `My Assigned` counts match database queries.
- **AC-14**: Given an IT Staff user clicking the "Waiting for Requester" metric card on the dashboard, then the user is navigated to `/staff/queue?status=WAITING_FOR_REQUESTER`.
- **AC-15**: Given a user with zero matching tickets on any dashboard list, then a clean Zen Green empty-state component is displayed with helpful guidance.
- **AC-16**: Given any form submission on Actions Taken or Ticket Workflow, when the submit button is clicked, then it is disabled during network transit to prevent duplicate records.
- **AC-17**: Given a form submission that fails with a 400 validation error, then the entered form values are preserved in the UI so the user does not need to retype.
- **AC-18**: Given viewports of 375px (Mobile), 768px (Tablet), and 1280px (Desktop), all Lab 4 dashboard and Ticket Detail screens render without horizontal scrolling or overlapping elements.
- **AC-19**: All interactive elements (buttons, inputs, cards, links) exhibit visible focus rings during keyboard navigation (Tab / Shift+Tab).
- **AC-20**: All regression capabilities from Labs 1, 2, and 3 (auth, first-login password change, ticket creation, attachments, public comments, internal notes, admin user management) continue to function without errors.

---

## 10. Definition of Done (DoD)

A deliverable is considered **Done** for Sprint 4 only when all items below are fulfilled:

1. **Specification & Contracts**:
   - `docs/lab-04/specification.md`, `ui-spec.md`, `api-spec.md`, and `tests.md` are committed to git and verified.
2. **Database & Migrations**:
   - Prisma schema updated with `ActionTaken` model, relations, indexes, and `version` concurrency field.
   - Migration applied cleanly and backward compatibility with Lab 1–3 data verified.
   - Idempotent seed script runs repeatedly and creates realistic multi-role tickets and actions.
3. **Backend Implementation & APIs**:
   - REST endpoints for Actions Taken CRUD, Requester Dashboard, Staff Dashboard, and Ticket Workflow implemented with strict role authorization.
   - Concurrency conflict handling (HTTP 409) and validation rules enforced server-side.
4. **Frontend Implementation & Zen Green UI**:
   - Responsive Dashboards for Requester, IT Staff, and Admin implemented with drill-down navigation.
   - Actions Taken panel on Ticket Detail supporting list, create, and edit modes with form validation.
   - Contextual status transition controls implemented with safe disable states.
5. **Quality Assurance & Traceability**:
   - Every Acceptance Criterion (`AC-01` through `AC-20`) is mapped to an automated test file in `tests.md`.
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
2. **Advisory Resolution Storage**: The Requester's "Problem Appears Resolved" action is recorded as a system-generated `PublicComment` with a specialized metadata flag or indicator (e.g. `[Requester Feedback: Problem Appears Resolved]`), providing immediate audit visibility in the comment thread without mutating the operational ticket status.
3. **Action Taken Editing Window**: IT Staff and Administrators may edit Action Taken records (e.g., correcting notes or results), while retaining the original creation timestamp and recording an `updatedAt` audit timestamp.
4. **Timezone Handling**: All database timestamps are stored in UTC (`ISO 8601`) and formatted in the user's localized browser timezone (defaulting to Bangkok GMT+7 as per local academic context) for consistent display.
