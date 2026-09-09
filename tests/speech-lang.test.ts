import { describe, it, expect } from 'vitest';
import { baseLang } from '../src/engine/speech';

describe('목소리 언어 가려내기', () => {
  it('한국어는 어떤 꼴로 와도 ko 다', () => {
    for (const tag of ['ko', 'ko-KR', 'ko_KR', 'KO-kr']) expect(baseLang(tag)).toBe('ko');
  });

  it('🔴 인도 콘칸어(kok-IN)를 한국어로 세지 않는다', () => {
    // 사용자 기기에서 「코카니어 인도」 2개가 한국어 목소리로 잡혀 있었다(2026-09-10).
    // startsWith('ko') 로 견주면 여기서 통과해 버린다.
    expect(baseLang('kok-IN')).not.toBe('ko');
    expect(baseLang('kos')).not.toBe('ko');
  });

  it('영어는 en 이고, 중세영어(enm)는 아니다', () => {
    expect(baseLang('en-US')).toBe('en');
    expect(baseLang('en-GB')).toBe('en');
    expect(baseLang('enm')).not.toBe('en');
  });
});
