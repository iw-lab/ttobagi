/**
 * 확정된 영어 급수표를 src/engine/curriculum-en.ts 에 써 넣는다.
 * 🔴 손으로 붙여 넣지 않는다 — 3,000줄을 사람이 옮기면 반드시 한 줄이 어긋난다.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const final = JSON.parse(readFileSync('/tmp/gen-en/final.json', 'utf8'));
const q = (t) => `'${t.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const body = final.map((s) => `  {
    id: '${s.id}', subject: 'en', grade: ${s.grade}, semester: ${s.semester}, level: ${s.level},
    title: ${q(s.title)}, point: ${q(s.point)},
    items: [${s.items.map(q).join(', ')}],
  },`).join('\n');

const path = new URL('../../src/engine/curriculum-en.ts', import.meta.url);
const src = readFileSync(path, 'utf8');
const head = src.slice(0, src.indexOf('export const CURRICULUM_EN'));
const stamp = new Date().toISOString().slice(0, 10);
writeFileSync(path, `${head}// ${final.length}급 · ${final.length * 10}문항. gpt-web·gemini-web 로 짓고
// 사전(37만 낱말)·형식 검사로 거른 뒤 codex(gpt-6-astra)와 «지은 쪽이 아닌» 웹 브릿지로
// 교차검증해 지적된 문항을 «고치지 않고 뺐다». 마지막 갱신 ${stamp}.
export const CURRICULUM_EN: LevelSheet[] = [
${body}
];
`);
console.log(`curriculum-en.ts 에 ${final.length}급 ${final.length * 10}문항을 썼다`);
