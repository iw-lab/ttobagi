/**
 * 교차검증까지 끝난 문항으로 «확정» 급수표를 만든다.
 *
 * 🔴 순서가 중요하다: 지적된 문항을 뺀 뒤에 10개를 고르고, 그 뒤에 급수 번호를 매긴다.
 * 먼저 번호를 매기면 탈락한 급수 자리에 구멍이 남는다(11, 12, 14…). 아이가 보는 «급»에
 * 구멍이 있으면 안 되고, 음원 경로도 이 id 를 그대로 쓴다.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ready = JSON.parse(readFileSync('/tmp/gen5x/ready.json', 'utf8'));
const flagged = existsSync('/tmp/gen5x/flagged.json')
  ? JSON.parse(readFileSync('/tmp/gen5x/flagged.json', 'utf8'))
  : [];
if (!flagged.length) console.log('⚠ 지적 목록이 비어 있다 — 교차검증을 돌렸는지 확인할 것');

const out = new Set(flagged.map((f) => `${f.id} ${f.text}`));

const final = [];
const dropped = [];
for (const s of ready) {
  const kept = s.items.filter((t) => !out.has(`${s.id} ${t}`));
  if (kept.length < 10) { dropped.push(`${s.id}(${kept.length}개)`); continue; }
  final.push({ ...s, items: kept.slice(0, 10) });
}

// 학기별로 11급부터 다시 이어 붙인다 (기존 내장 급수표가 1~10급을 쓴다)
const next = new Map();
for (const s of final) {
  const k = `${s.grade}-${s.semester}`;
  const lv = next.get(k) ?? 11;
  next.set(k, lv + 1);
  s.level = lv;
  s.id = `g${s.grade}-${s.semester}-${String(lv).padStart(2, '0')}`;
}

const esc = (t) => t.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const src = final.map((s) => `  {
    id: '${s.id}', grade: ${s.grade}, semester: ${s.semester}, level: ${s.level},
    title: '${esc(s.title)}', point: '${esc(s.point)}',
    items: [${s.items.map((t) => `'${esc(t)}'`).join(', ')}],
  },`).join('\n');

writeFileSync('/tmp/gen5x/new-sheets.ts', src + '\n');
writeFileSync('/tmp/gen5x/final.json', JSON.stringify(final, null, 1));
console.log(`확정 급수 ${final.length}개 · 문항 ${final.length * 10}개`);
console.log(`검증으로 탈락한 급수 ${dropped.length}${dropped.length ? ': ' + dropped.slice(0, 20).join(' ') : ''}`);
for (const [k, v] of [...next].sort()) console.log(`  ${k}학기 → 11~${v - 1}급 (${v - 11}개)`);
