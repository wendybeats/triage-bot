import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/openai';
import { supabaseAdmin } from '@/lib/supabase';
import { scoreRequest } from '@/lib/openai';
import { formatError, validateSession } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    if (!validateSession(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe
    const transcription = await transcribeAudio(buffer, audioFile.name || 'recording.webm');

    // Score the transcription
    const scoring = await scoreRequest(transcription, []);

    // Create digest item
    const { data, error } = await supabaseAdmin
      .from('digest_items')
      .insert({
        source: 'voice',
        initial_message: transcription,
        thread_history: [],
        current_summary: scoring.reasoning,
        sender: 'Voice Note',
        tier: scoring.tier,
        impact_score: scoring.impact_score,
        okr_alignment: scoring.okr_alignment,
        effort: scoring.effort,
        ai_reasoning: scoring.reasoning,
        status_suggestion: scoring.status_suggestion,
        resolution_detected: scoring.resolution_detected,
        priority_history: [{
          score: scoring.impact_score,
          timestamp: new Date().toISOString(),
          reason: 'Initial scoring from voice note',
        }],
        escalation_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      transcription,
      item: data,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(formatError(error), { status: 500 });
  }
}
