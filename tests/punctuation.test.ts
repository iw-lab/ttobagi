import { describe, expect, it } from 'vitest';
import { grade } from '../src/engine/grade';
import { sheetsOf } from '../src/engine/curriculum';
import { PUNCT_RE } from '../src/engine/hangul';
import { EN_PUNCT_RE } from '../src/engine/english';

/**
 * 특수문자 전수검사 — 2026-09-14 사용자 신고(「『토끼전』 이나 () 같은 걸 넣으면 어떻게 되냐」).
 * 문항에 실제로 들어 있는 부호를 전부 세어, 채점기가 그것을 «부호»로 알아보는지 본다.
 * 못 알아보면 그 부호는 «글자» 가 되어, 아이가 바르게 써도 글자빠짐 오답이 된다.
 */
describe('문항에 실제로 쓰인 부호를 채점기가 다 알아본다', () => {
  const letters = /[가-힣ㄱ-ㅣa-zA-Z0-9 ]/;
  const collect = (lang: 'ko' | 'en'): Map<string, number> => {
    const seen = new Map<string, number>();
    for (const sheet of sheetsOf(lang)) {
      for (const text of sheet.items) {
        for (const ch of text) {
          if (letters.test(ch)) continue;
          seen.set(ch, (seen.get(ch) ?? 0) + 1);
        }
      }
    }
    return seen;
  };

  it('국어 문항의 부호는 전부 PUNCT_RE 가 안다', () => {
    const missed = [...collect('ko').keys()].filter((ch) => !new RegExp(PUNCT_RE.source).test(ch));
    expect(missed, `모르는 부호: ${missed.join(' ')}`).toEqual([]);
  });

  it('영어 문항의 부호는 홑따옴표 말고 전부 EN_PUNCT_RE 가 안다', () => {
    // 홑따옴표는 낱말의 일부다(don't ≠ dont) — 지우면 안 된다.
    const missed = [...collect('en').keys()]
      .filter((ch) => ch !== "'")
      .filter((ch) => !new RegExp(EN_PUNCT_RE.source).test(ch));
    expect(missed, `모르는 부호: ${missed.join(' ')}`).toEqual([]);
  });
});

describe('부호 때문에 «바르게 썼는데 오답» 이 되지 않는다', () => {
  it('겹낫표를 못 쳐도 기본 엄격도에서는 맞다', () => {
    // 기본 엄격도 char 는 부호를 아예 안 보는 모드다 — 여기서 틀리면 안 된다.
    expect(grade('『토끼전』을 다시 읽었다.', '토끼전을 다시 읽었다.', { strictness: 'char' }).verdict)
      .toBe('correct');
  });

  it('굽은 따옴표는 곧은 따옴표로 써도 맞다 — 한글 키보드로는 곧은 것만 나온다', () => {
    for (const strictness of ['char', 'space', 'full'] as const) {
      const r = grade('“안녕!” 제비가 지저귄다.', '"안녕!" 제비가 지저귄다.', { strictness });
      expect(r.verdict, strictness).toBe('correct');
      expect(r.tags, strictness).not.toContain('문장부호');
    }
  });

  it('영어 홑따옴표는 여전히 낱말의 일부다', () => {
    expect(grade("No, I don't.", 'No, I dont.', { strictness: 'char', lang: 'en' }).verdict)
      .not.toBe('correct');
    // 아이패드가 내는 굽은 홑따옴표는 같은 것으로 본다
    expect(grade("No, I don't.", 'No, I don’t.', { strictness: 'full', lang: 'en' }).verdict)
      .toBe('correct');
  });
});
