import { describe, expect, it } from 'vitest';
import { decode, encodeList, payloadToList } from '../src/engine/share';
import type { WordList } from '../src/engine/types';

const list: WordList = {
  id: 'l1',
  title: '2학년 3급',
  level: '3급',
  items: [
    { id: 'i1', text: '나는 학교에 갑니다.' },
    { id: 'i2', text: '꽃잎이 바람에 날린다.', point: '연음' },
  ],
  createdAt: 0,
  updatedAt: 0,
};

function pack(json: string): string {
  const b64 = Buffer.from(json, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `T1p${b64}`;
}

describe('공유 코드', () => {
  it('급수표를 넣었다 빼도 그대로다', async () => {
    const code = await encodeList(list);
    const payload = await decode(code);
    expect(payload.t).toBe('l');
    const back = payloadToList(payload as never);
    expect(back.title).toBe(list.title);
    expect(back.items.map((i) => i.text)).toEqual(list.items.map((i) => i.text));
    expect(back.items[1].point).toBe('연음');
  });

  it('영어 급수표는 과목까지 실려 간다', async () => {
    // 🔴 이게 빠지면 받는 쪽에서 영어 문항이 한글 자모 규칙으로 채점된다.
    const en: WordList = { ...list, lang: 'en', items: [{ id: 'i1', text: 'I like apples.' }] };
    const back = payloadToList((await decode(await encodeList(en))) as never);
    expect(back.lang).toBe('en');
  });

  it('과목이 없는 옛 링크는 국어로 연다', async () => {
    // 이 칸이 생기기 전에 만들어진 링크는 전부 국어다. 기본값을 영어로 기울이면 안 된다.
    const back = payloadToList((await decode(await encodeList(list))) as never);
    expect(back.lang).toBe('ko');
  });

  it('알맹이가 빈 코드는 열지 않는다', async () => {
    // 형태만 맞고 문항이 없는 코드를 통과시키면 화면에서 payload.i.map 이 터진다
    await expect(decode(pack('{"t":"l"}'))).rejects.toThrow();
    await expect(decode(pack('{"t":"l","i":[]}'))).rejects.toThrow();
    await expect(decode(pack('{"t":"l","i":[1,2]}'))).rejects.toThrow();
    await expect(decode(pack('{"t":"r"}'))).rejects.toThrow();
    await expect(decode(pack('{"t":"x"}'))).rejects.toThrow();
    await expect(decode('그냥 아무 글자')).rejects.toThrow();
  });

  it('결과 코드는 알맹이 모양까지 확인한다', async () => {
    await expect(decode(pack('{"t":"r","a":[["문항","답",1]]}'))).resolves.toBeTruthy();
    await expect(decode(pack('{"t":"r","a":[["문항","답"]]}'))).rejects.toThrow();
  });
});
