/**
 * Copilot の答えを採点する。
 *   node scripts/grade.ts answers.json
 * answers.json は { "問いのid": "返ってきたURL" または null(URLを返さなかった) }。
 * 問いは tests/questions/cases.json。
 */
import { readFileSync } from "node:fs";
import { gradeAnswer, type QuestionCase } from "../src/grade.ts";

const cases: QuestionCase[] = JSON.parse(readFileSync(new URL("../tests/questions/cases.json", import.meta.url), "utf8"));
const answers: Record<string, string | null> = JSON.parse(readFileSync(process.argv[2] ?? "answers.json", "utf8"));
let pass = 0, total = 0;
for (const c of cases) {
  if (!(c.id in answers)) { console.log(`-    ${c.id}: (no answer)`); continue; }
  total++;
  const g = gradeAnswer(c, answers[c.id]);
  if (g.pass) pass++;
  console.log(`${g.pass ? "PASS" : "FAIL"} ${c.id}: ${c.question}`);
  for (const f of g.failures) console.log(`       ✗ ${f}`);
  for (const w of g.warnings) console.log(`       ! ${w}`);
}
console.log(`\n${pass}/${total} passed`);
process.exitCode = pass === total ? 0 : 1;
