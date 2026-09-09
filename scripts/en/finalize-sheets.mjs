/**
 * 지적된 문항을 빼고 → 급수마다 10개를 고르고 → 번호를 한 번만 다시 매긴다.
 *
 * 🔴 번호는 «문항이 확정된 뒤 한 번만» 매긴다. 음원 경로가 급수 id 를 쓰기 때문에
 *    번호를 두 번 매기면 소리와 문항이 통째로 어긋난다.
 * 🔴 지적된 문항은 고치지 않고 뺀다 — 고친 문장은 아무도 검사하지 않은 새 문장이다.
 * 🔴 검사되지 않은 문항도 뺀다. 「검사에 실패했다」와 「깨끗하다」는 다른 상태다.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ready = JSON.parse(readFileSync('/tmp/gen-en/ready.json', 'utf8'));
const flagged = existsSync('/tmp/gen-en/flagged.json')
  ? JSON.parse(readFileSync('/tmp/gen-en/flagged.json', 'utf8')) : [];
const unchecked = existsSync('/tmp/gen-en/unchecked.json')
  ? JSON.parse(readFileSync('/tmp/gen-en/unchecked.json', 'utf8')) : [];

const STRICT = !process.argv.includes('--allow-unchecked');
const out = new Set(flagged.map((f) => `${f.id}\t${f.text}`));
if (STRICT) for (const u of unchecked) out.add(`${u.id}\t${u.text}`);

const final = [];
const dropped = [];
for (const s of ready) {
  const kept = s.items.filter((t) => !out.has(`${s.id}\t${t}`));
  if (kept.length < 10) { dropped.push({ id: s.id, have: kept.length }); continue; }
  final.push({ ...s, items: kept.slice(0, 10) });
}

// 학기마다 1급부터 구멍 없이 다시 매긴다
const next = new Map();
for (const s of final) {
  const k = `${s.grade}-${s.semester}`;
  const lv = next.get(k) ?? 1;
  next.set(k, lv + 1);
  s.level = lv;
  s.id = `e${s.grade}-${s.semester}-${String(lv).padStart(2, '0')}`;
}

writeFileSync('/tmp/gen-en/final.json', JSON.stringify(final, null, 1));
console.log(`뺀 문항 — 지적 ${flagged.length} · 미검사 ${STRICT ? unchecked.length : 0}`);
console.log(`확정 급수 ${final.length}개 · 문항 ${final.length * 10}개 · 10개를 못 채워 버린 급수 ${dropped.length}개`);
for (const [k, v] of [...next].sort()) console.log(`  ${k}학기 ${v - 1}급`);
if (dropped.length) console.log('버린 급수:', dropped.slice(0, 20).map((d) => `${d.id}(${d.have})`).join(' '));
