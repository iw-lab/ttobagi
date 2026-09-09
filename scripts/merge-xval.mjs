/**
 * 교차검증 결과를 모은다. 한 계열이라도 지적한 문항은 «뺀다»(사용자 지시).
 * 지적을 고쳐 넣지 않는 이유: 고친 문장은 아무도 검사하지 않은 새 문장이다.
 *
 * 🔴 「검사했다」와 「검사 안 됐다」를 반드시 구분해 센다. 파싱이 깨진 묶음을
 * 「지적 없음」으로 세면 **검사하지 않은 문항이 통과한 문항으로 둔갑한다.**
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';

const flat = JSON.parse(readFileSync('/tmp/gen5x/flat.json', 'utf8'));
const lanes = process.argv.slice(2);
const flagged = new Map();          // index -> [{lane, code, why}]
const checked = new Map();          // index -> Set(lane)

for (const lane of lanes) {
  const dir = `/tmp/gen5x/xval-${lane}`;
  if (!existsSync(dir)) { console.log(`(${lane} 레인 결과 없음)`); continue; }
  let files = 0, broken = 0, findings = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const from = Number(f.slice(1, 6));
    let data;
    try {
      const raw = readFileSync(`${dir}/${f}`, 'utf8').split('\n---\n')[0];
      data = JSON.parse(raw.replace(/^```json\s*|```\s*$/g, '').trim());
    } catch { broken++; continue; }
    // 옛 형식(배열)도 받아 준다
    const bad = Array.isArray(data) ? data : (Array.isArray(data.bad) ? data.bad : null);
    const n = Array.isArray(data) ? null : Number(data.n);
    if (!bad) { broken++; continue; }
    files++;
    // 이 묶음이 실제로 덮은 문항에 «검사됨» 표시
    const span = Number.isFinite(n) && n > 0 ? n : 50;
    for (let k = 0; k < span && flat[from + k]; k++) {
      if (!checked.has(from + k)) checked.set(from + k, new Set());
      checked.get(from + k).add(lane);
    }
    for (const hit of bad) {
      const idx = from + (Number(hit.n) - 1);
      if (!flat[idx]) continue;
      findings++;
      if (!flagged.has(idx)) flagged.set(idx, []);
      flagged.get(idx).push({ lane, code: hit.code, why: hit.why });
    }
  }
  console.log(`${lane}: 묶음 ${files}개 검사 · 깨진 묶음 ${broken}개 · 지적 ${findings}건`);
}

const unchecked = flat.map((_, i) => i).filter((i) => !checked.has(i));
const out = [...flagged.entries()].map(([i, hits]) => ({ ...flat[i], idx: i, hits }));
writeFileSync('/tmp/gen5x/flagged.json', JSON.stringify(out, null, 1));
writeFileSync('/tmp/gen5x/unchecked.json', JSON.stringify(unchecked));

console.log(`\n검사된 문항 ${flat.length - unchecked.length} / ${flat.length}`);
if (unchecked.length) console.log(`⚠ 아무 레인도 검사하지 못한 문항 ${unchecked.length}개 — 그대로 두면 «검사 없이 통과»다`);
console.log(`지적된 문항 ${out.length} / ${flat.length}`);
const byCode = {};
for (const o of out) for (const h of o.hits) byCode[h.code] = (byCode[h.code] ?? 0) + 1;
for (const [k, v] of Object.entries(byCode).sort()) console.log(`  ${k} ${v}`);
