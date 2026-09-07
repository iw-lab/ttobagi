/**
 * 인쇄물 — 급수표·따라쓰기·연습 시험지·본 시험지·오답 연습지.
 * 브라우저 인쇄 기능을 그대로 쓴다(«PDF로 저장»도 여기서 된다). 별도 도구도, 비용도 없다.
 */

import { getAttempts, getList } from '../engine/store';
import { isCorrect } from '../engine/grade';
import { button, h, navigate } from '../ui/dom';
import type { Params, View } from './view';

type Sheet = 'table' | 'trace' | 'practice' | 'test' | 'wrong';

const SHEET_LABEL: Record<Sheet, string> = {
  table: '급수표',
  trace: '따라 쓰기',
  practice: '연습 시험지',
  test: '시험지',
  wrong: '오답 연습지',
};

/** 글자 칸 — 공백도 한 칸으로 둬야 띄어쓰기를 배운다 */
function cells(text: string, mode: 'empty' | 'trace' | 'filled'): HTMLElement {
  const chars = [...text];
  return h(
    'div',
    { class: 'sheet-cells' },
    ...chars.map((c) =>
      h('span', { class: `sheet-cell ${c.trim() === '' ? 'space' : ''}` }, mode === 'empty' ? '' : mode === 'trace' ? h('span', { class: 'trace-char' }, c) : c),
    ),
  );
}

export function printView(params: Params): View {
  const list = getList(params.id);
  if (!list) {
    return {
      el: h('div', { class: 'view' }, h('section', { class: 'card' }, h('h1', {}, '급수표를 찾을 수 없어요'), button('목록으로', () => navigate('#/lists'), 'btn'))),
    };
  }

  let sheet: Sheet = 'test';
  const paper = h('div', { class: 'paper' });

  function wrongItems(): string[] {
    const wrong = new Set<string>();
    for (const a of getAttempts(list!.id)) {
      for (const ans of a.answers) if (!isCorrect(ans.verdict)) wrong.add(ans.itemId);
    }
    return list!.items.filter((i) => wrong.has(i.id)).map((i) => i.text);
  }

  function renderPaper(): void {
    paper.replaceChildren();
    const head = h(
      'header',
      { class: 'paper-head' },
      h('h1', {}, `${list!.title}${list!.level ? ` · ${list!.level}` : ''}`),
      h('p', { class: 'paper-sub' }, `${SHEET_LABEL[sheet]}`),
      sheet === 'test' || sheet === 'practice'
        ? h('div', { class: 'paper-meta' }, h('span', {}, '이름 ____________'), h('span', {}, '날짜 ____ / ____'), h('span', {}, '점수 ______'))
        : null,
    );
    paper.append(head);

    const texts = sheet === 'wrong' ? wrongItems() : list!.items.map((i) => i.text);

    if (!texts.length) {
      paper.append(h('p', { class: 'muted' }, '인쇄할 내용이 없어요. (오답 연습지는 틀린 문항이 있어야 만들어집니다.)'));
      return;
    }

    if (sheet === 'table') {
      paper.append(
        h(
          'ol',
          { class: 'paper-table' },
          ...texts.map((t) => h('li', {}, t)),
        ),
        h('p', { class: 'paper-note' }, '집에서 소리 내어 읽고, 한 번씩 써 보세요.'),
      );
      return;
    }

    paper.append(
      h(
        'ol',
        { class: 'paper-items' },
        ...texts.map((t) =>
          h(
            'li',
            { class: 'paper-item' },
            sheet === 'trace' ? cells(t, 'trace') : cells(t, 'empty'),
            sheet === 'wrong' ? h('div', { class: 'paper-repeat' }, cells(t, 'empty'), cells(t, 'empty')) : null,
          ),
        ),
      ),
    );
    if (sheet === 'wrong') paper.append(h('p', { class: 'paper-note' }, '틀린 문항을 세 번씩 바르게 써 보세요.'));
  }

  const chooser = h(
    'div',
    { class: 'row no-print' },
    ...(Object.keys(SHEET_LABEL) as Sheet[]).map((s) =>
      button(SHEET_LABEL[s], () => {
        sheet = s;
        renderPaper();
        for (const b of chooser.querySelectorAll('button')) b.classList.remove('active');
        (chooser.querySelector(`[data-sheet="${s}"]`) as HTMLElement | null)?.classList.add('active');
      }, `btn ghost small${sheet === s ? ' active' : ''}`),
    ),
  );
  chooser.querySelectorAll('button').forEach((b, i) => {
    b.dataset.sheet = (Object.keys(SHEET_LABEL) as Sheet[])[i];
  });

  renderPaper();

  const el = h(
    'div',
    { class: 'view print-view' },
    h(
      'section',
      { class: 'card no-print' },
      h('h1', {}, '인쇄물 만들기'),
      h('p', { class: 'muted' }, '고른 다음 「인쇄」를 누르세요. 인쇄 창에서 「PDF로 저장」을 고르면 파일로도 남습니다.'),
      chooser,
      h('div', { class: 'row' }, button('인쇄', () => window.print(), 'btn'), button('돌아가기', () => navigate(`#/list/${list.id}`), 'btn ghost')),
    ),
    paper,
  );

  return { el, title: `${list.title} 인쇄 — 또박이` };
}
