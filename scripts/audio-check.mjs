/**
 * 소리 검사 — 「화면이 뜬다」가 아니라 「실제로 발화가 시작되었는가」를 본다.
 *
 * 🔴 이 파일이 왜 생겼나: 퍼피티어 QA 31개를 다 통과한 앱이 교실에서 소리가 안 났다.
 * 화면만 보는 검사는 speechSynthesis 가 조용히 막히는 것을 절대 못 잡는다.
 * 그래서 창이 실제로 뜨는 모드(headless 아님)로 띄우고, 진짜 클릭으로 눌러,
 * utterance 의 start 이벤트가 오는지까지 확인한다.
 */
import puppeteer from 'puppeteer';

const BASE = process.env.QA_BASE ?? 'http://localhost:4173/';
const log = (ok, name, detail = '') =>
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);

let failures = 0;
const check = (ok, name, detail) => {
  if (!ok) failures++;
  log(ok, name, detail);
};

const browser = await puppeteer.launch({
  headless: false,
  // 🔴 pipe: true 가 없으면 이 스크립트가 예외로 끝날 때 크롬이 살아남는다.
  //    2026-09-10 실측: 화면 검사를 몇 번 돌린 뒤 좀비 크롬 34개가 쌓였고,
  //    그것이 웹 브릿지를 굶겨 「입력창 없음」 연쇄 실패를 냈다 — 원인이 브릿지 밖에 있어
  //    로그만 보면 영영 못 찾는다. 부모가 죽으면 파이프가 끊겨 크롬도 같이 죽는다.
  pipe: true,
  args: ['--window-size=1280,900', '--use-fake-ui-for-media-stream'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 발화 이벤트를 페이지 안에서 기록한다 — 문서가 만들어지기 전에 심어야 한다
  await page.evaluateOnNewDocument(() => {
    window.__speech = { spoken: [], started: [], ended: [], errors: [] };
    const Orig = window.SpeechSynthesisUtterance;
    window.SpeechSynthesisUtterance = class extends Orig {
      constructor(text) {
        super(text);
        window.__speech.spoken.push(text);
        this.addEventListener('start', () => window.__speech.started.push(text));
        this.addEventListener('end', () => window.__speech.ended.push(text));
        this.addEventListener('error', (e) => window.__speech.errors.push(`${text}:${e.error}`));
      }
    };
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1200));

  const voices = await page.evaluate(async () => {
    const get = () => speechSynthesis.getVoices();
    if (!get().length) await new Promise((r) => { speechSynthesis.onvoiceschanged = r; setTimeout(r, 1500); });
    return get().filter((v) => v.lang.toLowerCase().startsWith('ko')).map((v) => v.name);
  });
  check(voices.length > 0, '이 기기에 한국어 목소리가 있다', `${voices.length}개`);
  if (!voices.length) {
    console.log('\n  (한국어 음성이 없는 기기다 — 소리 검사는 여기서 멈춘다. 녹음 경로를 쓰면 된다.)');
    process.exit(failures ? 1 : 0);
  }

  // 🔴 클릭은 반드시 퍼피티어가 «진짜로» 눌러야 한다.
  //    page.evaluate 안의 .click() 은 사용자 조작으로 인정되지 않아, 바로 이 버그를 재현하지 못한다.
  const clickText = async (...labels) => {
    for (let i = 0; i < 40; i++) {
      for (const b of await page.$$('button, a')) {
        try {
          const t = (await page.evaluate((n) => n.textContent.trim(), b)) ?? '';
          if (labels.some((l) => t.includes(l))) {
            await b.click();
            return true;
          }
        } catch {
          // 화면이 다시 그려져 떨어져 나간 요소 — 다음 것을 본다
        }
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    return false;
  };

  // 화면 흐름은 여기서 검사할 대상이 아니다(그건 visual-qa 가 한다).
  // 소리만 보기 위해 급수표를 곧장 심고 연습 화면으로 간다.
  const listId = await page.evaluate(() => {
    const now = Date.now();
    const id = 'l-sound';
    localStorage.setItem(
      'ttobagi.v1',
      JSON.stringify({
        lists: [
          {
            id,
            title: '소리 검사',
            level: '',
            items: [{ id: 'i-sound', text: '학교' }],
            createdAt: now,
            updatedAt: now,
          },
        ],
        attempts: [],
        who: '검사',
      }),
    );
    return id;
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await page.evaluate((id) => {
    location.hash = `#/run/${id}?mode=practice`;
  }, listId);
  await new Promise((r) => setTimeout(r, 1200));

  {
    check(await clickText('들려주세요', '읽어 주기'), '「들려주세요」를 눌렀다');
    await new Promise((r) => setTimeout(r, 3500));
    const s = await page.evaluate(() => window.__speech);
    check(s.spoken.length > 0, '발화를 요청했다', `${s.spoken.length}건`);
    check(
      s.started.length > 0,
      '소리가 실제로 시작되었다 (start 이벤트)',
      s.started.length ? s.started[s.started.length - 1] : `errors=${s.errors.join(',') || '없음'}`,
    );
    check(s.errors.length === 0, '발화 오류가 없다', s.errors.join(',') || '없음');
  }

  /* ── 내장 급수표: 미리 구운 음원이 실제로 재생되는가 ── */
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1280, height: 900 });
  await page2.evaluateOnNewDocument(() => {
    window.__audio = { played: [], errors: [] };
    const origPlay = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function (...a) {
      const src = this.src;
      return origPlay.apply(this, a).then(
        (r) => {
          window.__audio.played.push(src);
          return r;
        },
        (e) => {
          window.__audio.errors.push(`${src}:${e.name}`);
          throw e;
        },
      );
    };
  });
  // 배포본에서는 networkidle2 가 끝나지 않는 경우가 있다(서비스워커·자산 선반입).
  // 화면만 그려지면 눌러 볼 수 있으므로 domcontentloaded 로 충분하다.
  await page2.goto(BASE, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1200));
  await page2.evaluate(() => (location.hash = '#/curriculum'));
  await new Promise((r) => setTimeout(r, 700));

  const clickIn = async (pg, sel, label) => {
    for (const b of await pg.$$(sel)) {
      try {
        const t = (await pg.evaluate((n) => n.textContent.trim(), b)) ?? '';
        if (t.includes(label)) {
          await b.click();
          return true;
        }
      } catch {
        /* 다시 그려진 요소 */
      }
    }
    return false;
  };

  check(await clickIn(page2, '.level-actions button', '연습'), '내장 급수표에서 연습을 열었다');
  await new Promise((r) => setTimeout(r, 900));
  check(await clickIn(page2, 'button', '들려주세요'), '내장 급수표에서 들려주세요를 눌렀다');
  await new Promise((r) => setTimeout(r, 2500));
  const a = await page2.evaluate(() => window.__audio);
  check(a.played.length > 0, '미리 구운 음원이 실제로 재생되었다', a.played[0]?.split('/').slice(-3).join('/') ?? `errors=${a.errors.join(',')}`);
  check(a.errors.length === 0, '음원 재생 오류가 없다', a.errors.join(',') || '없음');

  console.log(`\n소리 검사 ${failures ? `실패 ${failures}건` : '전부 통과'}`);
} finally {
  await browser.close();
}
process.exit(failures ? 1 : 0);
