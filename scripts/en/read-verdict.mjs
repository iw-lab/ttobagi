/**
 * 교차검증 출력 파일에서 «판정»을 꺼낸다.
 *
 * 🔴 그냥 JSON.parse 하면 안 되는 이유: 재시도가 일어나면 파일 안에 응답이 둘 이어 붙는다
 *    (`{"n": 5{"n": 51, "bad": […]}`). 전체 파싱은 실패하는데 뒤쪽 판정은 멀쩡하다.
 *    마지막으로 «온전히 파싱되는» 판정을 쓴다.
 *
 * 🔴 「검사한 줄 수(n)」가 보낸 개수와 다르면 **그 배치는 통째로 버린다.**
 *    번호가 하나만 밀려도 `rows[n-1]` 이 다른 문항을 가리켜 «멀쩡한 문항»이 지워진다.
 *    검증에서 가장 나쁜 실패는 못 잡는 것이 아니라 **엉뚱한 것을 잡는 것**이다.
 */
import { existsSync, readFileSync } from 'node:fs';

export function readVerdict(path, wantCount) {
  if (!existsSync(path)) return { ok: false, why: '파일없음' };
  const raw = readFileSync(path, 'utf8').split('\n---\n')[0].replace(/^```json\s*|```\s*$/g, '').trim();
  const cands = [...raw.matchAll(/\{\s*"n"\s*:\s*\d+\s*,\s*"bad"\s*:\s*\[[\s\S]*?\]\s*\}/g)].map((m) => m[0]);
  for (const c of cands.reverse()) {
    try {
      const d = JSON.parse(c);
      if (!Array.isArray(d.bad)) continue;
      if (wantCount !== undefined && Number(d.n) !== wantCount) return { ok: false, why: `개수불일치(${d.n}≠${wantCount})` };
      return { ok: true, data: d };
    } catch { /* 다음 후보 */ }
  }
  return { ok: false, why: 'JSON깨짐' };
}
