const skills = ["React", "TypeScript", "JavaScript", "CSS", "REST APIs", "Git", "Figma", "Agile"];
const expected = ["React", "TypeScript", "Next.js", "GraphQL", "Mentoring", "Testing", "CI/CD", "Accessibility", "Performance"];

export function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").replace(/\.(?=\s|$)/g, " ").replace(/\s+/g, " ").trim();
}

export function includesTerm(text, term) {
  const source = ` ${normalizeText(text)} `;
  const needle = ` ${normalizeText(term)} `;
  return needle.length > 2 && source.includes(needle);
}

export function matchSkills(resume, job, keywords = []) {
  const roleKeywords = [...new Set(keywords.map(item => String(item).trim()).filter(Boolean))].slice(0, 12);
  if (roleKeywords.length) {
    const matched = roleKeywords.filter(term => includesTerm(resume, term));
    return { found: matched, gaps: roleKeywords.filter(term => !includesTerm(resume, term)), roleKeywords };
  }
  const found = skills.filter(skill => includesTerm(resume, skill) && includesTerm(job, skill));
  const gaps = expected.filter(skill => includesTerm(job, skill) && !includesTerm(resume, skill));
  return { found, gaps, roleKeywords: [...found, ...gaps] };
}

export function atsReadiness(resume, job, keywords = []) {
  const { found, roleKeywords } = matchSkills(resume, job, keywords);
  return { score: roleKeywords.length ? Math.round((found.length / roleKeywords.length) * 100) : 0, matched: found.length, total: roleKeywords.length };
}

export function verifyBulletEvidence(bullets, resume) {
  return bullets.map(item => {
    const bullet = typeof item === "string" ? { text: item, evidence: "", needsInput: true } : item;
    const evidence = typeof bullet.evidence === "string" ? bullet.evidence.trim() : "";
    const evidenceVerified = Boolean(evidence) && normalizeText(resume).includes(normalizeText(evidence));
    return {
      text: String(bullet.text || ""),
      evidence: evidenceVerified ? evidence : "",
      needsInput: Boolean(bullet.needsInput) || !evidenceVerified
    };
  });
}
