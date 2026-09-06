# Lab 2 Peer Review Record

## Reviewer Information
- **Name**: Chawin Chinpraditsuk
- **Student ID**: 67070501012
- **GitHub Username**: Finyakginshabu

## Reviewed Pull Requests (Partner -> Me)
1. **Issue 1 (Spec DD)**: [PR #22](https://github.com/NxNxmm/toktickit/pull/22) — *Approved*
2. **Issue 2 (DB & Seed)**: [PR #23](https://github.com/NxNxmm/toktickit/pull/23) — *Approved*
3. **Issue 3 (Requester Context)**: [PR #24](https://github.com/NxNxmm/toktickit/pull/24) — *Approved*
4. **Issue 4 (Create Ticket)**: [PR #25](https://github.com/NxNxmm/toktickit/pull/25) — *Approved*
5. **Issue 5 (My Tickets)**: [PR #26](https://github.com/NxNxmm/toktickit/pull/26) — *Approved*
6. **Issue 6 (Ticket Detail)**: [PR #27](https://github.com/NxNxmm/toktickit/pull/27) — *Approved*
7. **Issue 7 (Automated Tests, Responsive Validation, and Final Release)**: [PR #28](https://github.com/NxNxmm/toktickit/pull/28) — *Approved*

## Feedback & Responses
- **Partner's Review Comment**: 
1. **Issue 1 (Spec DD)**: lgtm, engineering contract in docs/lab-02/ is solid and well-structured. FRs, BRs, ACs, API contracts, and Zen Green UI tokens are clearly defined. The test plan in tests.md provides good coverage for all required acceptance criteria.

2. **Issue 2 (DB & Seed)**: All acceptance criteria met, schema.prisma contains RequesterUser, Category, RelatedSystem, Ticket, and Attachment, compound indexes, Database Migration excutes successfully. No duplicate seed when run multiple times. Good Job!

3. **Issue 3 (Requester Context)**: I've tested the requesters with the selection UI. It correctly handles changing requesters and displays an error message when no API is connected. Shell screens are ready for implementing 'My Ticket' and 'Create Ticket' for the upcoming issues. Overall, it looks good to me.
Note: You might want to consider responsive design for different screen sizes in upcoming tasks. :D

4. **Issue 4 (Create Ticket)**: lgtm, I've tested it according to the acceptance criteria. Since the 'My Ticket' view isn't implemented in this issue yet, the unique ticket no. can't be viewed on the client side, but I verified that it generates correctly in the API. Text limits and file size/type restrictions are well handled. Nice! :))

5. I've tested through the acceptance criteria. Searching, filtering, sorting, and fetching only tickets owned by requester are working great. However, I'm requesting changes due to a few issues:

- Ticket Number Generation Bug: Found an issue with how ticket numbers are being generated.
- Mobile Navigation: On smaller screens, the navbar component overflows. I suggest replacing the full component with a hamburger menu for better mobile responsiveness.

After fixing (the second review)
Thanks for addressing the feedback! Verified the fixes for ticket number generation and the mobile navbar, everything looks clean and works as expected. Search, filtering, and API ticket scoping all look good. :D 👍

6. **Issue 6 (Ticket Detail)**: lgtm, everything meets the acceptance criteria and works smoothly.
Minor UX Suggestion (Optional): Currently in 'My Tickets', users have to click on the green ticket number link to view details. My suggestion is making the entire row clickable would make navigation much smoother. Good job! :D

7. **Issue 7 (Automated Tests, Responsive Validation, and Final Release)**: 
Well done! Your E2E tests are thorough and demonstrated well. The responsiveness across desktop, mobile, and tablet looks great, and the artifact screenshots are super clear. It was a pleasure reviewing your code for Lab 02 <3

- **My Response / Fix**:
1. **Issue 1 (Spec DD)**: -
2. **Issue 2 (DB & Seed)**: Tq kubbb.
3. **Issue 3 (Requester Context)**: I'll keep that in mind kub. Tysm!
4. **Issue 4 (Create Ticket)**: Glad I've passed everything kub! We'll see other components in next issue!
5. **Issue 5 (My Tickets)**: Thanks for the detailed review! I have no idea why it worked before I pushed but I've fixed it anyway. Also, I've adjust a Hamburger Menu for mobile responsive as suggested kub. Please check them again and let me hear what you think!
6. **Issue 6 (Ticket Detail)**: Tysm! I'd love to make that change in next issue kub <3
7. **Issue 7 (Automated Tests, Responsive Validation, and Final Release)**: 
Yayyyy thanks for all your lovely reviews kubbb <3

---

## Reviewee Information
- **Name**: Supichaya Limwatanasamut
- **Student ID**: 67070501087
- **GitHub Username**: PingSupichaya

## Reviewed Pull Requests (Me -> Partner)
1. **Issue 1 (Sprint specification and test plan)** : [PR #16](https://github.com/PingSupichaya/toktickit/pull/16) - *Approved*
2. **Issue 2 (Database increment)** : [PR #21](https://github.com/PingSupichaya/toktickit/pull/21) - *Approved*
3. **Issue 3 (UI foundation & Development requester context)** : [PR #22](https://github.com/PingSupichaya/toktickit/pull/22) - *Approved*
4. **Issue 4 (Reference APIs)** : [PR #23](https://github.com/PingSupichaya/toktickit/pull/23) - *Approved*
5. **Issue 5 (Attachment APIs)** : 
[PR #27](https://github.com/PingSupichaya/toktickit/pull/27) - *Approved: found out merging into wrong branch (main)*
[PR #28](https://github.com/PingSupichaya/toktickit/pull/28) - *Approved: Reverted form merging into wrong base branch (main)* 
[PR #29](https://github.com/PingSupichaya/toktickit/pull/29) - *Approved: merge into lab2-staging*
6. **Issue 6 (UI for creating ticket & Attachments)** : [PR #30](https://github.com/PingSupichaya/toktickit/pull/30) - *Approved*
7. **Issue 7 (My tickets screen)** : [PR #31](https://github.com/PingSupichaya/toktickit/pull/31) - *Approved*
8. **Issue 8 (Ticket detail)** : [PR #32](https://github.com/PingSupichaya/toktickit/pull/32) - *Approved*
9. **Issue 9 (Integration, E2E Testing & Submission Preparation)** : [PR #33](https://github.com/PingSupichaya/toktickit/pull/33) - *Approved*

## Feedback & Responses
- **My Review Comment on Partner**:
1. **Issue 1 (Sprint specification and test plan)** : 
Excellent effort on this PR!
The level of detail across all 4 specification documents (api-spec.md, specification.md, tests.md, and ui-spec.md) is impressive and provides a solid foundation for Spec-Driven Development (SDD). The REST API structure, Zen Green theme tokens, and BDD-style test scenarios align very well with our Lab 2 requirements.

But just a little more changes, please check the detailed inline comments on each file for specific suggestions! Once these structural sections and alignments are added, please re-request a review. Great job so far!

**After fixing:**

Approved kub! Awesome job on addressing all the feedback! The specifications are now ready to be handed over to the coding agent for implementation. Let's go next kubbb!

2. **Issue 2 (Database increment)** : 
Overall LGTM Kub. The database schema, migration script, seed implementation, and automated test suite closely follow the Lab 2 specification (docs/lab-02/specification.md) and test plan (T-022).

But there is some error I've got when running your project on my local, so please make sure everything is working evenif they aren't in the AC kub.

3. **Issue 3 (UI foundation & Development requester context)** : 
After I've run local on my PC. The backend API logic, active requester filtering, and state persistence are working well. All users are shown correctly and accurate within Prisma Studio. Switch Requester & Context Reset are seamlessly.

However, during local testing across different viewports, I noticed a few UI/UX and Responsive bugs that need to be addressed before we can merge this into lab2-staging:

Mobile Responsive Dropdown Overflow:

On mobile viewports (e.g., iPhone SE @ 375px), the expanded `<select>` dropdown menu overflows outside the card boundary on the right.
Please ensure that the select container and options use width: 100%, max-width: 100%, and proper box-sizing: border-box to prevent horizontal clipping/overflow[cite: 7].
Please fix the responsive CSS rules and layout wrapping, then re-request a review! Great work so far!

**After Fixing:**

Well after you have fixed the responsive bugs that I mentioned, Everything looks great now! But I noticed that in the very first page, there is a missing messege "DEVELOPER MODE" so make sure you bring it back in next issue kubbb. Figthing!

4. **Issue 4 (Reference APIs)** : 
I have performed local testing against the database and verified all required endpoints according to api-spec.md and acceptance criteria (AC-01, AC-03, AC-04, AC-05, AC-08). All backend tests are passing cleanly. Great work! Approved kubbb!

5. **Issue 5 (Attachment APIs)** : 
All automated test suites for both Server and Client passed successfully! Coverage for AC-12, AC-13, and AC-14 is fully verified. Excellent work kub! Hope to see the UI for creating ticket soon!

6. **Issue 6 (UI for creating ticket & Attachments)** : 
The Create Ticket page implementation aligns well with the UI specifications and passes all acceptance criteria. The displayed as read-only, correctly to the active context user. Category and Related System dropdowns fetch and populate active options dynamically from the API. I love that priority radio buttons render horizontally on desktop viewports and collapse cleanly into a vertical stack on mobile screens. Also, file attachment area behaves optionally as required. Upon successful ticket submission, the drag & drop area disables properly until the top notification is dismissed. And lastly, CreateTicketForm.test.tsx passes cleanly. Everything functions as intended with solid responsive behavior and state management. Great job kub!

7. **Issue 7 (My tickets screen)** : 
All functional requirements and test cases passed smoothly! Search debouncing, filter/sort controls, clear filters action, and pagination are working as expected.

But here's a little bit of suggestion. During testing on smaller screen sizes (Mobile and iPad viewports), I noticed that the ticket list content and card boundaries are quite flushed against the outer screen edges. The lack of outer margin/padding on small viewports makes the layout feel a bit cramped and visually constrained.

Since all features, responsiveness, and tests are functioning properly, Approved to merge kub! You can polish the container spacing in a quick follow-up PR if needed.

8. **Issue 8 (Ticket detail)** : 
Tested the Ticket Detail page, Ownership Guard, and Attachment Management flows locally. Everything works according to the specified requirements! All automated test suites are also passing cleanly.

PS. I love the way to download attached file but for suggestion it might be better if there is a clearly visible download button. Also, it would be even better if the time the file was deleted were indicated. But if you don't think it's necessary, there's no need to include it! Still approved kubbb let's go next!

9. **Issue 9 (Integration, E2E Testing & Submission Preparation)** : 
I have performed the final peer review and verified all E2E test runs and submission artifacts locally. Everything meets the lab requirements and acceptance criteria! All automated E2E test suites executed successfully without errors. Visual evidence and screenshots captured across all required viewports and clearly stored in artifacts/lab-02/screenshots/ as required lab2 structure kubb! Great job for lab 2!

- **My partner's Response / Fix**:
1. **Issue 1 (Sprint specification and test plan)** : 
Thanks a lot for the detailed review kubb. Next time, I will that ensure everything meets lab's criteria. <3

2. **Issue 2 (Database increment)** : 
Sorry kub, I've added isActive in schema so you should run npx prisma generate to update types cause prisma doesn't auto regenerate

3. **Issue 3 (UI foundation & Development requester context)** :
I have changed native HTML component to custom dropdown so I think this problem has solved.
I think I already add "Developer mode" in this fix😡

4. **Issue 4 (Reference APIs)** : 
Thanks for your review kub. <3

5. **Issue 5 (Attachment APIs)** : 
Thanks for review! but I choose false base branch to merge into😭. Thanks a lot for helping me revert this pr and merge into lab2-staging.

6. **Issue 6 (UI for creating ticket & Attachments)** : 
I really appreciate your detailed review, thanksssss😍.

7. **Issue 7 (My tickets screen)** : 
I see, thanks for the review. I will add some spaces from the edge in the next PR🙏

8. **Issue 8 (Ticket detail)** : 
Thanks kubb. I think for removing date doesn't need to include time just know the date is enough for me kub😆.

9. **Issue 9 (Integration, E2E Testing & Submission Preparation)** : 
Thanks for your reviews until my last issue. <3
