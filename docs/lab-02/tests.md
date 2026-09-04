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
| **UNIT-01** | Unit | BR-01, AC-01 | Ticket number format generator | Returns `TKT-YYYY-XXXXXX` pattern with unique suffix | `server/tests/lab-02/unit/ticket-number.test.ts` | Planned |
| **UNIT-02** | Unit | BR-14, BR-15, AC-05 | File attachment validator helper | Accepts JPG/PNG/WEBP/PDF $\le$ 5MB; rejects invalid types & oversized files | `server/tests/lab-02/unit/attachment-validator.test.ts` | Planned |
| **API-01** | API | FR-01, BR-04, AC-10 | Retrieve active development requesters | HTTP 200; returns array of active requesters; excludes inactive ones | `server/tests/lab-02/requesters.api.test.ts` | Planned |
| **API-02** | API | FR-02, BR-10 | Retrieve active categories and related systems | HTTP 200; returns active reference options with non-empty IDs and names | `server/tests/lab-02/reference-data.api.test.ts` | Planned |
| **API-03** | API | FR-03, FR-04, BR-01, AC-01 | Create ticket with valid data | HTTP 201; official `ticketNo` returned; status is `NEW`; saved in DB | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-04** | API | BR-08, BR-09, AC-04 | Create ticket with missing or invalid fields | HTTP 400; returns structured field validation error messages | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-05** | API | FR-06, BR-07, AC-03 | Retrieve ticket list for active requester | HTTP 200; returns only tickets where `requesterId` matches header | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-06** | API | FR-07, BR-21, BR-22, AC-11 | Ticket list search, category filter, and sorting | HTTP 200; filters by substring in summary/number and category; sorted DESC | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-07** | API | FR-08, BR-23, AC-13 | Ticket list pagination | HTTP 200; returns correct `page`, `pageSize`, `totalCount`, and items | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-08** | API | FR-09, BR-07, AC-03 | Retrieve owned ticket detail | HTTP 200; returns ticket fields and active/removed attachment lists | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| **API-09** | API | FR-12, BR-07, AC-03 | Attempt to fetch ticket owned by another requester | HTTP 403 Forbidden; foreign ticket data is not exposed | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| **API-10** | API | FR-05, BR-14, BR-15, AC-05 | Upload valid attachment to existing ticket | HTTP 201; file stored safely; attachment metadata record created | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-11** | API | BR-16, AC-06 | Upload attachment when 5 active attachments exist | HTTP 400 Bad Request; message indicates active attachment quota exceeded | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-12** | API | FR-10, BR-19, AC-07 | Download active attachment binary | HTTP 200; binary stream returned with matching MIME header | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-13** | API | FR-11, BR-17, BR-18, AC-07 | Soft-remove attachment with valid reason | HTTP 200; `isRemoved` marked true; removal timestamp & reason recorded | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-14** | API | BR-17, BR-19, AC-08 | Attempt to download soft-removed attachment | HTTP 410 Gone; download blocked | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-15** | API | FR-12, BR-19, AC-09 | Unauthorized user attempts attachment download or removal | HTTP 403 Forbidden; action rejected | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **UI-01** | UI | FR-01, BR-05, AC-02 | Unselected requester state prompts selector | Renders Development Requester selector dialog/screen; blocks app shell | `client/src/tests/lab-02/RequesterSelector.test.tsx` | Planned |
| **UI-02** | UI | BR-12 | Submit button busy state | Button displays loading spinner and `disabled` attribute while in-flight | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-03** | UI | BR-08, BR-09, AC-04 | Inline validation messages on empty submission | Displays red inline validation errors directly under required fields | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-04** | UI | BR-13, AC-14 | Form preservation on API submission failure | Alert error shown; Summary, Description, and dropdown choices preserved | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-05** | UI | BR-14, BR-15, AC-05 | Client-side attachment file validation | Rejects files > 5MB or invalid extensions with inline notice | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| **UI-06** | UI | BR-24, AC-12 | Empty ticket list vs no-results state | Displays "Create your first ticket" when 0 total; "No results" when filtered | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| **UI-07** | UI | FR-09, BR-19, AC-07 | Read-only Ticket Detail layout & removed badge | All ticket header fields disabled/read-only; soft-removed files badged | `client/src/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| **UI-08** | UI | FR-11, BR-18, AC-07 | Soft-removal modal requires reason | Reason input cannot be empty; submits reason and updates row UI | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| **RESP-01** | Visual | AC-15 | Responsive layout across viewports | Desktop table converts to mobile cards; buttons touch-friendly ($\ge 44\text{px}$) | `client/src/tests/lab-02/ResponsiveLayout.test.tsx` | Planned |
| **E2E-01** | E2E | AC-01, AC-05, AC-07 | Full Requester journey: Select user $\to$ Create Ticket $\to$ Upload $\to$ View $\to$ Soft Remove | Complete flow verifies created ticket number, metadata, and soft removal | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| **E2E-02** | E2E | FR-12, BR-06, AC-03 | Multi-requester switching and isolation | Switching from Requester A to B hides A's tickets and blocks direct URL to A | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

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

The following visual checks must be verified and photographed via automated screenshots at Desktop ($\ge 992\text{px}$), Tablet ($768\text{--}991\text{px}$), and Mobile ($< 768\text{px}$):

- [ ] **Color Tokens**: Primary green (`#006B3C`), Secondary green (`#0B7A46`), Pale green (`#EAF6EF`), Background (`#F5F7F6`), Text (`#1A2820`) applied consistently across all screens.
- [ ] **Control States**:
  - [ ] Editable inputs: White background (`#FFFFFF`) with neutral border (`#D1D5DB`).
  - [ ] Read-only inputs: Soft gray-green shading (`#F3F4F6`), cursor default/not-allowed.
  - [ ] Required indicators: Red asterisk (`*`) placed after label text.
  - [ ] Validation errors: Clear red text (`#DC2626`) rendered immediately below the invalid control.
  - [ ] Button hierarchy: Primary green submit button, neutral secondary cancel button, amber/gray badge accents.
  - [ ] Busy state: Submit button renders animated loading spinner and disables click events.
- [ ] **Viewport Adaptation**:
  - [ ] **Desktop ($\ge 992\text{px}$)**: Multi-column grid, content centered with max-width 1200px, full data table displayed.
  - [ ] **Tablet ($768\text{--}991\text{px}$)**: Two-column form layout, search filter toolbar wraps gracefully.
  - [ ] **Mobile ($< 768\text{px}$)**: Single column vertical stack, touch targets $\ge 44\text{px}$ height, data table collapses into clear readable cards, zero horizontal scrolling.
- [ ] **Visual Defect Guard**:
  - [ ] No text clipping or ellipsis truncation hiding essential ticket numbers or status badges.
  - [ ] No overlapping labels, helper text, or validation error blocks.
  - [ ] Modal dialogs (Requester Selector, Soft Removal Reason) properly centered with backdrop overlay.

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
# In root or e2e directory:
npx playwright test e2e/lab-02/requester-ticket-flow.spec.ts
```

### Generating Visual Screenshots
```bash
# Capture screenshots for Desktop, Tablet, and Mobile viewports
npx playwright test e2e/lab-02/requester-ticket-flow.spec.ts --update-snapshots
```

---

## 6. Final Results

| Suite | Total Tests | Passed | Failed | Skipped | Pass Rate | Status |
|---|---|---|---|---|---|---|
| Backend Unit Tests | 2 | - | - | - | - | Planned |
| Backend API Tests | 13 | - | - | - | - | Planned |
| Frontend UI Tests | 8 | - | - | - | - | Planned |
| Responsive & Visual Tests | 1 | - | - | - | - | Planned |
| End-to-End Tests | 2 | - | - | - | - | Planned |
| **Total** | **26** | **-** | **-** | **-** | **-** | **Pending Implementation** |

*(Note: Table will be populated with actual passing test execution counts and command outputs upon completion of the implementation PRs on branch `lab2-staging` and `main`.)*

---

## 7. Known Limitations or Deferred Tests
- **Real User Authentication**: Testing of user passwords, bcrypt hashing, session cookies, and JWT token expiry is intentionally deferred to Lab 3.
- **IT Staff Queue & Ticket Actions**: Workflow tests for ticket claiming, IT Priority assignment, ticket status progression (e.g., `In Progress` $\to$ `Resolved`), public comments, internal notes, and Actions Taken will be implemented in future labs per course roadmap.
