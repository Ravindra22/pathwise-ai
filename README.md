# Pathwise — AI Career Copilot

Pathwise helps people turn career uncertainty into an actionable plan. Upload or paste a resume, add a target role, and receive an AI-guided view of fit, ATS keyword coverage, strengths, gaps, a four-week roadmap, interview practice, and a tailored introduction.

## Why Pathwise

Job seekers often receive generic advice: “learn more skills,” “improve your resume,” or “practice interviews.” Pathwise makes that advice specific to the person and role in front of them. It turns the next move into a small, visible action rather than another overwhelming checklist.

## Features

- Resume upload for PDF, DOCX, TXT, and MD files, or paste-in experience
- AI role-fit analysis with strengths, gaps, and a Fit Score
- ATS keyword coverage estimate based on the supplied job description
- AI resume-improvement suggestions: a tailored summary, bullet ideas, and relevant keywords to review
- Guided four-week roadmap with task steps, saved progress, optional proof of progress, completion, and reopen controls
- Saved career plans backed by Supabase authentication and database storage
- AI mock-interview coaching focused on structure, judgment, trade-offs, and impact
- **Craft intro**: tailored “Tell me about yourself” versions for recruiter, hiring-manager, and technical interviews
- Light and dark themes, responsive UI, guided demo mode, plan download, and in-app validation messages

## Built with

- HTML, CSS, and JavaScript
- Node.js HTTP server
- OpenAI Responses API and GPT-5.6 Luna
- Supabase Auth and Postgres
- Codex

## How Codex and GPT-5.6 were used

Codex was used throughout the build to shape the product flow, implement the polished interface, write the Node.js server, connect Supabase authentication and career-plan persistence, add resume-file parsing, test syntax, and prepare this documentation.

GPT-5.6 Luna powers Pathwise’s career intelligence through the OpenAI Responses API. The application uses structured JSON outputs for resume-to-role analysis, four-week roadmaps, mock-interview feedback, and tailored interview introductions. These outputs are rendered as actionable UI rather than raw chat responses.

The app keeps the OpenAI API key server-side, applies text-size and request limits, and asks users to review AI suggestions rather than treating them as guaranteed hiring or ATS outcomes.

## Run locally

1. Copy `.env.example` to `.env`.
2. Add the required values:

   ```bash
   OPENAI_API_KEY=your_openai_key
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```

3. In the Supabase SQL Editor, run [`supabase-progress.sql`](supabase-progress.sql) to support saved-plan progress and deletion.
4. Start the server:

   ```bash
   node server.mjs
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Privacy and safety

- Do not commit `.env`; it is excluded by `.gitignore`.
- The browser never receives the OpenAI API key.
- Pathwise provides career guidance, not a guarantee of ATS performance or employment outcomes.
- Users should verify every resume or interview suggestion before using it.

## Demo

- Source code: https://github.com/Ravindra22/pathwise-ai
- Demo video: _to be added_
