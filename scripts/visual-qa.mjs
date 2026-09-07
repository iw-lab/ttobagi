/**
 * 실측 QA — 진짜 브라우저(Chrome)를 띄워 앱을 처음부터 끝까지 눌러 본다.
 *
 * «만들었다»와 «된다»는 다르다. 이 스크립트는 화면을 실제로 조작하고, 콘솔 오류를 모으고,
 * 기기 세 종류(휴대폰 · 웨일북 · 전자칠판) 크기로 그림을 남긴다. 결과는 qa-report.json.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SHOTS = resolve(ROOT, 'qa-shots');
const BASE = process.env.QA_BASE ?? 'http://localhost:4173/';

mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  whalebook: { width: 1366, height: 768, deviceScaleFactor: 1 },
  board: { width: 1920, height: 1080, deviceScaleFactor: 1 },
};

const report = { base: BASE, startedAt: new Date().toISOString(), steps: [], console: [], shots: [] };
let failures = 0;

function step(name, ok, detail = '') {
  report.steps.push({ name, ok, detail });
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

async function shot(page, name) {
  const file = resolve(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  report.shots.push(`qa-shots/${name}.png`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 화면에 보이는 글자로 단추를 찾아 누른다 (사람이 하는 것과 같은 방식) */
async function clickText(page, selector, text) {
  const wants = Array.isArray(text) ? text : [text];
  return page.evaluate(
    (sel, list) => {
      const el = [...document.querySelectorAll(sel)].find((n) =>
        list.some((w) => n.textContent?.includes(w)),
      );
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    },
    selector,
    wants,
  );
}

async function textOf(page, selector) {
  return page.$eval(selector, (el) => el.textContent?.trim() ?? '').catch(() => '');
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-ui-for-media-stream'],
});

try {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORTS.whalebook);
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      report.console.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    report.console.push({ type: 'pageerror', text: String(err) });
  });

  /* ── 1. 첫 화면 ── */
  console.log('\n[1] 첫 화면');
  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  const loadMs = Date.now() - t0;
  report.loadMs = loadMs;
  step('첫 화면이 뜬다', (await textOf(page, 'h1')).includes('또박이'), `${loadMs}ms`);
  step('역할 카드 4개', (await page.$$('.home-card')).length === 4);
  await shot(page, '01-home');

  /* ── 2. 학년별 급수표에서 담기 ── */
  console.log('\n[2] 급수표 담기');
  await page.evaluate(() => (location.hash = '#/curriculum'));
  await sleep(300);
  step('학년별 급수표 화면', (await textOf(page, 'h1')) === '급수표');
  const levelRows = (await page.$$('.level-row')).length;
  step('급수가 펼쳐져 있다', levelRows > 0, `${levelRows}급`);
  const added = await clickText(page, '.level-actions button', '담기');
  await sleep(500);
  step('학년별 급수표를 담았다', added && (await textOf(page, 'h1')) === '급수표');
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('ttobagi.v1') || '{}');
    location.hash = `#/list/${raw.lists[0].id}`;
  });
  await sleep(400);
  step('담은 급수표를 열었다', (await textOf(page, 'h1')) === '급수표 고치기');
  const itemCount = (await page.$$('.item-row')).length;
  step('문항이 편집기에 들어왔다', itemCount > 0, `${itemCount}문항`);
  await sleep(400);
  const qrExists = (await page.$('.qr svg')) !== null;
  step('공유 QR이 만들어졌다', qrExists);
  const shareUrl = await page.$eval('.share-url', (el) => el.value).catch(() => '');
  step('공유 링크에 급수표가 담겼다', shareUrl.includes('#/open?c=T1'), `${shareUrl.length}자`);
  await shot(page, '02-list-edit');

  /* ── 3. 공유 링크 왕복 ── */
  console.log('\n[3] 공유 링크 왕복');
  const listPage = await browser.newPage();
  await listPage.setViewport(VIEWPORTS.whalebook);
  await listPage.goto(shareUrl, { waitUntil: 'networkidle0' });
  await sleep(600);
  const previewItems = (await listPage.$$('.preview-list li')).length;
  step('다른 기기에서 링크를 열면 급수표가 보인다', previewItems > 0, `${previewItems}문항`);
  await shot(listPage, '03-share-open');
  await listPage.close();

  /* ── 4. 연습 모드 채점 ── */
  console.log('\n[4] 연습 — 자판으로 쓰고 채점');
  const listId = await page.evaluate(() => JSON.parse(localStorage.getItem('ttobagi.v1')).lists[0].id);
  const firstText = await page.evaluate(() => JSON.parse(localStorage.getItem('ttobagi.v1')).lists[0].items[0].text);
  await page.evaluate((id) => (location.hash = `#/run/${id}?mode=practice`), listId);
  await sleep(400);
  step('연습 화면이 열린다', (await textOf(page, '.run-title')).includes('1번'));

  await page.type('.answer-input', firstText);
  await clickText(page, 'button.btn.big', '확인');
  await sleep(300);
  const verdict = await textOf(page, '.verdict');
  step('정답을 맞히면 정답이라고 한다', verdict.includes('정답'), verdict);
  await shot(page, '04-practice-correct');

  await clickText(page, '.feedback button.btn', '다음 문항');
  await sleep(300);
  await page.type('.answer-input', '아무거나틀린답');
  await clickText(page, 'button.btn.big', '확인');
  await sleep(300);
  const wrongVerdict = await textOf(page, '.verdict');
  const tagCount = (await page.$$('.feedback .tag')).length;
  step('틀리면 오답 유형까지 알려준다', wrongVerdict.length > 0 && tagCount > 0, `${wrongVerdict} / 태그 ${tagCount}개`);
  await shot(page, '05-practice-wrong');

  /* ── 5. 끝까지 풀고 결과 ── */
  console.log('\n[5] 결과 화면');
  for (let i = 0; i < 40; i++) {
    const done = await page.evaluate(() => location.hash.startsWith('#/result/'));
    if (done) break;
    const advanced = await clickText(page, '.feedback button.btn', ['다음 문항', '결과 보기']);
    if (!advanced) {
      await page.type('.answer-input', '가나다');
      // 마지막 문항의 단추 이름은 «다 했어요» 다
      await clickText(page, 'button.btn.big', ['확인', '다 했어요']);
    }
    await sleep(180);
  }
  step('끝까지 풀면 결과가 나온다', await page.evaluate(() => location.hash.startsWith('#/result/')));
  const score = await textOf(page, '.result-head h1');
  step('점수가 표시된다', /\d+\s*\/\s*\d+/.test(score), score);
  const rows = (await page.$$('.result-row')).length;
  step('문항별 결과가 나온다', rows > 0, `${rows}행`);
  await shot(page, '06-result');

  const retryBtn = await clickText(page, 'button.btn', '다시 쓰기');
  await sleep(300);
  step('틀린 것만 다시 쓰기로 넘어간다', retryBtn && (await page.evaluate(() => location.hash.includes('mode=retry'))));

  /* ── 6. 글자 블록 입력 ── */
  console.log('\n[6] 글자 블록 입력');
  await page.evaluate((id) => (location.hash = `#/run/${id}?mode=practice`), listId);
  await sleep(300);
  // 답을 쓰는 방법은 화면 위 전환기로 고른다(설정 서랍에 숨겨 두면 아무도 못 찾는다)
  const switchBtns = (await page.$$('.switch-btn')).length;
  step('답 쓰는 방법이 화면에 보인다', switchBtns === 3, `${switchBtns}개`);
  step('글자 블록으로 바꿨다', await clickText(page, '.switch-btn', '글자 블록'));
  await sleep(300);
  const tiles = (await page.$$('.tile')).length;
  step('글자 블록이 나온다', tiles > 0, `${tiles}개`);
  await shot(page, '07-blocks');

  /* ── 7. 손글씨 칸 ── */
  console.log('\n[7] 손글씨');
  step('손글씨로 바꿨다', await clickText(page, '.switch-btn', '손글씨'));
  await sleep(300);
  const pad = await page.$('.pad-canvas');
  step('손글씨 칸이 나온다', pad !== null);
  if (pad) {
    const box = await pad.boundingBox();
    await page.mouse.move(box.x + 40, box.y + 60);
    await page.mouse.down();
    await page.mouse.move(box.x + 90, box.y + 100, { steps: 8 });
    await page.mouse.move(box.x + 140, box.y + 50, { steps: 8 });
    await page.mouse.up();
    await sleep(150);
    const drew = await page.evaluate(() => {
      const c = document.querySelector('.pad-canvas');
      const ctx = c.getContext('2d');
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let dark = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 100 && d[i + 1] < 100) dark++;
      return dark;
    });
    step('그린 획이 실제로 남는다', drew > 100, `${drew}px`);
  }
  await shot(page, '08-writing');

  /* ── 8. 칠판 모드 ── */
  console.log('\n[8] 칠판 모드');
  await page.setViewport(VIEWPORTS.board);
  await page.evaluate((id) => (location.hash = `#/board/${id}`), listId);
  await sleep(400);
  step('칠판 화면이 열린다', (await page.$('.board-number')) !== null);
  const boardBtn = await page.$('.board-controls .btn');
  const boardBtnBox = boardBtn ? await boardBtn.boundingBox() : null;
  step('칠판 단추가 크다(터치용)', !!boardBtnBox && boardBtnBox.height >= 64, boardBtnBox ? `${Math.round(boardBtnBox.height)}px` : '');
  await clickText(page, '.board-controls .btn', '정답 보여주기');
  await sleep(200);
  const answerShown = await textOf(page, '.board-answer');
  step('정답 공개가 된다', answerShown.length > 0, answerShown);
  await shot(page, '09-board');

  /* ── 9. 인쇄물 ── */
  console.log('\n[9] 인쇄물');
  await page.setViewport(VIEWPORTS.whalebook);
  await page.evaluate((id) => (location.hash = `#/print/${id}`), listId);
  await sleep(400);
  const cells = (await page.$$('.sheet-cell')).length;
  step('시험지 격자가 만들어진다', cells > 0, `${cells}칸`);
  await clickText(page, 'button.btn.ghost.small', '따라 쓰기');
  await sleep(250);
  const traceChars = (await page.$$('.trace-char')).length;
  step('따라쓰기 시트가 만들어진다', traceChars > 0, `${traceChars}자`);
  await shot(page, '10-print');

  /* ── 10. 기록·통계 ── */
  console.log('\n[10] 기록');
  await page.evaluate(() => (location.hash = '#/report'));
  await sleep(400);
  const bars = (await page.$$('.bar-row')).length;
  step('오답 유형 통계가 나온다', bars > 0, `${bars}종`);
  await shot(page, '11-report');

  /* ── 11. 설정·개인정보 ── */
  console.log('\n[11] 설정');
  await page.evaluate(() => (location.hash = '#/settings'));
  await sleep(400);
  const privacy = await page.evaluate(() => document.body.textContent.includes('서버가 없습니다'));
  step('개인정보 안내가 있다', privacy);
  await shot(page, '12-settings');

  /* ── 12. 휴대폰 화면 ── */
  console.log('\n[12] 휴대폰 크기');
  await page.setViewport(VIEWPORTS.phone);
  await page.evaluate(() => (location.hash = '#/'));
  await sleep(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  step('가로 스크롤이 생기지 않는다', overflow <= 1, `${overflow}px`);
  await shot(page, '13-phone-home');
  await page.evaluate((id) => (location.hash = `#/run/${id}?mode=practice`), listId);
  await sleep(400);
  await shot(page, '14-phone-run');

  /* ── 13. 오프라인 ── */
  console.log('\n[13] 오프라인');
  await page.setViewport(VIEWPORTS.whalebook);
  await page.evaluate(() => (location.hash = '#/'));
  await sleep(300);
  const swReady = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg;
  });
  step('서비스 워커가 등록된다', swReady);
  if (swReady) {
    await page.evaluate(() => navigator.serviceWorker.ready);
    await sleep(700);
    await page.setOfflineMode(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(700);
    const offlineOk = (await textOf(page, 'h1')).includes('또박이');
    step('인터넷을 끊어도 앱이 열린다', offlineOk);
    const listsAlive = await page.evaluate(() => {
      const raw = localStorage.getItem('ttobagi.v1');
      return raw ? JSON.parse(raw).lists.length : 0;
    });
    step('끊긴 채로도 급수표가 남아 있다', listsAlive > 0, `${listsAlive}개`);
    await shot(page, '15-offline');
    await page.setOfflineMode(false);
  }

  /* ── 14. 접근성 기본 ── */
  console.log('\n[14] 접근성');
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(400);
  const smallTargets = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, a.btn, input, select')];
    return els.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.height < 40;
    }).length;
  });
  step('작은 터치 목표가 없다', smallTargets === 0, `${smallTargets}개`);
  const langOk = await page.evaluate(() => document.documentElement.lang === 'ko');
  step('문서 언어가 한국어', langOk);
} catch (err) {
  step('예상치 못한 오류', false, String(err));
} finally {
  await browser.close();
}

report.finishedAt = new Date().toISOString();
report.failures = failures;
report.consoleErrors = report.console.filter((c) => c.type !== 'warning').length;
writeFileSync(resolve(ROOT, 'qa-report.json'), JSON.stringify(report, null, 2));

console.log(`\n검사 ${report.steps.length}개 · 실패 ${failures}개 · 콘솔 오류 ${report.consoleErrors}개`);
if (report.console.length) {
  console.log('콘솔 기록:');
  for (const c of report.console.slice(0, 12)) console.log(`  [${c.type}] ${c.text.slice(0, 200)}`);
}
process.exit(failures > 0 || report.consoleErrors > 0 ? 1 : 0);
