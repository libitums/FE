// 막간 이야기 시작 화면 · 분석 이벤트의 계약입니다(ADR-0088 D6) — 모든 형식(컷 · 사진 보기 · 문자 · 전화)이 같은 화면으로 시작합니다.

import type { SafeAreaInsets } from "../../lib/safe-area";

export type StoryIntroView = {
  /** 에피소드 순번 — 「STORY · EPISODE n」. */
  readonly ordinal: number;
  /** 「조금 전」 같은 장면 자막(채움 끝). */
  readonly caption: { readonly ko: string; readonly en: string };
  /** 배경 — 막간 배경, 없으면 첫 컷 그림. 해석하지 못하면 `null`(짙은 면만). */
  readonly backgroundUrl: string | null;
};

export type StoryIntroScreenProps = {
  readonly insets: SafeAreaInsets;
  readonly intro: StoryIntroView;
  /** `Start` — 본편으로. */
  readonly onStart: () => void;
  /** 확인 대화상자에서 `Skip`을 고름. */
  readonly onSkip: () => void;
  /** 머리 뒤로 · 시스템 뒤로(확인창이 없을 때). */
  readonly onExit: () => void;
};

export type StoryIntroCopy = {
  readonly overline: (ordinal: number) => string;
  readonly back: string;
  readonly skip: string;
  readonly start: string;
  readonly skipDialog: {
    readonly title: string;
    readonly description: string;
    readonly skip: string;
    readonly keepWatching: string;
  };
};

/** 이야기 이벤트의 공통 속성 — 대사는 싣지 않습니다(ADR-0029 D14). `form`은 cuts · look · message · call. */
type StoryEventBase = {
  readonly episodeId: string;
  readonly unitKey: string;
  readonly form: string;
};

export type StoryExitStage = "intro" | "story";

/** 막간 이야기의 분석 이벤트입니다 — 에피소드 첫 스페셜 유닛(`episode_intro_*`)과 같은 다섯 때를 잽니다. */
export type StoryEvent =
  | ({ readonly name: "episode_story_viewed" } & StoryEventBase)
  | ({ readonly name: "episode_story_continued" } & StoryEventBase)
  | ({ readonly name: "episode_story_skipped" } & StoryEventBase)
  | ({ readonly name: "episode_story_exited"; readonly stage: StoryExitStage } & StoryEventBase)
  | ({ readonly name: "episode_story_completed" } & StoryEventBase);

export const storyIntroTestIds = {
  screen: "story-intro-screen",
  caption: "story-intro-caption",
  back: "story-intro-back",
  skip: "story-intro-skip",
  start: "story-intro-start",
  confirm: "story-intro-confirm",
} as const;
