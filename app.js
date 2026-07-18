const skills = ["React", "TypeScript", "JavaScript", "CSS", "REST APIs", "Git", "Figma", "Agile"];
const expected = ["React", "TypeScript", "Next.js", "GraphQL", "Mentoring", "Testing", "CI/CD", "Accessibility", "Performance"];
const $ = (id) => document.getElementById(id);

function words(text) { return text.toLowerCase().replace(/[^a-z0-9+#./ ]/g, " "); }
function matchSkills(resume, job) {
  const resumeWords = words(resume); const jobWords = words(job);
  const found = expected.filter(skill => resumeWords.includes(words(skill)) || (jobWords.includes(words(skill)) && resumeWords.includes(words(skill))));
  const gaps = expected.filter(skill => jobWords.includes(words(skill)) && !resumeWords.includes(words(skill)));
  return { found: found.length ? found : skills.slice(0, 4), gaps: gaps.length ? gaps.slice(0, 4) : ["Leadership", "System design", "Impact stories"] };
}
function chips(id, items) { $(id).innerHTML = items.map(item => `<span>${item}</span>`).join(""); }
function showResults() {
  const resume = $("resume").value; const job = $("job").value; const { found, gaps } = matchSkills(resume, job);
  const score = Math.min(92, Math.max(46, 58 + found.length * 5 - gaps.length * 2));
  $("score").textContent = score; $("meter-fill").style.width = `${score}%`;
  $("score-label").textContent = score > 75 ? "Excellent momentum" : score > 60 ? "Strong foundation" : "Promising direction";
  $("edge-title").textContent = `Your ${found.slice(0, 2).join(" + ")} experience stands out.`;
  $("edge-copy").textContent = "These are the strongest proof points to lead with in your résumé and recruiter conversations.";
  $("gap-title").textContent = gaps.length ? `Build confidence in ${gaps.slice(0, 2).join(" and ")}.` : "Polish your senior-level story.";
  $("gap-copy").textContent = "Focus your next applications and practice around the skills this role makes most visible.";
  chips("matched", found); chips("gaps", gaps); $("results").scrollIntoView({ behavior: "smooth", block: "center" });
}
$("analysis-form").addEventListener("submit", e => { e.preventDefault(); showResults(); });
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => { document.querySelectorAll(".tab").forEach(x => x.classList.remove("active")); tab.classList.add("active"); document.querySelectorAll(".panel").forEach(x => x.classList.remove("active")); $(tab.dataset.panel).classList.add("active"); $(tab.dataset.panel).scrollIntoView({ behavior: "smooth", block: "start" }); }));

const plans = [
  ["WEEK 01", "Name your evidence", "Rewrite three résumé bullets with an action, metric, and outcome."],
  ["WEEK 02", "Close one technical gap", "Build a small Next.js or GraphQL feature and document your choices."],
  ["WEEK 03", "Practice your leadership story", "Prepare two STAR examples about influence, trade-offs, or mentorship."],
  ["WEEK 04", "Ship your signal", "Polish your portfolio and apply to five roles with a tailored opening."],
];
function renderRoadmap() { $("roadmap-list").innerHTML = plans.map((p, i) => `<article class="week" data-week="${i}"><span class="week-label">${p[0]}</span><div><h3>${p[1]}</h3><p>${p[2]}</p></div><button class="check" aria-label="Mark ${p[0]} complete"></button></article>`).join(""); document.querySelectorAll(".check").forEach(btn => btn.addEventListener("click", () => btn.closest(".week").classList.toggle("done"))); }
renderRoadmap(); $("refresh-roadmap").addEventListener("click", () => { plans.push(plans.shift()); renderRoadmap(); });
$("answer").addEventListener("input", e => { $("word-count").textContent = `${e.target.value.trim() ? e.target.value.trim().split(/\s+/).length : 0} words`; });
$("score-answer").addEventListener("click", () => { const answer = $("answer").value.trim(); const feedback = $("feedback"); if (!answer) { feedback.hidden = false; feedback.innerHTML = "<strong>Start with one concrete example.</strong> Add a situation, the decision you made, and what changed as a result."; return; } const length = answer.split(/\s+/).length; const hasResult = /result|impact|improved|increased|reduced|saved|%|users/i.test(answer); feedback.hidden = false; feedback.innerHTML = `<strong>${length >= 80 ? "Well structured." : "Good start—add more detail."}</strong> ${hasResult ? "You’ve included impact, which makes the story credible." : "Finish with a measurable result so the interviewer can see your impact."} Try naming the trade-off explicitly, then explain why your decision was right for the user or business.`; });
showResults();
