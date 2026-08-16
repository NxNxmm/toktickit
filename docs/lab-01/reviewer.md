# Lab 1 — Peer Review Record  (fill this in)

**Author:** <Norawit Mahaprom> — <67070501026> — GitHub: @<NxNxmm>
**Peer reviewer:** <Supichaya Limwatanasamut> — <67070501087> — GitHub: @<PingSupichaya>

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #1 | feature/1-project-foundation | Approved |
| #2 | feature/2-health-check | Approved |
| #3 | feature/3-category-seed | Approved |
| #4 | feature/4-category-list | Approved |

Reviewer comment I received:
Issue 1: Successfully initialize project ! Everything is fine but suggest to add some README or setup instructions to make your project more perfect.
Issue 2: From a local test, everything works fine and meets the criteria. System status can show online and offline. You can improve it by give me a test or setup project instruction.
Issue 3: From my testing, server runs test failed. Please make sure you push correct code. | After fixing | Both client and server test passed. I can see categories are created. All files are correct and meet all the criteria. Make sure you resolve merge conflict before merge. Great job!
Issue 4: Nothing runs failed, both client and server are test passed and API can fetch all the categories to display in web page. Everything meets the criteria. Nice work !😍

How I responded:
Issue 1: Thank you for the review and the great suggestion! I will add a `README.md` with step-by-step setup instructions to make local installation easier for everyone.
Issue 2: Thanks for testing the health check and status toggling! I'll include testing and local setup guidelines in the repository documentation as suggested.
Issue 3: I've fixed the false API, could you check the server again pls. I guess I pushed the wrong one before 'cause on issue 2 it work very fine. Thx!
Issue 4:Thank you so much for the review and kind words! Glad to hear both server and client test suites passed and the categories are fetching correctly on the UI.

## Pull Requests I reviewed for my partner
My comment:
Issue 1: Good README.md it's easy to understand, backend and frontend started succesfully, Boostrap in visible like others, no node-module and .env leak, great job so far. Let's go next kubb!
Issue 2:Looks good! API Health Check passed on both browser and Supertest, the error handling message is great, no white screen. Good job!
Issue 3: All Acceptance Criteria for Issue 3 are fully satisfied. Category model and migrations are correctly defined. But make sure You clean up the unused void prisma; and the leftover console.log("TODO: ...") in server/prisma/seed.ts before merging.

Target Branch Notice: Please change the base branch of this PR to merge into lab1-staging instead of main.
Issue 4: I pulled your branch to test on my local and ran all the setups. Everything works perfectly. The Prisma migrations and API endpoints are working smoothly, and the tests on Supertest and Vitest all passed. The display is not hard-code values and also loading state and error messege are nothing wrong! Nice one Kub!

Partner's response: 
Issue 1: Thanks, Ok kup
Issue 2: oh thank nam
Issue 3: 
Issue 4: Thanks for reviews <3