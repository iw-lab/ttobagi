/**
 * 인디스쿨 글에 넣을 화면 사진을 «배포본»에서 찍는다.
 *   node scripts/post-shots.mjs            → https://ttobagi.pages.dev
 *   SHOT_BASE=http://localhost:4173/ node scripts/post-shots.mjs
 * 결과 = post-shots/*.png  (글에 넣을 순서대로 번호가 붙는다)
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'post-shots');
const BASE = process.env.SHOT_BASE ?? 'https://ttobagi.pages.dev/';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WIDE = { width: 1280, height: 860, deviceScaleFactor: 2 };
const BOARD = { width: 1600, height: 900, deviceScaleFactor: 2 };

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport(WIDE);
const shot = async (name) => {
  await page.screenshot({ path: resolve(OUT, `${name}.png`) });
  console.log(`  ✓ ${name}.png`);
};
const clickText = async (sel, text) => {
  const ok = await page.evaluate((s, t) => {
    const el = [...document.querySelectorAll(s)].find((e) => e.textContent.includes(t));
    if (!el) return false; el.click(); return true;
  }, sel, text);
  if (!ok) throw new Error(`«${text}» 를 못 찾았다 (${sel})`);
};

const KO = 'c-g3-1-01';
const EN = 'c-e3-1-01';

console.log(`대상 ${BASE}`);

/* 1. 첫 화면 */
await page.goto(BASE, { waitUntil: 'networkidle0' });
await sleep(600);
await shot('01-첫화면');

/* 2. 급수 고르기 */
await page.goto(`${BASE}#/curriculum`, { waitUntil: 'networkidle0' });
await sleep(700);
await shot('02-급수표');

/* 3. 받아쓰기 진행 */
await page.goto(`${BASE}#/run/${KO}?mode=practice`, { waitUntil: 'networkidle0' });
await sleep(900);
await shot('03-받아쓰기');

/* 4. 손글씨(원고지) — 실제로 그어서 찍는다 */
await page.goto(`${BASE}#/run/${KO}?mode=practice`, { waitUntil: 'networkidle0' });
await sleep(900);
await clickText('.input-switch .switch-btn', '손글씨');
await sleep(600);
const pad = await page.$('.pad-canvas');
if (!pad) throw new Error('손글씨 칸이 안 나왔다');
const box = await pad.boundingBox();

// «가을하늘» 네 글자를 칸마다 실제로 긋는다. 붙여넣은 그림이 아니라 그 자리에서 그은 획이다.
const stroke = async (pts) => {
  await page.mouse.move(box.x + pts[0][0], box.y + pts[0][1]);
  await page.mouse.down();
  for (const [x, y] of pts.slice(1)) await page.mouse.move(box.x + x, box.y + y, { steps: 6 });
  await page.mouse.up();
  await sleep(50);
};
const circle = (cx, cy, r) =>
  Array.from({ length: 17 }, (_, i) => {
    const t = (i / 16) * Math.PI * 2;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  });

const cw = box.width / 6;
const cy = box.height / 2;
const glyphs = [
  // 가 — ㄱ + ㅏ
  (x) => [[[x - 34, cy - 30], [x - 8, cy - 32], [x - 16, cy + 12]],
          [[x + 10, cy - 36], [x + 10, cy + 32]],
          [[x + 10, cy - 4], [x + 30, cy - 6]]],
  // 을 — ㅇ + ㅡ + ㄹ
  (x) => [circleAt(x, cy - 24, 11),
          [[x - 18, cy - 4], [x + 18, cy - 5]],
          [[x - 16, cy + 8], [x + 16, cy + 7]],
          [[x + 16, cy + 7], [x - 16, cy + 19]],
          [[x - 16, cy + 19], [x + 16, cy + 20]]],
  // 하 — ㅎ + ㅏ
  (x) => [[[x - 28, cy - 36], [x - 10, cy - 37]],
          [[x - 34, cy - 24], [x - 2, cy - 25]],
          circleAt(x - 18, cy - 2, 11),
          [[x + 14, cy - 36], [x + 14, cy + 32]],
          [[x + 14, cy - 4], [x + 32, cy - 6]]],
  // 늘 — ㄴ + ㅡ + ㄹ
  (x) => [[[x - 16, cy - 34], [x - 16, cy - 12], [x + 16, cy - 13]],
          [[x - 18, cy - 2], [x + 18, cy - 3]],
          [[x - 16, cy + 8], [x + 16, cy + 7]],
          [[x + 16, cy + 7], [x - 16, cy + 19]],
          [[x - 16, cy + 19], [x + 16, cy + 20]]],
];
function circleAt(cx, cyy, r) { return circle(cx, cyy, r); }
for (let i = 0; i < glyphs.length; i++) {
  for (const pts of glyphs[i](cw * (i + 0.5))) await stroke(pts);
}
await sleep(300);
await shot('04-손글씨');

// 방금 그은 획을 그대로 «결과 화면»에 쓴다 — 가짜 그림을 만들어 붙이지 않는다.
const inkPng = await page.evaluate(() => document.querySelector('.pad-canvas')?.toDataURL('image/png') ?? '');
if (!inkPng.startsWith('data:image/png')) throw new Error('손글씨를 가져오지 못했다');
console.log(`  손글씨 ${Math.round(inkPng.length / 1024)}KB 확보`);

/* 5. 결과 — 자모 채점 + 손글씨는 스스로 ○× */
await page.evaluate((ink) => {
  const K = 'ttobagi.v1';
  const s = JSON.parse(localStorage.getItem(K) || '{}');
  s.lists ??= []; s.attempts = (s.attempts || []).filter((a) => !['POST_KO', 'POST_EN'].includes(a.id));
  const S = { repeat: 2, gap: 8, rate: 0.9, readPunct: false, strictness: 'char', inputMode: 'keyboard',
              hideScore: false, allowHint: false, easyFont: false, visualMode: false, visualSeconds: 3 };
  s.attempts.push({ id: 'POST_KO', listId: 'c-g3-1-01', listTitle: '3학년 1학기 1급', lang: 'ko', who: '',
    mode: 'practice', settings: S, startedAt: Date.now() - 90000, finishedAt: Date.now(),
    answers: [
      { itemIndex: 0, expected: '깨끗이', text: '깨끄시', verdict: 'wrong', tags: ['연음'], confirmed: true, elapsed: 1200 },
      { itemIndex: 1, expected: '앉았다', text: '안잤다', verdict: 'wrong', tags: ['겹받침'], confirmed: true, elapsed: 1400 },
      { itemIndex: 2, expected: '학교', text: '학교', verdict: 'correct', tags: [], confirmed: true, elapsed: 800 },
    ] });
  s.attempts.push({ id: 'POST_INK', listId: 'c-g3-1-01', listTitle: '3학년 1학기 1급', lang: 'ko', who: '',
    mode: 'practice', settings: { ...S, inputMode: 'write' }, startedAt: Date.now() - 90000, finishedAt: Date.now(),
    answers: [
      { itemIndex: 0, expected: '가을하늘', text: '', ink, verdict: 'wrong', tags: [], confirmed: false, elapsed: 2000 },
      { itemIndex: 1, expected: '학교', text: '학교', verdict: 'correct', tags: [], confirmed: true, elapsed: 800 },
    ] });
  s.attempts.push({ id: 'POST_EN', listId: 'c-e3-1-01', listTitle: '3학년 1학기 1급', lang: 'en', who: '',
    mode: 'practice', settings: S, startedAt: Date.now() - 90000, finishedAt: Date.now(),
    answers: [
      { itemIndex: 0, expected: 'cat', text: 'cat', verdict: 'correct', tags: [], confirmed: true, elapsed: 900 },
      { itemIndex: 1, expected: 'hat', text: 'hot', verdict: 'wrong', tags: ['모음철자'], confirmed: true, elapsed: 1100 },
      { itemIndex: 2, expected: 'friend', text: 'freind', verdict: 'wrong', tags: ['ie/ei'], confirmed: true, elapsed: 1600 },
    ] });
  localStorage.setItem(K, JSON.stringify(s));
}, inkPng);
await page.goto(`${BASE}#/result/POST_KO`, { waitUntil: 'networkidle0' });
await page.reload({ waitUntil: 'networkidle0' });
await sleep(900);
await shot('05-결과-국어');

/* 5b. 손글씨는 학생이 스스로 ○× */
await page.goto(`${BASE}#/result/POST_INK`, { waitUntil: 'networkidle0' });
await page.reload({ waitUntil: 'networkidle0' });
await sleep(900);
const marks = await page.$$eval('.todo-mark .mark-buttons', (n) => n.length);
if (marks === 0) throw new Error('스스로 채점 단추가 없다');
await shot('06-손글씨-스스로채점');

/* 6. 영어 결과 — 한국어 뜻 */
await page.goto(`${BASE}#/result/POST_EN`, { waitUntil: 'networkidle0' });
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1800);   // 뜻 사전은 영어 기록을 열 때만 따로 온다
const glosses = await page.evaluate(() =>
  [...document.querySelectorAll('.gloss')].map((e) => e.textContent.trim()));
console.log(`  뜻 ${glosses.length}개 — ${glosses.join(' / ')}`);
if (glosses.length === 0) throw new Error('영어 뜻이 안 붙었다 — 사진을 찍을 수 없다');
await shot('07-영어-뜻');

/* 7. 칠판 모드 */
await page.setViewport(BOARD);
await page.goto(BASE, { waitUntil: 'networkidle0' });
await page.evaluate((id) => (location.hash = `#/board/${id}`), KO);
await sleep(1200);
if (!(await page.$('.board-number'))) throw new Error('칠판 화면이 안 열렸다');
await clickText('.board-controls .btn', '정답 보여주기');
await sleep(400);
await shot('08-칠판모드');

/* 8. 인쇄물 */
await page.setViewport(WIDE);
await page.goto(`${BASE}#/print/${KO}`, { waitUntil: 'networkidle0' });
await sleep(700);
await shot('09-인쇄');

/* 9. 기록 — 무엇을 어려워하는지 */
await page.goto(`${BASE}#/report`, { waitUntil: 'networkidle0' });
await sleep(700);
await shot('10-기록');

await browser.close();
console.log('\n끝 — post-shots/');
