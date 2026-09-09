/**
 * 영어 받아쓰기 급수표 240개의 «뼈대»를 만든다 — 문항은 아직 없다.
 *
 * 근거: 2022 개정 영어과 교육과정(초등 3~6학년). 학기당 30급 × 8학기 = 240급,
 * 급수당 10문항 = 2,400문항. 권장 어휘가 800~900낱말이라 이보다 늘리면 교육과정 밖으로 나간다.
 *
 * 🔴 초점(FOCUS)은 학기마다 **15개**다. 처음엔 국어를 따라 8개로 했는데,
 *    30급이면 같은 초점이 3~4번 돌아온다. 국어는 그래도 되지만(문장 급수가 대부분이라
 *    소재만 바꾸면 안 겹친다) **영어는 낱말 급수가 절반이고 파닉스 낱말 풀이 작다** —
 *    「단모음 o」로 쓸 수 있는 초등 낱말은 dog·box·top·hot… 30개 남짓이다.
 *    실제로 8개로 돌렸더니 받은 문항 975개 중 **390개가 중복**이었다(2026-09-09).
 *    초점을 15개로 늘려 학기마다 정확히 2번씩만 돌게 했다.
 *
 * 🔴 국어와 달리 «기존 급수»가 없다 — 그래서 급수 번호는 1부터다.
 */
import { writeFileSync } from 'node:fs';

const WORD = 'word', SENT = 'sent';

// 🔴 낱말 급수는 두 종류다. «파닉스» 급수는 짧은 낱말이 목적이고(cat·pig·top),
//    «어휘» 급수는 교육과정 낱말이라 길다(Wednesday 9자·grandmother 11자·chicken 7자).
//    한 자로 재면 어느 한쪽이 통째로 죽는다 — 처음에 6자로 걸었더니 요일·달·동물이 다 탈락했다.
//    ⚠️ 이름으로 알아내지 말고 **급수마다 못박는다**(국어에서 「낱말/문장」을 제목으로 판정하다 사고 났다).
const PHON = 'phonics', VOCAB = 'vocab';

/**
 * 🔴 «닫힌 어휘» 초점 — 쓸 수 있는 낱말이 스무 개 남짓뿐인 것들.
 *    초점은 학기마다 두 번 돌아오므로 낱말 급수 2개 × 10칸 = 20칸인데,
 *    초등 색깔 낱말은 18개다. **산수로 채울 수 없다.**
 *    실측(2026-09-10): 색깔·동물·음식·자연 급수가 「앞 급수가 그 낱말을 먼저 썼다」로
 *    통째로 버려졌다. 요일(7개)·달(12개)에서 이미 같은 일을 겪고 문장으로 돌렸는데,
 *    나머지를 놓쳤다 — «후보 수 < 필요 칸 수»인 초점은 전부 같은 병이다.
 *    그래서 **두 번째 급수는 그 낱말이 든 문장**으로 돌린다. 낱말 → 문장은 순서로도 옳다.
 */
const CLOSED_VOCAB = new Set(['색깔', '숫자', '동물', '음식', '학용품', '가족', '몸', '옷',
  '집과방', '날씨', '직업', '장소', '운동취미', '감정', '자연', '반대말']);

const FOCUS = {
  3: {
    1: [
      ['단모음a', 'a 소리가 나는 낱말', WORD, PHON],
      ['단모음i', 'i 소리가 나는 낱말', WORD, PHON],
      ['단모음o', 'o 소리가 나는 낱말', WORD, PHON],
      ['단모음u', 'u 소리가 나는 낱말', WORD, PHON],
      ['단모음e', 'e 소리가 나는 낱말', WORD, PHON],
      ['색깔', '색깔을 나타내는 낱말', WORD, VOCAB],
      ['숫자', '수를 나타내는 낱말', WORD, VOCAB],
      ['동물', '동물을 나타내는 낱말', WORD, VOCAB],
      ['음식', '먹을 것을 나타내는 낱말', WORD, VOCAB],
      ['학용품', '학교에서 쓰는 물건 낱말', WORD, VOCAB],
      ['인사말', '인사하고 답하는 문장'],
      ['I am', '나를 소개하는 문장'],
      ['It is', '무엇인지 말하는 문장'],
      ['짧은물음', '짧게 묻는 문장 (Do you like it? / Is it a cat?)'],
      // 🔴 「짧게 답하는 문장」만 쓰면 생성기가 그냥 짧은 평서문을 낸다(I am happy.).
      //    교차검증 두 계열이 같은 급수에서 이걸 F(포인트 불일치)로 무더기로 잡았다 —
      //    급수 명세가 모호하면 «틀린 문항»이 아니라 «틀린 급수»가 만들어진다.
      ['짧은대답', '짧게 답하는 말 (Yes, I do. / No, it is not. 처럼)'],
    ],
    2: [
      ['첫겹자음1', 'bl·cl·fl 로 시작하는 낱말', WORD, PHON],
      ['첫겹자음2', 'st·sp·sk 로 시작하는 낱말', WORD, PHON],
      ['끝겹자음', 'nd·nt·mp 로 끝나는 낱말', WORD, PHON],
      ['묵음e', '끝의 e 는 소리가 없다', WORD, PHON],
      ['긴모음ai', 'ai 와 ay 소리가 나는 낱말', WORD, PHON],
      // 🔴 낱말 급수로 두면 안 된다 — 요일은 «일곱 개뿐»인데 급수마다 10문항이고
      //    초점은 학기마다 두 번 돌아온다(20칸). 산수로 채울 수 없다.
      //    문장으로 두면 첫 글자 대문자 연습은 그대로 하면서 문항이 얼마든지 나온다.
      ['요일', '요일 이름이 든 문장 (첫 글자는 큰 글자)'],
      ['달이름', '달 이름이 든 문장 (첫 글자는 큰 글자)'],
      ['가족', '가족을 나타내는 낱말', WORD, VOCAB],
      ['몸', '몸의 부분을 나타내는 낱말', WORD, VOCAB],
      ['옷', '입는 것을 나타내는 낱말', WORD, VOCAB],
      ['This is', '가리켜 말하는 문장'],
      ['I like', '좋아하는 것을 말하는 문장'],
      ['I have', '가진 것을 말하는 문장'],
      ['부탁', '부탁하고 시키는 문장'],
      ['짧은문장', '짧은 문장 두루 쓰기'],
    ],
  },
  4: {
    1: [
      ['긴모음ee', 'ee 와 ea 소리가 나는 낱말', WORD, PHON],
      ['긴모음oa', 'oa 와 ow 소리가 나는 낱말', WORD, PHON],
      ['sh·ch', 'sh 와 ch 소리가 나는 낱말', WORD, PHON],
      ['th·wh', 'th 와 wh 소리가 나는 낱말', WORD, PHON],
      ['복수형', '여럿을 나타내는 -s 와 -es', WORD, PHON],
      ['집과방', '집과 방을 나타내는 낱말', WORD, VOCAB],
      ['날씨', '날씨를 나타내는 낱말', WORD, VOCAB],
      ['can문장', '할 수 있는 것을 말하는 문장'],
      ['What의문', '무엇인지 묻고 답하는 문장'],
      ['HowMany', '몇 개인지 묻고 답하는 문장'],
      ['계절', '계절을 말하는 문장'],
      ['좋아하는것', '좋아하고 싫어하는 것을 말하는 문장'],
      ['하는일', '무엇을 하는지 말하는 문장'],
      ['있고없음', '있고 없음을 말하는 문장'],
      ['종합', '두루 살펴 쓰는 문장'],
    ],
    2: [
      ['ar·or', 'ar 과 or 소리가 나는 낱말', WORD, PHON],
      ['er·ir·ur', 'er·ir·ur 소리가 나는 낱말', WORD, PHON],
      ['묵음kw', '소리 나지 않는 k 와 w 가 든 낱말', WORD, PHON],
      ['묵음bl', '소리 나지 않는 b 와 l 이 든 낱말', WORD, PHON],
      ['직업', '일하는 사람을 나타내는 낱말', WORD, VOCAB],
      ['장소', '장소를 나타내는 낱말', WORD, VOCAB],
      ['운동취미', '운동과 취미를 나타내는 낱말', WORD, VOCAB],
      ['-ing문장', '하고 있는 일을 말하는 문장'],
      ['Where의문', '어디인지 묻고 답하는 문장'],
      ['When의문', '언제인지 묻고 답하는 문장'],
      ['시각', '몇 시인지 말하는 문장'],
      ['위치', '어디에 있는지 말하는 문장'],
      ['길묻기', '길을 묻고 알려 주는 문장'],
      ['하루일과', '하루 일을 말하는 문장'],
      ['종합', '두루 살펴 쓰는 문장'],
    ],
  },
  5: {
    1: [
      ['oo두소리', 'oo 가 내는 두 가지 소리', WORD, PHON],
      ['ou·ow', 'ou 와 ow 소리가 나는 낱말', WORD, PHON],
      ['oi·oy', 'oi 와 oy 소리가 나는 낱말', WORD, PHON],
      ['겹자음규칙', '자음을 겹쳐 쓰는 낱말', WORD, PHON],
      ['-le끝', '-le 과 -el 로 끝나는 낱말', WORD, PHON],
      ['감정', '마음을 나타내는 낱말', WORD, VOCAB],
      ['자연', '자연을 나타내는 낱말', WORD, VOCAB],
      ['과거형ed', '지난 일을 말하는 문장'],
      ['동음이의', '소리가 같고 뜻이 다른 낱말이 든 문장'],
      ['부탁허락', '부탁하고 허락하는 문장'],
      ['비교하기', '둘을 견주어 말하는 문장'],
      ['이유말하기', '까닭을 말하는 문장'],
      ['권유하기', '함께 하자고 말하는 문장'],
      ['경험말하기', '겪은 일을 말하는 문장'],
      ['종합', '두루 살펴 쓰는 문장'],
    ],
    2: [
      ['ie·ei', 'ie 와 ei 를 가려 쓰는 낱말', WORD, PHON],
      ['y→ies', 'y 가 i 로 바뀌는 낱말', WORD, PHON],
      ['묵음gh', '소리 나지 않는 gh 가 든 낱말', WORD, PHON],
      ['묵음th', '소리 나지 않는 t 와 h 가 든 낱말', WORD, PHON],
      ['축약형', "it's·don't 처럼 줄여 쓴 낱말", WORD],
      ['반대말', '뜻이 반대인 낱말', WORD, VOCAB],
      ['자주틀리는말', '철자를 자주 틀리는 낱말', WORD, VOCAB],
      ['비교급', '-er 로 견주는 문장'],
      ['최상급', '-est 로 가장 어떠한지 말하는 문장'],
      ['Who의문', '누구인지 묻고 답하는 문장'],
      ['Why의문', '왜인지 묻고 답하는 문장'],
      ['How의문', '어떻게인지 묻고 답하는 문장'],
      ['일과말하기', '하루 일을 차례로 말하는 문장'],
      ['계획말하기', '앞으로 할 일을 말하는 문장'],
      ['종합', '두루 살펴 쓰는 문장'],
    ],
  },
  6: {
    1: [
      ['-tion', '-tion 과 -sion 으로 끝나는 낱말', WORD, PHON],
      ['접두사', 'un- 과 re- 가 붙은 낱말', WORD, PHON],
      ['접미사', '-ful 과 -less 가 붙은 낱말', WORD, PHON],
      ['긴낱말', '음절이 여럿인 긴 낱말', WORD, VOCAB],
      ['불규칙과거', '모양이 바뀌는 지난 일 낱말', WORD, PHON],
      ['불규칙과거문장', '모양이 바뀌는 지난 일을 말하는 문장'],
      ['will문장', '앞으로 할 일을 말하는 문장'],
      ['begoingto', '하려고 하는 일을 말하는 문장'],
      ['이어주는말', 'and·but·because 로 이은 문장'],
      ['장래희망', '되고 싶은 것을 말하는 문장'],
      ['제안하기', '제안하고 답하는 문장'],
      ['설명하기', '무엇인지 설명하는 문장'],
      ['비교대조', '둘을 견주어 설명하는 문장'],
      ['감정표현', '마음을 전하는 문장'],
      ['종합', '두루 살펴 쓰는 문장'],
    ],
    2: [
      ['헷갈리는짝', 'quiet/quite 처럼 헷갈리는 낱말', WORD, VOCAB],
      ['복합어', '두 낱말이 붙어 만들어진 낱말', WORD, VOCAB],
      ['자주틀리는말2', '철자를 자주 틀리는 긴 낱말', WORD, VOCAB],
      ['부사ly', '-ly 가 붙어 만들어진 낱말', WORD, PHON],
      ['대문자부호', '큰 글자와 문장 부호를 갖춘 문장'],
      ['인용문장', '남의 말을 옮겨 적는 문장'],
      ['안내설명', '안내하고 설명하는 문장'],
      ['감사사과', '고마움과 미안함을 전하는 문장'],
      ['초대약속', '초대하고 약속하는 문장'],
      ['문제해결', '어려움과 해결을 말하는 문장'],
      ['이야기문장', '이야기 속 문장'],
      ['소개문장', '사람과 장소를 소개하는 문장'],
      ['의견말하기', '생각을 말하는 문장'],
      ['긴문장', '두 가지를 이어 붙인 긴 문장'],
      ['종합', '마무리 종합 문장'],
    ],
  },
};

const TOPIC = [
  'school', 'family', 'friends', 'animals', 'food', 'colors', 'weather',
  'seasons', 'sports', 'hobbies', 'home', 'my town', 'travel', 'the body',
  'clothes', 'toys', 'music', 'nature', 'feelings', 'daily life',
];

// 길이는 «글자 수»(공백 포함)다. 영어는 한글보다 글자가 길어 국어 기준을 그대로 쓰면
// 3학년 문장이 두 낱말에서 끊긴다.
const SENT_LEN = { 3: [6, 22], 4: [10, 30], 5: [14, 40], 6: [18, 52] };
const PHON_LEN = { 3: [2, 6], 4: [3, 8], 5: [3, 10], 6: [4, 14] };
const VOCAB_LEN = { 3: [2, 11], 4: [3, 12], 5: [3, 13], 6: [4, 16] };

const SEMESTERS = [];
for (let g = 3; g <= 6; g++) for (const s of [1, 2]) SEMESTERS.push([g, s]);

const PER_SEMESTER = 30;
const sheets = [];
for (const [g, s] of SEMESTERS) {
  const focus = FOCUS[g][s];
  if (focus.length !== 15) throw new Error(`${g}-${s} 초점이 ${focus.length}개 — 15개여야 한다`);
  for (let level = 1; level <= PER_SEMESTER; level++) {
    const k = level - 1;
    const fi = k % focus.length;
    const [point, rawBase, rawKind = SENT, wordClass = PHON] = focus[fi];
    // 닫힌 어휘 초점의 «두 번째» 급수는 문장으로 돌린다 (첫 번째는 그대로 낱말)
    const second = level > focus.length;
    const closed = rawKind === WORD && CLOSED_VOCAB.has(point);
    const kind = closed && second ? SENT : rawKind;
    const base = closed && second ? `${rawBase.replace(/ 낱말$/, '')}이 든 문장` : rawBase;
    const topic = TOPIC[(k * 7 + g * 3 + s) % TOPIC.length];
    const [minLen, maxLen] = kind === SENT
      ? SENT_LEN[g]
      : (wordClass === VOCAB ? VOCAB_LEN[g] : PHON_LEN[g]);
    sheets.push({
      id: `e${g}-${s}-${String(level).padStart(2, '0')}`,
      grade: g, semester: s, level,
      point,
      title: `${topic} · ${base}`,
      kind, minLen, maxLen,
      topic, base,
      // 🔴 같은 초점끼리 «한 배치»로 묶으려고 둔다 — 그래야 모델이 두 급수를 한눈에 보고
      //    서로 겹치지 않게 짓는다. 따로 물으면 같은 낱말이 두 번 나온다.
      group: `${g}-${s}-${String(fi).padStart(2, '0')}`,
    });
  }
}
writeFileSync('/tmp/gen-en/sheets.json', JSON.stringify(sheets, null, 1));
const groups = new Set(sheets.map((s) => s.group));
const words = sheets.filter((s) => s.kind === 'word').length;
console.log(`영어 급수표 뼈대 ${sheets.length}개 · 학기당 ${PER_SEMESTER}개 · 초점 묶음 ${groups.size}개`);
console.log(`낱말 급수 ${words} · 문장 급수 ${sheets.length - words} · 목표 문항 ${sheets.length * 10}개`);
