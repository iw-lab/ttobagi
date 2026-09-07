import { describe, expect, it } from 'vitest';
import { compose, decompose, initials, isComplexJong, toJamo } from '../src/engine/hangul';
import {
  comparable,
  grade,
  hasPunctDiff,
  hasSpacingDiff,
  isCorrect,
  countCorrect,
  jamoDistance,
  tagStats,
} from '../src/engine/grade';

describe('한글 자모', () => {
  it('음절을 초/중/종성으로 분해한다', () => {
    expect(decompose('한')).toEqual({ char: '한', cho: 'ㅎ', jung: 'ㅏ', jong: 'ㄴ' });
    expect(decompose('가')).toEqual({ char: '가', cho: 'ㄱ', jung: 'ㅏ', jong: '' });
    expect(decompose('꽃')).toEqual({ char: '꽃', cho: 'ㄲ', jung: 'ㅗ', jong: 'ㅊ' });
    expect(decompose('A')).toBeNull();
  });

  it('분해한 것을 그대로 되돌린다', () => {
    for (const ch of '학교에서받아쓰기를했다꽃잎닭') {
      const s = decompose(ch)!;
      expect(compose(s.cho, s.jung, s.jong)).toBe(ch);
    }
  });

  it('겹받침을 알아본다', () => {
    expect(isComplexJong('ㄺ')).toBe(true);
    expect(isComplexJong('ㄱ')).toBe(false);
    expect(toJamo('닭')).toEqual(['ㄷ', 'ㅏ', 'ㄹ', 'ㄱ']);
  });

  it('초성 힌트를 만든다', () => {
    expect(initials('학교에 간다')).toBe('ㅎㄱㅇ ㄱㄷ');
  });
});

describe('엄격도별 비교 문자열', () => {
  it('글자만 볼 때는 공백·문장부호를 뺀다', () => {
    expect(comparable('나는 학교에 간다.', 'char')).toBe('나는학교에간다');
    expect(comparable('나는 학교에 간다.', 'space')).toBe('나는 학교에 간다');
    expect(comparable('나는 학교에 간다.', 'full')).toBe('나는 학교에 간다.');
  });
});

describe('채점 — 정답', () => {
  it('똑같이 쓰면 정답', () => {
    const r = grade('학교에 간다', '학교에 간다');
    expect(r.verdict).toBe('correct');
    expect(r.wrongCount).toBe(0);
    expect(r.similarity).toBe(1);
  });

  it('글자만 기준이면 띄어쓰기가 달라도 정답이지만 태그로 알려준다', () => {
    const r = grade('학교에 간다', '학교에간다', { strictness: 'char' });
    expect(r.verdict).toBe('correct');
    expect(r.spacingDiff).toBe(true);
    expect(r.tags).toContain('띄어쓰기');
  });

  it('띄어쓰기까지 보는 기준이면 오답', () => {
    const r = grade('학교에 간다', '학교에간다', { strictness: 'space' });
    expect(r.verdict).not.toBe('correct');
    expect(r.tags).toContain('띄어쓰기');
  });

  it('문장부호는 full 기준에서만 정오에 반영된다', () => {
    expect(grade('간다.', '간다', { strictness: 'space' }).verdict).toBe('correct');
    expect(grade('간다.', '간다', { strictness: 'full' }).verdict).not.toBe('correct');
  });
});

describe('채점 — 오류 유형', () => {
  it('받침 오류', () => {
    const r = grade('밥', '밤');
    expect(r.verdict).not.toBe('correct');
    expect(r.tags).toContain('받침');
    expect(r.tags).not.toContain('비음화');
  });

  it('비음화는 뒷글자가 콧소리일 때만', () => {
    const r = grade('국물', '궁물');
    expect(r.tags).toContain('비음화');
  });

  it('겹받침', () => {
    const r = grade('닭', '닥');
    expect(r.tags).toContain('겹받침');
  });

  it('된소리', () => {
    const r = grade('꽃', '곷');
    expect(r.tags).toContain('된소리');
  });

  it('모음 혼동 ㅐ/ㅔ', () => {
    const r = grade('개', '게');
    expect(r.tags).toContain('모음혼동');
  });

  it('연음 — 소리 나는 대로 적기', () => {
    const r = grade('꽃이', '꼬치');
    expect(r.tags).toContain('연음');
    expect(r.verdict).toBe('wrong');
  });

  it('구개음화', () => {
    const r = grade('같이', '가치');
    expect(r.tags).toContain('구개음화');
  });

  it('유음화', () => {
    const r = grade('신라', '실라');
    expect(r.tags).toContain('유음화');
  });

  it('글자 빠짐과 더함', () => {
    expect(grade('사과나무', '사과무').tags).toContain('글자빠짐');
    expect(grade('사과', '사과나').tags).toContain('글자더함');
  });

  it('준말 표기 혼동', () => {
    expect(grade('안 돼요', '안 되요').tags).toContain('준말');
  });

  it('빈 답안은 띄어쓰기 오류로 잡지 않는다', () => {
    const r = grade('학교에 간다', '');
    expect(r.spacingDiff).toBe(false);
    expect(r.tags).toContain('글자빠짐');
  });
});

describe('채점 — 부분 정답', () => {
  it('한 글자에서 자모 하나만 틀리면 부분 정답', () => {
    const r = grade('학교', '학꾜');
    expect(r.verdict).toBe('partial');
  });

  it('두 글자가 틀리면 오답', () => {
    const r = grade('학교에 간다', '핵교에 간대');
    expect(r.verdict).toBe('wrong');
  });

  it('부분 정답을 끄면 오답으로 본다', () => {
    const r = grade('학교', '학꾜', { allowPartial: false });
    expect(r.verdict).toBe('wrong');
  });
});

describe('채점 — 하이라이트용 표시', () => {
  it('정답 글자마다 상태를 매긴다', () => {
    const r = grade('학교', '학꾜');
    expect(r.marks).toHaveLength(2);
    expect(r.marks[0]).toMatchObject({ expected: '학', status: 'ok' });
    expect(r.marks[1]).toMatchObject({ expected: '교', actual: '꾜', status: 'wrong' });
  });

  it('빠뜨린 글자는 missing 으로 남는다', () => {
    const r = grade('사과나무', '사과무');
    const missing = r.marks.filter((m) => m.status === 'missing').map((m) => m.expected);
    expect(missing).toContain('나');
  });

  it('더 쓴 글자는 extras 로 모은다', () => {
    const r = grade('사과', '사과나');
    expect(r.extras).toContain('나');
  });
});

describe('보조 함수', () => {
  it('자모 편집거리', () => {
    expect(jamoDistance('가', '가')).toBe(0);
    expect(jamoDistance('가', '각')).toBe(1);
    expect(jamoDistance('학교', '핵교')).toBe(1);
  });

  it('띄어쓰기·문장부호 차이 판정', () => {
    expect(hasSpacingDiff('나는 간다', '나는간다')).toBe(true);
    expect(hasSpacingDiff('나는 간다', '나는 간다')).toBe(false);
    expect(hasSpacingDiff('밥을 먹다', '바블 먹다')).toBe(false);
    expect(hasPunctDiff('간다.', '간다')).toBe(true);
    expect(hasPunctDiff('간다.', '간다.')).toBe(false);
  });

  it('오류 유형 통계를 뽑는다', () => {
    const rs = [grade('꽃이', '꼬치'), grade('같이', '가치'), grade('닭', '닥')];
    const stats = tagStats(rs);
    expect(stats.length).toBeGreaterThan(0);
    expect(stats.map((s) => s.tag)).toContain('겹받침');
  });

  it('정답만 있으면 통계가 비어 있다', () => {
    expect(tagStats([grade('가', '가')])).toEqual([]);
  });
});

describe('점수 반영 규칙', () => {
  it('부분 정답은 점수로는 오답이다', () => {
    expect(isCorrect('correct')).toBe(true);
    expect(isCorrect('partial')).toBe(false);
    expect(isCorrect('wrong')).toBe(false);
  });

  it('맞은 개수를 센다', () => {
    const rs = [grade('가', '가'), grade('학교', '학꾜'), grade('나', '다')];
    expect(countCorrect(rs)).toBe(1);
  });
});

describe('실제 급수표 문장 회귀', () => {
  const cases: [string, string, boolean][] = [
    ['해바라기가 피었습니다.', '해바라기가 피었습니다.', true],
    ['해바라기가 피었습니다.', '해바라기가 피엇습니다.', false],
    ['맑은 하늘', '말근 하늘', false],
    ['깨끗이 씻어요', '깨끄시 씨서요', false],
    ['학교에 갑니다', '학교에 갑니다', true],
    ['오늘은 참 즐거웠다.', '오늘은 참 즐거웟다.', false],
    ['꽃잎이 떨어진다', '꼬치피 떠러진다', false],
  ];
  for (const [expected, actual, want] of cases) {
    it(`${expected} / ${actual} → ${want ? '정답' : '오답'}`, () => {
      expect(isCorrect(grade(expected, actual).verdict)).toBe(want);
    });
  }
});

/* ────────────────────────────────────────────────────────────────
   8way 교차검증에서 나온 결함들의 회귀 테스트.
   전부 «실제로 재현해 본 뒤» 고친 것이라, 여기가 깨지면 그 결함이 돌아온 것이다.
   ──────────────────────────────────────────────────────────────── */
describe('교차검증 회귀', () => {
  it('공백이 하나도 없는 짝을 띄어쓰기 오류라고 하지 않는다', () => {
    // 단어 «길이»를 비교하던 때는 '가' vs '나나' 가 띄어쓰기 오류로 잡혔다
    expect(hasSpacingDiff('가', '나나')).toBe(false);
    expect(grade('가', '나나').tags).not.toContain('띄어쓰기');
  });

  it('띄어쓰기를 실제로 다르게 쓰면 잡는다', () => {
    expect(hasSpacingDiff('나는 학교', '나는학교')).toBe(true);
    expect(grade('나는 학교에', '나는학교에', { strictness: 'space' }).tags).toContain('띄어쓰기');
  });

  it('문장부호는 종류만이 아니라 붙은 자리까지 본다', () => {
    expect(hasPunctDiff('가.나', '가나.')).toBe(true);
    expect(hasPunctDiff('가나.', '가나.')).toBe(false);
  });

  it('받침 ㅅ/ㅆ 은 된소리가 아니라 받침 문제로 센다', () => {
    const r = grade('있다', '잇다');
    expect(r.tags).toContain('받침');
    expect(r.tags).not.toContain('된소리');
  });

  it('첫소리의 된소리는 그대로 된소리로 센다', () => {
    expect(grade('가방', '까방').tags).toContain('된소리');
  });

  it('겹받침이 넘어간 연음도 연음으로 잡는다', () => {
    // 닭이 → 달기 : 겹받침 ㄺ 의 뒤 소리만 다음 글자로 넘어갔다
    expect(grade('닭이', '달기').tags).toContain('연음');
    expect(grade('밥이', '바비').tags).toContain('연음');
  });

  it('통계도 점수와 같은 정본(isCorrect)을 쓴다', () => {
    const results = [grade('학교', '학교'), grade('학교', '학꾜')];
    expect(countCorrect(results)).toBe(1);
    expect(tagStats(results).length).toBeGreaterThan(0);
  });
});
