# Lab 1 — Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | PASSED |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | PASSED |
| 3 | Vitest | Heading renders | PASSED |
| 4 | Vitest | Success state shows Online + category list | PASSED |
| 5 | Vitest | Error state shows Offline + message | PASSED |

Paste your passing terminal output / screenshot below.

### Server Tests Output (Supertest)

```text
> toktickit-server@1.0.0 test
> vitest run

 RUN  v2.1.9 C:/Year3/Semester 1/CPE334 Software Engineering/toktickit/server

 ✓ tests/lab-01/categories.test.ts (1)
 ✓ tests/lab-01/health.test.ts (1)

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  22:46:34
   Duration  2.59s (transform 80ms, setup 0ms, collect 2.91s, tests 79ms, environment 0ms, prepare 1.29s)
```
### Client Tests Output (Vitest)
```text
> toktickit-client@1.0.0 test
> vitest run

 RUN  v2.1.9 C:/Year3/Semester 1/CPE334 Software Engineering/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3)
   ✓ App (3)
     ✓ renders the TokTickIT heading
     ✓ shows Online and the seeded categories on success
     ✓ shows an Offline error message when the API is unavailable

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  23:16:52
   Duration  1.24s (transform 51ms, setup 105ms, collect 127ms, tests 75ms, environment 595ms, prepare 108ms)