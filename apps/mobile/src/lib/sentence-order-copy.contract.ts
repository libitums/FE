// 문장 순서 화면의 문구표 구획 타입입니다(타입만). 값은 `ui-copy-en-learning.ts`가 집니다.

export type SentenceOrderCopy = {
  readonly instruction: string;
  /** 놓인 조각의 낭독 — 서수 접미 대신 `position n` */
  readonly placedChip: (text: string, position: number) => string;
  /**
   * 대화 조립(대화 순서 문항)의 화자 이름입니다 — 짝수 칸이 `counterpart`, 홀수 칸이 `me`입니다.
   * 콘텐츠에 턴별 화자 정보가 없어 앱이 번갈아 가정하므로, 에피소드 상대 이름이 아닌 일반 이름입니다.
   */
  readonly dialogueSpeaker: { readonly counterpart: string; readonly me: string };
  /** 놓인 말풍선의 낭독 — 화자 · 몇 번째 말 · 내용 */
  readonly dialogueTurn: (speaker: string, position: number, text: string) => string;
  /** 아직 비어 있는 칸의 낭독 — 화자 · 몇 번째 말 */
  readonly dialogueEmptyTurn: (speaker: string, position: number) => string;
};
