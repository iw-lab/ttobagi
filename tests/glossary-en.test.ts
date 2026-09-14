import { describe, it, expect } from 'vitest';
import { CURRICULUM_EN } from '../src/engine/curriculum-en';
import { GLOSSARY_EN } from '../src/engine/glossary-en';

// 🔴 뜻은 «있는 것만» 보여 주면 아이가 어떤 낱말에서는 뜻을 보고 어떤 낱말에서는 못 본다.
//    그 들쭉날쭉함은 화면을 보기 전에는 아무도 모른다 — 그래서 전수로 센다.
describe('영어 뜻 사전', () => {
  const items = [...new Set(CURRICULUM_EN.flatMap((s) => s.items))];

  it('모든 영어 문항에 뜻이 있다', () => {
    const missing = items.filter((t) => !GLOSSARY_EN[t]);
    expect({ 빠진개수: missing.length, 예: missing.slice(0, 5) })
      .toEqual({ 빠진개수: 0, 예: [] });
  });

  it('뜻에 한글이 들어 있다 (영어를 그대로 되돌린 것 걸러내기)', () => {
    const bad = Object.entries(GLOSSARY_EN).filter(([, ko]) => !/[가-힣]/.test(ko));
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('뜻이 원문보다 터무니없이 길지 않다 (설명문이 섞인 것 걸러내기)', () => {
    const bad = Object.entries(GLOSSARY_EN)
      .filter(([en, ko]) => ko.length > Math.max(40, en.length * 3));
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('사전에 급수표에 없는 낱말이 섞이지 않는다', () => {
    const known = new Set(items);
    const strays = Object.keys(GLOSSARY_EN).filter((k) => !known.has(k));
    expect(strays.slice(0, 5)).toEqual([]);
  });
});
