# TokTickIT - IT Service Desk Application

TokTickIT is an IT service desk application designed to manage Account and Access, Hardware, Software, and Network requests.

---

## Technical Stack

* **Frontend:** React, TypeScript, Vite, Bootstrap
* **Backend:** Node.js, Express, TypeScript
* **Database & ORM:** PostgreSQL, Prisma ORM
* **Testing:** Vitest, Supertest

---

## Prerequisites

Ensure you have the following installed on your local environment:
* **Node.js:** v18.x or higher
* **npm:** Package manager included with Node.js
* **PostgreSQL:** Service running locally on port `5432`

---

## Initial Setup Instructions

### 1. Repository Setup & Environment Variables
1. Clone the repository and navigate into the project root:
   ```bash
   git clone <repository-url>
   cd toktickit

Copy the environment configuration template in the server directory:
```
cp server/.env.example server/.env
```

Open server/.env and update your PostgreSQL credentials:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/toktickit?schema=public"
```
2. Install Dependencies
Install both frontend and backend dependencies:

npm install


Change directory to server and install server-specific dependencies:

cd server
npm install

Navigate back to the root directory:

cd ..


3. Database Initialization (Prisma)
Run the following command to generate the Prisma Client and push your schema to the database:

npx prisma generate
npx prisma db push

This command will create the necessary database tables based on your schema.prisma file.

## Running the Application

### Development Mode
Start both the backend server and frontend development server:

# Install server dependencies
cd server
npm install
cd ..

# Install frontend dependencies
npm install

# Start both servers
npm run dev

The application will be accessible at http://localhost:5173.

### Development Scripts

**Server-Side:**
- `npm run dev:server` or `cd server && npm run dev` - Starts the backend server with hot-reload
- `npm run build:server` - Builds the backend for production
- `npm run start:server` - Runs the compiled backend server

**Frontend-Side:**
- `npm run dev:client` or `npm run dev` - Starts the frontend development server
- `npm run build:client` - Builds the frontend for production
- `npm run start:client` - Runs the compiled frontend server (served via Node/Express)

**Automated Testing**
Run tests on both server and client packages to ensure everything passes before submitting/merging:

**Backend Tests (Supertest)**
`cd server`
`npm run test`

**Frontend Tests (Vitest)**
`cd client`
`npm run test`
