// 새 친구 시트(E2) 계약입니다(messenger-chat-1-5 spec §6.4 · §10).

import type { ReactNode } from "@lynx-js/react";

import type { ChatText, ChatTimers } from "./chat-source.contract";
import type { NewFriendTimeline } from "./new-friend";

export type NewFriendModel = {
  readonly characterId: string;
  readonly roomId: string;
  readonly name: string;
  readonly faceUrl: string | null;
  readonly sceneUrl: string | null;
  readonly episodeOrdinal: number;
  readonly episodeTitle: string;
  readonly opening: ChatText;
};
export type NewFriendLayerProps = {
  readonly model: NewFriendModel;
  readonly onReply: () => void;
  readonly timers?: ChatTimers;
  /** 시트가 닫힌 뒤 접근성 초점을 돌려 줄 결과 화면 요소의 `id`(없으면 돌리지 않음). */
  readonly resultFocusId?: string;
  readonly children: ReactNode;
};
export type NewFriendSheetProps = {
  readonly model: NewFriendModel;
  readonly phase: "typing" | "message";
  readonly timeline: NewFriendTimeline;
  readonly onReply: () => void;
  readonly onLater: () => void;
};

const nf = (suffix: string): string => `new-friend-${suffix}`;

export const newFriendTestIds = {
  sheet: nf("sheet"),
  band: nf("band"),
  chip: nf("chip"),
  face: nf("face"),
  name: nf("name"),
  met: nf("met"),
  typing: nf("typing"),
  message: nf("message"),
  reply: nf("reply"),
  later: nf("later"),
  panel: nf("panel"),
  title: nf("title"),
  top: nf("top"),
  scroll: nf("scroll"),
  scrollContent: nf("scroll-content"),
  actions: nf("actions"),
} as const;
