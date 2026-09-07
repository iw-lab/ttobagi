import { createList, deleteList, getLists } from '../engine/store';
import { SAMPLES } from '../engine/samples';
import { button, confirmBox, formatDate, h, navigate, toast } from '../ui/dom';
import type { Params, View } from './view';

export function listsView(params: Params): View {
  const el = h('div', { class: 'view' });

  const render = () => {
    el.replaceChildren();
    const lists = getLists();

    el.append(
      h(
        'section',
        { class: 'card' },
        h('h1', {}, '급수표'),
        h('p', { class: 'muted' }, '학교에서 나눠 준 급수표를 그대로 넣어 쓰세요. 붙여넣기·직접 입력 모두 됩니다.'),
        h(
          'div',
          { class: 'row' },
          button('+ 새 급수표', () => navigate('#/list/new'), 'btn'),
          button('공유 코드로 받기', () => navigate('#/open'), 'btn ghost'),
        ),
      ),
    );

    if (lists.length) {
      el.append(
        h(
          'section',
          { class: 'card' },
          h('h2', {}, `내 급수표 (${lists.length})`),
          h(
            'ul',
            { class: 'list' },
            ...lists.map((l) =>
              h(
                'li',
                { class: 'list-row' },
                h(
                  'button',
                  { class: 'list-main', type: 'button', onclick: () => navigate(`#/list/${l.id}`) },
                  h('strong', {}, l.title),
                  h(
                    'span',
                    { class: 'muted small' },
                    `${l.level || '급수 없음'} · ${l.items.length}문항 · ${formatDate(l.updatedAt)}`,
                  ),
                ),
                button('연습', () => navigate(`#/run/${l.id}?mode=practice`), 'btn small'),
                button('칠판', () => navigate(`#/board/${l.id}`), 'btn small ghost'),
                button(
                  '삭제',
                  () => {
                    if (!confirmBox(`「${l.title}」 급수표와 그 기록을 지울까요? 되돌릴 수 없어요.`)) return;
                    deleteList(l.id);
                    toast('지웠어요');
                    render();
                  },
                  'btn small danger',
                ),
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
        h('h2', {}, '예시 급수표'),
        h(
          'p',
          { class: 'muted' },
          '학교 급수표는 학급마다 다릅니다. 아래는 시작점으로 쓰는 예시예요. 담아서 마음대로 고쳐 쓰세요.',
        ),
        h(
          'ul',
          { class: 'list' },
          ...SAMPLES.map((s) =>
            h(
              'li',
              { class: 'list-row' },
              h(
                'div',
                { class: 'list-main' },
                h('strong', {}, s.title),
                h('span', { class: 'muted small' }, `${s.level} · ${s.items.length}문항 · ${s.point}`),
              ),
              button(
                '담기',
                () => {
                  const created = createList(s.title, s.level, s.items);
                  toast(`「${s.title}」을(를) 담았어요`);
                  navigate(`#/list/${created.id}`);
                },
                'btn small',
              ),
            ),
          ),
        ),
      ),
      h(
        'section',
        { class: 'card notice-card' },
        h('h2', {}, '1학년 1학기라면'),
        h(
          'p',
          {},
          '교육부는 1학년 1학기에 무리한 받아쓰기 시험을 지양하도록 안내합니다. 이 시기에는 시험 대신 ',
          h('strong', {}, '따라 쓰기와 소리 듣고 글자 찾기'),
          ' 같은 놀이로 쓰는 것을 권합니다. 연습 모드에서 힌트를 켜고 천천히 써 보세요.',
        ),
      ),
    );
  };

  render();

  if (params.samples === '1') {
    queueMicrotask(() => {
      el.querySelector('.card:nth-of-type(3)')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return { el, title: '급수표 — 또박이' };
}
