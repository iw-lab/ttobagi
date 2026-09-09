/**
 * 10개를 못 채운 급수만 골라 «보충» 배치를 만든다.
 *
 * 이미 채택된 문항을 그대로 다시 받아 봐야 중복으로 또 탈락한다. 그래서 무엇을 이미 썼는지
 * 프롬프트에 적어 준다 — 「겹치지 마라」는 말만으로는 모델이 무엇과 겹치면 안 되는지 모른다.
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
    const d = JSON.parse(raw.replace(/^```json\s*|```\s*$/g, '').trim());
    for (const [id, it] of Object.entries(d)) if (Array.isArray(it)) got.set(id, [...(got.get(id) ?? []), ...it]);
  } catch { /* 못 받은 것 */ }
}

const short = [];
for (const s of sheets) {
  const { ok } = verifySheet(s, got.get(s.id) ?? [], seen);
  if (ok.length < 10) short.push({ sheet: s, have: ok });
}

const RULES = `너는 초등학교 국어 받아쓰기 급수표를 만드는 교사다. 아래 급수마다 받아쓰기 문항을 지어라.

반드시 지킬 것
1. 한글 맞춤법·띄어쓰기 규정을 정확히 지킨다. 조금이라도 자신 없으면 그 문장을 쓰지 말고 다른 문장을 지어라.
2. 급수의 「학습 포인트」가 실제로 드러나야 한다.
3. 글자 수는 공백 포함 지정 범위 안에 들어야 한다.
4. 초등학생에게 적합한 내용. 실존 인물·상표·특정 지역명·종교·정치 소재를 쓰지 않는다.
5. 「문장」이라고 적힌 급수는 마침표·물음표·느낌표 중 하나로 끝낸다.
   「낱말」이라고 적힌 급수는 낱말만 쓰고 문장 부호를 붙이지 않는다.
6. 문장 부호 뒤에는 한 칸 띄운다. 숫자는 한글로 적는다(세 개, 다섯 명).
7. 「이미 쓴 것」에 적힌 것과 겹치면 안 된다. 뜻이 비슷한 것도 피한다.
8. 남의 말을 옮길 때는 큰따옴표 “ ” 를, 그 안의 인용에는 작은따옴표 ‘ ’ 를 쓴다.
   곧은따옴표(")는 절대 쓰지 마라 — JSON 이 깨진다.

출력은 JSON 객체 하나만. 설명·코드펜스·머리말 금지.
형식: {"급수id": ["문항1", "문항2", ...], ...}`;

const jobs = [];
for (let i = 0; i < short.length; i += 3) {
  const grp = short.slice(i, i + 3);
  const spec = grp.map(({ sheet: s, have }) => {
    const kind = s.kind === 'word' ? '낱말(문장 아님 — 마침표 붙이지 말 것)' : '문장';
    const need = 10 - have.length + 8;   // 모자란 만큼 + 여유 8개(또 탈락할 것을 감안)
    return `- 급수id "${s.id}" · ${s.grade}학년 ${s.semester}학기 · 제목 「${s.title}」 · 학습 포인트 「${s.point}」 · ${kind} · 글자 수 ${s.minLen}~${s.maxLen}자 · ${need}개
  이미 쓴 것(겹치지 말 것): ${have.length ? have.join(', ') : '(없음)'}`;
  }).join('\n');
  jobs.push({
    name: grp.map((g) => g.sheet.id).join('+'),
    prompt: `${RULES}\n\n${spec}`,
    out: `/tmp/gen5x/out/topup-${grp[0].sheet.id}.json`,
  });
}

writeFileSync('/tmp/gen5x/topup.jsonl', jobs.map((j) => JSON.stringify(j)).join('\n') + (jobs.length ? '\n' : ''));
console.log(`보충할 급수 ${short.length}개 · 작업 ${jobs.length}건`);
for (const { sheet, have } of short) console.log(`  ${sheet.id} ${have.length}개 → ${10 - have.length}개 더 필요`);
