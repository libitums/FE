// 메신저 1.5단계 문구 구획 타입입니다(messenger-chat-1-5 spec §9). `MessengerChatCopy`가 세 줄로 이어 받습니다.

/** 내 말풍선 도구 줄 · 뜻 · 교정 카드. */
export type MyMessageCopy = {
  readonly meaningButton: string;
  readonly fixButton: string;
  readonly fixButtonNew: string;
  readonly expanded: string;
  readonly collapsed: string;
  readonly loadingMeaning: string;
  readonly loadingFix: string;
  readonly better: string;
  readonly fixLabel: (corrected: string, explanation: string) => string;
};

/** 하루 무료 수 · 엽전 보내기 · 다 쓴 판. */
export type TurnsCopy = {
  readonly freeLeft: (left: number, total: number) => string;
  readonly lastFree: string;
  readonly used: string;
  readonly coinEach: (price: number, reset: string) => string;
  readonly reset: (hours: number, minutes: number) => string;
  readonly strip: (price: number) => string;
  readonly goUnlimited: string;
  readonly outTitle: (total: number) => string;
  readonly outBody: (reset: string) => string;
  readonly keepChatting: string;
  readonly perMessage: (price: number) => string;
  readonly keepChattingLabel: (price: number) => string;
  readonly backToChats: string;
  readonly balance: (count: number) => string;
  readonly coinSendLabel: (price: number) => string;
  /** 잔액이 가격보다 모자랄 때 엽전 보내기 단추의 낭독 이름 — 누르면 상점이 열립니다(접근성 M9). */
  readonly coinSendShortLabel: string;
};

/** 새 친구 시트. */
export type NewFriendCopy = {
  readonly newFriend: string;
  readonly episodeChip: (episode: number) => string;
  readonly metIn: (episode: number, title: string) => string;
  readonly reply: string;
  readonly later: string;
  readonly sheetLabel: (name: string) => string;
};
