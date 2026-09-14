/**
 * 마찰음(f·v·th)이 약하게 구워진 영어 낱말 음원을 **다시 굽는다**.
 *
 * 🔴 왜: Supertonic 은 같은 낱말을 구울 때마다 결과가 다르다 — 「fan」을 두 번 구웠더니
 *    3kHz 이상 마찰음 비율이 0.29 와 0.17 로 널뛰었다. 배포돼 있던 fan 은 0.05 로,
 *    같은 엔진이 만든 「ban」(0.08)보다도 약했다. 그래서 아이에게 «밴(드)» 로 들렸다
 *    (2026-09-14 사용자 신고, 귀가 옳았다).
 *
 * 🔴 「소리가 났다」도 「음성인식이 맞혔다」도 충분하지 않다 — whisper 는 0.05 짜리
 *    fan 도 «Fan» 이라고 맞혔다. 기계는 아이보다 잘 듣는다. 그래서 **음성인식 + 마찰음
 *    세기** 둘 다 통과한 것만 받는다.
 *
 * 방법: 후보를 여러 번 굽고, ① 되들어서 같은 낱말이 나오고 ② 마찰음이 가장 센 것을 고른다.
 *       한 번도 기준을 넘지 못하면 **바꾸지 않고 그대로 두고 목록에 적는다**(나쁜 것을
 *       더 나쁜 것으로 바꾸지 않는다).
 *
 * 사용: node scripts/en/rebake-fricatives.mjs [--tries 6] [--min 0.15] [--dry]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const PY = join(process.env.HOME, '.claude/venvs/sherpa-tts/bin/python3');
const TTS = join(process.env.HOME, '.claude/skills/yt-video-builder/scripts/supertonic_tts.py');
const MODEL = join(process.env.HOME, '.cache/whisper-ggml/ggml-base.en.bin');

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const TRIES = Number(arg('tries', 6));
const MIN = Number(arg('min', 0.15));
const TARGET = Number(arg('target', 0.25));   // 제대로 구워졌을 때의 전형값(fan 0.17~0.29 실측)
const DRY = process.argv.includes('--dry');
const ONLY = arg('only', null);   // 「급수id#번호」 하나만 시험할 때
// 굽는 방법은 .items.json 의 레시피(st/0/0.92/120/0.30)와 같아야 한다
const SID = 0, SPEED = 0.92, LEAD_MS = 120, TAIL_S = 0.30;

const FRIC_PY = `
import sys, numpy as np, wave
w = wave.open(sys.argv[1]); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float); w.close()
a /= (np.abs(a).max() or 1)
e = np.abs(a); idx = np.where(e > e.max()*0.02)[0]
a = a[idx[0]:idx[-1]+1] if len(idx) else a
n = int(16000*0.07); seg = a[:n]
S = np.abs(np.fft.rfft(seg*np.hanning(len(seg)))); f = np.fft.rfftfreq(len(seg), 1/16000)
print(round(float(S[f>3000].sum()/(S.sum()+1e-9)), 4))
`;

const TMP = mkdtempSync(join(tmpdir(), 'rebake-'));
const to16k = (src) => { const o = join(TMP, `${Math.random().toString(36).slice(2)}.wav`);
  execFileSync('ffmpeg', ['-v','quiet','-y','-i',src,'-ar','16000','-ac','1',o]); return o; };
const fric = (src) => Number(execFileSync('python3', ['-c', FRIC_PY, to16k(src)]).toString().trim());
const hear = (src) => execFileSync('whisper-cli', ['-m', MODEL, '-f', to16k(src), '-nt', '-np'])
  .toString().trim().toLowerCase().replace(/[^a-z' ]/g, '').trim();

export async function main() {
  const { sheetsOf } = await import(join(ROOT, 'src/engine/curriculum.ts'));
  const targets = [];
  for (const s of sheetsOf('en')) s.items.forEach((t, i) => {
    const w = t.trim().replace(/[^a-zA-Z']/g, '');
    if (/\s/.test(t.trim()) || !/^(f|v|th)/i.test(w)) return;
    const mp3 = join(ROOT, `public/audio/${s.id}/${String(i + 1).padStart(2, '0')}.mp3`);
    if (existsSync(mp3)) targets.push({ id: s.id, n: i + 1, word: w, mp3 });
  });

  const picked = ONLY ? targets.filter((t) => `${t.id}#${t.n}` === ONLY) : targets;
  const weak = picked.map((t) => ({ ...t, before: fric(t.mp3) })).filter((t) => t.before < MIN);
  console.log(`마찰음 낱말 ${picked.length}개 중 약한 것 ${weak.length}개 (기준 ${MIN})`);
  if (DRY) { weak.forEach((t) => console.log(`  ${t.before.toFixed(3)} ${t.id} #${t.n} ${t.word}`)); return; }

  const fixed = [], kept = [];
  for (const t of weak) {
    let best = null;
    for (let k = 0; k < TRIES; k++) {
      const wav = join(TMP, `c${k}.wav`);
      writeFileSync(join(TMP, 'b.json'), JSON.stringify([{ text: t.word, out: wav, sid: SID, speed: SPEED }]));
      execFileSync(PY, [TTS, '--batch', join(TMP, 'b.json')], { stdio: 'ignore' });
      const mp3 = join(TMP, `c${k}.mp3`);
      execFileSync('ffmpeg', ['-v','quiet','-y','-i',wav,
        '-af', `adelay=${LEAD_MS}|${LEAD_MS},apad=pad_dur=${TAIL_S}`,
        '-codec:a','libmp3lame','-b:a','32k','-ar','24000','-ac','1', mp3]);
      const heard = hear(mp3);
      if (heard !== t.word.toLowerCase()) continue;      // 되들어서 틀리면 버린다
      const f = fric(mp3);
      if (f < MIN) continue;                            // 여전히 약하면 버린다
      // 🔴 «가장 센 것»을 고르면 안 된다 — 마찰음만 유난히 큰 이상한 draw 가 뽑힌다
      //    (fan 을 8번 구웠더니 0.643 짜리가 나왔다. 정상은 0.17~0.29 다).
      //    정상 범위 한가운데(TARGET)에 가장 가까운 것을 고른다.
      const score = Math.abs(f - TARGET);
      if (!best || score < best.score) best = { f, mp3, score };
    }
    if (best) {
      copyFileSync(best.mp3, t.mp3);
      fixed.push({ ...t, after: best.f });
      console.log(`  ✓ ${t.word.padEnd(12)} ${t.before.toFixed(3)} → ${best.f.toFixed(3)}  ${t.id} #${t.n}`);
    } else {
      kept.push(t);
      console.log(`  · ${t.word.padEnd(12)} ${t.before.toFixed(3)} → 더 나은 것을 못 얻어 그대로 둠`);
    }
  }
  rmSync(TMP, { recursive: true, force: true });
  console.log(`\n고침 ${fixed.length} · 그대로 ${kept.length}`);
  if (kept.length) console.log('사람이 들어 볼 것: ' + kept.map((t) => `${t.word}(${t.id}#${t.n})`).join(' '));
}
main();
