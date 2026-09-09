/**
 * 교차검증 배치를 만든다.
 *
 * 🔴 «지은 쪽이 검사하면 검증이 아니다.»
 *    처음엔 레인을 맞바꾸려 했다(gpt 가 지은 것은 gemini 가, 그 반대도). 그런데 실제로는
 *    **gpt-web 이 계속 세션이 상해 죽었고 그 몫을 gemini 가 이어 받았다** — 배정표는
 *    「gpt 가 만들었다」고 말하는데 실물은 gemini 가 만든 것이 훨씬 많다.
 *    배정표를 믿고 맞바꾸면 **gemini 가 자기가 만든 것을 검사**하게 된다.
 *    🔴 일반 교훈: «누가 만들었나»를 계획서에서 읽으면 안 된다 — 계획은 어긋나고,
 *       어긋난 사실은 「교차검증했다」는 보고 뒤에 조용히 숨는다.
 *
 *    그래서 맞바꾸기를 버리고 셋 다 «전량»을 보게 한다:
 *      · codex(gpt-6-astra) = 독립 검증의 본체. Gemini 계열과 완전히 독립이고 격리 환경이다.
 *      · gpt-web = 역시 Gemini 계열과 독립. 형편 닿는 만큼(세션이 상하면 조각내어 다시).
 *      · gemini-web = 보조. gemini 가 만든 문항에는 **독립이 아니다** — 「계열 2개」로 세지 말 것.
 *    여기에 사전 검사(verify-items)가 이미 결정론 그물로 깔려 있다 — 국어에는 없던 층이다.
 *
 * 🔴 배치 이름에 **내용 해시**를 넣는다. 문항이 늘거나 바뀌면 이름이 바뀌므로,
 *    옛 답이 새 문항 목록에 붙는 일이 구조적으로 불가능해진다.
 *    (이름이 순번뿐이면 보충분을 넣은 뒤 cx-000 이 «다른 50문항»을 가리키는데
 *     파일은 그대로 남아 검사한 적 없는 문항이 «깨끗하다»고 세어진다.)
 *
 * 🔴 출력 형식에 «검사한 문항 수»를 반드시 담게 한다. 깨끗한 배치가 `[]` 만 뱉으면
 *    브릿지의 거절 판정기가 그걸 «너무 짧은 응답»으로 버린다 —
 *    **깨끗할수록 버려지는 구조**가 된다(국어에서 실제로 났다).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ready = JSON.parse(readFileSync('/tmp/gen-en/ready.json', 'utf8'));
mkdirSync('/tmp/gen-en/xval', { recursive: true });

const RULES = `아래는 한국 초등학생용 «영어 받아쓰기» 문항 목록이다. 각 줄을 보고 **틀린 줄의 번호만** 골라라.

🔴 프롬프트에 역할을 지우지 마라 — 아래는 실측으로 정한 말투다.
   처음엔 「너는 원어민 수준 검수자다」로 시작했는데 gemini 가 그 자리에서
   「저는 그런 것을 하도록 프로그램되지 않았습니다」로 **거절**했다(2026-09-10).
   역할 지시를 빼고 «과제»로 바꾸자 같은 모델이 심어 둔 오류 4개를 전부 잡았다.

살필 것
A 철자 — 미국식 영어 철자가 틀렸다
B 문법 — 관사·시제·수 일치·어순이 틀렸다
C 표현 — 문법은 맞지만 원어민이 그렇게 말하지 않는다
D 부호·대문자 — 문장인데 대문자로 시작하지 않거나, 끝 부호가 없거나 잘못됐다.
  낱말인데 마침표가 붙었다. 아포스트로피가 잘못됐다
E 학년 — 그 학년 초등학생에게 너무 어려운 낱말이거나 **2022 개정 영어과 초등 권장 어휘
  (3~6학년 합쳐 800~900낱말) 밖**이다. 한국 초등 교과서에 안 나오는 낱말이면 지적하라
  (예: 문화 특정 음식 이름, 전문 용어, 어려운 추상어)
F 포인트 — 그 급수의 「학습 포인트」가 문항에 드러나지 않는다
  (예: 「불규칙 과거」 급수에 melted 처럼 규칙 변화가 들어 있다)

🔴 지켜야 할 것
- **멀쩡한 문항을 고치라고 하지 마라.** 취향 차이·다른 표현이 가능한 것은 넘어간다.
- 확신이 없으면 넣지 마라. 오탐 하나가 멀쩡한 문항을 죽인다.
- 낱말 급수의 문항은 낱말 하나가 정상이다. 문장이 아니라고 지적하지 마라.

출력은 JSON 객체 하나만. 설명·코드펜스 금지.
형식: {"n": 검사한 줄 수, "bad": [{"n": 번호, "code": "A", "why": "무엇이 틀렸나", "fix": "고친 것"}]}
틀린 게 없으면 {"n": 검사한 줄 수, "bad": []}`;

// 🔴 한 배치 = «급수 4개»다(문항 40~52개). 문항 50개씩 자르면 보충분 하나가 들어오는 순간
//    그 뒤의 모든 배치 경계가 밀려 전부 다시 물어야 한다. 급수 단위로 묶으면
//    보충한 급수가 든 배치만 해시가 바뀐다 — 나머지는 그대로 쓴다.
// 🔴 묶는 대상은 «문항이 있는 급수»가 아니라 **전체 급수를 고정 순서로** 본다.
//    빈 급수를 걸러 낸 목록으로 묶으면 급수가 채워질 때마다 4개 묶음의 경계가 밀린다 —
//    그러면 문항이 하나도 안 바뀐 급수의 배치까지 이름이 달라져 전부 다시 물어야 한다.
const SHEETS_PER_JOB = 4;

function buildJobs(sheetList, tag) {
  const jobs = [];
  for (let i = 0; i < sheetList.length; i += SHEETS_PER_JOB) {
    const group = sheetList.slice(i, i + SHEETS_PER_JOB).filter((s) => s.items.length > 0);
    if (!group.length) continue;
    const chunk = group.flatMap((s) =>
      s.items.map((text) => ({ id: s.id, text, grade: s.grade, point: s.point, kind: s.kind })));
    if (!chunk.length) continue;
    const listing = chunk.map((r, k) =>
      `${k + 1}. [${r.grade}학년 · ${r.kind === 'word' ? '낱말' : '문장'} · 포인트 ${r.point}] ${r.text}`).join('\n');
    const hash = createHash('sha1').update(chunk.map((r) => `${r.id}\t${r.text}`).join('\n')).digest('hex').slice(0, 8);
    // 🔴 이름에 순번을 쓰지 않는다 — 급수가 하나 늘면 그 뒤 순번이 전부 밀려
    //    옛 파일이 «다른 급수»의 답으로 재사용된다. 첫 급수 id + 내용 해시로 못박는다.
    const name = `${tag}-${group[0].id}-${hash}`;
    jobs.push({
      name,
      count: chunk.length,
      prompt: `${RULES}\n\n검사할 문항 ${chunk.length}개:\n${listing}`,
      out: `/tmp/gen-en/xval/${name}.json`,
      rows: chunk.map((r) => [r.id, r.text]),
    });
  }
  return jobs;
}

const totalItems = ready.reduce((n, s) => n + s.items.length, 0);
const withItems = ready.filter((s) => s.items.length > 0);

// 세 레인 모두 «전량»을 본다. 누가 만들었는지 못 믿으므로 나눠 맡기지 않는다.
const codexChecks = buildJobs(ready, 'cx');       // 독립 검증의 본체
const gptChecks = buildJobs(ready, 'gp');         // Gemini 계열과 독립
const geminiChecks = buildJobs(ready, 'gm');      // 보조 (gemini 생성분에는 독립 아님)

const strip = (j) => JSON.stringify({ name: j.name, prompt: j.prompt, out: j.out });
writeFileSync('/tmp/gen-en/xval-gemini.jsonl', geminiChecks.map(strip).join('\n') + '\n');
writeFileSync('/tmp/gen-en/xval-gpt.jsonl', gptChecks.map(strip).join('\n') + '\n');
writeFileSync('/tmp/gen-en/xval-codex.jsonl', codexChecks.map((j) => JSON.stringify({ name: j.name, count: j.count, prompt: j.prompt, out: j.out })).join('\n') + '\n');
writeFileSync('/tmp/gen-en/xval-index.json', JSON.stringify(
  [...geminiChecks, ...gptChecks, ...codexChecks].map((j) => ({ name: j.name, out: j.out, count: j.count, rows: j.rows })), null, 1));
console.log(`검사 대상 ${totalItems}문항 · 문항이 있는 급수 ${withItems.length}개 / 전체 ${ready.length}급`);
console.log(`배치 — codex ${codexChecks.length} · gpt ${gptChecks.length} · gemini ${geminiChecks.length} (셋 다 전량)`);
