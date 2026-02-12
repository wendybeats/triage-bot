import OpenAI from 'openai';
import { ScoringResult, ThreadMessage } from '@/types';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });
}

function buildScoringPrompt(
  initialMessage: string,
  threadHistory: ThreadMessage[]
): string {
  return `You are evaluating a work request for priority.

INITIAL REQUEST: "${initialMessage}"

${threadHistory.length > 0 ? `
THREAD UPDATES (chronological):
${threadHistory.map((m, i) => `${i + 1}. [${m.timestamp}] ${m.sender}: "${m.text}"`).join('\n')}
` : ''}

CURRENT OKRs:
1. Increase Subscriptions - Actions that drive users to upgrade (paywalls, feature gates, pricing pages)
2. Boost Retention - Features that keep users engaged (core workflows, habit formation, value delivery)

PRIORITY PEOPLE (Tier 1):
- Matt Taretsky, Matt Robinson, Kieran, Dan, Marcus

SECONDARY PEOPLE (Tier 2):
- Alex, T, Karina

ANALYZE THE FULL CONTEXT and provide:

1. **Impact Score (1-10):** Does this move our OKRs? Consider:
   - Direct impact on subscriptions or retention
   - Escalations from leadership
   - Urgency signals ("ASAP", "blocking", "CEO wants")
   - De-escalations ("pushed back", "no rush", "blocked on")

2. **Effort (S/M/L):** Estimated work required

3. **Tier:**
   - tier_1 if from priority people
   - tier_2 if from secondary people or contains keywords (design, UX, research)
   - low_priority otherwise

4. **OKR Alignment:** subscriptions, retention, or neither

5. **Status Suggestion (optional):**
   - "done" if thread shows resolution ("fixed", "handled", "resolved")
   - "deferred" if blocked or deprioritized ("waiting on", "pushed to next month")
   - null if still active

6. **Reasoning:** Why did you score it this way? Mention escalations/de-escalations.

Return ONLY valid JSON (no markdown):
{
  "impact_score": 8,
  "effort": "medium",
  "tier": "tier_1",
  "okr_alignment": "subscriptions",
  "status_suggestion": null,
  "resolution_detected": false,
  "reasoning": "explanation here"
}`;
}

export async function scoreRequest(
  initialMessage: string,
  threadHistory: ThreadMessage[],
  currentScore?: number
): Promise<ScoringResult> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a priority scoring assistant. Return only valid JSON.' },
        { role: 'user', content: buildScoringPrompt(initialMessage, threadHistory) },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty response from OpenAI');

    const result: ScoringResult = JSON.parse(content);

    // Track priority changes (escalation/de-escalation)
    if (currentScore !== undefined && result.impact_score !== currentScore) {
      result.escalation_detected = result.impact_score > currentScore;
    }

    return result;
  } catch (error) {
    console.error('OpenAI scoring failed, using defaults:', error);
    // Default fallback scoring
    return {
      impact_score: 5,
      effort: 'medium',
      tier: 'tier_2',
      okr_alignment: 'neither',
      status_suggestion: null,
      resolution_detected: false,
      reasoning: 'Auto-scored: AI scoring temporarily unavailable.',
    };
  }
}

export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' });
  const file = new File([blob], filename, { type: 'audio/webm' });

  const response = await getOpenAI().audio.transcriptions.create({
    model: 'whisper-1',
    file,
  });

  return response.text;
}
