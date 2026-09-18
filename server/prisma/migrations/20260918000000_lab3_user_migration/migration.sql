-- ============================================================
-- Lab 3 Migration: User Model, Auth Foundation, Ticket Fields,
-- PublicComment, InternalNote
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Step 1: Create new enums
-- ────────────────────────────────────────────────────────────
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMIN');

-- Add new values to the existing TicketStatus enum
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'REOPENED';

-- ────────────────────────────────────────────────────────────
-- Step 2: Create User table
-- ────────────────────────────────────────────────────────────
CREATE TABLE "User" (
    "id"                     SERIAL NOT NULL,
    "email"                  TEXT NOT NULL,
    "passwordHash"           TEXT NOT NULL,
    "name"                   TEXT NOT NULL,
    "role"                   "Role" NOT NULL DEFAULT 'REQUESTER',
    "isActive"               BOOLEAN NOT NULL DEFAULT true,
    "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_isActive_idx" ON "User"("email", "isActive");
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- ────────────────────────────────────────────────────────────
-- Step 3: Migrate RequesterUser data into User
-- Each Lab 2 development requester becomes a real REQUESTER
-- user with a known development password hash (Password123!)
-- bcrypt hash of 'Password123!' with 10 rounds:
-- $2b$10$CwTycUXWue0Thq9StjUM0uJ8/xDtMaBntxJEULTTMm4rSkgLlkl2W
-- ────────────────────────────────────────────────────────────
INSERT INTO "User" ("email", "passwordHash", "name", "role", "isActive", "requiresPasswordChange", "createdAt", "updatedAt")
SELECT
    ru."email",
    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8/xDtMaBntxJEULTTMm4rSkgLlkl2W',
    ru."name",
    'REQUESTER'::"Role",
    ru."isActive",
    false,
    ru."createdAt",
    ru."updatedAt"
FROM "RequesterUser" ru
ON CONFLICT ("email") DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Step 4: Drop old FK on Ticket, update requesterId to point to User
-- ────────────────────────────────────────────────────────────
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_requesterId_fkey";

-- Re-point requesterId FK to the new User table
-- The IDs from RequesterUser are preserved via the INSERT above
-- because the User table starts from a new serial but we need to
-- map IDs. We use a separate approach: update requesterId values
-- by joining on email.

-- Temporarily allow null to remap
ALTER TABLE "Ticket" ADD COLUMN "requesterIdNew" INTEGER;

UPDATE "Ticket" t
SET "requesterIdNew" = u."id"
FROM "RequesterUser" ru
JOIN "User" u ON u."email" = ru."email"
WHERE t."requesterId" = ru."id";

-- Swap columns
ALTER TABLE "Ticket" DROP COLUMN "requesterId";
ALTER TABLE "Ticket" RENAME COLUMN "requesterIdNew" TO "requesterId";
ALTER TABLE "Ticket" ALTER COLUMN "requesterId" SET NOT NULL;

-- ────────────────────────────────────────────────────────────
-- Step 5: Add new Ticket fields
-- ────────────────────────────────────────────────────────────
ALTER TABLE "Ticket"
    ADD COLUMN IF NOT EXISTS "ownerId"             INTEGER,
    ADD COLUMN IF NOT EXISTS "resolvedIndicated"   BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "resolvedIndicatedAt" TIMESTAMP(3);

-- Make itPriority non-nullable with default MEDIUM
-- (was Priority? in Lab 2 - some rows may be NULL)
UPDATE "Ticket" SET "itPriority" = "requestedPriority" WHERE "itPriority" IS NULL;
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET NOT NULL;
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET DEFAULT 'MEDIUM';

-- ────────────────────────────────────────────────────────────
-- Step 6: Add new indexes on Ticket
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Ticket_ownerId_currentStatus_idx" ON "Ticket"("ownerId", "currentStatus");
CREATE INDEX IF NOT EXISTS "Ticket_currentStatus_itPriority_idx" ON "Ticket"("currentStatus", "itPriority");

-- ────────────────────────────────────────────────────────────
-- Step 7: Restore foreign keys on Ticket
-- ────────────────────────────────────────────────────────────
ALTER TABLE "Ticket"
    ADD CONSTRAINT "Ticket_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ticket"
    ADD CONSTRAINT "Ticket_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────
-- Step 8: Create PublicComment table
-- ────────────────────────────────────────────────────────────
CREATE TABLE "PublicComment" (
    "id"        SERIAL NOT NULL,
    "ticketId"  INTEGER NOT NULL,
    "authorId"  INTEGER NOT NULL,
    "content"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicComment_ticketId_createdAt_idx" ON "PublicComment"("ticketId", "createdAt");

ALTER TABLE "PublicComment"
    ADD CONSTRAINT "PublicComment_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicComment"
    ADD CONSTRAINT "PublicComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────
-- Step 9: Create InternalNote table
-- ────────────────────────────────────────────────────────────
CREATE TABLE "InternalNote" (
    "id"        SERIAL NOT NULL,
    "ticketId"  INTEGER NOT NULL,
    "authorId"  INTEGER NOT NULL,
    "content"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InternalNote_ticketId_createdAt_idx" ON "InternalNote"("ticketId", "createdAt");

ALTER TABLE "InternalNote"
    ADD CONSTRAINT "InternalNote_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalNote"
    ADD CONSTRAINT "InternalNote_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
