// 체험판 Astro 컴포넌트의 props · 문구 · test-id. 각 `.astro`의 `Props`가 이 타입을 그대로 쓴다.
import type { NonEmpty } from "@libitums/episode-core/judge";

import type { Language } from "../../site";
import type {
  TrialCulture,
  TrialCut,
  TrialImageMatch,
  TrialModel,
  TrialReplySelect,
  TrialTurn,
  TrialVocab,
} from "../../trial/trial-model.contract";

/** 자리표시자 `{name}`을 담은 평문 — 태그 없음. */
type Template = string;

export type TrialCopy = {
  metaTitle: string;
  metaDescription: string;
  noscript: string;
  exit: string;
  progressLabel: string;
  startTitle: string;
  startBody: string;
  /** {name} — 시작 화면 알약: 대화 상대. */
  startWith: Template;
  /** {count} — 시작 화면 알약: 롤플레이 줄 수. */
  startLines: Template;
  start: string;
  next: string;
  me: string;
  thinking: string;
  showTranslation: string;
  gotIt: string;
  /** 새 단어 카드의 표식 알약. */
  newWord: string;
  listen: string;
  listenExample: string;
  choiceCorrect: string;
  choiceWrong: string;
  /** {answer} */
  correctAnswer: Template;
  continue: string;
  cultureFlipToBack: string;
  cultureFlipToFront: string;
  /** {ordinal} {total} */
  lineProgress: Template;
  replay: string;
  speak: string;
  stop: string;
  listening: string;
  /** 말하기를 멈춘 뒤 판정을 기다리는 동안의 마이크 라벨. */
  checking: string;
  showHint: string;
  /** {translation} {roman} — 둘 중 없는 것은 그 조각째 뺀다. */
  hint: Template;
  cantSpeak: string;
  great: string;
  notQuite: string;
  /** {heard} */
  youSaid: Template;
  heardNothing: string;
  tryAgain: string;
  check: string;
  replyEmpty: string;
  noticeUnsupported: string;
  noticeDenied: string;
  noticeUnavailable: string;
  completeTitle: string;
  completeBody: string;
  /** 롤플레이 결과가 failed일 때의 완료 제목. */
  completeTitleMissed: string;
  /** {correct} {total} — 롤플레이 결과가 failed일 때의 완료 본문. */
  completeBodyMissed: Template;
  storeGet: string;
  storeSoon: string;
  backHome: string;
  /** 데스크톱 머리 띠의 사이트로 돌아가기 링크. */
  backToSite: string;
};

/** 스크립트가 쓰는 문구 — 페이지 JSON에 모델과 함께 실린다. */
export type TrialScriptCopy = Pick<
  TrialCopy,
  | "correctAnswer"
  | "choiceCorrect"
  | "choiceWrong"
  | "lineProgress"
  | "speak"
  | "stop"
  | "listening"
  | "hint"
  | "great"
  | "notQuite"
  | "youSaid"
  | "heardNothing"
  | "noticeUnsupported"
  | "noticeDenied"
  | "noticeUnavailable"
  | "completeBodyMissed"
  | "cultureFlipToBack"
  | "cultureFlipToFront"
>;
export type TrialPageData = { readonly model: TrialModel; readonly copy: TrialScriptCopy };
/** 순수 — `{name}`을 값으로. 모르는 이름은 그대로 둔다. */
export type FormatCopy = (template: Template, values: Readonly<Record<string, string>>) => string;

export type TrialStoreLink = {
  readonly id: "ios" | "android";
  readonly platform: string;
  readonly name: string;
  readonly href: string;
};

export interface TrialPageProps {
  language: Language;
  model: TrialModel;
  measurementId: string;
}
export interface TrialBarProps {
  language: Language;
  t: TrialCopy;
}
export interface TrialStartProps {
  t: TrialCopy;
  imageUrl: string | null;
  /** 알약 「With …」 — 콘텐츠의 대화 상대 이름. */
  counterpartName: string;
  /** 알약 「N lines」 — 롤플레이 턴 수. */
  lineCount: number;
}
/** 컷 묶음 — 표지 앞(prologue)과 끝(epilogue)이 같은 모양이라 이름 붙은 변형으로 가른다. */
export interface TrialCutsProps {
  t: TrialCopy;
  step: "prologue" | "epilogue";
  cuts: NonEmpty<TrialCut>;
}
export interface TrialVocabCardProps {
  t: TrialCopy;
  vocab: TrialVocab;
}
export interface TrialImageMatchProps {
  t: TrialCopy;
  item: TrialImageMatch;
}
export interface TrialReplySelectProps {
  t: TrialCopy;
  item: TrialReplySelect;
}
/** 두 고르기 화면이 함께 쓰는 보기 목록 — 화면별 머리는 각 화면이 `slot`으로 앞에 둔다. */
export interface TrialOptionListProps {
  options: TrialImageMatch["options"];
}
/** 두 고르기 화면이 함께 쓰는 판정 줄 + Continue. */
export interface TrialChoiceFooterProps {
  t: TrialCopy;
}
export interface TrialCultureCardProps {
  t: TrialCopy;
  culture: TrialCulture;
}
export interface TrialRoleplayProps {
  t: TrialCopy;
  counterpartName: string;
  imageUrl: string | null;
  turns: NonEmpty<TrialTurn>;
}
export interface TrialTurnProps {
  t: TrialCopy;
  turn: TrialTurn;
  index: number;
  total: number;
  counterpartName: string;
}
export interface TrialCompleteProps {
  t: TrialCopy;
  language: Language;
  stores: readonly TrialStoreLink[];
}

export type TrialTestId =
  | "trial"
  | "trial-model"
  | "trial-noscript"
  | "trial-live"
  | "trial-bar"
  | "trial-exit"
  | "trial-progress"
  | "trial-step-start"
  | "trial-start-image"
  | "trial-start-title"
  | "trial-start-button"
  | "trial-step-prologue"
  | "trial-step-epilogue"
  | "trial-cut"
  | "trial-cut-image"
  | "trial-cut-speaker"
  | "trial-cut-line"
  | "trial-cut-roman"
  | "trial-cut-translation"
  | "trial-cuts-next"
  | "trial-step-vocab"
  | "trial-vocab-word"
  | "trial-vocab-roman"
  | "trial-vocab-meaning"
  | "trial-vocab-listen"
  | "trial-vocab-example"
  | "trial-vocab-example-listen"
  | "trial-vocab-next"
  | "trial-step-image-match"
  | "trial-image-match-image"
  | "trial-image-match-prompt"
  | "trial-step-reply-select"
  | "trial-reply-select-line"
  | "trial-choice-instruction"
  | "trial-choice-listen"
  | "trial-option"
  | "trial-choice-verdict"
  | "trial-choice-next"
  | "trial-step-culture"
  | "trial-culture-card"
  | "trial-culture-image"
  | "trial-culture-title"
  | "trial-culture-body"
  | "trial-culture-tip"
  | "trial-culture-flip"
  | "trial-culture-next"
  | "trial-step-roleplay"
  | "trial-roleplay-image"
  | "trial-turn"
  | "trial-turn-progress"
  | "trial-turn-counterpart"
  | "trial-turn-line"
  | "trial-turn-replay"
  | "trial-turn-reply"
  | "trial-turn-verdict"
  | "trial-turn-heard"
  | "trial-turn-answer"
  | "trial-turn-notice"
  | "trial-turn-speak"
  | "trial-turn-hint-button"
  | "trial-turn-hint"
  | "trial-turn-cant-speak"
  | "trial-turn-retry"
  | "trial-turn-tiles"
  | "trial-tile"
  | "trial-turn-composed"
  | "trial-turn-check"
  | "trial-turn-next"
  | "trial-step-complete"
  | "trial-store"
  | "trial-store-state"
  | "trial-complete-home"
  | "hero-trial-link"
  | "download-trial-link";
