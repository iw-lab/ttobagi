import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { CURRICULUM } from '../src/engine/curriculum';
import { CURRICULUM_EN } from '../src/engine/curriculum-en';

// 상시 가드(2026-09-14 신설) — 공개 전 전수 점검에서 만든 것: 문항마다 음원이 «실제로» 있고 비어 있지 않은가.
// 🔴 하나라도 없으면 교실에서 그 문항만 조용히 무음이 된다 — 테스트 없이는 아무도 모른다.
function audit(sheets: any[], label: string) {
  const missing: string[] = [];
  const tiny: string[] = [];
  let n = 0;
  for (const s of sheets) {
    s.items.forEach((_: unknown, i: number) => {
      n++;
      const p = `public/audio/${s.id}/${String(i + 1).padStart(2, '0')}.mp3`;
      if (!existsSync(p)) { missing.push(p); return; }
      if (statSync(p).size < 1000) tiny.push(p);
    });
  }
  console.log(`${label}: 문항 ${n} · 없음 ${missing.length} · 1KB미만 ${tiny.length}`);
  if (missing.length) console.log('  없음 예:', missing.slice(0, 5));
  if (tiny.length) console.log('  작음 예:', tiny.slice(0, 5));
  expect(missing).toEqual([]);
  expect(tiny).toEqual([]);
}

describe('음원 전수', () => {
  it('국어 문항마다 음원이 있다', () => audit(CURRICULUM as any[], '국어'));
  it('영어 문항마다 음원이 있다', () => audit(CURRICULUM_EN as any[], '영어'));
});
