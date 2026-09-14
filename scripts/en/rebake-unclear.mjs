/**
 * 되들었을 때 딴 말로 들리는 영어 낱말 음원을 **가려내고 다시 굽는다**.
 *
 * 🔴 「음성인식이 틀렸다」와 「음원이 나쁘다」는 다르다. one→1, see→C, know→No 는
 *    음성인식의 한계지 음원 잘못이 아니다. 그래서 **같은 낱말을 새로 여러 번 구워
 *    대조한다** — 새로 구운 것은 잘 알아듣는데 배포본만 못 알아들으면 배포본이
 *    나쁜 draw 이고, 새로 구운 것도 똑같이 못 알아들으면 음성인식 탓이다.
 *
 * 사용: node scripts/en/rebake-unclear.mjs --words goat,worn,sheep [--tries 8] [--dry]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const PY = join(process.env.HOME, '.claude/venvs/sherpa-tts/bin/python3');
const TTS = join(process.env.HOME, '.claude/skills/yt-video-builder/scripts/supertonic_tts.py');
const MODEL = join(process.env.HOME, '.cache/whisper-ggml/ggml-base.en.bin');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const TRIES = Number(arg('tries', 8));
const DRY = process.argv.includes('--dry');
const WANT = (arg('words', '') || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
const SID = 0, SPEED = 0.92, LEAD_MS = 120, TAIL_S = 0.30;

const T = mkdtempSync(join(tmpdir(), 'unclear-'));
const norm = (s) => s.toLowerCase().replace(/[^a-z' ]/g, '').trim();
const to16 = (src) => { const o = join(T, `${Math.random().toString(36).slice(2)}.wav`);
  execFileSync('ffmpeg', ['-v','quiet','-y','-i',src,'-ar','16000','-ac','1',o]); return o; };
const hear = (src) => norm(execFileSync('whisper-cli', ['-m', MODEL, '-f', to16(src), '-nt', '-np']).toString());
const bake = (word, k) => {
  const wav = join(T, `w${k}.wav`), mp3 = join(T, `m${k}.mp3`);
  writeFileSync(join(T, 'b.json'), JSON.stringify([{ text: word, out: wav, sid: SID, speed: SPEED }]));
  execFileSync(PY, [TTS, '--batch', join(T, 'b.json')], { stdio: 'ignore' });
  execFileSync('ffmpeg', ['-v','quiet','-y','-i',wav,'-af',`adelay=${LEAD_MS}|${LEAD_MS},apad=pad_dur=${TAIL_S}`,
    '-codec:a','libmp3lame','-b:a','32k','-ar','24000','-ac','1', mp3]);
  return mp3;
};

const { sheetsOf } = await import(join(ROOT, 'src/engine/curriculum.ts'));
const targets = [];
for (const s of sheetsOf('en')) s.items.forEach((t, i) => {
  const w = t.trim();
  if (/\s/.test(w)) return;
  const plain = norm(w);
  if (WANT.length && !WANT.includes(plain)) return;
  const mp3 = join(ROOT, `public/audio/${s.id}/${String(i + 1).padStart(2, '0')}.mp3`);
  if (existsSync(mp3)) targets.push({ id: s.id, n: i + 1, word: plain, mp3 });
});

let fixed = 0, asrFault = 0, kept = 0;
for (const t of targets) {
  const shipped = hear(t.mp3);
  if (shipped === t.word) { console.log(`  · ${t.word.padEnd(10)} 배포본이 이미 또렷하다`); continue; }
  // 새로 구운 것들은 알아듣는가?
  const draws = [];
  for (let k = 0; k < TRIES; k++) { const m = bake(t.word, k); if (hear(m) === t.word) draws.push(m); }
  if (!draws.length) {
    asrFault++;
    console.log(`  ? ${t.word.padEnd(10)} 새로 ${TRIES}번 구워도 「${shipped}」류로 들림 = 음성인식 한계, 음원 탓 아님`);
    continue;
  }
  if (DRY) { console.log(`  → ${t.word.padEnd(10)} 배포본 「${shipped}」 / 새로 구우면 ${draws.length}/${TRIES} 또렷 = 바꿀 만하다`); fixed++; continue; }
  copyFileSync(draws[0], t.mp3);
  fixed++;
  console.log(`  ✓ ${t.word.padEnd(10)} 「${shipped}」 → 또렷한 draw 로 교체 (${draws.length}/${TRIES})  ${t.id} #${t.n}`);
}
rmSync(T, { recursive: true, force: true });
console.log(`\n${DRY ? '바꿀 만한 것' : '고침'} ${fixed} · 음성인식 한계 ${asrFault} · 이미 또렷 ${kept}`);
