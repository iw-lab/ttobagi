/**
 * 문장 전환분의 교차검증 판정을 «합의 규칙»으로 병합한다.
 *
 * 🔴 규칙은 국어·영어 공정과 같다.
 *   객관 코드 A(철자)·B(문법)·D(부호·대문자) — **1계열이면 충분**하다.
 *     기계로 확인 가능한 사실이라 두 번 물을 필요가 없다.
 *   판정 코드 C(표현)·E(어휘등급)·F(포인트) — **2계열 이상이 같은 줄을 지적**해야 뺀다.
 *     한 계열만 지적한 것은 취향일 수 있고, 오탐 하나가 멀쩡한 문항을 죽인다.
 *
 * 🔴 «지적받지 않았다»와 «검사받지 않았다»를 구분해 낸다. 레인이 죽어서 안 본 것을
 *    「통과」로 세면 교차검증했다는 보고 뒤에 구멍이 숨는다.
 *
 * 사용: node scripts/en/merge-sentence-xval.mjs [--dir /tmp/gen-en2]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const DIR = arg('dir', '/tmp/gen-en2');

const OBJECTIVE = new Set(['A', 'B', 'D']);

/** 답 안에서 «파싱되는 마지막 판정 객체»만 꺼낸다 */
function readVerdict(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('{'));
  for (let i = lines.length - 1; i >= 0; i--) {
    try { const d = JSON.parse(lines[i]); if (Array.isArray(d.bad)) return d; } catch { /* 다음 줄 */ }
  }
  return null;
}
const batches = JSON.parse(readFileSync(join(DIR, 'xval-map.json'), 'utf8'));
const LANES = ['gpt', 'gemini', 'agy'];

const flags = new Map();   // "id\t문장" → [{lane, code, why}]
const checked = new Map(); // "id\t문장" → 본 레인 수
let missing = 0;

for (const b of batches) {
  const seen = [];
  for (const lane of LANES) {
    const f = join(DIR, `v-${lane}-${b.name}.json`);
    if (!existsSync(f)) continue;
    // 🔴 브릿지 답에는 「--- 출처 대화: …」 같은 꼬리가 붙는다. 통짜로 JSON.parse 하면
    //    조용히 실패하고 «지적 0건»으로 보인다 — 검사가 통과한 것처럼 보이는 가장 나쁜 실패다
    //    (2026-09-10 실측: 12개 판정 파일이 전부 0건으로 읽혔다).
    const v = readVerdict(readFileSync(f, 'utf8'));
    if (!v) continue;
    seen.push(lane);
    for (const bad of v.bad) {
      const idx = Number(bad.n) - 1;
      const pair = b.map[idx];
      if (!pair) continue;
      const key = pair.join('\t');
      (flags.get(key) ?? flags.set(key, []).get(key)).push({ lane, code: String(bad.code ?? '?'), why: bad.why ?? '' });
    }
  }
  for (const pair of b.map) checked.set(pair.join('\t'), seen.length);
  if (!seen.length) missing += b.map.length;
}

const drop = [];
const kept = [];
for (const [key, list] of flags) {
  const obj = list.filter((x) => OBJECTIVE.has(x.code));
  const lanes = new Set(list.filter((x) => !OBJECTIVE.has(x.code)).map((x) => x.lane));
  if (obj.length) drop.push({ key, why: `${obj[0].code} ${obj[0].why}`, by: obj.map((x) => x.lane).join('+') });
  else if (lanes.size >= 2) drop.push({ key, why: `${list[0].code} ${list[0].why}`, by: [...lanes].join('+') });
  else kept.push({ key, why: `${list[0].code} ${list[0].why}`, by: [...lanes][0] });
}

const total = checked.size;
const unchecked = [...checked.values()].filter((n) => n === 0).length;
console.log(`문항 ${total}개 · 검사한 레인 ${LANES.filter((l) => existsSync(join(DIR, `v-${l}-${batches[0].name}.json`))).join('+') || '없음'}`);
console.log(`지적받은 문항 ${flags.size} · 뺄 것 ${drop.length} · 한 계열만 지적해 남긴 것 ${kept.length}`);
if (unchecked) console.log(`🔴 아무 레인도 안 본 문항 ${unchecked}개 — 「교차검증했다」고 말하면 안 된다`);

if (drop.length) {
  console.log('\n뺄 문항');
  for (const d of drop) console.log(`  [${d.by}] ${d.key.replace('\t', ' | ')}\n      ${d.why}`);
}
if (kept.length) {
  console.log(`\n한 계열만 지적해 남긴 것 ${kept.length}개 (설계상 유지)`);
  for (const k of kept.slice(0, 15)) console.log(`  [${k.by}] ${k.key.split('\t')[1]} — ${k.why}`);
}
writeFileSync(join(DIR, 'xval-drop.json'), JSON.stringify(drop.map((d) => d.key.split('\t')), null, 1));
console.log(`\n→ ${join(DIR, 'xval-drop.json')}`);
