import { getLastListId, getLists, getWho, setWho } from '../engine/store';
import { sheetsOf } from '../engine/curriculum';
import { voiceStatus } from '../engine/speech';
import { button, formatDate, h, navigate } from '../ui/dom';
import type { View } from './view';

/**
 * 지금 들어 있는 문항을 그때그때 센다.
 *
 * 🔴 「국어 537급」이라고 쓰면 안 된다. 급수는 **학기마다 1급부터 다시 시작**하므로
 * 537급이라는 급수는 화면 어디에도 없다 — 학기별 번호를 전부 더한 값을 하나의
 * 눈금인 양 내보인 것이다(2026-09-10 사용자가 「이게 뭐야?」라고 물었다).
 * 선생님이 바로 알아듣는 단위는 «문항»이다.
 */
function sheetCounts(): string {
  const items = (s: 'ko' | 'en'): string =>
    (sheetsOf(s).reduce((n, sheet) => n + sheet.items.length, 0)).toLocaleString('ko-KR');
  return sheetsOf('en').length
    ? `국어 ${items('ko')}문항 · 영어 ${items('en')}문항 · 소리까지 들어 있어요`
    : `1~6학년 ${items('ko')}문항 · 소리까지 들어 있어요`;
}

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
        onclick: () => navigate(recent ? `#/run/${recent.id}?mode=practice` : '#/curriculum'),
      },
      h('span', { class: 'home-emoji' }, '✏️'),
      h('span', { class: 'home-title' }, '받아쓰기 연습'),
      h('span', { class: 'home-sub' }, recent ? recent.title : '학년을 고르면 바로 시작해요'),
    ),
    h(
      'button',
      { class: 'home-card', type: 'button', onclick: () => navigate('#/curriculum') },
      h('span', { class: 'home-emoji' }, '📋'),
      h('span', { class: 'home-title' }, '학년별 급수표'),
      // 🔴 숫자를 글로 박지 않는다 — 급수를 늘렸는데 첫 화면만 「82급」으로 남아 있었다.
      h('span', { class: 'home-sub' }, sheetCounts()),
    ),
    h(
      'button',
      {
        class: 'home-card',
        type: 'button',
        onclick: () => navigate(recent ? `#/board/${recent.id}` : '#/curriculum'),
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
        h('p', {}, '만들 것 없습니다. 학년과 학기만 고르면 급수표도 소리도 이미 들어 있어요.'),
        h(
          'div',
          { class: 'row' },
          button('학년별 급수표 보기', () => navigate('#/curriculum'), 'btn'),
          button('우리 반 급수표 만들기', () => navigate('#/list/new'), 'btn ghost'),
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
