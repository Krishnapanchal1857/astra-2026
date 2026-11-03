-- Migration 001: Payment fixes
-- Safe to run multiple times (uses IF NOT EXISTS / DO NOTHING).
-- Run in Neon console SQL Editor or via psql.

-- Add failure_reason column to payment_batches if not present
ALTER TABLE payment_batches ADD COLUMN IF NOT EXISTS failure_reason text;

-- Auto-expire stale 'created' batches older than 30 minutes
-- (This is also done at runtime, but clean up existing stuck records)
UPDATE payment_batches 
  SET status='failed', failure_reason='expired_auto'
WHERE status='created' AND created_at < now() - interval '30 minutes';
