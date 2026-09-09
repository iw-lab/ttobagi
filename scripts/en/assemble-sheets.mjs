/**
 * 받은 문항을 검증기에 통과시켜 «여유분까지 전부» 모은다.
 *
 * 🔴 여기서는 10개로 자르지도, 번호를 다시 매기지도 않는다.
 *    교차검증에서 걸러 낼 문항이 있으므로 여유분을 남겨야 한다.
 *    번호를 먼저 매기면 나중에 급수가 빠질 때 «구멍»이 생긴다(국어에서 실제로 났다).
 * 🔴 덮어쓰지 말고 «잇는다» — 보충분 파일이 같은 급수를 다시 담고 있을 때
 *    set 으로 덮으면 원본 문항이 통째로 사라진다(보충하려다 줄어든다).
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { readItems, verifySheet } from './verify-items.mjs';

const sheets = JSON.parse(readFileSync('/tmp/gen-en/sheets.json', 'utf8'));
const got = new Map();
let files = 0, broken = 0;
for (const f of readdirSync('/tmp/gen-en/out').filter((x) => x.endsWith('.json'))) {
  const data = readItems(`/tmp/gen-en/out/${f}`);
  if (!Object.keys(data).length) { broken++; continue; }
  files++;
  for (const [id, items] of Object.entries(data)) {
    got.set(id, [...(got.get(id) ?? []), ...items]);
  }
}

const seen = new Map();
const ready = [];
const shortOnes = [];
const dropLog = [];
for (const s of sheets) {
  const items = got.get(s.id) ?? [];
  const { ok, dropped } = verifySheet(s, items, seen);
  for (const d of dropped) dropLog.push(`${s.id}: ${d.text} — ${d.why}`);
  if (ok.length < 10) shortOnes.push({ id: s.id, have: ok.length });
  ready.push({ ...s, items: ok });
}
writeFileSync('/tmp/gen-en/ready.json', JSON.stringify(ready, null, 1));
writeFileSync('/tmp/gen-en/short.json', JSON.stringify(shortOnes, null, 1));
writeFileSync('/tmp/gen-en/drops.txt', dropLog.join('\n'));
const total = ready.reduce((n, s) => n + s.items.length, 0);
console.log(`파일 ${files}개(깨짐 ${broken}) · 급수 ${ready.length} · 통과 문항 ${total} · 10개 미만 ${shortOnes.length}개`);
if (shortOnes.length) console.log(shortOnes.slice(0, 20).map((x) => `  ${x.id} ${x.have}개`).join('\n'));
