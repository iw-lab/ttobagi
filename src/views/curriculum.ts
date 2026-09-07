/**
 * 급수표 고르기 — 학년·학기·급을 눌러 바로 시작한다.
 *
 * 교사가 아무것도 만들지 않아도 오늘 수업이 되어야 한다는 것이 이 화면의 목적이다.
 * 담기 없이 곧바로 «연습 / 시험 / 칠판»으로 갈 수 있고, 고치고 싶으면 담아서 고친다.
 */

import { bySemester, toWordList, type LevelSheet } from '../engine/curriculum';
import { getLists, upsertList } from '../engine/store';
import { button, h, navigate, toast } from '../ui/dom';
import type { Params, View } from './view';

/** 내장 급수표를 저장소에 올려 두고(있으면 그대로) id 를 돌려준다 */
function ensureSaved(sheet: LevelSheet): string {
  const list = toWordList(sheet);
  const existing = getLists().find((l) => l.id === list.id);
  if (!existing) upsertList(list);
  return list.id;
}

export function curriculumView(params: Params): View {
  const groups = bySemester();
  const initial = params.grade ? Number(params.grade) : 2;
  let openKey = `${initial}-${params.semester ?? 1}`;

  const el = h('div', { class: 'view' });

  function render(): void {
    el.replaceChildren(
      h(
        'section',
        { class: 'card' },
        h('h1', {}, '급수표'),
        h('p', { class: 'muted' }, '학년과 학기를 고르면 급수표가 나옵니다. 만들지 않아도 바로 쓸 수 있어요.'),
        h('p', { class: 'muted small' }, '문항마다 또박또박 읽어 주는 소리가 이미 들어 있습니다 — 인터넷이 끊겨도 한 번 연 급수표는 그대로 들려요.'),
      ),
      ...groups.map((g) => {
        const key = `${g.grade}-${g.semester}`;
        const open = key === openKey;
        return h(
          'section',
          { class: 'card' },
          h(
            'button',
            {
              class: `semester-head${open ? ' open' : ''}`,
              type: 'button',
              onclick: () => {
                openKey = open ? '' : key;
                render();
              },
            },
            h('span', {}, `${g.grade}학년 ${g.semester}학기`),
            h('span', { class: 'muted small' }, `${g.sheets.length}급 · ${g.sheets.length * 10}문항`),
          ),
          open
            ? h(
                'ul',
                { class: 'level-list' },
                ...g.sheets.map((sheet) =>
                  h(
                    'li',
                    { class: 'level-row' },
                    h(
                      'div',
                      { class: 'level-info' },
                      h('strong', {}, `${sheet.level}급 · ${sheet.title}`),
                      h('span', { class: 'muted small' }, `${sheet.point} · ${sheet.items.length}문항`),
                      h('span', { class: 'muted small preview-line' }, sheet.items.slice(0, 3).join(' / ') + ' …'),
                    ),
                    h(
                      'div',
                      { class: 'level-actions' },
                      button('연습', () => navigate(`#/run/${ensureSaved(sheet)}?mode=practice`), 'btn small'),
                      button('시험', () => navigate(`#/run/${ensureSaved(sheet)}?mode=exam`), 'btn small ghost'),
                      button('칠판', () => navigate(`#/board/${ensureSaved(sheet)}`), 'btn small ghost'),
                      button('인쇄', () => navigate(`#/print/${ensureSaved(sheet)}`), 'btn small ghost'),
                      button('담기', () => {
                        ensureSaved(sheet);
                        toast('내 급수표에 담았어요. 고쳐서 쓸 수 있어요.');
                        navigate('#/lists');
                      }, 'btn small ghost'),
                    ),
                  ),
                ),
              )
            : null,
        );
      }),
      h(
        'section',
        { class: 'card' },
        h('p', { class: 'muted small' }, '학교 급수표와 다르면 「담기」로 가져와 고치면 됩니다. 고친 급수표는 이 기기에만 저장됩니다.'),
        button('내가 만든 급수표', () => navigate('#/lists'), 'btn ghost'),
      ),
    );
  }

  render();
  return { el, title: '급수표 — 또박이' };
}
