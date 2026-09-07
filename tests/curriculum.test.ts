import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '../src/engine/curriculum';

describe('학년별 급수표', () => {
  it('학년·학기가 빠짐없이 들어 있다', () => {
    const key = (g: number, s: number) => `${g}-${s}`;
    const have = new Set(CURRICULUM.map((c) => key(c.grade, c.semester)));
    for (const g of [2, 3, 4, 5, 6]) {
      expect(have.has(key(g, 1)), `${g}학년 1학기`).toBe(true);
      expect(have.has(key(g, 2)), `${g}학년 2학기`).toBe(true);
    }
    expect(have.has('1-2'), '1학년 2학기').toBe(true);
  });

  it('id 가 겹치지 않고 학년·학기·급과 맞는다', () => {
    const ids = CURRICULUM.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CURRICULUM) {
      expect(c.id).toBe(`g${c.grade}-${c.semester}-${String(c.level).padStart(2, '0')}`);
    }
  });

  it('모든 급수가 10문항이다', () => {
    for (const c of CURRICULUM) {
      expect(c.items.length, `${c.id} ${c.title}`).toBe(10);
    }
  });

  it('문항에 군더더기가 없다', () => {
    for (const c of CURRICULUM) {
      for (const t of c.items) {
        expect(t, c.id).toBe(t.trim());
        expect(t.length, `${c.id}: ${t}`).toBeGreaterThan(0);
        expect(t, `${c.id}: 두 칸 띄기`).not.toMatch(/ {2}/);
        // 받아쓰기 답이므로 한글·공백·문장부호만 있어야 한다(숫자·날짜 표기는 예외로 허용)
        expect(t, `${c.id}: 쓸 수 없는 글자`).toMatch(/^[가-힣0-9\s.,!?:;'"·…—()『』\-]+$/);
      }
      expect(new Set(c.items).size, `${c.id}: 같은 문항 중복`).toBe(c.items.length);
    }
  });

  it('학년이 올라갈수록 문항이 길어진다', () => {
    const avg = (g: number) => {
      const items = CURRICULUM.filter((c) => c.grade === g).flatMap((c) => c.items);
      return items.reduce((n, t) => n + t.length, 0) / items.length;
    };
    expect(avg(1)).toBeLessThan(avg(3));
    expect(avg(3)).toBeLessThan(avg(6));
  });
});
