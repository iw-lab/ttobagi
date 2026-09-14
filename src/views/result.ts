import { deleteAttempt, getAttempt, getList, saveAttempt } from '../engine/store';
import { grade, isCorrect, markedAnswer, tagStats, TAG_HELP } from '../engine/grade';
import { scoreLabel, scoreOf } from '../engine/score';
import { RUN_MODE_LABEL, type Attempt } from '../engine/types';
import { copyText, encodeResult, qrSvg, shareUrl } from '../engine/share';
import { add, button, confirmBox, formatDate, h, navigate, toast } from '../ui/dom';
import type { Params, View } from './view';

export function resultView(params: Params): View {
  const attempt = getAttempt(params.id);
  if (!attempt) {
    return {
      el: h('div', { class: 'view' }, h('section', { class: 'card' }, h('h1', {}, '기록을 찾을 수 없어요'), button('처음으로', () => navigate('#/'), 'btn'))),
    };
  }
  const list = getList(attempt.listId);
  // 급수표가 지워졌어도 기록에 실린 과목으로 본다. 없으면 국어(그 칸이 생기기 전 기록).
  const lang = attempt.lang ?? 'ko';
  /**
   * 정답 글자는 «응시 당시 기록»을 먼저 본다.
   * 급수표는 나중에 고쳐질 수 있고, 실제로 그래서 지난 결과가 엉뚱하게 다시 채점된 적이 있다.
   */
  const answerOf = (a: { itemId: string; expected?: string }) =>
    a.expected ?? list?.items.find((i) => i.id === a.itemId)?.text ?? '(지워진 문항)';
  const itemText = (id: string) => list?.items.find((i) => i.id === id)?.text ?? '(지워진 문항)';

  const el = h('div', { class: 'view' });

  function render(): void {
    el.replaceChildren();
    // 🔴 미확정(사람이 아직 ○× 를 안 누른 손글씨)은 **분자에도 분모에도** 넣지 않는다.
    //    예전엔 `correct / total` 이라 미확정이 분모에 들어갔고, 화면이 「아직 채점 전」이라
    //    말하면서 점수는 «1 / 3» 을 보여 줬다 — 아이 눈엔 손글씨가 통째로 틀린 것으로 보인다.
    const score = scoreOf(attempt!.answers);
    const unconfirmed = score.undecided;
    const wrongIds = attempt!.answers.filter((a) => !isCorrect(a.verdict) && a.confirmed).map((a) => a.itemId);

    /**
     * 예전 기록에는 «그때의 정답»이 없다.
     * 그런 기록에 지금 급수표 문장을 정답이라고 붙여 놓고 그때의 ○×·태그를 같이 보여 주면
     * 「정답과 쓴 것이 글자 하나까지 같은데 ×」라는 화면이 나온다 — 실제로 그렇게 나왔다(2026-09-08).
     * 그때 무엇을 불러 줬는지 알 수 없으므로, 채점 결과를 아예 보여 주지 않는다.
     */
    const legacy = attempt!.answers.some((a) => a.expected === undefined);

    const results = attempt!.answers
      .filter((a) => a.confirmed && a.text && a.expected !== undefined)
      .map((a) => grade(answerOf(a), a.text, { strictness: attempt!.settings.strictness, lang }));
    const stats = tagStats(results);

    el.append(
      h(
        'section',
        { class: 'card result-head' },
        h('h1', {}, legacy ? '지난 기록' : attempt!.settings.hideScore ? '다 했어요!' : scoreLabel(score)),
        h('p', { class: 'muted' }, `${attempt!.listTitle} · ${RUN_MODE_LABEL[attempt!.mode]} · ${attempt!.who} · ${formatDate(attempt!.finishedAt)}`),
        !legacy && unconfirmed
          ? h('p', { class: 'notice' }, `손으로 쓴 답 ${unconfirmed}개는 아직 채점 전이에요. 정답을 보고 스스로 ○ 또는 × 를 눌러 주세요. 누르기 전에는 점수에 넣지 않아요.`)
          : null,
        legacy
          ? h(
              'div',
              { class: 'notice' },
              h('p', {}, '급수표가 바뀌기 전에 본 기록이에요. 그때 무엇을 불러 줬는지 알 수 없어서 점수와 ○× 는 보여 드리지 않습니다. 아이가 쓴 것만 아래에 남겨 두었어요.'),
              h(
                'div',
                { class: 'row' },
                list ? button('지금 급수표로 다시 풀기', () => navigate(`#/run/${list.id}?mode=practice`), 'btn small') : null,
                button('이 기록 지우기', () => {
                  if (!confirmBox('이 기록을 지울까요?')) return;
                  deleteAttempt(attempt!.id);
                  toast('지웠어요');
                  navigate('#/report');
                }, 'btn small ghost'),
              ),
            )
          : null,
      ),
    );

    /**
     * ○/× 버튼 — **손글씨 카드와 문항별 목록이 같은 것을 쓴다.**
     * 🔴 버튼을 두 군데 따로 만들면 한쪽만 고쳐져 「여기선 채점되는데 저기선 안 된다」가 된다.
     *    (이 저장소가 이미 세 번 태운 형태 — 검사가 한쪽 경로에만 있는 결함과 같은 뿌리다.)
     */
    const markButtons = (a: Attempt['answers'][number], cls = 'btn small') =>
      h(
        'div',
        { class: 'row center mark-buttons' },
        button('○', () => { a.verdict = 'correct'; a.confirmed = true; saveAttempt(attempt!); render(); }, cls),
        button('×', () => { a.verdict = 'wrong'; a.confirmed = true; saveAttempt(attempt!); render(); }, cls + ' ghost'),
      );

    // 손글씨 채점 — 썸네일을 죽 늘어놓고 ○/× 만 누른다
    // 손으로 쓰다가 한 획도 안 그리고 낸 답은 ink 가 없다. 그것까지 여기 세워 두지 않으면
    // 「채점 전 n개」라고 말해 놓고 정작 채점할 자리가 없는 화면이 된다.
    const inkAnswers = legacy ? [] : attempt!.answers.filter((a) => a.ink || (!a.confirmed && !a.text));
    if (inkAnswers.length) {
      el.append(
        h(
          'section',
          { class: 'card' },
          h('h2', {}, '내가 쓴 것 스스로 채점하기'),
          h('p', { class: 'muted small' }, '위의 정답과 내가 쓴 글씨를 견주어 보고, 맞으면 ○ 틀리면 × 를 눌러요. 누르기 전에는 점수에 들어가지 않아요.'),
          h(
            'div',
            { class: 'ink-grid' },
            ...inkAnswers.map((a) =>
              h(
                'div',
                { class: `ink-cell ${a.confirmed ? (isCorrect(a.verdict) ? 'ok' : 'no') : ''}` },
                h('div', { class: 'ink-answer' }, answerOf(a)),
                a.ink
                  ? h('img', { class: 'ink-img', src: a.ink, alt: '학생이 쓴 글씨' })
                  : h('div', { class: 'ink-empty muted small' }, '빈 답'),
                markButtons(a),
              ),
            ),
          ),
        ),
      );
    }

    // 문항별 결과
    el.append(
      h(
        'section',
        { class: 'card' },
        h('h2', {}, legacy ? '그때 쓴 것' : '문항별로 보기'),
        h(
          'ol',
          { class: 'result-list' },
          ...attempt!.answers.map((a) => {
            const expected = answerOf(a);
            // 옛 기록은 다시 채점하지 않는다 — 저장된 판정과 어긋나는 표시를 만들지 않으려고
            const r =
              a.text && a.expected !== undefined
                ? grade(expected, a.text, { strictness: attempt!.settings.strictness, lang })
                : null;
            if (legacy) {
              // 정답도 ○× 도 믿을 수 없다. 아이가 남긴 것만 그대로 보여 준다.
              return h(
                'li',
                { class: 'result-row' },
                h('span', { class: 'result-icon muted' }, '·'),
                h(
                  'div',
                  { class: 'result-body' },
                  a.text
                    ? h('p', { class: 'answer-reveal' }, a.text)
                    : a.ink
                      ? h('img', { class: 'ink-mini', src: a.ink, alt: '쓴 글씨' })
                      : h('p', { class: 'muted small' }, '빈 답'),
                ),
              );
            }
            // 🔴 **미확정은 «틀림»이 아니다.** 예전엔 confirmed 를 안 보고 «맞지 않았으면 ×» 로
            //    찍어서, 손으로 쓴 답이 통째로 오답처럼 보였다(2026-09-14 사용자 신고).
            //    아직 안 누른 것은 «?» 로 두고, 그 자리에서 바로 스스로 채점할 수 있게 한다.
            const todo = !a.confirmed;
            return h(
              'li',
              { class: `result-row ${todo ? 'todo' : isCorrect(a.verdict) ? 'ok' : 'no'}` },
              h('span', { class: 'result-icon' }, todo ? '?' : isCorrect(a.verdict) ? '○' : a.verdict === 'partial' ? '△' : '×'),
              h(
                'div',
                { class: 'result-body' },
                r
                  ? h(
                      'p',
                      { class: 'answer-reveal' },
                      // 정답은 띄어쓰기·문장부호까지 원문 그대로 보여 준다
                      ...markedAnswer(expected, r.marks).map((m) =>
                        h('span', { class: `mark ${m.status}` }, m.char),
                      ),
                    )
                  : h('p', { class: 'answer-reveal' }, h('strong', {}, expected)),
                a.text ? h('p', { class: 'muted small' }, `쓴 것: ${a.text}`) : a.ink ? h('img', { class: 'ink-mini', src: a.ink, alt: '쓴 글씨' }) : null,
                todo
                  ? h(
                      'div',
                      { class: 'todo-mark' },
                      h('p', { class: 'muted small' }, '아직 채점 전이에요 — 정답과 견주어 보고 눌러 주세요'),
                      markButtons(a),
                    )
                  : null,
                // 🔴 ○ 옆에 태그만 덩그러니 붙으면 「그래서 틀렸다는 건가?」로 읽힌다
                //    (2026-09-10 사용자가 「뒷 일은」을 맞았는데 띄어쓰기 태그를 보고 물었다).
                //    맞은 줄에서는 태그가 «틀림»이 아니라 «다음에 살펴볼 곳»이라고 말해 준다.
                a.tags.length
                  ? h(
                      'p',
                      { class: 'tags' },
                      !todo && isCorrect(a.verdict)
                        ? h('span', { class: 'tag-note' }, '맞았어요 · 다음엔 여기만 더')
                        : null,
                      ...a.tags.map((t) => h('span', { class: 'tag' }, t)),
                    )
                  : null,
              ),
            );
          }),
        ),
      ),
    );

    if (stats.length) {
      el.append(
        h(
          'section',
          { class: 'card' },
          h('h2', {}, '무엇을 어려워했나'),
          h(
            'ul',
            { class: 'stat-list' },
            ...stats.slice(0, 5).map((s) =>
              h('li', {}, h('strong', {}, `${s.tag} ${s.count}개`), h('span', { class: 'muted small' }, ` — ${TAG_HELP[s.tag]}`)),
            ),
          ),
        ),
      );
    }

    const actions = h('div', { class: 'row' });
    if (!legacy && wrongIds.length && list) {
      actions.append(
        button(`틀린 ${wrongIds.length}개 다시 쓰기`, () => navigate(`#/run/${list.id}?mode=retry&items=${wrongIds.join(',')}`), 'btn'),
      );
    }
    if (list) {
      actions.append(button('같은 급수표 다시', () => navigate(`#/run/${list.id}?mode=practice`), 'btn ghost'));
    }
    actions.append(button('내 기록', () => navigate('#/report'), 'btn ghost'));
    actions.append(button('처음으로', () => navigate('#/'), 'btn ghost'));

    const shareBox = h('div', { class: 'share-box' });
    if (!legacy) void (async () => {
      const code = await encodeResult(attempt!, (id) => {
        const found = attempt!.answers.find((x) => x.itemId === id);
        return found ? answerOf(found) : itemText(id);
      });
      const url = shareUrl(code);
      const svg = url.length <= 1800 ? qrSvg(url, 3) : null;
      add(
        shareBox,
        h('p', { class: 'muted small' }, '선생님께 결과를 보여 줄 때 쓰세요. 링크 안에 결과가 들어 있어 서버로 보내지 않습니다.'),
        svg ? h('div', { class: 'qr small-qr', html: svg }) : null,
        h('div', { class: 'row' }, button('결과 링크 복사', async () => {
          toast((await copyText(url)) ? '복사했어요' : '복사가 안 돼요', 'ok');
        }, 'btn ghost small')),
      );
    })();

    el.append(h('section', { class: 'card' }, h('h2', {}, '다음에 할 일'), actions));
    // 옛 기록은 채점 결과가 없으므로 넘겨줄 것도 없다
    if (!legacy) el.append(h('details', { class: 'card' }, h('summary', {}, '결과 넘겨주기'), shareBox));
  }

  render();
  return { el, title: '결과 — 또박이' };
}

export function attemptSummary(a: Attempt): { correct: number; total: number } {
  return {
    correct: a.answers.filter((x) => isCorrect(x.verdict)).length,
    total: a.answers.length,
  };
}
