-- ============================================================
-- Lab 3 Issue 4 Migration: Add resolvedIndicated fields to ticket
-- Supports AC-4.3: "Problem Appears Resolved" indication
-- ============================================================

-- Add resolvedIndicated flag (defaults false — existing tickets unaffected)
ALTER TABLE "ticket" ADD COLUMN "resolvedIndicated" BOOLEAN NOT NULL DEFAULT false;

-- Add resolvedIndicatedAt timestamp (nullable — null until first indication)
ALTER TABLE "ticket" ADD COLUMN "resolvedIndicatedAt" TIMESTAMP(3);
