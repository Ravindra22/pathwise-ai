# Pathwise — AI Career Copilot

Pathwise is an AI career copilot that turns a résumé and target job into a practical next-step plan.

## Features

- AI résumé-to-role fit analysis
- Upload a text-based résumé or paste its contents
- Strength and skill-gap identification
- A personalized four-week learning roadmap
- Mock-interview feedback focused on clarity, trade-offs, and impact

## Built with

HTML, CSS, JavaScript, Node.js, the OpenAI Responses API, GitHub, Codex, and GPT-5.6.

## How Codex and GPT-5.6 were used

Codex was used throughout the project to design the interface, scaffold the full-stack application, implement the Node.js server, connect the browser experience to the OpenAI Responses API, add secure environment-variable handling, test the code, and document the project.

GPT-5.6 Luna powers the app's career intelligence. The server sends the user's résumé and target job description to the OpenAI Responses API, then returns a structured fit score, matched strengths, skill gaps, and a learning roadmap. It also evaluates mock-interview answers and provides concrete coaching feedback. API calls run only on the server, so the OpenAI API key is never exposed in browser code. The app limits text size and demo requests to help control costs.

## Run locally

1. Copy `.env.example` to `.env`.
2. Add your `OPENAI_API_KEY` to `.env`.
3. Run `node server.mjs`.
4. Open http://localhost:3000.

Do not commit `.env`. It is excluded by `.gitignore`.
