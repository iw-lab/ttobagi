/**
 * 받은 영어 문항을 «넣기 전에» 기계로 거른다. 브릿지 출력을 검증 없이 커밋하지 않는다.
 *
 * 🔴 국어와 결정적으로 다른 점: **영어는 철자를 기계가 검사할 수 있다.**
 * 낱말 목록(dwyl/english-words, 37만 낱말, 퍼블릭 도메인)에 없는 낱말은 그 자리에서 잡힌다.
 * 국어에는 그런 목록이 없어 교차검증에만 기댔지만, 영어는 그 앞에 결정론 그물을 하나 더 친다.
 * ⚠️ 다만 「사전에 있다」가 「그 자리에 맞는 낱말이다」는 아니다(there/their) — 그건 교차검증 몫이다.
 *
 * 낱말 목록은 `scripts/en/.cache/words_alpha.txt` 에 둔다(4MB, 저장소에 넣지 않는다).
 * 없으면 받는다: curl -sL -o scripts/en/.cache/words_alpha.txt \
 *   https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DICT_PATH = join(HERE, '.cache/words_alpha.txt');

let DICT = null;
export function dict() {
  if (DICT) return DICT;
  if (!existsSync(DICT_PATH)) {
    console.error(`낱말 목록이 없다: ${DICT_PATH}\n  curl -sL -o "${DICT_PATH}" https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt`);
    process.exit(1);
  }
  DICT = new Set(readFileSync(DICT_PATH, 'utf8').split(/\r?\n/).filter(Boolean));
  return DICT;
}

// 줄임말은 낱말 목록에 없다 — 초등에서 쓰는 것만 손으로 적는다.
const CONTRACTIONS = new Set([
  "i'm", "it's", "he's", "she's", "that's", "what's", "who's", "there's", "here's", "let's",
  "don't", "doesn't", "didn't", "can't", "won't", "isn't", "aren't", "wasn't", "weren't",
  "haven't", "hasn't", "hadn't", "couldn't", "shouldn't", "wouldn't", "mustn't",
  "i've", "you've", "we've", "they've", "i'll", "you'll", "he'll", "she'll", "we'll", "they'll",
  "i'd", "you'd", "he'd", "she'd", "we'd", "they'd", "you're", "we're", "they're", "o'clock",
]);

/** 낱말 하나가 «영어에 있는 말»인가 */
export function knownWord(raw) {
  const w = raw.toLowerCase().replace(/[’]/g, "'").replace(/^'+|'+$/g, '');
  if (!w) return true;
  if (CONTRACTIONS.has(w)) return true;
  const d = dict();
  if (d.has(w)) return true;
  // 소유격 (Tom's, dogs')
  if (w.endsWith("'s") && d.has(w.slice(0, -2))) return true;
  if (w.endsWith("s'") && d.has(w.slice(0, -1))) return true;
  return false;
}

/**
 * 요일·달 급수의 문장은 **요일·달 이름을 온전히** 담아야 한다.
 * 🔴 사전 검사로는 못 잡는다: Sun·Mon·Wed·Sat 은 전부 «진짜 영어 낱말»이라 사전을 통과한다.
 *    그런데 3학년 요일 받아쓰기에서 Mon 을 정답으로 두면 아이는 Monday 를 못 쓰게 된다.
 *    사전은 「영어에 있는 말인가」만 답한다 — 「이 자리에 맞는 말인가」는 별개다.
 */
const MUST_CONTAIN = {
  요일: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  달이름: ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'],
};

// 곧은 큰따옴표(")는 애초에 JSON 을 깨뜨려 여기까지 오지 못한다. 굽은 것만 허용한다.
const ALLOWED = /^[A-Za-z\s.,!?'’“”;:—-]+$/;

/**
 * 아포스트로피는 굽은 것(’)이 와도 곧은 것(')으로 고쳐 둔다.
 * 앱에서 '는 «철자»이고 ’는 «부호»라 이 둘이 섞이면 don't 와 don’t 가 다른 말이 된다.
 */
export function normalizeItem(text) {
  return text.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
}

export function checkItem(text, sheet, seen) {
  const bad = [];
  const t = text;
  if (!t || t !== t.trim()) bad.push('앞뒤 공백');
  if (!ALLOWED.test(t)) bad.push('쓸 수 없는 글자');
  if (/\s{2,}/.test(t)) bad.push('공백 두 칸');
  if (/[0-9]/.test(t)) bad.push('아라비아 숫자');
  if (t.length < sheet.minLen || t.length > sheet.maxLen) {
    bad.push(`길이 ${t.length}자(${sheet.minLen}~${sheet.maxLen})`);
  }
  // 부호 뒤는 한 칸
  for (const m of t.matchAll(/[.,!?;:](?=[A-Za-z])/g)) bad.push('부호 뒤 붙여 씀');

  const must = MUST_CONTAIN[sheet.point];
  if (must && !must.some((w) => new RegExp(`\\b${w}\\b`).test(t))) {
    bad.push(`${sheet.point} 급수인데 이름이 온전히 안 들어감`);
  }

  // 🔴 남의 말을 옮긴 문장은 **닫는 따옴표로 끝난다**(… doll.”).
  //    `[.!?]$` 로만 재면 인용 급수가 통째로 탈락한다 — 실제로 두 급수가 0문항이 됐다.
  //    자가 틀리면 좋은 문항이 나쁘게 보인다(국어에서 큰따옴표로 이미 겪었다).
  const ENDS_OK = /[.!?]["'”’]?$/;
  const isWord = sheet.kind === 'word';
  if (isWord) {
    if (ENDS_OK.test(t)) bad.push('낱말 급수인데 문장');
    if (/\s/.test(t)) bad.push('낱말 급수인데 두 낱말');
  } else {
    if (!ENDS_OK.test(t)) bad.push('끝맺음 부호 없음');
    if (!/^[A-Z]/.test(t)) bad.push('문장인데 소문자로 시작');
    if (!/\s/.test(t)) bad.push('문장인데 낱말 하나');
  }

  // 철자 — 여기가 국어에 없던 그물이다
  const words = t.replace(/[.,!?;:—“”-]/g, ' ').split(/\s+/).filter(Boolean);
  const unknown = words.filter((w) => !knownWord(w));
  if (unknown.length) bad.push(`사전에 없는 낱말(${unknown.join(', ')})`);

  // 🔴 낱말 급수의 중복은 «같은 학습 포인트 안에서만» 본다.
  //    ① 전역으로 보면 산수로 불가능하다 — 권장 어휘 800~900낱말인데 낱말 칸은 1,140개다.
  //    ② 학기로 넓혀도 급수가 통째로 죽는다(실측: 3학년 색깔·동물·음식 급수가 «앞 급수가
  //       그 낱말을 먼저 썼다»는 이유로 버려졌다. 학기당 30급 중 6급).
  //    ③ 정작 막아야 할 단조로움은 **같은 초점끼리 겹치는 것**이다 —
  //       단모음a 급수 둘이 같은 낱말을 쓰면 두 번째 급수는 배울 게 없다.
  //       반면 「색깔」 급수와 「단모음e」 급수에 red 가 각각 나오는 것은 복습이다.
  //    문장은 사실상 무한하므로 겹치면 그건 생성기의 실패다 — 그대로 전역으로 본다.
  const norm = t.toLowerCase().replace(/[^a-z']/g, '');
  const key = isWord ? `${sheet.grade}-${sheet.semester}-${sheet.point}\t${norm}` : norm;
  if (seen.has(key)) bad.push(`중복(${seen.get(key)})`);
  return { bad, key };
}

export function verifySheet(sheet, items, seen) {
  const ok = [];
  const dropped = [];
  for (const raw of items) {
    if (typeof raw !== 'string') { dropped.push({ text: String(raw), why: '문자열 아님' }); continue; }
    const t = normalizeItem(raw);
    const { bad, key } = checkItem(t, sheet, seen);
    if (bad.length) dropped.push({ text: t, why: bad.join(', ') });
    else { ok.push(t); seen.set(key, sheet.id); }
  }
  return { ok, dropped };
}

if (process.argv[1]?.endsWith('verify-items.mjs')) {
  const sheets = JSON.parse(readFileSync('/tmp/gen-en/sheets.json', 'utf8'));
  const seen = new Map();
  const files = readdirSync('/tmp/gen-en/out').filter((f) => f.endsWith('.json'));
  let total = 0, kept = 0, short = 0, sheetsSeen = 0;
  const dropLog = [];
  const reasons = new Map();
  for (const f of files) {
    let data;
    try {
      const raw = readFileSync(`/tmp/gen-en/out/${f}`, 'utf8').split('\n---\n')[0];
      data = JSON.parse(raw.replace(/^```json\s*|```\s*$/g, '').trim());
    } catch { dropLog.push(`${f}: JSON 파싱 실패`); continue; }
    for (const [id, items] of Object.entries(data)) {
      if (!Array.isArray(items)) continue;
      const sheet = sheets.find((s) => s.id === id);
      if (!sheet) { dropLog.push(`${id}: 모르는 급수`); continue; }
      sheetsSeen++;
      const { ok, dropped } = verifySheet(sheet, items, seen);
      total += items.length; kept += Math.min(ok.length, 10);
      if (ok.length < 10) short++;
      for (const d of dropped) {
        dropLog.push(`${id}: ${d.text} — ${d.why}`);
        const head = d.why.split(',')[0].replace(/\(.*/, '').replace(/길이 \d+자.*/, '길이');
        reasons.set(head, (reasons.get(head) ?? 0) + 1);
      }
    }
  }
  console.log(`급수 ${sheetsSeen}개 · 받은 문항 ${total} · 통과 ${kept} · 10개를 못 채운 급수 ${short}개`);
  console.log('\n탈락 사유:');
  for (const [why, n] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  ${n.toString().padStart(4)}  ${why}`);
  console.log('\n' + dropLog.slice(0, 30).join('\n'));
  if (dropLog.length > 30) console.log(`… 그 외 ${dropLog.length - 30}건`);
}

/**
 * 브릿지 출력 파일에서 급수별 문항 배열을 꺼낸다.
 *
 * 🔴 그냥 JSON.parse 하면 안 되는 이유: 재시도가 일어나면 파일 안에 **응답이 둘 이어 붙는다**
 *    (…"crayon{"e3-1-10": […). 그러면 전체 파싱은 실패하는데, 그 안의 «온전한 배열»은 멀쩡하다.
 *    다시 묻기 전에 건질 수 있는 것을 건진다 — 브릿지 왕복은 비싸다.
 *    ⚠️ 잘린 배열(닫는 ] 이 없는 것)은 정규식이 애초에 잡지 못하므로 반쪽 문항이 들어오지 않는다.
 */
export function readItems(path) {
  const raw = readFileSync(path, 'utf8').split('\n---\n')[0].replace(/^```json\s*|```\s*$/g, '').trim();
  try {
    const d = JSON.parse(raw);
    const out = {};
    for (const [k, v] of Object.entries(d)) if (Array.isArray(v)) out[k] = v;
    if (Object.keys(out).length) return out;
  } catch {
    /* 아래에서 건져 본다 */
  }
  const out = {};
  for (const m of raw.matchAll(/"(e\d-\d-\d\d)"\s*:\s*(\[[^[\]]*\])/g)) {
    try {
      const arr = JSON.parse(m[2]);
      if (Array.isArray(arr) && arr.length) out[m[1]] = [...(out[m[1]] ?? []), ...arr];
    } catch { /* 그 배열만 버린다 */ }
  }
  return out;
}
