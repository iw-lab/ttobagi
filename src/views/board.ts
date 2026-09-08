/**
 * 칠판 모드 — 교실 전자칠판에 띄우는 진행 화면.
 *
 * 교사는 칠판 앞에 서서 진행하는데 학생 상황도 봐야 한다. 그래서 같은 브라우저의 다른 창을
 * **리모컨**으로 쓸 수 있게 했다(BroadcastChannel). 노트북에서 누르면 칠판이 따라 움직인다.
 * 서버가 없으므로 같은 기기의 창끼리만 이어진다 — 교실 한 대로 진행하는 실제 쓰임에는 맞는다.
 */

import { getList, getSettings, setSettings } from '../engine/store';
import { playItem, stopAudio, unlockAudio } from '../engine/speech';
import type { RunSettings } from '../engine/types';
import { button, h, navigate, toast } from '../ui/dom';
import type { Params, View } from './view';

const CHANNEL = 'ttobagi-board';

type BoardMsg =
  | { cmd: 'play' | 'next' | 'prev' | 'reveal' | 'hide' }
  | { cmd: 'goto'; idx: number }
  | { cmd: 'state'; idx: number; revealed: boolean; total: number; title: string };

export function boardView(params: Params): View {
  const list = getList(params.id);
  const isRemote = params.role === 'remote';

  if (!list) {
    return {
      el: h('div', { class: 'view' }, h('section', { class: 'card' }, h('h1', {}, '급수표를 찾을 수 없어요'), button('목록으로', () => navigate('#/lists'), 'btn'))),
    };
  }

  const settings: RunSettings = { ...getSettings() };
  let idx = 0;
  let revealed = false;
  let timer: number | undefined;
  let auto = false;
  let abort = new AbortController();

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
  } catch {
    channel = null; // 아주 오래된 브라우저 — 리모컨만 못 쓸 뿐 진행은 된다
  }

  const el = h('div', { class: isRemote ? 'view' : 'board' });

  const post = (msg: BoardMsg) => channel?.postMessage(msg);

  /* ───────── 칠판(표시) 화면 ───────── */

  async function play(): Promise<void> {
    stopAudio();
    unlockAudio();
    abort.abort();
    abort = new AbortController();
    const item = list!.items[idx];
    const how = await playItem(item.id, item.text, {
      audio: item.audio,
      rate: settings.rate,
      times: settings.repeat,
      betweenMs: 900,
      readPunct: settings.readPunct,
      signal: abort.signal,
    });
    if (how === 'none') toast('읽어 줄 목소리가 없어요. 선생님이 읽어 주세요.', 'warn');
  }

  function go(next: number): void {
    idx = Math.max(0, Math.min(list!.items.length - 1, next));
    revealed = false;
    render();
    void play();
  }

  /**
   * 자동 진행은 «읽기가 끝난 다음부터» 간격을 센다.
   * 예전에는 고정 시간마다 다음 문항으로 넘겼다. 「3번 읽기 · 8초 간격」처럼
   * 읽는 데 걸리는 시간이 간격보다 길면, 세 번째 읽기 도중에 다음 문항이 시작돼
   * 말이 잘렸다(실제 교실에서 그렇게 나왔다 — 2026-09-08).
   */
  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      timer = window.setTimeout(() => {
        timer = undefined;
        resolve();
      }, ms);
    });
  }

  function startAuto(): void {
    stopAuto();
    auto = true;
    toast(`다 읽어 준 뒤 ${settings.gap}초씩 기다려요`);
    void (async () => {
      while (auto) {
        await play();            // 읽어 주기가 끝날 때까지 기다린다
        if (!auto) return;
        await wait(settings.gap * 1000); // 아이가 쓰는 시간
        if (!auto) return;
        if (idx >= list!.items.length - 1) {
          stopAuto();
          render();
          return;
        }
        idx += 1;
        revealed = false;
        render();
      }
    })();
  }

  function stopAuto(): void {
    auto = false;
    if (timer) window.clearTimeout(timer);
    timer = undefined;
  }

  function renderBoard(): void {
    el.replaceChildren();
    const item = list!.items[idx];

    el.append(
      h(
        'div',
        { class: 'board-top' },
        h('span', { class: 'board-title' }, `${list!.title}${list!.level ? ` · ${list!.level}` : ''}`),
        h('span', { class: 'board-count' }, `${idx + 1} / ${list!.items.length}`),
        h(
          'div',
          { class: 'row' },
          button('전체 화면', () => {
            const target = document.documentElement;
            if (document.fullscreenElement) void document.exitFullscreen();
            else void target.requestFullscreen?.().catch(() => toast('전체 화면을 쓸 수 없어요', 'warn'));
          }, 'btn ghost small'),
          button('나가기', () => navigate(`#/list/${list!.id}`), 'btn ghost small'),
        ),
      ),
      h(
        'div',
        { class: `board-main${revealed ? ' revealed' : ''}` },
        h('div', { class: 'board-number' }, `${idx + 1}번`),
        revealed
          ? h('div', { class: 'board-answer' }, item.text)
          : h('div', { class: 'board-hidden' }, '잘 듣고 또박또박 쓰세요'),
        item.point && revealed ? h('div', { class: 'board-point' }, item.point) : null,
      ),
      h(
        'div',
        { class: 'board-controls' },
        button('◀ 앞', () => go(idx - 1), 'btn big ghost'),
        button('🔊 읽어 주기', () => void play(), 'btn big'),
        button(revealed ? '정답 감추기' : '정답 보여주기', () => {
          revealed = !revealed;
          render();
        }, 'btn big ghost'),
        button(auto ? '자동 멈춤' : '자동 진행', () => {
          if (auto) stopAuto();
          else startAuto();
          render();
        }, 'btn big ghost'),
        button('뒤 ▶', () => go(idx + 1), 'btn big ghost'),
      ),
      h(
        'div',
        { class: 'board-settings' },
        h('label', {}, '읽기 ',
          h('select', {
            class: 'input inline',
            onchange: (e: Event) => {
              settings.repeat = Number((e.target as HTMLSelectElement).value);
              setSettings({ repeat: settings.repeat });
            },
          }, ...[1, 2, 3].map((n) => h('option', { value: String(n), selected: settings.repeat === n }, `${n}번`))),
        ),
        h('label', {}, ' 간격 ',
          h('select', {
            class: 'input inline',
            onchange: (e: Event) => {
              settings.gap = Number((e.target as HTMLSelectElement).value);
              setSettings({ gap: settings.gap });
            },
          }, ...[5, 8, 10, 15, 20].map((n) => h('option', { value: String(n), selected: settings.gap === n }, `${n}초`))),
        ),
        h('label', {}, ' 속도 ',
          h('select', {
            class: 'input inline',
            onchange: (e: Event) => {
              settings.rate = Number((e.target as HTMLSelectElement).value);
              setSettings({ rate: settings.rate });
            },
          }, ...[0.7, 0.8, 0.9, 1].map((n) => h('option', { value: String(n), selected: Math.abs(settings.rate - n) < 0.01 }, `${n}배`))),
        ),
        h('label', { class: 'field-inline' },
          h('input', {
            type: 'checkbox',
            checked: settings.readPunct,
            onchange: (e: Event) => {
              settings.readPunct = (e.target as HTMLInputElement).checked;
              setSettings({ readPunct: settings.readPunct });
            },
          }),
          h('span', {}, '문장부호 읽기'),
        ),
        h('span', { class: 'muted small' }, '스페이스=읽기 · ←→=이동 · 다른 창에서 #/board/…?role=remote 로 리모컨'),
      ),
    );

    post({ cmd: 'state', idx, revealed, total: list!.items.length, title: list!.title });
  }

  /* ───────── 리모컨 화면 ───────── */

  let mirrorIdx = 0;
  let mirrorTotal = list.items.length;
  let mirrorRevealed = false;
  let mirrorTitle = list.title;

  function renderRemote(): void {
    el.replaceChildren(
      h(
        'section',
        { class: 'card' },
        h('h1', {}, '리모컨'),
        h('p', { class: 'muted small' }, mirrorTitle),
        h('p', { class: 'muted' }, '같은 컴퓨터의 칠판 창을 움직입니다. 칠판 창을 먼저 열어 두세요.'),
        h('p', { class: 'big-count' }, `${mirrorIdx + 1} / ${mirrorTotal}`),
        h('p', { class: 'muted' }, list!.items[mirrorIdx]?.text ?? ''),
        h(
          'div',
          { class: 'row' },
          button('◀ 앞', () => post({ cmd: 'prev' }), 'btn big ghost'),
          button('🔊 읽기', () => post({ cmd: 'play' }), 'btn big'),
            button(mirrorRevealed ? '정답 감추기' : '정답', () => post({ cmd: 'reveal' }), 'btn big ghost'),
          button('뒤 ▶', () => post({ cmd: 'next' }), 'btn big ghost'),
        ),
        button('칠판 창 열기', () => window.open(`${location.pathname}#/board/${list!.id}`, '_blank'), 'btn ghost'),
      ),
    );
  }

  const render = () => (isRemote ? renderRemote() : renderBoard());

  const onMessage = (e: MessageEvent<BoardMsg>) => {
    const msg = e.data;
    if (isRemote) {
      if (msg.cmd === 'state') {
        mirrorIdx = msg.idx;
        mirrorTotal = msg.total;
        mirrorRevealed = msg.revealed;
        mirrorTitle = msg.title;
        renderRemote();
      }
      return;
    }
    switch (msg.cmd) {
      case 'play': void play(); break;
      case 'next': go(idx + 1); break;
      case 'prev': go(idx - 1); break;
      case 'reveal': revealed = !revealed; render(); break;
      case 'hide': revealed = false; render(); break;
      case 'goto': go(msg.idx); break;
    }
  };
  channel?.addEventListener('message', onMessage);

  const onKey = (e: KeyboardEvent) => {
    if (isRemote) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === ' ') { e.preventDefault(); void play(); }
    else if (e.key === 'ArrowRight') go(idx + 1);
    else if (e.key === 'ArrowLeft') go(idx - 1);
    else if (e.key === 'Enter') { revealed = !revealed; render(); }
  };
  window.addEventListener('keydown', onKey);

  render();

  return {
    el,
    title: `${list.title} — ${isRemote ? '리모컨' : '칠판 모드'}`,
    destroy: () => {
      stopAuto();
      abort.abort();
      stopAudio();
      window.removeEventListener('keydown', onKey);
      channel?.removeEventListener('message', onMessage);
      channel?.close();
    },
  };
}
