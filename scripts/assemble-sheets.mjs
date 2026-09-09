/**
 * 기계 검증을 통과한 문항을 모은다 — 아직 «확정»이 아니다.
 * 여기서는 10개로 자르지 않는다. 교차검증이 몇 개를 빼갈지 모르므로 여유분을 남겨 둔다.
 * 확정·번호 재부여는 검증이 끝난 뒤 finalize-sheets.mjs 가 한다.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { loadExisting, verifySheet } from './verify-items.mjs';

const sheets = JSON.parse(readFileSync('/tmp/gen5x/sheets.json', 'utf8'));
const seen = new Map();
for (const t of loadExisting()) seen.set(t.replace(/[\s.,!?'"…·:;—「」『』()]/g, ''), '기존');

const got = new Map();
for (const f of readdirSync('/tmp/gen5x/out').filter((x) => x.endsWith('.json'))) {
  try {
    const raw = readFileSync(`/tmp/gen5x/out/${f}`, 'utf8').split('\n---\n')[0];
    const data = JSON.parse(raw.replace(/^```json\s*|```\s*$/g, '').trim());
    // 🔴 덮어쓰지 말고 «잇는다». 보충분 파일이 같은 급수를 다시 담고 있을 때
    //    set 으로 덮으면 원본 문항이 통째로 사라진다(보충하려다 줄어든다).
    for (const [id, items] of Object.entries(data)) {
      if (Array.isArray(items)) got.set(id, [...(got.get(id) ?? []), ...items]);
    }
  } catch { /* 파싱 실패는 «못 받은 것»으로 친다 */ }
}

const ready = [];
const missing = [];
for (const s of sheets) {
  const items = got.get(s.id);
  if (!items) { missing.push(`${s.id}(못 받음)`); continue; }
  const { ok } = verifySheet(s, items, seen);
  if (ok.length < 10) { missing.push(`${s.id}(${ok.length}개)`); continue; }
  ready.push({ ...s, items: ok });   // 여유분까지 전부 — 검증 뒤에 10개를 고른다
}

writeFileSync('/tmp/gen5x/ready.json', JSON.stringify(ready, null, 1));
writeFileSync('/tmp/gen5x/missing.txt', missing.join('\n'));
const spare = ready.reduce((n, s) => n + s.items.length, 0);
console.log(`후보 급수 ${ready.length} / ${sheets.length}  ·  문항 ${spare}개(급수당 평균 ${(spare / (ready.length || 1)).toFixed(1)})`);
console.log(`모자란 것 ${missing.length}${missing.length ? ': ' + missing.slice(0, 20).join(' ') : ''}`);
