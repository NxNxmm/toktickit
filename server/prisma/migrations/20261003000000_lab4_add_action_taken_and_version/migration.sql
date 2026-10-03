-- Lab 4: Add action_taken entity and ticket.version for optimistic concurrency
-- Non-destructive: all existing tickets, users, comments, attachments are preserved.

-- AlterEnum: add URGENT priority value (idempotent — already applied via 20260924 migration)
-- ALTER TYPE "RequestedPriority" ADD VALUE 'URGENT';

-- AlterTable ticket: add version column with default 1 for all existing rows
ALTER TABLE "ticket" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable ticket: add resolvedIndicated fields (idempotent guards)
ALTER TABLE "ticket" ADD COLUMN IF NOT EXISTS "resolvedIndicated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ticket" ADD COLUMN IF NOT EXISTS "resolvedIndicatedAt" TIMESTAMP(3);

-- AlterTable user: add requiresPasswordChange (idempotent guard)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable action_taken (IF NOT EXISTS — non-destructive, preserves any existing data)
CREATE TABLE IF NOT EXISTS "action_taken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "performedById" INTEGER NOT NULL,
    "actionDateTime" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" TEXT,
    "attachmentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_taken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "action_taken_ticketId_idx" ON "action_taken"("ticketId");
CREATE INDEX IF NOT EXISTS "action_taken_ticketId_actionDateTime_idx" ON "action_taken"("ticketId", "actionDateTime");
CREATE INDEX IF NOT EXISTS "action_taken_performedById_idx" ON "action_taken"("performedById");
CREATE INDEX IF NOT EXISTS "ticket_updatedAt_idx" ON "ticket"("updatedAt");

-- AddForeignKey (IF NOT EXISTS not supported directly — use DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'action_taken_ticketId_fkey'
    ) THEN
        ALTER TABLE "action_taken" ADD CONSTRAINT "action_taken_ticketId_fkey"
            FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'action_taken_performedById_fkey'
    ) THEN
        ALTER TABLE "action_taken" ADD CONSTRAINT "action_taken_performedById_fkey"
            FOREIGN KEY ("performedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
