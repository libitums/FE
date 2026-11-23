// 추천 친구 · 완화 수위(ADR-0164)의 서버 쪽 어휘 — 페르소나 카드(`chat-send.contract.ts`의 `PersonaCard`)에 더하는 칸.

/** 로맨스 수위. open은 인물 open · 생년상 성인 · 성인 확인 동의가 모두 있을 때만 — 서버(SQL)가 정하고 코드가 한 번 더 막는다. */
export type RomanceTier = "open" | "standard";

/**
 * 적용 로맨스 선(ADR-0168) — 낮은 것부터 none < hug < kiss < close < open. 인물 종류 · 수위 · 생년 · 말투 단계로 정한다(`romanceLine`).
 * 검사 · 시스템 프롬프트 · 추천 답변 칩 · 평가 채점이 이 값 하나를 따른다.
 */
export type RomanceLine = "none" | "hug" | "kiss" | "close" | "open";

export type FriendPersonaFields = {
  /** 추천 친구 — 스토리 밖 인물. 없으면 스토리 인물. 시스템 프롬프트의 「누구 · 무엇을 아는가」 줄이 바뀐다. */
  readonly kind?: "friend";
  /** 친구를 어떻게 만났나 — 친구 찾기 앱 · 언어 교환. */
  readonly met?: "friend_app" | "language_exchange";
  /** 인물의 로맨스 수위(없으면 standard). 실제 적용은 서버가 정한 판정의 `romanceTier`다(`effectiveRomanceTier`). */
  readonly romanceTier?: RomanceTier;
  /**
   * 로맨스 대상이 아닌 인물(스토리의 덕수쌤 · 윤경, ADR-0168 D4). 참이면 답의 Romance 줄이 「로맨스 분위기 없음」, 추천 답변 칩 · 채점은 선 none.
   * 입력 검사는 선 그대로(학습자의 플러팅을 위반으로 세지 않는다 — 캐릭터가 웃어넘긴다).
   */
  readonly romanceOff?: boolean;
  readonly mbti?: string;
  readonly origin?: string;
  /** 배경 · MBTI 성격 · 사투리(친구) — 시스템 프롬프트의 「Who you are」에 그린다. */
  readonly background?: readonly string[];
  readonly personality?: readonly string[];
  readonly dialect?: string;
  /** 속 이야기(성장 과정 · 가치관 · 주변 사람 · 고민과 목표 · 좋아하는 것 · 싫어하는 것) — 한꺼번에 늘어놓지 않고 대화가 닿을 때 하나씩. */
  readonly history?: readonly string[];
  readonly values?: readonly string[];
  readonly people?: readonly string[];
  readonly goals?: readonly string[];
  readonly likes?: readonly string[];
  readonly dislikes?: readonly string[];
  /** 외국인 학습자가 흥미로워할 한국 이야기 — 자기 얘기로 하나 꺼내고 학습자 나라는 어떤지 되묻는다. */
  readonly hooks?: readonly string[];
};
