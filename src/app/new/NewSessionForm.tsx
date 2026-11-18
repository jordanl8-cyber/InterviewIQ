'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MAX_QUESTIONS } from '@/lib/constants';
import styles from './page.module.css';

type Job = { role: string; company?: string; jobDescription: string };
export default function NewSessionForm({ userName, job, reset }: { userName: string; job: Job | null; reset: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState(job?.role || '');
  const [company, setCompany] = useState(job?.company || '');
  const [jobDescription, setJobDescription] = useState(job?.jobDescription || '');
  const locked = !!job && !reset;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createSession = async (r: string, c: string, jd: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: r,
          company: c || undefined,
          jobDescription: jd,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create session');
      }

      const data = await res.json();
      router.push(`/session/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  // Auto-submit when job context is locked (Next Interview flow)
  // Skip the form entirely — go straight to interview
  const autoSubmitDone = useRef(false);
  useEffect(() => {
    if (locked && userName && role && jobDescription && !autoSubmitDone.current) {
      autoSubmitDone.current = true;
      createSession(role.trim(), company.trim(), jobDescription.trim());
    }
  }, [locked, userName, role, jobDescription]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!role.trim() || !jobDescription.trim()) return;
    await createSession(role.trim(), company.trim(), jobDescription.trim());
  };

  if (reset) {
    return <main className={styles.status}><h1 className={styles.title}>Reset practice?</h1>
      <p className={styles.subtitle}>This deletes all interviews, reports, and progress for {userName}.</p>
      <div style={{display:'flex', gap:12, marginTop:24}}><a href="/history" className="secondaryButton">Keep my interviews</a>
        <button className="primaryButton" disabled={loading} onClick={async () => {
          setLoading(true);
          try {
            const response = await fetch('/api/reset', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({confirm:true})});
            if (!response.ok) throw new Error();
            window.location.replace('/new');
          } catch { setError('Reset failed. Try again.'); setLoading(false); }
        }}>Delete practice history</button></div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </main>;
  }
  // If locked, show a loading/error state (auto-submit is in progress)
  if (locked) {
    return (
      <main className={styles.status}>
        <h1 className={styles.title}>{error ? 'Interview setup' : 'Preparing your interview'}</h1>
        <p className={styles.subtitle}>Using your saved job description for {role}</p>
        {error && (
          <div style={{ marginTop: '1rem' }}>
            <p className={styles.error}>{error}</p>
            <button className="primaryButton" onClick={() => createSession(role.trim(), company.trim(), jobDescription.trim())} disabled={loading}>
              {loading ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <header className={styles.intro}>
        <h1 className={styles.title}>Set up your interview</h1>
        <p className={styles.subtitle}>Choose the role you want to practice for. Your interviewer will draw questions from the job description.</p>
        <dl className={styles.brief}>
          <div><dt>Candidate</dt><dd>{userName}</dd></div>
          <div><dt>Session length</dt><dd>{MAX_QUESTIONS} questions</dd></div>
          <div><dt>Answer format</dt><dd>Voice or text</dd></div>
        </dl>
      </header>
      <form className={styles.form} onSubmit={event => { event.preventDefault(); handleSubmit(); }}>
        <div className={styles.field}>
          <label htmlFor="role">Job title</label>
          <input id="role" autoComplete="organization-title" required placeholder="Software engineer" value={role} onChange={e => setRole(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="company">Company <span>(optional)</span></label>
          <input id="company" autoComplete="organization" placeholder="Company name" value={company} onChange={e => setCompany(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="description">Job description</label>
          <textarea id="description" required rows={6} placeholder="Paste the responsibilities and qualifications from the listing" value={jobDescription} onChange={e => setJobDescription(e.target.value)} />
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className="primaryButton" disabled={loading || !role.trim() || !jobDescription.trim()}>
          {loading ? 'Preparing questions…' : 'Start interview'}
        </button>
      </form>
    </main>
  );
}
