/**
 * 문항이 모자란 급수만 골라 «보충» 배치를 만든다.
 * 이미 채택한 문항을 함께 보여 주고 「겹치지 말 것」을 못 박는다 —
 * 안 그러면 모자란 급수에 같은 문항이 다시 온다.
 *
 * 🔴 기준은 10개가 아니라 **12개**다. 교차검증이 문항을 빼고 나서 10개가 안 되면
 *    그 급수는 통째로 버려진다 — 여유 2개는 「그때 버리지 않기 위한 값」이다.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ready = JSON.parse(readFileSync('/tmp/gen-en/ready.json', 'utf8'));
const SPARE = Number(process.argv[2] ?? 12);
const need = ready.filter((s) => s.items.length < SPARE);
if (!need.length) { console.log('보충할 급수 없음 ✅'); process.exit(0); }

const RULES = readFileSync(new URL('./make-batch.mjs', import.meta.url), 'utf8')
  .match(/const RULES = `([\s\S]*?)`;/)[1];

const jobs = [];
for (let i = 0; i < need.length; i += 2) {
  const group = need.slice(i, i + 2);
  const spec = group.map((s) => {
    const kind = s.kind === 'word' ? '낱말 하나(마침표 없이)' : '문장(대문자 시작·부호로 끝)';
    const used = s.items.length ? `\n  이미 쓴 것(겹치지 말 것): ${s.items.join(' / ')}` : '';
    return `- 급수id "${s.id}" · ${s.grade}학년 ${s.semester}학기 · 제목 「${s.title}」 · 학습 포인트 「${s.point}」 · ${kind} · 글자 수 ${s.minLen}~${s.maxLen}자 · **${Math.max(3, 13 - s.items.length)}개 이상 더 필요**${used}`;
  }).join('\n');
  jobs.push({
    name: group.map((g) => g.id).join('+'),
    prompt: `${RULES}\n\n아래 급수에 문항을 «더» 지어라. 이미 쓴 것과 겹치면 안 된다:\n${spec}`,
    out: `/tmp/gen-en/out/topup-${group[0].id}.json`,
  });
}
const a = jobs.filter((_, i) => i % 3 < 2);
const b = jobs.filter((_, i) => i % 3 === 2);
writeFileSync('/tmp/gen-en/gpt-topup.jsonl', a.map((j) => JSON.stringify(j)).join('\n') + (a.length ? '\n' : ''));
writeFileSync('/tmp/gen-en/gemini-topup.jsonl', b.map((j) => JSON.stringify(j)).join('\n') + (b.length ? '\n' : ''));
console.log(`문항 ${SPARE}개 미만인 급수 ${need.length}개 → 보충 작업 ${jobs.length}건 (gpt ${a.length} · gemini ${b.length})`);
