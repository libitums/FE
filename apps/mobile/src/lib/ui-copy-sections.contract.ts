// UI 문구표의 구획 타입입니다. 타입만 둡니다 — 값(영어 표)과 조회는 `ui-copy-en*.ts` ·
// `ui-copy.ts`가 집니다. 뿌리 타입 `UiCopy`는 `ui-copy.contract.ts`에 있습니다.
//
// **문구표에 드는 것** — 화면 · 공용 컴포넌트 · 그 순수 함수가 스스로 짓는 문구입니다.
// 콘텐츠 항목 하나에 딸린 텍스트(이야기 이름 · 유닛/스텝 제목 · 뜻 풀이 · 문화 노트 · 약관 ·
// 알림 메시지 · 플러스 항목 · 프로필 자리표 값)는 여기 없습니다 — 항목 데이터 곁의 영어
// 리터럴입니다(메신저 `translation`과 같은 자리).
//
// **함수 문구** — 수 · 이름 · 순번이 끼는 문구는 인자를 받는 함수입니다. 복수형은 언어마다
// 표가 스스로 정합니다(영어 `1 gem` / `5 gems`). 문자열을 이어 붙여 복수형을 흉내 내지
// 않습니다. 함수는 던지지 않습니다.
//
// **키 union** — `lib/` 밖(화면 · 앱)이 소유한 union은 import하지 않고 같은 멤버를 여기
// 적습니다(`lib/`는 `screens/` · `app/`을 import하지 않습니다 — ADR-0003). 소비자가
// `copy.x[key]`로 색인하므로 소유자 쪽 union이 늘면 그 자리에서 TS 오류로 섭니다.

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
  /** 스텝 이름 뒤 상태 접미 낱말 */
  readonly stepStatus: Readonly<Record<"done" | "current" | "locked", string>>;
  readonly start: string;
  /** 스텝 말풍선의 `1/4 activities` — 복수는 전체 수 기준 */
  readonly activityCount: (completed: number, total: number) => string;
  /** 진행의 접근성 이름 — `n of N`(보이는 `n/N`은 분수로 읽힌다). */
  readonly activityProgressLabel: (completed: number, total: number) => string;
  /** 아직 유닛이 없는 에피소드 구획에 **보이는** 문구입니다. */
  readonly episodePendingLabel: string;
  /** 같은 구획의 접근성 이름입니다 — `${이름}, ${상태낱말}`로 스텝·롤플레이와 같은 자리입니다. */
  readonly episodePending: (label: string, title: string) => string;
  readonly statModal: {
    readonly streakHero: (days: number) => string;
    readonly episodesClearedHero: (count: number) => string;
    readonly slotProgress: (completed: number, total: number) => string;
  };
};

/** 학습 껍데기(머리 · 나가기 대화상자)입니다. 형식 라벨은 기존 영어(`formLabels`)를 받습니다. */
export type LearningShellCopy = {
  readonly exitLesson: string;
  readonly completionDescription: string;
  readonly completedQuestions: (count: number) => string;
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
};

export type WordChoiceCopy = { readonly instruction: string };

export type SentenceOrderCopy = {
  readonly instruction: string;
  /** 놓인 조각의 낭독 — 서수 접미 대신 `position n` */
  readonly placedChip: (text: string, position: number) => string;
};

export type SpeakingCopy = {
  readonly instruction: string;
  readonly speak: string;
  readonly stopSpeaking: string;
  readonly tapToContinue: string;
  readonly recognitionUnavailable: string;
};

export type WritingCopy = {
  readonly instruction: string;
  readonly erase: string;
  readonly rewrite: string;
  readonly recognitionUnavailable: string;
  readonly guideGlyph: (glyph: string) => string;
  /** 칸을 다 썼을 때 */
  readonly slotsAllWritten: (total: number, written: string) => string;
  /** 쓰는 중 — `written`이 빈 문자열이면 쓴 글자 부분을 읽지 않습니다. */
  readonly slotsCurrent: (
    total: number,
    position: number,
    current: string,
    written: string,
  ) => string;
};

export type CultureCopy = {
  /** 「문화」 — `common.stepTitle`의 둘째 인자 */
  readonly activity: string;
  readonly takeQuiz: string;
};

export type CultureQuizCopy = {
  readonly activity: string;
  readonly instruction: string;
  readonly progress: (ordinal: number, total: number) => string;
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
};

export type EpisodeIntroCopy = {
  readonly skipDialog: {
    readonly title: string;
    readonly description: string;
    readonly skip: string;
    readonly keepWatching: string;
  };
  readonly call: {
    readonly volumeDown: string;
    readonly volumeUp: string;
    readonly volumeLevel: (level: number, max: number) => string;
    readonly volume: string;
    readonly volumeExpanded: string;
    readonly mute: (on: boolean) => string;
    readonly endCall: string;
  };
};

export type EpisodeNarrativeCopy = {
  readonly nextLine: (ordinal: number, total: number) => string;
};

export type EpisodeFinalCopy = {
  /** 보기 뒤 접미 — `idle`은 빈 문자열 */
  readonly optionSuffix: Readonly<Record<"idle" | "correct" | "incorrect", string>>;
};

export type MessengerCopy = {
  readonly chooseReply: string;
  readonly placeholder: string;
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

export type PhoneCallCopy = {
  readonly status: Readonly<Record<"ready" | "playing" | "reply-ready" | "completed", string>>;
  readonly play: Readonly<Record<"start" | "listen" | "listen-again", string>>;
  readonly voiceCall: (callerName: string) => string;
};

export type VisualNovelCopy = {
  readonly storyComplete: string;
  readonly sceneProgress: (ordinal: number, total: number) => string;
};

export type RoleplayCopy = {
  readonly title: string;
  readonly form: Readonly<Record<"messenger" | "phone-call" | "visual-novel", string>>;
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
  readonly destination: Readonly<
    Record<"messenger" | "phone-call" | "visual-novel" | "roleplay-list", string>
  >;
};

export type SettingsCopy = {
  readonly title: string;
  readonly group: Readonly<Record<"account" | "learning" | "accountActions", string>>;
  readonly nav: Readonly<Record<"profile" | "privacy-policy" | "terms-of-use", string>>;
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
  readonly title: string;
  readonly itemLabel: Readonly<Record<"name" | "learning-language" | "learning-goal", string>>;
};

export type GemPurchaseCopy = {
  /** `display`는 `formatGemCount`의 결과, 복수형은 `count`가 정합니다. */
  readonly packAmount: (count: number, display: string) => string;
  readonly balance: (count: number, display: string) => string;
  readonly paymentMethod: string;
  readonly notice: { readonly title: string; readonly description: string };
};
