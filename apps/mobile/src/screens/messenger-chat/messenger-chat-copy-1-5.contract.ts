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
};

/** 하루 무료 수 · 엽전 보내기 · 다 쓴 판. */
/** 요금은 서버 규칙(ADR-0155) — 체험 인물의 체험 수 · 그 밖은 메시지 요금. 하루 · 다시 무료까지의 시간은 없습니다. */
export type TurnsCopy = {
  /** 체험 남은 수(체험 인물). */
  readonly freeLeft: (left: number, total: number) => string;
  /** 체험 남은 수를 아직 모를 때. */
  readonly trialFree: string;
  readonly lastFree: string;
  readonly used: string;
  readonly coinEach: (price: number) => string;
  readonly strip: (price: number) => string;
  readonly outTitle: (total: number) => string;
  readonly outBody: (price: number) => string;
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
