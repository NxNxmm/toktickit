# Lab 4 Test Plan & Traceability Matrix
**TokTickIT Actions Taken, Dashboards, and Final Regression**

---

## 1. Test Strategy & Quality Plan

This document establishes the comprehensive Test Driven Development (TDD) and Test Driven Design (Test DD) plan for Sprint 4. The testing strategy covers:
1. **API / Backend Integration Tests** (`server/tests/lab-04/`): Validating REST contracts, Prisma queries, transaction boundaries, optimistic locking, role authorization, and validation rules.
2. **Frontend UI Component Tests** (`client/tests/lab-04/`): Validating Vitest/React Testing Library rendering, form state management, dynamic conditional inputs, role-based controls, and empty states.
3. **End-to-End (E2E) Playwright Tests** (`e2e/lab-04/`): Multi-role user journeys, live browser interactions, concurrency conflicts, and drill-down navigation.
4. **Full Regression Suite**: Preserving automated regression coverage across Lab 1, Lab 2, and Lab 3 features.

---

## 2. Requirement & Acceptance Criteria Traceability Matrix

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|:---:|
| **API-04-01** | API | AC-01 / BR-01, 02, 03 | IT Staff creates valid Action Taken under ticket | Returns HTTP 201; record persisted with session `performedById` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-02** | API | AC-02 / BR-05 | Create Action Taken with `followUpRequired=true` but missing `followUpNote` | Returns HTTP 400 with validation error on `followUpNote` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-03** | API | AC-03 / BR-06 | Create Action Taken with future `actionDateTime` (> 5 min) | Returns HTTP 400 with date validation error | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-04** | API | AC-04 / FR-07 | Requester fetches actions taken on owned ticket | Returns HTTP 200 with chronological list of actions taken | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-05** | API | AC-05 / FR-08 | Requester attempts `POST` or `PATCH` on actions-taken endpoint | Returns HTTP 403 Forbidden | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-06** | API | AC-06 / BR-01 | Requester fetches actions taken on a ticket owned by another user | Returns HTTP 403 Forbidden or 404 Not Found | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-07** | API | AC-01, AC-20 / BR-04 | Inactive IT Staff user attempts to record action taken | Returns HTTP 403 Forbidden (inactive user rejection) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04-08** | API | AC-07 / BR-08, 09 | IT Staff transitions ticket from `OPEN` to `RESOLVED` with current version | Returns HTTP 200; status updated and version incremented | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-04-09** | API | AC-08 / BR-10 | Requester submits advisory "Problem Appears Resolved" indication | Returns HTTP 200; comment logged; status remains unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-04-10** | API | AC-09 / BR-09 | Requester attempts to transition ticket status to `RESOLVED` | Returns HTTP 403 Forbidden | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-04-11** | API | AC-10 / BR-11 | Concurrent update: Client submits stale `version` | Returns HTTP 409 Conflict with latest version info | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-04-12** | API | AC-11 / BR-08 | Disallowed transition: Client submits `NEW` to `CLOSED` | Returns HTTP 400 Bad Request | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-04-13** | API | AC-12 / BR-12, 13 | Requester dashboard metrics retrieval | Returns HTTP 200; metrics include only owned tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-04-14** | API | AC-13 / BR-14, 16 | IT Staff dashboard operational counts | Returns HTTP 200; metrics match database query counts | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-04-15** | API | AC-13 / BR-15 | Admin dashboard returns operational metrics + user account counts | Returns HTTP 200 with operational and user statistics | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **UI-04-01** | UI | AC-01, AC-16 / FR-01 | IT Staff renders Actions Taken panel and adds new action | Form renders, fields populate, submit button shows loading state | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-04-02** | UI | AC-02, AC-17 / FR-04 | Toggle "Follow-Up Required" without note | Shows inline validation error; preserves existing entered text | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-04-03** | UI | AC-04, AC-05 / FR-07 | Requester views Actions Taken on ticket detail | Displays actions in read-only mode; Add/Edit buttons hidden | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-04-04** | UI | AC-07, AC-11 / BR-08 | Ticket workflow dropdown on IT Staff detail | Renders only valid next transitions; disables invalid transitions | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-04-05** | UI | AC-08 / BR-10 | Requester views "Problem Appears Resolved" button | Dialog confirms action; adds advisory note; status unchanged | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-04-06** | UI | AC-10 / BR-11 | Stale status update triggers HTTP 409 Conflict | Displays warning conflict banner with "Refresh Ticket" button | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-04-07** | UI | AC-12, AC-15 / FR-14 | Requester Dashboard cards, recent tickets, and empty state | Metric cards render accurately; displays zero-state when empty | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| **UI-04-08** | UI | AC-13, AC-14 / FR-15 | Staff Dashboard operational cards & drill-down links | Metric cards display counts; clicking card triggers navigation | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **E2E-04-01** | E2E | AC-01, AC-04, AC-05 | Multi-role Actions Taken lifecycle flow | Staff adds action; Requester sees read-only; Requester cannot add | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| **E2E-04-02** | E2E | AC-07, AC-08, AC-10 | Ticket resolution gate and concurrency handling | Advisory resolution -> Staff formal resolution -> Concurrency 409 | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| **E2E-04-03** | E2E | AC-12, AC-13, AC-14 | Role dashboards rendering and drill-down navigation | Requesters and Staff see appropriate metrics and drill down to lists | `e2e/lab-04/dashboards.spec.ts` | Planned |
| **REG-04-01** | Reg | AC-20 / FR-19 | Labs 1 & 2 regression test execution | Ticket creation, attachments, category seeds pass cleanly | Existing test suites | Planned |
| **REG-04-02** | Reg | AC-20 / FR-19 | Lab 3 regression test execution | Auth, first-login password change, comments, notes, admin users pass | Existing test suites | Planned |
| **A11Y-04-01** | A11y | AC-18, AC-19 / FR-22 | Keyboard navigation and responsive layout audit | Focus rings visible on all controls; 0 overflow at 375px | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |

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
