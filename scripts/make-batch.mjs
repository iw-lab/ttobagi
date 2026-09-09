/**
 * 웹 브릿지 배치 작업 파일을 만든다.
 * 한 번에 급수표 3개(문장 39개)씩 — 더 담으면 응답이 잘리고, 덜 담으면 왕복이 늘어난다.
 * gpt-web 과 gemini-web 은 «통이 다르므로» 절반씩 나눠 동시에 돌린다.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const sheets = JSON.parse(readFileSync('/tmp/gen5x/sheets.json', 'utf8'));
mkdirSync('/tmp/gen5x/out', { recursive: true });

const RULES = `너는 초등학교 국어 받아쓰기 급수표를 만드는 교사다. 아래 급수마다 받아쓰기 문항 13개를 지어라.

반드시 지킬 것
1. 한글 맞춤법·띄어쓰기 규정을 정확히 지킨다. 조금이라도 자신 없으면 그 문장을 쓰지 말고 다른 문장을 지어라.
2. 급수의 「학습 포인트」가 실제로 드러나는 문장이어야 한다.
3. 글자 수는 공백 포함 지정 범위 안에 들어야 한다.
4. 초등학생에게 적합한 내용. 실존 인물·상표·특정 지역명·종교·정치 소재를 쓰지 않는다.
5. 「문장」이라고 적힌 급수는 마침표·물음표·느낌표 중 하나로 끝낸다.
   「낱말」이라고 적힌 급수는 낱말만 쓰고 문장 부호를 붙이지 않는다.
6. 문장 부호 뒤에는 한 칸 띄운다. 숫자는 한글로 적는다(세 개, 다섯 명).
7. 같은 급수 안에서 문장 끝맺음이나 첫 낱말이 반복되지 않게 한다.
8. 서로 뜻이 겹치는 문장을 넣지 않는다.
9. 남의 말을 옮길 때는 큰따옴표 “ ” 를, 그 안의 인용에는 작은따옴표 ‘ ’ 를 쓴다.
   곧은따옴표(")는 절대 쓰지 마라 — JSON 이 깨진다.

출력은 JSON 객체 하나만. 설명·코드펜스·머리말 금지.
형식: {"급수id": ["문장1", ..., "문장13"], ...}`;

function sheetSpec(s) {
  const kind = s.kind === 'word' ? '낱말(문장 아님 — 마침표 붙이지 말 것)' : '문장';
  return `- 급수id "${s.id}" · ${s.grade}학년 ${s.semester}학기 · 제목 「${s.title}」 · 학습 포인트 「${s.point}」 · ${kind} · 글자 수 ${s.minLen}~${s.maxLen}자`;
}

const jobs = [];
for (let i = 0; i < sheets.length; i += 3) {
  const group = sheets.slice(i, i + 3);
  jobs.push({
    name: group.map((g) => g.id).join('+'),
    prompt: `${RULES}\n\n만들 급수 ${group.length}개:\n${group.map(sheetSpec).join('\n')}`,
    out: `/tmp/gen5x/out/${group[0].id}.json`,
  });
}

// 두 통에 번갈아 나눈다 — 한 통이 막혀도 절반은 살아 남는다
const a = jobs.filter((_, i) => i % 2 === 0);
const b = jobs.filter((_, i) => i % 2 === 1);
writeFileSync('/tmp/gen5x/gpt.jsonl', a.map((j) => JSON.stringify(j)).join('\n') + '\n');
writeFileSync('/tmp/gen5x/gemini.jsonl', b.map((j) => JSON.stringify(j)).join('\n') + '\n');
console.log(`작업 ${jobs.length}건 — gpt ${a.length} · gemini ${b.length}`);
console.log(`문항 요청 ${sheets.length * 13}개 → 급수당 10개만 채택`);
