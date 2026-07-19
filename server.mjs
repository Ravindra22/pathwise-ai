import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const env = await readFile(join(root, ".env"), "utf8").catch(() => "");
for (const line of env.split(/\r?\n/)) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
}
const key = process.env.OPENAI_API_KEY;
const liveAnalysisEnabled = process.env.LIVE_ANALYSIS_ENABLED !== "false";
const maxRequestsPerHour = Number.parseInt(process.env.MAX_REQUESTS_PER_HOUR || "3", 10) || 3;
const json = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const readBody = async req => { let text = ""; for await (const part of req) text += part; return JSON.parse(text || "{}"); };
function extractText(data) {
  const text = data.output?.flatMap(item => item.content || []).find(item => item.type === "output_text")?.text;
  return text || data.output_text || "";
}
const asJson = text => JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
const requests = new Map();
const MAX_CHARS = 24_000;

function checkLimit(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now(); const recent = (requests.get(ip) || []).filter(time => now - time < 60 * 60 * 1000);
  if (recent.length >= maxRequestsPerHour) throw new Error("You have reached the hourly live-analysis limit. Please try again later or use guided demo.");
  recent.push(now); requests.set(ip, recent);
}
function requireText(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required.`);
  if (value.length > MAX_CHARS) throw new Error(`${name} is too long. Please use fewer than 24,000 characters.`);
}
function requireLiveAnalysis() {
  if (!liveAnalysisEnabled) throw new Error("Live analysis is temporarily paused. Try guided demo instead.");
}

async function ask(instructions, input, schemaName, schema) {
  if (!key) throw new Error("Missing OPENAI_API_KEY. Add it to your local .env file.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      reasoning: { effort: "none" },
      store: false,
      // Four practical roadmap steps can exceed 600 tokens. Leave enough room
      // for the complete schema-shaped response instead of returning partial JSON.
      max_output_tokens: 1400,
      instructions,
      input,
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema } }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "OpenAI request failed.");
  if (data.status === "incomplete") throw new Error("The AI response was cut short. Please try again.");
  const refusal = data.output?.flatMap(item => item.content || []).find(item => item.type === "refusal")?.refusal;
  if (refusal) throw new Error("The AI could not analyze this request. Please try a shorter, work-focused résumé and role description.");
  try { return asJson(extractText(data)); }
  catch { throw new Error("The AI response could not be read. Please try the analysis again."); }
}

const analysisInstruction = `You are Pathwise, an AI career copilot. Compare a candidate resume to a job description. Give practical, encouraging advice. Make exactly four roadmap items. In matched, return five concrete skills explicitly supported by the candidate's resume, prioritizing skills relevant to the target role. In strengths, return exactly seven short skill names explicitly supported by the resume. Each strength must include a direct HTTPS URL to an official documentation, official tutorial, or respected learning provider specifically for that skill. Never invent a URL, and do not use search-result URLs. Follow the response schema exactly.`;
const interviewInstruction = `You are a kind, specific interview coach. Evaluate the answer for structure, technical judgment, clear trade-offs, and measurable impact. Give one concrete improvement. Follow the response schema exactly.`;
const introductionInstruction = `You are a career coach. Write a warm, confident first-person “tell me about yourself” introduction based only on the candidate's résumé and target role. The audience will be provided as recruiter, hiring manager, or technical interviewer. Do not invent experience. Keep it natural, concise, and easy to say aloud. Follow the response schema exactly.`;
const resumeImprovementInstruction = `You are a precise résumé coach. Based only on the provided résumé and target role, suggest an improved professional summary, three to five stronger résumé bullet ideas, and relevant role keywords. Never invent employers, titles, projects, skills, metrics, or accomplishments. If evidence is missing, phrase it as a keyword or learning opportunity rather than a claim. Remind the user to review every suggestion for accuracy. Follow the response schema exactly.`;
const analysisSchema = {
  type: "object", additionalProperties: false,
  properties: {
    score: { type: "integer" }, label: { type: "string" }, edgeTitle: { type: "string" }, edgeCopy: { type: "string" },
    gapTitle: { type: "string" }, gapCopy: { type: "string" }, matched: { type: "array", items: { type: "string" } },
    strengths: { type: "array", minItems: 7, maxItems: 7, items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, resourceUrl: { type: "string" } }, required: ["name", "resourceUrl"] } },
    gaps: { type: "array", items: { type: "string" } },
    roadmap: { type: "array", items: { type: "object", additionalProperties: false, properties: { week: { type: "string" }, title: { type: "string" }, detail: { type: "string" } }, required: ["week", "title", "detail"] } }
  },
  required: ["score", "label", "edgeTitle", "edgeCopy", "gapTitle", "gapCopy", "matched", "strengths", "gaps", "roadmap"]
};
const interviewSchema = {
  type: "object", additionalProperties: false,
  properties: { headline: { type: "string" }, feedback: { type: "string" } },
  required: ["headline", "feedback"]
};
const introductionSchema = {
  type: "object", additionalProperties: false,
  properties: { introduction: { type: "string" }, tips: { type: "array", items: { type: "string" } } },
  required: ["introduction", "tips"]
};
const resumeImprovementSchema = {
  type: "object", additionalProperties: false,
  properties: { summary: { type: "string" }, bullets: { type: "array", items: { type: "string" } }, keywords: { type: "array", items: { type: "string" } }, note: { type: "string" } },
  required: ["summary", "bullets", "keywords", "note"]
};

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/analyze") { requireLiveAnalysis(); const { resume, job } = await readBody(req); requireText(resume, "Resume"); requireText(job, "Job description"); checkLimit(req); return json(res, 200, await ask(analysisInstruction, `RESUME:\n${resume}\n\nTARGET ROLE:\n${job}`, "career_analysis", analysisSchema)); }
    if (req.method === "POST" && req.url === "/api/interview") { requireLiveAnalysis(); const { answer, job } = await readBody(req); requireText(answer, "Answer"); requireText(job, "Job description"); checkLimit(req); return json(res, 200, await ask(interviewInstruction, `TARGET ROLE:\n${job}\n\nANSWER:\n${answer}`, "interview_feedback", interviewSchema)); }
    if (req.method === "POST" && req.url === "/api/introduction") { requireLiveAnalysis(); const { resume, job, kind } = await readBody(req); requireText(resume, "Resume"); requireText(job, "Target role"); if (!["recruiter", "manager", "technical"].includes(kind)) throw new Error("Choose an introduction type."); checkLimit(req); return json(res, 200, await ask(introductionInstruction, `AUDIENCE: ${kind}\n\nRESUME:\n${resume}\n\nTARGET ROLE:\n${job}`, "career_introduction", introductionSchema)); }
    if (req.method === "POST" && req.url === "/api/improve-resume") { requireLiveAnalysis(); const { resume, job } = await readBody(req); requireText(resume, "Resume"); requireText(job, "Target role"); checkLimit(req); return json(res, 200, await ask(resumeImprovementInstruction, `RESUME:\n${resume}\n\nTARGET ROLE:\n${job}`, "resume_improvement", resumeImprovementSchema)); }
    if (req.method === "GET" && req.url === "/api/config") return json(res, 200, { supabaseUrl: process.env.SUPABASE_URL || "", supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY || "", liveAnalysisEnabled });
    const pathname = req.url === "/" ? "index.html" : normalize(req.url.split("?")[0]).replace(/^[/\\]+/, "");
    const file = join(root, pathname); if (!file.startsWith(root)) return json(res, 403, { error: "Forbidden" });
    const info = await stat(file); if (!info.isFile()) return json(res, 404, { error: "Not found" });
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" }); res.end(await readFile(file));
  } catch (error) { json(res, 500, { error: error.message || "Something went wrong." }); }
}).listen(process.env.PORT || 3000, () => console.log(`Pathwise — AI Career Copilot is running at http://localhost:${process.env.PORT || 3000}`));
