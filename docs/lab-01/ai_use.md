# Lab 1 — AI Use and Reflection  (fill this in)

**LLM/agent used:** Claude Opus 3.6 & Gemini 3.6 Flash 

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Setting up project foundation and branch structure by giving lab1 context and instructions, along with issue 1 acceptance criteria. | Initialized local environment, set up git branches, and verified the overall project structure. |
| 2 | Given issue 2 acceptance criteria, implementing `/api/health` endpoint and configuring CORS middleware in Express. | Implemented health check endpoint returning 200 OK and configured CORS to allow frontend requests. |
| 3 | Given issue 3 acceptance criteria, adding seeded categories to the PostgreSQL database using Prisma and ensuring seed persistence. | Configured Prisma schema, generated migrations, and ran `prisma db seed` to populate default categories. |
| 4 | Given issue 4 acceptance criteria, implementing `GET /api/categories` endpoint returning seeded categories sorted by ID ascending. | Implemented category list endpoint in Express and created integration test using Supertest. |
| 5 | Resolving git branch conflicts when re-creating `feature/4-category-list` from updated `lab1-staging`. | Cleared stale local branch and checked out a clean feature branch off `lab1-staging`. |
| 6 | Updating `client/src/api.ts` and `App.tsx` to fetch status and categories, rendering loading/error/success states. | Integrated category state into React component and rendered dynamic list inside Bootstrap list-group. |


## Reflection
After trying out the agent included with Antigravity, I noticed that even with concise prompts, it tended to overreach its scope. For example, when instructed to review only Issue 1, it proactively worked ahead on multiple issues, which rapidly consumed my tokens. As a result, I switched to using a chatbot like Gemini and adapted my prompting approach to review strictly according to the acceptance criteria of one issue at a time. By prompting step-by-step, the AI performed significantly better and allowed me to closely follow every step of the execution process.
