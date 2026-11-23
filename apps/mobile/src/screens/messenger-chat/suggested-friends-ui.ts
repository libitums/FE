// 목록 화면의 추천 친구 상태(`useSuggestedFriends`)가 밖에 내놓는 모양과 시트 모델 만들기입니다(ADR-0162 · ADR-0177). 순수.

import type { ReactNode } from "@lynx-js/react";

import type { DirectoryRow } from "./friend-directory";
import type { SuggestedFriendSheetModel } from "./suggested-friends.contract";
import type { SuggestedFriend } from "./suggested-friends";

/** 시트를 연 자리 — 줄 · 친구 찾기 · 스토리(ADR-0177). 이벤트 `from`에 그대로 실립니다. */
export type SuggestedFrom = "row" | "directory" | "story";

export type SuggestedFriendsUi = {
  /** 목록 위에 설 줄 — 추천이 없거나 포트가 없으면 null(줄을 숨김, ADR-0162 D3). */
  readonly row: ReactNode;
  /** 추천 대상 전체(줄 최대 수로 자르지 않음) — 스토리 줄(ADR-0177 D3)이 안 만난 친구 · 그 밖의 추천을 고릅니다. 포트가 없으면 빈 목록. */
  readonly all: readonly SuggestedFriend[];
  /** 그 추천 친구의 프로필 시트를 엽니다(스토리 줄의 추천 아바타 · 잠긴 안 만난 친구). */
  readonly openFriend: (friend: SuggestedFriend, from: SuggestedFrom) => void;
  /**
   * 안 만난 친구 스토리의 「Add friend and reply」(ADR-0177 D4) — 추가 가능이면 시트 없이 추가 길(성인 확인 포함)을 타고 성공하면 `onAdded`,
   * 잠김이면 프로필 시트를 엽니다.
   */
  readonly meet: (friend: SuggestedFriend, onAdded: () => void) => void;
  /** 친구 찾기를 엽니다(스토리 줄의 Find friends). */
  readonly openDirectory: () => void;
  /** 시트 · 친구 찾기 · 토스트 — 스크롤 밖에 둡니다. */
  readonly layers: ReactNode;
  /** 시트나 친구 찾기가 떠 있는가 — 목록 화면이 다른 겹침과 합쳐 한 번만 바깥에 알립니다. */
  readonly layerOpen: boolean;
};

export const modelOfFriend = (friend: SuggestedFriend): SuggestedFriendSheetModel => ({
  character: friend.character,
  avatarUrl: friend.room.counterpart.avatarUrl,
  status: friend.status,
  offer: friend.offer,
});

export const modelOfRow = (row: DirectoryRow): SuggestedFriendSheetModel => ({
  character: row.character,
  avatarUrl: row.room.counterpart.avatarUrl,
  status: row.action === "chat" ? "addable" : "locked",
  offer: row.offer,
});
