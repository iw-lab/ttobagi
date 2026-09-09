import { deleteAttempt, getAttempts, getLists, wipeAttempts } from '../engine/store';
import { isCorrect, TAG_HELP, type ErrorTag } from '../engine/grade';
import { RUN_MODE_LABEL } from '../engine/types';
import { button, confirmBox, formatDate, h, navigate, toast } from '../ui/dom';
import type { View } from './view';

export function reportView(): View {
  const el = h('div', { class: 'view' });
  // 🔴 「띄어쓰기」·「문장부호」는 두 과목에 같은 이름으로 있지만 «가르치는 내용»이 다르다.
  //    한 표에 섞으면 교사는 무엇을 더 가르쳐야 할지 읽을 수 없다. 과목이 둘이면 나눠 본다.
  //    처음 열 때는 «기록이 있는 쪽»을 편다 — 영어만 푼 아이에게 「기록이 없어요」를 보이면 안 된다.
  let subject: 'ko' | 'en' | null = null;

  function render(): void {
    el.replaceChildren();
    const all = getAttempts();
    const hasEn = all.some((a) => a.lang === 'en');
    const hasKo = all.some((a) => (a.lang ?? 'ko') === 'ko');
    if (subject === null) subject = hasKo ? 'ko' : 'en';
    const attempts = hasEn && hasKo ? all.filter((a) => (a.lang ?? 'ko') === subject) : all;

    if (!attempts.length) {
      el.append(
        h(
          'section',
          { class: 'card' },
          h('h1', {}, '내 기록'),
          h('p', { class: 'muted' }, '아직 기록이 없어요. 연습을 한 번 해 보면 여기에 쌓입니다.'),
          button('연습하러 가기', () => navigate('#/lists'), 'btn'),
        ),
      );
      return;
    }

    // 오류 유형 모으기
    const tagCount = new Map<ErrorTag, number>();
    // 틀린 문항 모으기 (급수표별)
    const wrongByList = new Map<string, Set<string>>();

    for (const a of attempts) {
      for (const ans of a.answers) {
        // 그때의 정답이 남아 있지 않은 옛 기록은 진단에서 뺀다.
        // 문항 번호는 그대로여도 급수표 내용이 바뀌었을 수 있어, 엉뚱한 문장을
        // 「어려워하는 문항」으로 지목하게 된다.
        if (ans.expected === undefined) continue;
        if (isCorrect(ans.verdict)) continue;
        for (const t of ans.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
        if (!wrongByList.has(a.listId)) wrongByList.set(a.listId, new Set());
        wrongByList.get(a.listId)!.add(ans.itemId);
      }
    }

    const tags = [...tagCount.entries()].sort((x, y) => y[1] - x[1]);
    const maxTag = tags[0]?.[1] ?? 1;

    const totalItems = attempts.reduce((n, a) => n + a.answers.length, 0);
    const totalCorrect = attempts.reduce((n, a) => n + a.answers.filter((x) => isCorrect(x.verdict)).length, 0);

    el.append(
      h(
        'section',
        { class: 'card' },
        h('h1', {}, '내 기록'),
        hasEn && hasKo
          ? h(
              'div',
              { class: 'subject-tabs', role: 'tablist', 'aria-label': '과목' },
              ...(['ko', 'en'] as const).map((k) =>
                h('button', {
                  class: `subject-tab${subject === k ? ' on' : ''}`,
                  type: 'button', role: 'tab', 'aria-selected': String(subject === k),
                  onclick: () => { if (subject !== k) { subject = k; render(); } },
                }, k === 'ko' ? '국어' : '영어'),
              ),
            )
          : null,
        h('p', { class: 'muted' }, `${attempts.length}번 했고, 모두 ${totalItems}문항 중 ${totalCorrect}개를 맞혔어요.`),
      ),
    );

    if (tags.length) {
      el.append(
        h(
          'section',
          { class: 'card' },
          h('h2', {}, '자주 틀리는 것'),
          h(
            'ul',
            { class: 'bar-list' },
            ...tags.slice(0, 8).map(([tag, count]) =>
              h(
                'li',
                {},
                h('div', { class: 'bar-row' },
                  h('span', { class: 'bar-label' }, tag),
                  h('span', { class: 'bar-track' }, h('span', { class: 'bar-fill', style: `width:${Math.round((count / maxTag) * 100)}%` })),
                  h('span', { class: 'bar-count' }, String(count)),
                ),
                h('p', { class: 'muted small' }, TAG_HELP[tag]),
              ),
            ),
          ),
        ),
      );
    }

    // 틀린 문항 다시 쓰기
    const retryCards = [...wrongByList.entries()]
      .map(([listId, ids]) => ({ list: getLists().find((l) => l.id === listId), ids: [...ids] }))
      .filter((x) => x.list);

    if (retryCards.length) {
      el.append(
        h(
          'section',
          { class: 'card' },
          h('h2', {}, '틀린 것 다시 쓰기'),
          h('p', { class: 'muted small' }, '한 번 틀린 문항은 사라지지 않고 여기 남아요. 세 번 다시 쓰면 확실히 익혀집니다.'),
          h(
            'ul',
            { class: 'list' },
            ...retryCards.map(({ list, ids }) =>
              h(
                'li',
                { class: 'list-row' },
                h('div', { class: 'list-main' }, h('strong', {}, list!.title), h('span', { class: 'muted small' }, `틀린 문항 ${ids.length}개`)),
                button('다시 쓰기', () => navigate(`#/run/${list!.id}?mode=retry&items=${ids.join(',')}`), 'btn small'),
              ),
            ),
          ),
        ),
      );
    }

    el.append(
      h(
        'section',
        { class: 'card' },
        h('h2', {}, '지난 기록'),
        h(
          'ul',
          { class: 'list' },
          ...attempts.slice(0, 30).map((a) => {
            const correct = a.answers.filter((x) => isCorrect(x.verdict)).length;
            const unconfirmed = a.answers.filter((x) => !x.confirmed).length;
            return h(
              'li',
              { class: 'list-row' },
              h(
                'button',
                { class: 'list-main', type: 'button', onclick: () => navigate(`#/result/${a.id}`) },
                h('strong', {}, `${correct} / ${a.answers.length}`),
                h('span', { class: 'muted small' }, `${a.listTitle} · ${RUN_MODE_LABEL[a.mode]} · ${a.who} · ${formatDate(a.finishedAt)}${unconfirmed ? ` · 채점 전 ${unconfirmed}개` : ''}`),
              ),
              button('지우기', () => {
                deleteAttempt(a.id);
                render();
              }, 'btn small ghost'),
            );
          }),
        ),
        h(
          'div',
          { class: 'row' },
          button('기록 모두 지우기', () => {
            if (!confirmBox('이 기기에 저장된 학습 기록을 모두 지울까요? 급수표는 그대로 둡니다.')) return;
            wipeAttempts();
            toast('기록을 지웠어요');
            render();
          }, 'btn danger'),
          button('설정', () => navigate('#/settings'), 'btn ghost'),
        ),
      ),
    );
  }

  render();
  return { el, title: '내 기록 — 또박이' };
}
