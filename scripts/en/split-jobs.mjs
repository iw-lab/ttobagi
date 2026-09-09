/**
 * 배치 파일을 «짧은 조각»으로 나눈다.
 * 🔴 왜: gpt-web 은 한 배치가 15~30건을 넘어가면 세션이 상해 「입력창 없음」으로 죽는다
 *    (2026-09-09 실측 — 새로 열면 입력창은 멀쩡하다). 브라우저를 새로 여는 값이
 *    세션이 상하는 값보다 싸다. gemini-web 은 40건도 무실패로 완주하므로 더 얹어도 된다.
 *
 * 사용: node scripts/en/split-jobs.mjs /tmp/gen-en/x.jsonl 15   → x.part1.jsonl, x.part2.jsonl …
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [path, sizeArg] = process.argv.slice(2);
if (!path) { console.error('배치 파일 경로가 필요하다'); process.exit(1); }
const size = Math.max(1, Number(sizeArg ?? 15));
const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean);
const base = path.replace(/\.jsonl$/, '');
const parts = [];
for (let i = 0; i < lines.length; i += size) {
  const out = `${base}.part${parts.length + 1}.jsonl`;
  writeFileSync(out, lines.slice(i, i + size).join('\n') + '\n');
  parts.push(out);
}
console.log(`${lines.length}건 → ${parts.length}조각 (조각당 최대 ${size}건)`);
for (const p of parts) console.log(`  ${p}`);
