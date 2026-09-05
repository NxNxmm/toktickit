# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a responsive, production-ready, full-stack Requester-facing IT Ticketing MVP with a temporary Development Requester selection mechanism, ticket creation with attachment handling, a comprehensive My Tickets list (search, filter, sort, and pagination), a read-only Ticket Detail view, and an attachment lifecycle featuring soft removal, metadata preservation, and strict cross-requester ownership protection.

## 2. Stakeholder Request Interpretation
The IT department needs an end-user ticketing portal that allows requesters (employees/students) to report technical issues, categorize problems, identify affected systems, declare requested priority, and provide supporting attachments. Requesters must be able to view and manage only their own submitted tickets without leaking data across accounts. Because production authentication is scheduled for Sprint 3, this sprint provides a Development Requester selector to simulate multi-user testing contexts. The user interface must adhere strictly to the Zen Green design language and support desktop, tablet, and mobile form factors.

## 3. Scope

### Included
- **Development Requester Selector**: Simulated login allowing users to pick from active seeded requesters and switch contexts at any time.
- **Ticket Creation (Create Mode)**: Form capturing Category, Related System, Requested Priority, Summary, Description, and file attachments (up to 5 files, $\le$ 5 MB each, formats: JPG, JPEG, PNG, WEBP, PDF).
- **Unique Ticket Numbering**: Backend generation of unique, human-readable ticket numbers (e.g., `TKT-2026-XXXXXX`).
- **My Tickets List**: Paginated, sortable, searchable, and filterable table/cards showing only tickets owned by the active requester.
- **Requester Ticket Detail (View Mode)**: Read-only display of ticket metadata, status, description, and attachment list.
- **Attachment Lifecycle & Soft Removal**: Uploading new attachments to existing tickets, downloading active attachments, and soft-removing attachments with a mandatory reason while preserving metadata and blocking file downloads.
- **Requester Ownership Enforcement**: Strict backend authorization ensuring Requester A cannot read or modify Requester B's tickets or attachments.
- **Zen Green Design System**: Consistent visual hierarchy, tokens, responsive breakpoints, accessible focus states, and loading/error feedback.

### Excluded
- **Authentication & Security Infrastructure**: Real login, password hashing, user registration, JWT/session cookies, and role-based permissions (deferred to Lab 3).
- **IT Staff Workflows**: Staff dashboard, ticket assignment/claiming queues, changing IT Priority, and status transitions beyond the initial `New` state.
- **Collaboration & Notes**: Public comments, internal notes, and Actions Taken work logs (deferred to future labs).
- **Administration Modules**: Admin screens for managing categories, related systems, or requesters.

---

## 4. Functional Requirements

- **FR-01 (Requester Context)**: The system shall provide a Development Requester selector populated with active requesters from the database, storing the selected identity in client context for subsequent requests.
- **FR-02 (Reference Data)**: The system shall provide endpoints to fetch active Ticket Categories and Related Systems to populate form dropdowns dynamically.
- **FR-03 (Ticket Creation)**: The system shall allow the selected requester to submit a new ticket with Category, Related System, Requested Priority, Summary, Description, and optional initial attachments.
- **FR-04 (Unique Numbering)**: The backend shall automatically generate and assign a unique Ticket Number formatted as `TKT-YYYY-XXXXXX` upon successful ticket creation.
- **FR-05 (Attachment Upload)**: The system shall allow attaching up to 5 permitted files (JPG, JPEG, PNG, WEBP, PDF $\le$ 5 MB per file) during ticket creation or later on the Ticket Detail screen.
- **FR-06 (Ticket Listing)**: The system shall provide a My Tickets screen displaying only the tickets belonging to the currently selected requester.
- **FR-07 (Search & Filtering)**: The system shall allow searching tickets by Ticket Number and Summary, and filtering by Category, Requested Priority, and Status.
- **FR-08 (Sorting & Pagination)**: The ticket list shall support sorting (by Ticket Date, Ticket Number, Priority, Status, Last Updated) and pagination with configurable page sizes (default 10).
- **FR-09 (Ticket Detail View)**: The system shall provide a read-only Ticket Detail screen displaying all ticket properties and associated attachment cards.
- **FR-10 (Attachment Download)**: The system shall allow requesters to download active attachments belonging to their tickets.
- **FR-11 (Attachment Soft-Removal)**: The system shall allow requesters to soft-remove attachments by providing a mandatory removal reason. Removed attachments retain metadata in the UI but cannot be downloaded.
- **FR-12 (Ownership Protection)**: The backend shall reject any request to view, modify, or manage tickets or attachments that belong to a different requester with HTTP 403 Forbidden.
- **FR-13 (Requester Switching)**: Changing the active requester shall immediately refresh application state and reload ticket lists for the new requester identity.

---

## 5. Business Rules

- **BR-01 (Ticket Number Generation)**: Official Ticket Numbers are generated exclusively by the backend using the format `TKT-YYYY-XXXXXX` (where YYYY is current year and XXXXXX is a unique sequence/hex). Numbers are unique, sequential or collision-free, and immutable.
- **BR-02 (Initial Ticket State)**: Every newly created ticket begins with Current Status `New`. IT Priority is unassigned/null until IT Staff review.
- **BR-03 (Development Requester Testing Context)**: The Development Requester selector is strictly a testing harness for Sprint 2. It does not provide cryptographic authentication or password verification.
- **BR-04 (Inactive Requesters)**: Requesters flagged as `isActive = false` must never appear in the requester selector and must be denied ticket operations by the backend.
- **BR-05 (Unselected Requester Guard)**: If no Development Requester is selected, navigation to ticketing screens (`/tickets`, `/tickets/new`, `/tickets/:id`) must automatically redirect to the Requester Selection screen.
- **BR-06 (Requester Switching Invalidation)**: Switching to a different Development Requester must instantly invalidate cached data and reload data matching only the new requester's context.
- **BR-07 (Strict Data Isolation)**: A requester can only view and manage tickets where `ticket.requesterId == currentRequester.id`. Direct URL navigation or API calls to foreign tickets or attachments must return HTTP 403 Forbidden.
- **BR-08 (Summary Constraints)**: Ticket Summary is required, trimmed of leading/trailing whitespace, and must be between 5 and 150 characters.
- **BR-09 (Description Constraints)**: Description is required, trimmed of leading/trailing whitespace, and must be between 10 and 2,000 characters.
- **BR-10 (Classification Requirements)**: `categoryId` and `relatedSystemId` must be valid, active IDs in the database.
- **BR-11 (Requested Priority Values)**: Permitted requested priorities are `LOW`, `MEDIUM`, `HIGH`, and `URGENT`. Default is `MEDIUM`.
- **BR-12 (Duplicate Submission Guard)**: The ticket submission action must disable the submit button and display a busy spinner while in-flight to prevent duplicate tickets.
- **BR-13 (Form Preservation on Failure)**: In the event of an API or validation failure, form inputs and selected attachments must remain intact so user effort is not lost.
- **BR-14 (Attachment File Types)**: Permitted MIME types are strictly limited to `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`. All other types must be rejected with explicit error feedback.
- **BR-15 (Attachment File Size)**: Maximum individual file size is 5 MB (5,242,880 bytes).
- **BR-16 (Attachment Quota)**: A ticket cannot exceed 5 active (non-removed) attachments at any time.
- **BR-17 (Attachment Soft Removal)**: Attachments are never permanently deleted from the database in Lab 2. When removed, `isRemoved` is set to `true`, `removedAt` is recorded, and `removalReason` is saved.
- **BR-18 (Removal Reason Mandatory)**: Removing an attachment requires a non-empty reason string between 3 and 250 characters.
- **BR-19 (Removed Attachment Access)**: Removed attachments are presented in the UI with a "Removed" badge and reason, but download/preview links are disabled. API requests to download removed files return HTTP 410 Gone.
- **BR-20 (Upload Transaction / Error Compensation)**: If ticket creation succeeds but attachment persistence fails, the API must handle the failure gracefully without corrupting ticket records or leaving orphaned files on disk.
- **BR-21 (Search Scope)**: Search queries perform case-insensitive substring matching against `ticketNo` and `summary`.
- **BR-22 (Default Sorting)**: Default ticket list sorting is descending by `createdAt` (newest first).
- **BR-23 (Pagination Standard)**: Default page size is 10 items. Permitted page sizes: 5, 10, 20, 50. Page numbers are 1-indexed.
- **BR-24 (Empty vs No-Results State)**: An empty list because the requester has 0 tickets must display a welcoming "Create your first ticket" call-to-action. An empty list resulting from search/filter criteria must display "No matching tickets found" with a "Clear Filters" button.
- **BR-25 (Evolution to Authentication)**: Requester identification in API requests is passed via `X-Requester-Id` header in Lab 2, designed for drop-in replacement with `Authorization: Bearer <token>` in Lab 3 without changing core business logic.

---

## 6. UI Specification Summary

*(See [ui-spec.md](file:///c:/Year3/Semester%201/CPE334%20Software%20Engineering/toktickit/docs/lab-02/ui-spec.md) for complete visual specs, tokens, and checklists)*

### Visual Tokens (Zen Green Palette)
- **Primary Green**: `#006B3C` — Application header, primary buttons, major navigation emphasis.
- **Secondary Green**: `#0B7A46` — Active tabs, interactive links, hover states, focus rings.
- **Pale Green**: `#EAF6EF` — Selected rows, badge backgrounds, subtle callout backgrounds.
- **Background**: `#F5F7F6` — Quiet neutral page backdrop.
- **Surface / Cards**: `#FFFFFF` with subtle 1px border (`#E5E7EB`) and soft box shadow.
- **Text**: Dark Charcoal `#1A2820` for comfortable reading contrast.
- **Form Controls**: Editable inputs have `#FFFFFF` background with `#D1D5DB` neutral border. Read-only fields use soft gray-green `#F3F4F6` background.
- **Feedback**: Inline error text `#DC2626` placed directly below invalid inputs; warning amber badge `#D97706`; success green notification `#059669`.

### Key Screens and Layouts
1. **Application Shell**: Displays TokTickIT branding, active navigation links (My Tickets, Create Ticket), current active Requester badge, and a "Change Requester" button.
2. **Development Requester Selection Screen**: Clean modal/card explaining testing context, dropdown listing active requesters, Continue button, and empty/error fallback states.
3. **Create Ticket Screen**:
   - System/Read-only fields at top (Requester Name, Date, status `New`).
   - Grouped classification controls (Category, Related System, Requested Priority).
   - Summary single-line input with length counter.
   - Description multiline textarea (min-height 120px).
   - Attachment drag-and-drop zone with file list preview, file removal, and size validation indicators.
   - Primary "Submit Ticket" button (with loading state) and secondary "Cancel" button.
4. **My Tickets Screen**:
   - Filter bar: Search input, Category filter, Priority filter, Status filter, and "Clear Filters" button.
   - Desktop view: Full data table with sortable column headers and badges.
   - Mobile view: Responsive card list stacking ticket details cleanly.
   - Pagination controls with current page, total count, and page size selector.
5. **Requester Ticket Detail Screen**:
   - Read-only summary header (Ticket No, Date, Status badge, Priority badge, Category, Related System).
   - Full description view.
   - Attachments section: List of active attachments with download buttons and "Remove" actions; list of soft-removed attachments displaying removal timestamp and reason (download disabled); "Add Attachment" button opening upload modal.

### Responsive Breakpoints
- **Desktop ($\ge 992\text{px}$)**: Multi-column grid layout, centered content container (max-width 1200px).
- **Tablet ($768\text{--}991\text{px}$)**: 2-column layout for forms, collapsible table layout for ticket listings.
- **Mobile ($< 768\text{px}$)**: Single column vertical stack, full-width touch-friendly buttons (min 44px height), responsive cards replacing wide tables, zero horizontal scrolling.

---

## 7. Data Changes

### Prisma Schema Design
The PostgreSQL schema expands beyond Lab 1's `Category` model to incorporate requesters, systems, tickets, and attachments:

```prisma
model RequesterUser {
  id         Int      @id @default(autoincrement())
  name       String
  email      String   @unique
  department String
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  tickets    Ticket[]
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

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketStatus {
  NEW
  IN_PROGRESS
  RESOLVED
  CLOSED
  CANCELLED
}

model Ticket {
  id                Int           @id @default(autoincrement())
  ticketNo          String        @unique
  requesterId       Int
  requester         RequesterUser @relation(fields: [requesterId], references: [id])
  categoryId        Int
  category          Category      @relation(fields: [categoryId], references: [id])
  relatedSystemId   Int
  relatedSystem     RelatedSystem @relation(fields: [relatedSystemId], references: [id])
  summary           String
  description       String
  requestedPriority Priority      @default(MEDIUM)
  itPriority        Priority?
  currentStatus     TicketStatus  @default(NEW)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  attachments       Attachment[]

  @@index([requesterId, createdAt])
  @@index([categoryId, currentStatus])
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
```

### Database Decisions & Justifications
1. **Compound Index on `Ticket(requesterId, createdAt)`**: The My Tickets screen is the highest-frequency query, always filtering by the active requester and sorting by creation timestamp. This compound index ensures index-only range scans without full table scans as ticket volume scales.
2. **Soft Removal in `Attachment`**: Attachments maintain compliance auditing. Instead of hard deleting rows, `isRemoved`, `removedAt`, and `removalReason` keep audit history while shielding binary content from downloads.
3. **Idempotent Seed Data**: Seed script uses `upsert` on unique keys (`email` for Requesters, `name` for Categories and RelatedSystems) so it can execute repeatedly in development and CI environments without error or duplication.
   - Categories: *Account and Access*, *Hardware*, *Software*, *Network*.
   - Related Systems: *Email*, *Campus Wi-Fi*, *VPN*, *LEB2 App*, *Grade Submission App*, *Printer*, *Corporate Laptop*.
   - Requesters: 4 active requesters (*Jennifer Anderson*, *Michael Brown*, *Sarah Johnson*, *David Lee*) and 1 inactive requester (*Robert Taylor*).

---

## 8. API Contract

*(See [api-spec.md](file:///c:/Year3/Semester%201/CPE334%20Software%20Engineering/toktickit/docs/lab-02/api-spec.md) for full endpoint specifications, request/response bodies, and JSON schemas)*

### Headers
All requester-authenticated endpoints require:
`X-Requester-Id: <integer>`

### Endpoints Overview

| Method | Path | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/requesters/active` | List all active development requesters | 200, 500 |
| `GET` | `/api/categories` | List active categories | 200, 500 |
| `GET` | `/api/related-systems` | List active related systems | 200, 500 |
| `POST` | `/api/tickets` | Create ticket with optional attachments | 201, 400, 403, 500 |
| `GET` | `/api/tickets` | Query paginated tickets for active requester | 200, 400, 403, 500 |
| `GET` | `/api/tickets/:id` | Fetch single ticket details (ownership checked) | 200, 403, 404, 500 |
| `POST` | `/api/tickets/:id/attachments` | Add attachment to existing ticket | 201, 400, 403, 404, 500 |
| `GET` | `/api/attachments/:id/download` | Download active attachment binary | 200, 403, 404, 410, 500 |
| `POST` | `/api/attachments/:id/remove` | Soft-remove attachment with reason | 200, 400, 403, 404, 500 |

---

## 9. Acceptance Criteria

- **AC-01 (Ticket Creation Success)**:
  - **Given** an active Development Requester is selected and valid ticket fields are provided,
  - **When** the requester submits the Create Ticket form,
  - **Then** the ticket is saved in the database with status `New`, an official Ticket Number matching `TKT-YYYY-XXXXXX` is generated, and the user is navigated to the success confirmation or detail view.

- **AC-02 (Unselected Requester Protection)**:
  - **Given** no Development Requester is selected,
  - **When** the user attempts to visit `/tickets` or `/tickets/new`,
  - **Then** the system presents the Requester Selection screen and prevents data queries.

- **AC-03 (Cross-Requester Ticket Isolation)**:
  - **Given** Requester A owns Ticket #10,
  - **When** Requester B attempts to fetch `GET /api/tickets/10` or view Ticket #10 in the UI,
  - **Then** the backend rejects the request with HTTP 403 Forbidden and the UI displays an access denied error.

- **AC-04 (Field Validation Constraints)**:
  - **Given** a ticket submission with missing summary or summary shorter than 5 characters,
  - **When** the user submits the form,
  - **Then** client validation flags the field inline, no network request is sent, and focus moves to the error. If sent to the backend, HTTP 400 with field errors is returned.

- **AC-05 (Attachment File Validation)**:
  - **Given** an attachment with an invalid extension (`.exe`, `.zip`) or file size > 5 MB,
  - **When** the user selects the file,
  - **Then** the UI displays an inline validation error and prevents form submission.

- **AC-06 (Attachment Limit Enforcement)**:
  - **Given** a ticket already having 5 active attachments,
  - **When** the user attempts to upload a 6th attachment,
  - **Then** the upload is blocked with a clear message stating the 5-attachment maximum limit.

- **AC-07 (Attachment Soft-Removal)**:
  - **Given** a ticket owner views an active attachment on their ticket,
  - **When** they click Remove and provide a valid reason (e.g., "Contains outdated logs"),
  - **Then** the attachment is marked as soft-removed in the database with timestamp and reason, and the UI displays it as removed with download disabled.

- **AC-08 (Blocked Download of Removed Attachments)**:
  - **Given** an attachment that has been soft-removed,
  - **When** any request is made to `GET /api/attachments/:id/download`,
  - **Then** the API responds with HTTP 410 Gone and no file binary is streamed.

- **AC-09 (Cross-Requester Attachment Isolation)**:
  - **Given** Attachment #5 belongs to a ticket owned by Requester A,
  - **When** Requester B attempts to download `GET /api/attachments/5/download` or soft-remove it,
  - **Then** the API rejects the request with HTTP 403 Forbidden.

- **AC-10 (Inactive Requester Exclusion)**:
  - **Given** seeded requester *Robert Taylor* is inactive (`isActive = false`),
  - **When** the Development Requester selection dropdown is displayed,
  - **Then** *Robert Taylor* does not appear in the selectable options.

- **AC-11 (Ticket Filtering and Search)**:
  - **Given** a requester has multiple tickets across categories and priorities,
  - **When** the user filters by Category "Hardware" and searches "battery",
  - **Then** the table displays only tickets matching both criteria and updates the result count.

- **AC-12 (Empty State vs No-Results State)**:
  - **Given** a requester with 0 submitted tickets, the list shows "You have not submitted any tickets yet."
  - **Given** a search yielding 0 matches, the list shows "No tickets match your filters" along with a "Clear Filters" button.

- **AC-13 (Pagination Behavior)**:
  - **Given** a requester with 25 tickets and page size 10,
  - **When** navigating between page 1, 2, and 3,
  - **Then** the correct 10, 10, and 5 tickets are displayed with correct active page indicators.

- **AC-14 (Form State Preservation on API Failure)**:
  - **Given** the backend API is unavailable or returns HTTP 500 during ticket creation,
  - **When** submission fails,
  - **Then** an alert message is shown, and all entered form values (summary, description, selections) remain preserved.

- **AC-15 (Responsive Design & Accessibility)**:
  - **Given** any supported screen size (Desktop $\ge$ 992px, Tablet 768-991px, Mobile < 768px),
  - **When** interacting with forms, tables, and dialogs,
  - **Then** all inputs, buttons, and text remain legible without clipping or horizontal page overflow, and all inputs are keyboard accessible.

---

## 10. Definition of Done

### Part 1: Product Completion
- [ ] All functional requirements (FR-01 through FR-13) and business rules (BR-01 through BR-25) are fully implemented.
- [ ] Prisma schema migrations applied and idempotent seed script Populates all 4 categories, 6+ related systems, and 5 requesters (4 active, 1 inactive).
- [ ] 100% of planned automated tests in `tests.md` pass in both server and client suites (Unit, API, UI, and E2E) with zero skipped or commented-out tests.
- [ ] Conformance to Zen Green design tokens and responsive behavior verified across Desktop, Tablet, and Mobile viewports.
- [ ] Edge cases verified: invalid file types, files > 5MB, 5-attachment quota, cross-requester access rejection (403), soft removal (410 on download), form error recovery.
- [ ] README setup instructions and test execution instructions are current and verified.

### Part 2: Course Delivery Requirements
- [ ] GitHub project Kanban configured with all issues transitioned through `Backlog` $\to$ `Specified` $\to$ `Started` $\to$ `PR Review` $\to$ `Fixing` $\to$ `Done`.
- [ ] Git branch workflow strictly followed: feature branches $\to$ `lab2-staging` $\to$ `main`. No direct commits on `main` or `lab2-staging`.
- [ ] Peer reviews completed and documented in `docs/lab-02/reviewer.md` with links, comments, responses, and approvals.
- [ ] AI prompt log and reflection documented in `docs/lab-02/ai-use.md`.
- [ ] Single concise PDF report prepared matching the exact headings "Answer Part 1" through "Answer Part 9" with readable screenshots and evidence.

---

## 11. Assumptions and Decisions

- **Attachment Storage**: Uploaded files are stored on the local server filesystem under `server/uploads/attachments/` using cryptographically generated unique filenames (`<uuid>-<originalName>`) to prevent directory traversal and name collisions.
- **Requester Context Header**: In the absence of session cookies/tokens (Lab 3), the frontend automatically sends `X-Requester-Id: <id>` on all API calls. A backend middleware extracts and validates that the requester exists and is active.
- **Soft Removal Retention**: Attachment metadata is retained in the database indefinitely with `isRemoved = true`. Physical files can be purged by an asynchronous cleanup job if required in future releases, but binary download endpoints return HTTP 410 Gone immediately.
- **Client Framework**: React with TypeScript and Vite, styled using scoped Vanilla CSS/modules adhering strictly to Zen Green design tokens without Tailwind.
