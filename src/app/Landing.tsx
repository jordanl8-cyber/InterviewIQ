'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import VoiceMark from '@/components/VoiceMark';
import { MAX_QUESTIONS } from '@/lib/constants';
import styles from './page.module.css';

const samples = [
  { topic: 'Behavioral', question: 'Tell me about a time you changed your mind at work.' },
  { topic: 'Product sense', question: 'How would you measure the success of a new search feature?' },
  { topic: 'Engineering', question: 'How would you keep a slow service from delaying every request?' },
];
const features = [
  ['Role-specific questions', 'Paste a job description to practice questions about the work you would actually do.'],
  ['Adaptive practice', 'Revisit a category when it needs work. Move on when your score clears the threshold.'],
  ['Session reports', 'Review your strengths, skill scores, and targeted drills after each interview.'],
  ['Voice or text', 'Hear the interviewer read a question, then record your answer or type it out.'],
];
const services = [
  ['OpenAI', 'Interview questions, transcription, and feedback'],
  ['Supermemory', 'Context from past interviews'],
  ['ElevenLabs', 'Optional spoken questions'],
];

// A static speech illustration on the sample card. It does not represent a live recording.
const waveform = [4,3,6,5,10,8,16,12,26,31,18,42,38,24,14,18,9,6,10,12,20,30,36,28,20,34,54,40,32,46,24,16,23,15,12,9,5,8,12,9,16,24,34,42,31,20,12,19,26,19,10,7,4,8,13,19,26,18,11,14,8,5,6,3];

export default function LandingPage() {
  const [name, setName] = useState('');
  const [sampleIndex, setSampleIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const sample = samples[sampleIndex];

  async function startPractice(event: React.FormEvent) {
    event.preventDefault();
    if (starting || !name.trim()) return;
    setStarting(true);
    setError('');
    try {
      const result = await authClient.signIn.anonymous();
      if (result.error) throw new Error(result.error.message);
      const updated = await authClient.updateUser({ name: name.trim() });
      if (updated.error) throw new Error(updated.error.message);
      window.location.assign('/new');
    } catch {
      setError('Couldn’t start guest practice. Please try again.');
      setStarting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.intro}>
          <h1>Rehearse your next interview</h1>
          <p>Practice questions for the role you want. Answer out loud or in writing, then see what to work on next.</p>
          <div className={styles.startActions}><a className="primaryButton" href="/signup">Create an account</a><a href="/login">Sign in</a></div>
          <details className={styles.guest}><summary>Practice as a guest</summary>
          <form onSubmit={startPractice} className={styles.form}>
            <label htmlFor="name">Your name</label>
            <div className={styles.formRow}>
              <input id="name" name="name" maxLength={100} autoComplete="given-name" placeholder="First name" value={name} required pattern=".*\S.*" onChange={e => setName(e.target.value)} />
              <button className="secondaryButton" disabled={starting}>{starting ? 'Starting…' : 'Practice as guest'}</button>
            </div>
            {error && <p role="alert">{error}</p>}
          </form></details>
        </div>
        <section id="preview" className={styles.preview} aria-label="Sample interview questions">
          <div className={styles.previewHeader}><span><VoiceMark />Sample question</span><span>{sample.topic}</span></div>
          <div className={styles.prompt} aria-live="polite">
            <h2>{sample.question}</h2>
          </div>
          <div className={styles.wave} aria-hidden="true">{waveform.map((height, i) => <i key={i} style={{ height: height + 'px' }} />)}</div>
          <div className={styles.previewFooter}>
            <span>Sample {sampleIndex + 1} of {samples.length}</span>
            <button onClick={() => setSampleIndex((sampleIndex + 1) % samples.length)}>Next sample <span aria-hidden="true">→</span></button>
          </div>
        </section>
      </section>
      <div className={styles.facts}>
        <span><b>{MAX_QUESTIONS}</b> questions per session</span>
        <span><b>2</b> ways to answer</span>
        <span><b>1</b> personal report</span>
      </div>
      <section className={styles.details} id="how">
        <h2>How practice works</h2>
        <div className={styles.featureGrid}>{features.map(([title, desc]) => <article key={title}><h3>{title}</h3><p>{desc}</p></article>)}</div>
      </section>
      <section className={styles.details}>
        <h2>Behind the interview</h2>
        <dl className={styles.services}>{services.map(([name, desc]) => <div key={name}><dt>{name}</dt><dd>{desc}</dd></div>)}</dl>
      </section>
      <footer className={styles.footer}><a href="/">InterviewIQ</a><a href="/signup">Create an account</a></footer>
    </main>
  );
}
