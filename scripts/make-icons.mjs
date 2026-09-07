/**
 * 앱 아이콘(PNG)을 만든다. 외부 라이브러리 없이 Node 내장 zlib 만으로 PNG 를 직접 쓴다.
 * — 아이콘 하나 만들자고 이미지 도구를 설치하지 않는다(설치도 비용이다).
 *
 * 그림: 브랜드 색 둥근 사각형 위에 흰 «원고지 네 칸».
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..', 'public');

const BRAND = [47, 107, 216, 255];
const WHITE = [255, 255, 255, 255];
const TRANSPARENT = [0, 0, 0, 0];

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw[o++] = pixels[i];
      raw[o++] = pixels[i + 1];
      raw[o++] = pixels[i + 2];
      raw[o++] = pixels[i + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 둥근 사각형 안쪽인지 (모서리를 원으로 깎는다) */
function insideRounded(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function makeIcon(size, { maskable = false } = {}) {
  const px = new Uint8Array(size * size * 4);
  const put = (x, y, color) => {
    const i = (y * size + x) * 4;
    px[i] = color[0];
    px[i + 1] = color[1];
    px[i + 2] = color[2];
    px[i + 3] = color[3];
  };

  // 배경 — maskable 은 잘려도 되도록 가장자리까지 꽉 채운다
  const pad = maskable ? 0 : Math.round(size * 0.06);
  const radius = maskable ? 0 : Math.round(size * 0.22);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = maskable
        ? true
        : insideRounded(x, y, pad, pad, size - 1 - pad, size - 1 - pad, radius);
      put(x, y, on ? BRAND : TRANSPARENT);
    }
  }

  // 원고지 네 칸 — 흰 선
  const inset = Math.round(size * (maskable ? 0.28 : 0.24));
  const box0 = inset;
  const box1 = size - 1 - inset;
  const thick = Math.max(2, Math.round(size * 0.035));
  const mid = Math.round((box0 + box1) / 2);

  const drawH = (y) => {
    for (let t = 0; t < thick; t++) {
      for (let x = box0; x <= box1; x++) put(x, Math.min(size - 1, y + t), WHITE);
    }
  };
  const drawV = (x) => {
    for (let t = 0; t < thick; t++) {
      for (let y = box0; y <= box1; y++) put(Math.min(size - 1, x + t), y, WHITE);
    }
  };
  drawH(box0);
  drawH(box1 - thick + 1);
  drawH(mid - Math.floor(thick / 2));
  drawV(box0);
  drawV(box1 - thick + 1);
  drawV(mid - Math.floor(thick / 2));

  return encodePng(size, size, px);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, 'icon-192.png'), makeIcon(192));
writeFileSync(resolve(OUT, 'icon-512.png'), makeIcon(512));
writeFileSync(resolve(OUT, 'icon-maskable-512.png'), makeIcon(512, { maskable: true }));
writeFileSync(resolve(OUT, 'apple-touch-icon.png'), makeIcon(180, { maskable: true }));
console.log('아이콘 4개를 public/ 에 만들었습니다.');
