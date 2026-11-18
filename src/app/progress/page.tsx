'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../review.module.css';

const SKILL_LABELS: Record<string, string> = {
  problem_solving: 'Problem Solving',
  tradeoff_reasoning: 'Tradeoff Reasoning',
  system_design: 'System Design',
  edge_case_handling: 'Edge Case Handling',
  time_complexity: 'Time Complexity',
  communication_clarity: 'Communication',
  star_structure: 'STAR Structure',
  specificity: 'Specificity',
  ownership: 'Ownership',
  reflection: 'Reflection',
  quantification: 'Quantification',
};

const CATEGORY_LABELS: Record<string, string> = {
  arrays_strings: 'Arrays / Strings',
  hash_maps: 'Hash Maps',
  linked_lists: 'Linked Lists',
  stacks_queues: 'Stacks / Queues',
  trees: 'Trees',
  graphs: 'Graphs',
  dynamic_programming: 'Dynamic Programming',
  recursion_backtracking: 'Recursion / Backtracking',
  heaps_priority_queues: 'Heaps / Priority Queues',
  revenue_problems: 'Revenue Problems',
  cost_problems: 'Cost Problems',
  strategic_decisions: 'Strategic Decisions',
  investment_decisions: 'Investment Decisions',
  operational_bottlenecks: 'Operational Bottlenecks',
  technical_proficiency: 'Technical Proficiency (GAAP/IFRS)',
  behavioral_star: 'Behavioral (STAR-based)',
  software_process: 'Software / Process (Excel, ERP)',
  industry_specific: 'Industry-Specific (AP/AR)',
  product_sense: 'Product Sense',
  metrics: 'Metrics',
  tradeoffs: 'Tradeoffs',
  prioritization: 'Prioritization',
  leadership: 'Leadership',
  conflict: 'Conflict',
  failure: 'Failure',
  teamwork: 'Teamwork',
  growth: 'Growth',
  communication: 'Communication',
  scenario: 'Scenario',
  depth: 'Depth',
};

interface CategoryRecord {
  category: string;
  score: number;
  completed: boolean;
  interviewNumber: number;
  mistakes?: string[];
  strengths?: string[];
  weaknesses?: string[];
  timestamp: number;
  improvementDelta?: number;
}

interface ProgressData {
  userName: string;
  sessions: {
    sessionId: string;
    role: string;
    interviewType: string;
    overallScore: number;
    date: number;
  }[];
  skillTrends: Record<string, number[]>;
  categoryHistory: CategoryRecord[];
  categoryStats: Record<string, { scores: number[]; completed: boolean; latestScore: number; mistakes: string[]; strengths: string[]; weaknesses: string[] }>;
  overallAvg: number;
  mostImproved: string | null;
  mostImprovedDelta: number | null;
  repeatedMistakes: { mistake: string; count: number }[];
  totalInterviews: number;
  completedCategories: string[];
  inProgressCategories: string[];
}

function scoreColor(score: number): string {
  if (score >= 7) return styles.scoreGreen;
  if (score >= 5) return styles.scoreYellow;
  return styles.scoreRed;
}

function catLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProgressPage() {
  const router = useRouter();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/progress')
      .then(async res => {
        if (res.status === 401) { router.replace('/login'); return null; }
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className={styles.loading}>Loading progress...</div>;

  if (!data || data.sessions.length === 0) {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>Practice progress</h1>
        <div className={styles.empty}>
          <h2>Your first session</h2>
          <p>Complete an interview to see your skill scores and find out which category to practice next.</p>
          <a href="/new" className="primaryButton">
            Start interview
          </a>
        </div>
      </main>
    );
  }

  // Calculate average per skill from trends
  const skillAverages: { skill: string; avg: number }[] = Object.entries(data.skillTrends)
    .filter(([, scores]) => scores && scores.length > 0)
    .map(([skill, scores]) => ({
      skill,
      avg: Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10,
    }))
    .sort((a, b) => a.avg - b.avg);

  // Determine next interview category info
  const lastRecord = data.categoryHistory.length > 0 ? data.categoryHistory[data.categoryHistory.length - 1] : null;
  let nextCategoryInfo = 'Random category (first interview)';
  if (lastRecord) {
    if (lastRecord.score < 7.5) {
      nextCategoryInfo = `Retry: ${catLabel(lastRecord.category)} (last score: ${lastRecord.score}/10 — below 7.5 threshold)`;
    } else {
      nextCategoryInfo = `New category (${catLabel(lastRecord.category)} completed with ${lastRecord.score}/10)`;
    }
  }

  // Category averages for stats
  const categoryAverages = Object.entries(data.categoryStats)
    .map(([cat, stats]) => ({
      category: cat,
      avg: Math.round((stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) * 10) / 10,
      attempts: stats.scores.length,
      completed: stats.completed,
      latestScore: stats.latestScore,
    }))
    .sort((a, b) => a.avg - b.avg);

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Practice progress</h1>
      <p className={styles.subtitle}>{data.sessions.length} session{data.sessions.length !== 1 ? 's' : ''} completed</p>

      {/* Next interview Section — info only, no button here */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Next interview</h2>
        <div className={styles.nextInterviewCard}>
          <p>{nextCategoryInfo}</p>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Statistics</h2>
        <div className={styles.statsGrid}>
          <div>
            <div className={styles.statValue}>{data.overallAvg ?? '\u2014'}</div>
            <div className={styles.statLabel}>Average score</div>
          </div>
          <div>
            <div className={styles.statValue}>{data.totalInterviews}</div>
            <div className={styles.statLabel}>Interviews</div>
          </div>
          <div>
            <div className={styles.statValue}>{data.completedCategories.length}</div>
            <div className={styles.statLabel}>Categories cleared</div>
          </div>
          <div>
            <div className={styles.statValue}>{data.inProgressCategories.length}</div>
            <div className={styles.statLabel}>Categories in progress</div>
          </div>
        </div>

        {data.mostImproved && (
          <div className={styles.highlightCard}>
            Most improved category · <strong>{catLabel(data.mostImproved)}</strong>
            {data.mostImprovedDelta !== null && ` (+${data.mostImprovedDelta.toFixed(1)} points)`}
          </div>
        )}
      </div>

      {/* Latest Category Status */}
      {lastRecord && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Latest result</h2>
          <div className={styles.nextInterviewCard} style={{ borderLeftColor: lastRecord.score >= 7.5 ? 'var(--success)' : 'var(--warning)' }}>
            <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {catLabel(lastRecord.category)} — {lastRecord.score >= 7.5 ? 'Cleared' : 'In progress'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
              Score: {lastRecord.score}/10
            </p>
          </div>
        </div>
      )}

      {/* Categories cleared */}
      {data.completedCategories.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Categories cleared</h2>
          <ul className={styles.list}>
            {data.completedCategories.map((cat) => (
              <li key={cat}>{catLabel(cat)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* In progress */}
      {data.inProgressCategories.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>In progress</h2>
          <ul className={styles.list}>
            {data.inProgressCategories.map((cat) => (
              <li key={cat}>{catLabel(cat)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Scores Per Category */}
      {categoryAverages.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Scores by category</h2>
          <div className={styles.skillGrid}>
            {categoryAverages.map((c) => (
              <div key={c.category} className={styles.skillRow}>
                <span className={styles.skillName}>
                  {catLabel(c.category)}
                  {c.completed && ' \u2713'}
                </span>
                <div className={styles.skillBarBg}>
                  <div
                    className={styles.skillBarFill}
                    style={{ width: `${c.avg * 10}%` }}
                  />
                </div>
                <span className={styles.skillScore}>{c.avg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recurring mistakes */}
      {data.repeatedMistakes.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Recurring mistakes</h2>
          <ul className={styles.list}>
            {data.repeatedMistakes.slice(0, 5).map((m, i) => (
              <li key={i}>{m.mistake} <span style={{ color: 'var(--text-secondary)' }}>({m.count}x)</span></li>
            ))}
          </ul>
        </div>
      )}

      {/* Session history */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Session history</h2>
        <div className={styles.sessionList}>
          {data.sessions.map((s) => (
            <a key={s.sessionId} href={`/report/${s.sessionId}`} className={styles.sessionRow}>
              <div className={styles.sessionInfo}>
                <span className={styles.tag}>{s.interviewType === 'swe' ? 'Engineering' : s.interviewType}</span>
                <span>{s.role}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {new Date(s.date).toLocaleDateString()}
                </span>
              </div>
              <span className={`${styles.sessionScore} ${scoreColor(s.overallScore)}`}>
                {s.overallScore}/10
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Skill averages */}
      {skillAverages.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Skill averages</h2>
          <div className={styles.skillGrid}>
            {skillAverages.map((s) => (
              <div key={s.skill} className={styles.skillRow}>
                <span className={styles.skillName}>{SKILL_LABELS[s.skill] || s.skill}</span>
                <div className={styles.skillBarBg}>
                  <div
                    className={styles.skillBarFill}
                    style={{ width: `${s.avg * 10}%` }}
                  />
                </div>
                <span className={styles.skillScore}>{s.avg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <a href="/new" className="primaryButton">Next interview</a>
        <a href="/new?reset=1" className="secondaryButton">Reset practice</a>
      </div>
    </main>
  );
}
