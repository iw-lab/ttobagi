import { deleteList, getList, upsertList } from '../engine/store';
import { newId, type Item, type WordList } from '../engine/types';
import {
  canRecord,
  getRecording,
  playItem,
  removeRecording,
  saveRecording,
  startRecording,
  stopAudio,
  type Recorder,
} from '../engine/speech';
import { copyText, encodeList, qrSvg, shareUrl } from '../engine/share';
import { button, confirmBox, field, h, navigate, toast } from '../ui/dom';
import type { Params, View } from './view';

function parseBulk(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*\d+\s*[.)]\s*/, '').trim())
    .filter((line) => line.length > 0);
}

export function listEditView(params: Params): View {
  const isNew = params.id === 'new';
  const existing = isNew ? undefined : getList(params.id);

  if (!isNew && !existing) {
    return {
      el: h(
        'div',
        { class: 'view' },
        h('section', { class: 'card' }, h('h1', {}, '급수표를 찾을 수 없어요'), button('목록으로', () => navigate('#/lists'), 'btn')),
      ),
    };
  }

  const draft: WordList = existing
    ? { ...existing, items: existing.items.map((i) => ({ ...i })) }
    : {
        id: newId('l'),
        title: '',
        level: '',
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

  let recorder: Recorder | null = null;
  let recordingItemId: string | null = null;

  const titleInput = h('input', { class: 'input', type: 'text', value: draft.title, placeholder: '예: 2학년 1학기 받아쓰기' });
  const levelInput = h('input', { class: 'input', type: 'text', value: draft.level, placeholder: '예: 3급' });
  const bulk = h('textarea', {
    class: 'input textarea',
    rows: 10,
    placeholder: '한 줄에 한 문항씩 붙여넣으세요.\n\n나는 학교에 갑니다.\n오늘 날씨가 참 맑다.\n꽃잎이 바람에 날린다.',
  }) as HTMLTextAreaElement;
  bulk.value = draft.items.map((i) => i.text).join('\n');

  const itemsBox = h('div', { class: 'items' });
  const shareBox = h('div', { class: 'share-box' });

  const syncFromBulk = () => {
    const texts = parseBulk(bulk.value);
    const byText = new Map(draft.items.map((i) => [i.text, i]));
    draft.items = texts.map((t) => byText.get(t) ?? { id: newId('i'), text: t });
    renderItems();
  };

  function renderItems(): void {
    itemsBox.replaceChildren();
    if (!draft.items.length) {
      itemsBox.append(h('p', { class: 'muted' }, '아직 문항이 없어요. 위 칸에 붙여넣으면 여기에 나타납니다.'));
      return;
    }
    draft.items.forEach((item, idx) => {
      itemsBox.append(itemRow(item, idx));
    });
  }

  function itemRow(item: Item, idx: number): HTMLElement {
    const status = h('span', { class: 'muted small' }, '');
    const recBtn = h('button', { class: 'btn small ghost', type: 'button' }, '🎙 녹음') as HTMLButtonElement;
    const playBtn = h('button', { class: 'btn small ghost', type: 'button' }, '▶ 듣기') as HTMLButtonElement;
    const delRecBtn = h('button', { class: 'btn small ghost', type: 'button', hidden: true }, '녹음 지우기') as HTMLButtonElement;

    const refreshRec = () => {
      void getRecording(item.id).then((blob) => {
        const has = !!blob;
        status.textContent = has ? '선생님 목소리 있음' : '';
        delRecBtn.hidden = !has;
        recBtn.textContent = has ? '🎙 다시 녹음' : '🎙 녹음';
      });
    };
    refreshRec();

    recBtn.onclick = async () => {
      if (recordingItemId === item.id && recorder) {
        const blob = await recorder.stop();
        recorder = null;
        recordingItemId = null;
        recBtn.classList.remove('recording');
        if (blob.size > 0) {
          await saveRecording(item.id, blob);
          toast('녹음했어요');
        }
        refreshRec();
        return;
      }
      if (!canRecord()) {
        toast('이 브라우저에서는 녹음을 쓸 수 없어요', 'warn');
        return;
      }
      try {
        recorder = await startRecording();
        recordingItemId = item.id;
        recBtn.classList.add('recording');
        recBtn.textContent = '⏹ 멈추기';
      } catch {
        toast('마이크를 쓸 수 없어요. 권한을 확인해 주세요.', 'warn');
      }
    };

    playBtn.onclick = async () => {
      stopAudio();
      const how = await playItem(item.id, item.text, { rate: 0.9, times: 1 });
      if (how === 'none') toast('읽어 줄 목소리가 없어요. 녹음을 해 보세요.', 'warn');
    };

    delRecBtn.onclick = async () => {
      await removeRecording(item.id);
      toast('녹음을 지웠어요');
      refreshRec();
    };

    const textInput = h('input', {
      class: 'input',
      type: 'text',
      value: item.text,
      oninput: (e: Event) => {
        item.text = (e.target as HTMLInputElement).value;
        bulk.value = draft.items.map((i) => i.text).join('\n');
      },
    });

    const pointInput = h('input', {
      class: 'input small-input',
      type: 'text',
      value: item.point ?? '',
      placeholder: '학습 포인트(예: 겹받침)',
      oninput: (e: Event) => {
        const v = (e.target as HTMLInputElement).value.trim();
        item.point = v || undefined;
      },
    });

    return h(
      'div',
      { class: 'item-row' },
      h('span', { class: 'item-no' }, String(idx + 1)),
      h('div', { class: 'item-fields' }, textInput, pointInput),
      h('div', { class: 'item-actions' }, playBtn, recBtn, delRecBtn, status),
    );
  }

  async function renderShare(): Promise<void> {
    shareBox.replaceChildren();
    if (!draft.items.length) {
      shareBox.append(h('p', { class: 'muted' }, '문항을 넣고 저장하면 나눠 줄 링크와 QR이 만들어져요.'));
      return;
    }
    const code = await encodeList(draft);
    const url = shareUrl(code);
    const svg = url.length <= 1800 ? qrSvg(url, 4) : null;

    shareBox.append(
      h('p', { class: 'muted' }, '이 링크 안에 급수표가 통째로 들어 있어요. 서버에 올라가지 않으니 아이 정보가 새어 나갈 곳이 없습니다.'),
      svg
        ? h('div', { class: 'qr', html: svg })
        : h('p', { class: 'notice' }, '문항이 많아 QR로는 담기 어려워요. 아래 링크를 복사해서 보내 주세요.'),
      h('div', { class: 'row' },
        button('링크 복사', async () => {
          toast((await copyText(url)) ? '링크를 복사했어요' : '복사가 안 돼요. 아래 주소를 길게 눌러 복사하세요.', 'ok');
        }, 'btn'),
        button('QR 인쇄', () => window.print(), 'btn ghost'),
      ),
      h('textarea', { class: 'input textarea share-url', rows: 3, readonly: 'readonly', onclick: (e: Event) => (e.target as HTMLTextAreaElement).select() }, url),
      h('p', { class: 'muted small' }, `주소 길이 ${url.length}자. 녹음한 목소리는 링크에 담기지 않아요(기기에만 있습니다).`),
    );
  }

  const save = (): boolean => {
    syncFromBulk();
    draft.title = titleInput.value.trim() || '이름 없는 급수표';
    draft.level = levelInput.value.trim();
    if (!draft.items.length) {
      toast('문항을 한 개 이상 넣어 주세요', 'warn');
      return false;
    }
    upsertList(draft);
    toast('저장했어요');
    void renderShare();
    return true;
  };

  bulk.addEventListener('change', syncFromBulk);
  bulk.addEventListener('blur', syncFromBulk);

  renderItems();
  void renderShare();

  const el = h(
    'div',
    { class: 'view' },
    h(
      'section',
      { class: 'card' },
      h('h1', {}, isNew ? '새 급수표' : '급수표 고치기'),
      field('제목', titleInput),
      field('급수', levelInput, '학교에서 쓰는 표기를 그대로 적으세요.'),
      field('문항 붙여넣기', bulk, '한 줄에 한 문항. 앞의 번호(1. 2. …)는 알아서 지웁니다.'),
      h(
        'div',
        { class: 'row' },
        button('저장', () => save(), 'btn'),
        button('저장하고 연습', () => save() && navigate(`#/run/${draft.id}?mode=practice`), 'btn ghost'),
        button('저장하고 칠판 모드', () => save() && navigate(`#/board/${draft.id}`), 'btn ghost'),
        button('인쇄물 만들기', () => save() && navigate(`#/print/${draft.id}`), 'btn ghost'),
      ),
    ),
    h('section', { class: 'card' }, h('h2', {}, `문항 ${draft.items.length}개`), itemsBox),
    h(
      'section',
      { class: 'card' },
      h('h2', {}, '나눠 주기'),
      shareBox,
    ),
    existing
      ? h(
          'section',
          { class: 'card' },
          h('h2', {}, '위험한 작업'),
          button(
            '이 급수표 지우기',
            () => {
              if (!confirmBox('이 급수표와 관련 기록을 지울까요?')) return;
              deleteList(draft.id);
              toast('지웠어요');
              navigate('#/lists');
            },
            'btn danger',
          ),
        )
      : null,
  );

  return {
    el,
    title: `${draft.title || '급수표'} — 또박이`,
    destroy: () => {
      recorder?.cancel();
      stopAudio();
    },
  };
}
