/**
 * 영어 급수표 문항을 미리 읽어 음원으로 굽는다 (Supertonic, 로컬·무료).
 *
 * 🔴 **국어와 같은 엔진을 쓴다.** 예전엔 「한국어 TTS 로 영어를 읽히면 한국어 음운으로
 *    읽어 아이가 틀린 소리를 배운다」고 «가정하고» piper 로 갈랐는데, 재 보니 틀린
 *    가정이었다. Supertonic 3 은 31개어 다국어 모델이라 영어를 영어로 읽는다.
 *
 *    실측(2026-09-10, whisper-base.en 으로 되들려 본 것):
 *      piper en_US-ljspeech-high  낱말 10개 중 **3개**만 알아들었다
 *        (moon→Lord, food→Sewer, cool→Fool, pool→Cool, soon→Sue, zoo→See you, tooth→2)
 *      Supertonic sid 0            낱말 10개 **전부** 맞고, 문장 24낱말 오류 0
 *    piper 는 문장은 읽어도 **낱말 하나**를 못 읽는다. 받아쓰기는 낱말이 절반이다.
 *
 *    ⚠️ 목소리를 바꾸려면 라이선스부터 확인할 것. Supertonic 은 코드 MIT / 가중치
 *    OpenRAIL-M(상업 허용)으로 국어 음원이 이미 쓰고 있다. piper 후보였던 lessac 은
 *    Research 전용, hfc_female 은 CC BY-**NC** 라 애초에 못 쓴다.
 *
 * 🔴 「소리가 났다」와 「알아들을 수 있다」는 다르다. `check-audio.mjs` 는 길이만 보므로
 *    귀 대신 **음성인식**으로 되들어 보는 검사는 `asr-audio.mjs` 가 한다.
 *
 * 🔴 급수 폴더마다 «무슨 문항을 어떻게 구웠는지»를 `.items.json` 으로 남긴다.
 *    finalize 가 급수 번호를 다시 매기면 e3-1-05 가 «다른 문항»을 가리키는데 폴더
 *    이름은 그대로라, 이미 있는 mp3 를 건너뛰어 **새 문항에 옛 소리**가 붙는다.
 *    굽는 방법(화자·속도·여백)도 함께 찍는다 — 방법이 바뀌면 옛 음원은 못 쓴다.
 *
 * 사용: node scripts/en/build-audio.mjs [--sid 0] [--speed 0.92] [--only e3-1-01] [--force]
 * 출력: public/audio/<급수 id>/<두 자리>.mp3
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const PY = join(process.env.HOME, '.claude/venvs/sherpa-tts/bin/python3');
const TTS = join(process.env.HOME, '.claude/skills/yt-video-builder/scripts/supertonic_tts.py');
const OUT = join(ROOT, 'public/audio');
const TMP = join(ROOT, '.audio-tmp-en');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const SID = Number(arg('sid', 0));
// 국어는 0.88 이다. 영어는 아이에게 낯선 말이라 조금 더 천천히 읽는다.
const SPEED = Number(arg('speed', 0.92));
// 앞 0.12초·뒤 0.30초 여백. 사파리는 재생 시작을 조금 먹고, 받아쓰기는 여운이 있어야 따라 쓴다.
const LEAD_MS = 120;
const TAIL_S = '0.30';
// 한 번에 넘길 문항 수 — 모델은 한 번만 올라가지만 너무 크면 메모리가 튄다.
const CHUNK = Number(arg('chunk', 400));
const ONLY = arg('only', null);
const FORCE = process.argv.includes('--force');

if (!existsSync(PY)) {
  console.error(`Supertonic 파이썬 환경이 없다: ${PY}`);
  process.exit(1);
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

mkdirSync(TMP, { recursive: true });
const jobs = [];
let restamped = 0;
for (const sheet of sheets) {
  if (ONLY && sheet.id !== ONLY) continue;
  const dir = join(OUT, sheet.id);
  mkdirSync(dir, { recursive: true });
  const stampPath = join(dir, '.items.json');
  const want = JSON.stringify({ recipe: `st/${SID}/${SPEED}/${LEAD_MS}/${TAIL_S}`, items: sheet.items });
  const stale = !existsSync(stampPath) || readFileSync(stampPath, 'utf8') !== want;
  if (stale) {
    for (const f of readdirSync(dir)) if (f.endsWith('.mp3')) rmSync(join(dir, f), { force: true });
    restamped++;
  }
  writeFileSync(stampPath, want);
  sheet.items.forEach((text, i) => {
    const n = String(i + 1).padStart(2, '0');
    const mp3 = join(dir, `${n}.mp3`);
    if (!FORCE && !stale && existsSync(mp3)) return;
    jobs.push({ text, out: join(TMP, `${sheet.id}-${n}.wav`), mp3, sid: SID, speed: SPEED });
  });
}
if (purged) console.log(`급수표에 없는 음원 폴더 ${purged}개를 지웠다`);
if (restamped) console.log(`문항이나 굽는 방법이 바뀌어 다시 구울 급수 ${restamped}개`);
console.log(`급수 ${sheets.length}개 · 구울 음원 ${jobs.length}개 (Supertonic 화자 ${SID}, 속도 ${SPEED})`);
if (!jobs.length) { console.log('이미 다 구워져 있다. --force 로 다시 구울 수 있다.'); process.exit(0); }

const t0 = Date.now();
let bytes = 0;
let done = 0;
for (let i = 0; i < jobs.length; i += CHUNK) {
  const part = jobs.slice(i, i + CHUNK);
  const batchFile = join(TMP, 'batch.json');
  writeFileSync(batchFile, JSON.stringify(part.map(({ text, out, sid, speed }) => ({ text, out, sid, speed }))));
  execFileSync(PY, [TTS, '--batch', batchFile], { stdio: ['ignore', 'ignore', 'inherit'] });
  for (const j of part) {
    // 24kHz 모노 32kbps — 국어 음원과 같은 규격이라 교실에서 소리 크기가 튀지 않는다.
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', j.out,
      '-af', `adelay=${LEAD_MS}|${LEAD_MS},apad=pad_dur=${TAIL_S}`,
      '-ac', '1', '-ar', '24000', '-b:a', '32k', j.mp3]);
    rmSync(j.out, { force: true });
    bytes += readFileSync(j.mp3).length;
    done++;
  }
  const per = (Date.now() - t0) / done / 1000;
  console.log(`  ${done}/${jobs.length} · ${per.toFixed(2)}초/개 · 남은 시간 약 ${Math.round(per * (jobs.length - done) / 60)}분`);
}
rmSync(TMP, { recursive: true, force: true });
console.log(`음원 ${done}개 · ${(bytes / 1024 / 1024).toFixed(1)}MB · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
