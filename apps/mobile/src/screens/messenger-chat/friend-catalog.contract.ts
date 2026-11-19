// 친구 카탈로그 · 추천 친구 포트의 계약입니다(ADR-0162). 지금은 앱의 인물 표(`companion-roster.ts`)가 채우고, 서버 인물 목록이
// 생기면 같은 포트를 서버판이 채웁니다 — 화면 · 순수 함수는 이 타입에만 기댑니다.

/** 언어별 한 줄입니다. `en`은 반드시 있고, 없는 언어는 `en`을 씁니다(th · my는 늘 en — ADR-0158). */
export type LocalizedLine = { readonly en: string } & Partial<
  Readonly<Record<"es" | "id" | "ja" | "vi", string>>
>;

/** 이야기에서 만나는 인물(`story`) · 이야기 밖에서 새로 만나는 인물(`general`). */
export type FriendKind = "story" | "general";

/** 인물의 로맨스 수위(ADR-0164) — `open`은 인물의 성격이고, 실제 적용은 서버가 학습자(생년상 성인 + 성인 확인 동의)로 정합니다. */
export type RomanceTier = "open" | "standard";

/** 이 학습자에게 보이는 추천 친구 한 명(`companion_friends()`, ADR-0164 D2) — 서버 순서 그대로. */
export type VisibleFriend = { readonly id: string; readonly romanceTier: RomanceTier };

/** 생년으로 본 연령대 — 서버 `companion.age_band`와 같은 경계(그해 연도 − 생년 ≥ 18이면 성인). 생년이 없으면 unknown. */
export type AgeBand = "adult" | "minor" | "unknown";

/** 성인 확인을 물을지 판정하는 데 쓰는 학습자 상태 — 서버 프로필의 생년(연령대)과 동의(`adultAck`). */
export type AdultAckState = { readonly ageBand: AgeBand; readonly adultAck: boolean };

/** 성인 확인 포트(ADR-0164 D4) — 서버 포트가 있을 때만. 어떤 호출도 던지지 않습니다. */
export type AdultAckPort = {
  /** 서버 프로필에서 읽은 상태 — 못 읽으면 null(묻지 않음). */
  readonly state: () => Promise<AdultAckState | null>;
  /** `companion_ack_adult()` — 동의가 남았으면 true. 실패해도 던지지 않습니다(false). */
  readonly confirm: () => Promise<boolean>;
  /** 이 계정에 이미 물었는가(기기 · 계정마다) — 「Just friends for now」를 고른 뒤 다시 묻지 않습니다. */
  readonly asked: () => boolean;
  readonly markAsked: () => void;
};

/** 먼저 만나기 제안 — 값(엽전)과 끝 시각(epoch ms, 없으면 null = 끝 시각을 보이지 않음). */
export type EarlyAccessOffer = { readonly price: number; readonly endsAt: number | null };

/** 친구 찾기 칩이 되는 일반 인물의 묶음입니다. */
export type FriendCategory = { readonly id: string; readonly label: LocalizedLine };

/** 추천 · 친구 찾기가 그리는 인물 한 명입니다. 해금 규칙은 `unlockEpisodeId`(null = 처음부터 · 일반 인물). */
export type FriendProfile = {
  readonly id: string;
  readonly name: string;
  readonly avatarPath: string | null;
  readonly kind: FriendKind;
  readonly unlockEpisodeId: string | null;
  readonly unlockEpisode: number | null;
  readonly intro: LocalizedLine | null;
  readonly tags: readonly LocalizedLine[];
  readonly category: string | null;
  /** 첫 말(ko · en) — 시트의 말풍선입니다. 없으면 말풍선을 그리지 않습니다. */
  readonly sheetOpening: { readonly ko: string; readonly en: string } | null;
  readonly earlyAccess: EarlyAccessOffer | null;
  /** 인물의 로맨스 수위(ADR-0164) — 서버의 보이는 친구 목록이 덮어씁니다. 없으면 standard. */
  readonly romanceTier?: RomanceTier;
  /** 문구의 대명사(she · he)를 고릅니다. 없으면 대명사 없는 문구. */
  readonly gender?: "female" | "male";
};

export type FriendCatalog = {
  readonly characters: readonly FriendProfile[];
  readonly categories: readonly FriendCategory[];
};

/** 서버가 켠 먼저 만나기 제안 한 줄(`companion_early_access_offers`) — 카탈로그 인물의 `earlyAccess`를 채웁니다. */
export type EarlyAccessListing = {
  readonly characterId: string;
  readonly price: number;
  readonly endsAt: number | null;
};

export type AddFriendResult = "added" | "already" | "unknown";

export type EarlyAccessResult =
  | { readonly kind: "unlocked" }
  | { readonly kind: "short"; readonly shortBy: number }
  | { readonly kind: "failed" };

/** 추천 친구 포트 — 목록 화면이 받습니다. */
export type SuggestedFriendsPort = {
  readonly catalog: () => FriendCatalog;
  /** 방을 열고 첫 인사를 받습니다(서버 방은 `companion-greet`). 해금 기록도 남깁니다. */
  readonly add: (characterId: string) => AddFriendResult;
  /** 엽전 먼저 만나기 — 서버 RPC가 없어 운영에서는 null(꺼짐, ADR-0162 D5). */
  readonly earlyAccess: ((characterId: string) => Promise<EarlyAccessResult>) | null;
  /** 이 에피소드를 끝냈는가 — 해금 규칙을 채웠지만 아직 추가하지 않은 스토리 인물. 없으면 모두 거짓. */
  readonly metEpisode?: (episodeId: string) => boolean;
  /** 서버의 켜진 제안 — 목록 화면이 한 번 읽어 카탈로그에 얹습니다. 없으면(가짜 출처 · 손님) 제안이 없습니다. */
  readonly offers?: (() => Promise<readonly EarlyAccessListing[]>) | null;
  /**
   * 이 학습자에게 보이는 추천 친구(`companion_friends()`, ADR-0164 D2). 있으면 일반 인물은 이 목록에 있는 것만 섭니다 — 읽기 전 ·
   * 못 읽음(null)은 빈 목록과 같습니다. 없으면(가짜 출처 · 테스트) 카탈로그의 일반 인물이 그대로 섭니다.
   */
  readonly visibleFriends?: () => Promise<readonly VisibleFriend[] | null>;
  /** 성인 확인(ADR-0164 D4) — 없으면 묻지 않습니다. */
  readonly adultAck?: AdultAckPort;
};
