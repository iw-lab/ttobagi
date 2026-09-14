/**
 * 국어 음원을 **기계에 되들려 본다** (영어의 `scripts/en/asr-audio.mjs` 와 짝).
 *
 * 🔴 국어는 영어와 달리 «글자 그대로» 비교하면 안 된다 — 음성인식은 소리 나는 대로 적는다.
 *    「모래밭에는」이 「모레바테는」으로 나오는 건 연음을 바르게 읽었다는 뜻이지 오류가 아니다.
 *    그래서 두 가지만 본다:
 *      ① **음절 수**가 줄었는가 — 「있지는」이 「있진」이 되는 식의 **삼킴**. 받아쓰기에서
 *         음절이 사라지면 아이가 통째로 못 쓴다. 사용자가 신고한 것이 이 종류다.
 *      ② 자모 수준 닮음 — 소리가 아예 딴판인가.
 *
 * 🔴 「걸렸다 = 음원이 나쁘다」가 아니다. 걸린 것은 **새로 구워 대조**해야 판정이 된다
 *    (`rebake-unclear.mjs` 와 같은 원칙). 이 스크립트는 «사람이 볼 목록»만 낸다.
 *
 * 사용: node scripts/asr-ko.mjs [--shard 0/4] [--model small] [--out /tmp/ko-asr.json]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PY = join(process.env.HOME, '.claude/venvs/sherpa-tts/bin/python3');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const MODEL = arg('model', 'small');
const [SI, SN] = (arg('shard', '0/1')).split('/').map(Number);
const OUT = arg('out', `/tmp/ko-asr-${SI}.json`);

const { sheetsOf } = await import(join(ROOT, 'src/engine/curriculum.ts'));
const jobs = [];
for (const s of sheetsOf('ko')) s.items.forEach((t, i) => {
  const mp3 = join(ROOT, `public/audio/${s.id}/${String(i + 1).padStart(2, '0')}.mp3`);
  if (existsSync(mp3)) jobs.push({ id: s.id, n: i + 1, text: t, mp3 });
});
const mine = jobs.filter((_, i) => i % SN === SI);
console.error(`[shard ${SI}/${SN}] ${mine.length}개 / 전체 ${jobs.length}`);

const T = mkdtempSync(join(tmpdir(), `koasr${SI}-`));
writeFileSync(join(T, 'jobs.json'), JSON.stringify(mine.map((j) => ({ mp3: j.mp3, text: j.text, id: j.id, n: j.n }))));

const PYSRC = `
import json, sys, subprocess, warnings, os
warnings.filterwarnings('ignore')
import whisper
T = sys.argv[1]; model = sys.argv[2]; out = sys.argv[3]
m = whisper.load_model(model)
jobs = json.load(open(os.path.join(T, 'jobs.json')))
wav = os.path.join(T, 't.wav')
res = []
for k, j in enumerate(jobs):
    subprocess.run(['ffmpeg','-v','quiet','-y','-i',j['mp3'],'-ar','16000','-ac','1',wav], check=True)
    r = m.transcribe(wav, language='ko', fp16=False)
    res.append({**j, 'heard': r['text'].strip()})
    if k % 100 == 0: print(f'  {k}/{len(jobs)}', file=sys.stderr, flush=True)
json.dump(res, open(out, 'w'), ensure_ascii=False)
print(f'[shard] {len(res)}개 완료 → {out}', file=sys.stderr)
`;
execFileSync(PY, ['-c', PYSRC, T, MODEL, OUT], { stdio: ['ignore', 'inherit', 'inherit'] });
rmSync(T, { recursive: true, force: true });
