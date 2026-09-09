/**
 * 생성 결과를 «어디서 얼마나 새는지» 로 요약한다.
 * 총계만 보면 「2822 통과」로 괜찮아 보이는데, 실제로는 특정 급수 유형에서만 무더기로 샌다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { loadExisting, verifySheet } from './verify-items.mjs';

const sheets = JSON.parse(readFileSync('/tmp/gen5x/sheets.json', 'utf8'));
const seen = new Map();
for (const t of loadExisting()) seen.set(t.replace(/[\s.,!?'"…·:;—「」『』()]/g, ''), '기존');

const got = new Map();
for (const f of readdirSync('/tmp/gen5x/out').filter((x) => x.endsWith('.json'))) {
  try {
    const raw = readFileSync(`/tmp/gen5x/out/${f}`, 'utf8').split('\n---\n')[0];
    const d = JSON.parse(raw.replace(/^```json\s*|```\s*$/g, '').trim());
    for (const [id, it] of Object.entries(d)) if (Array.isArray(it)) got.set(id, it);
  } catch { /* 못 받은 것으로 친다 */ }
}

const byKind = {};
const reasons = {};
const shortIds = [];
for (const s of sheets) {
  const items = got.get(s.id);
  if (!items) continue;
  const { ok, dropped } = verifySheet(s, items, seen);
  const k = `${s.grade}학년 ${s.kind === 'word' ? '낱말' : '문장'}${s.kind === 'word' ? `(${s.point})` : ''}`;
  byKind[k] = byKind[k] ?? { got: 0, short: 0 };
  byKind[k].got++;
  if (ok.length < 10) { byKind[k].short++; shortIds.push(`${s.id}:${ok.length}`); }
  for (const d of dropped) {
    for (const w of d.why.split(', ')) {
      const key = w.startsWith('중복') ? '중복' : w.startsWith('길이') ? '길이' : w;
      reasons[key] = (reasons[key] ?? 0) + 1;
    }
  }
}

console.log(`받은 급수 ${got.size} / ${sheets.length}`);
console.log('\n유형별 (받음 / 10개 미달):');
for (const [k, v] of Object.entries(byKind).sort()) {
  const flag = v.short / v.got > 0.3 ? '  ← 샌다' : '';
  console.log(`  ${k.padEnd(22)} ${String(v.got).padStart(3)} / ${String(v.short).padStart(3)}${flag}`);
}
console.log('\n탈락 사유:');
for (const [k, v] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) console.log(`  ${k} ${v}`);
console.log(`\n10개 미달 급수 ${shortIds.length}개`);
