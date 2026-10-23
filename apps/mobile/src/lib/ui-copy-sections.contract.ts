// UI 문구표의 구획 타입입니다. 타입만 둡니다 — 값(영어 표)과 조회는 `ui-copy-en*.ts` ·
// `ui-copy.ts`가 집니다. 뿌리 타입 `UiCopy`는 `ui-copy.contract.ts`에 있습니다.
//
// 화면이 짓는 UI 문구만 두며, 콘텐츠 데이터는 각 콘텐츠 곁에 둡니다.
//
// **키 union** — `lib/` 밖(화면 · 앱)이 소유한 union은 import하지 않고 같은 멤버를 여기
// 적습니다(`lib/`는 `screens/` · `app/`을 import하지 않습니다 — ADR-0003). 소비자가
// `copy.x[key]`로 색인하므로 소유자 쪽 union이 늘면 그 자리에서 TS 오류로 섭니다. 설정 이동 항목
// (`SettingsNavTarget`)만 타입으로 import합니다 — 항목이 늘면 문구 행이 따라오게 하려는 것입니다.

import type { SettingsNavTarget } from "../screens/settings/settings.contract";
import type { AnswerResult } from "./answer-result";
import type { SessionOptionKey } from "./session-options";
import type { SpecialUnitEntrySource } from "./special-unit-entry-source";

/** 여러 화면이 같은 뜻으로 쓰는 낱말입니다. */
export type CommonCopy = {
  /** 특별 유닛 · 학습의 나가기 — 진입 출처가 목적지를 정합니다(ADR-0007 D6). */
  readonly exitTo: Readonly<Record<SpecialUnitEntrySource, string>>;
  readonly backToSettings: string;
  /** 보이는 판정 라벨입니다. */
  readonly answerResult: Readonly<Record<AnswerResult, string>>;
  /** 이름 뒤에 쉼표로 붙는 판정 접미 낱말입니다(소문자). */
  readonly answerResultSuffix: Readonly<Record<AnswerResult, string>>;
  /** 채점 직후 능동 낭독입니다. */
  readonly resultAnnouncement: (result: AnswerResult) => string;
  readonly allQuestionsDone: string;
  readonly seeResults: string;
  /** 「다음」 */
  readonly next: string;
  /** 「다음으로」 */
  readonly continue: string;
  /** 답을 맞춰 보는 동작(「확인」 · 「확인하기」) */
  readonly check: string;
  /** 안내 대화상자를 닫는 동작(「확인」) */
  readonly ok: string;
  readonly close: string;
  readonly skip: string;
  /** 음성 인식이 듣는 중 */
  readonly listening: string;
  readonly send: string;
  readonly sendWithText: (text: string) => string;
  /** 자기 자신 화자 */
  readonly me: string;
  readonly delete: string;
  /** 「처음부터 보기」 */
  readonly startOver: string;
  /** 보조기술이 밑줄 대신 읽는 빈칸 */
  readonly blank: string;
  /** `${label}, selected` */
  readonly selected: (label: string) => string;
  /** `${label}, locked` */
  readonly locked: (label: string) => string;
  /** 「N단계」 순번 머리 — `Step N · 제목`의 앞부분까지 합칩니다. */
  readonly stepTitle: (ordinal: number, activity: string) => string;
  /** 수 + 단위. 언어마다 복수형이 갈립니다. */
  readonly count: {
    /** 문장 · 접근성 이름 — 영어 `3-day streak` */
    readonly streakDays: (days: number) => string;
    readonly trophies: (count: number) => string;
    readonly gems: (count: number) => string;
    readonly diamonds: (count: number) => string;
  };
};

/** 탭 루트의 머리 · 바텀 네비게이션 · 루트 에러 경계입니다. */
export type ShellCopy = {
  readonly tabs: Readonly<Record<"journey" | "roleplay" | "settings", string>>;
  readonly notifications: string;
  readonly errorBoundary: { readonly title: string; readonly retry: string };
};

export type JourneyMapCopy = {
  readonly start: string;
  /** 스텝 말풍선의 `1/4 activities` — 복수는 전체 수 기준 */
  readonly activityCount: (completed: number, total: number) => string;
  /** 진행의 접근성 이름 — `n of N`(보이는 `n/N`은 분수로 읽힌다). */
  readonly activityProgressLabel: (completed: number, total: number) => string;
  /** 띠 설명 줄 — `("Episode 0.", 3)` → `Episode 0, unit 03`. */
  readonly episodeUnitLabel: (episodeLabel: string, unit: number) => string;
  readonly statModal: {
    readonly streakHero: (days: number) => string;
    readonly episodesClearedHero: (count: number) => string;
    readonly slotProgress: (completed: number, total: number) => string;
  };
};

/** 학습 껍데기(머리 · 나가기 대화상자)입니다. 형식 라벨은 기존 영어(`formLabels`)를 받습니다. */
export type LearningShellCopy = {
  readonly exitLesson: string;
  /** 문화 확인 문항일 때 세션 헤더의 학습형 이름표입니다(다른 낱말 고르기는 `Word choice`). */
  readonly cultureQuizLabel: string;
  readonly completionDescription: string;
  readonly completedQuestions: (count: number) => string;
  readonly completedActivities: (count: number) => string;
  readonly completionStats: { readonly questions: string; readonly activities: string };
  readonly leaveDialog: {
    readonly title: string;
    readonly description: string;
    readonly leave: string;
    readonly stay: string;
  };
  readonly headerNoQuestions: (formLabel: string) => string;
  readonly headerQuestionOf: (formLabel: string, ordinal: number, count: number) => string;
};

export type ListeningCopy = {
  readonly instruction: string;
  readonly playback: Readonly<Record<"pause" | "resume" | "play", string>>;
  readonly playFromStart: string;
  readonly slow: string;
  readonly playAgain: string;
  readonly stop: string;
};

/** 문화 확인(장면 · 질문 카드)의 지시문과 해설 판 제목입니다. */
export type WordChoiceCultureCopy = {
  readonly sceneInstruction: string;
  readonly feedbackTitle: {
    readonly scene: Readonly<Record<"correct" | "incorrect", string>>;
    readonly question: Readonly<Record<"correct" | "incorrect", string>>;
  };
};

export type WordChoiceCopy = {
  readonly instruction: string;
  readonly culture: WordChoiceCultureCopy;
};

export type { SentenceOrderCopy } from "./sentence-order-copy.contract";

export type SpeakingCopy = {
  readonly instruction: string;
  readonly speak: string;
  readonly stopSpeaking: string;
  readonly tryAgain: string;
  readonly dictationDisabled: string;
  readonly tapToContinue: string;
  readonly recognitionUnavailable: string;
};

export type AssessmentCopy = {
  readonly activity: string;
  readonly verdict: Readonly<Record<"passed" | "failed", string>>;
  readonly itemTitle: (ordinal: number) => string;
  /** 낭독 — 판정 낱말은 문장 안이라 보이는 라벨(`verdict`)과 대소문자가 다를 수 있습니다. */
  readonly announcement: (verdict: "passed" | "failed") => string;
};

export type LessonCompleteCopy = {
  readonly rewardDiamonds: (count: number) => string;
  readonly grade: (grade: string) => string;
  readonly outcome: Readonly<Record<"passed" | "failed", string>>;
  readonly mistakes: (count: number) => string;
  /** 0이면 빈 문자열 — 없는 수를 읽지 않습니다. 앞 쉼표를 포함합니다. */
  readonly skippedSuffix: (count: number) => string;
  /** 통과 결과 화면의 「다음 학습」 버튼 — 다음이 레슨 · 문화일 때와 최종 테스트일 때. */
  readonly nextLesson: string;
  readonly nextFinal: string;
};

export type EpisodeIntroCopy = {
  readonly guide: {
    readonly map: string;
    readonly continue: string;
  };
  readonly skipDialog: {
    readonly title: string;
    readonly description: string;
    readonly skip: string;
    readonly keepWatching: string;
  };
};

export type MessengerCopy = {
  readonly keyboard: {
    readonly shift: string;
    readonly shiftOn: string;
    readonly backspace: string;
    readonly comma: string;
    readonly period: string;
    readonly space: string;
    readonly questionMark: string;
  };
};

export type VisualNovelCopy = {
  readonly sceneProgress: (ordinal: number, total: number) => string;
};

export type RoleplayCopy = {
  readonly title: string;
  readonly form: Readonly<Record<"story", string>>;
  readonly viewAll: string;
  readonly viewAllLabel: (sectionLabel: string) => string;
  readonly plus: string;
  readonly plusTagline: string;
  readonly plusSectionLabel: (sectionLabel: string) => string;
  readonly plusDialogTitle: string;
  readonly lockedSection: (name: string) => string;
  readonly premiumLock: Readonly<Record<"episode" | "payment", string>>;
  readonly premiumNotice: (itemTitle: string) => string;
};

export type NotificationsCopy = {
  readonly title: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly deleteLabel: (message: string) => string;
  readonly destination: Readonly<Record<"roleplay-list", string>>;
};

export type SettingsCopy = {
  readonly title: string;
  readonly group: Readonly<Record<"account" | "learning" | "accountActions", string>>;
  readonly nav: Readonly<Record<SettingsNavTarget, string>>;
  readonly sessionOption: Readonly<Record<SessionOptionKey, string>>;
  /** 접미 낱말(소문자) — `Auto-play, on` */
  readonly optionState: Readonly<Record<"on" | "off", string>>;
  /** 「Account actions」 묶음의 행 제목 — 키는 `AccountAction` */
  readonly action: Readonly<Record<"sign-out" | "delete-account", string>>;
  readonly signOutDialog: {
    readonly title: string;
    readonly confirm: string;
    readonly cancel: string;
  };
  readonly deleteDialog: {
    readonly title: string;
    readonly description: string;
    readonly confirm: string;
    readonly cancel: string;
  };
  /** 삭제 실패 문구 — `network`만 따로, 나머지 넷은 `other` */
  readonly deleteFailure: Readonly<Record<"network" | "other", string>>;
  /** 떠난 뒤 새 세션이 한 번 낭독하는 결과 — 키는 `AccountExit` */
  readonly exitAnnouncement: Readonly<Record<"signed-out" | "deleted", string>>;
};

export type ProfileCopy = {
  readonly notProvided: string;
  readonly learningLanguage: string;
  readonly title: string;
  readonly itemLabel: Readonly<Record<"name" | "email" | "phone" | "learning-language", string>>;
};

export type GemPurchaseCopy = {
  /** `display`는 `formatGemCount`의 결과, 복수형은 `count`가 정합니다. */
  readonly packAmount: (count: number, display: string) => string;
  readonly balance: (count: number, display: string) => string;
  readonly paymentMethod: string;
  readonly notice: { readonly title: string; readonly description: string };
};
