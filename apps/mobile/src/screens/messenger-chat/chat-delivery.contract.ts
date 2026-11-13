// 서버 모드 방의 배달 상태와 그 조작입니다(오류 설계 1단계, ADR-0138) — 보내지 못한 글 · 끊긴 답 채우기 · 기록 실패.
// 가짜 출처는 이 상태가 없습니다(`ChatThread.server === null`).

/** 서버 모드 방 하나의 배달 상태입니다. */
export type ChatServerRoom = {
  /** 방을 열 때 서버 기록 · 첫 인사 — 못 받았으면 failed(다시 시도 안내). */
  readonly history: "loading" | "loaded" | "failed";
  /** 서버가 받지 못한 내 글 id, 보낸 순서대로 — 흐린 말풍선 + 「Not sent」 + 다시 보내기. */
  readonly unsent: readonly string[];
  /** 서버가 받은 뒤 끊긴 답을 기록에서 채우는 중(fetching) · 30초 안에 못 채움(stalled). */
  readonly recovery: "none" | "fetching" | "stalled";
};

export type ChatServerControls = {
  /** 보내지 못한 글을 맨 앞부터 차례로 다시 보냅니다(같은 client_message_id — 서버 멱등). */
  readonly resend: (roomId: string, messageId: string) => void;
  /** 보내지 못한 글을 로그에서만 뺍니다(서버에는 없는 글). */
  readonly discard: (roomId: string, messageId: string) => void;
  /** 기록을 다시 읽습니다 — 기록 실패면 처음부터(첫 인사 포함), 끊긴 답 채우기 다시 시작. */
  readonly reload: (roomId: string) => void;
  /** 앱이 앞으로 오거나 연결이 돌아왔을 때 — 열린 방만, 답을 기다리는 중엔 읽지 않습니다. */
  readonly refreshOpenRoom: () => void;
};
