import { currentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getOpenAI } from '@/lib/openai';
import { uploadInterviewAudio } from '@/lib/adaptation';

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 });
    const formData = await req.formData();
    const sessionId = String(formData.get('sessionId') || '');
    if (!store.getSession(user.id, sessionId)) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    const openai = getOpenAI();
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    // Upload audio to Supermemory via multimodal extractor (non-blocking).
    // Supermemory will extract structured insights from the audio for
    // future interview learning without storing raw transcripts.
    if (process.env.SUPERMEMORY_API_KEY) {
      const blob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type });
      uploadInterviewAudio(user.id, blob, sessionId).catch((err) => {
        console.error('Background audio upload failed (non-critical):', err);
      });
    }

    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    console.error('Transcription failed:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
