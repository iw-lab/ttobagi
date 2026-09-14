import { isCorrect } from './grade';
import type { AnswerRecord } from './types';

/**
 * 한 번의 기록에서 «점수»를 센다.
 *
 * 🔴 왜 함수로 뺐나 (2026-09-14): 점수가 화면 코드 안에 인라인으로 있었고,
 *    `correct / total` 로 계산하는 바람에 **아직 채점 안 한 손글씨가 분모에 들어가** 있었다.
 *    화면은 「손으로 쓴 답 2개는 아직 채점 전」이라고 말하면서 점수는 «1 / 3» 을 보여 줬다 —
 *    말과 숫자가 어긋났고, 아이 눈에는 손글씨가 통째로 틀린 것으로 보인다(사용자 신고).
 *
 * 🔴 불변식(둘 다 지켜야 한다):
 *    ① 사람이 확정하기 전까지 **정답 처리 금지** — `confirmed` 가 아니면 맞은 것으로 세지 않는다.
 *    ② 확정 전까지 **오답 처리도 금지** — 분모(`graded`)에도 넣지 않는다.
 *       ①만 지키면 「미확정 = 오답」이 되어 결국 아이를 틀렸다고 말하는 것과 같다.
 */
export interface ScoreBreakdown {
  /** 맞은 개수 — 확정된 것 중에서만 센다 */
  correct: number;
  /** 채점이 끝난 개수(= 점수의 분모) */
  graded: number;
  /** 아직 사람이 ○× 를 누르지 않은 개수 */
  undecided: number;
  /** 문항 수 전체 */
  total: number;
}

export function scoreOf(answers: readonly AnswerRecord[]): ScoreBreakdown {
  let correct = 0, graded = 0, undecided = 0;
  for (const a of answers) {
    if (!a.confirmed) { undecided++; continue; }
    graded++;
    if (isCorrect(a.verdict)) correct++;
  }
  return { correct, graded, undecided, total: answers.length };
}

/** 점수를 글자로. 채점이 하나도 안 끝났으면 숫자를 만들어 내지 않는다. */
export function scoreLabel(s: ScoreBreakdown): string {
  return s.graded === 0 ? '채점 전' : `${s.correct} / ${s.graded}`;
}
