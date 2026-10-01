# Lab 4 Test Plan & Traceability Matrix
**TokTickIT Actions Taken, Dashboards, and Final Regression**

---

## 1. Test Strategy & Quality Plan

This document establishes the comprehensive Test Driven Development (TDD) and Test Driven Design (Test DD) plan for Sprint 4. The testing strategy covers:
1. **API / Backend Integration Tests** (`server/tests/lab-04/`): Validating REST contracts, Prisma queries, transaction boundaries, optimistic locking, role authorization, and validation rules.
2. **Frontend UI Component Tests** (`client/tests/lab-04/`): Validating Vitest/React Testing Library rendering, form state management, dynamic conditional inputs, role-based controls, and empty states.
3. **End-to-End (E2E) Playwright Tests** (`e2e/lab-04/`): Multi-role user journeys, live browser interactions, concurrency conflicts, drill-down navigation, mobile viewport overflow, and keyboard focus rings.
4. **Full Regression Suite**: Preserving automated regression coverage across Lab 1, Lab 2, and Lab 3 features.

---

## 2. Requirement & Acceptance Criteria Traceability Matrix

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|:---:|
| **API-04-01** | API | AC-01 / BR-01, 02, 03 | IT Staff creates valid Action Taken under ticket | Returns HTTP 201; record persisted with session `performedById` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-02** | API | AC-02 / BR-05 | Create Action Taken with `followUpRequired=true` but missing `followUpNote` | Returns HTTP 400 with `code: "VALIDATION_ERROR"` on `followUpNote` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-03** | API | AC-03 / BR-06 | Create Action Taken with future `actionDateTime` (> 5 min) | Returns HTTP 400 with date validation error | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-04** | API | AC-04 / FR-07 | Requester fetches actions taken on owned ticket | Returns HTTP 200 with chronological list of actions taken | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-05** | API | AC-05 / FR-08 | Requester attempts `POST` or `PATCH` on actions-taken endpoint | Returns HTTP 403 Forbidden | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-06** | API | AC-06 / BR-01 | Requester fetches actions taken on a ticket owned by another user | Returns HTTP 403 Forbidden or 404 Not Found | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-07** | API | AC-07 / BR-08, 09 | IT Staff transitions ticket from `OPEN` to `RESOLVED` with current version | Returns HTTP 200; status updated and version incremented | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-04-08** | API | AC-08 / BR-10 | Requester submits advisory "Problem Appears Resolved" indication | Returns HTTP 200; comment logged; status remains unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-04-09** | API | AC-09 / BR-09 | Requester attempts to transition ticket status to `RESOLVED` or `CLOSED` | Returns HTTP 403 Forbidden | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-04-10** | API | AC-10 / BR-11 | Concurrent update: Client submits stale `version` | Returns HTTP 409 Conflict with latest version info | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-04-11** | API | AC-11 / BR-08 | Disallowed transition: Client submits `NEW` to `CLOSED` | Returns HTTP 422 Unprocessable Entity (`INVALID_STATUS_TRANSITION`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-04-12** | API | AC-12 / BR-12, 13 | Requester dashboard metrics retrieval | Returns HTTP 200; all 4 metrics include only owned tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-04-13** | API | AC-13 / BR-14, 16 | IT Staff dashboard operational counts | Returns HTTP 200; `myAssignedTickets` excludes resolved/closed | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-04-14** | API | AC-23 / BR-15 | Admin dashboard returns operational metrics + user account counts | Returns HTTP 200 with operational and user statistics | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-04-15** | API | AC-02b / BR-05 | Create Action Taken with `followUpRequired=false` and `followUpNote` provided | Returns HTTP 201; backend strictly sets `followUpNote` to `null` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-16** | API | AC-07b / BR-09.1 | Transition ticket to `RESOLVED` or `CLOSED` with 0 Actions Taken | Returns HTTP 422 with `code: "RESOLUTION_REQUIRES_ACTION_TAKEN"` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-04-17** | API | AC-21 / BR-04 | Inactive IT Staff attempts to create Action Taken | Returns HTTP 403 Forbidden | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-18** | API | AC-22 / BR-07 | Fetch Actions Taken on a ticket with multiple actions | Returns records ordered `actionDateTime` desc | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-19** | API | AC-20 / §7.3 | Database migration and legacy backfill check | Legacy tickets have `version=1` and empty actions array | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-20** | API | AC-20 / §7.4 | Idempotent seed script execution | Seed runs repeatedly without unique constraint or duplicate errors | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-21** | API | AC-23 / BR-15 | Role authorization on `/api/dashboard/admin` | 401 unauth, 403 for Requester and IT Staff, 200 for Admin | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-04-22** | API | AC-15 / FR-18 | Zero-state dashboard metrics | Returns 0 for all counts when user has zero tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-04-23** | API | AC-11 / BR-08 | Full transition matrix exhaustive verification | Validates all 17 permitted transitions and rejects unlisted jumps | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **UI-04-01** | UI | AC-01, AC-16 / FR-01 | IT Staff renders Actions Taken panel and adds new action | Form renders, fields populate, submit button shows loading state | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-04-02** | UI | AC-02, AC-17 / FR-04 | Toggle "Follow-Up Required" without note | Shows inline validation error; preserves existing entered text | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-04-03** | UI | AC-04, AC-05 / FR-07 | Requester views Actions Taken on ticket detail | Displays actions in read-only mode; Add/Edit buttons hidden | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-04-04** | UI | AC-07, AC-11 / BR-08 | Ticket workflow dropdown on IT Staff detail | Renders only valid next transitions; disables invalid transitions | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-04-05** | UI | AC-08 / BR-10 | Requester views "Problem Appears Resolved" button | Dialog confirms action; adds advisory note; status unchanged | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-04-06** | UI | AC-10 / BR-11 | Stale status update triggers HTTP 409 Conflict | Displays warning conflict banner with "Refresh Ticket" button | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-04-07** | UI | AC-07b / BR-09.1 | UI handles 422 `RESOLUTION_REQUIRES_ACTION_TAKEN` | Displays prominent work verification alert banner | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-04-08** | UI | AC-12, AC-15 / FR-14 | Requester Dashboard 4 cards, recent tickets, and empty state | Metric cards render accurately; displays zero-state when empty | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| **UI-04-09** | UI | AC-13, AC-14 / FR-15 | Staff Dashboard operational cards & drill-down links | Metric cards display counts; clicking card triggers navigation | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-04-10** | UI | AC-16 / FR-20 | Submit button disabled during active workflow mutation | Prevents duplicate click submissions on status change | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-04-11** | UI | AC-17 / FR-21 | Form values preserved upon server 400/422 failure | Form inputs keep user's typed description/notes after failure | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **E2E-04-01** | E2E | AC-01, AC-04, AC-05 | Multi-role Actions Taken lifecycle flow | Staff adds action; Requester sees read-only; Requester cannot add | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| **E2E-04-02** | E2E | AC-07, AC-08, AC-10 | Ticket resolution gate and concurrency handling | Advisory resolution -> Staff formal resolution -> Concurrency 409 | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| **E2E-04-03** | E2E | AC-12, AC-13, AC-14 | Role dashboards rendering and drill-down navigation | Requesters and Staff see appropriate metrics and drill down to lists | `e2e/lab-04/dashboards.spec.ts` | Planned |
| **E2E-04-04** | E2E | AC-18, AC-19 / FR-22 | Viewport layout audit (375px/768px/1280px) and a11y focus rings | Real browser verification of zero horizontal scroll and focus rings | `e2e/lab-04/dashboards.spec.ts` | Planned |
| **REG-04-01** | Reg | AC-20 / FR-19 | Labs 1 & 2 regression test execution | Ticket creation, attachments, category seeds pass cleanly | Existing test suites | Planned |
| **REG-04-02** | Reg | AC-20 / FR-19 | Lab 3 regression test execution | Auth, first-login password change, comments, notes, admin users pass | Existing test suites | Planned |

---

## 3. Test Execution Guidelines

1. **Backend Integration Tests**:
   ```bash
   cd server
   npm test -- tests/lab-04/
   ```
2. **Frontend Component Tests**:
   ```bash
   cd client
   npm test -- tests/lab-04/
   ```
3. **Playwright E2E Tests**:
   ```bash
   npx playwright test e2e/lab-04/
   ```
4. **Full Regression Execution**:
   ```bash
   npm test
   npx playwright test
   ```
