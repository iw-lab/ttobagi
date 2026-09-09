import { describe, expect, it } from 'vitest';
import { classifyWordPair, firstLetters, letterDistance, toWords } from '../src/engine/english';
import { grade, isCorrect, markedAnswer } from '../src/engine/grade';

const en = (expected: string, actual: string, strictness: 'char' | 'space' | 'full' = 'char') =>
  grade(expected, actual, { lang: 'en', strictness });

describe('영어 글자 도구', () => {
  it('아포스트로피는 부호가 아니라 철자다', () => {
    expect(toWords("I don't know.")).toEqual(['I', "don't", 'know']);
  });

  it('힌트는 첫 글자만 보이고 나머지는 가린다', () => {
    // 국어의 초성 뽑기를 영어에 쓰면 글자가 그대로 나와 답을 통째로 보여 준다.
    expect(firstLetters('I like apples.')).toBe('I l___ a_____.');
    expect(firstLetters("don't")).toBe('d____');
  });

  it('글자 단위 편집거리', () => {
    expect(letterDistance('cat', 'cat')).toBe(0);
    expect(letterDistance('cat', 'cut')).toBe(1);
    expect(letterDistance('cat', 'Cat')).toBe(0); // 대소문자는 거리에 안 넣는다
  });
});

describe('낱말 짝 오류 유형', () => {
  const t = (e: string, a: string) => classifyWordPair(e, a);

  it('겹글자', () => {
    expect(t('rabbit', 'rabit')).toContain('겹글자');
    expect(t('running', 'runing')).toContain('겹글자');
  });

  it('묵음', () => {
    expect(t('know', 'now')).toContain('묵음');
    expect(t('cake', 'cak')).toContain('묵음');
    expect(t('night', 'nit')).toContain('묵음');
    expect(t('write', 'rite')).toContain('묵음');
  });

  it('ie/ei 는 순서바뀜보다 먼저 잡힌다', () => {
    expect(t('friend', 'freind')).toEqual(['ie/ei']);
    expect(t('believe', 'beleive')).toEqual(['ie/ei']);
  });

  it('순서바뀜', () => {
    expect(t('form', 'from')).toContain('순서바뀜');
  });

  it('동음이의', () => {
    expect(t('their', 'there')).toEqual(['동음이의']);
    expect(t('too', 'two')).toEqual(['동음이의']);
  });

  it('어미', () => {
    expect(t('apples', 'apple')).toContain('어미');
    expect(t('babies', 'babys')).toContain('어미');
    expect(t('walked', 'walkd')).toContain('어미');
  });

  it('줄기가 두 글자면 어미로 보지 않는다', () => {
    // bed → be 를 「어미 실수」로 부르면 통계가 오염된다
    expect(t('bed', 'be')).not.toContain('어미');
  });

  it('모음·자음 철자', () => {
    expect(t('cat', 'cut')).toContain('모음철자');
    expect(t('very', 'bery')).toContain('자음철자'); // 한국 학생이 흔히 틀리는 b/v
    expect(t('rice', 'lice')).toContain('자음철자'); // r/l
  });

  it('대문자만 다르면 대문자 하나만 낸다', () => {
    expect(t('Monday', 'monday')).toEqual(['대문자']);
  });

  it('같으면 아무것도 안 낸다', () => {
    expect(t('apple', 'apple')).toEqual([]);
  });
});

describe('영어 채점', () => {
  it('똑같이 쓰면 맞음', () => {
    const r = en('I like apples.', 'I like apples.');
    expect(r.verdict).toBe('correct');
    expect(isCorrect(r.verdict)).toBe(true);
  });

  it('영어는 「글자만」에서도 낱말 사이 빈칸을 지킨다', () => {
    // 국어의 띄어쓰기는 따로 배우는 것이라 char 에서 빼지만,
    // 영어에서 낱말을 붙여 쓰면 그건 철자가 틀린 것이다.
    // 「아깝게 틀림(partial)」이 나오더라도 점수로는 오답이어야 한다 — 불변식 1.
    const r = en('I like apples.', 'Ilike apples.');
    expect(isCorrect(r.verdict)).toBe(false);
    expect(r.tags).toContain('띄어쓰기');
  });

  it('아포스트로피를 빠뜨리면 틀린다', () => {
    expect(isCorrect(en("I don't know.", 'I dont know.').verdict)).toBe(false);
  });

  it('대문자만 다르면 「글자만」에서는 맞되 알려 준다', () => {
    const r = en('Monday is my favorite day.', 'monday is my favorite day.');
    expect(r.verdict).toBe('correct');
    expect(r.tags).toContain('대문자');
  });

  it('대문자는 「글자+띄어쓰기+문장부호」에서 점수에 들어간다', () => {
    // 「글자만」에서는 맞음이던 것이 여기서는 점수에 들어가야 한다.
    const r = en('Monday is my favorite day.', 'monday is my favorite day.', 'full');
    expect(isCorrect(r.verdict)).toBe(false);
  });

  it('마침표를 빠뜨리면 「글자만」에서는 맞되 알려 준다', () => {
    const r = en('I am happy.', 'I am happy');
    expect(r.verdict).toBe('correct');
    expect(r.tags).toContain('문장부호');
  });

  it('문장 안의 철자 실수에 유형이 붙는다', () => {
    const r = en('The rabbit is running.', 'The rabit is runing.');
    expect(r.verdict).toBe('wrong');
    expect(r.tags).toContain('겹글자');
  });

  it('동음이의어를 바꿔 쓰면 그 유형으로 잡힌다', () => {
    const r = en('Their house is big.', 'There house is big.');
    expect(r.verdict).toBe('wrong');
    expect(r.tags).toContain('동음이의');
  });

  it('영어 채점에 국어 오류 유형이 새지 않는다', () => {
    const ko = ['받침', '겹받침', '된소리', '거센소리', '연음', '구개음화', '비음화', '유음화', '자음혼동', '모음혼동', '준말'];
    const r = en('She has a big brown dog.', 'She has a bigg braun dogg.');
    for (const t of r.tags) expect(ko).not.toContain(t);
  });

  it('아이폰이 바꾼 굽은 아포스트로피(’)도 같은 말로 본다', () => {
    // iOS 자판은 ' 를 ’ 로 바꿔 버린다. 아이는 바르게 썼는데 틀렸다고 나오면 안 된다.
    expect(en("I don't know.", 'I don\u2019t know.').verdict).toBe('correct');
    expect(en('I don\u2019t know.', "I don't know.").verdict).toBe('correct');
  });

  it('「글자+띄어쓰기+문장부호」에서 대문자가 틀리면 그 칸이 틀린 것으로 표시된다', () => {
    // 🔴 점수는 틀렸는데 칸은 다 맞은 것으로 보이면 아이는 이유를 알 수 없다.
    const r = en('Monday is fun.', 'monday is fun.', 'full');
    expect(isCorrect(r.verdict)).toBe(false);
    expect(r.marks.some((m) => m.status === 'wrong'), '틀린 칸이 표시되지 않았다').toBe(true);
    expect(r.marks[0].status).toBe('wrong');
  });

  it('빈 답안은 틀림', () => {
    const r = en('Thank you very much.', '');
    expect(r.verdict).toBe('wrong');
    expect(r.similarity).toBe(0);
  });
});

describe('결과 화면에 보여 줄 정답', () => {
  it('띄어쓰기와 부호까지 원문 그대로 돌려준다', () => {
    // 🔴 다듬은 문자열을 이어 붙여 보여 주면 「Ilikeapples.」가 정답으로 나온다(국어에서 난 사고).
    const r = en('I like apples.', 'I like aples.');
    const shown = markedAnswer('I like apples.', r.marks).map((m) => m.char).join('');
    expect(shown).toBe('I like apples.');
  });

  it('틀린 글자만 틀린 것으로 표시된다', () => {
    const r = en('rabbit', 'rabit');
    const marks = markedAnswer('rabbit', r.marks);
    expect(marks.map((m) => m.char).join('')).toBe('rabbit');
    // 여섯 칸 중 «맞음이 아닌» 칸이 하나는 있어야 한다 — 다 맞았다고 보이면 안 된다
    expect(marks.filter((m) => m.status !== 'ok').length).toBeGreaterThan(0);
  });

  it('아이가 아무것도 못 쓴 답도 정답을 온전히 보여 준다', () => {
    const r = en('Thank you very much.', '');
    const shown = markedAnswer('Thank you very much.', r.marks).map((m) => m.char).join('');
    expect(shown).toBe('Thank you very much.');
  });
});

describe('언어 축이 국어를 건드리지 않는다', () => {
  it('lang 을 안 주면 국어로 채점한다', () => {
    expect(grade('학교에 갑니다.', '학교에 갑니다.').verdict).toBe('correct');
    expect(grade('학교에 갑니다.', '학교에갑니다.').verdict).toBe('correct'); // char = 띄어쓰기 무시
  });

  it('국어 결과에 영어 유형이 안 붙는다', () => {
    const r = grade('꽃잎이 떨어진다.', '꼬치피 떨어진다.');
    const enOnly = ['묵음', '겹글자', '모음철자', '자음철자', 'ie/ei', '어미', '동음이의', '순서바뀜', '대문자'];
    for (const t of r.tags) expect(enOnly).not.toContain(t);
  });
});
