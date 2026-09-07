export interface View {
  el: HTMLElement;
  /** 화면을 떠날 때 정리할 것 (소리 멈추기, 타이머 해제 등) */
  destroy?: () => void;
  /** 문서 제목 */
  title?: string;
}

export type Params = Record<string, string>;
