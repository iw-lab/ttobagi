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

  it('모든 학기가 10급까지 채워져 있다', () => {
    const groups = new Map<string, number[]>();
    for (const c of CURRICULUM) {
      const k = `${c.grade}-${c.semester}`;
      groups.set(k, [...(groups.get(k) ?? []), c.level]);
    }
    expect(groups.size).toBe(11); // 1학년 2학기부터 6학년 2학기까지
    for (const [k, levels] of groups) {
      expect(levels.sort((a, b) => a - b), k).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
  });

  it('3학년부터는 낱말이 아니라 문장으로 받아쓴다', () => {
    // 5학년에게 낱말 받아쓰기를 시키면 안 된다 — 학년에 맞는 부담이어야 한다
    for (const c of CURRICULUM.filter((x) => x.grade >= 3)) {
      const words = c.items.filter((t) => !t.includes(' '));
      expect(words.length, `${c.id} ${c.title}: 낱말 문항 ${words.join(', ')}`).toBe(0);
    }
  });

  it('고학년일수록 문장이 실제로 길다', () => {
    const avg = (g: number) => {
      const items = CURRICULUM.filter((c) => c.grade === g).flatMap((c) => c.items);
      return items.reduce((n, t) => n + t.length, 0) / items.length;
    };
    expect(avg(1)).toBeLessThan(avg(3));
    expect(avg(3)).toBeLessThan(avg(6));
    // 4학년 이상은 평균 15자를 넘어야 «문장 받아쓰기»라 할 수 있다
    for (const g of [4, 5, 6]) expect(avg(g), `${g}학년 평균 길이`).toBeGreaterThan(15);
  });
});
