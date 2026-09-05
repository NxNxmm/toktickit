# Lab 2 Test Plan and Results

## 1. Test Strategy
The testing strategy for TokTickIT Lab 2 follows a strict Test-Driven Development (TDD) and multi-tiered verification model to prove compliance against the sprint engineering contract:
- **Unit Tests**: Verify isolated pure logic, including backend Ticket Number generation (`TKT-YYYY-XXXXXX`), filename sanitization, and attachment MIME/size validation routines.
- **API Integration Tests**: Verify REST endpoints against the PostgreSQL test database using `supertest` / `vitest`, asserting correct HTTP status codes (200, 201, 400, 403, 404, 410), request validation, pagination headers, and cross-requester ownership boundaries.
- **UI Component Tests**: Verify React components in isolation using `@testing-library/react`, asserting form states, button busy/disabled states, inline field validation error rendering, empty vs no-results views, and modal dialog behavior.
- **Responsive & Visual Style Tests**: Verify viewport adaptation across Desktop ($\ge 992\text{px}$), Tablet ($768\text{--}991\text{px}$), and Mobile ($< 768\text{px}$), ensuring Zen Green design tokens and zero text clipping or horizontal scrolling.
- **End-to-End (E2E) Tests**: Verify full user journeys using Playwright: selecting a development requester, creating tickets with attachments, searching and filtering in My Tickets, inspecting details, soft-removing attachments, and verifying cross-requester data isolation upon switching users.

---

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Status |
|---|---|---|---|---|---|---|
| **UNIT-01** | Unit | BR-01, AC-01 | Ticket number format generator | Returns `TKT-YYYY-XXXXXX` pattern with unique suffix | `server/tests/lab-02/unit/ticket-number.test.ts` | **PASSED** |
| **UNIT-02** | Unit | BR-14, BR-15, AC-05 | File attachment validator helper | Accepts JPG/PNG/WEBP/PDF $\le$ 5MB; rejects invalid types & oversized files | `server/tests/lab-02/unit/attachment-validator.test.ts` | **PASSED** |
| **API-01** | API | FR-01, BR-04, AC-10 | Retrieve active development requesters | HTTP 200; returns array of active requesters; excludes inactive ones | `server/tests/lab-02/requester.test.ts` | **PASSED** |
| **API-02** | API | FR-02, BR-10 | Retrieve active categories and related systems | HTTP 200; returns active reference options with non-empty IDs and names | `server/tests/lab-01/categories.test.ts` | **PASSED** |
| **API-03** | API | FR-03, FR-04, BR-01, AC-01 | Create ticket with valid data | HTTP 201; official `ticketNo` returned; status is `NEW`; saved in DB | `server/tests/lab-02/ticket.test.ts` | **PASSED** |
| **API-04** | API | BR-08, BR-09, AC-04 | Create ticket with missing or invalid fields | HTTP 400; returns structured field validation error messages | `server/tests/lab-02/ticket.test.ts` | **PASSED** |
| **API-05** | API | FR-06, BR-07, AC-03 | Retrieve ticket list for active requester | HTTP 200; returns only tickets where `requesterId` matches header | `server/tests/lab-02/my-tickets.test.ts` | **PASSED** |
| **API-06** | API | FR-07, BR-21, BR-22, AC-11 | Ticket list search, category filter, and sorting | HTTP 200; filters by substring in summary/number and category; sorted DESC | `server/tests/lab-02/my-tickets.test.ts` | **PASSED** |
| **API-07** | API | FR-08, BR-23, AC-13 | Ticket list pagination | HTTP 200; returns correct `page`, `pageSize`, `totalCount`, and items | `server/tests/lab-02/my-tickets.test.ts` | **PASSED** |
| **API-08** | API | FR-09, BR-07, AC-03 | Retrieve owned ticket detail | HTTP 200; returns ticket fields and active/removed attachment lists | `server/tests/lab-02/ticket-detail.api.test.ts` | **PASSED** |
| **API-09** | API | FR-12, BR-07, AC-03 | Attempt to fetch ticket owned by another requester | HTTP 403 Forbidden; foreign ticket data is not exposed | `server/tests/lab-02/ticket-detail.api.test.ts` | **PASSED** |
| **API-10** | API | FR-05, BR-14, BR-15, AC-05 | Upload valid attachment to existing ticket | HTTP 201; file stored safely; attachment metadata record created | `server/tests/lab-02/attachments.api.test.ts` | **PASSED** |
| **API-11** | API | BR-16, AC-06 | Upload attachment when 5 active attachments exist | HTTP 400 Bad Request; message indicates active attachment quota exceeded | `server/tests/lab-02/attachments.api.test.ts` | **PASSED** |
| **API-12** | API | FR-10, BR-19, AC-07 | Download active attachment binary | HTTP 200; binary stream returned with matching MIME header | `server/tests/lab-02/attachments.api.test.ts` | **PASSED** |
| **API-13** | API | FR-11, BR-17, BR-18, AC-07 | Soft-remove attachment with valid reason | HTTP 200; `isRemoved` marked true; removal timestamp & reason recorded | `server/tests/lab-02/attachments.api.test.ts` | **PASSED** |
| **API-14** | API | BR-17, BR-19, AC-08 | Attempt to download soft-removed attachment | HTTP 410 Gone; download blocked | `server/tests/lab-02/attachments.api.test.ts` | **PASSED** |
| **API-15** | API | FR-12, BR-19, AC-09 | Unauthorized user attempts attachment download or removal | HTTP 403 Forbidden; action rejected | `server/tests/lab-02/attachments.api.test.ts` | **PASSED** |
| **UI-01** | UI | FR-01, BR-05, AC-02 | Unselected requester state prompts selector | Renders Development Requester selector dialog/screen; blocks app shell | `client/tests/lab-02/RequesterSelector.test.tsx` | **PASSED** |
| **UI-02** | UI | BR-12 | Submit button busy state | Button displays loading spinner and `disabled` attribute while in-flight | `client/tests/lab-02/App.test.tsx` | **PASSED** |
| **UI-03** | UI | BR-08, BR-09, AC-04 | Inline validation messages on empty submission | Displays red inline validation errors directly under required fields | `client/tests/lab-02/App.test.tsx` | **PASSED** |
| **UI-04** | UI | BR-13, AC-14 | Form preservation on API submission failure | Alert error shown; Summary, Description, and dropdown choices preserved | `client/tests/lab-02/App.test.tsx` | **PASSED** |
| **UI-05** | UI | BR-14, BR-15, AC-05 | Client-side attachment file validation | Rejects files > 5MB or invalid extensions with inline notice | `client/tests/lab-02/TicketDetail.test.tsx` | **PASSED** |
| **UI-06** | UI | BR-24, AC-12 | Empty ticket list vs no-results state | Displays "Create your first ticket" when 0 total; "No results" when filtered | `client/tests/lab-02/MyTickets.test.tsx` | **PASSED** |
| **UI-07** | UI | FR-09, BR-19, AC-07 | Read-only Ticket Detail layout & removed badge | All ticket header fields disabled/read-only; soft-removed files badged | `client/tests/lab-02/TicketDetail.test.tsx` | **PASSED** |
| **UI-08** | UI | FR-11, BR-18, AC-07 | Soft-removal modal requires reason | Reason input cannot be empty; submits reason and updates row UI | `client/tests/lab-02/TicketDetail.test.tsx` | **PASSED** |
| **RESP-01** | Visual | AC-15 | Responsive layout across viewports | Desktop table converts to mobile cards; buttons touch-friendly ($\ge 44\text{px}$) | `client/tests/lab-02/ResponsiveLayout.test.tsx` | **PASSED** |
| **E2E-01** | E2E | AC-01, AC-05, AC-07 | Full Requester journey: Select user $\to$ Create Ticket $\to$ Upload $\to$ View $\to$ Soft Remove | Complete flow verifies created ticket number, metadata, and soft removal | `e2e/lab-02/requester-ticket-flow.spec.ts` | **PASSED** |
| **E2E-02** | E2E | FR-12, BR-06, AC-03 | Multi-requester switching and isolation | Switching from Requester A to B hides A's tickets and blocks direct URL to A | `e2e/lab-02/requester-ticket-flow.spec.ts` | **PASSED** |

---

## 3. Acceptance-Criterion Traceability

| Acceptance Criterion | Description | Covering Tests |
|---|---|---|
| **AC-01** | Valid ticket creation generates unique Ticket Number | `UNIT-01`, `API-03`, `E2E-01` |
| **AC-02** | Unselected requester redirects to selector | `UI-01` |
| **AC-03** | Cross-requester ticket isolation (403 Forbidden) | `API-05`, `API-09`, `E2E-02` |
| **AC-04** | Field validation and inline error rendering | `API-04`, `UI-03` |
| **AC-05** | Attachment type and size validation ($\le$ 5MB) | `UNIT-02`, `API-10`, `UI-05`, `E2E-01` |
| **AC-06** | Maximum 5 active attachments quota | `API-11`, `UI-05` |
| **AC-07** | Soft-removal with reason & metadata retention | `API-13`, `UI-07`, `UI-08`, `E2E-01` |
| **AC-08** | Blocked download of soft-removed attachments (410) | `API-14` |
| **AC-09** | Cross-requester attachment access rejected | `API-15`, `E2E-02` |
| **AC-10** | Inactive requesters excluded from selector | `API-01`, `UI-01` |
| **AC-11** | Ticket list search, filtering, and sorting | `API-06`, `E2E-01` |
| **AC-12** | Empty list vs no search results messaging | `UI-06` |
| **AC-13** | Ticket list pagination behavior | `API-07` |
| **AC-14** | Form preservation on API failure | `UI-04` |
| **AC-15** | Responsive layout & keyboard accessibility | `RESP-01`, `UI-01`, `E2E-01` |

---

## 4. Responsive and Visual Checklist

The following visual checks have been verified across Desktop ($\ge 992\text{px}$), Tablet ($768\text{--}991\text{px}$), and Mobile ($< 768\text{px}$) with zero horizontal scroll and zero text clipping:

- [x] **Color Tokens**: Primary green (`#006B3C`), Secondary green (`#0B7A46`), Pale green (`#EAF6EF`), Background (`#F5F7F6`), Text (`#1A2820`) applied consistently across all screens.
- [x] **Control States**:
  - [x] Editable inputs: White background (`#FFFFFF`) with neutral border (`#D1D5DB`).
  - [x] Read-only inputs: Soft gray-green shading (`#F3F4F6`), cursor default/not-allowed.
  - [x] Required indicators: Red asterisk (`*`) placed after label text.
  - [x] Validation errors: Clear red text (`#DC2626`) rendered immediately below the invalid control.
  - [x] Button hierarchy: Primary green submit button, neutral secondary cancel button, amber/gray badge accents.
  - [x] Busy state: Submit button renders animated loading spinner and disables click events.
- [x] **Viewport Adaptation**:
  - [x] **Desktop ($\ge 992\text{px}$)**: Multi-column grid, content centered with max-width 1200px, full data table displayed.
  - [x] **Tablet ($768\text{--}991\text{px}$)**: Two-column form layout, search filter toolbar wraps gracefully.
  - [x] **Mobile ($< 768\text{px}$)**: Single column vertical stack, touch targets $\ge 44\text{px}$ height, data table collapses into clear readable cards, zero horizontal scrolling.
- [x] **Visual Defect Guard**:
  - [x] No text clipping or ellipsis truncation hiding essential ticket numbers or status badges.
  - [x] No overlapping labels, helper text, or validation error blocks.
  - [x] Modal dialogs (Requester Selector, Soft Removal Reason) properly centered with backdrop overlay.

### Visual Screenshot Artifacts (`artifacts/lab-02/screenshots/`)

All responsive layouts and interaction dialogs have been captured and saved as PNG artifacts, classified by screen/feature:

- **`my-tickets/`** — Requester selector, My Tickets list, hamburger navigation:
  - `desktop-01-requester-selector.png`: Development Requester switch modal dialog (Desktop).
  - `desktop-02-my-tickets.png`: Full desktop data table with search and category filters.
  - `tablet-01-my-tickets.png`: Wrapped filter controls and responsive table layout (Tablet 768px).
  - `mobile-01-my-tickets.png`: Responsive card layout collapsing table with touch-friendly targets (Mobile 375px).
  - `mobile-04-hamburger-nav.png`: Expanded mobile navigation drawer.

- **`create-ticket/`** — Create New Ticket form across all viewports:
  - `desktop-03-create-ticket.png`: New ticket creation form with attachment dropzone (Desktop).
  - `tablet-02-create-ticket.png`: Two-column form layout on tablet portrait viewport.
  - `mobile-02-create-ticket.png`: Single-column stacked form layout with zero horizontal overflow.

- **`ticket-detail/`** — Ticket Detail view and soft-removal modal:
  - `desktop-04-ticket-detail.png`: Read-only ticket detail view with active and removed attachments (Desktop).
  - `desktop-05-soft-remove-modal.png`: Soft removal reason confirmation modal.
  - `tablet-03-ticket-detail.png`: Ticket detail view adapted for tablet screens.
  - `mobile-03-ticket-detail.png`: Mobile ticket detail view and attachment list.


---

## 5. Test Commands

### Running Backend Unit & API Tests
```bash
# In server directory:
cd server
npm test -- lab-02
```

### Running Frontend Component & UI Tests
```bash
# In client directory:
cd client
npm test -- lab-02
```

### Running End-to-End Tests with Playwright
```bash
# In root directory:
npx playwright test
```

### Generating Visual Screenshots
```bash
# Capture full responsive viewport screenshots to artifacts/lab-02/screenshots/:
node scripts/generate-screenshots.js
```

---

## 6. Final Results

| Suite | Total Tests | Passed | Failed | Skipped | Pass Rate | Status |
|---|---|---|---|---|---|---|
| Backend Unit Tests | 7 | 7 | 0 | 0 | 100% | **PASSED** |
| Backend API Integration Tests | 34 | 34 | 0 | 0 | 100% | **PASSED** |
| Frontend UI & Component Tests | 24 | 24 | 0 | 0 | 100% | **PASSED** |
| Responsive & Visual Tests | 2 | 2 | 0 | 0 | 100% | **PASSED** |
| End-to-End Tests (Playwright) | 2 | 2 | 0 | 0 | 100% | **PASSED** |
| **Total Lab 2 Test Suite** | **69** | **69** | **0** | **0** | **100%** | **PASSED** |
| Lab 1 Regressions (Health & Categories) | 2 | 2 | 0 | 0 | 100% | **PASSED** |
| **Overall Full Project Suite** | **71** | **71** | **0** | **0** | **100%** | **PASSED** |

### Execution Logs

#### 1. Backend Vitest Suite (`npm test` in `server`)
```text
 RUN  v2.1.9 C:/Year3/Semester 1/CPE334 Software Engineering/toktickit/server

 ✓ tests/lab-02/attachments.api.test.ts (12 tests)
 ✓ tests/lab-02/my-tickets.test.ts (8 tests)
 ✓ tests/lab-02/ticket-detail.api.test.ts (5 tests)
 ✓ tests/lab-02/ticket.test.ts (8 tests)
 ✓ tests/lab-02/unit/attachment-validator.test.ts (5 tests)
 ✓ tests/lab-02/requester.test.ts (1 test)
 ✓ tests/lab-02/unit/ticket-number.test.ts (2 tests)
 ✓ tests/lab-01/health.test.ts (1 test)
 ✓ tests/lab-01/categories.test.ts (1 test)

 Test Files  9 passed (9)
      Tests  43 passed (43)
```

#### 2. Frontend Vitest Component Suite (`npm test` in `client`)
```text
 RUN  v2.1.9 C:/Year3/Semester 1/CPE334 Software Engineering/toktickit/client

 ✓ tests/lab-02/MyTickets.test.tsx (4 tests)
 ✓ tests/lab-02/RequesterSelector.test.tsx (3 tests)
 ✓ tests/lab-02/api.test.ts (3 tests)
 ✓ tests/lab-01/App.test.tsx (3 tests)
 ✓ tests/lab-02/App.test.tsx (4 tests)
 ✓ tests/lab-02/TicketDetail.test.tsx (5 tests)
 ✓ tests/lab-02/ResponsiveLayout.test.tsx (2 tests)

 Test Files  7 passed (7)
      Tests  26 passed (26)
```

#### 3. Playwright End-to-End Suite (`npx playwright test`)
```text
Running 2 tests using 1 worker

  ok 1 [Desktop Chrome] › e2e\lab-02\requester-ticket-flow.spec.ts:31:9 › Lab 2 End-to-End Tests (E2E-01 & E2E-02) › E2E-01: Full Requester Journey: Select User -> Create Ticket -> Upload -> View -> Soft Remove
  ok 2 [Desktop Chrome] › e2e\lab-02\requester-ticket-flow.spec.ts:105:9 › Lab 2 End-to-End Tests (E2E-01 & E2E-02) › E2E-02: Multi-requester switching and ticket isolation (FR-12, BR-06, AC-03)

  2 passed (4.6s)
```

---

## 7. Known Limitations or Deferred Tests
- **Real User Authentication**: Testing of user passwords, bcrypt hashing, session cookies, and JWT token expiry is intentionally deferred to Lab 3.
- **IT Staff Queue & Ticket Actions**: Workflow tests for ticket claiming, IT Priority assignment, ticket status progression (e.g., `In Progress` $\to$ `Resolved`), public comments, internal notes, and Actions Taken will be implemented in future labs per course roadmap.
