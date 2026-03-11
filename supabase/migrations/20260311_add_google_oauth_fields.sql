-- Migration: Add Google OAuth fields to gre_agents table
-- Created: 2026-03-11
-- Description: Adds google_oauth_enabled flag and google_tokens storage for OAuth integration

-- Add google_oauth_enabled column (default false for security)
ALTER TABLE gre_agents
ADD COLUMN IF NOT EXISTS google_oauth_enabled BOOLEAN DEFAULT false;

-- Add google_tokens column to store OAuth tokens (access_token, refresh_token, etc.)
ALTER TABLE gre_agents
ADD COLUMN IF NOT EXISTS google_tokens JSONB DEFAULT NULL;

-- Add comment to columns for documentation
COMMENT ON COLUMN gre_agents.google_oauth_enabled IS 'Flag to enable/disable Google OAuth login for this agent. Must be explicitly enabled by admin.';
COMMENT ON COLUMN gre_agents.google_tokens IS 'Stores Google OAuth tokens (access_token, refresh_token, expiry_date) for Gmail and Calendar integration.';

-- Create index on google_oauth_enabled for faster queries
CREATE INDEX IF NOT EXISTS idx_gre_agents_google_oauth_enabled
ON gre_agents(google_oauth_enabled)
WHERE google_oauth_enabled = true;

-- Security note: Only admins should be able to modify google_oauth_enabled
-- This can be enforced via RLS policies if needed
