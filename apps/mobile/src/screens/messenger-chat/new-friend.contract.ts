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
  /** Reply — 층이 먼저 시트를 닫고 부릅니다(맵은 숨은 탭으로 남아 있어, 돌아왔을 때 시트가 서 있지 않게). */
  readonly onReply: () => void;
  readonly timers?: ChatTimers;
  /** 시트가 닫힌 뒤 접근성 초점을 돌려 줄 아래 화면 요소의 `id`(없으면 돌리지 않음). */
  readonly resultFocusId?: string;
  /**
   * 아래 화면이 지금 보이는 탭인가(ADR-0106). 거짓인 동안은 기다림 타이머를 멈추고 시트를 그리지 않습니다 — 숨은 탭의
   * 시트가 다른 탭 위에 서지 않게. 기본 `true`.
   */
  readonly active?: boolean;
  /** 시트가 보이고 사라질 때 부릅니다 — 전역 머리 · 탭 바를 그 동안 낭독에서 가리는 데 씁니다. 참을 알린 뒤에만 거짓을 알립니다. */
  readonly onVisibleChange?: (visible: boolean) => void;
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
