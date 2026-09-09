/**
 * 영어 문항 생성용 웹 브릿지 배치 파일을 만든다.
 *
 * 🔴 한 배치 = «같은 초점을 쓰는 급수 2개»다. 연속한 급수 3개로 묶었더니
 *    같은 초점이 다른 배치로 흩어져 같은 낱말이 두 번 나왔다(중복 390건, 2026-09-09).
 *    모델은 자기가 다른 대화에서 뭘 썼는지 모른다 — **겹치면 안 되는 것들을 한 화면에 놓아야** 한다.
 *
 * 두 레인의 속도가 다르다(gpt ≈ 45초/건, gemini ≈ 2분/건 — 거절 재시도 때문).
 * 같이 끝나도록 8:4 로 나눈다. 남는 건 resume-batch 가 줍는다.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const sheets = JSON.parse(readFileSync('/tmp/gen-en/sheets.json', 'utf8'));
mkdirSync('/tmp/gen-en/out', { recursive: true });

const RULES = `너는 한국 초등학교에서 영어를 가르치는 교사다. 한국 초등학생이 «영어 받아쓰기(dictation)»로
연습할 문항을 만든다. 아래 급수마다 문항 13개를 지어라.

반드시 지킬 것
1. **미국식 영어 철자**를 쓴다(color, center, favorite — colour·centre 금지).
   철자가 조금이라도 자신 없으면 그 낱말을 쓰지 말고 다른 것을 지어라.
2. **2022 개정 영어과 교육과정 초등 3~6학년 권장 어휘 범위** 안에서만 쓴다.
   교과서에 나오지 않는 어려운 낱말·전문 용어를 넣지 마라.
3. 급수의 「학습 포인트」가 **실제로 드러나는** 문항이어야 한다.
   예: 「묵음 e」 급수면 cake·bike 처럼 끝의 e 가 소리 나지 않는 낱말만 쓴다.
4. 글자 수(공백 포함)는 지정 범위 안에 들어야 한다.
5. 「낱말」급수: 낱말 **하나만** 쓴다(두 낱말 금지). 마침표를 붙이지 않는다.
   고유명사(요일·달·이름)가 아니면 **모두 소문자**로 쓴다.
   「문장」급수: 첫 글자를 대문자로 쓰고 마침표·물음표·느낌표 중 하나로 끝낸다.
   낱말 두 개 이상으로 짓는다.
6. 초등학생에게 적합한 내용. 실존 인물·상표·특정 지역명·종교·정치 소재를 쓰지 않는다.
7. 🔴 **아래 급수들끼리 같은 낱말·같은 문장을 쓰면 안 된다.** 두 급수를 한꺼번에 보고
   서로 겹치지 않게 지어라. 한 급수 안에서도 첫 낱말과 문장 짜임이 반복되지 않게 한다.
8. 줄임말(it's, don't, I'm)에는 **곧은 작은따옴표 '** 를 쓴다.
   남의 말을 옮길 때만 큰따옴표 “ ” (굽은 것)를 쓴다.
   🔴 **곧은 큰따옴표(") 는 절대 쓰지 마라 — JSON 이 깨진다.**
9. 숫자는 낱말로 적는다(three, ten). 아라비아 숫자를 쓰지 마라.
   줄임말 표기(Mon, Thu, Sept)를 쓰지 마라 — 낱말을 다 쓴다(Monday, Thursday, September).
10. 축약형·소유격이 아닌 곳에 아포스트로피를 넣지 마라.

출력은 JSON 객체 하나만. 설명·코드펜스·머리말 금지.
형식: {"급수id": ["문항1", ..., "문항13"], ...}`;

function sheetSpec(s) {
  const kind = s.kind === 'word'
    ? '낱말 하나(문장 아님 — 마침표 붙이지 말 것)'
    : '문장(대문자로 시작하고 부호로 끝낼 것)';
  return `- 급수id "${s.id}" · ${s.grade}학년 ${s.semester}학기 · 제목 「${s.title}」 · 학습 포인트 「${s.point}」 · ${kind} · 글자 수 ${s.minLen}~${s.maxLen}자`;
}

const byGroup = new Map();
for (const s of sheets) {
  if (!byGroup.has(s.group)) byGroup.set(s.group, []);
  byGroup.get(s.group).push(s);
}

const jobs = [];
for (const group of byGroup.values()) {
  jobs.push({
    name: group.map((g) => g.id).join('+'),
    prompt: `${RULES}\n\n만들 급수 ${group.length}개 (서로 겹치지 말 것):\n${group.map(sheetSpec).join('\n')}`,
    out: `/tmp/gen-en/out/${group[0].id}.json`,
  });
}

// 12개마다 8:4 — 빠른 레인에 더 얹는다
const a = jobs.filter((_, i) => i % 12 < 8);
const b = jobs.filter((_, i) => i % 12 >= 8);
writeFileSync('/tmp/gen-en/gpt.jsonl', a.map((j) => JSON.stringify(j)).join('\n') + '\n');
writeFileSync('/tmp/gen-en/gemini.jsonl', b.map((j) => JSON.stringify(j)).join('\n') + '\n');
console.log(`작업 ${jobs.length}건 — gpt ${a.length} · gemini ${b.length}`);
console.log(`문항 요청 ${sheets.length * 13}개 → 급수당 10개만 채택`);
