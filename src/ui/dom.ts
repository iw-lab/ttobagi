/** 화면을 만드는 최소한의 도구. 프레임워크를 얹지 않아 번들이 작고 웨일북에서 빨리 뜬다. */

type Child = Node | string | number | null | undefined | false;

export interface Attrs {
  class?: string;
  id?: string;
  type?: string;
  href?: string;
  value?: string | number;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  checked?: boolean;
  selected?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  rows?: number;
  html?: string;
  style?: string;
  hidden?: boolean;
  [key: string]: unknown;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, raw] of Object.entries(attrs)) {
    if (raw === null || raw === undefined || raw === false) continue;
    if (key === 'html') {
      el.innerHTML = String(raw);
    } else if (key.startsWith('on') && typeof raw === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), raw as EventListener);
    } else if (key === 'class') {
      el.className = String(raw);
    } else if (key === 'value' && 'value' in el) {
      (el as HTMLInputElement).value = String(raw);
    } else if (key === 'checked' || key === 'disabled' || key === 'selected' || key === 'hidden') {
      (el as unknown as Record<string, unknown>)[key] = Boolean(raw);
      if (raw) el.setAttribute(key, '');
    } else if (key === 'dataset' && typeof raw === 'object') {
      Object.assign(el.dataset, raw as Record<string, string>);
    } else {
      el.setAttribute(key, String(raw));
    }
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    parent.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
}

/** null 을 걸러 내며 붙인다 — 조건부 요소를 그대로 넘길 수 있다 */
export function add(parent: Node, ...children: Child[]): void {
  append(parent, children);
}

/** 비우고 다시 채운다 */
export function fill(parent: Element, ...children: Child[]): void {
  parent.replaceChildren();
  append(parent, children);
}

export function clear(el: Node): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function $(selector: string, root: ParentNode = document): HTMLElement | null {
  return root.querySelector(selector);
}

/** 화면 위에 잠깐 뜨는 알림 — 저학년도 읽도록 크게 */
let toastTimer: number | undefined;
export function toast(message: string, kind: 'ok' | 'warn' = 'ok'): void {
  let box = document.getElementById('toast');
  if (!box) {
    box = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.className = `toast show ${kind}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    box.className = 'toast';
  }, 2600);
}

/** 되돌릴 수 없는 일 앞에서 한 번 묻는다 */
export function confirmBox(message: string): boolean {
  return window.confirm(message);
}

export function navigate(hash: string): void {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}

/** 큰 버튼 — 전자칠판에서 손가락으로 눌러야 하므로 기본 크기를 키웠다 */
export function button(label: Child, onClick: () => void, cls = 'btn'): HTMLButtonElement {
  return h('button', { class: cls, type: 'button', onclick: onClick }, label);
}

export function section(title: string, ...children: Child[]): HTMLElement {
  return h('section', { class: 'card' }, h('h2', {}, title), ...children);
}

export function field(label: string, control: HTMLElement, hint?: string): HTMLElement {
  const id = control.id || `f${Math.random().toString(36).slice(2, 8)}`;
  control.id = id;
  return h(
    'label',
    { class: 'field', for: id },
    h('span', { class: 'field-label' }, label),
    control,
    hint ? h('span', { class: 'field-hint' }, hint) : null,
  );
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * «연습» 과 «시험» 이 무엇이 다른지 한 줄로 말해 준다.
 *
 * 🔴 버튼에 이름만 적어 두면 무엇이 다른지 알 수 없다 — 실제로 헷갈린다는 말을 들었다
 *    (2026-09-14 사용자). 차이는 코드에 이미 있는 것만 적는다(`views/run.ts`):
 *    시험은 ① 끝날 때까지 정오·정답을 안 보여 주고 ② 힌트·보여주기가 꺼지며
 *    ③ 채점 기준을 도중에 바꿀 수 없다.
 */
export function modeHelp(): HTMLElement {
  return h(
    'p',
    { class: 'muted small' },
    h('strong', {}, '연습'),
    '은 한 문제 쓸 때마다 맞았는지 바로 알려 주고, 힌트도 켤 수 있어요. ',
    h('strong', {}, '시험'),
    '은 다 쓸 때까지 정답을 감춰 둡니다(먼저 낸 아이가 답을 알려 주는 일을 막아요).',
  );
}
