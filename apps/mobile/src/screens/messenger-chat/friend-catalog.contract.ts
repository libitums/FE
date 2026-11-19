// 친구 카탈로그 · 추천 친구 포트의 계약입니다(ADR-0162). 지금은 앱의 인물 표(`companion-roster.ts`)가 채우고, 서버 인물 목록이
// 생기면 같은 포트를 서버판이 채웁니다 — 화면 · 순수 함수는 이 타입에만 기댑니다.

/** 언어별 한 줄입니다. `en`은 반드시 있고, 없는 언어는 `en`을 씁니다(th · my는 늘 en — ADR-0158). */
export type LocalizedLine = { readonly en: string } & Partial<
  Readonly<Record<"es" | "id" | "ja" | "vi", string>>
>;

/** 이야기에서 만나는 인물(`story`) · 이야기 밖에서 새로 만나는 인물(`general`). */
export type FriendKind = "story" | "general";

/** 먼저 만나기 제안 — 값(엽전)과 끝 시각(epoch ms, 없으면 null = 끝 시각을 보이지 않음). */
export type EarlyAccessOffer = { readonly price: number; readonly endsAt: number | null };

/** 친구 찾기 칩이 되는 일반 인물의 묶음입니다. */
export type FriendCategory = { readonly id: string; readonly label: LocalizedLine };

/**
 * 프로필 시트의 사실 줄 · 목소리 견본(ADR-0162 2026-11-19 추가). 나이는 수(28) 또는 바이블의 범위 · 나이대 표기(`"25-26"` · `"30s"`)이고
 * 모르면 null. 직업은 언어별 한 줄, MBTI는 네 글자. `voiceSamplePath`는 content 버킷 상대 경로(미리 만든 파일 — 서버 호출 · 엽전 없음).
 */
export type FriendFacts = {
  readonly age: number | string | null;
  readonly job: LocalizedLine | null;
  readonly mbti: string | null;
  readonly voiceSamplePath: string | null;
};

/** 인물의 로맨스 수위(ADR-0163 D4) — open은 생년상 성인 + 성인 확인 동의가 있을 때만 서버가 적용합니다. */
export type RomanceTier = "open" | "standard";

/** 서버가 이 학습자에게 보이게 한 일반 인물 한 명(`companion_friends`, ADR-0163 D2). */
export type VisibleFriend = { readonly id: string; readonly romanceTier: RomanceTier };

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
  /** 나이 · 직업 · MBTI · 목소리 견본 — 시트의 사실 줄과 견본 단추가 씁니다. */
  readonly profile: FriendFacts;
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
   * 서버가 보이게 한 일반 인물(`companion_friends`, ADR-0163 D2) — 일반 인물은 카탈로그와 이 목록 **둘 다**에 있어야 섭니다.
   * 답이 null(RPC 없음 · 404 · 오류 · 오프라인)이거나 칸이 null(서버 포트 없음 · 손님)이면 일반 인물이 없습니다. 칸이 없으면(옛 결선 ·
   * 화면 테스트) 카탈로그 그대로입니다. 이야기 인물은 이 목록과 상관없습니다.
   */
  readonly visibleFriends?: (() => Promise<readonly VisibleFriend[] | null>) | null;
  /** 서버 프로필의 성인 확인(`companion_load_profile.adultAck`, ADR-0163 D4) — 못 읽으면 null. */
  readonly adultAck?: (() => Promise<boolean | null>) | null;
  /** 성인 확인을 남깁니다(`companion_ack_adult`) — 서버가 적었으면 true. 던지지 않습니다. */
  readonly ackAdult?: (() => Promise<boolean>) | null;
  /** content 버킷 상대 경로 → 주소(목소리 견본). 없거나 null이면 견본 단추가 서지 않습니다. */
  readonly mediaUrlOf?: (path: string) => string | null;
};
