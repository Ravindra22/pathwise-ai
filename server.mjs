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
const json = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const readBody = async req => { let text = ""; for await (const part of req) text += part; return JSON.parse(text || "{}"); };
const extractText = data => data.output?.flatMap(item => item.content || []).find(item => item.type === "output_text")?.text || "";
const asJson = text => JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
const requests = new Map();
const MAX_CHARS = 24_000;

function checkLimit(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now(); const recent = (requests.get(ip) || []).filter(time => now - time < 60 * 60 * 1000);
  if (recent.length >= 6) throw new Error("You have reached the hourly demo limit. Please try again later.");
  recent.push(now); requests.set(ip, recent);
}
function requireText(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required.`);
  if (value.length > MAX_CHARS) throw new Error(`${name} is too long. Please use fewer than 24,000 characters.`);
}

async function ask(instructions, input) {
  if (!key) throw new Error("Missing OPENAI_API_KEY. Add it to your local .env file.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-5.6-luna", reasoning: { effort: "none" }, store: false, max_output_tokens: 600, instructions, input })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "OpenAI request failed.");
  return asJson(extractText(data));
}

const analysisInstruction = `You are Pathwise, an AI career copilot. Compare a candidate resume to a job description. Return ONLY valid JSON: {"score":number 0-100,"label":string,"edgeTitle":string,"edgeCopy":string,"gapTitle":string,"gapCopy":string,"matched":[string],"gaps":[string],"roadmap":[{"week":"WEEK 01","title":string,"detail":string}]}. Give practical, encouraging advice. Make exactly four roadmap items.`;
const interviewInstruction = `You are a kind, specific interview coach. Return ONLY valid JSON: {"headline":string,"feedback":string}. Evaluate the answer for structure, technical judgment, clear trade-offs, and measurable impact. Give one concrete improvement.`;

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/analyze") { const { resume, job } = await readBody(req); requireText(resume, "Resume"); requireText(job, "Job description"); checkLimit(req); return json(res, 200, await ask(analysisInstruction, `RESUME:\n${resume}\n\nTARGET ROLE:\n${job}`)); }
    if (req.method === "POST" && req.url === "/api/interview") { const { answer, job } = await readBody(req); requireText(answer, "Answer"); requireText(job, "Job description"); checkLimit(req); return json(res, 200, await ask(interviewInstruction, `TARGET ROLE:\n${job}\n\nANSWER:\n${answer}`)); }
    if (req.method === "GET" && req.url === "/api/config") return json(res, 200, { supabaseUrl: process.env.SUPABASE_URL || "", supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY || "" });
    const pathname = req.url === "/" ? "index.html" : normalize(req.url.split("?")[0]).replace(/^[/\\]+/, "");
    const file = join(root, pathname); if (!file.startsWith(root)) return json(res, 403, { error: "Forbidden" });
    const info = await stat(file); if (!info.isFile()) return json(res, 404, { error: "Not found" });
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" }); res.end(await readFile(file));
  } catch (error) { json(res, 500, { error: error.message || "Something went wrong." }); }
}).listen(process.env.PORT || 3000, () => console.log(`Pathwise — AI Career Copilot is running at http://localhost:${process.env.PORT || 3000}`));
