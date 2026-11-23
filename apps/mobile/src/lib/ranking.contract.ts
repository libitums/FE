// 주간 순위의 계약입니다(ADR-0170) — 서버 RPC `ranking_board` · `ranking_preferences` · `ranking_set_hidden`의 앱 모양. 타입만 둡니다.
// 순위 · 점수 · 그룹은 서버가 정본입니다. 앱은 표시 이름 · 나라만 받습니다(user id · 이메일 없음).

/** 보드 둘 — 레슨(기본) · 채팅 단어. 서버 값은 `lessons` · `chat_words`. */
export type RankingBoardKind = "lessons" | "chat-words";

export type RankingRow = {
  readonly rank: number;
  readonly name: string;
  /** ISO 3166-1 alpha-2(대문자) — 모르면 null. */
  readonly countryCode: string | null;
  /** 지금 에피소드 번호 — 모르면 null. */
  readonly episode: number | null;
  readonly score: number;
  readonly me: boolean;
};

export type RankingBoard = {
  readonly kind: RankingBoardKind;
  /** 그룹 인원(숨긴 사람 뺌). */
  readonly groupSize: number;
  /** 이번 주가 끝나는 시각(ISO, 다음 월요일 00:00 UTC). */
  readonly endsAt: string;
  /** 상위 3 보상 엽전 — 보상이 꺼져 있으면 null. */
  readonly reward: number | null;
  readonly rows: readonly RankingRow[];
  readonly me: { readonly rank: number; readonly score: number };
  /** 바로 위 사람과의 차이 — 1위면 null. `more`는 넘어서려면 더 필요한 점수. */
  readonly next: { readonly name: string; readonly more: number } | null;
};

/** 한 보드를 읽은 결과입니다. */
export type RankingLoad =
  | { readonly status: "ready"; readonly board: RankingBoard }
  /** 이번 주 아직 그룹이 없음(첫 점수를 얻으면 배정). */
  | { readonly status: "not-joined"; readonly endsAt: string }
  /** 설정에서 숨김. */
  | { readonly status: "hidden" }
  | { readonly status: "error" };

/** 서버 포트입니다. 어떤 호출도 던지지 않습니다 — 실패는 `error` · null. */
export type RankingClient = {
  readonly load: (kind: RankingBoardKind) => Promise<RankingLoad>;
  /** 숨김 여부 — 못 읽으면 null. */
  readonly preferences: () => Promise<{ readonly hidden: boolean } | null>;
  /** 숨김을 바꿉니다. 저장된 값(못 바꾸면 null). */
  readonly setHidden: (hidden: boolean) => Promise<{ readonly hidden: boolean } | null>;
};
