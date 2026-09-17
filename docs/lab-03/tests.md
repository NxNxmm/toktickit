# Lab 3 Test Plan and Traceability

## 1. Test Strategy

TokTickIT Lab 3 implements a rigorous Test-Driven Development (TDD) strategy to verify authentication, authorization boundaries, IT Staff ticketing workflows, and administrative controls:
- **Unit Tests**: Verify isolated pure logic, password strength validation, and status transition matrix rules.
- **Server API Integration Tests (`server/tests/lab-03/`)**: Verify REST endpoints using `supertest` against the PostgreSQL database, asserting HTTP status codes (200, 201, 400, 401, 403, 409, 422), session verification, and non-leaking data boundaries.
- **Client Component Tests (`client/tests/lab-03/`)**: Verify React components in isolation using `@testing-library/react`, asserting form states, inline errors, modal dialogs, role-based application shell rendering, and busy states.
- **Responsive & Visual Style Tests**: Verify viewport adaptation across Desktop ($\ge 992\text{px}$), Tablet ($768\text{--}991\text{px}$), and Mobile ($< 768\text{px}$), adhering to Zen Green tokens.
- **End-to-End (E2E) Tests (`e2e/lab-03/`)**: Verify complete multi-role user journeys using Playwright, testing login, mandatory password changes, ticket claiming/triage, internal note privacy, and admin user provisioning.

---

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Status |
|---|---|---|---|---|---|---|
| **UNIT-01** | Unit | BR-03, AC-3.4 | Password policy validator | Enforces $\ge 8$ chars, uppercase, lowercase, digit, and symbol | `server/tests/lab-03/unit/password-policy.test.ts` | **PLANNED** |
| **UNIT-02** | Unit | BR-12, AC-6.2 | Status transition matrix logic | Allows valid transitions; rejects invalid transitions | `server/tests/lab-03/unit/status-transitions.test.ts` | **PLANNED** |
| **API-01** | API | FR-01, BR-01, AC-3.1 | Valid user login | HTTP 200; returns safe user object with session token/cookie | `server/tests/lab-03/auth.api.test.ts` | **PLANNED** |
| **API-02** | API | BR-01, BR-04, AC-3.1 | Inactive account login | HTTP 401; returns generic error without leaking account state | `server/tests/lab-03/auth.api.test.ts` | **PLANNED** |
| **API-03** | API | BR-04, AC-3.1 | Invalid credentials login | HTTP 401; returns generic "Invalid email or password" error | `server/tests/lab-03/auth.api.test.ts` | **PLANNED** |
| **API-04** | API | FR-03, AC-3.2 | Current user retrieval (`/me`) | HTTP 200; returns authenticated profile matching session | `server/tests/lab-03/auth.api.test.ts` | **PLANNED** |
| **API-05** | API | FR-03, AC-3.2 | Session termination (Logout) | HTTP 200; clears session; subsequent `/me` returns 401 | `server/tests/lab-03/auth.api.test.ts` | **PLANNED** |
| **API-06** | API | FR-02, BR-02, AC-3.3 | Mandatory password change enforcement | Operational endpoints return HTTP 403 when password change required | `server/tests/lab-03/auth.api.test.ts` | **PLANNED** |
| **API-07** | API | FR-02, BR-03, AC-3.4 | Update password via change-password API | HTTP 200; password hash updated, `requiresPasswordChange` reset to false | `server/tests/lab-03/auth.api.test.ts` | **PLANNED** |
| **API-08** | API | FR-05, BR-05, AC-4.1 | Requester session identity injection | Ticket created with session user ID, ignoring client body `requesterId` | `server/tests/lab-03/authorization.api.test.ts` | **PLANNED** |
| **API-09** | API | FR-06, BR-06, AC-4.1 | Requester cross-ticket data isolation | HTTP 403/404 when requester attempts to read another user's ticket | `server/tests/lab-03/authorization.api.test.ts` | **PLANNED** |
| **API-10** | API | FR-07, BR-14, AC-4.2 | Post and get Public Comments | HTTP 201; comment appended with author name, role, timestamp | `server/tests/lab-03/comments-notes.api.test.ts` | **PLANNED** |
| **API-11** | API | FR-08, BR-13, AC-4.3 | Problem appears resolved indication | HTTP 200; flags `resolvedIndicated = true` without altering formal status | `server/tests/lab-03/comments-notes.api.test.ts` | **PLANNED** |
| **API-12** | API | FR-13, BR-15, AC-4.4 | Requester denied Internal Notes access | HTTP 403 Forbidden; internal notes completely omitted from ticket payload | `server/tests/lab-03/comments-notes.api.test.ts` | **PLANNED** |
| **API-13** | API | FR-09, BR-18, AC-5.1 | IT Staff queue retrieval | HTTP 200; returns all tickets across requesters for IT Staff | `server/tests/lab-03/staff-queue.api.test.ts` | **PLANNED** |
| **API-14** | API | FR-09, BR-19, AC-5.2 | Queue search, filters, and pagination | HTTP 200; filters by status/category/priority; paginates correctly | `server/tests/lab-03/staff-queue.api.test.ts` | **PLANNED** |
| **API-15** | API | FR-09, AC-5.3 | Requester denied Queue API access | HTTP 403 Forbidden when Requester attempts `GET /api/staff/tickets` | `server/tests/lab-03/staff-queue.api.test.ts` | **PLANNED** |
| **API-16** | API | FR-10, BR-08, AC-6.1 | Claim and reassign ticket ownership | HTTP 200; updates ticket `ownerId` to active staff/admin | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | **PLANNED** |
| **API-17** | API | FR-11, BR-09, AC-6.2 | IT Priority modification | HTTP 200; updates `itPriority` while keeping `requestedPriority` unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | **PLANNED** |
| **API-18** | API | FR-12, BR-12, AC-6.2 | Permitted status transition execution | HTTP 200 on valid transition; HTTP 422 on invalid transition jump | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | **PLANNED** |
| **API-19** | API | FR-13, BR-15, AC-6.3 | Create and retrieve Internal Notes (Staff) | HTTP 201; note saved with author identity and timestamp | `server/tests/lab-03/comments-notes.api.test.ts` | **PLANNED** |
| **API-20** | API | FR-14, AC-7.1 | Admin list users with search and filter | HTTP 200; returns user directory; supports name/email search & role filter | `server/tests/lab-03/users-admin.api.test.ts` | **PLANNED** |
| **API-21** | API | FR-15, BR-22, AC-7.2 | Admin create user with initial password | HTTP 201; user created with `requiresPasswordChange = true` | `server/tests/lab-03/users-admin.api.test.ts` | **PLANNED** |
| **API-22** | API | BR-21, AC-7.4 | Reject duplicate user email | HTTP 409 Conflict when creating/updating user with existing email | `server/tests/lab-03/users-admin.api.test.ts` | **PLANNED** |
| **API-23** | API | FR-15, AC-7.3 | Edit user profile and activation toggle | HTTP 200; updates user attributes in database | `server/tests/lab-03/users-admin.api.test.ts` | **PLANNED** |
| **API-24** | API | BR-22, AC-7.3 | Reset user initial password | HTTP 200; sets temporary password and flags `requiresPasswordChange = true` | `server/tests/lab-03/users-admin.api.test.ts` | **PLANNED** |
| **API-25** | API | BR-23, AC-7.4 | Prevent Administrator self-deactivation | HTTP 422 Unprocessable Entity when Admin deactivates own account | `server/tests/lab-03/users-admin.api.test.ts` | **PLANNED** |
| **API-26** | API | BR-24, AC-7.4 | Prevent deactivating last active Admin | HTTP 422 Unprocessable Entity when deactivating sole active admin | `server/tests/lab-03/users-admin.api.test.ts` | **PLANNED** |
| **API-27** | API | AC-7.5 | Non-Admin denied user management APIs | HTTP 403 Forbidden when Requester or IT Staff calls `/api/admin/users` | `server/tests/lab-03/users-admin.api.test.ts` | **PLANNED** |
| **UI-01** | UI | FR-01, AC-3.1 | Login form validation & busy states | Inline errors on empty inputs; button disables with spinner on submit | `client/tests/lab-03/Login.test.tsx` | **PLANNED** |
| **UI-02** | UI | FR-02, AC-3.3 | Mandatory password change form checks | Validates matching password, enforces complexity rules checklist | `client/tests/lab-03/ChangePassword.test.tsx` | **PLANNED** |
| **UI-03** | UI | FR-04, AC-3.5 | App shell renders user name and role badge | Displays authenticated user info and dynamic role navigation links | `client/tests/lab-03/AppShell.test.tsx` | **PLANNED** |
| **UI-04** | UI | FR-09, AC-5.4 | Staff queue table rendering and empty state | Renders ticket rows with badges; shows clean empty state on no results | `client/tests/lab-03/StaffTicketQueue.test.tsx` | **PLANNED** |
| **UI-05** | UI | FR-10, FR-11, AC-6.1 | Staff ticket detail operational controls | Renders claim/reassign dropdown, IT Priority selector, status dropdown | `client/tests/lab-03/StaffTicketDetail.test.tsx` | **PLANNED** |
| **UI-06** | UI | FR-13, AC-6.4 | Visual distinction: Public Comments vs Notes | Comments have soft green theme; notes have soft gold theme + lock icon | `client/tests/lab-03/StaffTicketDetail.test.tsx` | **PLANNED** |
| **UI-07** | UI | FR-14, FR-15, AC-7.1 | Admin user management directory & modals | Renders user list, opens Create/Edit modals with role & status controls | `client/tests/lab-03/UserManagement.test.tsx` | **PLANNED** |
| **RESP-01** | Visual | AC-5.4, AC-9.1 | Responsive layout across viewports | Desktop table converts to stacked mobile cards ($< 768\text{px}$) | `client/tests/lab-03/Responsive.test.tsx` | **PLANNED** |
| **E2E-01** | E2E | AC-8.1 | End-to-end authentication & password change | Tests login error, valid login, mandatory password reset, and logout | `e2e/lab-03/authentication.spec.ts` | **PLANNED** |
| **E2E-02** | E2E | AC-8.2 | End-to-end IT Staff ticket lifecycle | Tests queue search $\to$ claim ticket $\to$ update priority/status $\to$ notes | `e2e/lab-03/staff-ticket-flow.spec.ts` | **PLANNED** |
| **E2E-03** | E2E | AC-8.3 | End-to-end admin user management | Tests user creation $\to$ duplicate email check $\to$ reset pass $\to$ safety | `e2e/lab-03/user-administration.spec.ts` | **PLANNED** |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Description | Covering Planned Tests |
|---|---|---|
| **AC-1.1** | Numbered FRs, BRs, State Matrix, DoD | Verified via `docs/lab-03/specification.md` |
| **AC-1.2** | UI specs, Zen Green tokens, responsive rules | Verified via `docs/lab-03/ui-spec.md` |
| **AC-1.3** | REST API endpoints, schemas, safe errors | Verified via `docs/lab-03/api-spec.md` |
| **AC-1.4** | Complete AC-to-test mapping | Verified via `docs/lab-03/tests.md` |
| **AC-1.5** | Spec PR merged before feature PRs | Repository git commit timestamp verification |
| **AC-2.1** | Prisma User model with roles & flags | `server/prisma/schema.prisma` verification |
| **AC-2.2** | Ticket relationships to requester and owner | `server/prisma/schema.prisma` verification |
| **AC-2.3** | Comment and InternalNote models | `server/prisma/schema.prisma` verification |
| **AC-2.4** | Migration of Lab 2 records preserved | `server/prisma/migrations/` verification |
| **AC-2.5** | Idempotent seed script with required counts | `server/prisma/seed.ts` execution check |
| **AC-3.1** | Login verifies active credentials | `API-01`, `API-02`, `API-03`, `UI-01`, `E2E-01` |
| **AC-3.2** | `/me` profile retrieval and logout | `API-04`, `API-05`, `E2E-01` |
| **AC-3.3** | Mandatory password change redirection | `API-06`, `UI-02`, `E2E-01` |
| **AC-3.4** | Change password API and complexity rules | `UNIT-01`, `API-07`, `UI-02`, `E2E-01` |
| **AC-3.5** | App Header displays user name and role | `UI-03`, `E2E-01` |
| **AC-4.1** | Requester APIs enforce session identity | `API-08`, `API-09` |
| **AC-4.2** | Public Comments viewing and posting | `API-10`, `UI-06`, `E2E-02` |
| **AC-4.3** | Problem Appears Resolved indication | `API-11` |
| **AC-4.4** | Requesters denied Internal Notes (403) | `API-12`, `E2E-02` |
| **AC-5.1** | IT Staff queue retrieval | `API-13`, `UI-04`, `E2E-02` |
| **AC-5.2** | Search, filter, sort, and pagination | `API-14`, `UI-04`, `E2E-02` |
| **AC-5.3** | Queue API protected from non-staff (403) | `API-15` |
| **AC-5.4** | Responsive table on desktop, cards on mobile | `UI-04`, `RESP-01` |
| **AC-6.1** | Claim and reassign ticket ownership | `API-16`, `UI-05`, `E2E-02` |
| **AC-6.2** | IT Priority update and status transitions | `UNIT-02`, `API-17`, `API-18`, `UI-05`, `E2E-02` |
| **AC-6.3** | Append-only Internal Notes for staff/admin | `API-19`, `UI-06`, `E2E-02` |
| **AC-6.4** | Distinct UI styling for Public vs Internal Notes | `UI-06` |
| **AC-7.1** | Admin list users with search and filter | `API-20`, `UI-07`, `E2E-03` |
| **AC-7.2** | Admin create user with initial password | `API-21`, `UI-07`, `E2E-03` |
| **AC-7.3** | Edit user details & reset initial password | `API-23`, `API-24`, `UI-07`, `E2E-03` |
| **AC-7.4** | Duplicate email, self-deactivation & last admin guards | `API-22`, `API-25`, `API-26`, `E2E-03` |
| **AC-7.5** | Non-Admin denied Admin APIs (403) | `API-27` |
| **AC-8.1** | E2E authentication & password change suite | `E2E-01` |
| **AC-8.2** | E2E staff ticket lifecycle suite | `E2E-02` |
| **AC-8.3** | E2E user administration suite | `E2E-03` |
| **AC-8.4** | 100% tests passing on main | Automated CI / test execution on `main` |
| **AC-9.1** | Visual verification across viewports | `RESP-01` |
| **AC-9.2** | Screenshots in `artifacts/lab-03/screenshots/` | Submission artifact verification |
| **AC-9.3** | Peer review documented in `reviewer.md` | Submission artifact verification |
| **AC-9.4** | AI prompts and reflection in `ai-use.md` | Submission artifact verification |
| **AC-9.5** | Clean merge of `lab3-staging` to `main` | Git commit history verification |

---

## 4. Test Execution Instructions

### Server Unit & Integration Tests
```bash
cd server
npm test
```

### Client Unit & Component Tests
```bash
cd client
npm test
```

### End-to-End Tests
```bash
npm run test:e2e
```
*(Or `npx playwright test --config playwright.config.ts`)*
