# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal
Deliver an enterprise-grade, multi-role IT Ticketing increment that transitions TokTickIT from a development-emulated environment to real authentication and role-based authorization. The sprint establishes secure email/password credential verification with mandatory first-login password changes, role-aware application shell navigation, seamless migration of Lab 2 ticket/attachment records, an operational IT Staff Ticket Queue with advanced filtering, IT Staff ticket lifecycle management (ownership claim/reassign, IT priority, status workflow, public comments, and secure internal notes), and a minimalist Administrator User Management console with account safety guardrails.

## 2. Stakeholder Request Interpretation
The IT department requires replacing the temporary Development Requester testing selector with genuine user accounts and secure authentication. The system must support three distinct, non-overlapping roles: **Requester**, **IT Staff**, and **Administrator**. 

Requesters must continue utilizing all Lab 2 ticket creation, viewing, and attachment capabilities, with ownership strictly anchored to their authenticated session rather than client-supplied identifiers. Requesters can post Public Comments and signal that their issue appears resolved. IT Staff need a dedicated operational queue to triage, search, filter, sort, and paginate tickets across all users, open ticket details, claim or reassign primary ticket ownership, calibrate IT Priority, execute permitted ticket status transitions, communicate publicly with requesters, and record private Internal Notes hidden from requesters. Administrators require a minimalist user administration screen to inspect user accounts, create new users with single-role assignment and initial passwords, edit basic user profile and activation states, and reset temporary passwords. Security must be enforced on the backend through strict authorization checks rather than simply hiding UI buttons, and all interfaces must strictly adhere to the Zen Green design system across desktop, tablet, and mobile devices.

## 3. Scope

### Included
- **Authentication & Credential Management**:
  - Email and password login with secure password hashing (bcrypt).
  - Identification and session verification via HTTP-only session cookies / Bearer tokens.
  - Safe error handling for invalid credentials and deactivated accounts without information leakage.
  - Mandatory first-login password change for accounts flagged with temporary/initial passwords.
  - Session termination via logout with immediate client state invalidation.
- **Role-Based Authorization & Navigation**:
  - Three distinct system roles: `Requester`, `IT Staff`, `Administrator`.
  - Server-side role enforcement on all API routes (returning HTTP 401/403).
  - Dynamic, role-aware Zen Green application shell and navigation bar.
- **Requester Experience & Lab 2 Regression**:
  - Complete removal of the Development Requester selector and client-side selection modal.
  - Automatic injection of authenticated user identity for ticket and attachment operations.
  - Continued protection and isolation of requester tickets and attachments.
  - Append-only Public Comments thread on Ticket Detail.
  - "Problem Appears Resolved" non-status-altering audit action.
- **IT Staff Operational Workflow**:
  - Centralized Ticket Queue displaying tickets across all requesters.
  - Queue search (ticket number, summary), multi-attribute filtering (category, status, requested priority, IT priority, ownership), column sorting, and pagination.
  - Ticket Detail operations: Claim unassigned tickets or reassign primary ownership to active IT Staff/Admins.
  - Independent IT Priority calibration (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - Formal Ticket Status transition matrix (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`).
  - Creation and viewing of role-restricted, append-only Internal Notes (strictly inaccessible to Requesters).
- **Administrator User Management**:
  - User directory listing showing Name, Email, Role, Status, and Edit action.
  - Substring search (name, email) and role filtering.
  - User creation with single-role assignment, active status, and temporary initial password.
  - User editing (name, email, role, activation toggle).
  - Setting a new initial password that triggers mandatory password change on next login.
  - Guardrails: Duplicate email prevention, self-deactivation prevention, last active administrator protection, and deactivation in lieu of user deletion.
- **Database Evolution & Seed Data**:
  - Prisma schema expansion to support `User`, `Role`, `PublicComment`, `InternalNote`, and IT ticket fields.
  - Non-destructive migration preserving existing Lab 2 categories, related systems, tickets, and attachments.
  - Idempotent database seed populating test users ($\ge 4$ active + 1 inactive Requesters, $\ge 3$ active + 1 inactive IT Staff, $\ge 1$ active Admin) and distributed tickets.

### Excluded
- Email notifications, SMTP integration, password-reset emails, or activation links.
- Public self-registration or requester account creation.
- Multi-factor authentication (MFA), social logins, or SSO.
- Multiple simultaneous roles assigned to a single user.
- User account hard deletion, bulk operations, or CSV import/export.
- IT Staff "Actions Taken" work log items (deferred to Lab 4).
- Formal SLA calculations, escalation timers, and KPI dashboards.
- Multi-tenancy, departmental organization trees, or user profile pictures.

---

## 4. Functional Requirements

- **FR-01 (Credential Authentication)**: The system shall authenticate users using email address and password, validating active account status before issuing authenticated session credentials.
- **FR-02 (Mandatory First-Login Password Change)**: The system shall identify users flagged with `requiresPasswordChange = true`, blocking access to standard application views until a compliant new password is saved.
- **FR-03 (Session Verification & Termination)**: The system shall provide an endpoint to verify current user identity and permissions (`/api/auth/me`) and an endpoint to terminate active sessions (`/api/auth/logout`).
- **FR-04 (Role-Based Application Shell)**: The application shell shall dynamically display the authenticated user's name, role badge, logout action, and navigation destinations strictly permitted for their role.
- **FR-05 (Authenticated Requester Identity)**: The system shall extract requester identity directly from the authenticated session, eliminating the Development Requester selector and rejecting client-supplied requester IDs.
- **FR-06 (Requester Ticket Isolation)**: The system shall ensure Requesters can only access, view, and attach files to tickets they personally own, returning HTTP 403/404 for foreign tickets.
- **FR-07 (Public Comments)**: The system shall allow Requesters, IT Staff, and Administrators to post and view append-only public comments on tickets.
- **FR-08 (Requester Resolution Indication)**: The system shall allow a Requester to indicate that a problem appears resolved without modifying the formal ticket status.
- **FR-09 (IT Staff Ticket Queue)**: The system shall provide IT Staff with a unified ticket queue supporting text search, status/category/priority/owner filtering, column sorting, and paginated navigation.
- **FR-10 (Ticket Ownership Assignment)**: The system shall permit IT Staff to claim unassigned tickets or reassign primary ticket ownership to any active IT Staff or Administrator account.
- **FR-11 (IT Priority Calibration)**: The system shall permit IT Staff to assign and modify an operational IT Priority independently from the Requester's initial Requested Priority.
- **FR-12 (Permitted Status Transitions)**: The system shall enforce ticket status transitions according to the approved state transition matrix, rejecting unauthorized status jumps.
- **FR-13 (Internal Operational Notes)**: The system shall allow IT Staff and Administrators to record and view append-only Internal Notes on tickets, strictly hiding these notes from Requesters.
- **FR-14 (Administrator User Directory)**: The system shall provide Administrators with a user management interface displaying user details, account status, search, and role filtering.
- **FR-15 (User Provisioning & Maintenance)**: The system shall allow Administrators to create accounts with single roles and initial passwords, update user details, and toggle account activation.
- **FR-16 (Administrator Safety Guards)**: The system shall block duplicate email addresses, prevent an Administrator from deactivating their own account, and prohibit deactivating the system's last active Administrator.

---

## 5. Business Rules

- **BR-01 (Active Account Authentication)**: Only active user accounts (`isActive = true`) with valid password hashes may successfully authenticate. Inactive accounts must be rejected with a generic failure message.
- **BR-02 (Mandatory Password Change Enforcement)**: When `requiresPasswordChange = true`, the user cannot access any functional screens (ticket queue, ticket detail, user management). All protected operational API routes must reject requests with HTTP 403 (Password Change Required) until the password is changed.
- **BR-03 (Password Strength Standards)**: New passwords must be at least 8 characters in length, include both uppercase and lowercase letters, and contain at least one numeric digit and one special character.
- **BR-04 (Safe Credential Validation)**: Failed login attempts must return HTTP 401 with a generic error message ("Invalid email or password") to prevent user enumeration. The system must not disclose whether the email exists or whether an account is inactive.
- **BR-05 (Server-Enforced Requester Identity)**: For all requester operations (ticket creation, listing, attachment upload/removal), the backend must extract user ID exclusively from the verified session token. Any `requesterId` or `userId` parameter provided in client request bodies or query strings must be ignored.
- **BR-06 (Requester Ticket Boundaries)**: A user with role `REQUESTER` may only query and view tickets where `ticket.requesterId == authenticatedUser.id`. Accessing another user's ticket must return HTTP 403 Forbidden without leaking metadata.
- **BR-07 (Role Exclusivity)**: Each user account is assigned exactly one role: `REQUESTER`, `IT_STAFF`, or `ADMIN`. Multi-role assignments are not supported in Lab 3.
- **BR-08 (Single Ticket Ownership)**: Each ticket may have at most one primary Ticket Owner (`ownerId`), which must reference an active user with role `IT_STAFF` or `ADMIN`. Unassigned tickets have `ownerId = null`.
- **BR-09 (IT Priority Independence & Initialization)**: `requestedPriority` is set at ticket creation by the requester and is immutable. `itPriority` is non-nullable (defaulting to `MEDIUM` in schema, but initialized upon ticket creation to copy `requestedPriority`), and can subsequently be updated only by IT Staff or Administrators.
- **BR-10 (Ticket Status Set)**: Permitted ticket statuses are strictly defined as: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
- **BR-11 (Initial Ticket Status)**: Every newly created ticket begins in status `NEW` with `ownerId = null`.
- **BR-12 (Permitted Status Transitions)**: Status transitions must adhere to the Status Transition Matrix (Section 6). Direct jumps between incompatible statuses (e.g., `NEW` to `CLOSED`) are rejected with HTTP 422 Unprocessable Entity.
- **BR-13 (Requester Status Boundary)**: A Requester cannot directly set ticket status to `RESOLVED` or `CLOSED`. Requesters may only click "Problem Appears Resolved", which appends an audit event / notice while leaving formal status modification to IT Staff.
- **BR-14 (Public Comments Visibility & Immobility)**: Public comments are visible to Requesters, IT Staff, and Administrators. Comments are append-only; editing and deletion are strictly disallowed.
- **BR-15 (Internal Notes Confidentiality)**: Internal Notes are strictly visible to `IT_STAFF` and `ADMIN`. Requesters attempting to view or query Internal Notes must receive HTTP 403 Forbidden, and ticket responses served to Requesters must omit internal notes completely.
- **BR-16 (Comment & Note Validation)**: Comment and note text bodies are mandatory, trimmed of whitespace, and must be between 2 and 2,000 characters. Empty or whitespace-only submissions must be rejected.
- **BR-17 (Author Audit Integrity)**: Comment and note author IDs and creation timestamps are stamped by the backend from the verified session; client-supplied author data is ignored.
- **BR-18 (Queue Query Limits)**: The IT Staff ticket queue supports pagination with page sizes of 10, 20, or 50. Default sort is descending by `createdAt`. Default page size is 10.
- **BR-19 (Queue Search Scope)**: Queue search executes case-insensitive substring matching against `ticketNo` and `summary`.
- **BR-20 (Administrator Scope)**: Administrators manage user accounts. By approved engineering design, Administrators also retain escalation authority on ticket triage and operations (see Section 13 for explicit justification).
- **BR-21 (Unique Email Constraint)**: User emails must be unique across the system (case-insensitive). Submitting a duplicate email during creation or edit returns HTTP 409 Conflict.
- **BR-22 (Admin Initial Password Assignment)**: Creating a user or resetting a user's password sets a temporary password and automatically sets `requiresPasswordChange = true`.
- **BR-23 (Self-Deactivation Guard)**: An Administrator cannot deactivate their own active account (`userId == authenticatedUser.id`), returning HTTP 422 Unprocessable Entity.
- **BR-24 (Last Active Administrator Guard)**: The system must never allow deactivating or reassigning the role of the final remaining active Administrator.
- **BR-25 (Deactivation Over Deletion)**: Hard deletion of user accounts is prohibited to maintain referential integrity with historic tickets, comments, and attachments. Accounts are deactivated via `isActive = false`.
- **BR-26 (Deactivated User Access Invalidation)**: Deactivating an account immediately blocks subsequent logins and causes ongoing authenticated requests to be rejected on next validation.
- **BR-27 (Safe Information Shielding)**: Direct API calls to resources belonging to other users or internal restricted items must not disclose whether the requested resource exists (consistent 403/404 handling).
- **BR-28 (Development Password Safety)**: Development and seeded passwords must never contain real personal credentials, and password hashes must be salted with minimum 10 bcrypt salt rounds.

---

## 6. Ticket Status Transition Matrix

| Current Status | Permitted Next Status | Permitted Roles | Conditions & Required Context |
|---|---|---|---|
| **NEW** | `OPEN`, `CANCELLED` | `IT_STAFF`, `ADMIN` | Transition to `OPEN` typically occurs when an IT Staff member claims or begins reviewing the ticket. |
| **OPEN** | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED` | `IT_STAFF`, `ADMIN` | Investigation underway or additional requester input required. |
| **IN_PROGRESS** | `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` | `IT_STAFF`, `ADMIN` | Work actively progressing towards technical solution. |
| **WAITING_FOR_REQUESTER** | `IN_PROGRESS`, `RESOLVED`, `CANCELLED` | `IT_STAFF`, `ADMIN` | Requester feedback received or issue determined solved. |
| **RESOLVED** | `CLOSED`, `REOPENED` | `IT_STAFF`, `ADMIN` | Resolution confirmed by requester or verified by staff. Reopens if problem recurs. |
| **CLOSED** | `REOPENED` | `IT_STAFF`, `ADMIN` | Ticket formally terminated. Reopening requires clear justification. |
| **REOPENED** | `IN_PROGRESS`, `RESOLVED`, `CANCELLED` | `IT_STAFF`, `ADMIN` | Follow-up investigation for reopened issue. |
| **CANCELLED** | *None (Terminal)* | `IT_STAFF`, `ADMIN` | Invalid, duplicate, or withdrawn ticket. |

---

## 7. Role & Authorization Matrix

This matrix establishes the comprehensive security contract governing all system capabilities, endpoint protections, ownership constraints, and UI element permissions.

| Capability / Resource | HTTP Endpoint | Anonymous | Requester | IT Staff | Administrator | Ownership & Authorization Rule |
|---|---|:---:|:---:|:---:|:---:|---|
| **User Login** | `POST /api/auth/login` | Allowed | Allowed | Allowed | Allowed | Publicly accessible; requires `isActive = true`. |
| **Current User Profile** | `GET /api/auth/me` | 401 | Allowed | Allowed | Allowed | Validates active session token. |
| **User Logout** | `POST /api/auth/logout` | 401 | Allowed | Allowed | Allowed | Invalidate session credentials. |
| **Change Password** | `POST /api/auth/change-password` | 401 | Allowed | Allowed | Allowed | Permitted when `requiresPasswordChange = true` or user-initiated. |
| **My Tickets List** | `GET /api/tickets` | 401 | Allowed | 403 | 403 | Requester view: scoped strictly to `ticket.requesterId == session.userId`. |
| **Create Ticket** | `POST /api/tickets` | 401 | Allowed | Allowed | Allowed | Requester identity injected from session. |
| **Requester Ticket Detail** | `GET /api/tickets/:id` | 401 | Owner Only | Allowed | Allowed | Requester gets 403/404 if not owner; response excludes Internal Notes. |
| **Upload / Download Attachment** | `POST/GET /api/tickets/:id/attachments` | 401 | Owner Only | Allowed | Allowed | Requester can only manage attachments on owned tickets. |
| **Soft Remove Attachment** | `POST /api/attachments/:id/remove` | 401 | Owner Only | Allowed | Allowed | Requester can only remove attachments on owned tickets. |
| **Public Comments (List & Post)** | `GET/POST /api/tickets/:id/comments` | 401 | Owner Only | Allowed | Allowed | Requester can only post/view comments on owned tickets. |
| **Problem Appears Resolved** | `POST /api/tickets/:id/resolve-indication` | 401 | Owner Only | 403 | 403 | Only owning Requester may signal resolution indication. |
| **IT Staff Ticket Queue** | `GET /api/staff/tickets` | 401 | 403 | Allowed | Allowed | Global queue across all requesters; blocked for Requesters. |
| **IT Staff Ticket Detail** | `GET /api/staff/tickets/:id` | 401 | 403 | Allowed | Allowed | Full operational view including Internal Notes; blocked for Requesters. |
| **Claim / Reassign Ticket** | `PATCH /api/staff/tickets/:id/ownership` | 401 | 403 | Allowed | Allowed | Target `ownerId` must be active IT Staff or Admin. |
| **Update IT Priority** | `PATCH /api/staff/tickets/:id/priority` | 401 | 403 | Allowed | Allowed | Operational calibration; blocked for Requesters. |
| **Update Ticket Status** | `PATCH /api/staff/tickets/:id/status` | 401 | 403 | Allowed | Allowed | Enforces Section 6 Status Transition Matrix. |
| **Internal Notes (List & Post)** | `GET/POST /api/tickets/:id/notes` | 401 | 403 | Allowed | Allowed | Confidential operational notes; strictly blocked for Requesters. |
| **User Directory List** | `GET /api/admin/users` | 401 | 403 | 403 | Allowed | Administrator only; search & role filter. |
| **Create User** | `POST /api/admin/users` | 401 | 403 | 403 | Allowed | Admin only; generates temporary initial password. |
| **Edit User Profile / Status** | `PATCH /api/admin/users/:id` | 401 | 403 | 403 | Allowed | Admin only; enforces self-deactivation & last-admin guards. |
| **Reset Initial Password** | `POST /api/admin/users/:id/reset-password`| 401 | 403 | 403 | Allowed | Admin only; forces `requiresPasswordChange = true`. |

---

## 8. UI Specification Summary

*(See [ui-spec.md](file:///c:/Year3/Semester%201/CPE334%20Software%20Engineering/toktickit/docs/lab-03/ui-spec.md) for full visual designs, tokens, and responsive checklists)*

### Application Shell & Navigation
- Replaces the Lab 2 Development Requester selector with the authenticated user's full name, role badge, and a secure Logout action.
- Navigation links dynamically filter according to role:
  - **Requester**: `My Tickets`, `Create Ticket`.
  - **IT Staff**: `Ticket Queue`, `Create Ticket` (or view operations).
  - **Administrator**: `User Management`.

### Key Interface Screens
1. **Login Screen**: Minimalist card with TokTickIT branding, email and password inputs, show/hide password toggle, inline validation errors, in-flight busy state, and safe error alert banner.
2. **Mandatory Password Change Screen**: Blocking screen for newly provisioned or reset accounts. Requires current password, new password, confirmation password, and displays dynamic rule-checklist indicators.
3. **Requester Ticket Detail Screen**: Preserved Lab 2 ticket layout plus append-only Public Comments feed and "Problem Appears Resolved" button.
4. **IT Staff Ticket Queue Screen**: Operational table with search bar, filter dropdowns (Category, Status, Priority, IT Priority, Owner), column sorting indicators, pagination controls, and responsive collapse to cards on mobile.
5. **IT Staff Ticket Detail Screen**: Grouped layout separating read-only requester information from operational controls: Ticket Owner assignment dropdown, IT Priority selector, Status transition dropdown, tabbed Public Comments vs. Internal Notes (highlighted in amber/gold with lock icon).
6. **Administrator User Management Screen**: User directory table, search bar, role filter dropdown, "Create User" action modal, "Edit User" drawer/modal with activation toggle and "Reset Initial Password" action.

---

## 9. Data Changes

### Prisma Schema Design
The PostgreSQL schema evolves from Lab 2 to introduce real users, roles, password hashes, comments, internal notes, and staff workflow fields:

```prisma
enum Role {
  REQUESTER
  IT_STAFF
  ADMIN
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketStatus {
  NEW
  OPEN
  IN_PROGRESS
  WAITING_FOR_REQUESTER
  RESOLVED
  CLOSED
  REOPENED
  CANCELLED
}

model User {
  id                     Int             @id @default(autoincrement())
  email                  String          @unique
  passwordHash           String
  name                   String
  role                   Role            @default(REQUESTER)
  isActive               Boolean         @default(true)
  requiresPasswordChange Boolean         @default(false)
  createdAt              DateTime        @default(now())
  updatedAt              DateTime        @updatedAt

  // Relationships
  requestedTickets       Ticket[]        @relation("RequesterTickets")
  assignedTickets        Ticket[]        @relation("AssignedTickets")
  publicComments         PublicComment[]
  internalNotes          InternalNote[]

  @@index([email, isActive])
  @@index([role, isActive])
}

model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  createdAt DateTime @default(now())
  tickets   Ticket[]
}

model RelatedSystem {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  createdAt DateTime @default(now())
  tickets   Ticket[]
}

model Ticket {
  id                     Int             @id @default(autoincrement())
  ticketNo               String          @unique
  requesterId            Int
  requester              User            @relation("RequesterTickets", fields: [requesterId], references: [id])
  ownerId                Int?
  owner                  User?           @relation("AssignedTickets", fields: [ownerId], references: [id])
  categoryId             Int
  category               Category        @relation(fields: [categoryId], references: [id])
  relatedSystemId        Int
  relatedSystem          RelatedSystem   @relation(fields: [relatedSystemId], references: [id])
  summary                String
  description            String
  requestedPriority      Priority        @default(MEDIUM)
  itPriority             Priority        @default(MEDIUM)
  currentStatus          TicketStatus    @default(NEW)
  resolvedIndicated      Boolean         @default(false)
  resolvedIndicatedAt    DateTime?
  createdAt              DateTime        @default(now())
  updatedAt              DateTime        @updatedAt

  // Relationships
  attachments            Attachment[]
  publicComments         PublicComment[]
  internalNotes          InternalNote[]

  @@index([requesterId, createdAt])
  @@index([ownerId, currentStatus])
  @@index([categoryId, currentStatus])
  @@index([currentStatus, itPriority])
}

model Attachment {
  id             Int       @id @default(autoincrement())
  ticketId       Int
  ticket         Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  originalName   String
  storedFileName String
  fileSize       Int
  mimeType       String
  isRemoved      Boolean   @default(false)
  removedAt      DateTime?
  removalReason  String?
  createdAt      DateTime  @default(now())

  @@index([ticketId, isRemoved])
}

model PublicComment {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  content   String
  createdAt DateTime @default(now())

  @@index([ticketId, createdAt])
}

model InternalNote {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  content   String
  createdAt DateTime @default(now())

  @@index([ticketId, createdAt])
}
```

### Migration Strategy from Lab 2
1. **Model Evolution**: Migrate records from `RequesterUser` into the `User` table, setting `role = REQUESTER`, assigning standard development password hashes (e.g. `Password123!`), and mapping all ticket foreign keys cleanly.
2. **Ticket Workflow Fields**: Add `ownerId`, `itPriority` (initialized to copy `requestedPriority`), `resolvedIndicated`, and `resolvedIndicatedAt`.
3. **Comment/Note Tables**: Create `PublicComment` and `InternalNote` tables with foreign keys cascading from `Ticket` and referencing `User`.

### Idempotent Seed Decisions
The seed script (`prisma/seed.ts`) utilizes `upsert` queries to ensure safe repeated runs:
- **Requesters**: 4 active (*Jennifer Anderson*, *Michael Brown*, *Sarah Johnson*, *David Lee*) and 1 inactive (*Robert Taylor*).
- **IT Staff**: 3 active (*Alex Turner*, *Jessica Miller*, *Kevin Patel*) and 1 inactive (*Rachel Green*).
- **Administrator**: 1 active Administrator (*System Admin* - `admin@toktickit.kmutt.ac.th`).
- **Tickets & Notes**: Seed realistic tickets across various statuses, priorities, and assignments with representative Public Comments and Internal Notes.

---

## 10. API Contract Summary

*(See [api-spec.md](file:///c:/Year3/Semester%201/CPE334%20Software%20Engineering/toktickit/docs/lab-03/api-spec.md) for full endpoint specifications, request/response schemas, and status codes)*

### Summary Table

| Category | Method | Path | Role Authorization | Purpose |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/auth/login` | Public | Authenticate user & issue session cookie/token |
| **Auth** | `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile & role |
| **Auth** | `POST` | `/api/auth/logout` | Authenticated | Terminate session & clear cookies |
| **Auth** | `POST` | `/api/auth/change-password` | Authenticated (Must Change) | Update password & clear password-change flag |
| **Requester** | `GET` | `/api/tickets` | Requester | Retrieve paginated owned tickets |
| **Requester** | `POST` | `/api/tickets` | Requester | Create new ticket with session identity |
| **Requester** | `GET` | `/api/tickets/:id` | Owner / Staff / Admin | View ticket details (excludes internal notes) |
| **Comments** | `GET` | `/api/tickets/:id/comments` | Owner / Staff / Admin | Retrieve public comment thread |
| **Comments** | `POST` | `/api/tickets/:id/comments` | Owner / Staff / Admin | Post append-only public comment |
| **Comments** | `POST` | `/api/tickets/:id/resolve-indication` | Owner Requester | Indicate problem appears resolved |
| **Staff Queue**| `GET` | `/api/staff/tickets` | IT Staff / Admin | Query tickets with search, filter, sort, page |
| **Staff Ops** | `GET` | `/api/staff/tickets/:id` | IT Staff / Admin | Retrieve one ticket for operational workflow |
| **Staff Ops** | `PATCH` | `/api/staff/tickets/:id/ownership` | IT Staff / Admin | Claim or reassign ticket owner |
| **Staff Ops** | `PATCH` | `/api/staff/tickets/:id/priority` | IT Staff / Admin | Update operational IT Priority |
| **Staff Ops** | `PATCH` | `/api/staff/tickets/:id/status` | IT Staff / Admin | Execute permitted status transition |
| **Staff Notes**| `GET` | `/api/tickets/:id/notes` | IT Staff / Admin | Retrieve internal operational notes |
| **Staff Notes**| `POST` | `/api/tickets/:id/notes` | IT Staff / Admin | Create append-only internal operational note |
| **Admin** | `GET` | `/api/admin/users` | Administrator | List users with search & role filter |
| **Admin** | `POST` | `/api/admin/users` | Administrator | Create user with initial password |
| **Admin** | `PATCH` | `/api/admin/users/:id` | Administrator | Update user profile & activation status |
| **Admin** | `POST` | `/api/admin/users/:id/reset-password` | Administrator | Set new initial password |

---

## 11. Acceptance Criteria

```text
[ ] AC-1.1: docs/lab-03/specification.md defines numbered Functional Requirements (FRs), Business Rules (BRs), dedicated authorization matrix, status transition matrix, and Product Definition of Done.
[ ] AC-1.2: docs/lab-03/ui-spec.md specifies screen layouts, Zen Green design tokens, badge styles, validation states, and responsive rules (Desktop, Tablet, Mobile) for all new screens.
[ ] AC-1.3: docs/lab-03/api-spec.md documents all endpoints, request/response schemas, session handling, query parameters, and safe error responses.
[ ] AC-1.4: docs/lab-03/tests.md maps every Acceptance Criterion across Sprint 3 to planned automated test IDs with explicit test file paths.
[ ] AC-1.5: Specification and test plan PR is reviewed and merged into lab3-staging before implementation PRs are merged.
[ ] AC-2.1: Prisma schema defines User model with email, passwordHash, role (REQUESTER, IT_STAFF, ADMIN), isActive, and requiresPasswordChange fields.
[ ] AC-2.2: Ticket model relates to User for Requester and optional primary IT Staff owner.
[ ] AC-2.3: Comment (Public) and InternalNote models are created with foreign keys to Ticket and User.
[ ] AC-2.4: Migration script successfully migrates Lab 2 Requesters into the new User model without losing existing ticket/attachment relationships.
[ ] AC-2.5: Idempotent seed script (prisma/seed.ts) generates at least 4 active + 1 inactive Requesters, 3 active + 1 inactive IT Staff, and 1 active Administrator with hashed development passwords.
[ ] AC-3.1: POST /api/auth/login verifies active user credentials, rejects inactive accounts with a safe message, and issues session cookie/token.
[ ] AC-3.2: GET /api/auth/me returns current user identity and role; POST /api/auth/logout terminates the session.
[ ] AC-3.3: User flagged with requiresPasswordChange = true is strictly redirected/blocked from main application screens until password is changed.
[ ] AC-3.4: POST /api/auth/change-password enforces strong password rules, updates password hash, and sets requiresPasswordChange = false.
[ ] AC-3.5: App Header displays authenticated user's name and role badge, removing the old Development Requester selector.
[ ] AC-4.1: All Requester Ticket/Attachment APIs strictly enforce ownership based on authenticated session identity (ignoring client-supplied IDs).
[ ] AC-4.2: Requesters can view and post Public Comments (POST /api/tickets/:id/comments) on their owned tickets.
[ ] AC-4.3: Requesters can click "Problem Appears Resolved" button, which logs an audit entry without directly forcing status to RESOLVED or CLOSED.
[ ] AC-4.4: Requesters are strictly denied access to Internal Notes endpoints (HTTP 403 Forbidden).
[x] AC-5.1: GET /api/staff/tickets returns all tickets across all requesters, filtered by IT Staff authorization.
[x] AC-5.2: Supports substring search (Ticket No/Summary), filters (Category, Status, Requested Priority, IT Priority, Owner), and pagination (10, 20, 50).
[x] AC-5.3: Non-IT Staff / Non-Admin roles attempting to access the queue API receive HTTP 403 Forbidden.
[x] AC-5.4: Renders full Data Table on Desktop (>= 992px) and converts to stacked Cards on Mobile (< 768px) using Zen Green theme.
[ ] AC-6.1: IT Staff can claim unassigned tickets or reassign primary ownership to active IT Staff members.
[ ] AC-6.2: IT Staff can update IT Priority and perform permitted status transitions according to the status matrix.
[ ] AC-6.3: IT Staff can create and view append-only Internal Notes (POST /api/tickets/:id/notes).
[ ] AC-6.4: UI clearly distinguishes Public Comments (soft green cards) from Internal Notes (soft gold/yellow cards with lock icon).
[ ] AC-7.1: Admin can list users with name/email search and role filter.
[ ] AC-7.2: Admin can create new user with single role and initial password (flagging requiresPasswordChange = true).
[ ] AC-7.3: Admin can edit user details, toggle isActive state, and trigger password reset.
[ ] AC-7.4: System prevents duplicate emails, prevents Admin self-deactivation, and prevents deactivating the last active Admin.
[ ] AC-7.5: Non-Admin users attempting access to Admin APIs receive HTTP 403 Forbidden.
[ ] AC-8.1: e2e/lab-03/authentication.spec.ts verifies login failure, active user login, mandatory password change flow, and logout session invalidation.
[ ] AC-8.2: e2e/lab-03/staff-ticket-flow.spec.ts verifies staff queue viewing, ticket claiming, IT priority adjustment, comment/note creation, and status workflow transitions.
[ ] AC-8.3: e2e/lab-03/user-administration.spec.ts verifies admin user creation, duplicate email rejection, initial password reset, self-deactivation guard, and non-admin forbidden access.
[ ] AC-8.4: All unit, API, UI, and E2E tests execute cleanly with zero failures on the final main branch, with passing terminal output documented in tests.md.
[ ] AC-9.1: Visual verification across Desktop (1280px), Tablet (768px), and Mobile (375px) passes Zen Green visual checklist without layout breakage or overflow.
[ ] AC-9.2: Readable screenshots demonstrating all required states are captured and saved in artifacts/lab-03/screenshots/.
[ ] AC-9.3: docs/lab-03/reviewer.md is completed with reviewer identity, PR links, review comments, responses, and approvals.
[ ] AC-9.4: docs/lab-03/ai-use.md is completed with LLM model details, 6-10 representative prompts, and reflection.
[ ] AC-9.5: lab3-staging is merged cleanly into main with all Kanban issues moved to Done, satisfying the Product Definition of Done.
```

---

## 12. Definition of Done

### Part 1: Product Completion
- [ ] All Functional Requirements (FR-01 through FR-16) and Business Rules (BR-01 through BR-28) implemented.
- [ ] Prisma schema evolved and migrated with existing Lab 2 data preserved.
- [ ] Idempotent seed script populated with specified counts of Requesters, IT Staff, Admins, and distributed tickets.
- [ ] 100% of planned automated tests passing across Server API, Client Component, Regression, and E2E test suites with zero skipped tests.
- [ ] Zen Green UI guidelines verified across Desktop, Tablet, and Mobile.
- [ ] Security boundaries verified: server-side role enforcement, Requester data isolation, Internal Note confidentiality, and Admin safety guards.

### Part 2: Course Delivery Requirements
- [ ] GitHub project Kanban board configured with all 9 issues transitioned to `Done`.
- [ ] Git branch workflow strictly followed: feature branches $\to$ `lab3-staging` $\to$ `main`.
- [ ] Code reviews documented in `docs/lab-03/reviewer.md` with links, comments, and approvals.
- [ ] AI prompt log and reflection documented in `docs/lab-03/ai-use.md`.
- [ ] Single concise PDF report formatted as "Answer Part 1" through "Answer Part 9" with legible screenshots.

---

## 13. Assumptions and Decisions

- **Session Architecture**: Authenticated sessions are managed using signed, HTTP-only, secure cookies (or Bearer tokens in local development) containing the user's ID, role, and password-change requirement flag (`requiresPasswordChange`).
- **Standardized Property Name (`requiresPasswordChange`)**: To prevent payload and database impedance mismatch, the field name is strictly standardized as `requiresPasswordChange` across the Prisma schema, authentication tokens, API request/response bodies, and client state.
- **Password Hashing**: Passwords are saved as one-way salted hashes using `bcrypt` (10 rounds) to ensure secure credential storage.
- **Append-Only Immutability**: Public Comments and Internal Notes cannot be updated or deleted once created, preserving an unalterable audit log.
- **Administrator Operational Authority Justification**: Handout Section 4.3 notes that Administrator and IT Staff responsibilities are conceptually separate, but allows Administrators to perform IT Staff operations if explicitly permitted by the authorization matrix. In our engineering contract, Administrators are granted parity on IT Staff ticket endpoints (`/api/staff/tickets`, ownership assignment, IT priority calibration, status transitions, and internal notes). This design choice is justified for operational continuity in small organizations and educational lab environments:
  1. *System Oversight & Continuity*: Administrators must be able to claim or reassign tickets if an assigned IT Staff member is deactivated, unavailable, or on leave.
  2. *Escalation & Intervention*: Administrators occasionally intervene directly on critical or blocked tickets without requiring a secondary IT Staff persona account.
  3. *UI Role Separation Maintained*: Although permitted at the API level, the default Administrator UI shell directs exclusively to User Management. Ticketing operations are accessed strictly via explicit escalation or direct ticket links, preserving the conceptual role separation required by the stakeholder.
