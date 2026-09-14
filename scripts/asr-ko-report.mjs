/**
 * `asr-ko.mjs` 가 모은 되들은 결과를 «사람이 볼 목록»으로 간추린다.
 *
 * 🔴 국어는 글자 그대로 비교하면 안 된다 — 음성인식은 소리 나는 대로 적는다.
 *    「모래밭에는」→「모레바테는」은 연음을 바르게 읽었다는 뜻이지 오류가 아니다.
 *    그래서 «음절 수»와 «닮음» 두 가지만 본다. 음절이 사라진 것이 가장 나쁘다
 *    — 받아쓰기에서 소리가 통째로 빠지면 아이가 못 쓴다(사용자가 신고한 종류).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const syl = (s) => [...s].filter((c) => c >= '가' && c <= '힣').length;
const clean = (s) => s.replace(/[^가-힣]/g, '');

/** 자모 단위 편집거리 비율 — 0 이면 같고 1 이면 딴판 */
function jamoDist(a, b) {
  const J = (s) => [...s].flatMap((ch) => {
    const c = ch.charCodeAt(0) - 0xac00;
    return [Math.floor(c / 588), Math.floor((c % 588) / 28), c % 28];
  });
  const x = J(a), y = J(b);
  if (!x.length && !y.length) return 0;
  const prev = Array(y.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    let diag = prev[0]; prev[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const t = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (x[i - 1] === y[j - 1] ? 0 : 1));
      diag = t;
    }
  }
  return prev[y.length] / Math.max(x.length, y.length);
}

const rows = [0, 1, 2, 3].flatMap((i) => JSON.parse(readFileSync(`/tmp/ko-asr-${i}.json`, 'utf8')));
console.log(`문항 ${rows.length}개를 되들었다.\n`);

const scored = rows.map((r) => {
  const e = clean(r.text), h = clean(r.heard);
  return { ...r, lost: syl(e) - syl(h), dist: jamoDist(e, h) };
});

const lost = scored.filter((r) => r.lost >= 1).sort((a, b) => b.lost - a.lost);
const far = scored.filter((r) => r.lost < 1 && r.dist >= 0.35).sort((a, b) => b.dist - a.dist);

console.log(`■ 음절이 사라진 것 ${lost.length}개 — 「있지는」이 「있진」이 되는 종류`);
for (const r of lost.slice(0, 40)) {
  console.log(`  -${r.lost}음절  ${r.id} #${String(r.n).padStart(2, '0')}`);
  console.log(`      문항: ${r.text}`);
  console.log(`      들림: ${r.heard}`);
}
if (lost.length > 40) console.log(`  … 그 밖 ${lost.length - 40}개`);

console.log(`\n■ 소리가 많이 다른 것 ${far.length}개 (자모 거리 ≥ 0.35, 음절 수는 맞음)`);
for (const r of far.slice(0, 25)) {
  console.log(`  ${r.dist.toFixed(2)}  ${r.id} #${String(r.n).padStart(2, '0')}`);
  console.log(`      문항: ${r.text}`);
  console.log(`      들림: ${r.heard}`);
}
if (far.length > 25) console.log(`  … 그 밖 ${far.length - 25}개`);

const mid = scored.slice().sort((a, b) => a.dist - b.dist)[Math.floor(scored.length / 2)];
console.log(`\n자모 거리 중앙값 ${mid.dist.toFixed(3)} · 음절 사라짐 ${lost.length}/${rows.length} (${(lost.length / rows.length * 100).toFixed(1)}%)`);
writeFileSync('/tmp/ko-asr-report.json', JSON.stringify({ lost, far }, null, 1));
console.log('자세한 것 → /tmp/ko-asr-report.json');
