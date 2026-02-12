-- Triage Digest Schema

CREATE TYPE source_type AS ENUM ('slack', 'gmail', 'figma', 'notion', 'voice');
CREATE TYPE tier_type AS ENUM ('tier_1', 'tier_2', 'low_priority');
CREATE TYPE effort_type AS ENUM ('small', 'medium', 'large');
CREATE TYPE status_type AS ENUM ('new', 'in_progress', 'done', 'deferred');
CREATE TYPE okr_type AS ENUM ('subscriptions', 'retention', 'neither');
CREATE TYPE status_suggestion_type AS ENUM ('done', 'deferred', 'escalated');

CREATE TABLE digest_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Thread tracking
  thread_id TEXT,
  source source_type NOT NULL,

  -- Content
  initial_message TEXT NOT NULL,
  thread_history JSONB DEFAULT '[]'::jsonb,
  current_summary TEXT,

  -- Metadata
  sender TEXT NOT NULL,
  link TEXT,

  -- Scoring
  tier tier_type NOT NULL,
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
  okr_alignment okr_type NOT NULL,
  effort effort_type NOT NULL,
  ai_reasoning TEXT,

  -- Status
  status status_type DEFAULT 'new',
  status_suggestion status_suggestion_type,
  resolution_detected BOOLEAN DEFAULT false,

  -- Priority tracking
  priority_history JSONB DEFAULT '[]'::jsonb,
  escalation_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_thread_per_source UNIQUE (thread_id, source)
);

CREATE INDEX idx_digest_items_status ON digest_items(status);
CREATE INDEX idx_digest_items_created_at ON digest_items(created_at DESC);
CREATE INDEX idx_digest_items_thread_id ON digest_items(thread_id);
CREATE INDEX idx_digest_items_archived ON digest_items(archived_at) WHERE archived_at IS NOT NULL;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE digest_items;
