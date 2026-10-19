// 문화 카드 활동의 계약입니다. 타입만 둡니다.

import type { ActivityFinish, LessonPosition } from "../learning/activity-finish";

export type CultureCardQuestion = {
  /** 한국어 제목(`context.ko`) — 비지 않습니다. */
  readonly title: string;
  /** 영어 제목(`context.en`) — 없으면 `null`. */
  readonly titleTranslation: string | null;
  /** 제목 로마자(`context.roman`) — 없으면 `null`. 본문 로마자는 싣지 않습니다. */
  readonly titleRomanization: string | null;
  /** 영어 본문(`stimulus.text.en`) — 뒷면의 주 본문입니다. 비지 않습니다. */
  readonly body: string;
  /** 한국어 본문(`stimulus.text.ko`) — 뒷면의 작은 상자입니다. 비면 `null`. */
  readonly koreanBody: string | null;
  /** 앞면 사진의 주소(`stimulus.image_url`을 콘텐츠 그림 포트로 푼 값) — 없거나 못 풀면 `null`. */
  readonly imageUrl: string | null;
};

/** 카드의 보이는 면입니다. 새 카드는 늘 앞면에서 시작합니다. */
export type CultureCardFace = "front" | "back";

export type CultureCardSessionState = {
  readonly cardIndex: number;
  readonly face: CultureCardFace;
  /** 지금 면이 뒤집기로 섰는가입니다 — 뒤집기 움직임은 이때만 겁니다(처음 선 면 · 다음 카드는 움직이지 않음). */
  readonly flipped: boolean;
};

export type CultureCardSessionAction = { readonly type: "nextCard" } | { readonly type: "flip" };

/** 마지막 카드인가에 따른 걸음입니다 — 다음 카드 / 다음 활동으로 넘김 / 결과 보기. */
export type CultureCardStep = "advance" | "hand-off" | "finish";

/** 아래 버튼이 하는 일입니다 — 앞면에서는 뒤집기, 뒷면에서는 걸음 그대로입니다. */
export type CultureCardAction = "flip" | CultureCardStep;

export type CultureCardActivityProps = {
  readonly questions: readonly CultureCardQuestion[];
  readonly gemCount: number;
  readonly onExit: () => void;
  readonly onFinish: ActivityFinish;
  /** 카탈로그 레슨 안의 위치입니다. 주지 않으면 이 활동이 한 세션입니다. */
  readonly lesson?: LessonPosition;
};

/** 카드 접근성 이름을 짓는 재료입니다(`cultureCardLabelOf`) — 빈 줄(`null`)은 이름에도 들지 않습니다. */
export type CultureCardLabelInput = {
  /** 1부터 셉니다. */
  readonly position: number;
  readonly total: number;
  readonly card: CultureCardQuestion;
};

export type CultureCardCopy = {
  readonly instruction: string;
  /** 앞면 제목 위 작은 머리글입니다. */
  readonly eyebrow: string;
  /** 앞면 아래 알약 — 누르면 뒤집힌다는 안내입니다. */
  readonly tapToFlip: string;
  /** 앞면일 때 아래 버튼입니다. */
  readonly flipCard: string;
  /** 뒷면일 때 아래 버튼(다음 카드가 있을 때)입니다. */
  readonly nextCard: string;
  /** 한국어 본문 위 작은 소제목입니다. */
  readonly koreanBodyTitle: string;
  /** 덱 위 오른쪽의 `n / 총수`입니다(보이기만 하고 낭독하지 않음). */
  readonly counter: (position: number, total: number) => string;
  /** 제목 로마자의 낭독 이름입니다. */
  readonly pronunciation: (romanization: string) => string;
  /** 카드 이름의 첫 문장 — 덱 안의 위치와 면입니다. */
  readonly frontPlace: (position: number, total: number) => string;
  readonly backPlace: (position: number, total: number) => string;
  /** 뒷면 이름의 끝 — 다시 누르면 앞면이라는 안내입니다. */
  readonly flipBackHint: string;
};

export type CultureCardTestId =
  | "culture-card-content"
  | "culture-card-counter"
  | "culture-card-layer-far"
  | "culture-card-layer-near"
  | "culture-card-face"
  | "culture-card-photo"
  | "culture-card-scrim"
  | "culture-card-panel-icon"
  | "culture-card-eyebrow"
  | "culture-card-title"
  | "culture-card-title-translation"
  | "culture-card-flip-hint"
  | "culture-card-title-romanization"
  | "culture-card-flip-back"
  | "culture-card-body"
  | "culture-card-korean"
  | "culture-card-korean-title"
  | "culture-card-korean-text";
