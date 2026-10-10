# Lab 4 — AI Use and Reflection

**LLM/agent used:** Gemini 3.8 Flash / Cladude Sonnet 4.6

---

## Selected Key Prompts

| # | Prompt (summarised) | What I did with the result |
| --- | --- | --- |
| 1 | Analysing the Lab 4 brief and decomposing it into 11 specification sections, acceptance criteria (AC-01–AC-23), and 7 GitHub issues. | Reviewed against syllabus guidelines, confirmed all role constraints and BRs, and structured the Sprint 4 contract files (`specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`). |
| 2 | "After opening a PR, my reviewer left comments: IT Staff navbar still shows Create Ticket; date format in Recent Tickets is Thai locale; status badge colours and emoji icons are inconsistent across pages." | Reviewed each comment, removed Create Ticket from the IT Staff navbar, standardised date formatting to `en-US`, and unified `StatusBadge` colours and emoji icons across all views. |
| 3 | "I want to move Quick Actions next to the space between the Refresh button and the welcome greeting so it is always visible at the top." | Restructured the Staff Dashboard header row to place Quick Actions inline with the greeting/refresh area rather than in the lower grid. |
| 4 | "View Ticket Queue and My Queue should be inside a rounded-rectangle box labelled Quick Actions. Adjust metric card margins evenly. My Queue and My Assigned filters aren't working — clicking shows the whole queue instead of a filtered one." | Wrapped the quick-action buttons back in a styled card, fixed the metric grid to `repeat(5, 1fr)`, and passed the `assigned=me` or `status=X` filter through `App.tsx` to `StaffQueue` so the queue renders pre-filtered. |
| 5 | "I can't fetch ticket data as a Requester — the banner says 'Invalid status. Allowed: NEW, OPEN, …' and the server returns 400 for `status=recent`." | Identified that `recent` and `open` were virtual filter aliases not handled by the controller. Added them to `ticket.controller.ts` and `staff.controller.ts` so both resolve to the correct Prisma `where` clauses. |
| 6 | "My Assigned shows 1 for Alex Turner but the filtered queue shows 2 tickets (one resolved, one in progress). Jessica shows 0 but clicking shows 1 closed ticket. Which is right?" | Cross-checked against `BR-14` in `docs/lab-04/specification.md`: `myAssignedTickets` must exclude `RESOLVED`, `CLOSED`, and `CANCELLED`. Fixed the default filter in `StaffQueue.tsx` and the dashboard aggregation query to enforce this boundary. |
| 7 | "Should the tickets in My Recent Tickets be actionable? Can we click them to open the ticket detail page?" | Added `onClick` handler and hover highlight to every row in the `RequesterDashboard` and `StaffDashboard` recent-ticket tables, wiring the `onViewTicket` prop from `App.tsx` to route clicks to the correct `TicketDetail` or `StaffTicketDetail` view based on role. |
| 8 | "Please continue on Issue #6: Final System Regression, Accessibility, Zen Green Polish and Hardening — run the full test suite and state every errors that occur. Fix the error and write me a summarized about the errors.    " | Ran `npm test` on both client and server, identified a Prisma migration history mismatch (`requiresPasswordChange` column not yet applied to the local database), and resolved the migration baseline with `prisma migrate resolve`. |

---

## My Reflection

Working with an AI coding agent in Lab 4 was a great learning experience. It was especially helpful for repetitive and detailed task such as keeping UI status badges consistent across roles and tracing bugs back to specific backend rules. By writing the engineering contract documents first, it made a huge difference as pasting the acceptance criterion directly into a prompt that gave me more precise solutions instead of generic guesses. Its main limitation was handling complex state management, like queue filters, which often took a few extra steps and smaller, focused prompts to get right. I also had to double-check its output against our business rules, as it sometimes made assumptions that looked right but didn't match the spec. Overall, while the AI saved me a lot of time on coding, the design decisions, spec reviews, and final testing were still completely up to me kub.
