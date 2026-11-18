import { currentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 });
  const { id } = await params;
  const session = store.getSession(user.id, id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    interviewType: session.config.interviewType,
    difficulty: session.config.difficulty,
    role: session.config.role,
    questionCategory: session.config.questionCategory,
    company: session.config.company,
    messages: session.messages,
    questionCount: session.candidateMessageCount || 0,
    maxQuestions: session.maxQuestions,
    phase: session.phase,
    status: session.status,
  });
}
