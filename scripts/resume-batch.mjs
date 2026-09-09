/**
 * 아직 «쓸 수 있는 답»을 못 받은 작업만 남긴 배치 파일을 만든다.
 *
 * 🔴 왜 필요한가: 브릿지의 --batch 는 이미 받은 것을 건너뛰지 않는다. 중간에 끊기면
 * 처음부터 다시 묻게 되고, 그건 레이트리밋을 부르는 가장 확실한 방법이다.
 *
 * 🔴 «파일이 있다» 는 «답을 받았다» 가 아니다 (2026-09-09 실측).
 * 배치는 성공 147/147 을 찍었는데 급수 47개가 비었다 — 15개 파일이 JSON 으로 깨져 있었다
 * (모델이 문장 안에 곧은따옴표를 이스케이프 없이 넣었다). 존재만 보고 통과시키면
 * 그 47개는 영영 다시 묻지 않는다. 그래서 여기서 **파싱해 보고, 원한 급수가 다 들어 있는지**까지 본다.
 *
 * 사용: node scripts/resume-batch.mjs /tmp/gen5x/gpt.jsonl
 * 출력: 같은 경로에 .todo.jsonl
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const src = process.argv[2];
if (!src) { console.error('배치 파일 경로가 필요하다'); process.exit(1); }

/** 이 작업의 답이 실제로 쓸 만한가 — 있고, 파싱되고, 원한 급수를 다 담았는가 */
function usable(job) {
  if (!existsSync(job.out)) return '파일없음';
  let data;
  try {
    const raw = readFileSync(job.out, 'utf8').split('\n---\n')[0];
    data = JSON.parse(raw.replace(/^```json\s*|```\s*$/g, '').trim());
  } catch { return 'JSON깨짐'; }
  const have = Object.keys(data).filter((k) => Array.isArray(data[k]));
  const want = job.name.split('+');
  const miss = want.filter((w) => !have.includes(w));
  return miss.length ? `빠짐(${miss.join(',')})` : null;
}

const jobs = readFileSync(src, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const todo = [];
const why = {};
for (const j of jobs) {
  const bad = usable(j);
  if (!bad) continue;
  todo.push(j);
  why[bad.replace(/\(.*/, '')] = (why[bad.replace(/\(.*/, '')] ?? 0) + 1;
}

const out = src.replace(/\.jsonl$/, '.todo.jsonl');
writeFileSync(out, todo.map((j) => JSON.stringify(j)).join('\n') + (todo.length ? '\n' : ''));
console.log(`${src}: 전체 ${jobs.length} · 쓸 만함 ${jobs.length - todo.length} · 다시 물을 것 ${todo.length}`);
for (const [k, v] of Object.entries(why)) console.log(`  ${k} ${v}`);
console.log(out);
