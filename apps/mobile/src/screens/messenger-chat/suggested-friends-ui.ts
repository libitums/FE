// 목록 화면의 추천 친구 상태(`useSuggestedFriends`)가 밖에 내놓는 모양과 시트 모델 만들기입니다(ADR-0162 · ADR-0178). 순수.

import type { ReactNode } from "@lynx-js/react";

import type { ChoiceRomanization } from "../../lib/session-options";
import type { FriendProfile, SuggestedFriendsPort } from "./friend-catalog.contract";
import type { DirectoryRow } from "./friend-directory";
import type { SuggestedFriendSheetModel } from "./suggested-friends.contract";
import type { SuggestedFriend } from "./suggested-friends";

/** 시트를 연 자리 — 줄 · 친구 찾기 · 스토리(ADR-0178). 이벤트 `from`에 그대로 실립니다. */
/** 연 곳 — 스토리 줄의 추천 아바타(`story_row`) · 스토리 보기의 Add friend and reply(`story_viewer`). */
export type SuggestedFrom = "row" | "directory" | "story_row" | "story_viewer";

export type SuggestedFriendsUi = {
  /** 목록 위에 설 줄 — 추천이 없거나 포트가 없으면 null(줄을 숨김, ADR-0162 D3). */
  readonly row: ReactNode;
  /** 줄의 칸 수(노출 이벤트 — 목록 화면이 실제로 그린 줄만 셉니다, 감사 A5). */
  readonly rowCount: number;
  /** 추천 대상 전체(줄 최대 수로 자르지 않음) — 스토리 줄(ADR-0178 D3)이 안 만난 친구 · 그 밖의 추천을 고릅니다. 포트가 없으면 빈 목록. */
  readonly all: readonly SuggestedFriend[];
  /** 그 추천 친구의 프로필 시트를 엽니다(스토리 줄의 추천 아바타 · 잠긴 안 만난 친구). */
  readonly openFriend: (friend: SuggestedFriend, from: SuggestedFrom) => void;
  /**
   * 안 만난 친구 스토리의 「Add friend and reply」(ADR-0178 D4) — 추가 가능이면 시트 없이 추가 길(성인 확인 포함)을 타고 성공하면 `onAdded`,
   * 잠김이면 프로필 시트를 엽니다.
   */
  readonly meet: (friend: SuggestedFriend, onAdded: () => void) => void;
  /** 친구 찾기를 엽니다(스토리 줄의 Find friends). */
  readonly openDirectory: () => void;
  /** 시트 · 친구 찾기 · 토스트 — 스크롤 밖에 둡니다. */
  readonly layers: ReactNode;
  /** 시트나 친구 찾기가 떠 있는가 — 목록 화면이 다른 겹침과 합쳐 한 번만 바깥에 알립니다. */
  readonly layerOpen: boolean;
  /** 그 시트가 받을 견본 주소 · 로마자(ADR-0198) — 이 상태 밖에서 같은 시트를 세우는 자리(스토리 보기)도 이 값을 넘깁니다. */
  readonly sheetView: (model: SuggestedFriendSheetModel) => SheetView;
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

/**
 * 스토리 보기 아바타의 프로필 시트 — 이미 친구(열린 방)인 인물(ADR-0178). 카탈로그 인물이면 그 소개 · 태그 · 첫 말을 쓰고, 없으면
 * (카탈로그 밖의 방 인물) 이름 · 얼굴만 섭니다. 이름 · 얼굴은 보기와 같게 방의 것, 추가할 것이 없으니 `added` · 제안 없음.
 */
export const modelOfMetFriend = (
  profile: FriendProfile | null,
  who: { readonly id: string; readonly name: string; readonly avatarUrl: string | null },
): SuggestedFriendSheetModel => ({
  character:
    profile === null
      ? {
          id: who.id,
          name: who.name,
          avatarPath: null,
          kind: "story",
          unlockEpisodeId: null,
          unlockEpisode: null,
          intro: null,
          tags: [],
          category: null,
          sheetOpening: null,
          earlyAccess: null,
        }
      : { ...profile, name: who.name },
  avatarUrl: who.avatarUrl,
  status: "added",
  offer: null,
});

/** 프로필 시트가 결선에서 받는 값 — 목소리 견본 주소 · 로마자 스위치(ADR-0198). 시트를 세우는 자리마다 같게 넘깁니다. */
export type SheetView = {
  readonly voiceSampleUrl: string | null;
  readonly romanization: ChoiceRomanization;
};

/** 견본이 없거나 포트가 못 풀면 주소 null, 포트가 없거나 스위치가 꺼졌으면 hidden. */
export const sheetViewOf = (
  model: SuggestedFriendSheetModel,
  port: SuggestedFriendsPort | undefined,
): SheetView => {
  const path = model.character.voiceSamplePath ?? null;
  return {
    voiceSampleUrl: path === null ? null : (port?.voiceSampleUrl?.(path) ?? null),
    romanization: port?.romanization?.() === true ? "shown" : "hidden",
  };
};
