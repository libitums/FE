// 추천 친구 · 완화 수위(ADR-0159)의 서버 쪽 어휘 — 페르소나 카드(`chat-send.contract.ts`의 `PersonaCard`)에 더하는 칸.

/** 로맨스 수위. open은 인물 open · 생년상 성인 · 성인 확인 동의가 모두 있을 때만 — 서버(SQL)가 정하고 코드가 한 번 더 막는다. */
export type RomanceTier = "open" | "standard";

export type FriendPersonaFields = {
  /** 추천 친구 — 스토리 밖 인물. 없으면 스토리 인물. 시스템 프롬프트의 「누구 · 무엇을 아는가」 줄이 바뀐다. */
  readonly kind?: "friend";
  /** 친구를 어떻게 만났나 — 친구 찾기 앱 · 언어 교환. */
  readonly met?: "friend_app" | "language_exchange";
  /** 인물의 로맨스 수위(없으면 standard). 실제 적용은 서버가 정한 판정의 `romanceTier`다(`effectiveRomanceTier`). */
  readonly romanceTier?: RomanceTier;
  readonly mbti?: string;
  readonly origin?: string;
  /** 배경 · MBTI 성격 · 사투리(친구) — 시스템 프롬프트의 「Who you are」에 그린다. */
  readonly background?: readonly string[];
  readonly personality?: readonly string[];
  readonly dialect?: string;
};
