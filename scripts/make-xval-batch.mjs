/**
 * 교차검증용 배치를 만든다 — «만든 통이 아닌 통»에 검사를 맡긴다.
 * 지은이와 검사자가 같으면 교차검증이 아니다.
 *
 * 🔴 응답 형식이 왜 {"n":…,"bad":[…]} 인가 (2026-09-09):
 * 처음엔 «문제가 없으면 []» 로 받으려 했다. 그런데 브릿지의 거절 게이트는 **응답이 짧으면
 * 거절로 본다**(기본 80자). [] 는 2자다 — 즉 **가장 깨끗한 배치일수록 버려진다.**
 * 그래서 「몇 개를 검사했는지」를 응답에 담게 했다. 이러면 길이가 아니라 **내용**으로
 * 「진짜 답했는가」를 판정할 수 있다(n 이 보낸 개수와 같아야 한다).
 * 🔴 일반화: 「응답이 짧다」로 실패를 판정하면, 정상적으로 짧은 답을 가진 작업은 영영 실패한다.
 *
 * 사용: node scripts/make-xval-batch.mjs <레인이름>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ready = JSON.parse(readFileSync('/tmp/gen5x/ready.json', 'utf8'));
const lane = process.argv[2] ?? 'a';
const SIZE = 50;
mkdirSync(`/tmp/gen5x/xval-${lane}`, { recursive: true });

const HEAD = `너는 국립국어원 어문 규범에 밝은 초등 국어 교사다. 아래 받아쓰기 문항을 한 개씩 검사하라.

틀린 것만 골라내라. 판단 기준은 이것뿐이다.
A. 한글 맞춤법이 틀렸다(표기·조사·어미·사이시옷 등).
B. 띄어쓰기가 규정에 어긋난다.
C. 문장이 비문이다(주어와 서술어가 안 맞거나 뜻이 통하지 않는다).
D. 문장 부호를 잘못 썼다.
E. 그 학년 아이에게 부적절하다(너무 어렵거나 내용이 맞지 않다).

지킬 것
- 규정상 «허용»되는 표기는 틀린 것이 아니다. 보조 용언 띄어쓰기처럼 둘 다 되는 것은 지적하지 마라.
- 취향·문체·더 나은 표현 제안은 하지 마라. 규정 위반만 본다.
- 확실하지 않으면 지적하지 마라.

출력은 JSON 객체 하나만. 설명·코드펜스·머리말 금지.
형식: {"n": 검사한 문항 수, "bad": [{"n": 번호, "code": "A", "why": "한 줄 이유", "fix": "고친 문항"}]}
문제가 하나도 없으면 "bad" 를 빈 배열로 둔다. "n" 은 아래에 실제로 적힌 문항 수와 같아야 한다.`;

const jobs = [];
const flat = [];
for (const s of ready) for (const t of s.items) flat.push({ id: s.id, grade: s.grade, point: s.point, text: t });

for (let i = 0; i < flat.length; i += SIZE) {
  const chunk = flat.slice(i, i + SIZE);
  const lines = chunk.map((c, k) => `${k + 1}. [${c.grade}학년·${c.point}] ${c.text}`).join('\n');
  jobs.push({
    name: `x${String(i).padStart(5, '0')}`,
    prompt: `${HEAD}\n\n아래 ${chunk.length}개를 검사하라.\n${lines}`,
    out: `/tmp/gen5x/xval-${lane}/x${String(i).padStart(5, '0')}.json`,
    count: chunk.length,
  });
}

writeFileSync(`/tmp/gen5x/xval-${lane}.jsonl`, jobs.map((j) => JSON.stringify(j)).join('\n') + '\n');
writeFileSync('/tmp/gen5x/flat.json', JSON.stringify(flat));
console.log(`검사 대상 ${flat.length}문항 · 배치 ${jobs.length}건 (${SIZE}문항씩) · 레인 ${lane}`);
