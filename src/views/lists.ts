import { deleteList, getLists } from '../engine/store';
import { button, confirmBox, formatDate, h, navigate, toast } from '../ui/dom';
import type { View } from './view';

export function listsView(): View {
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
        h('h2', {}, '학년별 급수표'),
        h(
          'p',
          { class: 'muted' },
          '1~6학년 82급이 소리까지 들어 있는 채로 준비되어 있습니다. 학교 급수표와 다르면 담아서 고쳐 쓰세요.',
        ),
        button('학년별 급수표 보기', () => navigate('#/curriculum'), 'btn'),
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

  return { el, title: '급수표 — 또박이' };
}
