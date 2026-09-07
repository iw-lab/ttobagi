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

/** 채점 엄격도 — 교사가 학급 기준에 맞춰 고른다 */
export type Strictness = 'char' | 'space' | 'full';

export const STRICTNESS_LABEL: Record<Strictness, string> = {
  char: '글자만',
  space: '글자+띄어쓰기',
  full: '글자+띄어쓰기+문장부호',
};

export type ErrorTag =
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

export const ALL_TAGS: ErrorTag[] = [
  '받침', '겹받침', '된소리', '거센소리', '연음', '구개음화', '비음화',
  '유음화', '모음혼동', '자음혼동', '띄어쓰기', '문장부호', '준말',
  '글자빠짐', '글자더함', '기타',
];

/** 태그 설명 — 오답 리포트에서 아이·학부모가 읽는 문장 */
export const TAG_HELP: Record<ErrorTag, string> = {
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

export type Verdict = 'correct' | 'partial' | 'wrong';

/** 정답 글자 한 칸의 채점 결과 — 화면 하이라이트에 쓴다 */
export interface Mark {
  /** 정답 문자열에서의 위치 */
  index: number;
  expected: string;
  /** 학생이 그 자리에 쓴 글자 (빠뜨렸으면 null) */
  actual: string | null;
  status: 'ok' | 'wrong' | 'missing';
}

export interface GradeResult {
  verdict: Verdict;
  /** 0~1. 자모 단위 유사도 */
  similarity: number;
  /** 자모 편집거리 */
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
}

/* ────────────────────────────── 정규화 ────────────────────────────── */

/** 유니코드 정규화 + 공백 정돈. 채점 전 항상 통과시킨다. */
export function normalizeBase(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim();
}

export function stripPunct(text: string): string {
  return text.replace(PUNCT_RE, '');
}

export function stripSpace(text: string): string {
  return text.replace(/\s+/g, '');
}

/** 엄격도에 따라 비교 대상 문자열을 만든다 */
export function comparable(text: string, strictness: Strictness): string {
  const base = normalizeBase(text);
  switch (strictness) {
    case 'char':
      return stripSpace(stripPunct(base));
    case 'space':
      return normalizeBase(stripPunct(base));
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
export function alignSyllables(expected: string[], actual: string[]): Op[] {
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
        dp[i - 1][j - 1] + syllableCost(expected[i - 1], actual[j - 1]),
      );
    }
  }
  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const c = syllableCost(expected[i - 1], actual[j - 1]);
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
    else if (
      liquidContext &&
      ((e.jong === 'ㄴ' && a.jong === 'ㄹ') || (e.jong === 'ㄹ' && a.jong === 'ㄴ'))
    ) {
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
): void {
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
    const movedAway =
      e1.jong !== '' && a1.jong === kept && e2.cho === 'ㅇ' && a2.cho !== 'ㅇ';
    if (!movedAway) continue;
    const isPalatal =
      (e1.jong === 'ㄷ' || e1.jong === 'ㅌ') &&
      (e2.jung === 'ㅣ' || e2.jung === 'ㅕ') &&
      (a2.cho === 'ㅈ' || a2.cho === 'ㅊ');

    if (isPalatal) tags.add('구개음화');
    else if (a2.cho === moved || ASPIRATE_PAIRS[moved] === a2.cho || TENSE_PAIRS[moved] === a2.cho) {
      tags.add('연음');
    }
  }
}

/** 준말 표기(되/돼, 하여/해) 혼동 */
function tagAbbreviation(expected: string, actual: string, tags: Set<ErrorTag>): void {
  const pairs: [string, string][] = [
    ['돼', '되'],
    ['됐', '됬'],
    ['해', '하여'],
    ['봬', '뵈'],
    ['왠', '웬'],
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
export function hasSpacingDiff(expected: string, actual: string): boolean {
  const e = normalizeBase(stripPunct(expected));
  const a = normalizeBase(stripPunct(actual));
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

export function hasPunctDiff(expected: string, actual: string): boolean {
  // 종류만 비교하면 '가.나' 와 '가나.' 가 같아진다 — 부호가 «몇 번째 글자 뒤에» 붙었는지까지 본다.
  return punctSignature(expected) !== punctSignature(actual);
}

// PUNCT_RE 는 /g 라 test() 가 lastIndex 를 물고 있어 한 글자씩 검사하면 결과가 번갈아 나온다.
const PUNCT_ONE = new RegExp(PUNCT_RE.source);

function punctSignature(text: string): string {
  const out: string[] = [];
  let at = 0;
  for (const ch of normalizeBase(text)) {
    if (PUNCT_ONE.test(ch)) out.push(`${at}${ch}`);
    else if (ch !== ' ') at++;
  }
  return out.join('|');
}

/* ────────────────────────────── 채점 본체 ────────────────────────────── */

export function grade(expectedRaw: string, actualRaw: string, opts: GradeOptions = {}): GradeResult {
  const strictness = opts.strictness ?? 'char';
  const allowPartial = opts.allowPartial ?? true;

  const expectedBase = normalizeBase(expectedRaw);
  const actualBase = normalizeBase(actualRaw);

  const spacingDiff = hasSpacingDiff(expectedBase, actualBase);
  const punctDiff = hasPunctDiff(expectedBase, actualBase);

  const e = comparable(expectedRaw, strictness);
  const a = comparable(actualRaw, strictness);

  const eChars = [...e];
  const aChars = [...a];
  const ops = alignSyllables(eChars, aChars);

  const tags = new Set<ErrorTag>();
  const marks: Mark[] = [];
  const extras: string[] = [];
  const pairs = new Map<number, number>();
  let wrongCount = 0;

  for (const op of ops) {
    if (op.type === 'match') {
      pairs.set(op.ei, op.ai);
      marks.push({ index: op.ei, expected: eChars[op.ei], actual: aChars[op.ai], status: 'ok' });
    } else if (op.type === 'sub') {
      pairs.set(op.ei, op.ai);
      wrongCount++;
      marks.push({ index: op.ei, expected: eChars[op.ei], actual: aChars[op.ai], status: 'wrong' });
      const de = decompose(eChars[op.ei]);
      const da = decompose(aChars[op.ai]);
      if (de && da) tagPair(de, da, tags, decompose(eChars[op.ei + 1] ?? ''));
      else tags.add('기타');
    } else if (op.type === 'del') {
      wrongCount++;
      marks.push({ index: op.ei, expected: eChars[op.ei], actual: null, status: 'missing' });
      if (eChars[op.ei].trim() === '') tags.add('띄어쓰기');
      else tags.add('글자빠짐');
    } else {
      const ch = aChars[op.ai];
      extras.push(ch);
      if (ch.trim() === '') tags.add('띄어쓰기');
      else tags.add('글자더함');
    }
  }

  tagCrossSyllable(eChars, aChars, pairs, tags);
  tagAbbreviation(expectedBase, actualBase, tags);

  // 연음/구개음화가 잡혔으면 그 결과로 생긴 '받침' 태그는 중복이라 뺀다
  if (tags.has('연음') || tags.has('구개음화')) tags.delete('받침');

  if (spacingDiff) tags.add('띄어쓰기');
  if (punctDiff && strictness === 'full') tags.add('문장부호');

  const dist = jamoDistance(e, a);
  const maxLen = Math.max(toJamo(e).length, toJamo(a).length, 1);
  const similarity = Math.max(0, 1 - dist / maxLen);

  const isExact = e === a;
  let verdict: Verdict;
  if (isExact) {
    verdict = 'correct';
    tags.clear();
    if (spacingDiff && strictness === 'char') tags.add('띄어쓰기');
    if (punctDiff && strictness !== 'full') tags.add('문장부호');
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
