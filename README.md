# InterviewIQ

InterviewIQ turns a job description into behavioral and coding practice that picks up where you left off. When you come back, the interviewer uses your past questions, feedback, and skill scores to decide what to ask next. A session can move from writing code to explaining a team decision, or focus on behavioral questions about conflict, failure, and growth.

| Behavioral practice | Coding practice |
| --- | --- |
| ![Sample behavioral interview asking how a candidate resolved a disagreement over caching versus indexing.](docs/images/behavioral-interview.png) | ![Sample coding interview showing a Python solution for detecting repeated request IDs.](docs/images/coding-interview.png) |
| Tell the story out loud or in writing. If you say “we compared both approaches,” a follow-up can ask what **you** did to make the comparison fair and how the team decided. | Write Python or JavaScript in the CodeMirror editor and explain your approach. If you use a set to detect repeated requests, a follow-up can ask how much memory it needs as new IDs arrive. |

InterviewIQ also supports product and consulting interviews. [Interview tracks](src/lib/constants.ts) · [Coding workspace](src/components/CodingWorkspace.tsx)

## What happens after you answer?

**During the interview**, the evaluator scores the skills your answer demonstrates. In a behavioral interview, it looks for a clear situation, task, action, and result (STAR), along with ownership and reflection. In a coding interview, it looks at skills such as problem solving, complexity analysis, and edge-case handling. After up to three answers, you get a transcript, a skill breakdown, and practice drills. [Skill rubrics](src/lib/constants.ts) · [Interview logic](src/lib/interviewer.ts)

## Long-term memory across interviews

Suppose you describe a disagreement with a teammate and explain the team's decision, but leave out your own contribution. That feedback carries into later interviews. On a different teamwork question, the interviewer can ask, “Which part did you own?” If past coding reports flag complexity analysis, a new problem can give you another chance to explain how runtime grows with input size.

**Supermemory** makes past feedback searchable. When enabled, it stores each session report with the questions asked, tagged to your user ID. At the start of a new interview, the app searches your reports for earlier weaknesses and questions. It gives those results to the interviewer to guide follow-ups and avoid repeating a prompt word for word. [Memory retrieval](src/lib/adaptation.ts) · [Question generation](src/lib/prompts.ts)

**SQLite** keeps your progress across sessions even when Supermemory is disabled. The app builds a skill profile from your scored interviews and uses your two lowest-rated skills to focus practice. If your overall session score falls below 7.5/10, you revisit the category with a simpler prompt. At 7.5 or higher, the app picks an unfinished category if one remains. [Saved reports](src/lib/store.ts) · [Session setup](src/app/api/sessions/route.ts)

## Engineering decisions

- **One rough session shouldn't define a skill.** Each skill starts at 5/10. A first score of 9 moves the estimate to 6. As observations accumulate, the app gives more weight to performance and less to that starting estimate. It keeps the latest ten scores per skill and weights each one by `0.7 ^ age`, so recent work counts more than older attempts. [Scoring implementation](src/lib/adaptation.ts)
- **Two browser tabs can answer the same question.** Evaluating an answer and generating a follow-up takes time. The server saves them together only if the SQLite session still matches the version it read. If another tab has already advanced the interview, the stale submission gets an HTTP 409 and the newer transcript stays intact. [SQLite write conditions](src/lib/store.ts)
- **Guest practice carries over at signup.** Better Auth gives a guest an anonymous user ID. When they create an account, the app transfers ownership of their interviews. They can resume a session or reopen its report from their history. [Account linking](src/lib/auth.ts)

## Run locally

Use **Node.js 24** to run the Next.js and TypeScript app. From the repository root, run `npm ci` and create a `.env.local` file with these values. Generate the auth secret once with `openssl rand -hex 32` and keep it across restarts.

```dotenv
OPENAI_API_KEY=<your OpenAI API key>
BETTER_AUTH_SECRET=<generated secret>
```

Run `npm run dev`, open [localhost:3000](http://localhost:3000), and choose **Practice as a guest**. Enter a job title and description to start.

<details>
<summary>Optional integrations and deployment</summary>

| Setting | Purpose |
| --- | --- |
| `CEREBRAS_API_KEY` | Routes interview generation and evaluation to Cerebras. Recorded answers still use OpenAI Whisper. |
| `ELEVENLABS_API_KEY` | Enables spoken interviewer questions. |
| `SUPERMEMORY_API_KEY` | Adds semantic retrieval of past questions and feedback. When enabled, the app also uploads recorded answers to Supermemory. |
| `BETTER_AUTH_URL` | Set this to the public HTTPS origin when hosting. |
| `INTERVIEWIQ_DB_PATH` | Defaults to `.data/interviewiq.sqlite`. For a single hosted instance, use a persistent volume and SQLite-aware backups. |

</details>
