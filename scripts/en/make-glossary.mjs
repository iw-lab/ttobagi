/**
 * 영어 문항의 한국어 뜻 만들기 — 받아서(웹 브릿지) 거르고(여기) 내보낸다(--emit).
 *
 * 공정 (CLAUDE.md 「대량 콘텐츠 생성 = 웹 브릿지 1순위」 그대로):
 *   1) node scripts/en/_gloss-prep.mjs          → /tmp/gloss/{items.json,jobs.jsonl} (50개씩)
 *   2) ~/.claude/venvs/vibes/bin/python ~/.claude/bin/gpt-web.py \
 *        --batch /tmp/gloss/jobs.jsonl --chat-every 12 --gap 12 --retries 2 --min-chars 800
 *      🚫 단발을 루프로 돌리지 말 것 — 호출마다 «대화»가 생겨 레이트리밋에 걸린다.
 *   3) node scripts/en/make-glossary.mjs        → 커버리지·형식 점검만
 *   4) node scripts/en/make-glossary.mjs --emit → src/engine/glossary-en.ts
 *
 * 🔴 받은 것을 그대로 쓰지 않는다. 원문 일치·빈 값·한글 포함·과도한 길이를 전수로 거른다.
 *    빠진 항목은 /tmp/gloss/missing.json 에 남으니 그것만 다시 받아 채운다.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const items = JSON.parse(readFileSync('/tmp/gloss/items.json', 'utf8'));
const want = new Set(items);
const got = new Map();
const bad = [];
for (const f of readdirSync('/tmp/gloss/out').sort()) {
  const raw = readFileSync(`/tmp/gloss/out/${f}`, 'utf8')
    .replace(/^\s*```(json)?/i, '').replace(/```\s*$/, '');
  let arr = null;
  try { arr = JSON.parse(raw); } catch {
    const m = raw.match(/\[[\s\S]*\]/); if (m) { try { arr = JSON.parse(m[0]); } catch {} }
  }
  if (!Array.isArray(arr)) { bad.push(`${f}: 파싱 실패`); continue; }
  for (const o of arr) {
    if (!o || typeof o.en !== 'string' || typeof o.ko !== 'string') continue;
    const en = o.en.trim(), ko = o.ko.trim();
    if (!want.has(en)) { bad.push(`${f}: 원문 불일치 «${en}»`); continue; }
    if (!ko) { bad.push(`${f}: 빈 뜻 «${en}»`); continue; }
    // 한글이 하나도 없으면 뜻이 아니다(영어를 그대로 되돌린 경우)
    if (!/[가-힣]/.test(ko)) { bad.push(`${f}: 한글 없음 «${en}» → «${ko}»`); continue; }
    // 🔴 길이 상한은 «눈대중»으로 걸지 않는다 — 예전에 정상 문항 349개를 그렇게 잃었다.
    //    원문보다 터무니없이 긴 것(설명문이 섞인 경우)만 걷어낸다.
    if (ko.length > Math.max(40, en.length * 3)) { bad.push(`${f}: 지나치게 긴 뜻 «${en}»`); continue; }
    if (got.has(en) && got.get(en) !== ko) continue;   // 먼저 받은 것을 유지
    got.set(en, ko);
  }
}
const missing = items.filter((t) => !got.has(t));
console.log(`고유 ${items.length} · 받은 뜻 ${got.size} · 빠짐 ${missing.length} · 걸러낸 것 ${bad.length}`);
if (bad.length) console.log('  거른 예:', bad.slice(0, 5));
if (missing.length) console.log('  빠짐 예:', missing.slice(0, 8));
writeFileSync('/tmp/gloss/missing.json', JSON.stringify(missing));
if (process.argv.includes('--emit')) {
  const body = items.filter((t) => got.has(t))
    .map((t) => `  ${JSON.stringify(t)}: ${JSON.stringify(got.get(t))},`).join('\n');
  writeFileSync('src/engine/glossary-en.ts',
`/**
 * 영어 문항의 한국어 뜻 — 낱말은 가장 흔한 뜻 하나, 문장은 자연스러운 해석 한 줄.
 *
 * 🔴 이 파일은 **손으로 고치지 말고 다시 만들어라**. 만드는 법은 \`scripts/en/make-glossary.mjs\`.
 *    웹 브릿지(gpt-web)로 받아 «기계로 거른» 결과다 — 커버리지·한글 포함·길이·원문 일치를 전수 검사한다.
 * 🔴 본 번들에 넣지 않는다. 결과 화면이 **영어 기록을 열 때만** 동적 import 로 불러온다
 *    (2,182줄이라 국어만 쓰는 교실의 첫 로딩을 무겁게 할 이유가 없다).
 *
 * 마지막 갱신 ${new Date().toISOString().slice(0, 10)} · ${got.size}개
 */
export const GLOSSARY_EN: Record<string, string> = {
${body}
};
`);
  console.log('→ src/engine/glossary-en.ts 썼다');
}
