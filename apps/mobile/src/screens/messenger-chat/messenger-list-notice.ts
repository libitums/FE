// 메신저 목록 아래 한 번 보이는 안내입니다(ADR-0127) — 선톡 푸시로 온 방을 열 수 없을 때.

export type MessengerListNotice = "chat-unavailable";

/** 안내가 보이는 시간입니다. */
export const LIST_NOTICE_MS = 3000;

export type ChatListNoticeProps = {
  /** 이번에 보일 안내입니다. 없으면 null. */
  readonly notice: MessengerListNotice | null;
  /** 안내를 받았습니다 — route에서 지워 목록에 돌아와도 다시 뜨지 않게 합니다. */
  readonly onNoticeShown: () => void;
};

/** 메신저 문구 표의 `pushNotice` 칸입니다. */
export type MessengerListNoticeCopy = {
  /** 푸시로 온 인물의 방을 열 수 없을 때 목록 아래 3초 안내. */
  readonly chatUnavailable: string;
};
