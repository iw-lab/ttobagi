import { getList, getSettings, getWho, saveAttempt, setSettings } from '../engine/store';
import { grade, STRICTNESS_LABEL, type Strictness } from '../engine/grade';
import { initials } from '../engine/hangul';
import { playItem, stopAudio, unlockAudio, voiceStatus } from '../engine/speech';
import {
  newId,
  RUN_MODE_LABEL,
  type AnswerRecord,
  type Attempt,
  type Item,
  type RunMode,
  type RunSettings,
} from '../engine/types';
import { BlockInput } from '../ui/blocks';
import { WritingPad } from '../ui/writing';
import { button, fill, h, navigate, toast } from '../ui/dom';
import type { Params, View } from './view';

interface RunState {
  idx: number;
  answers: AnswerRecord[];
  startedAt: number;
  itemStart: number;
  listens: number;
}

export function runView(params: Params): View {
  const list = getList(params.id);
  const mode = (params.mode as RunMode) || 'practice';

  if (!list) {
    return {
      el: h(
        'div',
        { class: 'view' },
        h('section', { class: 'card' }, h('h1', {}, '급수표를 찾을 수 없어요'), button('목록으로', () => navigate('#/lists'), 'btn')),
      ),
    };
  }

  // 오답 다시 쓰기는 넘겨받은 문항만 푼다
  const onlyIds = params.items ? new Set(params.items.split(',')) : null;
  const items: Item[] = onlyIds ? list.items.filter((i) => onlyIds.has(i.id)) : list.items;

  if (!items.length) {
    return {
      el: h(
        'div',
        { class: 'view' },
        h('section', { class: 'card' }, h('h1', {}, '풀 문항이 없어요'), button('돌아가기', () => navigate(`#/list/${list.id}`), 'btn')),
      ),
    };
  }

  const settings: RunSettings = { ...getSettings() };
  if (mode === 'exam') settings.allowHint = false;

  const state: RunState = {
    idx: 0,
    answers: [],
    startedAt: Date.now(),
    itemStart: Date.now(),
    listens: 0,
  };

  let abort = new AbortController();
  let pad: WritingPad | null = null;
  let blocks: BlockInput | null = null;
  let keyboardInput: HTMLInputElement | null = null;
  let destroyed = false;

  const el = h('div', { class: 'view run-view' });
  const body = h('div', {});
  el.append(body);

  const currentItem = () => items[state.idx];

  const answerText = (): string => {
    if (settings.inputMode === 'keyboard') return keyboardInput?.value ?? '';
    if (settings.inputMode === 'blocks') return blocks?.value ?? '';
    return '';
  };

  async function playCurrent(): Promise<void> {
    const item = currentItem();
    unlockAudio();
    stopAudio();
    abort.abort();
    abort = new AbortController();
    state.listens++;
    const how = await playItem(item.id, item.text, {
      rate: settings.rate,
      times: settings.repeat,
      betweenMs: 900,
      readPunct: settings.readPunct,
      signal: abort.signal,
    });
    if (how === 'none' && !destroyed) {
      toast('읽어 줄 목소리가 없어요. 「보여주기」를 쓰거나 선생님이 읽어 주세요.', 'warn');
    }
  }

  function finish(): void {
    const attempt: Attempt = {
      id: newId('a'),
      listId: list!.id,
      listTitle: list!.title,
      who: getWho() || '나',
      mode,
      settings,
      answers: state.answers,
      startedAt: state.startedAt,
      finishedAt: Date.now(),
    };
    saveAttempt(attempt);
    navigate(`#/result/${attempt.id}`);
  }

  function commitAnswer(): AnswerRecord {
    const item = currentItem();
    const elapsed = Date.now() - state.itemStart;

    if (settings.inputMode === 'write') {
      const ink = pad?.toThumbnail() ?? '';
      return {
        itemId: item.id,
        text: '',
        ink: ink || undefined,
        // 손글씨는 사람이 보기 전까지 «판정 보류» — 자동으로 맞다고 하지 않는다
        verdict: 'wrong',
        tags: [],
        confirmed: false,
        elapsed,
      };
    }

    const text = answerText();
    const result = grade(item.text, text, { strictness: settings.strictness });
    return {
      itemId: item.id,
      text,
      verdict: result.verdict,
      tags: result.tags,
      confirmed: true,
      elapsed,
    };
  }

  function next(record: AnswerRecord): void {
    state.answers.push(record);
    if (state.idx >= items.length - 1) {
      finish();
      return;
    }
    state.idx++;
    state.itemStart = Date.now();
    state.listens = 0;
    render();
  }

  /* ───────── 화면 ───────── */

  function renderInput(item: Item): HTMLElement {
    const cellCount = Math.max(4, [...item.text].filter((c) => c.trim()).length + 2);

    if (settings.inputMode === 'write') {
      pad?.destroy();
      pad = new WritingPad({ cells: cellCount, height: 160 });
      return h(
        'div',
        { class: 'input-area' },
        pad.root,
        h(
          'div',
          { class: 'row' },
          button('↶ 되돌리기', () => pad?.undo(), 'btn ghost small'),
          button('지우기', () => pad?.clearInk(), 'btn ghost small'),
        ),
        h('p', { class: 'muted small' }, '연필이나 손가락으로 칸에 맞춰 또박또박 써 보세요.'),
      );
    }

    if (settings.inputMode === 'blocks') {
      blocks = new BlockInput({ answer: item.text });
      return h('div', { class: 'input-area' }, blocks.root);
    }

    keyboardInput = h('input', {
      class: 'input answer-input',
      type: 'text',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      placeholder: '들은 대로 써 보세요',
      onkeydown: (e: KeyboardEvent) => {
        if (e.key === 'Enter') submitBtn.click();
      },
    }) as HTMLInputElement;
    return h('div', { class: 'input-area' }, keyboardInput);
  }

  const submitBtn = h('button', { class: 'btn big', type: 'button' }, '확인') as HTMLButtonElement;

  function render(): void {
    const item = currentItem();
    body.replaceChildren();

    const progress = h(
      'div',
      { class: 'progress' },
      ...items.map((_, i) =>
        h('span', { class: `dot ${i < state.idx ? 'done' : i === state.idx ? 'now' : ''}` }),
      ),
    );

    const listenBtn = h(
      'button',
      { class: 'btn listen', type: 'button', onclick: () => void playCurrent() },
      '🔊 들려주세요',
    );

    const revealBox = h('div', { class: 'reveal', hidden: true });
    const visualBtn = h(
      'button',
      {
        class: 'btn ghost',
        type: 'button',
        onclick: () => {
          revealBox.textContent = item.text;
          revealBox.hidden = false;
          window.setTimeout(() => {
            revealBox.hidden = true;
          }, Math.max(1, settings.visualSeconds) * 1000);
        },
      },
      `👀 ${settings.visualSeconds}초 보여주기`,
    );

    const hintBox = h('div', { class: 'hint', hidden: true });
    const hintBtn = h(
      'button',
      {
        class: 'btn ghost',
        type: 'button',
        onclick: () => {
          hintBox.textContent = `첫소리: ${initials(item.text)}`;
          hintBox.hidden = false;
        },
      },
      '💡 첫소리 힌트',
    );

    const feedback = h('div', { class: 'feedback', hidden: true });

    submitBtn.textContent = state.idx === items.length - 1 ? '다 했어요' : '확인';
    submitBtn.onclick = () => {
      const record = commitAnswer();

      // 시험은 정답을 바로 보여 주지 않는다 — 먼저 낸 아이가 답을 알려 주는 일을 막는다
      if (mode === 'exam') {
        next(record);
        return;
      }

      if (settings.inputMode === 'write') {
        // 손글씨는 기계가 못 읽는다 → 정답을 보여 주고 스스로 맞춰 보게 한다
        feedback.replaceChildren(
          h('p', { class: 'answer-reveal' }, '정답: ', h('strong', {}, item.text)),
          h('p', { class: 'muted small' }, '내가 쓴 것과 견주어 보고 골라 주세요.'),
          h(
            'div',
            { class: 'row' },
            button('맞았어요', () => next({ ...record, verdict: 'correct', confirmed: true }), 'btn'),
            button('틀렸어요', () => next({ ...record, verdict: 'wrong', confirmed: true }), 'btn ghost'),
          ),
        );
        feedback.hidden = false;
        submitBtn.disabled = true;
        return;
      }

      const result = grade(item.text, record.text, { strictness: settings.strictness });
      fill(
        feedback,
        h(
          'p',
          { class: `verdict ${result.verdict}` },
          result.verdict === 'correct' ? '잘했어요! 정답이에요.' : result.verdict === 'partial' ? '아깝다! 한 글자만 달라요.' : '다시 볼까요?',
        ),
        h(
          'p',
          { class: 'answer-reveal' },
          '정답: ',
          ...result.marks.map((m) =>
            h('span', { class: `mark ${m.status}` }, m.expected),
          ),
        ),
        record.text ? h('p', { class: 'muted' }, `내가 쓴 것: ${record.text}`) : h('p', { class: 'muted' }, '쓴 것이 없어요.'),
        result.tags.length
          ? h('p', { class: 'tags' }, ...result.tags.map((t) => h('span', { class: 'tag' }, t)))
          : null,
        h('div', { class: 'row' }, button(state.idx === items.length - 1 ? '결과 보기' : '다음 문항', () => next(record), 'btn')),
      );
      feedback.hidden = false;
      submitBtn.disabled = true;
    };
    submitBtn.disabled = false;

    body.append(
      h(
        'section',
        { class: 'card run-card' },
        h(
          'div',
          { class: 'run-head' },
          h('span', { class: `badge ${mode}` }, RUN_MODE_LABEL[mode]),
          h('span', { class: 'muted' }, `${state.idx + 1} / ${items.length}`),
          h('button', { class: 'link', type: 'button', onclick: () => navigate(`#/list/${list!.id}`) }, '그만두기'),
        ),
        progress,
        h('h1', { class: 'run-title' }, `${state.idx + 1}번 문항`),
        item.point ? h('p', { class: 'muted small' }, `학습 포인트: ${item.point}`) : null,
        h(
          'div',
          { class: 'listen-row' },
          listenBtn,
          settings.visualMode ? visualBtn : null,
          mode !== 'exam' && settings.allowHint ? hintBtn : null,
        ),
        revealBox,
        hintBox,
        renderInput(item),
        h('div', { class: 'row center' }, submitBtn),
        feedback,
      ),
      settingsPanel(),
    );

    // 문항이 바뀌면 곧바로 한 번 읽어 준다 (첫 문항은 사용자가 누르게 둔다 — iOS 소리 정책)
    if (state.idx > 0) void playCurrent();
    else queueMicrotask(() => listenBtn.focus());
  }

  function settingsPanel(): HTMLElement {
    const modeSel = h(
      'select',
      {
        class: 'input',
        onchange: (e: Event) => {
          settings.inputMode = (e.target as HTMLSelectElement).value as RunSettings['inputMode'];
          setSettings({ inputMode: settings.inputMode });
          render();
        },
      },
      ...(['keyboard', 'write', 'blocks'] as const).map((m) =>
        h('option', { value: m, selected: settings.inputMode === m }, { keyboard: '자판으로 쓰기', write: '손으로 쓰기', blocks: '글자 블록' }[m]),
      ),
    );

    const rate = h('input', {
      class: 'input',
      type: 'range',
      min: '0.5',
      max: '1.2',
      step: '0.1',
      value: String(settings.rate),
      oninput: (e: Event) => {
        settings.rate = Number((e.target as HTMLInputElement).value);
        setSettings({ rate: settings.rate });
        rateLabel.textContent = `${settings.rate.toFixed(1)}배속`;
      },
    });
    const rateLabel = h('span', { class: 'muted small' }, `${settings.rate.toFixed(1)}배속`);

    const repeat = h('input', {
      class: 'input',
      type: 'number',
      min: '1',
      max: '3',
      value: String(settings.repeat),
      oninput: (e: Event) => {
        settings.repeat = Math.max(1, Math.min(3, Number((e.target as HTMLInputElement).value) || 1));
        setSettings({ repeat: settings.repeat });
      },
    });

    const strict = h(
      'select',
      {
        class: 'input',
        onchange: (e: Event) => {
          settings.strictness = (e.target as HTMLSelectElement).value as Strictness;
          setSettings({ strictness: settings.strictness });
        },
      },
      ...(['char', 'space', 'full'] as const).map((s) =>
        h('option', { value: s, selected: settings.strictness === s }, STRICTNESS_LABEL[s]),
      ),
    );

    const visual = h('input', {
      type: 'checkbox',
      checked: settings.visualMode,
      onchange: (e: Event) => {
        settings.visualMode = (e.target as HTMLInputElement).checked;
        setSettings({ visualMode: settings.visualMode });
        render();
      },
    });

    const hint = h('input', {
      type: 'checkbox',
      checked: settings.allowHint,
      onchange: (e: Event) => {
        settings.allowHint = (e.target as HTMLInputElement).checked;
        setSettings({ allowHint: settings.allowHint });
        render();
      },
    });

    return h(
      'details',
      { class: 'card settings-panel' },
      h('summary', {}, '읽기·채점 설정'),
      h('div', { class: 'settings-grid' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, '입력 방법'), modeSel),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, '읽어 주는 횟수'), repeat),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, '읽기 속도'), rate, rateLabel),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, '채점 기준'), strict),
        h('label', { class: 'field-inline' }, visual, h('span', {}, '보여주기 단추 (소리 대신 눈으로)')),
        mode !== 'exam' ? h('label', { class: 'field-inline' }, hint, h('span', {}, '첫소리 힌트 허용')) : null,
      ),
    );
  }

  void voiceStatus();
  render();

  return {
    el,
    title: `${list.title} — ${RUN_MODE_LABEL[mode]}`,
    destroy: () => {
      destroyed = true;
      abort.abort();
      stopAudio();
      pad?.destroy();
    },
  };
}
