/**
 * 받은 문항을 «넣기 전에» 기계로 거른다. 브릿지 출력을 검증 없이 커밋하지 않는다.
 * 여기서 걸리는 건 AI 에게 물어볼 필요도 없는 것들이다 — 기계가 잡을 건 기계가.
 */
import { readFileSync, readdirSync } from 'node:fs';

export function loadExisting() {
  const s = readFileSync(new URL('../src/engine/curriculum.ts', import.meta.url), 'utf8');
  const blocks = [...s.matchAll(/items: \[([\s\S]*?)\],\s*\n  \}/g)];
  return blocks.flatMap((b) => [...b[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'")));
}

// 🔴 큰따옴표 “ ” (U+201C/201D)와 작은따옴표 ‘ ’ 를 빠뜨리면 안 된다.
//    3학년 「따옴표가 있는 문장」·5학년 「인용」 급수가 **요구하는 부호**다.
//    이걸 막았더니 정상 문항 211개가 「쓸 수 없는 글자」로 탈락했다(2026-09-09).
//    앱 쪽 PUNCT_RE 는 이미 이 넷을 문장부호로 처리하고 있었다 — 좁았던 건 검증기다.
const ALLOWED = /^[가-힣0-9A-Za-z\s.,!?'"“”‘’…·:;—「」『』()%~-]+$/;

/** 문항 하나를 본다. 문제가 없으면 빈 배열. */
export function checkItem(text, sheet, seen) {
  const bad = [];
  const t = text;
  if (!t || t !== t.trim()) bad.push('앞뒤 공백');
  if (!ALLOWED.test(t)) bad.push('쓸 수 없는 글자');
  if (/\s{2,}/.test(t)) bad.push('공백 두 칸');
  if (t.length < sheet.minLen || t.length > sheet.maxLen) bad.push(`길이 ${t.length}자(${sheet.minLen}~${sheet.maxLen})`);
  // 문장 부호 뒤는 한 칸 (숫자 사이는 예외)
  for (const m of t.matchAll(/[.,!?;:…](?=[가-힣A-Za-z])/g)) {
    if (!/\d/.test(t[m.index - 1] ?? '')) bad.push('부호 뒤 붙여 씀');
  }
  // 🔴 제목 글자로 판정하지 않는다 — plan-sheets 가 정한 kind 를 그대로 믿는다.
  //    「두세 낱말로 된 문장」이 «낱말»로 넘어간 사고가 여기서 났다(2026-09-09).
  const isWordSheet = sheet.kind === 'word';
  if (isWordSheet) {
    if (/[.!?]$/.test(t)) bad.push('낱말 급수인데 문장');
  } else {
    if (!/[.!?]$/.test(t)) bad.push('끝맺음 부호 없음');
    if (sheet.grade >= 3 && !t.includes(' ')) bad.push('3학년 이상인데 낱말');
  }
  if (/[0-9]/.test(t)) bad.push('아라비아 숫자');
  const key = t.replace(/[\s.,!?'"…·:;—「」『』()]/g, '');
  if (seen.has(key)) bad.push(`중복(${seen.get(key)})`);
  return { bad, key };
}

export function verifySheet(sheet, items, seen) {
  const ok = [];
  const dropped = [];
  for (const t of items) {
    const { bad, key } = checkItem(t, sheet, seen);
    if (bad.length) dropped.push({ text: t, why: bad.join(', ') });
    else { ok.push(t); seen.set(key, sheet.id); }
  }
  return { ok, dropped };
}

if (process.argv[1]?.endsWith('verify-items.mjs')) {
  const sheets = JSON.parse(readFileSync('/tmp/gen5x/sheets.json', 'utf8'));
  const seen = new Map();
  for (const t of loadExisting()) seen.set(t.replace(/[\s.,!?'"…·:;—「」『』()]/g, ''), '기존');
  const files = readdirSync('/tmp/gen5x/out').filter((f) => f.endsWith('.json'));
  let total = 0, kept = 0, short = 0;
  const dropLog = [];
  for (const f of files) {
    let data;
    try {
      const raw = readFileSync(`/tmp/gen5x/out/${f}`, 'utf8').split('\n---\n')[0];
      data = JSON.parse(raw.replace(/^```json\s*|```\s*$/g, '').trim());
    } catch { dropLog.push(`${f}: JSON 파싱 실패`); continue; }
    for (const [id, items] of Object.entries(data)) {
      const sheet = sheets.find((s) => s.id === id);
      if (!sheet) { dropLog.push(`${id}: 모르는 급수`); continue; }
      const { ok, dropped } = verifySheet(sheet, items, seen);
      total += items.length; kept += Math.min(ok.length, 10);
      if (ok.length < 10) short++;
      for (const d of dropped) dropLog.push(`${id}: ${d.text} — ${d.why}`);
    }
  }
  console.log(`받은 문항 ${total} · 통과 ${kept} · 10개를 못 채운 급수 ${short}개`);
  console.log(dropLog.slice(0, 40).join('\n'));
  if (dropLog.length > 40) console.log(`… 그 외 ${dropLog.length - 40}건`);
}
