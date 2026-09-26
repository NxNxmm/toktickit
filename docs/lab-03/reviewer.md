# Lab 3 Peer Review Record

## Reviewer Information
- **Name**: Chawin Chinpraditsuk
- **Student ID**: 67070501012
- **GitHub Username**: Finyakginshabu

## Reviewed Pull Requests (Partner -> Me: NxNxmm/toktickit)
1. **Issue 1 (Spec DD)**: [PR #39](https://github.com/NxNxmm/toktickit/pull/39) — *Approved*
2. **Issue 2 (DB & Seed)**: [PR #40](https://github.com/NxNxmm/toktickit/pull/40) — *Approved*
3. **Issue 3 (Authentication & Login UI)**: [PR #41](https://github.com/NxNxmm/toktickit/pull/41) — *Approved*
4. **Issue 4 (Requester & Comments)**: [PR #42](https://github.com/NxNxmm/toktickit/pull/42) — *Approved*
5. **Issue 5 (IT Staff Ticket Queue)**: [PR #43](https://github.com/NxNxmm/toktickit/pull/43) — *Approved*
6. **Issue 6 (IT Staff Ticket Operations)**: [PR #44](https://github.com/NxNxmm/toktickit/pull/44) — *Approved*
7. **Issue 7 (Admin User Management)**: [PR #45](https://github.com/NxNxmm/toktickit/pull/45) — *Approved*
8. **Issue 8 (End-to-End Testing & Traceability)**: [PR #46](https://github.com/NxNxmm/toktickit/pull/46) — *Approved*
9. **Issue 9 (Visual Inspection, Documentation, and Release Integration)**: [PR #47](https://github.com/NxNxmm/toktickit/pull/47) — *Approved*

---

## Feedback & Responses (Partner -> Me)

### 1. Issue 1 (Spec DD)
- **Partner's Review Comment**:
  > Overall, the specs cover the requirements well. However, there are still internal inconsistencies and gaps across the documents that need to be resolved prior to implementation.

  Missing Ticket Detail GET Endpoints (api-spec.md)

  GET /api/tickets/:id: Referenced in specification.md (Section 9) for the Requester Ticket Detail view, but completely omitted from api-spec.md.
  GET /api/staff/tickets/:id: Section 6 of the lab handout explicitly requires "retrieve one Ticket for IT Staff operations", but it is missing from api-spec.md §4.
  Fix: Document these endpoints and specify their JSON response shapes (including how attachments, comments, and notes are returned). Also add GET /api/tickets/:id/comments if comments are retrieved separately.
  Field Name Mismatch: mustChangePassword vs. requiresPasswordChange

  api-spec.md uses mustChangePassword in the Auth endpoints (§2.1, §2.2, §2.4) but uses requiresPasswordChange in the Admin endpoints (§5.1, §5.2, §5.4), Prisma schema, and Business Rules.
  Fix: Standardize on one exact property name across all schemas, API payloads, and documentation.
  Unjustified Admin Ticket-Operation Authority

  Handout Section 4.3 states: "An Administrator does not automatically need to perform IT Staff Ticket operations unless the approved authorization matrix explicitly permits it."
  Your API spec quietly grants Administrator full parity with IT Staff on ticket operations (ownership, priority, status, notes) without stating this design choice.
  Fix: Add an explicit entry in specification.md §12 (Assumptions and Decisions) justifying why Administrators are granted full IT Staff ticket operation permissions in your implementation.
  Schema vs. Business Rule Mismatch on itPriority

  BR-09 states that itPriority is "initially initialized to copy requestedPriority", implying it is non-nullable. However, the Prisma schema defines itPriority as optional/nullable (ITPriority?).
  Fix: Align the Prisma schema and business rules—either make itPriority non-nullable with a default value, or update BR-09 to explain why it starts as null.
  Missing Standalone Authorization Matrix Table (specification.md)

  AC-1.1 in tests.md promises a dedicated authorization matrix, but specification.md currently lacks a clear Role × Endpoint × Ownership table (as required by Section 4.3).
  Fix: Add a dedicated Authorization Matrix table in specification.md covering API endpoints, ownership checks, and UI permissions (e.g., who can see Internal Notes or Requester navigation links).
  Missing Required Test Categories (tests.md)

  The lab sheet specifically calls for tracked coverage of Migration/Regression and Security/Authorization.
  Fix: Add dedicated regression tests (e.g., REGR-01, REGR-02) under server/tests/lab-03/ or e2e/lab-03/ to verify that Lab 2 Ticket and Attachment creation still function properly under the new authenticated identity.
  Unmapped Accessibility Verification (tests.md / ui-spec.md)

  AC-9.1 references accessibility, but it only maps to RESP-01, which checks responsive layout viewports, not accessibility features (focus rings, ARIA labels, contrast).
  Fix: Add a dedicated test or explicitly document in tests.md that accessibility criteria are verified via the visual inspection checklist in ui-spec.md.

- **My Response / Fix**:
  > Thank you so much for the thorough review! 🙏. All the points you raised are spot-on and really helpful. I'll Update those soon na kub!
  >  I have addressed all 7 items:
  > Ticket Detail GET Endpoints: Added full definitions and schemas for GET /api/tickets/:id (Requester view, excludes internal notes), GET /api/staff/tickets/:id (Staff/Admin operational view, includes internal notes), and GET /api/tickets/:id/comments in api-spec.md.
  > Field Name Standardization: Standardized strictly on requiresPasswordChange across all endpoints, schemas, and docs (removed all mustChangePassword instances).
  > Admin Ticket Operations Justification: Documented the architectural rationale in specification.md §13 (system continuity, escalation, and UI separation).
  > itPriority Alignment: Updated Prisma schema to itPriority Priority @default(MEDIUM) (non-nullable) and aligned BR-09.
  > Authorization Matrix: Added a dedicated Section 7 Role × Endpoint × Ownership table in specification.md.
  > Migration & Regression Tests: Added MIGR-01, REGR-01, and REGR-02 in tests.md with full traceability.
  > Accessibility Mapping: Added A11Y-01 in tests.md linked to AC-9.1 and the checklist in ui-spec.md §5.2.
  > Please take a look and let me know if it's ready for approval kub! :D

### 2. Issue 2 (DB & Seed)
- **Partner's Review Comment**:
  > AC-2.1: There is an inconsistency in the field name (requiresPasswordChange vs. mustChangePassword). Even though it runs perfectly, based on AC-2.1, the expected field name is requiresPasswordChange. All other criteria are met, and the migration looks good. Good job!
- **My Response / Fix**:
  > Thank you so much for the review and good feedback! You're totally right about the field name consistency. I have updated the code and DB schema to strictly use the same pattern. Everything is aligned now. Thanks again for catching this!

### 3. Issue 3 (Authentication & Login UI)
- **Partner's Review Comment**:
  > The authentication feature looks good overall. Login, logout, session checking, password-change enforcement, password updates, and the user role display are working as expected. Good boy!
  > There are a few minor warnings in the frontend tests related to React act(...) handling and mocked ticket-loading requests, but they do not affect the test results.
- **My Response / Fix**:
  > Thank you for the approval and review kub Fin! Regarding the act(...) and unhandled mock warnings in the frontend tests, I'll try to complete the API mocks in the upcoming testing pass to keep the test console output completely clean na kub!

### 4. Issue 4 (Requester & Comments)
- **Partner's Review Comment**:
  > I reviewed the requester flows. The comments, resolution indication, and internal note restrictions are working, and all 19 focused API tests pass.
  > The issue is AC-4.1. I tried accessing the ticket API without logging in but with an X-Requester-Id header:
  > curl -i http://localhost:3000/api/tickets \
  >  -H "X-Requester-Id: 1"
  > This should return 401 Unauthorized because there is no authenticated session. However, it still accepts the header and can return requester data. The same fallback exists for ticket creation and attachment endpoints which I think it's from lab 2 fallback, so the current behavior still allows a client-supplied requester ID without authentication. TT

  > The implementation satisfies auth and ticket-access requirements and the automated tests pass. I suggest that fallback in the client should be removed even the server still rejects unauthenticated access (Remove X-Requester). Nice!
- **My Response / Fix**:
  > Fix verified! I have completely removed the legacy Lab 2 header fallback. Requests sent with X-Requester-Id without an active session now strictly return 401 Unauthorized kub

### 5. Issue 5 (IT Staff Ticket Queue)
- **Partner's Review Comment**:
  > All good, I can always wait :P. Approved! I’ve checked the criteria and everything is met. The API returns all tickets for IT staff with proper RBAC, and substring search, filters, and pagination are all working well. Good luck for your next 10+ incoming issues OwO
- **My Response / Fix**:
  > Tysm kub! I'll try my best na TwT.

### 6. Issue 6 (IT Staff Ticket Operations)
- **Partner's Review Comment**:
  > lgtm! The IT Staff detail view and operations work correctly and meet all criteria.
- **My Response / Fix**:
  > -

### 7. Issue 7 (Admin User Management)
- **Partner's Review Comment**:
  > Great! Tested all criterias and everything checks out. User management operations (search, filters, create, edit), safety edge cases (preventing self-deactivation and keeping at least one active Admin), and non-Admin RBAC protection are all working as expected.
  Quick note: I noticed the hamburger menu is in the navbar, please check if this is expected.
- **My Response / Fix**:
  > Thanks for your effort on reviewing everything manually kub! I've have just noticed that there shouldn't have a hamburger menu on the nav bar when is't not on mobile UI. I'll fix that immediately in next issue na kub!

### 8. Issue 8 (End-to-End Testing & Traceability)
- **Partner's Review Comment**:
  > lgtm, all tests passed according to spec, and Playwright e2e runs smoothly and captures artifacts for the required pages. Cool!
- **My Response / Fix**:
  > glad to hear that! I'm moving on to the last issue kubbb <3

### 9. Issue 9 (Visual Inspection, Documentation, and Release Integration)
- **Partner's Review Comment**:
  > Good job! :0 The screenshot evidence clearly shows that responsiveness is working well. All required docs are completed.
- **My Response / Fix**:
  > Finally! Let me add my review for this PR and will merge to main soon! :D

---

## Reviewee Information
- **Name**: Supichaya Limwatanasamut
- **Student ID**: 67070501087
- **GitHub Username**: PingSupichaya

## Reviewed Pull Requests (Me -> Partner: PingSupichaya/toktickit)
1. **Issue 1 (Sprint specification and test plan)**: [PR #36](https://github.com/PingSupichaya/toktickit/pull/36) — *Approved*
2. **Issue 2 (Database Migration & Seed)**: [PR #44](https://github.com/PingSupichaya/toktickit/pull/44) — *Approved*
3. **Issue 3 (Login Screen and Authentication)**: [PR #45](https://github.com/PingSupichaya/toktickit/pull/45) — *Approved*
4. **Issue 4 (Requester Regression)**: [PR #46](https://github.com/PingSupichaya/toktickit/pull/46) — *Approved*
5. **Issue 5 (IT staff Ticket Queue)**: [PR #47](https://github.com/PingSupichaya/toktickit/pull/47) — *Approved*
6. **Issue 6 (Ticket operations and Comment sessions for IT staff)**: [PR #48](https://github.com/PingSupichaya/toktickit/pull/48) — *Approved*
7. **Issue 7 (Administrator user management)**: [PR #50](https://github.com/PingSupichaya/toktickit/pull/50) — *Approved*
8. **Issue 8 (Close all remaining test)**: [PR #51](https://github.com/PingSupichaya/toktickit/pull/51) — *Approved*


---

## Feedback & Responses (Me -> Partner)

### 1. Issue 1 (Sprint specification and test plan)
- **My Review Comment on Partner**:
  > I have reviewed all the Lab 3 specification and test plans, This is a solid and complete! Correctly includes the right scope and you know the drill! Role-Based Authorization and Security are great and I saw the IT staff workflow. Approved to proceed with implementation!
- **Partner's Response**:
  > I’m feeling really ready to start implementing😆 Thanks a lot for the review kubbb!

### 2. Issue 2 (Database Migration & Seed)
- **My Review Comment on Partner**:
  > I have checked out the branch locally, verified the Prisma migration history, and tested the seeding pipeline. Everything works perfectly according to the Lab 3 Data Specification Kub!
- **Partner's Response**:
  > Thanks for reviewing me kub!

### 3. Issue 3 (Login Screen and Authentication)
- **My Review Comment on Partner**:
  > Tested the Auth Foundation and mandatory First-Login Password Change implementation locally. All linked tests and acceptance criteria pass cleanly! I saw mustChangePassword = true also mustChangePassword = false after changing the password. All backend API/Auth test files and frontend auth component tests pass without issues.

  > Solid security implementation! Approved kubbb.

- **Partner's Response**:
  > Happy to see you can login and change password. Thank you for testing both frontend and backend too.

### 4. Issue 4 (Requester Regression)
- **My Review Comment on Partner**:
  > Found a bug with the 'Problem Appears Resolved' button: 
  > After clicking the button, the Public Comment 'The Requester indicated the problem appears resolved.' is posted correctly. However, when refreshing the page or re-opening the ticket, the button still appears and can be clicked again, causing identical duplicate Public Comments to be created repeatedly. Per ui-spec.md §6.1, it states: 'After it is posted the button hides.' Could you please update the logic to hide the button after the signal has been submitted? Thanks! ![alt text](image.png)

  > I have pulled the latest changes and verified locally. Re-entering or refreshing the ticket page now properly hides the button, preventing duplicate system comments. Great work!

- **Partner's Response**:
  > Oh! I just noticed that problem. I think my server doesn't record when problem is resolved. Now I add the record of problem resolve, please check this feature again😆.

  > Thanks for noticing this problem and rechecking this feature with me.

### 5. Issue 5 (IT staff Ticket Queue)
- **My Review Comment on Partner**:
  > Tested the IT Staff Ticket Queue implementation locally across unit tests, API behavior, and responsive UI layouts. All acceptance criteria (AC-08) and Definition of Done requirements pass cleanly! Great job on implementing a robust, responsive support queue! Let's go next kubbbb!
- **Partner's Response**:
  > Thank you for testing and reviewing me kubbb.

### 6. Issue 6 (Ticket operations and Comment sessions for IT staff)
- **My Review Comment on Partner**:
  > Tested the IT Staff ticket operations, status matrix enforcement, and comment/note security isolation locally. All acceptance criteria and Definition of Done requirements pass cleanly!
  > All backend API suites and UI component tests passed without issues. Excellent implementation of the IT Staff workflow kub!

- **Partner's Response**:
  > Finally, IT staff session is complete. Thanks for review kub!

### 7. Issue 7 (Administrator user management)
- **My Review Comment on Partner**:
  > Everything looks good so far! However, you might forgot to deal with mobile's UI. There isn't a hamburger menu appear in navigation bar. Please fix that before getting to next issue kub.

  > Now everything looks good! Hamburger menu is back! great work kubb. Let's move on!
- **Partner's Response**:
  > Oh! I think I forget to check client for mobile scale. thank you for notice this issue!

  > Yesss. Next time I will not forget my hamburger. Thank you for review naa.

### 8. Issue 8 (Close all remaining test)
- **My Review Comment on Partner**:
  > I ran npx playwright test with both server and client running, but 4 E2E tests are still failing due to implementation mismatches:

  > Login Error Text Mismatch (E2E-01):
  > On `e2e/lab-03/authentication.spec.ts, line 114-115.
  > The test expects the exact string "Invalid email or password", but the UI renders "Unable to sign in. Please try again." Please update the login error message on the frontend/auth handler to match "Invalid email or password".

  > Login Redirect / Logout Button Failure (E2E-04, E2E-09, E2E-11):
  > Playwright times out waiting for [data-testid="logout-btn"] after logging in fixture users. I guess this one you might want to ensure the seed database is properly reset with npx prisma migrate reset and that users are correctly authenticated without being blocked or redirected incorrectly.

  > Please address these text assertions and DB fixture issues so all 11 E2E tests can pass kub!

  > Thanks for providing me an update instruction! I have added some .env.example to my local env and E2E passed cleanly! Great effort on lab 3 kub Gj!
- **Partner's Response**:
  > I double-checked by running the Playwright tests, and all 11 tests passed. I’d like you to test it again. I’ve also updated the README with the latest instructions, so you can follow the document when testing. If it still error, please notice me again😆.

  > Thanks for reviewing me until the end of lab3 kubb.