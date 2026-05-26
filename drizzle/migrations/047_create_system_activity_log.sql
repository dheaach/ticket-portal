-- System audit log (users, login, settings catalog).
-- Run: psql "$DATABASE_URL" -f drizzle/migrations/047_create_system_activity_log.sql

CREATE TABLE IF NOT EXISTS public.system_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role VARCHAR(32) NOT NULL DEFAULT 'agent',
  category VARCHAR(32) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64),
  entity_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_activity_log_category_created_at_idx
  ON public.system_activity_log (category, created_at DESC);

CREATE INDEX IF NOT EXISTS system_activity_log_entity_created_at_idx
  ON public.system_activity_log (entity_type, entity_id, created_at DESC);

COMMENT ON TABLE public.system_activity_log IS 'Append-only audit for user/auth/settings changes.';
