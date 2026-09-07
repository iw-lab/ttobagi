import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CURRICULUM, builtinList, toWordList } from '../src/engine/curriculum';

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

async function freshStore(seed?: unknown) {
  const s = fakeStorage();
  if (seed) s.setItem('ttobagi.v1', JSON.stringify(seed));
  vi.stubGlobal('localStorage', s);
  vi.resetModules();
  const store = await import('../src/engine/store');
  const { builtinList: resolver } = await import('../src/engine/curriculum');
  store.setBuiltinResolver(resolver);
  return store;
}

describe('내장 급수표', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('id 로 곧바로 만들어진다 — 저장소를 거치지 않는다', async () => {
    const store = await freshStore();
    const sheet = CURRICULUM.find((c) => c.id === 'g5-2-01')!;
    const got = store.getList('c-g5-2-01');
    expect(got).toBeTruthy();
    expect(got!.items.map((i) => i.text)).toEqual(sheet.items);
    // 아무것도 저장하지 않았어야 한다
    expect(store.getLists()).toHaveLength(0);
  });

  it('내장 급수표는 항상 지금의 문항을 돌려준다', async () => {
    // 이 앱이 실제로 낸 사고: 저장해 둔 사본이 낡아 «새 문장을 들려주고 옛 낱말로 채점»했다.
    const store = await freshStore();
    for (const sheet of CURRICULUM) {
      const got = store.getList(`c-${sheet.id}`);
      expect(got!.items.map((i) => i.text), sheet.id).toEqual(sheet.items);
    }
  });

  it('예전 판이 저장해 둔 내장 급수표 사본은 불러올 때 버린다', async () => {
    const stale = {
      lists: [
        { id: 'c-g5-2-01', title: '한자어 표기', level: '', items: [{ id: 'x', text: '출석' }], createdAt: 0, updatedAt: 0 },
        { id: 'l-mine', title: '우리 반 급수표', level: '', items: [{ id: 'y', text: '학교' }], createdAt: 0, updatedAt: 0 },
      ],
      attempts: [],
    };
    const store = await freshStore(stale);
    const ids = store.getLists().map((l) => l.id);
    expect(ids).not.toContain('c-g5-2-01'); // 낡은 사본은 사라지고
    expect(ids).toContain('l-mine'); // 교사가 만든 것은 그대로 남는다
    // 그리고 그 id 로 물으면 지금의 문항이 온다
    expect(store.getList('c-g5-2-01')!.items[0].text).toBe(CURRICULUM.find((c) => c.id === 'g5-2-01')!.items[0]);
  });

  it('음원 경로와 문항이 같은 급수표에서 나온다', async () => {
    // 문항은 A에서, 소리는 B에서 오는 상태가 이번 버그의 본질이었다
    const list = toWordList(CURRICULUM.find((c) => c.id === 'g5-2-01')!);
    list.items.forEach((item, i) => {
      expect(item.audio).toContain(`audio/g5-2-01/${String(i + 1).padStart(2, '0')}.mp3`);
    });
    expect(builtinList('c-g5-2-01')!.items[0].text).toBe(list.items[0].text);
  });
});
