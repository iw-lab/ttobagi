/**
 * 영어 받아쓰기 채점에 필요한 표와 판정.
 * hangul.ts 가 국어 쪽에서 하는 일을 영어 쪽에서 한다.
 *
 * 설계 원칙
 *  1. 오류 유형은 «비교만으로 증명되는 것»만 낸다. 소리를 추측해서 붙이지 않는다.
 *     (한국 학생이 자주 틀리는 r/l·b/v·p/f 는 자음철자 안에서 설명으로 다룬다.)
 *  2. 더 구체적인 판정이 먼저다 — 겹글자·묵음이 「글자빠짐」으로 뭉개지면
 *     교사에게 쓸모 있는 통계가 안 나온다.
 *  3. 전부 브라우저에서 돈다. 사전 파일도 서버도 없다.
 */

export type EnErrorTag =
  | '묵음'
  | '겹글자'
  | '모음철자'
  | '자음철자'
  | 'ie/ei'
  | '어미'
  | '동음이의'
  | '순서바뀜'
  | '대문자'
  | '띄어쓰기'
  | '문장부호'
  | '글자빠짐'
  | '글자더함'
  | '기타';

export const EN_TAGS: EnErrorTag[] = [
  '묵음', '겹글자', '모음철자', '자음철자', 'ie/ei', '어미', '동음이의',
  '순서바뀜', '대문자', '띄어쓰기', '문장부호', '글자빠짐', '글자더함', '기타',
];

export const EN_TAG_HELP: Record<EnErrorTag, string> = {
  묵음: '소리 나지 않는 글자를 빠뜨렸어요. know 의 k, cake 의 e 처럼 안 들려도 써야 하는 글자가 있어요.',
  겹글자: '같은 글자를 두 번 쓰는 자리예요. rabbit, running 처럼 자음이 겹치기도 하고 book, tree 처럼 모음이 겹치기도 해요.',
  모음철자: '소리는 맞지만 모음 글자를 다르게 썼어요. ea/ee, ai/ay 처럼 같은 소리를 여러 방법으로 써요.',
  자음철자: '자음 글자를 다르게 썼어요. r 과 l, b 와 v, p 와 f 는 우리말에 없는 구별이라 특히 헷갈려요.',
  'ie/ei': 'ie 와 ei 의 차례가 바뀌었어요. friend, believe 처럼 i 가 먼저인 낱말이 많아요.',
  어미: '낱말 끝을 바꿔 쓰는 규칙이에요. -s, -ed, -ing, y→ies 를 다시 살펴봐요.',
  동음이의: '소리가 같거나 아주 비슷해서 헷갈리는 낱말이에요. there/their, to/too, quiet/quite 처럼 뜻을 보고 골라야 해요.',
  순서바뀜: '글자 두 개의 차례가 바뀌었어요.',
  대문자: '큰 글자와 작은 글자를 가려 써요. 문장의 첫 글자, 이름, 요일과 달은 큰 글자로 시작해요.',
  띄어쓰기: '낱말 사이를 띄어 쓰는 자리가 달라요.',
  문장부호: '마침표·물음표·아포스트로피 같은 부호가 달라요.',
  글자빠짐: '글자를 빠뜨렸어요.',
  글자더함: '글자를 더 썼어요.',
  기타: '다른 종류의 실수예요.',
};

/**
 * 영어에서 아포스트로피는 «부호»가 아니라 **철자의 일부**다.
 * 국어용 PUNCT_RE 를 그대로 쓰면 don't 와 dont 가 같은 말이 되어 버린다.
 */
export const EN_PUNCT_RE = /[.,!?~…·"“”‘’()［］[\]{}:;\-—]/g;

const VOWEL = new Set(['a', 'e', 'i', 'o', 'u']);
/**
 * y 는 낱말 안이나 끝에서 모음 노릇을 한다(baby, my). 첫소리 y(yes)는 자음이다.
 * w 도 앞에 모음이 오면 모음 짝의 한쪽이다(ow·aw·ew) — brown 을 braun 으로 쓴 것은
 * 자음 실수가 아니라 «같은 소리를 다른 모음 글자로 쓴» 실수다.
 */
export function isVowelAt(word: string, i: number): boolean {
  const ch = word[i];
  if (VOWEL.has(ch)) return true;
  if (ch === 'y' && i > 0) return true;
  return ch === 'w' && i > 0 && VOWEL.has(word[i - 1]);
}
export const isVowelChar = (ch: string): boolean => VOWEL.has(ch) || ch === 'y';

/** 소리가 가까워 서로 바꿔 쓰기 쉬운 자음 짝 — 정렬 비용을 낮춰 «비슷한 글자»가 짝지어지게 한다 */
const NEAR_CONSONANT: string[][] = [
  ['c', 'k'], ['c', 's'], ['s', 'z'], ['f', 'v'], ['b', 'v'], ['p', 'f'],
  ['r', 'l'], ['j', 'g'], ['d', 't'], ['g', 'k'], ['m', 'n'], ['b', 'p'],
];
const nearSet = new Set(NEAR_CONSONANT.flatMap(([a, b]) => [`${a}${b}`, `${b}${a}`]));

/**
 * 아이폰·아이패드는 자판에서 ' 를 ’ 로 바꿔 버린다. 앱에서 ' 는 «철자»이고 ’ 는 «부호»라
 * 그대로 두면 don't 와 don’t 가 다른 말이 된다 — 아이는 바르게 썼는데 틀렸다고 나온다.
 * 글자 수가 변하지 않는 1:1 치환이라 채점 자리(map)가 어긋나지 않는다.
 */
export function foldApostrophe(text: string): string {
  return text.replace(/[’‘]/g, "'");
}

/** 글자 한 칸이 얼마나 다른가 (0=같음, 1=완전히 다름) */
export function letterCost(a: string, b: string): number {
  if (a === b) return 0;
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  // 🔴 대소문자만 다른 것을 0 으로 주면 안 된다. 「글자+띄어쓰기+문장부호」 엄격도에서는
  //    대문자가 점수에 들어가는데, 정렬이 «같은 글자»라고 하면 칸이 맞았다고 표시된다 —
  //    아이는 다 맞은 화면을 보면서 틀렸다는 점수를 받는다.
  if (x === y) return 0.2;
  if (isVowelChar(x) && isVowelChar(y)) return 0.4;
  if (nearSet.has(`${x}${y}`)) return 0.4;
  return 1;
}

/** 글자 단위 편집거리 — 유사도 계산용 (국어의 jamoDistance 자리) */
export function letterDistance(a: string, b: string): number {
  const x = [...a.toLowerCase()];
  const y = [...b.toLowerCase()];
  const n = x.length;
  const m = y.length;
  if (n === 0) return m;
  if (m === 0) return n;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  let cur = new Array<number>(m + 1);
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    for (let j = 1; j <= m; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    [prev, cur] = [cur, prev];
  }
  return prev[m];
}

/* ───────────────────────────── 동음이의어 표 ───────────────────────────── */

// 초등 교육과정 어휘 안에서 실제로 헷갈리는 짝만 담는다. 표가 커지면 오탐이 는다.
// 완전한 동음이의(there/their)뿐 아니라 한국 학생이 소리로 못 가리는 짝(quiet/quite,
// won't/want)도 함께 둔다 — 아이가 겪는 실수는 음성학 정의가 아니라 «헷갈림»이다.
const HOMOPHONE_GROUPS: string[][] = [
  ['there', 'their', "they're"], ['to', 'too', 'two'], ['its', "it's"],
  ['your', "you're"], ['hear', 'here'], ['write', 'right'], ['no', 'know'],
  ['see', 'sea'], ['son', 'sun'], ['one', 'won'], ['for', 'four'],
  ['ate', 'eight'], ['buy', 'by', 'bye'], ['blue', 'blew'], ['made', 'maid'],
  ['meet', 'meat'], ['week', 'weak'], ['road', 'rode'], ['wait', 'weight'],
  ['flower', 'flour'], ['knew', 'new'], ['our', 'hour'], ['piece', 'peace'],
  ['plain', 'plane'], ['sale', 'sail'], ['tail', 'tale'], ['threw', 'through'],
  ['whole', 'hole'], ['wood', 'would'], ['be', 'bee'], ['deer', 'dear'],
  ['mail', 'male'], ['nose', 'knows'], ['pair', 'pear'], ['some', 'sum'],
  ['steal', 'steel'], ['break', 'brake'], ['whether', 'weather'],
  // 🔴 곧은 아포스트로피로 쓴다 — 채점 전에 굽은 ’ 을 ' 로 되돌리므로,
  //    여기에 ’ 를 쓰면 이 짝은 영영 맞지 않는다.
  ['where', 'wear'], ["won't", 'want'], ['then', 'than'], ['quiet', 'quite'],
];
const HOMOPHONE = new Map<string, Set<string>>();
for (const g of HOMOPHONE_GROUPS) {
  for (const w of g) {
    const set = HOMOPHONE.get(w) ?? new Set<string>();
    for (const other of g) if (other !== w) set.add(other);
    HOMOPHONE.set(w, set);
  }
}

/* ───────────────────────────── 개별 판정기 ───────────────────────────── */

/** 같은 글자가 잇달아 나오는 것을 하나로 줄인다 — rabbit → rabit */
function collapseDoubles(w: string): string {
  let out = '';
  for (const ch of w) if (out[out.length - 1] !== ch) out += ch;
  return out;
}

/** ie ↔ ei 를 서로 뒤집는다 */
function swapIeEi(w: string): string {
  return w.replace(/ie|ei/g, (m) => (m === 'ie' ? 'ei' : 'ie'));
}

/** 길이가 같고 글자 두 개의 «자리»만 맞바뀌었는가 */
function isTransposed(e: string, a: string): boolean {
  if (e.length !== a.length) return false;
  const diff: number[] = [];
  for (let i = 0; i < e.length; i++) if (e[i] !== a[i]) diff.push(i);
  if (diff.length !== 2) return false;
  const [i, j] = diff;
  return e[i] === a[j] && e[j] === a[i];
}

/**
 * a 가 e 에서 «글자를 빼기만» 해서 만들어졌다면 뺀 자리들을 돌려준다. 아니면 null.
 * (바꿔 쓴 게 섞여 있으면 묵음이라고 말할 수 없다.)
 */
function pureDeletions(e: string, a: string): number[] | null {
  if (a.length >= e.length) return null;
  const idx: number[] = [];
  let j = 0;
  for (let i = 0; i < e.length; i++) {
    if (j < a.length && e[i] === a[j]) j++;
    else idx.push(i);
  }
  return j === a.length ? idx : null;
}

/** e 의 i 번째 글자가 «소리 나지 않는 자리»인가 — 알려진 꼴만 참으로 본다 */
function isSilentAt(e: string, i: number): boolean {
  const ch = e[i];
  const prev = e[i - 1] ?? '';
  const next = e[i + 1] ?? '';
  if (ch === 'e' && i === e.length - 1 && e.length >= 4) return true; // cake, home
  if (ch === 'k' && i === 0 && next === 'n') return true; // know
  if (ch === 'w' && i === 0 && (next === 'r' || next === 'h')) return true; // write, who
  if (ch === 'g' && next === 'h') return true; // night, light
  if (ch === 'h' && (prev === 'g' || prev === 'w')) return true; // night, what
  if (ch === 'b' && prev === 'm' && (i === e.length - 1 || next === 'i')) return true; // comb, climbing
  if (ch === 'l' && (next === 'k' || next === 'f' || next === 'm')) return true; // walk, half, calm
  if (ch === 't' && prev === 's' && (next === 'l' || next === 'e')) return true; // castle, listen
  if (ch === 'u' && prev === 'g') return true; // guess, guitar
  return false;
}

const SUFFIXES = ['ies', 'ied', 'ing', 'es', 'ed', 'er', 'est', 's', 'd'];

/** 낱말에서 어미를 떼어 나올 수 있는 «줄기»들 */
function stems(w: string): Set<string> {
  const out = new Set<string>([w]);
  for (const suf of SUFFIXES) {
    if (!w.endsWith(suf)) continue;
    const base = w.slice(0, -suf.length);
    // 🔴 줄기가 두 글자 이하면 어미가 아니다 — bed→be, his→hi 가 「어미 실수」로 잡힌다.
    if (base.length < 3) continue;
    out.add(base);
    out.add(`${base}e`); // baked → bake
    if (base[base.length - 1] === base[base.length - 2]) out.add(base.slice(0, -1)); // running → run
    if (suf === 'ies' || suf === 'ied') out.add(`${base}y`); // babies → baby
  }
  return out;
}

function sharesStem(e: string, a: string): boolean {
  if (Math.min(e.length, a.length) < 3) return false;
  const se = stems(e);
  for (const s of stems(a)) if (se.has(s)) return true;
  return false;
}

/** 남은 차이를 글자 단위로 뜯어 본다 — 위의 이름 붙은 판정이 모두 빗나갔을 때 */
function fallbackTags(e: string, a: string, add: (t: EnErrorTag) => void): void {
  const x = [...e];
  const y = [...a];
  const n = x.length;
  const m = y.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = i;
  for (let j = 1; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
  }
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1)) {
      if (x[i - 1] !== y[j - 1]) {
        const ev = isVowelAt(e, i - 1);
        const av = isVowelAt(a, j - 1);
        if (ev && av) add('모음철자');
        else if (!ev && !av) add('자음철자');
        else add('기타');
      }
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      add('글자빠짐');
      i--;
    } else {
      add('글자더함');
      j--;
    }
  }
}

/**
 * 정답 낱말 하나와 학생이 쓴 낱말 하나를 견주어 오류 유형을 낸다.
 * 🔴 순서가 곧 «구체성»이다 — 겹글자·묵음을 먼저 보지 않으면 전부 글자빠짐으로 뭉개진다.
 */
export function classifyWordPair(expectedRaw: string, actualRaw: string): EnErrorTag[] {
  const e = expectedRaw.toLowerCase();
  const a = actualRaw.toLowerCase();
  if (e === a) return expectedRaw === actualRaw ? [] : ['대문자'];

  const tags: EnErrorTag[] = [];
  if (expectedRaw.toLowerCase() !== expectedRaw && actualRaw.toLowerCase() === actualRaw) {
    tags.push('대문자'); // 큰 글자로 시작해야 하는데 작게 썼다
  }
  const add = (t: EnErrorTag): void => { if (!tags.includes(t)) tags.push(t); };

  if (HOMOPHONE.get(e)?.has(a)) { add('동음이의'); return tags; }
  if (e !== collapseDoubles(e) || a !== collapseDoubles(a)) {
    if (collapseDoubles(e) === collapseDoubles(a)) { add('겹글자'); return tags; }
  }
  if (swapIeEi(e) === a) { add('ie/ei'); return tags; }
  if (isTransposed(e, a)) { add('순서바뀜'); return tags; }
  const del = pureDeletions(e, a);
  if (del && del.length > 0 && del.every((i) => isSilentAt(e, i))) { add('묵음'); return tags; }
  if (sharesStem(e, a)) { add('어미'); return tags; }

  fallbackTags(e, a, add);
  return tags;
}

/** 문장을 낱말로 가른다 — 채점에 쓰는 «글자»만 남긴다(아포스트로피는 철자다) */
export function toWords(text: string): string[] {
  return text
    .replace(EN_PUNCT_RE, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * 문장 전체를 낱말 단위로 짝지어 오류 유형을 모은다.
 * 낱말 정렬은 편집거리로 한다 — 학생이 낱말을 빠뜨려도 나머지가 밀리지 않는다.
 */
export function tagSentence(expectedRaw: string, actualRaw: string, out: Set<EnErrorTag>): void {
  const e = toWords(expectedRaw);
  const a = toWords(actualRaw);
  const n = e.length;
  const m = a.length;
  const cost = (x: string, y: string): number => {
    if (x === y) return 0;
    if (x.toLowerCase() === y.toLowerCase()) return 0.1;
    const d = letterDistance(x, y);
    return Math.min(1, d / Math.max(x.length, y.length, 1));
  };
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = i;
  for (let j = 1; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost(e[i - 1], a[j - 1]));
    }
  }
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + cost(e[i - 1], a[j - 1]))) < 1e-9) {
      for (const t of classifyWordPair(e[i - 1], a[j - 1])) out.add(t);
      i--; j--;
    } else if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + 1)) < 1e-9) {
      out.add('글자빠짐');
      i--;
    } else {
      out.add('글자더함');
      j--;
    }
  }
}

/**
 * 힌트 — 낱말마다 첫 글자만 보이고 나머지는 밑줄로 가린다(I l___ a_____.).
 * 🔴 국어의 `initials()`(초성 뽑기)를 영어에 쓰면 글자가 그대로 나와 답을 통째로 보여 준다.
 *    시험 모드에서는 애초에 힌트가 꺼진다(불변식 3).
 */
export function firstLetters(text: string): string {
  return text.replace(/[A-Za-z][A-Za-z']*/g, (w) => w[0] + '_'.repeat(w.length - 1));
}
