import test from "node:test";
import assert from "node:assert/strict";
import { atsReadiness, matchSkills, verifyBulletEvidence } from "../career-utils.mjs";

test("job coverage matches supplied role keywords instead of a fixed skill list", () => {
  const resume = "Built GraphQL services and led Mentoring sessions for engineers.";
  const keywords = ["GraphQL", "Mentoring", "Kubernetes"];
  assert.deepEqual(matchSkills(resume, "", keywords), {
    found: ["GraphQL", "Mentoring"],
    gaps: ["Kubernetes"],
    roleKeywords: keywords
  });
  assert.deepEqual(atsReadiness(resume, "", keywords), { score: 67, matched: 2, total: 3 });
});

test("keyword matching uses whole phrases and ignores casing and punctuation", () => {
  const result = matchSkills("Worked with CI/CD and Node.js.", "", ["CI/CD", "Node.js", "Node"]);
  assert.deepEqual(result.found, ["CI/CD", "Node.js"]);
  assert.deepEqual(result.gaps, ["Node"]);
});

test("bullet evidence is accepted only when its excerpt appears in the resume", () => {
  const bullets = verifyBulletEvidence([
    { text: "Built a React dashboard", evidence: "Built a React dashboard", needsInput: false },
    { text: "Improved results by 40%", evidence: "Improved results by 40%", needsInput: false },
    { text: "Increased speed by [add metric]", evidence: "", needsInput: true }
  ], "Built a React dashboard for customer support.");
  assert.deepEqual(bullets, [
    { text: "Built a React dashboard", evidence: "Built a React dashboard", needsInput: false },
    { text: "Improved results by 40%", evidence: "", needsInput: true },
    { text: "Increased speed by [add metric]", evidence: "", needsInput: true }
  ]);
});

test("legacy string bullets are treated as unverified drafts", () => {
  assert.deepEqual(verifyBulletEvidence(["Shipped a major feature"], "Developer"), [
    { text: "Shipped a major feature", evidence: "", needsInput: true }
  ]);
});
