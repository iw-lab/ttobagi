/**
 * 구워 둔 영어 음원을 파일 단위로 검사한다.
 *
 * 🔴 「구웠다」는 「제대로 읽혔다」가 아니다. piper 는 실패해도 짧은 무음 파일을 남긴다.
 * 그래서 ① 파일이 다 있는가 ② 소리가 들어 있는가 ③ 길이가 글자 수에 걸맞은가 를 본다.
 * 글자당 시간이 크게 벗어난 것은 «낱말을 글자 하나씩 읽었거나 중간에 잘린» 것이라
 * 사람이 들어 볼 목록으로 따로 낸다.
 *
 * 사용: node scripts/en/check-audio.mjs [--samples 12]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const OUT = join(ROOT, 'public/audio');

const src = readFileSync(join(ROOT, 'src/engine/curriculum-en.ts'), 'utf8');
const body = src.slice(src.indexOf('export const CURRICULUM_EN'));
const sheets = [...body.matchAll(/id: '([^']+)',[\s\S]*?items: \[([\s\S]*?)\],\s*\n\s*\}/g)].map((m) => ({
  id: m[1],
  items: [...m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1].replace(/\\'/g, "'")),
}));

const probe = (f) => {
  const raw = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
  return Number(raw.trim());
};

// build-audio.mjs 가 붙이는 앞 0.12초 + 뒤 0.30초
const PAD_S = 0.42;

let missing = 0, tiny = 0, odd = 0, n = 0, stale = 0;
const rows = [];
for (const s of sheets) {
  // 🔴 「파일이 있다」가 아니라 «지금 이 문항으로 구웠는가»를 본다.
  //    급수 번호를 다시 매기면 폴더 이름은 그대로인 채 문항만 바뀐다.
  const stampPath = join(OUT, s.id, '.items.json');
  // 도장에는 «굽는 방법»도 함께 찍힌다(build-audio.mjs) — 문항만 떼어 견준다.
  let stamped = null;
  if (existsSync(stampPath)) {
    try {
      const j = JSON.parse(readFileSync(stampPath, 'utf8'));
      stamped = Array.isArray(j) ? j : j.items;
    } catch { stamped = null; }
  }
  if (JSON.stringify(stamped) !== JSON.stringify(s.items)) {
    stale++;
    console.log(`  ✗ 지문 불일치(옛 문항으로 구운 소리) ${s.id}`);
  }
  s.items.forEach((text, i) => {
    const f = join(OUT, s.id, `${String(i + 1).padStart(2, '0')}.mp3`);
    n++;
    if (!existsSync(f)) { missing++; console.log(`  ✗ 없음 ${f}`); return; }
    const size = statSync(f).size;
    if (size < 1500) { tiny++; console.log(`  ✗ 너무 작음 ${f} ${size}B 「${text}」`); return; }
    const dur = probe(f);
    // 🔴 앞뒤 무음(0.42초)은 글자 수와 무관한 고정값이다 — 빼지 않으면
    //    짧은 낱말이 「글자당 시간이 길다」고 잘못 걸린다.
    const perChar = Math.max(0.02, dur - PAD_S) / text.length;
    rows.push({ f, text, dur, perChar, id: s.id });
  });
}

// 글자당 시간의 중앙값을 기준으로 크게 벗어난 것을 고른다 — 기준을 눈대중으로 박지 않는다.
// 🔴 낱말과 문장은 «다른 자»로 재야 한다. 낱말은 더 느리게 읽히고(1.60) 글자 수가 적어
//    한 자로 재면 멀쩡한 낱말 100여 개가 통째로 경고로 나온다 — 잣대가 틀린 것이다.
const medianOf = (xs) => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)] ?? 0; };
const isWord = (r) => !/[.!?]['"”’]?$/.test(r.text.trim());
const medWord = medianOf(rows.filter(isWord).map((r) => r.perChar));
const medSent = medianOf(rows.filter((r) => !isWord(r)).map((r) => r.perChar));
const med = medSent;
const outliers = rows.filter((r) => {
  const m = isWord(r) ? medWord : medSent;
  return r.perChar < m * 0.45 || r.perChar > m * 2.2;
});
odd = outliers.length;

console.log(`\n음원 ${n}개 · 없음 ${missing} · 너무 작음 ${tiny} · 지문 불일치 ${stale} · 글자당 시간 중앙값 낱말 ${medWord.toFixed(3)}·문장 ${medSent.toFixed(3)}초`);
console.log(`길이가 크게 벗어난 것 ${odd}개 (사람이 들어 볼 목록)`);
for (const r of outliers.slice(0, 25)) {
  console.log(`  ${r.perChar.toFixed(3)}초/자 ${r.dur.toFixed(2)}초 ${r.id} 「${r.text}」 ${r.f}`);
}
if (missing || tiny || stale) {
  console.error('\n🔴 빠지거나 깨졌거나 옛 문항으로 구운 음원이 있다 — 배포하면 안 된다');
  process.exit(1);
}
console.log('\n✅ 모든 문항에 소리가 있다');
