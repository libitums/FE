// 문자 막간 메신저 화면의 계약입니다(ADR-0088 보충) — 표시 모델 · props · 테스트 id.

import type { SafeAreaInsets } from "../../lib/safe-area";

/** 표시할 글 한 벌입니다 — 채움(이름 · 나라)이 끝난 값입니다. */
export type StoryChatText = { readonly ko: string; readonly en: string };

export type StoryChatMessage = {
  readonly kind: "message";
  /** 자기(`플레이어`) 메시지면 오른쪽 말풍선입니다. */
  readonly self: boolean;
  readonly speaker: string;
  readonly text: StoryChatText;
  /** 해석이 끝난 사진 주소 — 없거나 해석하지 못하면 `null`. */
  readonly imageUrl: string | null;
  /** 바로 앞 답장에서 이 보기(1부터)를 고른 때만 나옵니다. */
  readonly afterOption: number | null;
};

export type StoryChatReply = {
  readonly kind: "reply";
  readonly options: readonly [StoryChatText, ...StoryChatText[]];
};

export type StoryChatTurn = StoryChatMessage | StoryChatReply;

export type StoryChatView = {
  readonly counterpart: string;
  /** 상대 아바타 그림 — 콘텐츠 `profiles`에 없거나 해석하지 못하면 `null`(이니셜). */
  readonly counterpartAvatarUrl: string | null;
  readonly turns: readonly [StoryChatTurn, ...StoryChatTurn[]];
};

/** 화면에 쌓인 말풍선 하나입니다. */
export type StoryChatLogItem = {
  readonly id: string;
  readonly direction: "incoming" | "outgoing";
  readonly speaker: string;
  readonly text: StoryChatText;
  readonly imageUrl: string | null;
};

export type StoryChatProgress = {
  readonly log: readonly StoryChatLogItem[];
  /** 다음에 올 메시지 — 없으면 답장 차례이거나 끝입니다. */
  readonly next: StoryChatMessage | null;
  /** 기다리는 답장 — 없으면 메시지 차례이거나 끝입니다. */
  readonly awaiting: StoryChatReply | null;
};

export type StoryMessengerScreenProps = {
  readonly insets: SafeAreaInsets;
  readonly chat: StoryChatView;
  /** 마지막 뒤 「Finish story」 — 한 번만 부릅니다. */
  readonly onComplete: () => void;
  readonly onExit: () => void;
};

export type StoryMessengerCopy = {
  readonly back: string;
  readonly typing: (speaker: string) => string;
  readonly replyTitle: string;
  /** 시트 닫기 낭독 — 답장 시트는 닫기를 그리지 않지만 시트 계약이 요구합니다. */
  readonly closeReply: string;
  /** 입력창 보내기 단추의 낭독입니다(늘 꺼져 있습니다). */
  readonly send: string;
  /** 칠 수 없는 입력창의 자리 글입니다. */
  readonly composerPlaceholder: string;
  readonly finish: string;
};

export const storyMessengerTestIds = {
  screen: "story-messenger-screen",
  header: "story-messenger-header",
  title: "story-messenger-title",
  back: "story-messenger-back",
  log: "story-messenger-log",
  incoming: "story-messenger-incoming",
  outgoing: "story-messenger-outgoing",
  photo: "story-messenger-photo",
  typing: "story-messenger-typing",
  option: (index: number) => `story-messenger-option-${index}`,
  composer: "story-messenger-composer",
  composerField: "story-messenger-composer-field",
  finish: "story-messenger-finish",
} as const;
