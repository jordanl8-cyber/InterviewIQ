'use client';
import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { CATEGORY_LABELS } from '@/lib/constants';
import { useRecorder } from '@/hooks/useRecorder';
import { useTTS } from '@/hooks/useTTS';
import VoiceMark from '@/components/VoiceMark';
import styles from './page.module.css';

const CodingWorkspace = dynamic(() => import('@/components/CodingWorkspace'), {
  loading: () => <div className={styles.loading}>Opening code editor…</div>,
});

interface MessageItem {
  role: 'interviewer' | 'candidate';
  content: string;
}

/** Detect whether a message contains a fenced code block or looks like code */
function containsCode(text: string): boolean {
  if (/```/.test(text)) return true;
  const lines = text.split('\n');
  if (lines.length >= 3) {
    const indented = lines.filter((l) => /^[ \t]{2,}/.test(l));
    if (indented.length >= 2) return true;
  }
  return false;
}

/** Render message content, formatting code blocks with syntax highlighting */
function renderContent(text: string) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  if (parts.length === 1 && !text.startsWith('```')) {
    if (containsCode(text)) {
      return <pre className={styles.codeBlock}><code>{text}</code></pre>;
    }
    return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const inner = part.slice(3, -3);
          const newlineIdx = inner.indexOf('\n');
          const code = newlineIdx >= 0 ? inner.slice(newlineIdx + 1) : inner;
          return (
            <pre key={i} className={styles.codeBlock}>
              <code>{code}</code>
            </pre>
          );
        }
        if (!part.trim()) return null;
        return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
      })}
    </>
  );
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<{
    interviewType: string;
    difficulty: string;
    role: string;
    phase: string;
    questionCategory?: string;
    questionCount: number;
    maxQuestions: number;
  } | null>(null);
  const [initError, setInitError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { isRecording, startRecording, stopRecording, error: micError } = useRecorder();
  const { enabled: ttsEnabled, isSpeaking, toggle: toggleTTS, speak } = useTTS();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [reportError, setReportError] = useState(false);
  const prepareReport = useCallback(async () => {
    setReportError(false);
    try {
      const res = await fetch(`/api/sessions/${id}/end`, { method: 'POST' });
      if (!res.ok) throw new Error();
      setReportReady(true);
    } catch {
      setReportError(true);
    }
  }, [id]);

  // Fetch session on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${id}`);
        if (!res.ok) throw new Error('Session not found');
        const data = await res.json();
        setMessages(data.messages.map((m: MessageItem) => ({ role: m.role, content: m.content })));
        setSessionMeta({
          interviewType: data.interviewType,
          difficulty: data.difficulty,
          role: data.role,
          phase: data.phase,
          questionCategory: data.questionCategory,
          questionCount: data.questionCount,
          maxQuestions: data.maxQuestions,
        });
        if (data.status === 'completed') {
          setIsComplete(true);
          setReportReady(true);
        } else if (data.status === 'awaiting_report') {
          setIsComplete(true);
          void prepareReport();
        }
      } catch {
        setInitError('Session not found. It may have expired.');
      }
    }
    fetchSession();
  }, [id, prepareReport]);

  // Speak new interviewer messages via TTS
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'interviewer') {
        speak(lastMsg.content, `msg-${messages.length - 1}`);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, speak]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const submitAnswer = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || isComplete || isEnding) return;
    setIsLoading(true);
    setSubmitError('');
    setMessages((prev) => [...prev, { role: 'candidate', content: text }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/sessions/${id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      // Parse JSON before checking abort so we consume the body
      const data = await res.json();

      if (controller.signal.aborted) return;

      // Surface API errors so the catch block shows a message to the user
      if (!res.ok) throw new Error(data.error || 'Failed to process answer');
      setInput('');

      if (data.isComplete) {
        // Show closing message from interviewer
        if (data.nextQuestion) {
          setMessages((prev) => [...prev, { role: 'interviewer', content: data.nextQuestion }]);
        }
        setIsComplete(true);
        // Trigger report generation — mark reportReady when done
        void prepareReport();
      } else if (data.nextQuestion) {
        setMessages((prev) => [...prev, { role: 'interviewer', content: data.nextQuestion }]);
      }

      if (sessionMeta) {
        setSessionMeta({ ...sessionMeta, phase: data.phase, questionCount: data.questionNumber ?? sessionMeta.questionCount });
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setMessages((prev) => prev.slice(0, -1));
      setSubmitError('Couldn’t submit your answer. Your draft is ready to retry.');
    }
    abortRef.current = null;
    setIsLoading(false);
  }, [id, isLoading, isComplete, isEnding, sessionMeta, prepareReport]);

  const handleVoice = async () => {
    if (isRecording) {
      setIsTranscribing(true);
      try {
        const blob = await stopRecording();
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        formData.append('sessionId', id);

        const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
        const { text } = await res.json();
        setIsTranscribing(false);

        if (text) {
          setInput((prev) => (prev ? prev + '\n' + text : text));
        }
      } catch {
        setIsTranscribing(false);
      }
    } else {
      await startRecording();
    }
  };

  const handleEndEarly = async () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    setIsEnding(true);
    setIsLoading(false);

    try {
      const res = await fetch(`/api/sessions/${id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ earlyExit: true }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIsComplete(true);
      if (data.report) {
        router.push(`/report/${id}`);
      } else {
        router.push('/new');
      }
    } catch {
      setSubmitError('Couldn’t finish the report. Your interview is saved. Try ending it again.');
    }
    setIsEnding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submitAnswer(input);
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = input.substring(0, start) + '  ' + input.substring(end);
      setInput(newValue);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
      return;
    }
  };

  if (initError) {
    return (
      <div className={styles.loading}>
        <div>
          <p>{initError}</p>
          <button className={styles.sendButton} onClick={() => router.push('/new')} style={{ marginTop: '1rem' }}>
            Start new session
          </button>
        </div>
      </div>
    );
  }

  if (!sessionMeta) {
    return <div className={styles.loading}>Loading session...</div>;
  }

  const progressPct = Math.max(0, Math.min(100, (sessionMeta.questionCount / sessionMeta.maxQuestions) * 100));
  const interviewControls = <>
    <button className="secondaryButton" aria-pressed={ttsEnabled} onClick={toggleTTS}>Voice {ttsEnabled ? 'on' : 'off'}</button>
    <button className={styles.end} onClick={handleEndEarly} disabled={isEnding}>{isEnding ? 'Ending…' : 'End interview'}</button>
  </>;
  const recordButton = <button
    className={`${styles.micButton} ${isRecording ? styles.micRecording : ''}`}
    onClick={handleVoice} disabled={isLoading || isTranscribing || isEnding || isSpeaking}
    aria-pressed={isRecording}>
    {isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing…' : 'Record answer'}
  </button>;

  if (!isComplete && sessionMeta.interviewType === 'swe' && ['coding_problem', 'follow_up'].includes(sessionMeta.phase)) {
    const questions = messages.filter(message => message.role === 'interviewer');
    return <CodingWorkspace key={id} prompt={questions[0]?.content ?? ''}
      followUp={questions.length > 1 ? questions[questions.length - 1].content : undefined}
      role={sessionMeta.role} category={CATEGORY_LABELS[sessionMeta.questionCategory ?? '']}
      difficulty={sessionMeta.difficulty} question={Math.min(sessionMeta.questionCount + 1, sessionMeta.maxQuestions)}
      total={sessionMeta.maxQuestions} controls={interviewControls} voiceControl={recordButton}
      notes={input} setNotes={setInput} busy={isLoading || isRecording || isTranscribing || isEnding}
      loading={isLoading} error={submitError || micError || ''} onSubmit={submitAnswer} />;
  }

  return (
    <main className={styles.container}>
      <aside className={styles.sidebar} aria-label="Interview details">
        <h1>Mock interview</h1>
        <p className={styles.role}>{sessionMeta.role}</p>
        <div className={styles.progressText}>Question {sessionMeta.questionCount} of {sessionMeta.maxQuestions}</div>
        <div className={styles.progressBar}><div style={{ width: `${progressPct}%` }} /></div>
        <dl className={styles.meta}>
          <div><dt>Interview type</dt><dd>{sessionMeta.interviewType === 'swe' ? 'Engineering' : sessionMeta.interviewType}</dd></div>
          <div><dt>Difficulty</dt><dd>{sessionMeta.difficulty}</dd></div>
        </dl>
        {!isComplete && <div className={styles.controls}>
          {interviewControls}
        </div>}
      </aside>
      <section className={styles.conversation} aria-label="Interview conversation">
        <div className={styles.messages} role="log" aria-label="Interview transcript">
          {messages.map((msg, i) =>
            msg.role === 'interviewer' ? (
              <div key={i} className={styles.interviewerWrapper}>
                <div className={styles.speaker}><VoiceMark />Interviewer</div>
                <div className={`${styles.message} ${styles.interviewer}`}>
                  {renderContent(msg.content)}
                </div>
              </div>
            ) : (
              <div key={i} className={`${styles.message} ${styles.candidate}`}>
                <div className={styles.you}>You</div>
                {renderContent(msg.content)}
              </div>
            )
          )}

          {/* Thinking indicator */}
          {!isComplete && !isEnding && (isLoading || isTranscribing) && (
            <div className={styles.interviewerWrapper}>
              <div className={styles.speaker}><VoiceMark />Interviewer</div>
              <div className={`${styles.message} ${styles.thinking}`}>
                {isTranscribing ? 'Transcribing...' : 'Thinking...'}
              </div>
            </div>
          )}

          {/* Speaking indicator */}
          {isSpeaking && (
            <div className={styles.interviewerWrapper}>
              <div className={styles.speaker}><VoiceMark />Interviewer speaking</div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {isComplete ? (
          <div className={styles.completeBanner}>
            <p>Interview complete</p>
            {reportReady ? (
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href={`/report/${id}`} className={styles.reportLink}>
                  View report
                </a>
                <a href="/progress" className={styles.reportLink} style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  Progress
                </a>
                <a href="/new?reset=1" className={styles.reportLink} style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  Reset practice
                </a>
              </div>
            ) : reportError ? (
              <button className={styles.reportLink} onClick={prepareReport}>Retry report</button>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                Preparing your report…
              </p>
            )}
          </div>
        ) : (
          <div className={styles.composer}>
            <div className={styles.answerHeader}><label htmlFor="answer">Your answer</label><small>⌘ / Ctrl + Enter to send</small></div>
            <div className={styles.inputArea}>
              <textarea
                id="answer"
                ref={textareaRef}
                className={styles.textArea}
                placeholder={isRecording ? 'Recording your answer…' : 'Type your response here…'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading || isRecording || isTranscribing || isEnding || isSpeaking}
                rows={1}
              />
              <div className={styles.inputControls}>
                {recordButton}
                <button
                  className={styles.sendButton}
                  onClick={() => submitAnswer(input)}
                  disabled={isLoading || isRecording || isTranscribing || isEnding || isSpeaking || !input.trim()}
                >
                  Send answer
                </button>
              </div>
            </div>
            {micError && <p role="alert">{micError}</p>}
            {submitError && <p role="alert">{submitError}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
