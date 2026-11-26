// 공용 채팅 부품 계약입니다(messenger-chat-ui spec §4.1). 도메인 없는 props만 둡니다.

import type { ReactNode } from "@lynx-js/react";

export type ChatAvatar = {
  readonly name: string;
  readonly imageUrl: string | null;
  /** 있으면 아바타가 프로필 단추입니다(버튼 역할 · 낭독 이름 · 손가락 자리 44). */
  readonly profile?: {
    readonly label: string;
    readonly testId: string;
    readonly onTap: () => void;
  };
};

export type ChatHeaderProps = {
  readonly title: string;
  readonly insetTop: number;
  readonly testIds: { readonly root: string; readonly title: string };
  readonly start: ReactNode;
  readonly end: ReactNode | null;
  /** 제목 아래 한 줄 자리입니다. 없으면 DOM이 바뀌지 않습니다(messenger-chat-1-5 spec §3.2). */
  readonly subtitle?: ReactNode;
  /** 제목을 손가락으로 누르면(예: 대화방 상대 프로필). 낭독 역할은 그대로 제목입니다. */
  readonly onTitleTap?: () => void;
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
/** 로그의 자리 — 끝 근처(48px 안)인지, 끝까지 남은 거리가 뷰포트 높이보다 큰지(한 화면 넘게 위). */
export type ChatLogPosition = { readonly nearEnd: boolean; readonly far: boolean };
export type ChatLogProps = {
  readonly testId: string;
  readonly followKey?: number;
  /** 바뀌면(내가 말을 보냄) 읽던 자리와 상관없이 늘 끝으로 내리고 다시 따라갑니다(기기 F2). */
  readonly jumpKey?: number | string;
  /** 기록을 읽는 중이면 true — 그동안(과 읽은 뒤 첫 끝 맞춤)은 부드럽게 훑지 않고 끝으로 점프합니다(chat-scroll-follow D). */
  readonly loading?: boolean;
  /** 참조가 바뀌면 학습자가 말풍선을 펼친 것입니다(뜻 · 교정) — 그 직후의 내용 변화는 따라가지 않습니다(chat-scroll-follow H). */
  readonly holdKey?: unknown;
  /** 끝 근처인지 · 한 화면 넘게 멀리 있는지가 바뀔 때 불립니다(「새 메시지 ↓」 알약). */
  readonly onPositionChange?: (position: ChatLogPosition) => void;
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
  /** 로마자 · 구분선 · 뜻 묶음(ADR-0188) — 있으면 `translation` 대신 섭니다. */
  readonly annotation?: {
    readonly romanization: string;
    readonly meaning: string;
    readonly spokenRomanization: string;
  };
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
  /** 첫 줄 아래 로마자 줄(기울임)과 그 낭독(ADR-0188). 없으면 줄도 낭독도 없습니다. */
  readonly romanization?: { readonly text: string; readonly spoken: string };
  readonly lines: readonly string[];
  readonly state: "idle" | "picked";
  /** 누르면 일어나는 일을 낭독 끝에 붙입니다(예: 「Send」). 없으면 글만 읽습니다. */
  readonly action?: string;
  readonly testId: string;
  readonly onPick: () => void;
};
