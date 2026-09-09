/**
 * 급수표 고르기 — 학년·학기·급을 눌러 바로 시작한다.
 *
 * 교사가 아무것도 만들지 않아도 오늘 수업이 되어야 한다는 것이 이 화면의 목적이다.
 * 담기 없이 곧바로 «연습 / 시험 / 칠판»으로 갈 수 있고, 고치고 싶으면 담아서 고친다.
 */

import { bySemester, sheetsOf, SUBJECT_LABEL, toWordList, type LevelSheet, type Subject } from '../engine/curriculum';
import { upsertList } from '../engine/store';
import { newId } from '../engine/types';
import { button, h, navigate, toast } from '../ui/dom';
import type { Params, View } from './view';

/**
 * 내장 급수표는 «저장하지 않고» 그대로 쓴다. id 만 넘기면 앱이 그때그때 만들어 준다.
 *
 * 🔴 예전에는 여기서 저장소에 한 벌 복사해 두었다. 그런데 앱의 문항을 고쳐도 그 사본은
 * 옛 내용 그대로 남았고, 음원 경로는 같아서 «새 문장을 들려주고 옛 낱말로 채점»하는
 * 사고가 났다(2026-09-07). 사본을 만들지 않으면 낡을 것도 없다.
 */
function useId(sheet: LevelSheet): string {
  return `c-${sheet.id}`;
}

/** 담기 = 고쳐 쓸 수 있는 «내 급수표»로 복사한다. 새 id 라 내장본과 섞이지 않는다. */
function copyToMine(sheet: LevelSheet): void {
  const base = toWordList(sheet);
  upsertList({
    ...base,
    id: newId('l'),
    title: `${base.title} (내 사본)`,
    items: base.items.map((i) => ({ ...i, id: newId('i') })),
  });
}

export function curriculumView(params: Params): View {
  let subject: Subject = params.subject === 'en' ? 'en' : 'ko';
  // 국어는 1학년 2학기부터, 영어는 3학년 1학기부터 시작한다.
  const firstOpen = (s: Subject): string =>
    s === 'en' ? `3-1` : `${params.grade ? Number(params.grade) : 2}-${params.semester ?? 1}`;
  let openKey = firstOpen(subject);

  const el = h('div', { class: 'view' });

  function render(): void {
    const groups = bySemester(subject);
    const hasEnglish = sheetsOf('en').length > 0;
    el.replaceChildren(
      h(
        'section',
        { class: 'card' },
        h('h1', {}, '급수표'),
        // 영어 급수표가 아직 하나도 없으면 «고를 것이 없는 고르개»를 보여 주지 않는다.
        hasEnglish
          ? h(
              'div',
              { class: 'subject-tabs', role: 'tablist', 'aria-label': '과목' },
              ...(['ko', 'en'] as const).map((k) =>
                h(
                  'button',
                  {
                    class: `subject-tab${subject === k ? ' on' : ''}`,
                    type: 'button',
                    role: 'tab',
                    'aria-selected': String(subject === k),
                    onclick: () => {
                      if (subject === k) return;
                      subject = k;
                      openKey = firstOpen(k);
                      render();
                    },
                  },
                  SUBJECT_LABEL[k],
                ),
              ),
            )
          : null,
        h('p', { class: 'muted' }, '학년과 학기를 고르면 급수표가 나옵니다. 만들지 않아도 바로 쓸 수 있어요.'),
        h('p', { class: 'muted small' }, subject === 'en'
          ? '영어는 원어민이 읽어 주는 소리가 들어 있고, 손글씨 칸은 영어 공책처럼 네 줄로 나옵니다.'
          : '문항마다 또박또박 읽어 주는 소리가 이미 들어 있습니다 — 인터넷이 끊겨도 한 번 연 급수표는 그대로 들려요.'),
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
                      button('연습', () => navigate(`#/run/${useId(sheet)}?mode=practice`), 'btn small'),
                      button('시험', () => navigate(`#/run/${useId(sheet)}?mode=exam`), 'btn small ghost'),
                      button('칠판', () => navigate(`#/board/${useId(sheet)}`), 'btn small ghost'),
                      button('인쇄', () => navigate(`#/print/${useId(sheet)}`), 'btn small ghost'),
                      button('담기', () => {
                        copyToMine(sheet);
                        toast('내 급수표로 복사했어요. 마음대로 고쳐 쓰세요.');
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
