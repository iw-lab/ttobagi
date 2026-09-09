/**
 * 끊긴 생성 배치를 이어서 돌릴 작업 파일을 만든다.
 *
 * 🔴 재개 판정은 «파일이 있느냐»가 아니라 «파싱해서 원하는 급수가 다 들어 있느냐»다.
 *    국어 때 브릿지가 「성공 147/147」을 찍었는데 JSON 이 깨져 급수 47개가 비어 있었다.
 *    존재만 보면 그 47개는 영영 다시 묻지 않는다(2026-09-09).
 *
 * 사용: node scripts/en/resume-batch.mjs [gpt|gemini|all]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { readItems } from './verify-items.mjs';

function usable(job) {
  if (!existsSync(job.out)) return '파일없음';
  // 🔴 「파싱된다」가 아니라 «원하는 급수가 다 들어 있다»로 본다.
  //    응답이 둘 이어 붙어 전체 파싱이 깨져도 온전한 배열은 건질 수 있다(readItems).
  const data = readItems(job.out);
  const have = Object.keys(data).filter((k) => data[k].length > 0);
  const miss = job.name.split('+').filter((w) => !have.includes(w));
  return miss.length ? `빠짐(${miss.join(',')})` : null;
}

const which = process.argv[2] ?? 'all';
const lanes = which === 'all' ? ['gpt', 'gemini'] : [which];
let leftTotal = 0;
for (const lane of lanes) {
  const path = `/tmp/gen-en/${lane}.jsonl`;
  if (!existsSync(path)) continue;
  const jobs = readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const left = [];
  const why = new Map();
  for (const j of jobs) {
    const r = usable(j);
    if (r) { left.push(j); why.set(r.replace(/\(.*/, ''), (why.get(r.replace(/\(.*/, '')) ?? 0) + 1); }
  }
  writeFileSync(`/tmp/gen-en/${lane}-resume.jsonl`, left.map((j) => JSON.stringify(j)).join('\n') + (left.length ? '\n' : ''));
  leftTotal += left.length;
  console.log(`${lane}: 전체 ${jobs.length} · 남음 ${left.length}  ${[...why].map(([k, v]) => `${k} ${v}`).join(' · ')}`);
}
console.log(leftTotal ? `\n다시 돌릴 것 ${leftTotal}건 — *-resume.jsonl 로 --batch` : '\n남은 작업 없음 ✅');
