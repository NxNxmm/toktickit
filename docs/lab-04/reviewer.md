# Lab 4 Peer Review Record

## Reviewer Information

- **Name**: Chawin Chinpraditsuk
- **Student ID**: 67070501012
- **GitHub Username**: Finyakginshabu

## Reviewed Pull Requests (Partner -> Me: NxNxmm/toktickit)

1. **Issue 1 (Sprint 4 Spec DD)**: PR #[57] (<https://github.com/NxNxmm/toktickit/pull/57>) — *Approved*
2. **Issue 2 (Actions Taken Foundation & DB)**: PR #[58] (<https://github.com/NxNxmm/toktickit/pull/58>) — *Approved*
3. **Issue 3 (Actions Taken UI)**: PR #[59] (<https://github.com/NxNxmm/toktickit/pull/59>) — *Approved*
4. **Issue 4 (Ticket Workflow & Resolution Gate)**: PR #[60] (<https://github.com/NxNxmm/toktickit/pull/60>) — *Approved*
5. **Issue 5 (Role Dashboards)**: PR #[61] (<https://github.com/NxNxmm/toktickit/pull/61>) — *Approved*
6. **Issue 6 (Final Hardening, Polish & Regression)**: PR #[62] (<https://github.com/NxNxmm/toktickit/pull/62>) — *Approved*

---

## Feedback & Responses (Partner -> Me)

**1. Issue 1 (Sprint 4 Spec DD)**

- **Partner's Review Comment**:

**Issue 1 (Sprint 4 Spec DD)**
All 11 required sections are covered in contracts, FR/BR numbering is clear. I found a few contract inconsistencies.

### Blocking

1. **Requester dashboard metrics don't match across docs.**
   - `specification.md` (FR-14 / BR-13): Total Open, Waiting for Requester, Recently Updated, Recently Resolved.
   - `api-spec.md`: `totalOpen`, `inProgress`, `waitingForRequester`, `recentlyResolved`, `closed`. There is no recently-updated metric.
   - `ui-spec.md`: My Open, In Progress, Resolved, Closed. There is no Waiting card.
   - Also, "Resolved" in BR-13 includes `CLOSED`, which overlaps with the Closed card. Please pick one and use it in all files.
2. **Dashboard calculation rules are incomplete.** §6.2, please define whether "last 7/30 days" is rolling or calendar, which time zone applies, and the drill-down URL/query params for each card, including the Requester cards. Also clarify whether My Assigned should exclude `RESOLVED`.
3. **Transition matrix (BR-08) has no roles.** Please state which role may perform each transition, including Cancel and Reopen. The Requester "advisory reopen" mentioned in BR-08 has no API support.
4. **Error response shape is inconsistent.** §1.2 and the 409 use `{ error: { code, ... } }`, while the 400 and 422 examples are flat. Please standardize on one. Also confirm 422 (not "422 or 400") for BR-09.1, and add 422 to the §8 table in `specification.md`.
5. **Concurrency gaps.** `PATCH /actions-taken/:actionId` has no version check, so concurrent edits overwrite silently. Either add one or document last-write-wins. Please also state that `GET /api/tickets/:id` returns `version`, and give the order in which 409, 403, 400 and 422 are evaluated.
6. **AC-02b is not testable.** "Clears or preserves" can't fail. Please choose one behavior (for example, `followUpNote` is set to null when `followUpRequired=false`) and align API-04-16.
7. **Test traceability weaknesses.**
   - AC-18 and AC-19 (overflow at 375px, focus rings) are mapped to a Vitest/jsdom file, which can't measure layout. Please move them to Playwright and cover the Requester dashboard and Ticket Detail too.
   - AC-17 has no test for a server 400 preserving form values.
   - AC-07b is not tested for `CLOSED`.
   - AC-16 is not tested for the workflow form.
   - There are no tests for migration/backfill, seed idempotency, 401/403 on `/dashboard/admin`, zero-state metrics, or the full transition matrix.

### Non-blocking

- Decision 3 in §7.2 is titled "Composite Indexing", but the schema has three single-column indexes. Add `@@index([ticketId, actionDateTime])` or retitle it.
- Consider adding indexes for dashboard aggregates: `Ticket(status)`, `Ticket(requesterId, status)`, `Ticket(assignedStaffId, status)`.
- Please justify `onDelete: Cascade` on `ticket`, or reconcile it with "no hard deletes".
- Prisma doesn't generate down-migrations. Note that the rollback is hand-written SQL, and test it.
- `ui-spec.md` is missing: Requester and Admin responsive layouts; loading, forbidden and safe-failure states for dashboards; UI handling for the 422 `RESOLUTION_REQUIRES_ACTION_TAKEN` error; mobile Actions Taken card fields (follow-up, attachment notes, Edit); and the mobile modal behavior.
- Tablet is "2 or 3 columns" and mobile is "1 or 2" in the specification. Please pick one.
- The "from yesterday" delta in the handout mockup has no API field. Drop it or define it.
- Please state "no DELETE endpoint" explicitly in `api-spec.md`.
- Section 2 of `specification.md` has a duplicated paragraph, and the `file:///c:/...` links should be repo-relative.
- Please add ACs for BR-04 (inactive performer), BR-07 (ordering), and the Admin dashboard, so API-04-07 doesn't borrow AC-20.

This is my review for the smooth implementation phase :D

**Issue 2 (Actions Taken Foundation & DB)**
> Looks good overall. The Lab 4 changes are well-structured and the workflow/API behavior is consistent with the acceptance criteria.

> The API enforces authorization correctly, uses the session user as the actor, and blocks invalid resolution attempts when no action history exists. The test covers the happy path and the key edge cases.

>One thing to check is the database cleanup for older Lab 2 tests, ticket deletion fails when action_taken rows still reference those tickets, so the dependent rows need to be deleted first.

**Issue 3 (Actions Taken UI)**
> lgtm! I checked all ACs from AC-03-01 through AC-03-05 (read-only mode for requesters, validation errors, loading state on submit, and mobile responsiveness). Everything works smoothly. Good good :D

**Issue 4 (Ticket Workflow & Resolution Gate)**
> One acceptance item remains unverified and appears unsupported: AC-04-02 requires recording transition history. The new API tests verify status and version updates, but don’t assert history; the Prisma ticket schema has no status-history relation. The E2E spec also verifies status/version, not history. :O

> All right then, it would be perfectly fine. All acceptance criteria are met.

**Issue 5 (Role Dashboards)**
> The UI shells for both the Requester and IT Staff dashboards are fully functional, and the endpoints are correctly connected to the API.
> There is a few suggestion for UI I want you to consider
>
> - IT Staff cannot create tickets, but the Create Ticket action is still visible in the navbar.
> - In the Recent Tickets section, please update the date format in the Updated column from Thai locale to the standard English format used throughout the rest of the project.
> - Status badges are inconsistent across pages. The badges on the My Tickets and Ticket Queue pages doesn't have emoji icons, and color mappings differ between views (e.g., Waiting for Requester is purple on My Tickets but brown on the Dashboard).

> Thanks for making the updates. Everything looks clean and well-aligned now. :D

**Issue 6 (Final Hardening, Polish & Regression)**\
> The unit tests are passing. A few things we need to polish up first:
>
> - npm run build is blocked by a missing version field in the StaffTicketDetail test fixture.
> - The Actions Taken modal still needs Escape handling and focus trapping to meet the keyboard accessibility requirements.
> - The Lab 4 UI checklist is still unchecked, and the test run shows fetch errors and React act(...) warnings.

> Re-reviewed and everything looks clean. Checked the full regression suite, mobile responsiveness, and keyboard accessibility. All ACs are fully met with passing test suites. :))

- **My Response & Action**:

**1. Issue 1 (Sprint 4 Spec DD)**

> Thanks for the very detailed review! I’ve updated everything to meet the requirements and specifications as clarified. It would have been much harder to get this done without your help!

**Issue 2 (Actions Taken Foundation & DB)**
> Thanks for catching that foreign key constraint issue! I've updated the ticket deletion cleanup logic to remove dependent action_taken rows first before deleting the ticket. Ran the full regression suite and all Lab 2 & Lab 4 tests are passing green now.

**Issue 3 (Actions Taken UI)**
> Tysm kubbbb

**Issue 4 (Ticket Workflow & Resolution Gate)**
> Thanks for thorought review on this issue! Regarding the "transition history" point. I think the issue description's summary text was a bit misleading in our actual engineering specs (docs/lab-04/specification.md), we don't have a separate StatusHistory table/relation.
> Here is how history and auditability are handled in my architecture according to the spec:
> Actions Taken as the Work History (specification.md §7.1):
> The resolution gate requires 1 or more Action Taken entry before resolving a ticket so the action_taken table is my official work history log. Therefore, adding a new StatusHistory table would break compatibility with lab4-staging and diverge from our approved spec. Since ticket-workflow.api.test.ts and ticket-resolution.spec.ts assert the status change, version increment, and Action Taken gate, they fully satisfy AC-04-02 as contracted kub!

**Issue 5 (Role Dashboards)**
> Thanks for the thorough UI feedback! I've addressed all three items in the latest commit. Also all unit tests and Playwright E2E specs have been re-verified. Thanks!

**Issue 6 (Final Hardening, Polish & Regression)**
> Thanks for the thorough review in every issue in this lab kubb. I’ve fixed all four points in the latest commit and will manage with every docs in last issue.

---

## Reviewee Information

- **Name**: Supichaya Limwatanasamut
- **Student ID**: 67070501087
- **GitHub Username**: PingSupichaya

## Reviewed Pull Requests (Me -> Partner: PingSupichaya/toktickit)

1. **Issue1: Initial sprint specification**: [PR #63](https://github.com/PingSupichaya/toktickit/pull/63) — *Approved*
2. **Issue2: Prisma migration & seed**: [PR #64](https://github.com/PingSupichaya/toktickit/pull/64) — *Approved*
3. **Issue3: Actions taken API**: [PR #65](https://github.com/PingSupichaya/toktickit/pull/65) — *Approved*
4. **Issue4: Actions taken UI**: [PR #66](https://github.com/PingSupichaya/toktickit/pull/66) — *Approved*
5. **Issue5: Ticket workflow: resolution gate & concurrency**: [PR #67](https://github.com/PingSupichaya/toktickit/pull/67) — *Approved*
6. **Issue6: Requester dashboard**: [PR #68](https://github.com/PingSupichaya/toktickit/pull/68) — *Approved*
7. **Issue7: IT Staff Dashboard**: [PR #69](https://github.com/PingSupichaya/toktickit/pull/69) — *Approved*
8. **Issue8: Final hardening & regression**: [PR #70](https://github.com/PingSupichaya/toktickit/pull/70) — *Approved*

## Feedback & Responses (Me -> Partner)

**Issue1: Initial sprint specification**
Overall, the documents are super detailed, well-structured, and clearly thought through! But I noticed a couple of minor points that we might need to adjust to align with the Lab 4 sheet.

1. Administrator Dashboard Metrics on both `api-spec.md` and `specification.md` - Right now, the spec reuses the IT Staff Dashboard for Administrators without adding user stats. However, section 4.6 of the brief sheet requires the Administrator dashboard to include concise user-account stats such as counts for active Requesters, IT Staff, and Admins.

2. Action Date/Time Field on both `ui-spec.md` and `specification.md` - The spec currently sets the Action Date/Time automatically on the backend via `createdAt` but from brief sheet in section 8.3 mentions "Action Date/Time" as a field for Actions Taken. I think maybe  we should allow a datetime-local picker on the UI (defaulting to current time, blocking future dates) so IT Staff can log actions that happened earlier.

Everything else looks awesome! Please let me know your thought and I shall approve this PR kubbb.

**Issue2: Prisma migration & seed**
I have verified the Lab 4 Prisma migration and idempotent seed suite locally. All migration requirements, data integrity checks, and test scenarios on both automation and manual pass cleanly! Gj kubb

**Issue3: Actions taken API**
Verified the Actions Taken API implementation, validation helpers, and test suites locally. All contract requirements, business rules and security guards pass cleanly! Great work on backend validation and concurrency kub!

**Issue4: Actions taken UI**
Verified the Actions Taken UI components, conditional validations, session role restrictions, optimistic concurrency conflict handling (`409 STALE_UPDATE`), and Playwright E2E flows locally. All checklist requirements, UI tests and E2E specs pass cleanly kub!

**Issue5: Ticket workflow: resolution gate & concurrency**
Verified the backend Resolution Gate enforcement, advisory requester indicator behavior, UI status dropdown hints, and automated test suites locally. All acceptance criteria and test specs also pass cleanly! Let's go next kubbbb

**Issue6: Requester dashboard**
Overall the implementation on backend api-spec and tests is really LGTM kub! Every tests pass cleanly.

However, in my opinion I think the UI on dashboard isn't that functional. Maybe you could've adjust the layout to be more visible, more compact by reduce the blank space also the `Quick Actions` is really too far from usage kub. I hope you consider make some changes on UI.

> Great job! Now your UI is usable and suite more Zen Green Theme! Nicely design kubbb

**Issue7: IT Staff Dashboard**
Verified the Staff & Admin Dashboard API implementation, active metric calculations, role-based response enhancements , UI layout, and query drill-down links locally. All acceptance criteria, API tests and UI tests pass cleanly! Excellent work kubbb

**Issue8: Final hardening & regression**
Verified on automated test and UI from latest in local! Hoever, I ran the Playwright E2E suites for both `e2e/lab-03/` and `e2e/lab-04/`, but several key flows (`E2E-11`, `E2E-04`, `E2E-01`, `E2E-02`) failed with `90000ms Timeout Exceeded` or `Element not found` errors.

In Lab 4, successful logins land on `/dashboard` by default. However, the E2E test specs and helper functions like `openStaffTicket` and `openQueueTicket` assume the browser lands directly on the Ticket Queue (`/tickets`) or My Tickets page, causing Playwright to wait endlessly.

In `e2e/lab-03/requester-regression.spec.ts`: Please ensure the test navigates or clicks through to My Tickets / Create Ticket form from `/dashboard` after logging in.

In `e2e/lab-03/staff-ticket-flow.spec.ts`, `e2e/lab-04/actions-taken-flow.spec.ts`, and `e2e/lab-04/ticket-resolution.spec.ts`: Update helper routines (e.g., `openStaffTicket`, `openQueueTicket`) to navigate from `/dashboard` to the Ticket Queue (`/tickets` or `/tickets/queue`) before attempting to search using `[data-testid="queue-search-input"]`.

 Note: I Run `npx playwright test e2e/lab-03/` and `npx playwright test e2e/lab-04/` only for test because the test in Lab 2 will always failed due to authenticated identity that is already fixed in Lab 3.

Please update the E2E helper navigation so we can get all E2E tests passing cleanly kub!

---

After I tried run e2e test on locally, I found 2-3 missing spots kub.

In Lab 4, successful logins now default to landing on the Dashboard. However, several E2E test specs and helper routines attempt to locate elements specific to the Ticket Queue or My Tickets views (such as [data-testid="queue-search-input"], [data-testid="queue-table"], or [data-testid="create-ticket-btn"]) immediately after logging in. Because the browser remains on /dashboard, Playwright fails to find these elements and exceeds the 90000ms test timeout.

Here are some results:

*e2e/lab-03/*

1) e2e\lab-03\requester-regression.spec.ts:99:5 › E2E-11 authenticated requester creates a ticket, manages an attachment, and posts a comment

    Test timeout of 90000ms exceeded.

    Error: locator.click: Test timeout of 90000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="create-ticket-btn"]')

      118 |
      119 |   // Create a Ticket through the real form.
    > 120 |   await page.locator('[data-testid="create-ticket-btn"]').click();
          |                                                           ^
      121 |   await expect(page.locator('[data-testid="category-select"]')).toBeVisible();
      122 |   await page.locator('[data-testid="summary-input"]').fill("E2E-11 regression ticket — authenticated create");
      123 |   await page.locator('[data-testid="description-input"]').fill(created.description);

2) e2e\lab-03\staff-ticket-flow.spec.ts:165:5 › E2E-04 staff ticket workflow: queue → claim → priority → status → comment → note

    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid="queue-table"]')
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" locator('[data-testid="queue-table"]') with timeout 10000ms
      - waiting for locator('[data-testid="queue-table"]')

      176 |     "IT_STAFF"
      177 |   );
    > 178 |   await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();
          |                                                             ^
      179 |   await shot(SHOTS_QUEUE, page, "desktop-queue.png");
      180 |
      181 |   // Queue search (debounced) + single status filter combine.
  
  2 failed
    e2e\lab-03\requester-regression.spec.ts:99:5 › E2E-11 authenticated requester creates a ticket, manages an attachment, and posts a comment
    e2e\lab-03\staff-ticket-flow.spec.ts:165:5 › E2E-04 staff ticket workflow: queue → claim → priority → status → comment → note

*e2e/lab-04/*

 1) e2e\lab-04\actions-taken-flow.spec.ts:112:5 › E2E-01 staff adds + edits Actions Taken, list in actionAt order

    Test timeout of 90000ms exceeded.

    Error: locator.fill: Test timeout of 90000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="queue-search-input"]')

      88 |
      89 | async function openStaffTicket(page: Page) {
    > 90 |   await page.locator('[data-testid="queue-search-input"]').fill(TICKET_SEARCH);
         |                                                            ^
      91 |   const row = page.locator(`tr[aria-label="Open ticket ${TICKET_NUMBER}"]`);
      92 |   await expect(row).toBeVisible({ timeout: 10000 });
      93 |   await row.click();

 2) e2e\lab-04\ticket-resolution.spec.ts:108:5 › E2E-02 resolution gate blocks, then resolves once qualified

    Test timeout of 90000ms exceeded.

    Error: locator.fill: Test timeout of 90000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="queue-search-input"]')

      84 |
      85 | async function openQueueTicket(page: Page, search: string, ticketNumber: string) {
   -> 86 |   await page.locator('[data-testid="queue-search-input"]').fill(search);
         |                                                            ^
      87 |   const row = page.locator(`tr[aria-label="Open ticket ${ticketNumber}"]`);
      88 |   await expect(row).toBeVisible({ timeout: 10000 });
      89 |   await row.click();

> Found out that it was my fault on wrong pull on local branch kub 😅! Verified all features, navigation fixes, resolution gates, dashboards, accessibility standards, and complete test suites across the application locally. All Definition of Done checklist items and acceptance criteria pass!

---

## Partner's Response back to me

**Issue1: Initial sprint specification**

In Requester Dashboard Metric, I already have recently update and resolved. but I added closed for keep final history of tickets and prevent old  Tickets disappear from counts. FYI the closed can be dropped :P

As for the other points, I have considered the issues and already fixed everything. Thank you again for helping me edit the engineering contract.

> Thanks for checking the correctness and detail across the four files kub! Let's moving on to the migration next.

**Issue2: Prisma migration & seed**

Thanks for review kub! Happy to see that all migration and seed pass cleanly😆.

**Issue3: Actions taken API**

Thank you for verifying the validation locally kub! Glad that there is no request change eiei.

**Issue4: Actions taken UI**

Thanks for checking the role restrictions and the conflict flow kub!

**Issue5: Ticket workflow: resolution gate & concurrency**

Let's gooo, thanks for verifying the gate enforcement kub!

**Issue6: Requester dashboard**

Ummm.. thank you for your opinion. I think it can be more better layout too. Now I have edited the dashboard layout so you can re-review.

> Thanks for the UI feedback, the dashboard looks much better now kub!

**Issue7: IT Staff Dashboard**

Thank you for verifying the metrics and drill-downs locally kub! Excellent review as always.

**Issue8: Final hardening & regression**

Oh, I separated some of the test files into Issue 9, but I think I should move all the test files into this issue so that we can clearly meet the full regression criteria. Now its ready to review! please help me review this issue again.

> These four failures are from specs before the dashboard-navigation update, the reviewed commit 9400947 already routes all helpers through the header nav (gotoQueue/gotoMyTickets), and both suites pass cleanly on it (lab-03 11/11, lab-04 6/6). Please git pull, stop any stale dev servers on :3000/:5174 so Playwright boots the current build, and re-run. If your tests still failed, please notice me
