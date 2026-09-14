/**
 * 국어 음원 중 **되들었을 때 소리가 빠진 것**을 다시 굽는다.
 *
 * 🔴 왜: Supertonic 은 같은 문장도 구울 때마다 다르다. 「…활동할 수 있지요.」를 6번 구웠더니
 *    4번은 「있지요」, 2번은 **「있죠」** 로 나왔다 — 배포돼 있던 것이 하필 「있죠」 쪽이었다.
 *    받아쓰기에서 «지요» 가 «죠» 로 들리면 아이는 죠 라고 쓰고 틀린다
 *    (2026-09-14 사용자 신고 「있지는 이 있진으로 들린다」, 전수조사로 확인).
 *
 * 🔴 「걸렸다 = 음원이 나쁘다」가 아니다. 음성인식은 한글 숫자를 아라비아 숫자로 적고
 *    (십 센티미터 → 10cm) 짧은 낱말 하나는 영어로 알아듣기도 한다(떡국 → 빈 문자열).
 *    그래서 **새로 구운 것과 대조**한다 — 새 것이 또렷하면 배포본이 나쁜 draw 이고,
 *    새 것도 똑같으면 음성인식 탓이라 손대지 않는다.
 *
 * 사용: node scripts/rebake-ko.mjs [--tries 6] [--dry] [--only g6-2-30#3]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdtempSync, rmSync, copyFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PY = join(process.env.HOME, '.claude/venvs/sherpa-tts/bin/python3');
const TTS = join(process.env.HOME, '.claude/skills/yt-video-builder/scripts/supertonic_tts.py');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const TRIES = Number(arg('tries', 6));
const ONLY = arg('only', null);
const DRY = process.argv.includes('--dry');
const SID = 0, SPEED = 0.88;                       // build-audio.mjs 기본값과 같아야 한다

const syl = (s) => (s.match(/[가-힣]/g) ?? []).length;
const T = mkdtempSync(join(tmpdir(), 'koreb-'));

/** 한 파이썬 프로세스가 모형을 한 번만 올리고 계속 받아쓴다 — 매번 올리면 3초씩 버린다 */
const SERVER = `
import sys, json, subprocess, warnings, os
warnings.filterwarnings('ignore')
import whisper
m = whisper.load_model('small')
print('READY', flush=True)
for line in sys.stdin:
    p = line.strip()
    if not p: continue
    w = os.path.join('${T}', '_h.wav')
    subprocess.run(['ffmpeg','-v','quiet','-y','-i',p,'-ar','16000','-ac','1',w], check=True)
    print(json.dumps(m.transcribe(w, language='ko', fp16=False)['text'].strip()), flush=True)
`;
writeFileSync(join(T, 'srv.py'), SERVER);

const { spawnSync } = await import('node:child_process');
const bake = (text, k) => {
  const wav = join(T, `w${k}.wav`), mp3 = join(T, `m${k}.mp3`);
  writeFileSync(join(T, 'b.json'), JSON.stringify([{ text, out: wav, sid: SID, speed: SPEED }]));
  execFileSync(PY, [TTS, '--batch', join(T, 'b.json')], { stdio: 'ignore' });
  execFileSync('ffmpeg', ['-y','-loglevel','error','-i',wav,'-ac','1','-ar','24000','-b:a','32k',mp3]);
  return mp3;
};

const rows = JSON.parse(readFileSync(process.env.KO_LIST ?? '/tmp/ko-real.json', 'utf8'))
  .filter((r) => !ONLY || `${r.id}#${r.n}` === ONLY);
console.log(`대상 ${rows.length}개 (숫자 표기로 설명되는 것은 이미 빠져 있다)`);
if (DRY) { rows.forEach((r) => console.log(`  -${r.lost}  ${r.id} #${r.n}  ${r.text}`)); process.exit(0); }

// 받아쓰기 서버 띄우기
const { spawn } = await import('node:child_process');
const srv = spawn(PY, [join(T, 'srv.py')], { stdio: ['pipe', 'pipe', 'ignore'] });
let buf = '', queue = [];
srv.stdout.on('data', (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    const fn = queue.shift(); if (fn) fn(line);
  }
});
const hear = (p) => new Promise((res) => { queue.push((l) => res(l === 'READY' ? '' : JSON.parse(l))); srv.stdin.write(p + '\n'); });
await new Promise((res) => { queue.push(() => res()); });   // READY

let fixed = 0, asr = 0, kept = 0;
for (const r of rows) {
  const target = join(ROOT, `public/audio/${r.id}/${String(r.n).padStart(2, '0')}.mp3`);
  if (!existsSync(target)) { kept++; continue; }
  const want = syl(r.text);
  const shipped = syl(await hear(target));
  if (shipped >= want) { kept++; console.log(`  · ${r.id}#${r.n} 배포본이 이미 또렷하다`); continue; }
  let best = null;
  for (let k = 0; k < TRIES; k++) {
    const mp3 = bake(r.text, k);
    const got = syl(await hear(mp3));
    if (got >= want) { best = mp3; break; }            // 음절이 다 살아난 첫 draw
    if (!best || got > best.n) best = { mp3, n: got };
  }
  if (typeof best === 'string') {
    copyFileSync(best, target); fixed++;
    console.log(`  ✓ ${r.id}#${r.n}  ${want - shipped}음절 되살림 — ${r.text.slice(0, 26)}`);
  } else {
    asr++;
    console.log(`  ? ${r.id}#${r.n}  ${TRIES}번 구워도 같음 = 음성인식 한계 — ${r.text.slice(0, 26)}`);
  }
}
srv.kill(); rmSync(T, { recursive: true, force: true });
console.log(`\n고침 ${fixed} · 음성인식 한계 ${asr} · 이미 또렷 ${kept}`);
