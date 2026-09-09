import type { ErrorTag, Lang, Strictness, Verdict } from './grade';

export type { Lang } from './grade';

/** 문항 하나 — 낱말·어절·문장 무엇이든 된다 */
export interface Item {
  id: string;
  text: string;
  /** 교사가 붙이는 학습 포인트 (예: 겹받침) */
  point?: string;
  /**
   * 미리 구워 둔 음원의 경로(내장 급수표만 갖는다).
   * 이게 있으면 브라우저 목소리에 기대지 않고 그 파일을 재생한다 —
   * 기기마다 목소리가 있고 없고가 다른 문제를 아예 비켜 간다.
   */
  audio?: string;
}

/** 급수표 한 벌 */
export interface WordList {
  id: string;
  title: string;
  /** 자유 문자열 — "2학년 1학기 3급" 처럼 학교마다 다르게 쓴다 */
  level: string;
  /**
   * 어느 과목인가. 없으면 국어다 — 사용자 기기에 이미 저장된 급수표에는 이 칸이 없고,
   * 그것들은 전부 국어다. 🔴 여기서 기본값을 바꾸면 교실의 옛 급수표가 그날로 영어로 채점된다.
   */
  lang?: Lang;
  items: Item[];
  createdAt: number;
  updatedAt: number;
}

export type InputMode = 'write' | 'keyboard' | 'blocks';

export const INPUT_MODE_LABEL: Record<InputMode, string> = {
  write: '손글씨',
  keyboard: '자판',
  blocks: '글자 블록',
};

/** 진행 설정 — 교사가 학급 사정에 맞춰 고친다 */
export interface RunSettings {
  /** 읽어 주는 횟수 */
  repeat: number;
  /** 문항 사이 기다리는 시간(초) */
  gap: number;
  /** 읽기 속도 */
  rate: number;
  /** 마침표·물음표를 소리 내어 읽을지 */
  readPunct: boolean;
  strictness: Strictness;
  inputMode: InputMode;
  /** 점수를 감추고 «해냈어요»만 보여줄지 */
  hideScore: boolean;
  /** 초성 힌트 허용 (연습 모드 전용) */
  allowHint: boolean;
  /** 난독증 친화 글꼴·자간 */
  easyFont: boolean;
  /** 듣기 대신 «잠깐 보여주고 가리기» — 난청 학생용 */
  visualMode: boolean;
  /** 잠깐 보여주는 시간(초) */
  visualSeconds: number;
}

export const DEFAULT_SETTINGS: RunSettings = {
  repeat: 2,
  gap: 8,
  rate: 0.9,
  readPunct: false,
  strictness: 'char',
  inputMode: 'keyboard',
  hideScore: false,
  allowHint: false,
  easyFont: false,
  visualMode: false,
  visualSeconds: 3,
};

/** 한 문항에 대한 학생의 답 */
export interface AnswerRecord {
  itemId: string;
  /**
   * 응시 «그 순간»의 정답. 급수표가 나중에 바뀌어도 지난 결과가 흔들리지 않게 함께 남긴다.
   * (실제로 내장 급수표의 문항을 낱말에서 문장으로 바꾸었더니, 지난 기록이 새 문항으로
   *  다시 채점되어 아이가 맞게 쓴 답이 오답으로 뒤집혔다 — 2026-09-07.)
   */
  expected?: string;
  /** 자판·블록 입력이면 글자, 손글씨면 '' */
  text: string;
  /** 손글씨 썸네일 (dataURL). 손글씨 답안일 때만 */
  ink?: string;
  verdict: Verdict;
  tags: ErrorTag[];
  /** 손글씨는 사람이 확정하기 전까지 임시다 */
  confirmed: boolean;
  /** 걸린 시간(ms) */
  elapsed: number;
}

export type RunMode = 'exam' | 'practice' | 'retry';

export const RUN_MODE_LABEL: Record<RunMode, string> = {
  exam: '시험',
  practice: '연습',
  retry: '오답 다시 쓰기',
};

/** 한 번의 시험·연습 기록 */
export interface Attempt {
  id: string;
  listId: string;
  listTitle: string;
  /**
   * 응시 «그 순간»의 과목. 급수표가 지워져도 지난 결과를 같은 규칙으로 다시 볼 수 있어야 한다.
   * 없으면 국어 — 이 칸이 생기기 전의 기록은 전부 국어다.
   */
  lang?: Lang;
  /** 학생 이름 대신 쓰는 표시 이름 — 번호·별명 등 학교가 정한다 */
  who: string;
  mode: RunMode;
  settings: RunSettings;
  answers: AnswerRecord[];
  startedAt: number;
  finishedAt: number;
}

export interface AppState {
  lists: WordList[];
  attempts: Attempt[];
  settings: RunSettings;
  /** 이 기기에서 쓰는 표시 이름 */
  who: string;
  /** 마지막으로 본 급수표 */
  lastListId?: string;
}

export function newId(prefix = ''): string {
  const rnd = crypto.getRandomValues(new Uint8Array(8));
  return prefix + Array.from(rnd, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
}
