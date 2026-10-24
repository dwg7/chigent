/**
 * Copilot の答えを採点する。
 *   node scripts/grade.ts answers.json
 * answers.json は { "問いのid": "返ってきたURL" または null(URLを返さなかった) }。
 * 回答文も採点するときは { "url": URLまたはnull, "text": 回答文 }(scripts/collect-answers.ts --text)。
 * 問いは tests/questions/cases.json。
 */
import { readFileSync } from "node:fs";
import { gradeAnswer, splitAnswerValue, type AnswerValue, type QuestionCase } from "../src/grade.ts";

const cases: QuestionCase[] = JSON.parse(readFileSync(new URL("../tests/questions/cases.json", import.meta.url), "utf8"));
const answers: Record<string, AnswerValue> = JSON.parse(readFileSync(process.argv[2] ?? "answers.json", "utf8"));
let pass = 0, total = 0;
for (const c of cases) {
  if (!(c.id in answers)) { console.log(`-    ${c.id}: (no answer)`); continue; }
  total++;
  const a = splitAnswerValue(answers[c.id]);
  const g = gradeAnswer(c, a.url, undefined, a.text, a.repairs);
  if (g.pass) pass++;
  console.log(`${g.pass ? "PASS" : "FAIL"} ${c.id}: ${c.question}`);
  for (const f of g.failures) console.log(`       ✗ ${f}`);
  for (const w of g.warnings) console.log(`       ! ${w}`);
}
console.log(`\n${pass}/${total} passed`);
process.exitCode = pass === total ? 0 : 1;
