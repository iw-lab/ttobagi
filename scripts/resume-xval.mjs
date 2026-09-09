/**
 * 교차검증 배치 중 «쓸 수 있는 답»을 못 받은 것만 남긴다.
 *
 * 판정은 길이가 아니라 내용으로 한다 — 파싱되는가, bad 배열이 있는가,
 * n 이 보낸 문항 수와 맞는가. 「거절문이 아니다」와 「검사했다」는 다른 말이다.
 *
 * 사용: node scripts/resume-xval.mjs /tmp/gen5x/xval-a.jsonl
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const src = process.argv[2];
if (!src) { console.error('배치 파일 경로가 필요하다'); process.exit(1); }

function usable(job) {
  if (!existsSync(job.out)) return '파일없음';
  let d;
  try {
    const raw = readFileSync(job.out, 'utf8').split('\n---\n')[0];
    d = JSON.parse(raw.replace(/^```json\s*|```\s*$/g, '').trim());
  } catch { return 'JSON깨짐'; }
  if (Array.isArray(d)) return null;                       // 옛 형식은 통과
  if (!Array.isArray(d.bad)) return 'bad없음';
  if (job.count && Number(d.n) !== job.count) return `개수불일치(${d.n}≠${job.count})`;
  return null;
}

const jobs = readFileSync(src, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const todo = [];
const why = {};
for (const j of jobs) {
  const bad = usable(j);
  if (!bad) continue;
  todo.push(j);
  const k = bad.replace(/\(.*/, '');
  why[k] = (why[k] ?? 0) + 1;
}

const out = src.replace(/\.jsonl$/, '.todo.jsonl');
writeFileSync(out, todo.map((j) => JSON.stringify(j)).join('\n') + (todo.length ? '\n' : ''));
console.log(`${src}: 전체 ${jobs.length} · 쓸 만함 ${jobs.length - todo.length} · 다시 물을 것 ${todo.length}`);
for (const [k, v] of Object.entries(why)) console.log(`  ${k} ${v}`);
console.log(out);
