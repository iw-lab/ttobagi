/**
 * 공유 — 서버 없이 급수표와 결과를 주고받는다.
 *
 * 급수표를 압축해 **주소 뒤에 통째로 담는다.** 링크를 받은 사람은 아무 데도 접속하지 않고
 * 링크 자체에서 급수표를 꺼낸다. 그래서 서버가 필요 없고(운영비 0), 링크가 곧 데이터다.
 * QR로 만들면 교실 화면에 띄워 놓고 아이들이 찍어 들어올 수 있다.
 */

import qrcode from 'qrcode-generator';
import { isCorrect } from './grade';
import { newId, type Attempt, type WordList } from './types';

const PREFIX = 'T1';

/* ───────────────────────── base64url ───────────────────────── */

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ───────────────────────── 압축 ───────────────────────── */

const canCompress = typeof CompressionStream !== 'undefined';

async function deflate(text: string): Promise<Uint8Array> {
  const stream = new Blob([new TextEncoder().encode(text)])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

/* ───────────────────────── 담는 그릇 ───────────────────────── */

/** 링크에 담기는 급수표 (키를 줄여 링크를 짧게 만든다) */
interface ListPayload {
  t: 'l';
  n: string;
  v: string;
  i: string[];
  p?: (string | undefined)[];
  /** 과목. 없으면 국어 — 이 칸이 생기기 전에 만들어진 링크는 전부 국어다. */
  g?: 'ko' | 'en';
}

/** 링크에 담기는 결과 요약 */
interface ResultPayload {
  t: 'r';
  w: string;
  n: string;
  /** [문항, 답, 정오(1=맞음, 0=틀림, 2=아까움)] */
  a: [string, string, number][];
  d: number;
}

type Payload = ListPayload | ResultPayload;

export async function encode(payload: Payload): Promise<string> {
  const json = JSON.stringify(payload);
  if (canCompress) {
    try {
      return `${PREFIX}z${toBase64Url(await deflate(json))}`;
    } catch {
      /* 압축이 안 되면 그냥 담는다 */
    }
  }
  return `${PREFIX}p${toBase64Url(new TextEncoder().encode(json))}`;
}

export async function decode(code: string): Promise<Payload> {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) throw new Error('또박이 공유 코드가 아니에요.');
  const method = trimmed[PREFIX.length];
  const body = trimmed.slice(PREFIX.length + 1);
  const bytes = fromBase64Url(body);
  let json: string;
  if (method === 'z') {
    if (!canCompress) throw new Error('이 브라우저에서는 압축된 코드를 열 수 없어요.');
    json = await inflate(bytes);
  } else if (method === 'p') {
    json = new TextDecoder().decode(bytes);
  } else {
    throw new Error('공유 코드 형식을 알 수 없어요.');
  }
  const parsed: unknown = JSON.parse(json);
  return validate(parsed);
}

/* ───────────────────────── 급수표 ↔ 코드 ───────────────────────── */

export async function encodeList(list: WordList): Promise<string> {
  // undefined 를 그대로 두면 JSON 배열에서 null 로 바뀌어 받는 쪽 타입이 깨진다
  const points = list.items.map((i) => i.point ?? '');
  const payload: ListPayload = {
    t: 'l',
    n: list.title,
    v: list.level,
    i: list.items.map((i) => i.text),
  };
  if (points.some(Boolean)) payload.p = points;
  // 국어는 기본값이라 싣지 않는다 — 링크를 한 글자라도 짧게 둔다.
  if (list.lang === 'en') payload.g = 'en';
  return encode(payload);
}

export function payloadToList(payload: ListPayload): WordList {
  const now = Date.now();
  return {
    id: newId('l'),
    title: payload.n || '받아온 급수표',
    level: payload.v || '',
    lang: payload.g === 'en' ? 'en' : 'ko',
    items: payload.i.map((text, idx) => ({
      id: newId('i'),
      text,
      point: payload.p?.[idx] || undefined,
    })),
    createdAt: now,
    updatedAt: now,
  };
}

export async function encodeResult(attempt: Attempt, itemText: (id: string) => string): Promise<string> {
  const payload: ResultPayload = {
    t: 'r',
    w: attempt.who,
    n: attempt.listTitle,
    d: attempt.finishedAt,
    a: attempt.answers.map((a) => [
      itemText(a.itemId),
      a.text,
      // 손글씨는 사람이 ○/× 로 확정하기 전까지 정답이 아니다.
      // confirmed 를 안 보면 미확정 답이 결과 링크에서 정답으로 굳는다.
      !a.confirmed ? 3 : isCorrect(a.verdict) ? 1 : a.verdict === 'partial' ? 2 : 0,
    ]),
  };
  return encode(payload);
}

/**
 * 남이 만든 주소를 그대로 믿지 않는다. 형태만 맞고 알맹이가 빈 코드(T1p + '{"t":"l"}')를
 * 통과시키면 화면에서 payload.i.map 이 터진다 — 여기서 «열 수 없는 코드»로 정직하게 끝낸다.
 */
function validate(v: unknown): Payload {
  const bad = () => new Error('공유 코드 내용을 알 수 없어요.');
  if (typeof v !== 'object' || v === null) throw bad();
  const o = v as Record<string, unknown>;
  const strings = (x: unknown) => Array.isArray(x) && x.every((e) => typeof e === 'string');

  if (o.t === 'l') {
    if (!strings(o.i) || (o.i as string[]).length === 0) throw bad();
    if (o.p !== undefined && !strings(o.p)) throw bad();
    if (o.n !== undefined && typeof o.n !== 'string') throw bad();
    if (o.v !== undefined && typeof o.v !== 'string') throw bad();
    return o as unknown as ListPayload;
  }
  if (o.t === 'r') {
    if (!Array.isArray(o.a)) throw bad();
    const rows = o.a as unknown[];
    const ok = rows.every(
      (r) => Array.isArray(r) && typeof r[0] === 'string' && typeof r[1] === 'string' && typeof r[2] === 'number',
    );
    if (!ok) throw bad();
    return o as unknown as ResultPayload;
  }
  throw bad();
}

export type { ListPayload, ResultPayload, Payload };

/* ───────────────────────── 링크·QR ───────────────────────── */

/** 앱의 기본 주소 (해시 앞부분) */
export function baseUrl(): string {
  const { origin, pathname } = location;
  return `${origin}${pathname}`;
}

export function shareUrl(code: string): string {
  return `${baseUrl()}#/open?c=${code}`;
}

/**
 * QR 코드를 SVG 문자열로 만든다.
 * 담을 내용이 너무 길면 null — 그때는 링크 복사를 안내한다.
 */
export function qrSvg(text: string, moduleSize = 4): string | null {
  try {
    const qr = qrcode(0, 'L');
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const size = count * moduleSize;
    let path = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          path += `M${c * moduleSize} ${r * moduleSize}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR 코드"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
  } catch {
    return null;
  }
}

/** 링크를 클립보드에 넣는다. 실패하면 false — 화면에 링크를 직접 보여 주면 된다. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
