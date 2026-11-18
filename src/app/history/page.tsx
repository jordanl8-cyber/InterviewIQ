import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { store } from '@/lib/store';
import styles from '../review.module.css';

export default async function HistoryPage() {
  const user = await currentUser();
  if (!user) redirect('/login');
  const interviews = store.history(user.id);
  return <main className={styles.container}>
    <h1 className={styles.title}>Your interviews</h1>
    <p className={styles.subtitle}>{user.name} · {interviews.length} {interviews.length === 1 ? 'interview' : 'interviews'}</p>
    {interviews.length ? <div className={styles.sessionList}>
      {interviews.map(item => <article className={styles.historyRow} key={item.id}>
        <div><h2>{item.role}</h2><small>{[item.company, new Date(item.date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})].filter(Boolean).join(' · ')}</small></div>
        <div className={styles.historyLinks}>{item.score === null
          ? <a href={'/session/' + item.id}>Resume interview</a>
          : <><span>{item.score}/10</span><a href={'/session/' + item.id}>Transcript</a><a href={'/report/' + item.id}>View report</a></>}
        </div>
      </article>)}
    </div> : <div className={styles.empty}><h2>Your first interview</h2><p>Start a practice session for the role you want. Your questions, answers, and report will appear here.</p></div>}
    <div className={styles.actions}><a href="/new" className="primaryButton">{interviews.length ? 'Next interview' : 'Start interview'}</a>
      {interviews.length > 0 && <a href="/new?edit=1" className="secondaryButton">Practice another role</a>}
      {user.isAnonymous && <a href="/signup" className="secondaryButton">Save to an account</a>}</div>
  </main>;
}
