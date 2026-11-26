// 대화방 스토리 인용 판(ADR-0178 D5 개정 ⟨판⟩ · ADR-0194 개정 ⟨판⟩) 계약 — 올린 그대로 9:16 작은 판, 누르면 그 스토리. 타입 · test-id만 둡니다.

import type { ChatStoryQuote, FriendStory } from "./friend-stories.contract";
import type { MyStory } from "./my-stories.contract";

/** 판을 그릴 재료 — 이미 받은 목록. null = 아직 안 받았거나 못 받음. `deleted`는 이 방에서 막 지운 내 스토리 id. */
export type ChatStoryLookup = {
  readonly mine: readonly MyStory[] | null;
  readonly friends: readonly FriendStory[] | null;
  readonly deleted: ReadonlySet<string>;
};

/**
 * 판 하나의 모양 — 지운 스토리(회색 판, 누름 없음) · 내 스토리(목록에 있으면 그 스토리를 그대로 그리고 열 수 있음, 없으면 바탕색 + 한 줄로 대신하고
 * 누름 없음) · 친구 스토리(그림을 판 가득, 24시간 지났으면 흐리게 + 「Ended」).
 */
export type ChatStoryThumbView =
  | { readonly kind: "deleted" }
  | { readonly kind: "mine"; readonly story: MyStory; readonly openable: boolean }
  | { readonly kind: "friend"; readonly imagePath: string | null; readonly ended: boolean };

/** 판을 눌렀을 때 — 내 스토리 보기 · 친구 스토리 보기(그 인물, 그 장부터) · 「This story has ended」 시트. 열 것이 없으면 null. */
export type ChatStoryTarget =
  | { readonly kind: "mine"; readonly story: MyStory }
  | { readonly kind: "friend"; readonly characterId: string; readonly storyId: string }
  | { readonly kind: "ended" };

/** 대화방 결선이 내려주는 것 — 없으면(손님 · 테스트 · 스토리 포트 없음) 판은 인용만으로 그리고 누를 수 없습니다. */
export type ChatStoryHost = {
  readonly lookup: ChatStoryLookup;
  /** 판이 처음 설 때 — 그 종류의 목록을 한 번 받습니다(인용이 없는 방은 서버 요청 0). */
  readonly need: (kind: "mine" | "friend") => void;
  readonly open: (quote: ChatStoryQuote) => void;
  /** 내 사진 스토리의 서명 주소(ADR-0199) — 포트가 주소를 다시 쓰고 같은 경로 요청을 하나로 묶습니다. */
  readonly photoUrl?: (imagePath: string) => Promise<string | null>;
};

export const chatStoryThumbTestIds = {
  thumb: "chat-story-thumb",
  ended: "chat-story-thumb-ended",
  endedSheet: "chat-story-ended-sheet",
} as const;
