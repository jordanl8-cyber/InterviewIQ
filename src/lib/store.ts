import { db } from './database';
import type { Session, SessionReport, CategoryRecord } from './types';

export const store = {
  create(owner: string, session: Session) {
    db.prepare('INSERT INTO interviews (id, owner, created, session) VALUES (?, ?, ?, ?)')
      .run(session.id, owner, session.createdAt, JSON.stringify(session));
  },
  getSession(owner: string, id: string): Session | undefined {
    const row = db.prepare('SELECT session FROM interviews WHERE owner = ? AND id = ?').get(owner, id);
    if (row) return JSON.parse(String(row.session));
  },
  saveAnswer(owner: string, previous: Session, next: Session) {
    return db.prepare('UPDATE interviews SET session = ? WHERE owner = ? AND id = ? AND session = ? AND report IS NULL')
      .run(JSON.stringify(next), owner, next.id, JSON.stringify(previous)).changes === 1;
  },
  finish(owner: string, previous: Session, report: SessionReport, record?: CategoryRecord) {
    return db.prepare(`UPDATE interviews SET session = ?, report = ?, category_record = ?
      WHERE owner = ? AND id = ? AND session = ? AND report IS NULL`)
      .run(JSON.stringify({ ...previous, status: 'completed' }), JSON.stringify(report),
        record ? JSON.stringify(record) : null, owner, previous.id, JSON.stringify(previous)).changes === 1;
  },
  getReport(owner: string, id: string): SessionReport | undefined {
    const row = db.prepare('SELECT report FROM interviews WHERE owner = ? AND id = ?').get(owner, id);
    if (row?.report) return JSON.parse(String(row.report));
  },
  getReportsByUser(owner: string): SessionReport[] {
    return db.prepare('SELECT report FROM interviews WHERE owner = ? AND report IS NOT NULL ORDER BY created DESC')
      .all(owner).map(row => JSON.parse(String(row.report)));
  },
  scoredReports(owner: string): SessionReport[] {
    return db.prepare('SELECT report FROM interviews WHERE owner = ? AND category_record IS NOT NULL ORDER BY created')
      .all(owner).map(row => JSON.parse(String(row.report)));
  },
  recentQuestions(owner: string): string[] {
    const rows = db.prepare("SELECT json_extract(session, '$.messages') AS messages FROM interviews WHERE owner = ? ORDER BY created DESC LIMIT 10").all(owner);
    return rows.flatMap(row => (JSON.parse(String(row.messages)) as Session['messages'])
      .filter(message => message.role === 'interviewer').map(message => message.content));
  },
  getCategoryHistory(owner: string): CategoryRecord[] {
    return db.prepare('SELECT category_record FROM interviews WHERE owner = ? AND category_record IS NOT NULL ORDER BY created')
      .all(owner).map(row => JSON.parse(String(row.category_record)));
  },
  latestJob(owner: string): Pick<Session['config'], 'role' | 'company' | 'jobDescription'> | null {
    const row = db.prepare("SELECT json_extract(session, '$.config') AS config FROM interviews WHERE owner = ? ORDER BY created DESC LIMIT 1").get(owner);
    if (!row) return null;
    const { role, company, jobDescription } = JSON.parse(String(row.config));
    return { role, company, jobDescription };
  },
  history(owner: string) {
    return db.prepare(`SELECT id, created, json_extract(session,'$.config.role') AS role,
      json_extract(session,'$.config.company') AS company,
      json_extract(report,'$.overallScore') AS score FROM interviews WHERE owner = ? ORDER BY created DESC`)
      .all(owner).map(row => ({ id: String(row.id), date: Number(row.created), role: String(row.role),
        company: String(row.company || ''), score: row.score === null ? null : Number(row.score) }));
  },
  clearUser(owner: string) {
    db.prepare('DELETE FROM interviews WHERE owner = ?').run(owner);
  },
};
