import { decode, payloadToList, type Payload } from '../engine/share';
import { upsertList } from '../engine/store';
import { button, h, navigate, toast } from '../ui/dom';
import type { Params, View } from './view';

function extractCode(raw: string): string {
  const text = raw.trim();
  const m = text.match(/[?&]c=([^&\s]+)/);
  if (m) return m[1];
  return text;
}

export function openView(params: Params): View {
  const el = h('div', { class: 'view' });
  const result = h('div', {});

  const input = h('textarea', {
    class: 'input textarea',
    rows: 4,
    placeholder: '받은 링크나 공유 코드를 붙여넣으세요.',
  }) as HTMLTextAreaElement;

  // 코드를 연달아 열면 먼저 시작한 decode 가 늦게 끝나 최신 미리보기를 덮어쓸 수 있다.
  let generation = 0;

  async function show(code: string): Promise<void> {
    const mine = ++generation;
    result.replaceChildren(h('p', { class: 'muted' }, '여는 중…'));
    let payload: Payload;
    try {
      payload = await decode(extractCode(code));
    } catch (err) {
      if (mine !== generation) return;
      result.replaceChildren(
        h('p', { class: 'notice' }, err instanceof Error ? err.message : '코드를 열 수 없어요.'),
      );
      return;
    }

    if (mine !== generation) return;

    if (payload.t === 'l') {
      const list = payloadToList(payload);
      result.replaceChildren(
        h(
          'div',
          { class: 'preview' },
          h('h2', {}, list.title),
          h('p', { class: 'muted' }, `${list.level || '급수 없음'} · ${list.items.length}문항`),
          h('ol', { class: 'preview-list' }, ...list.items.map((i) => h('li', {}, i.text))),
          h(
            'div',
            { class: 'row' },
            button('내 기기에 담기', () => {
              upsertList(list);
              toast('담았어요');
              navigate(`#/list/${list.id}`);
            }, 'btn'),
            button('담고 바로 연습', () => {
              upsertList(list);
              navigate(`#/run/${list.id}?mode=practice`);
            }, 'btn ghost'),
          ),
        ),
      );
      return;
    }

    // 결과 코드 — 선생님이 아이 결과를 받아 볼 때
    const correct = payload.a.filter(([, , v]) => v === 1).length;
    const pending = payload.a.filter(([, , v]) => v === 3).length;
    result.replaceChildren(
      h(
        'div',
        { class: 'preview' },
        h('h2', {}, `${payload.w} · ${correct} / ${payload.a.length}`),
        h('p', { class: 'muted' }, payload.n),
        pending ? h('p', { class: 'notice' }, `${pending}개는 아직 채점 전이에요(손으로 쓴 답).`) : null,
        h(
          'ol',
          { class: 'preview-list' },
          ...payload.a.map(([q, ans, v]) =>
            h('li', { class: v === 1 ? 'ok' : v === 3 ? '' : 'no' },
              h('span', { class: 'result-icon' }, v === 1 ? '○' : v === 2 ? '△' : v === 3 ? '?' : '×'),
              h('span', {}, q),
              ans ? h('span', { class: 'muted small' }, ` (쓴 것: ${ans})`) : null,
            ),
          ),
        ),
        h('p', { class: 'muted small' }, '이 결과는 이 기기에 저장하지 않습니다. 필요하면 화면을 인쇄하거나 사진으로 남겨 주세요.'),
        button('인쇄', () => window.print(), 'btn ghost'),
      ),
    );
  }

  el.append(
    h(
      'section',
      { class: 'card' },
      h('h1', {}, '공유 코드 열기'),
      h('p', { class: 'muted' }, '선생님이 보낸 링크를 그대로 붙여넣으면 급수표가 담깁니다. 인터넷 어디에도 올라가지 않아요.'),
      input,
      h('div', { class: 'row' }, button('열기', () => void show(input.value), 'btn'), button('취소', () => navigate('#/lists'), 'btn ghost')),
      result,
    ),
  );

  if (params.c) void show(params.c);

  return { el, title: '공유 코드 열기 — 또박이' };
}
