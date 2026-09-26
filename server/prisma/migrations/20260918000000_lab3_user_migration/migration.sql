-- ============================================================
-- Lab 3 Migration: User Model, Auth Foundation, Ticket Fields,
-- PublicComment, InternalNote, Session
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Step 1: Create the Role enum and the User table
-- ────────────────────────────────────────────────────────────
CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMIN');

CREATE TABLE "user" (
    "id"                      SERIAL NOT NULL,
    "name"                    TEXT NOT NULL,
    "email"                   TEXT NOT NULL,
    "isActive"                BOOLEAN NOT NULL DEFAULT true,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,
    "role"                    "UserRole" NOT NULL,
    "passwordHash"            TEXT NOT NULL,
    "requiresPasswordChange"  BOOLEAN NOT NULL DEFAULT false,
    "failedLoginAttempts"     INTEGER NOT NULL DEFAULT 0,
    "lastFailedLoginAt"       TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_isActive_idx" ON "user"("isActive");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- ────────────────────────────────────────────────────────────
-- Step 2: Create Session table
-- ────────────────────────────────────────────────────────────
CREATE TABLE "session" (
    "id"        SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId"    INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_tokenHash_key" ON "session"("tokenHash");

-- CreateIndex
CREATE INDEX "session_expiresAt_idx" ON "session"("expiresAt");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- ────────────────────────────────────────────────────────────
-- Step 3: Create PublicComment table
-- ────────────────────────────────────────────────────────────
CREATE TABLE "public_comment" (
    "id"        SERIAL NOT NULL,
    "ticketId"  INTEGER NOT NULL,
    "authorId"  INTEGER NOT NULL,
    "content"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "public_comment_ticketId_createdAt_idx" ON "public_comment"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "public_comment_ticketId_idx" ON "public_comment"("ticketId");

-- ────────────────────────────────────────────────────────────
-- Step 4: Create InternalNote table
-- ────────────────────────────────────────────────────────────
CREATE TABLE "internal_note" (
    "id"        SERIAL NOT NULL,
    "ticketId"  INTEGER NOT NULL,
    "authorId"  INTEGER NOT NULL,
    "content"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "internal_note_ticketId_createdAt_idx" ON "internal_note"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "internal_note_ticketId_idx" ON "internal_note"("ticketId");

-- ────────────────────────────────────────────────────────────
-- Step 5: Migrate Lab 2 RequesterUser records into User
-- Each Lab 2 development requester becomes a real REQUESTER
-- user with a known development password hash (Password123!)
-- bcrypt hash of 'Password123!' with 10 rounds:
-- $2b$10$CwTycUXWue0Thq9StjUM0uJ8/xDtMaBntxJEULTTMm4rSkgLlkl2W
-- ────────────────────────────────────────────────────────────
INSERT INTO "user" ("email", "passwordHash", "name", "role", "isActive", "requiresPasswordChange", "createdAt", "updatedAt")
SELECT
    ru."email",
    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8/xDtMaBntxJEULTTMm4rSkgLlkl2W',
    ru."name",
    'REQUESTER'::"UserRole",
    ru."isActive",
    false,
    ru."createdAt",
    COALESCE(ru."updatedAt", ru."createdAt")
FROM "RequesterUser" ru
ON CONFLICT ("email") DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Step 6: Re-point tickets to the new User table
-- ────────────────────────────────────────────────────────────
ALTER TABLE "ticket" ADD COLUMN "submittedById" INTEGER;

UPDATE "ticket" t
SET "submittedById" = u."id"
FROM "RequesterUser" ru
JOIN "user" u ON u."email" = ru."email"
WHERE t."requesterId" = ru."id";

ALTER TABLE "ticket" ALTER COLUMN "submittedById" SET NOT NULL;
ALTER TABLE "ticket" DROP CONSTRAINT "ticket_requesterId_fkey";
ALTER TABLE "ticket" DROP COLUMN "requesterId";

-- ────────────────────────────────────────────────────────────
-- Step 7: Add optional owner to Ticket
-- ────────────────────────────────────────────────────────────
ALTER TABLE "ticket" ADD COLUMN "ownerId" INTEGER;

-- CreateIndex
CREATE INDEX "ticket_ownerId_idx" ON "ticket"("ownerId");

-- CreateIndex
CREATE INDEX "ticket_submittedById_idx" ON "ticket"("submittedById");

-- CreateIndex
CREATE INDEX "ticket_submittedById_ticketDate_idx" ON "ticket"("submittedById", "ticketDate");

-- ────────────────────────────────────────────────────────────
-- Step 8: Add foreign keys
-- ────────────────────────────────────────────────────────────
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public_comment" ADD CONSTRAINT "public_comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public_comment" ADD CONSTRAINT "public_comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "internal_note" ADD CONSTRAINT "internal_note_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "internal_note" ADD CONSTRAINT "internal_note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ticket" ADD CONSTRAINT "ticket_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ticket" ADD CONSTRAINT "ticket_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;