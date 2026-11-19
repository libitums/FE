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
};

export type FriendCatalog = {
  readonly characters: readonly FriendProfile[];
  readonly categories: readonly FriendCategory[];
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
};
