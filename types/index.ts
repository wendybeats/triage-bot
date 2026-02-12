export type SourceType = 'slack' | 'gmail' | 'figma' | 'notion' | 'voice';
export type TierType = 'tier_1' | 'tier_2' | 'low_priority';
export type EffortType = 'small' | 'medium' | 'large';
export type StatusType = 'new' | 'in_progress' | 'done' | 'deferred';
export type OkrType = 'subscriptions' | 'retention' | 'neither';
export type StatusSuggestionType = 'done' | 'deferred' | 'escalated';

export interface ThreadMessage {
  text: string;
  sender: string;
  timestamp: string;
  link?: string;
}

export interface PriorityHistoryEntry {
  score: number;
  timestamp: string;
  reason: string;
}

export interface DigestItem {
  id: string;
  thread_id: string | null;
  source: SourceType;
  initial_message: string;
  thread_history: ThreadMessage[];
  current_summary: string | null;
  sender: string;
  link: string | null;
  tier: TierType;
  impact_score: number;
  okr_alignment: OkrType;
  effort: EffortType;
  ai_reasoning: string | null;
  status: StatusType;
  status_suggestion: StatusSuggestionType | null;
  resolution_detected: boolean;
  priority_history: PriorityHistoryEntry[];
  escalation_count: number;
  created_at: string;
  last_updated: string;
  archived_at: string | null;
}

export interface ScoringResult {
  impact_score: number;
  effort: EffortType;
  tier: TierType;
  okr_alignment: OkrType;
  status_suggestion: StatusSuggestionType | null;
  resolution_detected: boolean;
  reasoning: string;
  escalation_detected?: boolean;
}

export interface CreateDigestRequest {
  source: SourceType;
  thread_id?: string;
  message: string;
  sender: string;
  link?: string;
  timestamp: string;
}

export interface DigestFilters {
  status?: StatusType;
  tier?: TierType;
  source?: SourceType;
  limit?: number;
  offset?: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
  timestamp: string;
}
