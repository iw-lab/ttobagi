/**
 * 세 검증 레인의 결과를 모아 «뺄 문항»을 정한다.
 *
 * 🔴 「검사했다」와 「깨끗하다」를 구분한다. 응답이 없거나 개수가 안 맞는 배치의 문항은
 *    **검사하지 않은 것**이지 깨끗한 것이 아니다 — unchecked.json 으로 따로 낸다.
 * 🔴 지적된 문항은 «고치지» 않고 **뺀다.** 고친 문장은 아무도 검사하지 않은 새 문장이다.
 *
 * 🔴 코드마다 «몇 레인이 지적해야 빼는가»가 다르다.
 *    A 철자 · B 문법 · D 부호/대문자 = **객관적**이다. 한 레인만 지적해도 뺀다
 *      (틀린 철자를 「다른 둘은 괜찮다고 했다」며 남길 이유가 없다).
 *    C 표현 · E 어휘등급 · F 포인트 = **판단**이다. 두 레인 이상이 같이 지적해야 뺀다.
 *      실측(2026-09-10): 첫 103문항의 지적 5건이 전부 E 였고 그중에 frog·pot·mud 가 있었다 —
 *      교육과정 어휘 등급표로는 «중고 공통»이 맞지만 파닉스 단모음 급수에서 빼면
 *      가르칠 낱말이 남지 않는다. **한 계열의 엄격한 잣대가 곧 정답은 아니다.**
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readVerdict } from './read-verdict.mjs';

const index = JSON.parse(readFileSync('/tmp/gen-en/xval-index.json', 'utf8'));
const flagged = new Map();   // "id\ttext" -> [{lane, code, why}]
const checked = new Set();
let jobsOk = 0, jobsBad = 0;

for (const job of index) {
  const lane = job.name.slice(0, 2);
  const v = readVerdict(job.out, job.count);
  if (!v.ok) { jobsBad++; continue; }
  const d = v.data;
  jobsOk++;
  for (const [id, text] of job.rows) checked.add(`${id}\t${text}`);
  for (const b of d.bad) {
    const i = Number(b.n) - 1;
    if (!Number.isInteger(i) || i < 0 || i >= job.rows.length) continue;
    const [id, text] = job.rows[i];
    const key = `${id}\t${text}`;
    if (!flagged.has(key)) flagged.set(key, []);
    flagged.get(key).push({ lane, code: String(b.code ?? '?'), why: String(b.why ?? '').slice(0, 120) });
  }
}

const all = new Set(index.flatMap((j) => j.rows.map(([id, t]) => `${id}\t${t}`)));
const unchecked = [...all].filter((k) => !checked.has(k));

const OBJECTIVE = new Set(['A', 'B', 'D']);
const all2 = [...flagged].map(([key, hits]) => {
  const [id, text] = key.split('\t');
  return { id, text, hits };
});
const out = all2.filter((f) => {
  const lanes = new Set(f.hits.filter((h) => OBJECTIVE.has(h.code)).map((h) => h.lane));
  if (lanes.size >= 1) return true;                       // 객관적 오류 — 한 레인이면 충분
  const judge = new Set(f.hits.map((h) => h.lane));
  return judge.size >= 2;                                 // 판단 — 두 레인 이상 합의
});
const kept = all2.filter((f) => !out.includes(f));
writeFileSync('/tmp/gen-en/flagged.json', JSON.stringify(out, null, 1));
writeFileSync('/tmp/gen-en/unchecked.json', JSON.stringify(
  unchecked.map((k) => { const [id, text] = k.split('\t'); return { id, text }; }), null, 1));

const byCode = new Map();
for (const f of out) for (const h of f.hits) byCode.set(h.code, (byCode.get(h.code) ?? 0) + 1);
writeFileSync('/tmp/gen-en/kept-despite-flag.json', JSON.stringify(kept, null, 1));
console.log(`배치 — 쓸 수 있음 ${jobsOk} · 못 씀 ${jobsBad}`);
console.log(`문항 ${all.size} · 검사됨 ${checked.size} · 검사 안 됨 ${unchecked.length}`);
const multi = out.filter((f) => new Set(f.hits.map((h) => h.lane)).size > 1).length;
console.log(`지적된 문항 ${out.length}개 (두 레인 이상이 지적 ${multi}개)`);
console.log('사유별(뺀 것):', [...byCode].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(' · '));
console.log(`한 레인만 판단(C·E·F)이라 남긴 문항 ${kept.length}개`);
console.log(out.slice(0, 25).map((f) => `  ${f.id} 「${f.text}」 ${f.hits.map((h) => `${h.lane}:${h.code} ${h.why}`).join(' | ')}`).join('\n'));
