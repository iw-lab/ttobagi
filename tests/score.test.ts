import { describe, it, expect } from 'vitest';
import { scoreOf, scoreLabel } from '../src/engine/score';
import type { AnswerRecord } from '../src/engine/types';

const A = (o: Partial<AnswerRecord>): AnswerRecord => ({
  itemId: 'x', itemIndex: 0, expected: '학교', text: '', verdict: 'wrong',
  tags: [], confirmed: true, elapsed: 0, ...o,
} as AnswerRecord);

describe('점수 세기', () => {
  it('미확정 손글씨는 분모에도 분자에도 안 들어간다', () => {
    // 사용자 신고(2026-09-14)의 그 상황: 손글씨 2 + 자판 정답 1 → «1 / 3» 이 아니라 «1 / 1»
    const s = scoreOf([
      A({ confirmed: false, verdict: 'wrong' }),
      A({ confirmed: false, verdict: 'wrong' }),
      A({ confirmed: true, verdict: 'correct' }),
    ]);
    expect(s).toEqual({ correct: 1, graded: 1, undecided: 2, total: 3 });
    expect(scoreLabel(s)).toBe('1 / 1');
  });

  it('확정 전에는 verdict 가 correct 여도 맞은 것으로 세지 않는다', () => {
    // 불변식 ① — 미확정 답이 점수로 새면 안 된다
    const s = scoreOf([A({ confirmed: false, verdict: 'correct' })]);
    expect(s.correct).toBe(0);
    expect(s.graded).toBe(0);
  });

  it('전부 미확정이면 숫자를 만들어 내지 않는다', () => {
    expect(scoreLabel(scoreOf([A({ confirmed: false }), A({ confirmed: false })]))).toBe('채점 전');
  });

  it('확정된 오답은 분모에 들어간다', () => {
    const s = scoreOf([A({ verdict: 'correct' }), A({ verdict: 'wrong' })]);
    expect(scoreLabel(s)).toBe('1 / 2');
    expect(s.undecided).toBe(0);
  });

  it('partial 은 맞은 것이 아니다 (isCorrect 가 유일 정본)', () => {
    const s = scoreOf([A({ verdict: 'partial' })]);
    expect(s.correct).toBe(0);
    expect(s.graded).toBe(1);
  });
});
