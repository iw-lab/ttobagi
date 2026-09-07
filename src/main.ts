import './styles.css';
import { getSettings } from './engine/store';
import { preloadRecordingIndex, stopAudio } from './engine/speech';
import { builtinList } from './engine/curriculum';
import { setBuiltinResolver } from './engine/store';
import { h, clear } from './ui/dom';
import { boardView } from './views/board';
import { curriculumView } from './views/curriculum';
import { homeView } from './views/home';
import { listEditView } from './views/listEdit';
import { listsView } from './views/lists';
import { openView } from './views/open';
import { printView } from './views/print';
import { reportView } from './views/report';
import { resultView } from './views/result';
import { runView } from './views/run';
import { settingsView } from './views/settings';
import type { Params, View } from './views/view';

const app = document.getElementById('app');
if (!app) throw new Error('#app 을 찾을 수 없습니다');

let current: View | null = null;

function parseHash(): { path: string[]; params: Params } {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = pathPart.split('/').filter(Boolean);
  const params: Params = {};
  for (const [k, v] of new URLSearchParams(queryPart)) params[k] = v;
  return { path, params };
}

function resolve(path: string[], params: Params): View {
  const [head, id] = path;
  switch (head) {
    case undefined:
    case '':
      return homeView();
    case 'lists':
      return listsView();
    case 'curriculum':
      return curriculumView(params);
    case 'list':
      return listEditView({ ...params, id: id ?? 'new' });
    case 'run':
      return runView({ ...params, id: id ?? '' });
    case 'result':
      return resultView({ ...params, id: id ?? '' });
    case 'board':
      return boardView({ ...params, id: id ?? '' });
    case 'print':
      return printView({ ...params, id: id ?? '' });
    case 'report':
      return reportView();
    case 'settings':
      return settingsView();
    case 'open':
      return openView(params);
    default:
      return homeView();
  }
}

function render(): void {
  const { path, params } = parseHash();
  current?.destroy?.();
  stopAudio();
  let view: View;
  try {
    view = resolve(path, params);
  } catch (err) {
    view = {
      el: h(
        'div',
        { class: 'view' },
        h(
          'section',
          { class: 'card' },
          h('h1', {}, '문제가 생겼어요'),
          h('p', { class: 'muted' }, err instanceof Error ? err.message : String(err)),
          h('a', { class: 'btn', href: '#/' }, '처음으로'),
        ),
      ),
    };
  }
  current = view;
  clear(app!);
  app!.appendChild(view.el);
  document.title = view.title ?? '또박이';
  window.scrollTo(0, 0);
}

function applyPreferences(): void {
  document.body.classList.toggle('easy-font', getSettings().easyFont);
}

// 내장 급수표는 저장소가 아니라 앱 자신이 답한다 — 사본이 낡는 길을 막는다.
// 첫 화면을 그리기 전에 끼워 넣어야 한다.
setBuiltinResolver(builtinList);

window.addEventListener('hashchange', render);
applyPreferences();
render();

// 설치형(PWA)으로 쓰기 위한 서비스 워커. 없어도 앱은 그대로 돌아간다.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* 등록에 실패해도 온라인에서는 정상 동작한다 */
    });
  });
}

// 녹음 색인을 미리 채운다. 이게 준비돼 있어야 읽어 주기가 클릭과 같은 순간에 소리를 낸다.
void preloadRecordingIndex();
