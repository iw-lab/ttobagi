import { describe, expect, it } from 'vitest';
import { CURRICULUM_EN } from '../src/engine/curriculum-en';
import { builtinList, sheetsOf, toWordList } from '../src/engine/curriculum';

describe('영어 급수표', () => {
  it('비어 있지 않다', () => {
    // 「과목 고르개는 있는데 고를 게 없다」는 상태로 배포되면 안 된다.
    expect(CURRICULUM_EN.length).toBeGreaterThan(0);
  });

  it('3~6학년 두 학기가 빠짐없이 들어 있다', () => {
    const have = new Set(CURRICULUM_EN.map((c) => `${c.grade}-${c.semester}`));
    for (const g of [3, 4, 5, 6]) for (const s of [1, 2]) {
      expect(have.has(`${g}-${s}`), `${g}학년 ${s}학기`).toBe(true);
    }
  });

  it('id 가 겹치지 않고 국어 급수표와도 섞이지 않는다', () => {
    const ids = CURRICULUM_EN.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CURRICULUM_EN) {
      expect(c.id).toBe(`e${c.grade}-${c.semester}-${String(c.level).padStart(2, '0')}`);
      expect(c.subject).toBe('en');
    }
    const koIds = new Set(sheetsOf('ko').map((c) => c.id));
    for (const id of ids) expect(koIds.has(id), `${id} 가 국어 급수표와 겹친다`).toBe(false);
  });

  it('모든 급수가 10문항이고 급수 안에서 겹치지 않는다', () => {
    for (const c of CURRICULUM_EN) {
      expect(c.items.length, `${c.id} ${c.title}`).toBe(10);
      expect(new Set(c.items.map((t) => t.toLowerCase())).size, `${c.id}: 같은 문항 중복`).toBe(10);
    }
  });

  it('모든 학기가 1급부터 구멍 없이 이어진다', () => {
    const groups = new Map<string, number[]>();
    for (const c of CURRICULUM_EN) {
      const k = `${c.grade}-${c.semester}`;
      groups.set(k, [...(groups.get(k) ?? []), c.level]);
    }
    expect(groups.size).toBe(8);
    for (const [k, levels] of groups) {
      const sorted = [...levels].sort((a, b) => a - b);
      expect(sorted.length, `${k}: 급수가 너무 적다`).toBeGreaterThanOrEqual(10);
      expect(sorted, `${k}: 급수 번호에 구멍`).toEqual(sorted.map((_, i) => i + 1));
    }
  });

  it('문항에 군더더기가 없다', () => {
    for (const c of CURRICULUM_EN) {
      for (const t of c.items) {
        expect(t, c.id).toBe(t.trim());
        expect(t, `${c.id}: 두 칸 띄기`).not.toMatch(/ {2}/);
        expect(t, `${c.id}: 아라비아 숫자`).not.toMatch(/[0-9]/);
        // 🔴 아포스트로피는 «곧은 것»만 쓴다. 굽은 ’ 이 섞이면 don't 와 don’t 가 다른 말이 된다.
        expect(t, `${c.id}: 굽은 아포스트로피`).not.toMatch(/[’‘]/);
        expect(t, `${c.id}: 쓸 수 없는 글자 — ${t}`).toMatch(/^[A-Za-z\s.,!?;:'“”—-]+$/);
      }
    }
  });

  it('문장 문항은 대문자로 시작하고 부호로 끝난다', () => {
    for (const c of CURRICULUM_EN) {
      for (const t of c.items) {
        if (!t.includes(' ')) continue; // 낱말 급수
        expect(t, `${c.id}: 소문자로 시작 — ${t}`).toMatch(/^[A-Z]/);
        // 인용 문장은 닫는 따옴표로 끝난다(… doll.”)
        expect(t, `${c.id}: 끝 부호 없음 — ${t}`).toMatch(/[.!?]["”]?$/);
      }
    }
  });

  it('낱말 문항에는 마침표가 붙지 않는다', () => {
    for (const c of CURRICULUM_EN) {
      for (const t of c.items) {
        if (t.includes(' ')) continue;
        expect(t, `${c.id}: 낱말인데 부호 — ${t}`).not.toMatch(/[.!?]["”]?$/);
      }
    }
  });

  it('부호 뒤는 한 칸 띄운다', () => {
    const bad: string[] = [];
    for (const c of CURRICULUM_EN) {
      for (const t of c.items) {
        for (const _ of t.matchAll(/[.,!?;:](?=[A-Za-z])/g)) bad.push(`${c.id}: ${t}`);
      }
    }
    expect(bad, bad.join(' / ')).toEqual([]);
  });

  it('고학년일수록 문항이 실제로 길다', () => {
    const avg = (g: number) => {
      const items = CURRICULUM_EN.filter((c) => c.grade === g).flatMap((c) => c.items);
      return items.reduce((n, t) => n + t.length, 0) / items.length;
    };
    expect(avg(3)).toBeLessThan(avg(5));
    expect(avg(5)).toBeLessThan(avg(6));
  });

  it('앱이 영어 급수표를 영어로 채점하도록 넘긴다', () => {
    // 🔴 여기가 어긋나면 영어 문항이 한글 자모 규칙으로 채점된다.
    const sheet = CURRICULUM_EN[0];
    const list = toWordList(sheet);
    expect(list.lang).toBe('en');
    expect(builtinList(`c-${sheet.id}`)?.lang).toBe('en');
    // 국어는 건드리지 않았는지 같이 본다
    expect(toWordList(sheetsOf('ko')[0]).lang).toBe('ko');
  });

  it('음원 경로가 급수 id 를 따른다', () => {
    const sheet = CURRICULUM_EN[0];
    const list = toWordList(sheet, '/');
    expect(list.items[0].audio).toBe(`/audio/${sheet.id}/01.mp3`);
  });
});
