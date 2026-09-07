import { getLastListId, getLists, getWho, setWho } from '../engine/store';
import { voiceStatus } from '../engine/speech';
import { button, formatDate, h, navigate } from '../ui/dom';
import type { View } from './view';

export function homeView(): View {
  const lists = getLists();
  const last = getLastListId();
  const recent = lists.find((l) => l.id === last) ?? lists[0];

  const voiceLine = h('p', { class: 'muted small' }, '소리를 확인하는 중…');
  void voiceStatus().then((status) => {
    voiceLine.textContent =
      status === 'ready'
        ? '이 기기에서 한국어 목소리로 읽어 줄 수 있어요.'
        : status === 'no-korean'
          ? '이 기기에는 한국어 목소리가 없어요. 선생님 목소리를 녹음하거나 「보여주기」로 연습할 수 있어요.'
          : '이 브라우저는 읽어주기를 지원하지 않아요. 녹음이나 「보여주기」를 써 주세요.';
    voiceLine.className = status === 'ready' ? 'muted small' : 'notice small';
  });

  const nameInput = h('input', {
    class: 'input',
    type: 'text',
    value: getWho(),
    placeholder: '예: 3번, 민준, 2-1반',
    maxlength: '20',
    oninput: (e: Event) => setWho((e.target as HTMLInputElement).value.trim()),
  });

  const cards = h(
    'div',
    { class: 'home-grid' },
    h(
      'button',
      {
        class: 'home-card primary',
        type: 'button',
        onclick: () => navigate(recent ? `#/run/${recent.id}?mode=practice` : '#/lists'),
      },
      h('span', { class: 'home-emoji' }, '✏️'),
      h('span', { class: 'home-title' }, '받아쓰기 연습'),
      h('span', { class: 'home-sub' }, recent ? recent.title : '먼저 급수표를 만들어요'),
    ),
    h(
      'button',
      { class: 'home-card', type: 'button', onclick: () => navigate('#/lists') },
      h('span', { class: 'home-emoji' }, '📋'),
      h('span', { class: 'home-title' }, '급수표'),
      h('span', { class: 'home-sub' }, `만들기 · 고치기 · 나눠 주기 (${lists.length}개)`),
    ),
    h(
      'button',
      {
        class: 'home-card',
        type: 'button',
        onclick: () => navigate(recent ? `#/board/${recent.id}` : '#/lists'),
      },
      h('span', { class: 'home-emoji' }, '🖥️'),
      h('span', { class: 'home-title' }, '칠판 모드'),
      h('span', { class: 'home-sub' }, '교실에서 다 함께 받아쓰기'),
    ),
    h(
      'button',
      { class: 'home-card', type: 'button', onclick: () => navigate('#/report') },
      h('span', { class: 'home-emoji' }, '📊'),
      h('span', { class: 'home-title' }, '내 기록'),
      h('span', { class: 'home-sub' }, '틀린 것 다시 쓰기 · 무엇을 자주 틀리나'),
    ),
  );

  const recentBox = lists.length
    ? h(
        'section',
        { class: 'card' },
        h('h2', {}, '최근 급수표'),
        h(
          'ul',
          { class: 'list' },
          ...lists.slice(0, 5).map((l) =>
            h(
              'li',
              { class: 'list-row' },
              h(
                'button',
                { class: 'list-main', type: 'button', onclick: () => navigate(`#/list/${l.id}`) },
                h('strong', {}, l.title),
                h('span', { class: 'muted small' }, `${l.level || '급수 없음'} · ${l.items.length}문항 · ${formatDate(l.updatedAt)}`),
              ),
              button('연습', () => navigate(`#/run/${l.id}?mode=practice`), 'btn small'),
              button('시험', () => navigate(`#/run/${l.id}?mode=exam`), 'btn small ghost'),
            ),
          ),
        ),
      )
    : h(
        'section',
        { class: 'card' },
        h('h2', {}, '처음이신가요?'),
        h('p', {}, '선생님이 나눠 준 급수표를 그대로 넣어 쓰면 됩니다. 붙여넣기 한 번이면 끝나요.'),
        h(
          'div',
          { class: 'row' },
          button('급수표 만들기', () => navigate('#/list/new'), 'btn'),
          button('예시 급수표 담기', () => navigate('#/lists?samples=1'), 'btn ghost'),
        ),
      );

  const el = h(
    'div',
    { class: 'view' },
    h(
      'section',
      { class: 'card hero' },
      h('h1', {}, '또박이'),
      h('p', { class: 'lead' }, '듣고, 또박또박 쓰고, 바로 확인해요.'),
      voiceLine,
      h('div', { class: 'field-inline' }, h('span', { class: 'field-label' }, '이 기기에서 쓸 이름'), nameInput),
      h('p', { class: 'muted small' }, '이름 대신 번호나 별명을 써도 됩니다. 쓴 내용은 이 기기에만 저장되고 어디로도 보내지 않아요.'),
    ),
    cards,
    recentBox,
  );

  return { el, title: '또박이 — 초등 받아쓰기' };
}
