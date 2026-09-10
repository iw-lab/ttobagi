/**
 * 구운 영어 음원을 **기계에 되들려 본다**.
 *
 * 🔴 `check-audio.mjs` 는 「소리가 났는가」만 본다. 그런데 아이가 못 알아들으면
 *    소리가 나도 소용이 없다. 2026-09-10 에 사용자가 「??」라고 적어 낸 문항들이
 *    실제로 음성인식에서도 전부 틀렸다 — 귀가 옳았고 길이 검사는 통과시켰다.
 *    그래서 **되들어서 같은 낱말이 나오는지**를 따로 잰다.
 *
 * 낱말은 그대로, 문장은 낱말 단위로 견준다. 대소문자·문장부호는 무시한다.
 * 음성인식도 완벽하지 않으므로 «틀렸다»가 아니라 «사람이 들어 볼 목록»으로 낸다.
 *
 * 준비: whisper-cli + 모형
 *   brew install whisper-cpp
 *   curl -sL -o ~/.cache/whisper-ggml/ggml-base.en.bin \
 *     https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
 *
 * 사용: node scripts/en/asr-audio.mjs [--sample 200] [--only e5-1-01] [--all]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const OUT = join(ROOT, 'public/audio');
const MODEL = join(process.env.HOME, '.cache/whisper-ggml/ggml-base.en.bin');

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const ONLY = arg('only', null);
const ALL = process.argv.includes('--all');
const SAMPLE = Number(arg('sample', 200));

if (!existsSync(MODEL)) {
  console.error(`음성인식 모형이 없다: ${MODEL}`);
  console.error('  mkdir -p ~/.cache/whisper-ggml && curl -sL -o ~/.cache/whisper-ggml/ggml-base.en.bin \\');
  console.error('    https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin');
  process.exit(1);
}

const src = readFileSync(join(ROOT, 'src/engine/curriculum-en.ts'), 'utf8');
const body = src.slice(src.indexOf('export const CURRICULUM_EN'));
const sheets = [...body.matchAll(/id: '([^']+)',[\s\S]*?items: \[([\s\S]*?)\],\s*\n\s*\}/g)].map((m) => ({
  id: m[1],
  items: [...m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1].replace(/\\'/g, "'")),
}));

const rows = [];
for (const s of sheets) {
  if (ONLY && s.id !== ONLY) continue;
  s.items.forEach((text, i) => {
    rows.push({ id: s.id, text, f: join(OUT, s.id, `${String(i + 1).padStart(2, '0')}.mp3`) });
  });
}

// 전수는 오래 걸린다 — 기본은 «고르게 흩어진 표본»만 본다. 표본을 무작위로 뽑으면
// 돌릴 때마다 결과가 달라져 「고쳤다」를 확인할 수 없으므로 일정 간격으로 뽑는다.
const picked = ALL || ONLY ? rows : rows.filter((_, i) => i % Math.max(1, Math.round(rows.length / SAMPLE)) === 0);

const norm = (s) => s.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
const tmp = mkdtempSync(join(tmpdir(), 'asr-'));
const wav = join(tmp, 'a.wav');

let bad = 0;
const worst = [];
console.log(`영어 음원 ${picked.length}개를 되들어 본다 (전체 ${rows.length}개)`);
for (const r of picked) {
  if (!existsSync(r.f)) { console.log(`  ✗ 없음 ${r.f}`); bad++; continue; }
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', r.f, '-ar', '16000', '-ac', '1', wav]);
  const heard = execFileSync('whisper-cli', ['-m', MODEL, '-f', wav, '-nt', '-np'], { encoding: 'utf8' }).trim();
  const want = norm(r.text);
  const got = norm(heard);
  const hit = want.filter((w) => got.includes(w)).length;
  const ratio = want.length ? hit / want.length : 0;
  if (ratio < 0.6) { bad++; worst.push({ ...r, heard: heard.replace(/\s+/g, ' ') }); }
}
rmSync(tmp, { recursive: true, force: true });

if (worst.length) {
  console.log(`\n되들었을 때 딴 말로 들린 것 ${worst.length}개 (사람이 들어 볼 목록)`);
  for (const w of worst.slice(0, 40)) console.log(`  ${w.id} 「${w.text}」 → 「${w.heard}」`);
}
const rate = ((picked.length - bad) / picked.length) * 100;
console.log(`\n알아들은 비율 ${rate.toFixed(1)}% (${picked.length - bad}/${picked.length})`);
// 음성인식 자체의 한계가 있으므로 90% 를 바닥으로 둔다 — 그 아래면 소리가 문제다.
if (rate < 90) { console.log('🔴 소리가 알아들을 만하지 않다 — 목소리나 굽는 방식을 고쳐야 한다'); process.exit(1); }
console.log('✅ 되들어도 같은 말로 들린다');
