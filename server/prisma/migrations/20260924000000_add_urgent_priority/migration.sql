-- Add URGENT value to the RequestedPriority enum (AC-5.2 / spec Priority token).
-- Matches the Lab 3 design schema Priority enum { LOW, MEDIUM, HIGH, URGENT }.
ALTER TYPE "RequestedPriority" ADD VALUE IF NOT EXISTS 'URGENT';