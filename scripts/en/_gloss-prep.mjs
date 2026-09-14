import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const src = readFileSync('src/engine/curriculum-en.ts', 'utf8');
const items = [...src.matchAll(/items:\s*\[([^\]]*)\]/g)]
  .flatMap(m => [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(x => x[1].replace(/\\'/g, "'")));
const uniq = [...new Set(items)];
writeFileSync('/tmp/gloss/items.json', JSON.stringify(uniq, null, 0));
const SIZE = Number(process.env.SIZE || 50);
const OUT = '/tmp/gloss/out'; mkdirSync(OUT, { recursive: true });
const RULES = `너는 초등 영어 교사다. 아래 영어 항목마다 초등학생이 이해할 한국어 뜻을 붙여라.
규칙:
- 낱말은 가장 흔한 뜻 하나만. 짧게(예: "cat" -> "고양이", "get" -> "얻다").
- 문장은 자연스러운 한국어 해석 한 문장. 직역투 금지.
- 초등학생이 읽을 말로. 어려운 한자어 금지.
- 원문을 그대로 되돌려 주고(en), 뜻만 새로 쓴다(ko).
- 코드펜스 없이 JSON 배열만 출력한다. 설명 문장 금지.
형식: [{"en":"원문","ko":"뜻"}, ...]

항목:`;
const jobs = [];
for (let i = 0; i < uniq.length; i += SIZE) {
  const chunk = uniq.slice(i, i + SIZE);
  const n = String(jobs.length + 1).padStart(3, '0');
  jobs.push({ name: `g${n}`, out: `${OUT}/g${n}.txt`,
    prompt: `${RULES}\n${chunk.map((t, k) => `${k + 1}. ${t}`).join('\n')}` });
}
writeFileSync('/tmp/gloss/jobs.jsonl', jobs.map(j => JSON.stringify(j)).join('\n') + '\n');
console.log(`고유 ${uniq.length}개 → 요청 ${jobs.length}건 (건당 ${SIZE}개)`);
