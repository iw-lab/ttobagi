import { getAttempt, getList, saveAttempt } from '../engine/store';
import { grade, isCorrect, tagStats, TAG_HELP } from '../engine/grade';
import { RUN_MODE_LABEL, type Attempt } from '../engine/types';
import { copyText, encodeResult, qrSvg, shareUrl } from '../engine/share';
import { add, button, formatDate, h, navigate, toast } from '../ui/dom';
import type { Params, View } from './view';

export function resultView(params: Params): View {
  const attempt = getAttempt(params.id);
  if (!attempt) {
    return {
      el: h('div', { class: 'view' }, h('section', { class: 'card' }, h('h1', {}, '기록을 찾을 수 없어요'), button('처음으로', () => navigate('#/'), 'btn'))),
    };
  }
  const list = getList(attempt.listId);
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
    const total = attempt!.answers.length;
    const correct = attempt!.answers.filter((a) => isCorrect(a.verdict)).length;
    const unconfirmed = attempt!.answers.filter((a) => !a.confirmed).length;
    const wrongIds = attempt!.answers.filter((a) => !isCorrect(a.verdict) && a.confirmed).map((a) => a.itemId);

    const results = attempt!.answers
      .filter((a) => a.confirmed && a.text)
      .map((a) => grade(answerOf(a), a.text, { strictness: attempt!.settings.strictness }));
    const stats = tagStats(results);

    el.append(
      h(
        'section',
        { class: 'card result-head' },
        h('h1', {}, attempt!.settings.hideScore ? '다 했어요!' : `${correct} / ${total}`),
        h('p', { class: 'muted' }, `${attempt!.listTitle} · ${RUN_MODE_LABEL[attempt!.mode]} · ${attempt!.who} · ${formatDate(attempt!.finishedAt)}`),
        unconfirmed
          ? h('p', { class: 'notice' }, `손으로 쓴 답 ${unconfirmed}개는 아직 채점 전이에요. 아래에서 하나씩 봐 주세요.`)
          : null,
      ),
    );

    // 손글씨 채점 — 썸네일을 죽 늘어놓고 ○/× 만 누른다
    // 손으로 쓰다가 한 획도 안 그리고 낸 답은 ink 가 없다. 그것까지 여기 세워 두지 않으면
    // 「채점 전 n개」라고 말해 놓고 정작 채점할 자리가 없는 화면이 된다.
    const inkAnswers = attempt!.answers.filter((a) => a.ink || (!a.confirmed && !a.text));
    if (inkAnswers.length) {
      el.append(
        h(
          'section',
          { class: 'card' },
          h('h2', {}, '손글씨 채점'),
          h('p', { class: 'muted small' }, '정답을 위에 두고 아이 글씨를 봅니다. 한 번씩만 눌러 주세요.'),
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
                h(
                  'div',
                  { class: 'row center' },
                  button('○', () => {
                    a.verdict = 'correct';
                    a.confirmed = true;
                    saveAttempt(attempt!);
                    render();
                  }, 'btn small'),
                  button('×', () => {
                    a.verdict = 'wrong';
                    a.confirmed = true;
                    saveAttempt(attempt!);
                    render();
                  }, 'btn small ghost'),
                ),
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
        h('h2', {}, '문항별로 보기'),
        h(
          'ol',
          { class: 'result-list' },
          ...attempt!.answers.map((a) => {
            const expected = answerOf(a);
            const r = a.text ? grade(expected, a.text, { strictness: attempt!.settings.strictness }) : null;
            return h(
              'li',
              { class: `result-row ${isCorrect(a.verdict) ? 'ok' : 'no'}` },
              h('span', { class: 'result-icon' }, isCorrect(a.verdict) ? '○' : a.verdict === 'partial' ? '△' : '×'),
              h(
                'div',
                { class: 'result-body' },
                r
                  ? h('p', { class: 'answer-reveal' }, ...r.marks.map((m) => h('span', { class: `mark ${m.status}` }, m.expected)))
                  : h('p', { class: 'answer-reveal' }, h('strong', {}, expected)),
                a.text ? h('p', { class: 'muted small' }, `쓴 것: ${a.text}`) : a.ink ? h('img', { class: 'ink-mini', src: a.ink, alt: '쓴 글씨' }) : null,
                a.tags.length ? h('p', { class: 'tags' }, ...a.tags.map((t) => h('span', { class: 'tag' }, t))) : null,
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
    if (wrongIds.length && list) {
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
    void (async () => {
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

    el.append(
      h('section', { class: 'card' }, h('h2', {}, '다음에 할 일'), actions),
      h('details', { class: 'card' }, h('summary', {}, '결과 넘겨주기'), shareBox),
    );
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
