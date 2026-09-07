import { getSettings, getWho, setSettings, setWho, storageSize, wipeAll } from '../engine/store';
import { clearAudio } from '../engine/idb';
import { koreanVoices, loadVoices, voiceStatus } from '../engine/speech';
import { STRICTNESS_LABEL, type Strictness } from '../engine/grade';
import { button, confirmBox, field, fill, h, navigate, toast } from '../ui/dom';
import type { View } from './view';

export function settingsView(): View {
  const s = getSettings();
  const el = h('div', { class: 'view' });

  const voiceBox = h('p', { class: 'muted' }, '확인 중…');
  void (async () => {
    const status = await voiceStatus();
    await loadVoices();
    const names = koreanVoices().map((v) => `${v.name}${v.localService ? ' (기기 안)' : ' (인터넷 필요)'}`);
    fill(
      voiceBox,
      h('span', {}, status === 'ready' ? `한국어 목소리 ${names.length}개를 쓸 수 있어요.` : '이 기기에는 한국어 목소리가 없어요.'),
      names.length ? h('ul', { class: 'plain-list' }, ...names.map((n) => h('li', { class: 'muted small' }, n))) : null,
      status !== 'ready'
        ? h('p', { class: 'notice small' }, '급수표 편집 화면에서 문항마다 선생님 목소리를 녹음해 두면 목소리 없이도 그대로 쓸 수 있어요.')
        : null,
    );
  })();

  const nameInput = h('input', {
    class: 'input',
    type: 'text',
    value: getWho(),
    placeholder: '번호나 별명',
    oninput: (e: Event) => setWho((e.target as HTMLInputElement).value.trim()),
  });

  const strict = h(
    'select',
    { class: 'input', onchange: (e: Event) => setSettings({ strictness: (e.target as HTMLSelectElement).value as Strictness }) },
    ...(['char', 'space', 'full'] as const).map((k) => h('option', { value: k, selected: s.strictness === k }, STRICTNESS_LABEL[k])),
  );

  const easyFont = h('input', {
    type: 'checkbox',
    checked: s.easyFont,
    onchange: (e: Event) => {
      const on = (e.target as HTMLInputElement).checked;
      setSettings({ easyFont: on });
      document.body.classList.toggle('easy-font', on);
    },
  });

  const hideScore = h('input', {
    type: 'checkbox',
    checked: s.hideScore,
    onchange: (e: Event) => setSettings({ hideScore: (e.target as HTMLInputElement).checked }),
  });

  const visualSeconds = h('input', {
    class: 'input',
    type: 'number',
    min: '1',
    max: '10',
    value: String(s.visualSeconds),
    oninput: (e: Event) => setSettings({ visualSeconds: Math.max(1, Math.min(10, Number((e.target as HTMLInputElement).value) || 3)) }),
  });

  el.append(
    h(
      'section',
      { class: 'card' },
      h('h1', {}, '설정'),
      field('이 기기에서 쓸 이름', nameInput, '이름 대신 번호·별명을 써도 됩니다.'),
      field('채점 기준', strict, '학교에서 쓰는 기준에 맞추세요.'),
      field('보여주기 시간(초)', visualSeconds, '소리 대신 눈으로 익히는 학생을 위한 시간입니다.'),
      h('label', { class: 'field-inline' }, easyFont, h('span', {}, '읽기 쉬운 글꼴·넓은 자간')),
      h('label', { class: 'field-inline' }, hideScore, h('span', {}, '점수 감추기 (해냈어요만 보여주기)')),
    ),
    h('section', { class: 'card' }, h('h2', {}, '소리'), voiceBox),
    h(
      'section',
      { class: 'card' },
      h('h2', {}, '개인정보와 저장'),
      h('p', {}, '이 앱은 ', h('strong', {}, '서버가 없습니다'), '. 급수표·답안·녹음은 모두 이 기기 안에만 저장되고, 어디로도 전송되지 않습니다. 아이 이름을 넣지 않아도 쓸 수 있게 만들었습니다.'),
      h('p', { class: 'muted small' }, `지금 쓰는 저장 공간: 약 ${storageSize()}KB`),
      h(
        'div',
        { class: 'row' },
        button('이 기기 자료 모두 지우기', async () => {
          if (!confirmBox('급수표·기록·녹음을 모두 지웁니다. 되돌릴 수 없어요. 계속할까요?')) return;
          await clearAudio();
          wipeAll();
          toast('모두 지웠어요');
          navigate('#/');
        }, 'btn danger'),
      ),
      h('p', { class: 'muted small' }, '학교 공용 기기라면 수업이 끝난 뒤 이 단추를 눌러 다음 학생에게 넘겨 주세요.'),
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', {}, '또박이에 대하여'),
      h('p', { class: 'muted small' }, '초등 받아쓰기를 위한 무료 웹앱입니다. 설치 없이 브라우저에서 열리고, 인터넷이 끊겨도 쓰던 급수표는 그대로 돌아갑니다.'),
      button('처음 화면으로', () => navigate('#/'), 'btn ghost'),
    ),
  );

  return { el, title: '설정 — 또박이' };
}
