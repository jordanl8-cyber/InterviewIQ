import { currentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { createChatCompletion } from '@/lib/openai';
import { reportPrompt } from '@/lib/prompts';
import { getWeaknessProfile, storeWeaknessProfile, storeSessionReport, storeCategoryRecord } from '@/lib/adaptation';
import { SessionReport, SkillScore, CategoryRecord } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 });
    const { id } = await params;
    const session = store.getSession(user.id, id);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Don't re-generate if already completed
    const existingReport = store.getReport(user.id, id);
    if (existingReport) return NextResponse.json({ report: existingReport });

    // Detect early exit — user clicked End Session before interview concluded naturally
    let earlyExit = false;
    try {
      const body = await req.json();
      earlyExit = session.status === 'active' && body.earlyExit === true;
    } catch {
      // No body or invalid JSON — treat as normal end
    }


    // Collect all skill scores from candidate messages
    const allScores: SkillScore[] = session.messages
      .filter((m) => m.skillScores)
      .flatMap((m) => m.skillScores!);

    const response = await createChatCompletion({
      messages: [{ role: 'user', content: reportPrompt(session.config, session.messages, allScores, session.config.categoryHistory) }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const reportData = JSON.parse(response.choices[0].message.content!);
    const report: SessionReport = {
      sessionId: session.id,
      userName: session.config.userName,
      role: session.config.role,
      interviewType: session.config.interviewType,
      questionCategory: session.config.questionCategory,
      overallScore: reportData.overallScore,
      skillScores: reportData.skillScores || [],
      strengths: reportData.strengths || [],
      weaknesses: reportData.weaknesses || [],
      drills: reportData.drills || [],
      summary: reportData.summary || '',
      createdAt: Date.now(),
    };

    let record: CategoryRecord | undefined;
    if (!earlyExit && session.config.questionCategory) {
      const history = store.getCategoryHistory(user.id);
      const previous = history.filter(item => item.category === session.config.questionCategory).pop();
      record = {
        category: session.config.questionCategory, score: report.overallScore,
        completed: report.overallScore >= 7.5, interviewNumber: history.length + 1,
        strengths: report.strengths, mistakes: report.weaknesses, weaknesses: report.weaknesses,
        timestamp: report.createdAt, improvementDelta: previous ? report.overallScore - previous.score : undefined,
      };
    }
    if (!store.finish(user.id, session, report, record)) {
      const saved = store.getReport(user.id, id);
      if (saved) return NextResponse.json({ report: saved });
      return NextResponse.json({ error: 'Interview changed. Try again.' }, { status: 409 });
    }

    if (process.env.SUPERMEMORY_API_KEY) {
      const questions = session.messages.filter(m => m.role === 'interviewer').map(m => m.content);
      await storeSessionReport(user.id, JSON.stringify({ ...report, questions }));
      if (record) {
        await storeCategoryRecord(user.id, record);
        const profile = await getWeaknessProfile(user.id);
        if (profile) await storeWeaknessProfile(user.id, profile);
      }
    }
    return NextResponse.json({ report });
  } catch (err) {
    console.error('End session failed:', err);
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
  }
}
