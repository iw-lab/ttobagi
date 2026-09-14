/**
 * 받아쓰기 채점 엔진.
 *
 * 설계 원칙
 *  1. 정오만 알려주는 채점은 저학년에게 쓸모가 적다 → **오류 유형**을 함께 낸다.
 *     (연구 근거: 저학년 오류는 소리-표기 불일치·받침·된소리에 집중)
 *  2. 채점 엄격도는 교사가 정한다 — 학교마다 띄어쓰기·문장부호 기준이 다르다.
 *  3. 전부 브라우저에서 돈다. 서버 호출 0 = 운영비 0, 답안이 기기 밖으로 나가지 않는다.
 */

import {
  decompose,
  isComplexJong,
  NASALIZED,
  PUNCT_RE,
  sameConfusionGroup,
  splitJong,
  TENSE_PAIRS,
  ASPIRATE_PAIRS,
  toJamo,
  type Syllable,
} from './hangul';
import {
  EN_PUNCT_RE,
  EN_TAGS,
  EN_TAG_HELP,
  foldApostrophe,
  letterCost,
  letterDistance,
  tagSentence,
  type EnErrorTag,
} from './english';

/**
 * 채점할 언어. 없으면 «국어» — 사용자 기기에 이미 저장된 급수표에는 이 칸이 없다.
 * 🔴 기본값을 'en' 쪽으로 기울이면 교실에 깔린 국어 급수표가 그 순간 영어로 채점된다.
 */
export type Lang = 'ko' | 'en';

export const LANG_LABEL: Record<Lang, string> = { ko: '국어', en: '영어' };

/** 채점 엄격도 — 교사가 학급 기준에 맞춰 고른다 */
export type Strictness = 'char' | 'space' | 'full';

export const STRICTNESS_LABEL: Record<Strictness, string> = {
  char: '글자만',
  space: '글자+띄어쓰기',
  full: '글자+띄어쓰기+문장부호',
};

export type KoErrorTag =
  | '받침'
  | '겹받침'
  | '된소리'
  | '거센소리'
  | '연음'
  | '구개음화'
  | '비음화'
  | '유음화'
  | '모음혼동'
  | '자음혼동'
  | '띄어쓰기'
  | '문장부호'
  | '준말'
  | '글자빠짐'
  | '글자더함'
  | '기타';

/** 두 언어의 오류 유형을 합친 것. 겹치는 이름(띄어쓰기·문장부호·글자빠짐…)은 뜻이 같다. */
export type ErrorTag = KoErrorTag | EnErrorTag;

export const KO_TAGS: KoErrorTag[] = [
  '받침', '겹받침', '된소리', '거센소리', '연음', '구개음화', '비음화',
  '유음화', '모음혼동', '자음혼동', '띄어쓰기', '문장부호', '준말',
  '글자빠짐', '글자더함', '기타',
];

/** 화면에 늘어놓는 차례. 국어 것을 먼저 두고, 영어에만 있는 것을 뒤에 잇는다. */
export const ALL_TAGS: ErrorTag[] = [
  ...KO_TAGS,
  ...EN_TAGS.filter((t) => !(KO_TAGS as string[]).includes(t)),
];

/** 태그 설명 — 오답 리포트에서 아이·학부모가 읽는 문장 */
const KO_TAG_HELP: Record<KoErrorTag, string> = {
  받침: '받침을 빠뜨리거나 다른 받침으로 썼어요.',
  겹받침: '겹받침(ㄳ, ㄺ, ㅄ 같은 두 개짜리 받침)을 정확히 쓰지 못했어요.',
  된소리: '된소리(ㄲ, ㄸ, ㅃ, ㅆ, ㅉ)와 예사소리를 바꿔 썼어요.',
  거센소리: '거센소리(ㅋ, ㅌ, ㅍ, ㅊ)와 예사소리를 바꿔 썼어요.',
  연음: '소리 나는 대로 썼어요. 앞 글자의 받침이 뒤로 넘어가 들려도 원래 자리에 써야 해요.',
  구개음화: '‘같이’를 [가치]로 읽듯 소리가 바뀌는 낱말이에요. 소리 말고 원래 모양대로 써요.',
  비음화: '‘국물’을 [궁물]로 읽듯 콧소리로 바뀌어 들린 대로 썼어요.',
  유음화: '‘신라’를 [실라]로 읽듯 ㄴ과 ㄹ이 바뀌어 들린 대로 썼어요.',
  모음혼동: 'ㅐ와 ㅔ처럼 소리가 비슷한 모음을 바꿔 썼어요.',
  자음혼동: '소리가 비슷한 자음을 바꿔 썼어요.',
  띄어쓰기: '띄어쓰기가 달라요.',
  문장부호: '마침표·물음표 같은 문장부호가 달라요.',
  준말: '‘되/돼’, ‘하여/해’처럼 줄임말 표기를 헷갈렸어요.',
  글자빠짐: '글자를 빠뜨렸어요.',
  글자더함: '글자를 더 썼어요.',
  기타: '다른 종류의 실수예요.',
};

/**
 * 겹치는 이름은 «영어 쪽 설명»으로 덮지 않는다 — 국어 급수표가 압도적으로 많고,
 * 영어 설명이 국어 결과 화면에 새어 나오면 아이가 읽는 문장이 엉뚱해진다.
 */
export const TAG_HELP: Record<ErrorTag, string> = { ...EN_TAG_HELP, ...KO_TAG_HELP };

export type Verdict = 'correct' | 'partial' | 'wrong';

/** 정답 글자 한 칸의 채점 결과 — 화면 하이라이트에 쓴다 */
export interface Mark {
  /** 채점에 쓰인(정규화된) 문자열에서의 위치 */
  index: number;
  /**
   * 다듬지 않은 정답 문장에서의 자리.
   * 채점은 띄어쓰기·문장부호를 뺀 문자열로 하지만, 화면에 보여 줄 때는 원래 문장 그대로여야 한다.
   * (이게 없어서 「출석을부르자모두큰소리로대답했다」가 정답이라고 나왔다 — 2026-09-08.)
   */
  srcIndex: number;
  expected: string;
  /** 학생이 그 자리에 쓴 글자 (빠뜨렸으면 null) */
  actual: string | null;
  status: 'ok' | 'wrong' | 'missing';
}

export interface GradeResult {
  verdict: Verdict;
  /** 0~1. 자모 단위 유사도 */
  similarity: number;
  /** 편집거리 — 국어는 자모 단위, 영어는 글자 단위 */
  jamoDistance: number;
  /** 틀린 음절 수 */
  wrongCount: number;
  tags: ErrorTag[];
  marks: Mark[];
  /** 학생이 더 쓴 글자들 */
  extras: string[];
  spacingDiff: boolean;
  punctDiff: boolean;
}

export interface GradeOptions {
  strictness?: Strictness;
  /** 한 글자만, 자모 1개 차이면 '부분 정답'으로 볼지 */
  allowPartial?: boolean;
  /** 채점할 언어. 안 주면 국어 — 이미 저장된 급수표에는 이 칸이 없다. */
  lang?: Lang;
}

/* ─────────────────────────── 언어별 부품 ─────────────────────────── */

/**
 * 언어마다 다른 것은 이 네 가지뿐이다 — 부호의 범위, 공백·대소문자를 무엇으로 볼지,
 * 글자 한 칸의 «닮음», 그리고 편집거리의 단위.
 * 정렬·표시·판정은 두 언어가 그대로 나눠 쓴다.
 */
interface LangOps {
  punct: RegExp;
  /** 비교 전에 글자를 고르는 손질. 글자 수를 바꾸지 않아야 한다(표시 자리가 어긋난다). */
  pre: (text: string) => string;
  /** 'char' 엄격도에서 공백을 지우는가. 국어의 띄어쓰기는 «따로 배우는 것»이라 지우고,
   *  영어의 낱말 사이 빈칸은 철자 그 자체라 지우지 않는다. */
  dropSpaceAtChar: boolean;
  /** 'full' 미만에서 대소문자를 같은 것으로 보는가 */
  foldCaseBelowFull: boolean;
  unitCost: (a: string, b: string) => number;
  distance: (a: string, b: string) => number;
  distanceLen: (text: string) => number;
}

const OPS: Record<Lang, LangOps> = {
  ko: {
    punct: PUNCT_RE,
    pre: (t) => t,
    dropSpaceAtChar: true,
    foldCaseBelowFull: false,
    unitCost: syllableCost,
    distance: jamoDistance,
    distanceLen: (t) => toJamo(t).length,
  },
  en: {
    punct: EN_PUNCT_RE,
    pre: foldApostrophe,
    dropSpaceAtChar: false,
    foldCaseBelowFull: true,
    unitCost: letterCost,
    distance: letterDistance,
    distanceLen: (t) => t.length,
  },
};

// PUNCT_RE 는 /g 라 test() 가 lastIndex 를 물고 있어 한 글자씩 검사하면 결과가 번갈아 나온다.
const ONE = new Map<Lang, RegExp>();
function punctOne(lang: Lang): RegExp {
  let re = ONE.get(lang);
  if (!re) { re = new RegExp(OPS[lang].punct.source); ONE.set(lang, re); }
  return re;
}

/* ────────────────────────────── 정규화 ────────────────────────────── */

/** 유니코드 정규화 + 공백 정돈. 채점 전 항상 통과시킨다. */
export function normalizeBase(text: string): string {
  return text
    .normalize('NFC')
    // 🔴 굽은 따옴표(“ ” ‘ ’)는 한글 키보드로 칠 수 없다 — 아이가 낼 수 있는 건 곧은 것뿐이다.
    //    모양만 다른 것을 틀렸다고 하면 «바르게 썼는데 오답» 이 된다(국어 문항 199곳·29급수).
    //    글자 하나를 글자 하나로 바꾸는 것이라 원문과의 자리 대응은 그대로다.
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 🔴 영어 홑따옴표는 두 가지 일을 한다 — 낱말 **안**의 것은 글자이고(don't),
 *    낱말을 **감싼** 것은 문장부호다('cat'). 그래서 한쪽만 지운다.
 *
 *    굽은 홑따옴표(‘ ’)를 곧은 것으로 접기 전에는 EN_PUNCT_RE 가 굽은 것만 지웠다.
 *    접고 나니 «지워지던 것이 안 지워져» 「cat ← ‘cat’」 이 정답에서 오답으로 바뀌었다
 *    (2026-09-14 교차검증 Claude·Gemini·codex **세 계열 일치**, 실측 재현).
 *    자리에 따라 가르면 곧은 따옴표로 감싼 「'cat'」 도 같이 낫는다 — 그건 원래도 오답이었다.
 */
const EN_INNER_APOS = /([A-Za-z])'([A-Za-z])|'/g;

export function stripPunct(text: string, lang: Lang = 'ko'): string {
  const base = text.replace(OPS[lang].punct, '');
  if (lang !== 'en') return base;
  return base.replace(EN_INNER_APOS, (_m, a: string | undefined, b: string) => (a ? `${a}'${b}` : ''));
}

export function stripSpace(text: string): string {
  return text.replace(/\s+/g, '');
}

/** 엄격도에 따라 비교 대상 문자열을 만든다 */
/**
 * comparable() 과 똑같이 다듬되, 남은 글자가 «원문(정규화본)에서 몇 번째였는지»를 함께 돌려준다.
 * 채점은 다듬은 글자로 하고, 표시는 원문으로 해야 하므로 그 사이를 잇는 다리가 필요하다.
 */
export function comparableMapped(
  text: string,
  strictness: Strictness,
  lang: Lang = 'ko',
): { base: string; text: string; map: number[] } {
  const ops = OPS[lang];
  const one = punctOne(lang);
  const base = ops.pre(normalizeBase(text));
  const chars = [...base];
  const keep: string[] = [];
  const map: number[] = [];
  chars.forEach((ch, i) => {
    if (strictness !== 'full' && one.test(ch)) return;
    if (strictness === 'char' && ops.dropSpaceAtChar && /\s/.test(ch)) return;
    // 소문자로 내려도 글자 수는 그대로라 map 의 자리는 어긋나지 않는다.
    keep.push(strictness !== 'full' && ops.foldCaseBelowFull ? ch.toLowerCase() : ch);
    map.push(i);
  });
  return { base, text: keep.join(''), map };
}

export function comparable(text: string, strictness: Strictness, lang: Lang = 'ko'): string {
  const ops = OPS[lang];
  const base = ops.pre(normalizeBase(text));
  const fold = (t: string): string => (ops.foldCaseBelowFull ? t.toLowerCase() : t);
  switch (strictness) {
    case 'char': {
      const noPunct = stripPunct(base, lang);
      return fold(ops.dropSpaceAtChar ? stripSpace(noPunct) : normalizeBase(noPunct));
    }
    case 'space':
      return fold(normalizeBase(stripPunct(base, lang)));
    case 'full':
      return base;
  }
}

/* ────────────────────────── 음절 정렬(Levenshtein) ────────────────────────── */

type Op =
  | { type: 'match' | 'sub'; ei: number; ai: number }
  | { type: 'del'; ei: number }
  | { type: 'ins'; ai: number };

/** 두 음절이 얼마나 다른가 (0=같음, 1=완전히 다름) */
function syllableCost(a: string, b: string): number {
  if (a === b) return 0;
  const da = decompose(a);
  const db = decompose(b);
  if (!da || !db) return 1;
  let diff = 0;
  if (da.cho !== db.cho) diff++;
  if (da.jung !== db.jung) diff++;
  if (da.jong !== db.jong) diff++;
  // 3개 중 몇 개가 다른가 → 0.34 / 0.67 / 1
  return diff / 3;
}

/** 정답·답안을 음절 단위로 정렬한다. 가중 편집거리라 '비슷한 글자'가 서로 짝지어진다. */
export function alignSyllables(
  expected: string[],
  actual: string[],
  cost: (a: string, b: string) => number = syllableCost,
): Op[] {
  const n = expected.length;
  const m = actual.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = i;
  for (let j = 1; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost(expected[i - 1], actual[j - 1]),
      );
    }
  }
  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const c = cost(expected[i - 1], actual[j - 1]);
      if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + c)) < 1e-9) {
        ops.push({ type: c === 0 ? 'match' : 'sub', ei: i - 1, ai: j - 1 });
        i--; j--;
        continue;
      }
    }
    if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + 1)) < 1e-9) {
      ops.push({ type: 'del', ei: i - 1 });
      i--;
      continue;
    }
    ops.push({ type: 'ins', ai: j - 1 });
    j--;
  }
  return ops.reverse();
}

/** 자모 단위 편집거리 — 유사도 계산용 */
export function jamoDistance(a: string, b: string): number {
  const x = toJamo(a);
  const y = toJamo(b);
  const n = x.length;
  const m = y.length;
  if (n === 0) return m;
  if (m === 0) return n;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  let cur = new Array<number>(m + 1);
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    for (let j = 1; j <= m; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1),
      );
    }
    [prev, cur] = [cur, prev];
  }
  return prev[m];
}

/* ────────────────────────────── 오류 유형 판정 ────────────────────────────── */

function tagPair(e: Syllable, a: Syllable, tags: Set<ErrorTag>, nextExpected: Syllable | null): void {
  if (e.cho !== a.cho) {
    if (TENSE_PAIRS[e.cho] === a.cho) tags.add('된소리');
    else if (ASPIRATE_PAIRS[e.cho] === a.cho) tags.add('거센소리');
    else tags.add('자음혼동');
  }
  if (e.jung !== a.jung) {
    if (sameConfusionGroup(e.jung, a.jung)) tags.add('모음혼동');
    else tags.add('기타');
  }
  if (e.jong !== a.jong) {
    // 비음화·유음화는 '뒷글자가 콧소리/흐름소리로 시작할 때'만 성립한다.
    // 문맥을 안 보면 밥→밤 같은 단순 받침 실수까지 비음화로 잡혀 통계가 오염된다.
    const nextCho = nextExpected?.cho ?? '';
    const nasalContext = nextCho === 'ㄴ' || nextCho === 'ㅁ' || nextCho === 'ㄹ';
    const liquidContext = nextCho === 'ㄹ' || nextCho === 'ㄴ';

    // 된소리는 첫소리(초성)에서 일어나는 일이다. 받침의 ㅅ/ㅆ(잇다↔있다)은
    // 발음이 아니라 표기 문제라 '받침'으로 두어야 교사에게 쓸모 있는 통계가 된다.
    if (isComplexJong(e.jong) || isComplexJong(a.jong)) tags.add('겹받침');
    else if (nasalContext && NASALIZED[e.jong] === a.jong) tags.add('비음화');
    else if (liquidContext && e.jong === 'ㄴ' && a.jong === 'ㄹ') {
      // 🔴 ㄴ→ㄹ 한 방향만 유음화다. 반대쪽(설날→선날, 달님→단님)은 유음화가 아니라
      //    그냥 받침 실수인데 예전에는 그것까지 「유음화」라고 불렀다
      //    (2026-09-14 교차검증 codex·Gemini 일치, 실측 재현).
      tags.add('유음화');
    } else tags.add('받침');
  }
}

/** 연음·구개음화처럼 '앞뒤 글자에 걸친' 오류를 본다 */
function tagCrossSyllable(
  expected: string[],
  actual: string[],
  pairs: Map<number, number>,
  tags: Set<ErrorTag>,
): { first: Set<number>; second: Set<number> } {
  /**
   * 연음·구개음화가 설명을 마친 자리. 앞글자와 뒷글자는 «설명되는 것»이 서로 다르다 —
   * 앞글자는 받침이 비는 것이, 뒷글자는 첫소리가 바뀌는 것이 설명된다. 그래서 따로 센다
   * (예전에는 한 덩이로 묶어서, 밥이→나비 처럼 앞글자 첫소리가 아예 다른 것까지 지웠다).
   */
  const first = new Set<number>();
  const second = new Set<number>();
  for (let i = 0; i < expected.length - 1; i++) {
    const ai = pairs.get(i);
    const aiNext = pairs.get(i + 1);
    if (ai === undefined || aiNext === undefined) continue;
    const e1 = decompose(expected[i]);
    const e2 = decompose(expected[i + 1]);
    const a1 = decompose(actual[ai]);
    const a2 = decompose(actual[aiNext]);
    if (!e1 || !e2 || !a1 || !a2) continue;

    // 정답은 받침이 있는데 답안에서 그 소리가 뒷글자 초성으로 옮겨갔다.
    // 홑받침이면 받침이 통째로 비고(밥이→바비), 겹받침이면 앞 소리만 남는다(닭이→달기).
    const jongSounds = splitJong(e1.jong);
    const moved = jongSounds[jongSounds.length - 1];
    const kept = jongSounds.length > 1 ? jongSounds[0] : '';
    // 받침이 제자리에 있는 채로 «뒷글자 첫소리»만 바뀐 것들 — 앞글자는 멀쩡하다.
    if (e1.jong === a1.jong && e2.cho !== a2.cho) {
      // 순행 유음화: 칼날→칼랄 (앞 받침 ㄹ 때문에 뒤 ㄴ 이 ㄹ 로 들린다)
      if (e1.jong === 'ㄹ' && e2.cho === 'ㄴ' && a2.cho === 'ㄹ') {
        tags.add('유음화');
        second.add(i + 1);
        continue;
      }
      // ㄹ 의 비음화: 종로→종노 (앞 받침 때문에 뒤 ㄹ 이 ㄴ 으로 들린다)
      if (e2.cho === 'ㄹ' && a2.cho === 'ㄴ' && e1.jong !== '' && e1.jong !== 'ㄹ') {
        tags.add('비음화');
        second.add(i + 1);
        continue;
      }
    }

    // 받침이 뒷글자 첫소리로 넘어간 것들. 뒷글자 첫소리는 ㅇ(연음) 또는 ㅎ(축약 구개음화)이다.
    const movedAway =
      e1.jong !== '' &&
      a1.jong === kept &&
      (e2.cho === 'ㅇ' || e2.cho === 'ㅎ') &&
      a2.cho !== e2.cho;
    if (!movedAway) continue;
    // 🔴 겹받침 ㄾ(핥이다)은 넘어가는 소리가 ㅌ 이다 — e1.jong 이 아니라 «넘어간 소리»를 봐야 한다.
    //    ㅎ 과 만나는 굳히다→구치다·닫히다→다치다 도 같은 구개음화다(2026-09-14 교차검증).
    const isPalatal =
      (moved === 'ㄷ' || moved === 'ㅌ') &&
      (e2.jung === 'ㅣ' || e2.jung === 'ㅕ') &&
      (a2.cho === 'ㅈ' || a2.cho === 'ㅊ');

    if (isPalatal) {
      tags.add('구개음화');
      first.add(i);
      second.add(i + 1);
    } else if (
      e2.cho === 'ㅇ' &&
      (a2.cho === moved || ASPIRATE_PAIRS[moved] === a2.cho || TENSE_PAIRS[moved] === a2.cho)
    ) {
      tags.add('연음');
      first.add(i);
      second.add(i + 1);
    }
  }
  return { first, second };
}

/** 준말 표기(되/돼, 하여/해) 혼동 */
function tagAbbreviation(expected: string, actual: string, tags: Set<ErrorTag>): void {
  const pairs: [string, string][] = [
    ['돼', '되'],
    ['됐', '됬'],
    // 본말을 준말로 줄여 쓴 것도 같은 실수다 — 되었다→됬다 는 초등에서 가장 흔하다.
    ['되었', '됬'],
    // 🔴 규범 짝은 «되었↔됐» 인데 오표기 «됬» 쪽만 있어서, 되었다를 됐다로 줄여 쓴 것이
    //    준말로 안 잡혔다 (2026-09-14 교차검증 Grok, 실측 재현).
    ['되었', '됐'],
    ['되어', '돼'],
    ['하였', '했'],
    ['해', '하여'],
    ['봬', '뵈'],
    // 🔴 «왠/웬» 은 준말이 아니다 — 「웬일」의 웬은 관형사, 「왠지」의 왠은 «왜인지»의 준말로
    //    서로 본말·준말 관계가 아니다(2026-09-14 교차검증 codex·Gemini 두 계열 일치, 실측 확인).
    //    모음혼동으로 이미 잡히므로 여기서 빼는 것이 이름이 맞다.
  ];
  for (const [x, y] of pairs) {
    const ex = expected.includes(x);
    const ey = expected.includes(y);
    const ax = actual.includes(x);
    const ay = actual.includes(y);
    if ((ex && !ax && ay) || (ey && !ay && ax)) {
      tags.add('준말');
      return;
    }
  }
}

/** 공백 위치가 다른가 — 엄격도와 무관하게 '정보'로는 항상 낸다 */
export function hasSpacingDiff(expected: string, actual: string, lang: Lang = 'ko'): boolean {
  const e = normalizeBase(stripPunct(expected, lang));
  const a = normalizeBase(stripPunct(actual, lang));
  // 한쪽이 비었으면 '띄어쓰기가 다르다'고 말할 게 없다 (빈 답안은 글자빠짐으로 잡힌다)
  if (e === '' || a === '') return false;
  if (stripSpace(e) !== stripSpace(a)) {
    // 글자 자체가 다르면 띄어쓰기만 따로 논할 수 없다. 단어 길이를 비교하면
    // '가' vs '나나' 처럼 공백이 하나도 없는 짝까지 띄어쓰기 오류가 되어 통계가 오염된다.
    // 그래서 «공백을 몇 번 넣었는가»만 본다.
    return countSpaces(e) !== countSpaces(a);
  }
  return e !== a;
}

function countSpaces(text: string): number {
  let n = 0;
  for (const ch of text) if (ch === ' ') n++;
  return n;
}

export function hasPunctDiff(expected: string, actual: string, lang: Lang = 'ko'): boolean {
  // 종류만 비교하면 '가.나' 와 '가나.' 가 같아진다 — 부호가 «몇 번째 글자 뒤에» 붙었는지까지 본다.
  return punctSignature(expected, lang) !== punctSignature(actual, lang);
}

function punctSignature(text: string, lang: Lang): string {
  const one = punctOne(lang);
  const out: string[] = [];
  let at = 0;
  for (const ch of normalizeBase(text)) {
    if (one.test(ch)) out.push(`${at}${ch}`);
    else if (ch !== ' ') at++;
  }
  return out.join('|');
}

/* ────────────────────────────── 채점 본체 ────────────────────────────── */

export function grade(expectedRaw: string, actualRaw: string, opts: GradeOptions = {}): GradeResult {
  const strictness = opts.strictness ?? 'char';
  const allowPartial = opts.allowPartial ?? true;
  const lang = opts.lang ?? 'ko';
  const ops_ = OPS[lang];

  const expectedBase = ops_.pre(normalizeBase(expectedRaw));
  const actualBase = ops_.pre(normalizeBase(actualRaw));

  const spacingDiff = hasSpacingDiff(expectedBase, actualBase, lang);
  const punctDiff = hasPunctDiff(expectedBase, actualBase, lang);

  const mapped = comparableMapped(expectedRaw, strictness, lang);
  const e = mapped.text;
  const a = comparable(actualRaw, strictness, lang);

  const eChars = [...e];
  const aChars = [...a];
  const ops = alignSyllables(eChars, aChars, ops_.unitCost);

  const tags = new Set<ErrorTag>();
  const marks: Mark[] = [];
  const extras: string[] = [];
  const pairs = new Map<number, number>();
  /** 글자 하나하나에서 나온 태그. 합치는 것은 아래에서 «설명된 자리»를 뺀 뒤에 한다. */
  const posTags = new Map<number, Set<ErrorTag>>();
  let wrongCount = 0;

  for (const op of ops) {
    if (op.type === 'match') {
      pairs.set(op.ei, op.ai);
      marks.push({ index: op.ei, srcIndex: mapped.map[op.ei], expected: eChars[op.ei], actual: aChars[op.ai], status: 'ok' });
    } else if (op.type === 'sub') {
      pairs.set(op.ei, op.ai);
      wrongCount++;
      marks.push({ index: op.ei, srcIndex: mapped.map[op.ei], expected: eChars[op.ei], actual: aChars[op.ai], status: 'wrong' });
      if (lang === 'ko') {
        const de = decompose(eChars[op.ei]);
        const da = decompose(aChars[op.ai]);
        if (de && da) {
          // 🔴 곧바로 tags 에 넣지 않는다. 연음·구개음화로 설명되는 자리는
          //    그 자리에서 나온 «받침·자음혼동» 이 같은 사고의 그림자일 뿐이라,
          //    둘 다 띄우면 아이가 읽는 설명이 둘로 갈려 요점이 흐려진다.
          const at = new Set<ErrorTag>();
          tagPair(de, da, at, decompose(eChars[op.ei + 1] ?? ''));
          posTags.set(op.ei, at);
        } else tags.add('기타');
      }
      // 영어는 글자 한 칸만 봐서는 «무슨 실수인지» 말할 수 없다 —
      // 묵음·겹글자·어미는 낱말 전체를 봐야 드러나므로 아래 tagSentence 가 맡는다.
    } else if (op.type === 'del') {
      wrongCount++;
      marks.push({ index: op.ei, srcIndex: mapped.map[op.ei], expected: eChars[op.ei], actual: null, status: 'missing' });
      // 🔴 영어에서 글자 하나가 빠진 것을 여기서 「글자빠짐」이라 부르면,
      //    겹글자·묵음·어미처럼 «이름이 있는» 실수마다 글자빠짐이 따라붙어 통계를 희석시킨다.
      //    낱말을 통째로 빠뜨린 경우만 tagSentence 가 글자빠짐으로 센다.
      if (eChars[op.ei].trim() === '') tags.add('띄어쓰기');
      else if (lang === 'ko') tags.add('글자빠짐');
    } else {
      const ch = aChars[op.ai];
      extras.push(ch);
      if (ch.trim() === '') tags.add('띄어쓰기');
      else if (lang === 'ko') tags.add('글자더함');
    }
  }

  if (lang === 'ko') {
    const { first, second } = tagCrossSyllable(eChars, aChars, pairs, tags);
    // 연음·구개음화가 설명한 «그 자리»에서는 그 사고의 그림자인 「받침·자음혼동」만 뺀다.
    // ① 문장 다른 곳의 받침·자음혼동은 그대로 남는다(예전에는 태그를 통째로 지워서,
    //    뒤쪽에서 진짜로 틀린 받침까지 사라졌다).
    // ② 「겹받침」은 그림자가 아니다 — 앉았다→안잤다 에서 아이가 정말 어려워한 것은
    //    겹받침이고, 선생님에게는 그 이름이 필요하다. 그래서 남긴다.
    for (const [ei, at] of posTags) {
      for (const t of at) {
        // 앞글자에서 지울 것은 «비어 버린 받침» 하나뿐이다. 첫소리가 아예 다른 것
        // (밥이→나비)은 연음과 무관한 실수이므로 남긴다.
        if (t === '받침' && first.has(ei)) continue;
        // 뒷글자에서 지울 것은 «넘어온 소리 때문에 바뀐 첫소리» 하나뿐이다.
        if (t === '자음혼동' && second.has(ei)) continue;
        tags.add(t);
      }
    }
    tagAbbreviation(expectedBase, actualBase, tags);
  } else {
    tagSentence(expectedBase, actualBase, tags as Set<EnErrorTag>);
  }

  if (spacingDiff) tags.add('띄어쓰기');
  if (punctDiff && strictness === 'full') tags.add('문장부호');

  const dist = ops_.distance(e, a);
  const maxLen = Math.max(ops_.distanceLen(e), ops_.distanceLen(a), 1);
  const similarity = Math.max(0, 1 - dist / maxLen);

  const isExact = e === a;
  let verdict: Verdict;
  if (isExact) {
    verdict = 'correct';
    tags.clear();
    if (spacingDiff && strictness === 'char') tags.add('띄어쓰기');
    if (punctDiff && strictness !== 'full') tags.add('문장부호');
    // 철자가 같은데 큰 글자만 다르면 «맞았지만 대문자를 살펴보라»고 알려 준다.
    if (lang === 'en' && strictness !== 'full'
        && stripPunct(expectedBase, lang) !== stripPunct(actualBase, lang)) {
      tags.add('대문자');
    }
  } else if (allowPartial && wrongCount === 1 && extras.length === 0 && dist <= 1) {
    verdict = 'partial';
  } else {
    verdict = 'wrong';
  }

  return {
    verdict,
    similarity,
    jamoDistance: dist,
    wrongCount,
    tags: ALL_TAGS.filter((t) => tags.has(t)),
    marks,
    extras,
    spacingDiff,
    punctDiff,
  };
}

/**
 * 시험 점수에 반영할 때 '맞음'으로 칠 것인가.
 * partial 은 «아깝게 틀림»을 아이에게 보여주기 위한 표시일 뿐, 점수로는 오답이다
 * — 받아쓰기는 학교에서도 부분 점수를 주지 않는다.
 */
export function isCorrect(verdict: Verdict): boolean {
  return verdict === 'correct';
}

/** 맞은 개수 세기 */
export function countCorrect(results: GradeResult[]): number {
  return results.filter((r) => isCorrect(r.verdict)).length;
}

/** 여러 문항 결과에서 오류 유형 통계를 뽑는다 */
export function tagStats(results: GradeResult[]): { tag: ErrorTag; count: number }[] {
  const counts = new Map<ErrorTag, number>();
  for (const r of results) {
    if (isCorrect(r.verdict)) continue;
    for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((x, y) => y.count - x.count);
}

/**
 * 정답 문장을 «있는 그대로» 돌려준다 — 띄어쓰기와 문장부호를 포함해서.
 * 채점 대상이 아니었던 글자(현재 엄격도에서 무시하는 공백·문장부호)는 'ok' 로 둔다.
 *
 * 이 함수가 없던 동안 결과 화면은 다듬어진 문자열을 그대로 이어 붙여
 * 「출석을부르자모두큰소리로대답했다」를 정답이라고 보여 주었다.
 */
export function markedAnswer(
  expectedRaw: string,
  marks: Mark[],
): { char: string; status: Mark['status'] }[] {
  const base = normalizeBase(expectedRaw);
  const chars = [...base];
  const status = new Map<number, Mark['status']>();
  for (const m of marks) {
    if (m.srcIndex === undefined) continue;
    status.set(m.srcIndex, m.status);
  }
  return chars.map((char, i) => ({ char, status: status.get(i) ?? 'ok' }));
}
