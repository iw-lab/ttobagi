/**
 * 한글 자모 분해·조합 유틸.
 * 받아쓰기 채점의 기반 — 음절을 초/중/종성으로 쪼개야 "받침만 틀림", "된소리 혼동" 같은
 * 오류 유형을 구분할 수 있다. 외부 의존 없음(운영비 0 원칙).
 */

export const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

export const JUNG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
] as const;

export const JONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

const BASE = 0xac00;
const LAST = 0xd7a3;

export interface Syllable {
  /** 원본 글자 */
  char: string;
  cho: string;
  jung: string;
  /** 받침 없으면 '' */
  jong: string;
}

/** 한글 음절인가 (가~힣) */
export function isHangulSyllable(ch: string): boolean {
  const c = ch.codePointAt(0);
  return c !== undefined && c >= BASE && c <= LAST;
}

/** 음절 하나를 초/중/종성으로 분해. 한글이 아니면 null. */
export function decompose(ch: string): Syllable | null {
  if (!isHangulSyllable(ch)) return null;
  const idx = (ch.codePointAt(0) as number) - BASE;
  const jong = idx % 28;
  const jung = ((idx - jong) / 28) % 21;
  const cho = Math.floor((idx - jong) / 28 / 21);
  return { char: ch, cho: CHO[cho], jung: JUNG[jung], jong: JONG[jong] };
}

/** 초/중/종성을 음절로 조합. 잘못된 조합이면 null. */
export function compose(cho: string, jung: string, jong = ''): string | null {
  const ci = CHO.indexOf(cho as (typeof CHO)[number]);
  const vi = JUNG.indexOf(jung as (typeof JUNG)[number]);
  const ti = JONG.indexOf(jong as (typeof JONG)[number]);
  if (ci < 0 || vi < 0 || ti < 0) return null;
  return String.fromCodePoint(BASE + (ci * 21 + vi) * 28 + ti);
}

/** 문자열 전체를 자모 시퀀스로 (한글 아닌 문자는 그대로 통과) */
export function toJamo(text: string): string[] {
  const out: string[] = [];
  for (const ch of text) {
    const s = decompose(ch);
    if (s) {
      out.push(s.cho, s.jung);
      if (s.jong) out.push(...splitJong(s.jong));
    } else {
      out.push(ch);
    }
  }
  return out;
}

/** 겹받침을 홑자음 둘로 분리 (ㄳ → ㄱㅅ). 홑받침은 그대로. */
const COMPLEX_JONG: Record<string, [string, string]> = {
  ㄳ: ['ㄱ', 'ㅅ'],
  ㄵ: ['ㄴ', 'ㅈ'],
  ㄶ: ['ㄴ', 'ㅎ'],
  ㄺ: ['ㄹ', 'ㄱ'],
  ㄻ: ['ㄹ', 'ㅁ'],
  ㄼ: ['ㄹ', 'ㅂ'],
  ㄽ: ['ㄹ', 'ㅅ'],
  ㄾ: ['ㄹ', 'ㅌ'],
  ㄿ: ['ㄹ', 'ㅍ'],
  ㅀ: ['ㄹ', 'ㅎ'],
  ㅄ: ['ㅂ', 'ㅅ'],
};

export function splitJong(jong: string): string[] {
  return COMPLEX_JONG[jong] ?? [jong];
}

/** 겹받침인가 */
export function isComplexJong(jong: string): boolean {
  return jong in COMPLEX_JONG;
}

/** 된소리 ↔ 예사소리 짝 */
export const TENSE_PAIRS: Record<string, string> = {
  ㄱ: 'ㄲ', ㄲ: 'ㄱ',
  ㄷ: 'ㄸ', ㄸ: 'ㄷ',
  ㅂ: 'ㅃ', ㅃ: 'ㅂ',
  ㅅ: 'ㅆ', ㅆ: 'ㅅ',
  ㅈ: 'ㅉ', ㅉ: 'ㅈ',
};

/** 거센소리 ↔ 예사소리 */
export const ASPIRATE_PAIRS: Record<string, string> = {
  ㄱ: 'ㅋ', ㅋ: 'ㄱ',
  ㄷ: 'ㅌ', ㅌ: 'ㄷ',
  ㅂ: 'ㅍ', ㅍ: 'ㅂ',
  ㅈ: 'ㅊ', ㅊ: 'ㅈ',
};

/** 헷갈리는 모음 무리 — 소리가 거의 같아 저학년 오류가 집중된다 */
export const VOWEL_CONFUSIONS: string[][] = [
  ['ㅐ', 'ㅔ'],
  ['ㅒ', 'ㅖ'],
  ['ㅚ', 'ㅙ', 'ㅞ'],
  ['ㅘ', 'ㅏ'],
  ['ㅝ', 'ㅓ'],
  ['ㅢ', 'ㅣ'],
];

export function sameConfusionGroup(a: string, b: string): boolean {
  return VOWEL_CONFUSIONS.some((g) => g.includes(a) && g.includes(b));
}

/** 비음화 짝 (종성) — 국물[궁물] 같은 소리대로 적기 오류 탐지용 */
export const NASALIZED: Record<string, string> = {
  ㄱ: 'ㅇ', ㄲ: 'ㅇ', ㅋ: 'ㅇ',
  ㄷ: 'ㄴ', ㅅ: 'ㄴ', ㅆ: 'ㄴ', ㅈ: 'ㄴ', ㅊ: 'ㄴ', ㅌ: 'ㄴ', ㅎ: 'ㄴ',
  ㅂ: 'ㅁ', ㅍ: 'ㅁ',
};

/** 7종성 대표음 — 받침 소리 나는 대로 적었는지 판정 */
export const SEVEN_JONG: Record<string, string> = {
  ㄱ: 'ㄱ', ㄲ: 'ㄱ', ㅋ: 'ㄱ', ㄳ: 'ㄱ', ㄺ: 'ㄱ',
  ㄴ: 'ㄴ', ㄵ: 'ㄴ', ㄶ: 'ㄴ',
  ㄷ: 'ㄷ', ㅅ: 'ㄷ', ㅆ: 'ㄷ', ㅈ: 'ㄷ', ㅊ: 'ㄷ', ㅌ: 'ㄷ', ㅎ: 'ㄷ',
  ㄹ: 'ㄹ', ㄼ: 'ㄹ', ㄽ: 'ㄹ', ㄾ: 'ㄹ', ㅀ: 'ㄹ',
  ㅁ: 'ㅁ', ㄻ: 'ㅁ',
  ㅂ: 'ㅂ', ㅍ: 'ㅂ', ㅄ: 'ㅂ', ㄿ: 'ㅂ',
  ㅇ: 'ㅇ',
};

/** 문장부호로 취급할 문자 */
export const PUNCT_RE = /[.,!?~…·"'“”‘’()［］\[\]{}:;\-—]/g;

/** 초성만 뽑기 — 힌트 기능용 */
export function initials(text: string): string {
  let out = '';
  for (const ch of text) {
    const s = decompose(ch);
    out += s ? s.cho : ch;
  }
  return out;
}
