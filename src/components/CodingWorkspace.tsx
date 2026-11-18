'use client';

import { useState, type ReactNode } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import styles from './CodingWorkspace.module.css';

const languages = {
  Python: { file: 'solution.py', tag: 'python', extensions: [python()] },
  JavaScript: { file: 'solution.js', tag: 'javascript', extensions: [javascript()] },
};
type Language = keyof typeof languages;

function parseProblem(text: string) {
  const heading = /^#{1,3}[ \t]+(.+)$/m.exec(text);
  const title = heading?.[1];
  const signature = text.match(/^Function:\s*([a-z_]\w*\((?:[a-z_]\w*(?:,\s*[a-z_]\w*)*)?\))\s*$/im)?.[1];
  const input = text.match(/^Input:[ \t]*(.+)$/im)?.[1];
  const output = text.match(/^Output:[ \t]*(.+)$/im)?.[1];
  let description = heading ? text.slice(heading.index + heading[0].length) : text;
  if (signature) description = description.replace(/^Function:.*$/im, '');
  if (input && output) description = description.replace(/^(Input|Output):.*$/gim, '');
  // Older interviews embed the example in the original prose.
  const exampleAt = !input && !output ? description.search(/\bFor example[,:\s]/i) : -1;
  const example = exampleAt >= 0 ? description.slice(exampleAt).trim() : '';
  if (example) description = description.slice(0, exampleAt);
  return { title, signature, input, output, description: description.trim(), example };
}

function inlineCode(text: string) {
  return text.split(/(`[^`\n]+`)/g).map((part, index) =>
    part.startsWith('`') && part.endsWith('`')
      ? <code key={index}>{part.slice(1, -1)}</code> : part);
}

function starter(signature: string | undefined, language: Language) {
  if (!signature) return '';
  return language === 'Python'
    ? 'def ' + signature + ':\n    # Write your solution here\n    pass'
    : 'function ' + signature + ' {\n  // Write your solution here\n}';
}

type Props = {
  prompt: string;
  followUp?: string;
  role: string;
  category?: string;
  difficulty: string;
  question: number;
  total: number;
  controls: ReactNode;
  voiceControl: ReactNode;
  notes: string;
  setNotes: (notes: string) => void;
  busy: boolean;
  loading: boolean;
  error: string;
  onSubmit: (answer: string) => void;
};

export default function CodingWorkspace(props: Props) {
  const problem = parseProblem(props.prompt);
  const [language, setLanguage] = useState<Language>('Python');
  const [drafts, setDrafts] = useState<Partial<Record<Language, string>>>({});
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [showNotes, setShowNotes] = useState(false);
  const template = starter(problem.signature, language);
  const code = drafts[language] ?? template;
  const hasCode = !!code.trim() && code.trim() !== template.trim();
  const canSubmit = !props.busy && (hasCode || !!props.notes.trim());
  const submit = () => {
    if (!canSubmit) return;
    const block = hasCode ? '```' + languages[language].tag + '\n' + code + '\n```' : '';
    props.onSubmit([block, props.notes.trim()].filter(Boolean).join('\n\n'));
  };

  return (
    <main className={styles.workspace} onKeyDown={event => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        submit();
      }
    }}>
      <header className={styles.toolbar}>
        <div className={styles.context}><strong>Coding interview</strong><span>{props.role}</span></div>
        <div className={styles.actions}><span>Question {props.question} of {props.total}</span>{props.controls}</div>
      </header>

      <div className={styles.panes}>
        <section className={styles.panel} aria-label="Problem description">
          <div className={styles.panelHeader}><span className={styles.icon} aria-hidden="true">¶</span> Problem description</div>
          <article className={styles.brief}>
            <div className={styles.metadata}><span>{props.difficulty}</span>{props.category && <span>{props.category}</span>}</div>
            <h1>{problem.title || 'Coding problem'}</h1>
            <p>{inlineCode(problem.description)}</p>
            {problem.signature && <><h2>Function signature</h2><pre>{problem.signature}</pre></>}
            {(problem.input && problem.output || problem.example) && <>
              <h2>Example</h2>
              {problem.example ? <p>{inlineCode(problem.example)}</p> : <dl className={styles.example}>
                <dt>Input</dt><dd>{problem.input}</dd><dt>Expected output</dt><dd>{problem.output}</dd>
              </dl>}
            </>}
            {props.followUp && <div className={styles.followUp}><h2>Interviewer follow-up</h2><p>{inlineCode(props.followUp)}</p></div>}
          </article>
        </section>

        <section className={styles.panel} aria-label="Solution editor">
          <div className={styles.panelHeader}>
            <span className={styles.icon} aria-hidden="true">&lt;/&gt;</span> Code editor
            <select aria-label="Programming language" value={language} disabled={props.busy}
              onChange={event => setLanguage(event.target.value as Language)}>
              {Object.keys(languages).map(name => <option key={name}>{name}</option>)}
            </select>
          </div>
          <div className={styles.fileBar}><span>{languages[language].file}</span></div>
          <div className={styles.editor}>
            <CodeMirror key={language} aria-label="Solution code" theme="dark" height="100%"
              value={code} extensions={languages[language].extensions} editable={!props.busy}
              placeholder="Write your solution here…"
              basicSetup={{ foldGutter: false, highlightSelectionMatches: false }}
              onChange={value => setDrafts(previous => ({ ...previous, [language]: value }))}
              onUpdate={update => {
                if (!update.selectionSet && !update.docChanged) return;
                const pos = update.state.selection.main.head;
                const line = update.state.doc.lineAt(pos);
                setCursor({ line: line.number, column: pos - line.from + 1 });
              }}
              onCreateEditor={view => {
                const pos = view.state.selection.main.head;
                const line = view.state.doc.lineAt(pos);
                setCursor({ line: line.number, column: pos - line.from + 1 });
              }}
            />
          </div>
          <div className={styles.status}><span>Ln {cursor.line}, Col {cursor.column}</span><span>{language}</span></div>
          <div className={styles.notes}>
            <button type="button" aria-expanded={showNotes} onClick={() => setShowNotes(!showNotes)}>
              <span aria-hidden="true">{showNotes ? '▾' : '▸'}</span> Explain your approach{!showNotes && props.notes.trim() ? ' (draft)' : ''}
            </button>
            <div hidden={!showNotes}><textarea aria-label="Approach notes" placeholder="Add reasoning or ask the interviewer a question…"
              value={props.notes} onChange={event => props.setNotes(event.target.value)} disabled={props.busy} />
              {props.voiceControl}</div>
          </div>
          {props.error && <p role="alert" className={styles.error}>{props.error}</p>}
          <footer className={styles.submitBar}>
            <small>⌘ / Ctrl + Enter</small>
            <button className="primaryButton" disabled={!canSubmit} onClick={submit}>{props.loading ? 'Submitting…' : 'Submit answer'}</button>
          </footer>
        </section>
      </div>
    </main>
  );
}
