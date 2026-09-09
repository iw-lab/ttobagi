/**
 * 끊긴 교차검증 배치를 이어서 돌릴 작업 파일을 만든다.
 * 🔴 「파일이 있다」가 아니라 「파싱되고 bad 가 배열이고 n 이 보낸 개수와 같다」로 본다.
 *    n 이 다르면 모델이 일부만 보고 답한 것이다 — 검사하지 않은 문항을 «깨끗하다»고 세면 안 된다.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { readVerdict } from './read-verdict.mjs';

const index = JSON.parse(readFileSync('/tmp/gen-en/xval-index.json', 'utf8'));
const want = new Map(index.map((j) => [j.name, j.count]));

for (const lane of ['gemini', 'gpt', 'codex']) {
  const path = `/tmp/gen-en/xval-${lane}.jsonl`;
  if (!existsSync(path)) continue;
  const jobs = readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const left = [];
  const why = new Map();
  for (const j of jobs) {
    const v = readVerdict(j.out, want.get(j.name));
    const r = v.ok ? null : v.why;
    if (r) { left.push(j); const k = r.replace(/\(.*/, ''); why.set(k, (why.get(k) ?? 0) + 1); }
  }
  writeFileSync(`/tmp/gen-en/xval-${lane}-resume.jsonl`, left.map((j) => JSON.stringify(j)).join('\n') + (left.length ? '\n' : ''));
  console.log(`${lane}: 전체 ${jobs.length} · 남음 ${left.length}  ${[...why].map(([k, v]) => `${k} ${v}`).join(' · ')}`);
}
