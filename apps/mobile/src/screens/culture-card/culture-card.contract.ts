// 문화 카드 활동의 계약입니다. 타입만 둡니다.

import type { ActivityFinish, LessonPosition } from "../learning/activity-finish";

export type CultureCardQuestion = {
  /** 한국어 제목(`context.ko`) — 비지 않습니다. */
  readonly title: string;
  /** 영어 제목(`context.en`) — 없으면 `null`. */
  readonly titleTranslation: string | null;
  /** 제목 로마자(`context.roman`) — 없으면 `null`. 본문 로마자는 싣지 않습니다. */
  readonly titleRomanization: string | null;
  /** 영어 본문(`stimulus.text.en`) — 크게 섭니다. 비지 않습니다. */
  readonly body: string;
  /** 한국어 본문(`stimulus.text.ko`) — 작게 섭니다. 비면 `null`. */
  readonly koreanBody: string | null;
};

export type CultureCardSessionState = { readonly cardIndex: number };

export type CultureCardSessionAction = { readonly type: "nextCard" };

/** 아래 버튼이 하는 일입니다 — 다음 카드 / 다음 활동으로 넘김 / 결과 보기. */
export type CultureCardStep = "advance" | "hand-off" | "finish";

export type CultureCardActivityProps = {
  readonly questions: readonly CultureCardQuestion[];
  readonly gemCount: number;
  readonly onExit: () => void;
  readonly onFinish: ActivityFinish;
  /** 카탈로그 레슨 안의 위치입니다. 주지 않으면 이 활동이 한 세션입니다. */
  readonly lesson?: LessonPosition;
};

export type CultureCardCopy = {
  readonly instruction: string;
  readonly badge: string;
  /** 한국어 본문 위 작은 소제목입니다(보이기만 하고 낭독하지 않음). */
  readonly koreanBodyTitle: string;
  /** 제목 로마자의 낭독 이름입니다. */
  readonly pronunciation: (romanization: string) => string;
};

export type CultureCardTestId =
  | "culture-card-content"
  | "culture-card-badge"
  | "culture-card-title"
  | "culture-card-title-romanization"
  | "culture-card-title-translation"
  | "culture-card-body"
  | "culture-card-korean"
  | "culture-card-korean-title"
  | "culture-card-korean-text";
