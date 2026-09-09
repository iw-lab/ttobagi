/**
 * 영어 급수표 문항을 미리 읽어 음원으로 굽는다 (piper, 로컬·무료).
 *
 * 🔴 국어 음원(Supertonic)으로 영어를 읽히면 안 된다. 한국어 음운으로 영어를 읽어 주면
 *    아이는 «틀린 소리»를 표준으로 배운다 — 영어 받아쓰기에서 그건 앱이 해를 끼치는 것이다.
 *
 * 🔴 목소리 = piper `en_US-ljspeech-high`. **퍼블릭 도메인**(LJ Speech, 처음부터 학습)이라
 *    상업적 이용에 걸리지 않는다. 후보였던 lessac 은 «Research Licence» 전용이고,
 *    hfc_female 은 CC BY-**NC**, alba 는 CC BY지만 lessac 에서 파인튜닝해 파생이 오염된다.
 *    ⚠️ 목소리를 바꾸려면 라이선스부터 확인할 것 — 소리만 듣고 고르면 나중에 못 쓴다.
 *
 * 🔴 속도(length-scale) 1.30 = 기본보다 30% 느리게. 받아쓰기는 «따라 쓸 수 있는 속도»여야 한다.
 *    국어(Supertonic speed 0.88)와 같은 취지다.
 *
 * 🔴 piper 는 한 번 부를 때마다 모델을 올린다(1개당 1.8초). 2,400개면 72분이라
 *    **4개씩 동시에** 굽는다 — 코어를 놀리지 않으면 20분 안쪽이다.
 *    동시 수를 CPU 코어 수 이상으로 올리면 서로 밀려 오히려 느려진다.
 *
 * 🔴 급수 폴더마다 «무슨 문항으로 구웠는지»를 `.items.json` 으로 남긴다.
 *    finalize 가 급수 번호를 다시 매기면 e3-1-05 가 «다른 문항»을 가리키는데,
 *    폴더 이름은 그대로라 이미 있는 mp3 를 건너뛰어 **새 문항에 옛 소리**가 붙는다.
 *    (국어에서 「급수 번호를 바꾸면 음원이 통째로 어긋난다」로 이미 겪은 함정이다.)
 *    지문이 다르면 그 급수만 다시 굽고, 급수표에 없는 폴더는 지운다.
 *
 * 사용: node scripts/en/build-audio.mjs [--speed 1.30] [--jobs 4] [--only e3-1-01] [--force]
 * 출력: public/audio/<급수 id>/<두 자리>.mp3
 */
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const PIPER = join(process.env.HOME, '.cache/piper-venv/bin/piper');
const VOICE = join(process.env.HOME, '.cache/piper-voices/en_US-ljspeech-high.onnx');
const OUT = join(ROOT, 'public/audio');
const TMP = join(ROOT, '.audio-tmp-en');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const SPEED = arg('speed', '1.30');
// 🔴 낱말 하나는 문장보다 «더 느리게» 읽어야 한다.
// piper 는 문맥이 없으면 낱말을 통째로 흘려 버린다 — 같은 1.30 에서
// 「I like a big dog.」은 낱말당 0.32초인데 「big」만 주면 0.17초다(실측 2026-09-10).
// 마침표를 붙여 «문장»으로 읽히게 하고, 속도도 한 단 더 낮춘다.
const WORD_SPEED = arg('word-speed', '1.60');
// 앞 0.12초·뒤 0.30초 여백. 사파리는 재생 시작을 조금 먹고, 받아쓰기는 «끝났나?» 하는
// 여운이 있어야 아이가 따라 쓴다. 여백이 없으면 짧은 낱말이 잘린 것처럼 들린다.
const LEAD_MS = 120;
const TAIL_S = '0.30';
const JOBS = Math.max(1, Math.min(8, Number(arg('jobs', 6))));
const ONLY = arg('only', null);
const FORCE = process.argv.includes('--force');

for (const [what, path] of [['piper', PIPER], ['목소리 파일', VOICE]]) {
  if (!existsSync(path)) {
    console.error(`${what} 이(가) 없다: ${path}`);
    if (what === '목소리 파일') {
      console.error('  curl -sL -o "' + VOICE + '" https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ljspeech/high/en_US-ljspeech-high.onnx');
      console.error('  curl -sL -o "' + VOICE + '.json" https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ljspeech/high/en_US-ljspeech-high.onnx.json');
    }
    process.exit(1);
  }
}

const src = readFileSync(join(ROOT, 'src/engine/curriculum-en.ts'), 'utf8');
const body = src.slice(src.indexOf('export const CURRICULUM_EN'));
const sheets = [...body.matchAll(/id: '([^']+)',[\s\S]*?items: \[([\s\S]*?)\],\s*\n\s*\}/g)].map((m) => ({
  id: m[1],
  items: [...m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1].replace(/\\'/g, "'")),
}));
if (!sheets.length) {
  console.error('영어 급수표를 하나도 읽지 못했다 — curriculum-en.ts 가 비었는지 확인할 것');
  process.exit(1);
}

// 급수표에 없는 영어 음원 폴더는 지운다 — 남겨 두면 배포에 실려 가고, 번호가 재사용되면 해롭다.
const known = new Set(sheets.map((s) => s.id));
let purged = 0;
if (existsSync(OUT) && !ONLY) {
  for (const d of readdirSync(OUT)) {
    if (!d.startsWith('e') || known.has(d)) continue;
    rmSync(join(OUT, d), { recursive: true, force: true });
    purged++;
  }
}

const jobs = [];
let restamped = 0;
for (const sheet of sheets) {
  if (ONLY && sheet.id !== ONLY) continue;
  const dir = join(OUT, sheet.id);
  mkdirSync(dir, { recursive: true });
  // 지문이 다르면 이 급수는 «다른 문항»이 된 것이다 — 통째로 다시 굽는다.
  const stampPath = join(dir, '.items.json');
  // 🔴 지문뿐 아니라 «굽는 방법»도 지문의 일부다 — 속도·여백을 바꾸면 옛 음원은 못 쓴다.
  const want = JSON.stringify({ recipe: `${SPEED}/${WORD_SPEED}/${LEAD_MS}/${TAIL_S}`, items: sheet.items });
  const stale = !existsSync(stampPath) || readFileSync(stampPath, 'utf8') !== want;
  if (stale && existsSync(dir)) {
    for (const f of readdirSync(dir)) if (f.endsWith('.mp3')) rmSync(join(dir, f), { force: true });
    restamped++;
  }
  writeFileSync(stampPath, want);
  sheet.items.forEach((text, i) => {
    const n = String(i + 1).padStart(2, '0');
    const mp3 = join(dir, `${n}.mp3`);
    if (!FORCE && !stale && existsSync(mp3)) return;
    jobs.push({ text, word: !/[.!?]['"”’]?$/.test(text.trim()), wav: join(TMP, `${sheet.id}-${n}.wav`), mp3 });
  });
}
if (purged) console.log(`급수표에 없는 음원 폴더 ${purged}개를 지웠다`);
if (restamped) console.log(`문항이 바뀌어 다시 구울 급수 ${restamped}개`);
console.log(`급수 ${sheets.length}개 · 구울 음원 ${jobs.length}개 (piper ljspeech-high, 속도 문장 ${SPEED}·낱말 ${WORD_SPEED})`);
if (!jobs.length) { console.log('이미 다 구워져 있다. --force 로 다시 구울 수 있다.'); process.exit(0); }

mkdirSync(TMP, { recursive: true });
const t0 = Date.now();
let bytes = 0;
let done = 0;
let failed = 0;

async function bake(j) {
  const p = run(PIPER, ['-m', VOICE, '--length-scale', j.word ? WORD_SPEED : SPEED, '-f', j.wav]);
  // 낱말 지문에 붙이는 마침표는 «읽히는 말»에만 붙는다 — 화면·채점의 지문은 그대로다.
  p.child.stdin.end(j.word ? `${j.text}.` : j.text);
  await p;
  // 24kHz 모노 32kbps — 국어 음원과 같은 규격이라 교실에서 소리 크기가 튀지 않는다.
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', j.wav,
    '-af', `adelay=${LEAD_MS}|${LEAD_MS},apad=pad_dur=${TAIL_S}`,
    '-ac', '1', '-ar', '24000', '-b:a', '32k', j.mp3]);
  rmSync(j.wav, { force: true });
  bytes += readFileSync(j.mp3).length;
  if (++done % 200 === 0) {
    const per = (Date.now() - t0) / done / 1000;
    console.log(`  ${done}/${jobs.length} · ${per.toFixed(2)}초/개 · 남은 시간 약 ${Math.round(per * (jobs.length - done) / 60)}분`);
  }
}

let next = 0;
await Promise.all(Array.from({ length: JOBS }, async () => {
  while (next < jobs.length) {
    const j = jobs[next++];
    try { await bake(j); }
    catch (e) { failed++; console.error(`  ✗ ${j.mp3}: ${String(e).slice(0, 120)}`); }
  }
}));
rmSync(TMP, { recursive: true, force: true });
console.log(`음원 ${done}개 · ${(bytes / 1024 / 1024).toFixed(1)}MB · ${((Date.now() - t0) / 1000).toFixed(1)}초${failed ? ` · 실패 ${failed}개` : ''}`);
// 🔴 「구웠다」와 「다 구웠다」는 다른 상태다 — 하나라도 실패하면 배포가 아니라 여기서 멈춘다.
if (failed) process.exit(1);
