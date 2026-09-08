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

  // 정답을 보여 줄 때 띄어쓰기·문장부호가 사라지면 안 된다.
  // 낱말 급수표로 검사하면 공백이 없어 통과해 버리므로 «문장» 급수표에서 확인한다.
  await page.evaluate(() => (location.hash = '#/run/c-g5-2-01?mode=practice'));
  await sleep(600);
  await page.type('.answer-input', '아무렇게나 쓴 답');
  await clickText(page, 'button.btn.big', '확인');
  await sleep(400);
  const revealShown = await page.evaluate(() => {
    const el = document.querySelector('.feedback .answer-reveal');
    return el ? el.textContent.replace(/^정답:\s*/, '') : '';
  });
  step(
    '정답이 띄어쓰기·문장부호까지 그대로 나온다',
    revealShown === '출석을 부르자 모두 큰 소리로 대답했다.',
    revealShown || '(비어 있음)',
  );
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

  // 자동 진행이 «읽는 도중에» 다음 문항으로 넘어가면 말이 잘린다.
  // 3번 읽기 · 5초 간격으로 켜 두고, 문항마다 실제로 세 번을 다 읽었는지 센다.
  const paced = await page.evaluate(async () => {
    const setSel = (labelText, value) => {
      const label = [...document.querySelectorAll('.board-settings label')].find((l) => l.textContent.includes(labelText));
      const sel = label?.querySelector('select');
      if (!sel) return false;
      sel.value = value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    if (!setSel('읽기', '3') || !setSel('간격', '5')) return { skipped: true };

    const number = () => document.querySelector('.board-number')?.textContent ?? '';
    const counts = new Map();
    // «끝까지 읽은» 횟수만 센다. 시작만 세면, 세 번째를 읽다가 잘려도 3번으로 보인다.
    const finish = (at) => counts.set(at, (counts.get(at) ?? 0) + 1);

    // 소리는 내지 않고 시간만 흉내낸다. 1.8초 = 실제 문장 한 번 읽는 시간.
    // 중간에 멈추면(cancel·pause) 끝난 것으로 세지 않는다 — 그게 곧 «말이 잘렸다»이다.
    const pending = new Set();
    const schedule = (done) => {
      const job = { at: number() };
      job.timer = setTimeout(() => { pending.delete(job); finish(job.at); done(); }, 1800);
      pending.add(job);
      return job;
    };
    const abortAll = () => {
      for (const job of pending) clearTimeout(job.timer);
      pending.clear();
    };
    const origSpeak = speechSynthesis.speak.bind(speechSynthesis);
    const origCancel = speechSynthesis.cancel.bind(speechSynthesis);
    speechSynthesis.speak = (u) => schedule(() => u.onend?.(new Event('end')));
    speechSynthesis.cancel = () => { abortAll(); origCancel(); };
    const origPlay = HTMLAudioElement.prototype.play;
    const origPause = HTMLAudioElement.prototype.pause;
    HTMLAudioElement.prototype.play = function () {
      schedule(() => this.dispatchEvent(new Event('ended')));
      return Promise.resolve();
    };
    HTMLAudioElement.prototype.pause = function () { abortAll(); return origPause.call(this); };

    [...document.querySelectorAll('.board-controls .btn')].find((b) => b.textContent.includes('자동 진행'))?.click();
    let last = number();
    let changes = 0;
    for (let i = 0; i < 150; i++) {
      await new Promise((r) => setTimeout(r, 200));
      if (number() !== last) { changes++; last = number(); }
      if (changes >= 2) break;
    }
    [...document.querySelectorAll('.board-controls .btn')].find((b) => b.textContent.includes('자동 멈춤'))?.click();
    abortAll();
    speechSynthesis.speak = origSpeak;
    speechSynthesis.cancel = origCancel;
    HTMLAudioElement.prototype.play = origPlay;
    HTMLAudioElement.prototype.pause = origPause;

    // 마지막 문항은 아직 읽는 중일 수 있으니 «넘어간» 문항만 본다
    const done = [...counts.entries()].slice(0, changes);
    return { changes, done: done.map(([k, v]) => `${k}:${v}`), short: done.filter(([, v]) => v < 3).length };
  });
  step(
    '자동 진행이 읽기를 끊지 않는다',
    !paced.skipped && paced.changes >= 1 && paced.short === 0,
    paced.skipped ? '설정을 찾지 못함' : `${paced.done.join(' ')} (3번씩 읽어야 함)`,
  );

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

  /* ── 14. 낡은 내장 급수표 사본 ── */
  console.log('\n[14] 낡은 사본');
  await page.evaluate(() => {
    // 예전 판이 저장해 둔 «출석» 낱말 사본을 일부러 심는다.
    // 이 사본 때문에 «새 문장을 들려주고 옛 낱말로 채점»하는 사고가 났었다.
    const raw = JSON.parse(localStorage.getItem('ttobagi.v1') || '{}');
    raw.lists = [
      ...(raw.lists ?? []),
      {
        id: 'c-g5-2-01',
        title: '한자어 표기',
        level: '5학년 2학기 · 1급',
        items: [{ id: 'g5-2-01-01', text: '출석' }],
        createdAt: 0,
        updatedAt: 0,
      },
    ];
    localStorage.setItem('ttobagi.v1', JSON.stringify(raw));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(800);
  const staleGone = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('ttobagi.v1') || '{}');
    return !(raw.lists ?? []).some((l) => l.id.startsWith('c-'));
  });
  step('낡은 내장 급수표 사본이 사라진다', staleGone);

  await page.evaluate(() => (location.hash = '#/run/c-g5-2-01?mode=practice'));
  await sleep(700);
  await clickText(page, 'button.btn.ghost', ['보여주기', '힌트']);
  const answerNow = await page.evaluate(() => {
    // 연습 모드에서 아무 답이나 내면 정답이 드러난다
    const input = document.querySelector('.answer-input');
    if (input) input.value = 'ㅁㅁ';
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('확인') || b.textContent.includes('다 했어요'));
    btn?.click();
    return true;
  });
  await sleep(500);
  const revealed = await page.evaluate(() => document.body.innerText);
  step(
    '내장 급수표가 지금의 문장으로 채점된다',
    answerNow && revealed.includes('출석을 부르자') && !/정답:\s*출석\s*$/m.test(revealed),
    revealed.includes('출석을 부르자') ? '문장으로 채점' : '낱말로 채점되고 있다',
  );

  /* ── 14b. 옛 기록(그때의 정답이 없는 것) ── */
  // 급수표를 고치면, 옛 기록의 ○×·태그는 그때의 문장에 대한 판정이다.
  // 거기에 «지금» 문장을 정답이라고 붙여 놓으면 「정답과 쓴 것이 같은데 ×」가 된다.
  const legacyId = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('ttobagi.v1') || '{}');
    const id = 'legacyqa1';
    raw.attempts = [
      {
        id,
        listId: 'c-g5-2-01',
        listTitle: '한자어 표기',
        who: '검사',
        mode: 'practice',
        settings: JSON.parse(JSON.stringify(raw.settings ?? {})),
        answers: [
          {
            itemId: 'g5-2-01-03',
            text: '각자 맡은 역할을 성실히 해냈다.',
            verdict: 'wrong',
            tags: ['띄어쓰기', '글자더함'],
            confirmed: true,
            elapsed: 1000,
          },
        ],
        startedAt: 0,
        finishedAt: Date.now(),
      },
      ...(raw.attempts ?? []),
    ];
    localStorage.setItem('ttobagi.v1', JSON.stringify(raw));
    return id;
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(500);
  await page.evaluate((id) => (location.hash = `#/result/${id}`), legacyId);
  await sleep(600);
  const legacyView = await page.evaluate(() => ({
    text: document.body.innerText,
    icons: [...document.querySelectorAll('.result-icon')].map((e) => e.textContent.trim()),
    tags: document.querySelectorAll('.tag').length,
  }));
  step(
    '옛 기록은 ○×·태그를 보여 주지 않는다',
    !legacyView.icons.some((i) => i === '×' || i === '○') && legacyView.tags === 0,
    `${legacyView.icons.join('') || '없음'} · 태그 ${legacyView.tags}개`,
  );
  step('옛 기록은 점수 대신 「지난 기록」이라고 말한다', legacyView.text.includes('지난 기록'));
  step('옛 기록에도 아이가 쓴 것은 남아 있다', legacyView.text.includes('각자 맡은 역할을 성실히 해냈다'));
  await shot(page, '16-legacy');
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('ttobagi.v1') || '{}');
    raw.attempts = (raw.attempts ?? []).filter((a) => a.id !== 'legacyqa1');
    localStorage.setItem('ttobagi.v1', JSON.stringify(raw));
  });

  /* ── 14c. 어느 화면에서도 첫 화면으로 ── */
  // 화면마다 「처음으로」가 있기도 없기도 해서, 급수표를 고치다 나갈 데가 없었다.
  console.log('\n[14c] 첫 화면으로 돌아가기');
  const routes = [
    ['#/', '첫 화면'],
    ['#/curriculum', '학년별 급수표'],
    ['#/lists', '내 급수표'],
    ['#/list/new', '새 급수표'],
    [`#/list/${listId}`, '급수표 고치기'],
    [`#/print/${listId}`, '인쇄물'],
    ['#/report', '내 기록'],
    ['#/settings', '설정'],
  ];
  const missing = [];
  for (const [hash, name] of routes) {
    await page.evaluate((h) => (location.hash = h), hash);
    await sleep(320);
    const ok = await page.evaluate(() => {
      const home = document.querySelector('.appbar-home');
      if (!home) return false;
      const r = home.getBoundingClientRect();
      return r.width > 0 && r.height >= 40 && home.getAttribute('href') === '#/';
    });
    if (!ok) missing.push(name);
  }
  step('모든 화면에 첫 화면 단추가 있다', missing.length === 0, missing.join(', ') || `${routes.length}개 화면 확인`);

  await page.evaluate(() => (location.hash = '#/'));
  await sleep(300);
  const homeWorks = await page.evaluate(async () => {
    location.hash = '#/report';
    await new Promise((r) => setTimeout(r, 250));
    document.querySelector('.appbar-home').click();
    await new Promise((r) => setTimeout(r, 350));
    return location.hash === '#/' || location.hash === '';
  });
  step('첫 화면 단추를 누르면 실제로 간다', homeWorks);
  await shot(page, '17-appbar');

  /* ── 15. 접근성 기본 ── */
  console.log('\n[15] 접근성');
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(400);
  const small = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, a.btn, input, select')];
    return els
      .filter((el) => {
        // 체크박스는 상자가 아니라 «상자를 감싼 라벨»이 실제로 누르는 곳이다
        const target =
          (el.type === 'checkbox' || el.type === 'radio') && el.closest('label') ? el.closest('label') : el;
        const r = target.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.height < 40;
      })
      .map((el) => `${el.className || el.tagName}:${Math.round(el.getBoundingClientRect().height)}px`);
  });
  step('작은 터치 목표가 없다', small.length === 0, small.join(', ') || '0개');
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
