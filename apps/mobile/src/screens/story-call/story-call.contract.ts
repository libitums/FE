// 전화 막간 화면의 계약입니다(ADR-0088 D6) — 표시 모델 · props · 문구 · 테스트 id.

import type { SafeAreaInsets } from "../../lib/safe-area";

export type StoryCallText = { readonly ko: string; readonly en: string };

export type StoryCallLineView = {
  /** 상대 · 나 · 배경 소리(안내 방송 등). */
  readonly kind: "caller" | "self" | "background";
  /** 상대는 이름, 배경 소리는 「안내 방송」 같은 이름, 나는 빈 문자열. */
  readonly label: string;
  readonly text: StoryCallText;
  /** 그 줄의 소리 — 녹음이 없거나 해석하지 못하면 `null`. */
  readonly audioSource: string | null;
  /** 가운데 머무는 시간 — 소리 길이를 알면 말이 끝난 뒤 틈까지, 모르면 글 길이로 잡습니다. */
  readonly holdMs: number;
};

export type StoryCallView = {
  readonly counterpart: string;
  /** 콘텐츠 `profiles`의 그림 — 없거나 해석하지 못하면 `null`(이니셜). */
  readonly counterpartAvatarUrl: string | null;
  readonly backgroundUrl: string | null;
  readonly lines: readonly [StoryCallLineView, ...StoryCallLineView[]];
  /** `call_end` 지문 — 없으면 끊김 화면에 지문을 그리지 않습니다. */
  readonly end: StoryCallText | null;
};

export type StoryCallScreenProps = {
  readonly insets: SafeAreaInsets;
  readonly call: StoryCallView;
  /** 끊김 화면의 「Finish story」 — 한 번만 부릅니다. */
  readonly onComplete: () => void;
  readonly onExit: () => void;
};

export type StoryCallCopy = {
  readonly incoming: string;
  readonly answer: string;
  readonly connecting: string;
  readonly callEnded: (clock: string) => string;
  readonly me: string;
  readonly mute: string;
  readonly speaker: string;
  readonly end: string;
  readonly back: string;
  readonly finish: string;
};

export const storyCallTestIds = {
  screen: "story-call-screen",
  incoming: "story-call-incoming",
  answer: "story-call-answer",
  active: "story-call-active",
  clock: "story-call-clock",
  photo: "story-call-photo",
  line: "story-call-line",
  lineLabel: "story-call-line-label",
  lineText: "story-call-line-text",
  ended: "story-call-ended",
  endText: "story-call-end-text",
  finish: "story-call-finish",
  back: "story-call-back",
} as const;
