/**
 * 「낱말 급수 → 문장 급수」로 바꾼 문항을 기계로 거른다.
 *
 * 🔴 브릿지가 준 것을 그대로 넣지 않는다. 여기서 거르는 것 다섯:
 *   ① 철자 — 37만 낱말 목록에 없는 낱말
 *   ② 초점 — 그 급수의 초점 낱말이 실제로 문장에 들어 있는가
 *   ③ 길이 — 낱말 4~9개(받아쓸 수 있는 길이)
 *   ④ 꼴 — 곧은 따옴표·아라비아 숫자·약어·끝맺음 부호
 *   ⑤ 겹침 — 같은 급수 안에서, 그리고 «이미 급수표에 있는 문장»과
 *
 * 사용: node scripts/en/verify-sentences.mjs [--dir /tmp/gen-en2]
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { knownWord, normalizeItem } from './verify-items.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const DIR = arg('dir', '/tmp/gen-en2');

// 바꿀 급수와 초점 낱말
const plan = new Map(
  readFileSync('/tmp/gen-en/to-sentence.tsv', 'utf8').trim().split('\n').map((l) => {
    const [id, point, title, words] = l.split('\t');
    // 🔴 급수표 원본은 작은따옴표를 \' 로 이스케이프한다. 그대로 두면 that\'s 가
    //    that's 와 영영 안 맞아 축약형 급수가 통째로 «초점 낱말 없음»이 된다.
    const unesc = (t) => t.replace(/\\'/g, "'");
    return [id, { point, title: unesc(title), words: words.split(',').map(unesc) }];
  }),
);

// 이미 급수표에 들어 있는 문장 — 새 문장이 이것과 겹치면 안 된다
const src = readFileSync(join(ROOT, 'src/engine/curriculum-en.ts'), 'utf8');
const existing = new Set(
  [...src.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'").toLowerCase().trim()),
);

const ENDS_OK = /[.!?]["'”’]?$/;
const out = {};
let kept = 0, cut = 0;
const reasons = {};

// 🔴 교차검증에서 뺀 문항과 그 자리에 새로 받은 보충분을 «여기서» 합친다.
//    밖에서 합쳐 두면 이 검증기가 원본만 다시 읽어 조용히 덮어쓴다(2026-09-10 실측).
const dropPath = join(DIR, 'xval-drop.json');
const dropped = new Set(
  existsSync(dropPath)
    ? JSON.parse(readFileSync(dropPath, 'utf8')).map(([id, t]) => `${id}\t${t}`)
    : [],
);
const extra = (id) => {
  const f = join(DIR, `fix-${id}.json`);
  if (!existsSync(f)) return [];
  try {
    const d = JSON.parse(readFileSync(f, 'utf8'));
    const v = d[id] ?? Object.values(d)[0];
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};

for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json') && !x.startsWith('fix-'))) {
  const id = f.replace(/\.json$/, '');
  const spec = plan.get(id);
  if (!spec) continue;
  let data;
  try { data = JSON.parse(readFileSync(join(DIR, f), 'utf8')); } catch { continue; }
  const base = data[id] ?? Object.values(data)[0];
  if (!Array.isArray(base)) continue;
  const items = [...base.filter((t) => !dropped.has(`${id}\t${t}`)), ...extra(id)];

  const seen = new Set();
  const good = [];
  for (const raw of items) {
    const t = normalizeItem(String(raw));
    const bad = [];
    const words = t.replace(/[^A-Za-z' ]/g, ' ').split(/\s+/).filter(Boolean);

    if (words.length < 4 || words.length > 9) bad.push(`낱말 ${words.length}개`);
    if (!ENDS_OK.test(t)) bad.push('끝맺음 부호 없음');
    if (/"/.test(t)) bad.push('곧은 따옴표');
    if (/\d/.test(t)) bad.push('아라비아 숫자');
    if (/\b[A-Z]{2,}\b/.test(t)) bad.push('약어');
    const unknown = words.filter((w) => !knownWord(w));
    if (unknown.length) bad.push(`모르는 낱말 ${unknown.join(',')}`);
    // 초점 낱말이 하나도 없으면 이 급수의 문항이 아니다
    const lower = words.map((w) => w.toLowerCase());
    if (!spec.words.some((w) => lower.includes(w.toLowerCase()))) bad.push('초점 낱말 없음');
    const key = t.toLowerCase().trim();
    if (seen.has(key)) bad.push('급수 안 중복');
    if (existing.has(key)) bad.push('이미 급수표에 있음');

    if (bad.length) { cut++; for (const b of bad) reasons[b.split(' ')[0]] = (reasons[b.split(' ')[0]] ?? 0) + 1; continue; }
    seen.add(key);
    good.push(t);
    kept++;
  }
  out[id] = good.slice(0, 10);
}

const short = Object.entries(out).filter(([, v]) => v.length < 10);
console.log(`급수 ${Object.keys(out).length}개 · 통과 ${kept} · 걸러냄 ${cut}`);
console.log('걸린 이유:', Object.entries(reasons).map(([k, v]) => `${k} ${v}`).join(' · ') || '없음');
if (short.length) {
  console.log(`\n10문항이 안 되는 급수 ${short.length}개 — 보충이 필요하다`);
  for (const [id, v] of short) console.log(`  ${id} ${v.length}개`);
}
process.stdout.write('');
import('node:fs').then(({ writeFileSync }) => {
  writeFileSync(join(DIR, 'verified.json'), JSON.stringify(out, null, 1));
  console.log(`\n→ ${join(DIR, 'verified.json')}`);
});
