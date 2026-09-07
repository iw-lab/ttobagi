import { beforeEach, describe, expect, it, vi } from 'vitest';

/** 용량이 작은 가짜 localStorage — 넘치면 진짜 브라우저처럼 던진다 */
function fakeStorage(limit: number) {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (v.length > limit) throw new Error('QuotaExceededError');
      map.set(k, v);
    },
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

async function freshStore(limit: number) {
  vi.stubGlobal('localStorage', fakeStorage(limit));
  vi.resetModules();
  return import('../src/engine/store');
}

describe('저장소', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('용량이 차면 기록을 실제로 줄여서 저장에 성공한다', async () => {
    const store = await freshStore(3000);
    const list = store.createList('시험표', '3급', ['가나다']);
    for (let i = 0; i < 40; i++) {
      store.saveAttempt({
        id: `a${i}`,
        listId: list.id,
        listTitle: list.title,
        who: '아이',
        mode: 'exam',
        startedAt: i,
        finishedAt: i,
        settings: { strictness: 'char', repeat: 1, rate: 1, gap: 8, inputMode: 'keyboard', allowHint: false, hideScore: false, visualMode: false, visualSeconds: 3, readPunct: false, easyFont: false },
        answers: [{ itemId: 'i1', text: '가나다', verdict: 'correct', confirmed: true, tags: [], elapsed: 1 }],
      });
    }
    // 고정 상수로 자르던 때는 기록이 150개 미만이라 한 개도 못 줄이고 저장이 계속 실패했다
    expect(store.saveFailed()).toBe(false);
    expect(store.getAttempts().length).toBeLessThan(40);
    expect(store.getAttempts().length).toBeGreaterThan(0);
  });

  it('급수표를 지우면 그것을 가리키던 마지막 기록도 따라 지운다', async () => {
    const store = await freshStore(200000);
    const list = store.createList('지울 표', '', ['가']);
    expect(store.getLastListId()).toBe(list.id);
    store.deleteList(list.id);
    expect(store.getLastListId()).toBeUndefined();
  });
});
