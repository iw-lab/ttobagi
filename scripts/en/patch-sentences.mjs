/**
 * 검증을 통과한 문장으로 급수표의 해당 급수만 갈아 끼운다.
 *
 * 🔴 급수 **번호를 다시 매기지 않는다.** 전체를 다시 돌리면 229급 전부의 id 가
 *    흔들리고 음원 2,290개를 다시 구워야 한다. 바꾸는 건 18급뿐이므로
 *    그 자리에서 items 만 바꾼다 — 음원도 그 18급만 다시 구우면 된다.
 *
 * 🔴 제목에 「낱말」이라고 적힌 급수는 「문장」으로 바꾼다. 안 그러면 화면이
 *    거짓말을 한다(제목은 낱말인데 내용은 문장).
 *
 * 사용: node scripts/en/patch-sentences.mjs [--dir /tmp/gen-en2] [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const DIR = arg('dir', '/tmp/gen-en2');
const DRY = process.argv.includes('--dry');
const FILE = join(ROOT, 'src/engine/curriculum-en.ts');

const verified = JSON.parse(readFileSync(join(DIR, 'verified.json'), 'utf8'));
let src = readFileSync(FILE, 'utf8');
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

let patched = 0;
const skipped = [];
for (const [id, items] of Object.entries(verified)) {
  if (items.length !== 10) { skipped.push(`${id} (${items.length}개)`); continue; }
  // 이 급수 블록만 집는다 — id 부터 다음 «},» 까지
  const re = new RegExp(`(id: '${id}',[\\s\\S]*?)items: \\[[\\s\\S]*?\\],`, 'm');
  const m = src.match(re);
  if (!m) { skipped.push(`${id} (못 찾음)`); continue; }
  // 🔴 «제목»만 바꾼다. point 까지 함께 치환하면 학습 초점 이름이 망가진다
  //    (긴낱말 → 긴문장 으로 바뀌어 성적표의 초점별 묶음이 어긋났다 — 2026-09-10).
  //    초점은 여전히 「긴 낱말 철자」다. 그것을 문장 안에서 익히게 된 것뿐이다.
  let head = m[1].replace(/(title: '[^']*)낱말'/, "$1낱말이 든 문장'");
  const body = `items: [${items.map((t) => `'${esc(t)}'`).join(', ')}],`;
  src = src.replace(re, head + body);
  patched++;
}

console.log(`갈아 끼운 급수 ${patched}개`);
if (skipped.length) console.log(`건너뛴 급수 ${skipped.length}개: ${skipped.join(', ')}`);
if (DRY) { console.log('(--dry 라 쓰지 않았다)'); process.exit(skipped.length ? 1 : 0); }
writeFileSync(FILE, src);
console.log(`→ ${FILE}`);
if (skipped.length) process.exit(1);
