/**
 * 급수표 문항을 미리 읽어 음원으로 굽는다 (Supertonic 3, 로컬·무료).
 *
 * 🔴 왜 미리 굽나: 브라우저 음성은 기기마다 있고 없고가 다르고, 조용히 막히는 방법이
 * 여러 가지다(2026-09-07 실측: 조작과 이어지지 않으면 not-allowed, 큐가 엉키면 무한 대기).
 * 교실에서 소리가 안 나면 수업이 멈춘다. 그래서 «내장 급수표»는 소리를 파일로 갖고 간다.
 * 파일은 정적 자산이라 서버도 요금도 필요 없다.
 *
 * 사용: node scripts/build-audio.mjs [--sid 3] [--speed 0.88] [--only g1-2-01] [--force]
 * 출력: public/audio/<급수 id>/<두 자리>.mp3
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PY = join(process.env.HOME, '.claude/venvs/sherpa-tts/bin/python3');
const TTS = join(process.env.HOME, '.claude/skills/yt-video-builder/scripts/supertonic_tts.py');
const OUT = join(ROOT, 'public/audio');
const TMP = join(ROOT, '.audio-tmp');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const SID = Number(arg('sid', 3));
const SPEED = Number(arg('speed', 0.88));
const ONLY = arg('only', null);
const FORCE = process.argv.includes('--force');

if (!existsSync(PY)) {
  console.error(`Supertonic 파이썬 환경이 없다: ${PY}`);
  process.exit(1);
}

// curriculum.ts 에서 문항을 읽는다 (타입스크립트를 컴파일하지 않고 파싱한다 — 형식이 단순하다)
const src = readFileSync(join(ROOT, 'src/engine/curriculum.ts'), 'utf8');
const body = src.slice(src.indexOf('export const CURRICULUM'));
const sheets = [...body.matchAll(/id: '([^']+)',[\s\S]*?items: \[([\s\S]*?)\],\s*\n\s*\}/g)].map((m) => ({
  id: m[1],
  items: [...m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1].replace(/\\'/g, "'")),
}));

if (!sheets.length) {
  console.error('급수표를 하나도 읽지 못했다 — curriculum.ts 형식이 바뀌었는지 확인할 것');
  process.exit(1);
}

const jobs = [];
for (const sheet of sheets) {
  if (ONLY && sheet.id !== ONLY) continue;
  mkdirSync(join(OUT, sheet.id), { recursive: true });
  sheet.items.forEach((text, i) => {
    const n = String(i + 1).padStart(2, '0');
    const mp3 = join(OUT, sheet.id, `${n}.mp3`);
    if (!FORCE && existsSync(mp3)) return;
    jobs.push({ text, out: join(TMP, `${sheet.id}-${n}.wav`), mp3, sid: SID, speed: SPEED });
  });
}

console.log(`급수 ${sheets.length}개 · 구울 음원 ${jobs.length}개 (화자 ${SID}, 속도 ${SPEED})`);
if (!jobs.length) {
  console.log('이미 다 구워져 있다. --force 로 다시 구울 수 있다.');
  process.exit(0);
}

mkdirSync(TMP, { recursive: true });
const batchFile = join(TMP, 'batch.json');
writeFileSync(batchFile, JSON.stringify(jobs.map(({ text, out, sid, speed }) => ({ text, out, sid, speed }))));

const t0 = Date.now();
execFileSync(PY, [TTS, '--batch', batchFile], { stdio: ['ignore', 'inherit', 'inherit'] });
console.log(`읽기 완료 ${((Date.now() - t0) / 1000).toFixed(1)}초 — mp3 로 옮기는 중…`);

let bytes = 0;
for (const j of jobs) {
  // 24kHz 모노 32kbps — 낱말 하나가 6KB 안쪽이다. 교실 스피커에는 충분하고 통신량은 가볍다.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', j.out, '-ac', '1', '-ar', '24000', '-b:a', '32k', j.mp3]);
  bytes += readFileSync(j.mp3).length;
}
rmSync(TMP, { recursive: true, force: true });
console.log(`음원 ${jobs.length}개 · ${(bytes / 1024 / 1024).toFixed(1)}MB · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
