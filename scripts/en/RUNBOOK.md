# 영어 급수표 만드는 공정

국어 공정(`scripts/*.mjs`)과 같은 모양이다. 다른 점은 셋뿐이다.

1. **철자를 기계가 검사한다** — 낱말 목록 37만 개(`.cache/words_alpha.txt`, 퍼블릭 도메인).
   국어에는 이런 목록이 없어 교차검증에만 기댔지만, 영어는 그 앞에 결정론 그물이 하나 더 있다.
2. **같은 초점 급수끼리 한 배치로 묶는다** — 흩어 놓으면 같은 낱말이 두 번 나온다(실측 중복 40%).
3. **음원은 piper `en_US-ljspeech-high`** — 퍼블릭 도메인이라 상업적 이용에 걸리지 않는다.
   국어의 Supertonic 으로 영어를 읽히면 한국어 음운으로 읽어 «배우는 데 해롭다».

## 순서

```bash
# 0) 낱말 목록 (없을 때만)
curl -sL -o scripts/en/.cache/words_alpha.txt \
  https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt

# 1) 뼈대 → 배치
node scripts/en/plan-sheets.mjs
node scripts/en/make-batch.mjs

# 2) 생성 (두 통은 별개 쿼터다. --batch 로 한 번에 — 단발 루프는 레이트리밋에 걸린다)
#    🔴 gpt 쪽은 15건 이하로 쪼개서 여러 번 띄운다 — 긴 배치는 세션이 상한다
node scripts/en/split-jobs.mjs /tmp/gen-en/gpt.jsonl 15
~/.claude/venvs/vibes/bin/python ~/.claude/bin/gpt-web.py \
  --batch /tmp/gen-en/gpt.jsonl --chat-every 12 --gap 18 --retries 3 --min-chars 120
~/.claude/venvs/vibes/bin/python ~/.claude/bin/gemini-web.py \
  --batch /tmp/gen-en/gemini.jsonl --chat-every 12 --gap 18 --retries 3 --min-chars 120

# 3) 끊긴 것 잇기 — 🔴 「파일이 있다」가 아니라 「파싱되고 급수가 다 들어 있다」로 본다
node scripts/en/resume-batch.mjs      # → *-resume.jsonl 로 2) 반복

# 4) 기계 검증 + 모으기 (여유분까지 전부. 여기서 10개로 자르지 않는다)
node scripts/en/assemble-sheets.mjs

# 5) 모자란 급수 보충 (이미 쓴 것을 보여 주고 겹치지 말라고 한다)
node scripts/en/make-topup.mjs        # → *-topup.jsonl 로 2) 반복 → 4) 다시

# 6) 교차검증 — 지은 쪽이 아닌 계열이 본다
node scripts/en/make-xval-batch.mjs
#   gemini 가 gpt 생성분을, gpt 가 gemini 생성분을, codex 는 전량을
~/.claude/venvs/vibes/bin/python ~/.claude/bin/gemini-web.py --batch /tmp/gen-en/xval-gemini.jsonl --chat-every 12 --gap 18 --retries 3 --min-chars 20
~/.claude/venvs/vibes/bin/python ~/.claude/bin/gpt-web.py    --batch /tmp/gen-en/xval-gpt.jsonl    --chat-every 12 --gap 18 --retries 3 --min-chars 20
scripts/en/run-codex-xval.sh /tmp/gen-en/xval-codex.jsonl
node scripts/en/resume-xval.mjs       # → *-resume.jsonl 로 반복

# 7) 병합 → 확정 → 파일에 쓰기
node scripts/en/merge-xval.mjs        # 지적된 것과 «검사 안 된 것»을 구분해 낸다
node scripts/en/finalize-sheets.mjs   # 빼고 → 10개 고르고 → 번호를 «한 번만» 다시 매긴다
node scripts/en/emit-curriculum.mjs   # src/engine/curriculum-en.ts

# 8) 검증
npx tsc --noEmit && npx vitest run

# 9) 음원 (piper, 로컬·무료)
node scripts/en/build-audio.mjs --jobs 8
node scripts/en/check-audio.mjs       # 없음·무음·길이 이상

# 10) 화면 검사 → 배포
npm run preview &                     # 🔴 npm run qa 는 프리뷰를 안 띄운다
npm run qa
npm run deploy
QA_BASE=https://ttobagi.pages.dev/ node scripts/visual-qa.mjs
```

## 함정 (전부 실제로 밟았다)

- 🔴 **길이 상한을 눈대중으로 걸지 마라.** 3학년 낱말을 6자로 걸었더니 `chicken`·`Tuesday`·
  `Wednesday` 가 통째로 탈락했다. 파닉스 급수(짧은 낱말이 목적)와 어휘 급수(교육과정 낱말이
  길다)는 자가 다르다 — 급수마다 `PHON`/`VOCAB` 으로 못박는다.
- 🔴 **«후보 수 < 필요 칸 수»인 초점을 낱말 급수로 두지 마라.** 초점은 학기마다 두 번 돌아오니
  낱말 급수 하나에 10칸이면 **20개**가 필요하다. 요일은 7개, 색깔은 18개, 초등 동물·음식도
  스무 개 남짓이다 — 산수로 못 채운다. 이런 초점은 **두 번째 급수를 문장으로** 돌린다
  (`CLOSED_VOCAB`). 낱말 → 문장은 배우는 순서로도 옳다.
  ⚠️ 이 실수를 세 번 했다(요일 → 달 → 색깔·동물·음식·자연). **급수를 설계할 때
  「이 초점으로 쓸 수 있는 낱말이 몇 개인가」를 먼저 세라.**
- 🔴 **낱말 중복은 같은 학습 포인트 안에서만 본다.** 권장 어휘 800~900낱말로 낱말 문항 1,140칸을
  전부 다르게 채우는 것은 산수로 불가능하다. 「색깔」 급수와 「단모음e」 급수에 red 가 각각
  나오는 것은 복습이다 — 막아야 할 단조로움은 **같은 초점끼리 겹치는 것**뿐이다.
  문장은 사실상 무한하므로 겹치면 생성기의 실패다 — 전역으로 본다.
- 🔴 **`--timeout 120` 을 반드시 준다.** gpt-web 의 기본값은 **300초**라, 세션이 상해 응답이
  영영 안 올 때 «5분을 기다린 뒤에야» 재시도한다. 배치 하나가 그렇게 되면 레인 전체가 멈춘
  것처럼 보인다(2026-09-10 실측: 첫 배치에서 5분 30초를 서 있었고, 120초로 줄이자 31초에 통과).
  🔴 교훈: **레인이 멈춘 것처럼 보이면 「죽었나」를 묻기 전에 「얼마나 기다리게 되어 있나」를 보라.**
- 🔴 **교차검증 배치는 `--min-chars 10`.** 깨끗한 배치의 정답은 `{"n":52,"bad":[]}` = **17자**다.
  20으로 걸면 «가장 깨끗한 배치»가 거절로 버려진다 — 깨끗할수록 버려지는 구조가 된다.
  거절문(48~170자)은 길이가 아니라 **브릿지의 거절 판정기 + 하류의 JSON 파싱**이 잡는다.
  (보충 배치도 같은 이유로 `MINCHARS=50`.)
- 🔴 **브릿지의 최소 글자 수 게이트를 높게 걸지 마라.** 낱말 급수 두 개는 응답이 200자 안팎이라
  기준 200 에서 «정상 응답 198자»가 거절로 버려졌다. 거절문은 48~170자다. 120 이 안전하고,
  잘못 들어온 것은 어차피 하류의 JSON 검사가 잡는다.
- 🔴 **`npm run build` 는 base 가 `/ttobagi/` 다.** 프리뷰(`/`)에서 열면 자산을 못 찾아
  **빈 화면**이 뜬다. 프리뷰·QA·배포는 전부 `APP_BASE=/`.
- 🔴 **아포스트로피는 부호가 아니라 철자다.** 국어용 `PUNCT_RE` 를 그대로 쓰면
  `don't` 와 `dont` 가 같은 말이 된다. 아이폰이 바꾸는 굽은 `’` 는 `'` 로 되돌린다.
- 🔴 **브릿지를 돌리기 전에 `~/.claude/bin/preflight-gate.sh .` 를 한 번 돌려라.**
  「좀비 크롬 N개」와 「퍼펫티어 pipe:true 누락」을 그 자리에서 알려 준다 —
  이 두 줄이 오늘 밤 브릿지를 40분 태운 원인을 곧장 짚었다.
- 🔴 **화면 검사(퍼피티어)를 돌린 뒤에는 크롬이 남아 있는지 세라.** 브라우저를 안 닫고 끝난
  스크립트가 쌓이면(실측 34개) 웹 브릿지가 **「입력창 없음」으로 연쇄 실패**한다.
  브릿지가 죽었다고 브릿지를 의심하기 전에 먼저 확인할 것 —
  `ps aux | grep -c '[p]uppeteer/chrome'` · 치우기 `pkill -f 'puppeteer/chrome'`.
  (브릿지 로그만 보면 원인이 브릿지 밖에 있다는 걸 영영 알 수 없다.)
