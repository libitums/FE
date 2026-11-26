// 내 스토리를 친구 스토리와 같은 전체 화면 보기로(ADR-0194 개정 ⟨보기⟩, 시안 34 ~ 36번) — 아래 바 · 새 답 줄 · 답 목록 시트의 계약입니다.
// 타입 · 상수만 둡니다. 판정은 `my-story-viewer.ts`, 그리기는 `MyStoryViewerBar.tsx`입니다.

import type { MyStory, MyStoryReaction, ReactionFace } from "./my-stories.contract";

/** 보기의 내 스토리 칸 인물 id — 친구 인물 id와 겹치지 않는 값. 진행 막대 묶음(`viewerGroupOf`)이 이 값으로 한 사람을 묶습니다. */
export const MY_STORY_CHARACTER = "me";
/** 아래 바의 「Seen by」 얼굴 수(시안 34번). */
export const MY_STORY_SEEN_FACES = 3;
/** 바 위 새 답 줄 수 — 최신이 아래(시안 34번). */
export const MY_STORY_REPLY_LINES = 2;
/** 위로 밀기로 보는 세로 이동(pt/dp) — 이보다 짧거나 가로가 더 길면 밀기가 아닙니다. */
export const MY_STORY_SWIPE_UP = 48;

/** 보기에 내 스토리가 섰을 때 쓰는 것 — 반응 얼굴 · 친구 유무 · 방 열기 · 새 스토리 · 지우기(확인 상자는 부르는 쪽). */
export type MyStoryViewerMine = {
  readonly face: (characterId: string) => ReactionFace | null;
  /** 답할 친구가 있는가 — 없으면 줄 자리에 「Add a friend to get replies」. */
  readonly hasFriends: boolean;
  /** 새 답 줄 · 시트의 「Open chat」 — 그 인물 방(ADR-0191 D2). */
  readonly onOpenChat: (reaction: MyStoryReaction) => void;
  /** 「+」 — 지금 만들기 흐름(안내 · 시작 시트 · 창 시트). */
  readonly onCreate: () => void;
  /** 지우기 단추 · ⋯ 메뉴의 Delete story — 그 장의 스토리. */
  readonly onDelete: (story: MyStory) => void;
  /** 친구 0명 안내의 Find friends — 없으면 안내만. */
  readonly onFindFriends?: () => void;
  /** 사진 스토리의 서명 주소(ADR-0199). */
  readonly photoUrl?: (imagePath: string) => Promise<string | null>;
};

/** 바 위 새 답 한 줄 — 방이 있는 인물의 반응만. */
export type MyStoryReplyLine = { readonly reaction: MyStoryReaction; readonly who: ReactionFace };

/**
 * 바 위 자리(시안 34 · 36번) — 답이 있으면 최근 줄(최대 2, 최신이 아래), 없으면 친구 0명 안내 또는 한 시간 안내.
 * 줄의 「Seen by」 수는 서버가 준 그대로, 얼굴은 방이 있는 인물만 최대 3.
 */
export type MyStoryBarView = {
  readonly seen: number;
  readonly faces: readonly ReactionFace[];
  /** 방이 있는 인물의 반응 수 — 시트 제목 · 위로 밀기 안내. */
  readonly replies: number;
  readonly note:
    | { readonly kind: "lines"; readonly lines: readonly MyStoryReplyLine[] }
    | { readonly kind: "waiting" }
    | { readonly kind: "noFriends" };
};
