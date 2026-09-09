/**
 * 글자 블록 — 자판을 아직 못 치는 저학년을 위한 입력 방법.
 *
 * 아무 글자나 늘어놓지 않는다. **헷갈리기 쉬운 글자**를 방해 블록으로 섞는다.
 * (받침을 뗀 글자, ㅐ/ㅔ를 바꾼 글자, 된소리로 바꾼 글자 …)
 * 그래야 «찍어서» 맞히지 못하고, 고르는 행위 자체가 맞춤법 연습이 된다.
 */

import { compose, decompose, TENSE_PAIRS, VOWEL_CONFUSIONS } from '../engine/hangul';
import type { Lang } from '../engine/grade';

/**
 * 영어에서 «찍어서 맞히지 못하게» 섞을 글자.
 * 모양이 닮은 짝(b/d, p/q)과 소리가 닮은 짝(c/k, s/z)을 함께 넣는다 —
 * 저학년이 실제로 헷갈리는 것이 그 둘이다.
 */
const EN_CONFUSE: Record<string, string> = {
  a: 'eo', b: 'dp', c: 'ke', d: 'bq', e: 'ac', f: 'tl', g: 'qy', h: 'nb',
  i: 'lj', j: 'ig', k: 'cx', l: 'if', m: 'nw', n: 'mh', o: 'ac', p: 'qb',
  q: 'pg', r: 'nv', s: 'zc', t: 'fl', u: 'vn', v: 'uw', w: 'mv', x: 'ks',
  y: 'vg', z: 's',
};

function variantsOfEn(ch: string): string[] {
  const lower = ch.toLowerCase();
  const near = EN_CONFUSE[lower];
  if (!near) return [];
  const upper = ch !== lower; // 큰 글자면 방해 글자도 큰 글자로 — 대소문자 섞기는 다른 공부다
  return [...near].map((c) => (upper ? c.toUpperCase() : c));
}

function variantsOf(ch: string): string[] {
  const s = decompose(ch);
  if (!s) return [];
  const out = new Set<string>();
  // 받침 떼기 / 흔한 받침으로 바꾸기
  if (s.jong) {
    const bare = compose(s.cho, s.jung, '');
    if (bare) out.add(bare);
    for (const j of ['ㄴ', 'ㅁ', 'ㅅ', 'ㄱ']) {
      if (j !== s.jong) {
        const v = compose(s.cho, s.jung, j);
        if (v) out.add(v);
      }
    }
  } else {
    for (const j of ['ㄴ', 'ㅅ']) {
      const v = compose(s.cho, s.jung, j);
      if (v) out.add(v);
    }
  }
  // 헷갈리는 모음으로 바꾸기
  for (const group of VOWEL_CONFUSIONS) {
    if (!group.includes(s.jung)) continue;
    for (const v of group) {
      if (v === s.jung) continue;
      const alt = compose(s.cho, v, s.jong);
      if (alt) out.add(alt);
    }
  }
  // 된소리 ↔ 예사소리
  const tense = TENSE_PAIRS[s.cho];
  if (tense) {
    const alt = compose(tense, s.jung, s.jong);
    if (alt) out.add(alt);
  }
  out.delete(ch);
  return [...out];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildTiles(answer: string, extra = 4, lang: Lang = 'ko'): string[] {
  const chars = [...answer].filter((c) => c.trim() !== '');
  const pool = new Set<string>();
  const variants = lang === 'en' ? variantsOfEn : variantsOf;
  for (const c of chars) for (const v of variants(c)) pool.add(v);
  for (const c of chars) pool.delete(c);
  const distractors = shuffle([...pool]).slice(0, Math.max(0, extra));
  return shuffle([...chars, ...distractors]);
}

export interface BlockInputOptions {
  answer: string;
  lang?: Lang;
  /** 띄어쓰기 블록을 줄지 — 문장 문항에서만 의미가 있다 */
  withSpace?: boolean;
  onChange?: (value: string) => void;
}

export class BlockInput {
  readonly root: HTMLElement;
  private picked: string[] = [];
  private slot: HTMLElement;
  private tray: HTMLElement;
  private onChange?: (value: string) => void;

  constructor(opts: BlockInputOptions) {
    this.onChange = opts.onChange;
    this.slot = document.createElement('div');
    this.slot.className = 'blocks-slot';
    this.slot.setAttribute('aria-label', '고른 글자');

    this.tray = document.createElement('div');
    this.tray.className = 'blocks-tray';

    // 영어는 낱말이 길어 글자 수가 많다 — 방해 글자를 늘리면 화면이 감당을 못 한다.
    const lang = opts.lang ?? 'ko';
    const tiles = buildTiles(opts.answer, lang === 'en' ? 6 : 4, lang);
    const withSpace = opts.withSpace ?? /\s/.test(opts.answer);
    for (const t of tiles) this.tray.appendChild(this.makeTile(t));
    if (withSpace) this.tray.appendChild(this.makeTile(' ', '␣ 띄기'));

    const controls = document.createElement('div');
    controls.className = 'blocks-controls';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'btn ghost';
    back.textContent = '← 하나 지우기';
    back.onclick = () => this.pop();
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn ghost';
    clearBtn.textContent = '모두 지우기';
    clearBtn.onclick = () => this.reset();
    controls.append(back, clearBtn);

    this.root = document.createElement('div');
    this.root.className = 'blocks';
    this.root.append(this.slot, this.tray, controls);
    this.render();
  }

  private makeTile(ch: string, label?: string): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = label ?? ch;
    b.onclick = () => this.push(ch);
    return b;
  }

  private push(ch: string): void {
    this.picked.push(ch);
    this.render();
  }

  private pop(): void {
    this.picked.pop();
    this.render();
  }

  reset(): void {
    this.picked = [];
    this.render();
  }

  private render(): void {
    this.slot.textContent = this.picked.length ? this.picked.join('') : '';
    this.slot.classList.toggle('empty', this.picked.length === 0);
    if (!this.picked.length) this.slot.textContent = '여기에 글자가 놓여요';
    this.onChange?.(this.value);
  }

  get value(): string {
    return this.picked.join('');
  }
}
