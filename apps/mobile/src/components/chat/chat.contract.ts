// 공용 채팅 부품 계약입니다(messenger-chat-ui spec §4.1). 도메인 없는 props만 둡니다.

import type { ReactNode } from "@lynx-js/react";

export type ChatAvatar = { readonly name: string; readonly imageUrl: string | null };

export type ChatHeaderProps = {
  readonly title: string;
  readonly insetTop: number;
  readonly testIds: { readonly root: string; readonly title: string };
  readonly start: ReactNode;
  readonly end: ReactNode | null;
  /** 제목 아래 한 줄 자리입니다. 없으면 DOM이 바뀌지 않습니다(messenger-chat-1-5 spec §3.2). */
  readonly subtitle?: ReactNode;
};
export type ChatHeaderSideProps = {
  readonly testId?: string;
  /**
   * 접근성 초점을 돌려받을 요소 id입니다(`requestAccessibilityFocus`가 `#id`로 찾습니다). 접근성 요소여야 하므로
   * `accessibilityLabel` · `onTap`과 함께 줍니다 — 이 칸이 버튼 하나로 읽히고 안쪽 그림(children)은 낭독에서 숨습니다.
   * 셋 다 없으면 지금까지처럼 모양만 맡는 칸입니다(학습 메신저).
   */
  readonly id?: string;
  readonly accessibilityLabel?: string;
  readonly onTap?: () => void;
  readonly children?: ReactNode;
};
export type ChatLogProps = {
  readonly testId: string;
  readonly followKey?: number;
  /** 바뀌면(내가 말을 보냄) 읽던 자리와 상관없이 늘 끝으로 내리고 다시 따라갑니다(기기 F2). */
  readonly jumpKey?: number | string;
  /** 로그를 한 번 누르면 불립니다(예: 열린 키보드 접기). 스크롤은 누름이 아닙니다. */
  readonly onTap?: () => void;
  readonly children: ReactNode;
};
export type ChatIncomingRowProps = {
  readonly avatar: ChatAvatar;
  readonly testId: string;
  readonly children: ReactNode;
};
export type ChatOutgoingRowProps = { readonly testId: string; readonly children: ReactNode };
export type ChatTextBubbleProps = {
  readonly direction: "incoming" | "outgoing";
  readonly speaker: string;
  readonly message: string;
  readonly translation: string | null;
};
export type ChatPhotoAspect = "portrait-9x16" | "portrait-3x4";
export type ChatPhotoProps = {
  readonly src: string;
  readonly aspect: ChatPhotoAspect;
  readonly testId: string;
};
export type ChatTypingRowProps = {
  readonly avatar: ChatAvatar;
  readonly label: string;
  readonly testId: string;
};
export type ChatReplyOptionProps = {
  readonly primary: string;
  readonly lines: readonly string[];
  readonly state: "idle" | "picked";
  readonly testId: string;
  readonly onPick: () => void;
};
