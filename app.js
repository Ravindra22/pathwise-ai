const skills = ["React", "TypeScript", "JavaScript", "CSS", "REST APIs", "Git", "Figma", "Agile"];
const expected = ["React", "TypeScript", "Next.js", "GraphQL", "Mentoring", "Testing", "CI/CD", "Accessibility", "Performance"];
const $ = (id) => document.getElementById(id);
let supabaseClient, activeUser, lastAnalysis, authMode = "signin", profilePrompted = false;
function accountName(user = activeUser) { return user?.user_metadata?.full_name?.trim() || ""; }
function initials(name) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase(); }
function updateAccountUi() { const name = accountName(); document.body.classList.toggle("signed-in", Boolean(activeUser)); $("auth-button").textContent = activeUser ? "Sign out" : "Sign in"; $("profile-avatar").textContent = name ? initials(name) : (activeUser ? "PW" : "↗"); }
function setStatus(id, message = "", state = "") { const element = $(id); element.textContent = message; if (state) element.dataset.state = state; else delete element.dataset.state; }
function clearAuthForm() { $("auth-form").reset(); setStatus("auth-status"); }
function openAuth(mode = "signin") { authMode = mode; const signup = mode === "signup"; $("name-fields").hidden = !signup; $("auth-first-name").required = signup; $("auth-last-name").required = signup; $("auth-password").autocomplete = signup ? "new-password" : "current-password"; $("auth-title").innerHTML = signup ? "Create your<br />path." : "Welcome back."; $("auth-copy").textContent = signup ? "Start with a personal space for your career plans, progress, and practice." : "Sign in to pick up your career plan, roadmap progress, and interview practice."; $("auth-submit").innerHTML = signup ? "Create account <span>→</span>" : "Sign in <span>→</span>"; $("auth-mode-toggle").textContent = signup ? "Already have an account? Sign in" : "Create a new account"; setStatus("auth-status"); if (!$("auth-dialog").open) $("auth-dialog").showModal(); }
function openProfile() { const [first = "", ...rest] = accountName().split(" "); $("profile-first-name").value = first; $("profile-last-name").value = rest.join(" "); setStatus("profile-status"); if (!$("profile-dialog").open) $("profile-dialog").showModal(); }
function maybePromptProfile() { if (activeUser && !accountName() && !profilePrompted) { profilePrompted = true; setTimeout(openProfile, 250); } }
async function initAuth() { try { const c = await fetch("/api/config").then(r => r.json()); if (!c.supabaseUrl || !c.supabaseKey) return; supabaseClient = window.supabase.createClient(c.supabaseUrl, c.supabaseKey); activeUser = (await supabaseClient.auth.getSession()).data.session?.user || null; updateAccountUi(); maybePromptProfile(); supabaseClient.auth.onAuthStateChange((_e, s) => { activeUser = s?.user; updateAccountUi(); maybePromptProfile(); }); } catch {} }
const setTheme = theme => { document.body.classList.toggle("light-theme", theme === "light"); $("theme-toggle").textContent = theme === "light" ? "☾ Dark" : "☀ Light"; localStorage.setItem("pathwise-theme", theme); };
setTheme(localStorage.getItem("pathwise-theme") || "dark");
$("theme-toggle").addEventListener("click", () => setTheme(document.body.classList.contains("light-theme") ? "dark" : "light"));
let demoMode = false, analysisBeforeDemo;
const demoAnalysis = { score: 78, label: "Strong foundation", edgeTitle: "Your product delivery experience stands out.", edgeCopy: "Your React, TypeScript, and dashboard work gives you credible evidence of shipping customer-facing products.", gapTitle: "Build confidence in Next.js and GraphQL.", gapCopy: "A small portfolio project and two specific interview stories can close these visible gaps.", matched: ["React", "TypeScript", "Product delivery", "Analytics"], gaps: ["Next.js", "GraphQL", "Mentoring"], roadmap: [["WEEK 01", "Sharpen your résumé", "Rewrite three experience bullets around measurable customer impact."], ["WEEK 02", "Build one focused feature", "Create a small Next.js project and document your technical decisions."], ["WEEK 03", "Practice your leadership story", "Prepare two STAR examples about influence and difficult trade-offs."], ["WEEK 04", "Apply with intention", "Tailor five applications and lead with your strongest product evidence."]].map(([week, title, detail]) => ({ week, title, detail })) };
$("resume-file").addEventListener("change", async event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 1024 * 1024) { $("file-status").textContent = "Please choose a file smaller than 1 MB."; return; } try { $("resume").value = await file.text(); $("file-status").textContent = `Loaded ${file.name}`; } catch { $("file-status").textContent = "Could not read that file. Paste the text instead."; } });

function words(text) { return text.toLowerCase().replace(/[^a-z0-9+#./ ]/g, " "); }
function matchSkills(resume, job) {
  const resumeWords = words(resume); const jobWords = words(job);
  const found = expected.filter(skill => resumeWords.includes(words(skill)) || (jobWords.includes(words(skill)) && resumeWords.includes(words(skill))));
  const gaps = expected.filter(skill => jobWords.includes(words(skill)) && !resumeWords.includes(words(skill)));
  return { found: found.length ? found : skills.slice(0, 4), gaps: gaps.length ? gaps.slice(0, 4) : ["Leadership", "System design", "Impact stories"] };
}
function chips(id, items) { $(id).innerHTML = items.map(item => `<span>${item}</span>`).join(""); }
function showResults(data) {
  lastAnalysis = data || lastAnalysis;
  const resume = $("resume").value; const job = $("job").value; const { found, gaps } = matchSkills(resume, job);
  const score = data?.score ?? Math.min(92, Math.max(46, 58 + found.length * 5 - gaps.length * 2));
  $("score").textContent = score; $("meter-fill").style.width = `${score}%`;
  $("score-label").textContent = data?.label || (score > 75 ? "Excellent momentum" : score > 60 ? "Strong foundation" : "Promising direction");
  $("edge-title").textContent = data?.edgeTitle || `Your ${found.slice(0, 2).join(" + ")} experience stands out.`;
  $("edge-copy").textContent = data?.edgeCopy || "These are the strongest proof points to lead with in your résumé and recruiter conversations.";
  $("gap-title").textContent = data?.gapTitle || (gaps.length ? `Build confidence in ${gaps.slice(0, 2).join(" and ")}.` : "Polish your senior-level story.");
  $("gap-copy").textContent = data?.gapCopy || "Focus your next applications and practice around the skills this role makes most visible.";
  chips("matched", data?.matched || found); chips("gaps", data?.gaps || gaps); if (data?.roadmap) { plans.splice(0, plans.length, ...data.roadmap.map(x => [x.week, x.title, x.detail])); renderRoadmap(); } $("results").scrollIntoView({ behavior: "smooth", block: "center" });
}
$("analysis-form").addEventListener("submit", async e => { e.preventDefault(); const button = e.currentTarget.querySelector("button"); button.disabled = true; button.textContent = "Analyzing…"; try { const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resume: $("resume").value, job: $("job").value }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); showResults(data); } catch (error) { alert(`Could not analyze yet: ${error.message}`); } finally { button.disabled = false; button.innerHTML = "Reveal my path <span>→</span>"; } });
function exitDemoMode() { if (!demoMode) return; demoMode = false; showResults(analysisBeforeDemo); analysisBeforeDemo = undefined; $("demo-mode").textContent = "Try guided demo →"; $("demo-exit").hidden = true; }
$("demo-mode").addEventListener("click", () => { if (demoMode) return exitDemoMode(); demoMode = true; analysisBeforeDemo = lastAnalysis; showResults(demoAnalysis); $("demo-mode").textContent = "Exit demo mode"; $("demo-exit").hidden = false; });
$("demo-exit").addEventListener("click", exitDemoMode);
$("auth-button").addEventListener("click", async () => { if (!activeUser) return openAuth(); activeUser = null; updateAccountUi(); clearAuthForm(); $("profile-dialog").close(); const r = await supabaseClient.auth.signOut(); if (r.error) return alert(r.error.message); profilePrompted = false; openAuth(); });
$("guest-start").addEventListener("click", () => openAuth("signup"));
$("profile-avatar").addEventListener("click", () => activeUser ? openProfile() : openAuth());
$("close-auth").addEventListener("click", () => $("auth-dialog").close());
$("auth-mode-toggle").addEventListener("click", () => openAuth(authMode === "signin" ? "signup" : "signin"));
$("auth-form").addEventListener("submit", async e => { e.preventDefault(); if (!supabaseClient) return setStatus("auth-status", "Supabase is not connected. Restart the server and check your .env values.", "error"); const email = $("auth-email").value; const password = $("auth-password").value; const r = authMode === "signup" ? await supabaseClient.auth.signUp({ email, password, options: { data: { first_name: $("auth-first-name").value.trim(), last_name: $("auth-last-name").value.trim(), full_name: `${$("auth-first-name").value.trim()} ${$("auth-last-name").value.trim()}`.trim() } } }) : await supabaseClient.auth.signInWithPassword({ email, password }); setStatus("auth-status", r.error?.message || (authMode === "signup" ? "Account created. Check your inbox if confirmation is enabled." : "Signed in."), r.error ? "error" : "success"); if (!r.error && (authMode === "signin" || r.data.session)) $("auth-dialog").close(); });
$("close-profile").addEventListener("click", () => $("profile-dialog").close());
$("profile-form").addEventListener("submit", async e => { e.preventDefault(); const firstName = $("profile-first-name").value.trim(); const lastName = $("profile-last-name").value.trim(); const r = await supabaseClient.auth.updateUser({ data: { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}`.trim() } }); setStatus("profile-status", r.error?.message || "Saved.", r.error ? "error" : "success"); if (!r.error) { activeUser = r.data.user; updateAccountUi(); setTimeout(() => $("profile-dialog").close(), 350); } });
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => { document.querySelectorAll(".tab").forEach(x => x.classList.remove("active")); tab.classList.add("active"); document.querySelectorAll(".panel").forEach(x => x.classList.remove("active")); $(tab.dataset.panel).classList.add("active"); $(tab.dataset.panel).scrollIntoView({ behavior: "smooth", block: "start" }); }));

const plans = [
  ["WEEK 01", "Name your evidence", "Rewrite three résumé bullets with an action, metric, and outcome."],
  ["WEEK 02", "Close one technical gap", "Build a small Next.js or GraphQL feature and document your choices."],
  ["WEEK 03", "Practice your leadership story", "Prepare two STAR examples about influence, trade-offs, or mentorship."],
  ["WEEK 04", "Ship your signal", "Polish your portfolio and apply to five roles with a tailored opening."],
];
function renderRoadmap() { $("roadmap-list").innerHTML = plans.map((p, i) => `<article class="week" data-week="${i}"><span class="week-label">${p[0]}</span><div><h3>${p[1]}</h3><p>${p[2]}</p></div><button class="check" aria-label="Mark ${p[0]} complete"></button></article>`).join(""); document.querySelectorAll(".check").forEach(btn => btn.addEventListener("click", () => btn.closest(".week").classList.toggle("done"))); }
renderRoadmap(); $("refresh-roadmap").addEventListener("click", () => { plans.push(plans.shift()); renderRoadmap(); });
$("save-plan").addEventListener("click", async () => { if (!activeUser) return $("auth-dialog").showModal(); const r = await supabaseClient.from("career_plans").insert({ user_id: activeUser.id, target_role: $("job").value, analysis: lastAnalysis, roadmap: plans.map(([week, title, detail]) => ({ week, title, detail })) }); alert(r.error ? r.error.message : "Career plan saved."); });
$("answer").addEventListener("input", e => { $("word-count").textContent = `${e.target.value.trim() ? e.target.value.trim().split(/\s+/).length : 0} words`; });
const questions = ["Tell me about a time you made a difficult technical trade-off.", "How would you make an analytics dashboard more accessible?", "Describe a project where you influenced a decision without formal authority."];
let questionIndex = 0;
$("new-question").addEventListener("click", () => { questionIndex = (questionIndex + 1) % questions.length; $("question").textContent = questions[questionIndex]; $("answer").value = ""; $("word-count").textContent = "0 words"; $("feedback").hidden = true; });
$("score-answer").addEventListener("click", async () => { const answer = $("answer").value.trim(); const feedback = $("feedback"); if (!answer) { feedback.hidden = false; feedback.innerHTML = "<strong>Start with one concrete example.</strong> Add a situation, the decision you made, and what changed as a result."; return; } if (demoMode) { feedback.hidden = false; feedback.innerHTML = "<strong>Clear structure—now make the impact measurable.</strong> Your answer should name the trade-off, explain why it mattered to users, and finish with a concrete result such as time saved, adoption, or performance improved."; return; } try { const response = await fetch("/api/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer, job: $("job").value }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); feedback.hidden = false; feedback.innerHTML = `<strong>${data.headline}</strong> ${data.feedback}`; } catch (error) { feedback.hidden = false; feedback.innerHTML = `<strong>Could not score yet.</strong> ${error.message}`; } });
showResults();
initAuth();
