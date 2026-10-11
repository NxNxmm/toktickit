# TokTickIT — IT Service Desk Application

TokTickIT is a full-stack IT service desk web application built across four lab sprints as part of CPE334 Software Engineering. It supports ticket creation, file attachments, public comments, internal staff notes, administrator user management, Actions Taken work-logging, ticket status lifecycle workflows, and role-specific operational dashboards.

---

## Table of Contents

- [Technical Stack](#technical-stack)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Running the Application](#running-the-application)
- [Database Seeding](#database-seeding)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Sprint Summaries](#sprint-summaries)
- [Seeded Demo Accounts](#seeded-demo-accounts)

---

## Technical Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Bootstrap |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL 15+ |
| **ORM** | Prisma ORM |
| **Unit / Integration Tests** | Vitest, Supertest |
| **E2E Tests** | Playwright (Chromium) |

---

## Prerequisites

Before running the project, ensure the following are installed:

- **Node.js** v18.x or higher (includes `npm`)
- **PostgreSQL** running locally on port `5432`
- **Google Chrome** — required by Playwright for E2E tests

---

## Initial Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd toktickit
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
```

Open `server/.env` and set your PostgreSQL credentials:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/toktickit?schema=public"
SESSION_SECRET="your-secret-key-here"
```

### 3. Install dependencies

From the **project root**:

```bash
npm install
```

Then install server dependencies:

```bash
cd server && npm install && cd ..
```

Then install client dependencies:

```bash
cd client && npm install && cd ..
```

### 4. Apply database migrations

```bash
cd server
npx prisma migrate deploy
```

### 5. Generate the Prisma client

```bash
npx prisma generate
```

---

## Running the Application

### Start both servers (development)

From the **project root**:

```bash
npm run dev
```

This starts:
- **Backend API** → `http://localhost:3000`
- **Frontend (Vite)** → `http://localhost:5173`

### Individual server scripts

| Command | Description |
|---|---|
| `npm run dev:server` | Start backend with hot-reload |
| `npm run dev:client` | Start frontend Vite dev server |
| `npm run build:server` | Compile backend TypeScript |
| `npm run build:client` | Build frontend for production |
| `npm run start:server` | Run compiled backend server |

---

## Database Seeding

Seed the database with realistic demo data covering all statuses, priorities, roles, and Actions Taken entries:

```bash
cd server
npm run seed
```

> The seed script is **idempotent** — safe to run multiple times. It will not create duplicate records.

See [Seeded Demo Accounts](#seeded-demo-accounts) for login credentials.

---

## Running Tests

### Backend integration tests (Vitest + Supertest)

```bash
cd server
npm test
```

Run only a specific lab's tests:

```bash
cd server
npm test -- tests/lab-04/
```

### Frontend component tests (Vitest + React Testing Library)

```bash
cd client
npm test
```

### End-to-End tests (Playwright)

Both dev servers must be running (or Playwright will start them automatically via `webServer` config):

```bash
# Run all E2E tests headlessly
npx playwright test

# Run a specific lab suite
npx playwright test e2e/lab-04/

# Open a visible browser window
npx playwright test --headed

# Generate and open an HTML report
npx playwright test --reporter=html
npx playwright show-report
```

### Full regression (all suites)

```bash
# From project root
npm test           # runs server + client tests
npx playwright test
```

### Responsive screenshots

Captures Desktop (1280 × 800), Tablet (768 × 1024), and Mobile (375 × 812) screenshots. Both dev servers must be running first.

```bash
node scripts/generate-screenshots.js
```

Screenshots are saved under `artifacts/lab-0X/screenshots/`.

---

## Project Structure

```
toktickit/
├── client/                  # React + TypeScript frontend (Vite)
│   ├── src/
│   │   ├── components/      # UI components (per feature)
│   │   ├── context/         # AuthContext, RequesterContext
│   │   └── api.ts           # Typed API client
│   └── tests/
│       ├── lab-01/          # Component tests — Lab 1
│       ├── lab-02/          # Component tests — Lab 2
│       ├── lab-03/          # Component tests — Lab 3
│       └── lab-04/          # Component tests — Lab 4
├── server/                  # Express + TypeScript backend
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth, role guard, error handler
│   │   └── lib/             # Prisma singleton, helpers
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── seed.ts          # Idempotent seed script
│   │   └── migrations/      # Applied migration history
│   └── tests/
│       ├── lab-01/          # API tests — Lab 1
│       ├── lab-02/          # API tests — Lab 2
│       ├── lab-03/          # API tests — Lab 3
│       └── lab-04/          # API tests — Lab 4
├── e2e/                     # Playwright end-to-end tests
│   ├── lab-02/
│   ├── lab-03/
│   └── lab-04/
├── docs/                    # Sprint specifications and docs
│   ├── lab-01/
│   ├── lab-02/
│   ├── lab-03/
│   └── lab-04/
├── artifacts/               # Screenshots and visual outputs
│   ├── lab-02/screenshots/
│   ├── lab-03/screenshots/
│   └── lab-04/screenshots/
├── scripts/                 # Utility scripts (screenshots, etc.)
├── playwright.config.ts
└── README.md
```

---

## Sprint Summaries

### Lab 1 — Ticket Categories & Foundation

- Defined the initial database schema: `Category`, `RelatedSystem`, `Ticket`, `Attachment`.
- Created the category seed data and basic ticket submission form.
- Established the project Git workflow (feature branches → `main`).

📄 Docs: [`docs/lab-01/`](docs/lab-01/)

---

### Lab 2 — My Tickets, Attachments & Responsive UI

- Introduced the **Requester** role with the "My Tickets" list view, filtered by ticket owner.
- Implemented file attachment upload (max 5 active per ticket) with soft-removal and reason recording.
- Added paginated ticket list with search, status/category/priority filters, and sort controls.
- Built responsive Zen Green UI across Desktop, Tablet, and Mobile viewports.
- Added Playwright E2E tests for the full requester ticket lifecycle.

📄 Docs: [`docs/lab-02/`](docs/lab-02/)  
🧪 Tests: `server/tests/lab-02/`, `client/tests/lab-02/`, `e2e/lab-02/`

---

### Lab 3 — Authentication, Staff Operations & Admin Management

- Replaced mock requester selection with full **session-based authentication** (bcrypt + HTTP-only cookies).
- Added mandatory **first-login password change** flow for new accounts.
- Implemented **IT Staff** ticket queue with claim/reassign ownership, IT priority override, and status transitions.
- Added **Public Comments** (all roles) and **Internal Notes** (staff/admin only) on ticket detail pages.
- Implemented **Requester advisory resolution** ("Problem Appears Resolved") that posts a comment without changing ticket status.
- Built **Administrator User Management** — create, update, deactivate/reactivate accounts with role controls.
- Added login lockout after repeated failures.

📄 Docs: [`docs/lab-03/`](docs/lab-03/)  
🧪 Tests: `server/tests/lab-03/`, `client/tests/lab-03/`, `e2e/lab-03/`

---

### Lab 4 — Actions Taken, Dashboards & Final Hardening

- Implemented the **Actions Taken** work-log aggregate: IT Staff can record Date/Time, Description, Result, Follow-Up Required, and Attachment Notes per ticket. Requesters have read-only visibility.
- Enforced the **Resolution Gate**: transitioning to `RESOLVED` or `CLOSED` requires at least one Action Taken record (`HTTP 422 RESOLUTION_REQUIRES_ACTION_TAKEN`).
- Added **optimistic concurrency control** (`version` field) on ticket status mutations, returning `HTTP 409 Conflict` on stale updates.
- Built **Requester Dashboard** — 4 personal metrics (`Total Open`, `Waiting for Me`, `Recently Updated`, `Recently Resolved`) with drill-down navigation and recent ticket list.
- Built **IT Staff Dashboard** — 5 operational metrics (`New`, `Open`, `In Progress`, `Waiting for Requester`, `My Assigned`) with quick-action shortcuts and recent ticket list.
- Built **Admin Dashboard** — inherits IT Staff metrics plus live user account statistics.
- Performed full-system regression, accessibility (keyboard focus rings, non-color status cues), and responsive layout hardening across 375 px / 768 px / 1280 px viewports.

📄 Docs: [`docs/lab-04/`](docs/lab-04/)  
🧪 Tests: `server/tests/lab-04/`, `client/tests/lab-04/`, `e2e/lab-04/`

---

## Seeded Demo Accounts

After running `npm run seed` in the `server/` directory, the following accounts are available.

**All accounts share the same development password: `Password123!`**

| Name | Email | Role | Active | Notes |
|---|---|---|---|---|
| System Admin | `admin@toktickit.kmutt.ac.th` | `ADMIN` | ✅ | No forced password change |
| Alex Turner | `alex.turner@toktickit.kmutt.ac.th` | `IT_STAFF` | ✅ | Has assigned tickets; first-login change required |
| Jessica Miller | `jessica.miller@toktickit.kmutt.ac.th` | `IT_STAFF` | ✅ | First-login password change required |
| Kevin Patel | `kevin.patel@toktickit.kmutt.ac.th` | `IT_STAFF` | ✅ | First-login password change required |
| Rachel Green | `rachel.green@toktickit.kmutt.ac.th` | `IT_STAFF` | ❌ | Inactive — used to verify BR-04 rejection |
| Jennifer Anderson | `jennifer.anderson@kmutt.ac.th` | `REQUESTER` | ✅ | Has multiple tickets across statuses |
| Michael Brown | `michael.brown@kmutt.ac.th` | `REQUESTER` | ✅ | Has open tickets |
| Sarah Johnson | `sarah.johnson@kmutt.ac.th` | `REQUESTER` | ✅ | Has seeded tickets |
| David Lee | `david.lee@kmutt.ac.th` | `REQUESTER` | ✅ | Has seeded tickets |
| Robert Taylor | `robert.taylor@kmutt.ac.th` | `REQUESTER` | ❌ | Inactive — used to verify 401 on inactive login |

> **Tip:** IT Staff accounts with `requiresPasswordChange = true` will be redirected to the mandatory password-change screen on first login. Change the password once to access the full application.

---

## License

This project is developed for academic purposes as part of CPE334 Software Engineering, Year 3 Semester 1.

