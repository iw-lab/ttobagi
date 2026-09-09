/**
 * 영어 급수표 공정의 «지금 상태»를 한 장으로 낸다.
 * 보고할 때 숫자를 기억으로 쓰지 않기 위해 있다 — 세는 것은 기계가 한다.
 */
import { existsSync, readFileSync } from 'node:fs';

const j = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const ready = j('/tmp/gen-en/ready.json') ?? [];
const final = j('/tmp/gen-en/final.json');
const flagged = j('/tmp/gen-en/flagged.json') ?? [];
const kept = j('/tmp/gen-en/kept-despite-flag.json') ?? [];
const unchecked = j('/tmp/gen-en/unchecked.json') ?? [];

const items = ready.reduce((n, s) => n + s.items.length, 0);
const dist = {};
for (const s of ready) dist[s.items.length] = (dist[s.items.length] ?? 0) + 1;

console.log('── 영어 급수표 공정 상태 ──');
console.log(`모은 급수 ${ready.length} · 문항 ${items}`);
console.log(`  10개 미만 ${ready.filter((s) => s.items.length < 10).length} · 12개 미만 ${ready.filter((s) => s.items.length < 12).length}`);
console.log(`  문항 수 분포 ${JSON.stringify(Object.fromEntries(Object.entries(dist).sort((a, b) => a[0] - b[0])))}`);
console.log(`교차검증 — 뺀 문항 ${flagged.length} · 한 레인만 지적이라 남긴 것 ${kept.length} · 검사 안 된 문항 ${unchecked.length}`);
if (final) {
  const per = {};
  for (const s of final) per[`${s.grade}-${s.semester}`] = (per[`${s.grade}-${s.semester}`] ?? 0) + 1;
  console.log(`확정 ${final.length}급 · ${final.length * 10}문항`);
  console.log(`  학기별 ${Object.entries(per).sort().map(([k, v]) => `${k}:${v}`).join(' ')}`);
  const words = new Set();
  for (const s of final) for (const t of s.items) {
    for (const w of t.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean)) words.add(w);
  }
  console.log(`  서로 다른 낱말 ${words.size}개 (2022 개정 초등 권장 어휘 800~900)`);
} else {
  console.log('확정(final.json) 아직 없음');
}
