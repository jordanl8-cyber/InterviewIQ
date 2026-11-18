'use client';

import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';
import styles from './AccountForm.module.css';

export default function AccountForm({ signup }: { signup: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email')).trim();
    const password = String(fields.get('password'));
    const name = String(fields.get('name') || '').trim();
    setBusy(true);
    setError('');
    try {
      const result = signup
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message || 'Check your details and try again.');
      window.location.replace('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect. Try again.');
      setBusy(false);
    }
  }
  return <main className={styles.page}>
    <h1>{signup ? 'Create your account' : 'Sign in'}</h1>
    <p>{signup ? 'Save your interviews, feedback, and practice progress in one place.' : 'Pick up your last interview or revisit a past report.'}</p>
    <form onSubmit={submit}>
      {signup && <label>Name<input autoComplete="name" name="name" required maxLength={100} pattern=".*\S.*" /></label>}
      <label>Email<input autoComplete="email" type="email" name="email" required /></label>
      <label>Password<input type="password" name="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 10 : 1} maxLength={128} />
        {signup && <small>Use at least 10 characters.</small>}</label>
      {error && <p role="alert">{error}</p>}
      <button className="primaryButton" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
    </form>
    <div>{signup ? 'Already have an account?' : 'New to InterviewIQ?'} <a href={signup ? '/login' : '/signup'}>{signup ? 'Sign in' : 'Create an account'}</a></div>
  </main>;
}
