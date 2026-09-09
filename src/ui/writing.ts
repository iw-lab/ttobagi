/**
 * 손글씨 칸 — 국어는 공책처럼 네모 칸에, 영어는 «4선지»에 쓴다.
 *
 * 🔴 영어를 네모 칸에 쓰게 하면 안 된다. 영어 손글씨에서 배우는 것은 «글자가 어느 선까지
 * 올라가고 내려가는가»(b 는 위로, p 는 아래로)인데, 칸은 그 정보를 아예 안 준다.
 * 학교에서 영어 공책이 4선지인 이유가 그것이다.
 *
 * 손가락·펜·마우스를 **한 파이프라인**으로 받는다. 학교 전자칠판(적외선 방식)은 펜을 손가락으로
 * 보고하는 경우가 있어서 «펜일 때만 그린다»고 못 박으면 그 교실에서 통째로 먹통이 된다.
 * 그래서 펜 입력이 실제로 관측된 기기에서만 손바닥 무시를 켠다.
 */

/** 'grid' = 국어 원고지 칸 · 'lines' = 영어 4선지 */
export type PadGuide = 'grid' | 'lines';

export interface WritingPadOptions {
  /** 칸 개수 — 문항 글자 수에 맞춘다 ('lines' 일 때는 쓰지 않는다) */
  cells: number;
  height?: number;
  guide?: PadGuide;
  onChange?: () => void;
}

interface Stroke {
  points: { x: number; y: number }[];
  width: number;
}

export class WritingPad {
  readonly root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private strokes: Stroke[] = [];
  private current: Stroke | null = null;
  private penSeen = false;
  private activePointer: number | null = null;
  private cells: number;
  private guide: PadGuide;
  private cssWidth = 0;
  private cssHeight = 0;
  private onChange?: () => void;
  private ro?: ResizeObserver;

  constructor(opts: WritingPadOptions) {
    this.cells = Math.max(1, Math.min(24, opts.cells));
    this.guide = opts.guide ?? 'grid';
    this.onChange = opts.onChange;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'pad-canvas';
    this.canvas.style.touchAction = 'none';
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('이 브라우저에서는 손글씨 칸을 쓸 수 없어요.');
    this.ctx = ctx;

    this.root = document.createElement('div');
    this.root.className = 'pad';
    this.root.style.setProperty('--pad-height', `${opts.height ?? 150}px`);
    this.root.appendChild(this.canvas);

    this.bind();
    queueMicrotask(() => this.resize());
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.root);
    }
  }

  /** 펜이 관측된 기기에서만 손바닥(손가락) 입력을 무시한다 */
  private shouldIgnore(e: PointerEvent): boolean {
    if (e.pointerType === 'pen') return false;
    return this.penSeen && e.pointerType === 'touch';
  }

  private bind(): void {
    const pos = (e: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'pen') this.penSeen = true;
      if (this.shouldIgnore(e)) return;
      this.canvas.setPointerCapture(e.pointerId);
      this.activePointer = e.pointerId;
      const width = e.pointerType === 'pen' ? 2 + (e.pressure || 0.5) * 4 : 4;
      this.current = { points: [pos(e)], width };
      this.strokes.push(this.current);
      this.draw();
      e.preventDefault();
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.current || this.shouldIgnore(e)) return;
      if (this.activePointer !== null && e.pointerId !== this.activePointer) return;
      this.current.points.push(pos(e));
      this.draw();
      e.preventDefault();
    });

    // 손바닥이 먼저 떨어질 때 그 pointerup 이 펜 획을 끊어 버리면 글씨가 토막난다.
    // 지금 획을 그리고 있는 포인터의 종료만 받아들인다.
    const end = (e: PointerEvent) => {
      if (!this.current) return;
      if (this.activePointer !== null && e.pointerId !== this.activePointer) return;
      this.activePointer = null;
      this.current = null;
      this.onChange?.();
    };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
    this.canvas.addEventListener('pointerleave', end);
  }

  private resize(): void {
    const rect = this.root.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  /** 영어 4선지 — 위선·가운데 점선·밑선(진하게)·내림선 */
  private drawLines(): void {
    const { ctx, cssWidth: w, cssHeight: hgt } = this;
    ctx.save();
    ctx.lineWidth = 1;
    const at = (r: number) => Math.round(hgt * r) + 0.5;
    const line = (y: number, color: string, dash: number[] = []) => {
      ctx.strokeStyle = color;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    };
    line(at(0.18), 'rgba(90,120,170,.30)');            // 위선 — b·h·l 이 닿는 곳
    line(at(0.46), 'rgba(90,120,170,.28)', [6, 6]);    // 가운데 점선 — a·e·o 의 키
    line(at(0.74), 'rgba(70,100,160,.70)');            // 밑선 — 글자가 앉는 줄
    line(at(0.95), 'rgba(90,120,170,.30)');            // 내림선 — g·p·y 가 내려가는 곳
    ctx.restore();
  }

  private drawGrid(): void {
    if (this.guide === 'lines') { this.drawLines(); return; }
    const { ctx, cssWidth: w, cssHeight: hgt, cells } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(90,120,170,.35)';
    ctx.lineWidth = 1;
    const cellW = w / cells;
    for (let i = 1; i < cells; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.round(i * cellW) + 0.5, 0);
      ctx.lineTo(Math.round(i * cellW) + 0.5, hgt);
      ctx.stroke();
    }
    // 가운데 안내선 — 글자 높이를 잡아 준다
    ctx.strokeStyle = 'rgba(90,120,170,.18)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, hgt / 2);
    ctx.lineTo(w, hgt / 2);
    ctx.stroke();
    ctx.restore();
  }

  private draw(): void {
    const { ctx, cssWidth: w, cssHeight: hgt } = this;
    ctx.clearRect(0, 0, w, hgt);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, hgt);
    this.drawGrid();
    ctx.save();
    ctx.strokeStyle = '#12243d';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of this.strokes) {
      if (s.points.length === 0) continue;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (const p of s.points.slice(1)) ctx.lineTo(p.x, p.y);
      if (s.points.length === 1) ctx.lineTo(s.points[0].x + 0.1, s.points[0].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  undo(): void {
    this.strokes.pop();
    this.draw();
    this.onChange?.();
  }

  clearInk(): void {
    this.strokes = [];
    this.draw();
    this.onChange?.();
  }

  get isEmpty(): boolean {
    return this.strokes.length === 0;
  }

  /** 교사 채점 화면에 띄울 작은 이미지 */
  toThumbnail(maxWidth = 480): string {
    if (this.isEmpty) return '';
    const scale = Math.min(1, maxWidth / Math.max(1, this.cssWidth));
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(this.cssWidth * scale));
    off.height = Math.max(1, Math.round(this.cssHeight * scale));
    const c = off.getContext('2d');
    if (!c) return '';
    c.drawImage(this.canvas, 0, 0, off.width, off.height);
    try {
      return off.toDataURL('image/png');
    } catch {
      return '';
    }
  }

  setCells(cells: number): void {
    this.cells = Math.max(1, Math.min(24, cells));
    this.draw();
  }

  destroy(): void {
    this.ro?.disconnect();
  }
}
