// 에피소드 서사 표지의 타입 전용 계약입니다 — 구현 · JSX를 두지 않습니다.

import type { SafeAreaInsets } from "../../lib/safe-area";
import type { EpisodeNarrative } from "../episode-narrative/episode-narrative";
import type { JourneyMapItemStatus } from "../journey-map/journey-map";

export type EpisodeIntroUnitId = "tutorial-intro";
/**
 * 표지 유닛의 이름입니다. 리터럴인 것은 다른 특별 유닛 넷의 선례를 따른 것입니다
 * (`EpisodeFinalTitle` · 메신저의 `"A Message from Minseo"`) — 컨텐츠가 아니라 **그 유닛이
 * 무엇인가를 말하는 기능 라벨**이라 값을 비워 둘 수 없습니다.
 *
 * 「에피소드 **서사**」가 아니라 「에피소드 **표지**」인 것은 낭독 때문입니다.
 * `LearningUnit`이 이름을 `제목 + 상태 접미사 + "이야기 연결"`로 짓기 때문에, 「서사」면
 * 「에피소드 서사, 현재 항목, 이야기 연결」로 *서사*와 *이야기*가 한 호흡에 두 번
 * 들립니다. 표지는 커버이고 서사는 본문이라(`episode-prologue`) 뜻도 이쪽이 맞습니다.
 */
export type EpisodeIntroTitle = "Episode intro";

/** 여정 유닛 목록에 들어가는 모양입니다(`journey-map-units.ts`). */
export type EpisodeIntroJourneyUnitContract = {
  readonly kind: "special";
  readonly id: EpisodeIntroUnitId;
  readonly title: EpisodeIntroTitle;
  readonly screen: "episode-intro";
};

/** 맵 항목입니다. 잠김은 항목이 지지 않고 파생이 냅니다(`journey-map-progress.ts`). */
export type EpisodeIntroJourneyMapItemContract = {
  readonly kind: "episode-intro";
  readonly id: EpisodeIntroUnitId;
  readonly title: EpisodeIntroTitle;
};

export type EpisodeIntroMapItemProps = {
  readonly id: EpisodeIntroUnitId;
  readonly title: EpisodeIntroTitle;
  /** 표지는 구획의 첫 항목이라 `locked`가 오지 않습니다 — 그래도 타입은 공용을 씁니다. */
  readonly status: JourneyMapItemStatus;
  readonly onSelect: (id: EpisodeIntroUnitId) => void;
};

/**
 * 표지 · 서사의 제품 사용 이벤트입니다. 필드는 문자열 · 불리언뿐입니다.
 *   - `episode_intro_viewed` — 맵의 표지 항목을 눌러 표지가 설 때. 끝낸 표지를 다시 열어도 납니다
 *   - `episode_intro_skipped` — 확인 모달에서 `건너뛰기`를 골랐을 때. `Skip`을 누른 것만으로는 나지 않습니다
 *   - `episode_intro_continued` — `Next`. 서사가 없는 에피소드면 곧장 유닛이 열립니다(`hasPrologue: false`)
 *   - `episode_intro_exited` — 표지(`intro`)나 서사(`prologue`)에서 뒤로 나갈 때
 *   - `episode_prologue_completed` — 서사를 끝까지 보고 하단 버튼을 눌렀을 때
 *
 * 끝낸 표지는 영속하지 않아 앱을 다시 켜면 표지부터 다시 지납니다 — 같은 사람이 같은
 * 표지를 여러 번 봅니다.
 */
export type EpisodeIntroViewedEvent = {
  readonly name: "episode_intro_viewed";
  readonly episodeId: string;
};
export type EpisodeIntroSkippedEvent = {
  readonly name: "episode_intro_skipped";
  readonly episodeId: string;
};
export type EpisodeIntroContinuedEvent = {
  readonly name: "episode_intro_continued";
  readonly episodeId: string;
  readonly hasPrologue: boolean;
};
export type EpisodeIntroExitStage = "intro" | "prologue";
export type EpisodeIntroExitedEvent = {
  readonly name: "episode_intro_exited";
  readonly episodeId: string;
  readonly stage: EpisodeIntroExitStage;
};
export type EpisodePrologueCompletedEvent = {
  readonly name: "episode_prologue_completed";
  readonly episodeId: string;
  readonly prologueKind: EpisodePrologue["kind"];
};
/** 에피소드 끝 설문의 답입니다(ADR-0036). `rating`은 `"1"` … `"5"`. */
export type EpisodeSurveyAnsweredEvent = {
  readonly name: "episode_survey_answered";
  readonly episodeId: string;
  readonly rating: string;
};
export type EpisodeSurveySkippedEvent = {
  readonly name: "episode_survey_skipped";
  readonly episodeId: string;
};
export type EpisodeIntroEvent =
  | EpisodeIntroViewedEvent
  | EpisodeIntroSkippedEvent
  | EpisodeIntroContinuedEvent
  | EpisodeIntroExitedEvent
  | EpisodePrologueCompletedEvent
  | EpisodeSurveyAnsweredEvent
  | EpisodeSurveySkippedEvent;
/** 보내지 않을 때는 `null`입니다 — no-op 함수로 수집을 가장하지 않습니다(`MessengerEventSink`와 같은 규약). */
export type EpisodeIntroEventSink = ((event: EpisodeIntroEvent) => void) | null;
export type EpisodeIntroAppProps = { readonly episodeIntroEventSink?: EpisodeIntroEventSink };

export type EpisodeIntroScreenProps = {
  /**
   * 가장자리 여백입니다. 이 화면은 배경을 상태바 · 홈 인디케이터 뒤까지 깔고, 글자와
   * 버튼만 이 여백 안에 둡니다 — 셸이 여백을 잡으면 셸 배경이 띠로 남아 장면을 끊습니다.
   */
  readonly insets: SafeAreaInsets;
  /** 첫 줄입니다 — `Episode 0.` */
  readonly label: string;
  /** 둘째 줄입니다 — 에피소드의 이름입니다. */
  readonly title: string;
  /** 표지를 보지 않은 것으로 두고 맵으로 돌아갑니다. 다음에 유닛을 열면 다시 뜹니다. */
  readonly onBack: () => void;
  /** 확인 모달에서 `건너뛰기`를 골랐을 때만 불립니다. `Skip`을 누른 것만으로는 불리지 않습니다. */
  readonly onSkip: () => void;
  readonly onNext: () => void;
};

export type EpisodeIntroTestId =
  | "episode-intro-screen"
  | "episode-intro-screen-safe"
  | "episode-intro-screen-back"
  | "episode-intro-screen-heading"
  | "episode-intro-screen-label"
  | "episode-intro-screen-title"
  | "episode-intro-screen-skip"
  | "episode-intro-screen-next"
  | "episode-intro-screen-confirm"
  | "prologue-call-screen"
  | "prologue-call-screen-back"
  | "prologue-call-screen-title"
  | "prologue-call-screen-caller"
  | "prologue-call-screen-clock"
  | "prologue-call-screen-line"
  | "prologue-call-screen-line-text"
  | "prologue-call-screen-line-translation"
  | "prologue-call-screen-mute"
  | "prologue-call-screen-volume"
  | "prologue-call-screen-volume-panel"
  | "prologue-call-screen-volume-down"
  | "prologue-call-screen-volume-up"
  | "prologue-call-screen-end"
  | "prologue-call-screen-complete"
  | "prologue-chat-screen"
  | "prologue-chat-screen-back"
  | "prologue-chat-screen-title"
  | "prologue-chat-screen-list"
  | `prologue-chat-screen-message-${string}`
  | "prologue-chat-screen-composer"
  | "prologue-chat-screen-draft"
  | "prologue-chat-screen-send"
  | "prologue-chat-screen-complete";

/** 서사 통화의 대사 한 줄입니다. 위가 한국어, 아래가 번역입니다. */
export type PrologueCallLine = {
  /** 음원이 있으면 재생 완료 후 다음 대사로 넘어갑니다. */
  readonly audioSource?: string;
  readonly text: string;
  readonly translation: string;
};

/**
 * 표지의 `Next` 뒤에 이어지는 서사 통화입니다. **학습이 아닙니다** — 고를 답도 판정도
 * 없고, 대사가 저절로 흐른 뒤 끝납니다.
 */
export type PrologueCall = {
  readonly callerName: string;
  /** 비어 있지 않습니다. */
  readonly lines: readonly PrologueCallLine[];
};

/** 서사 메신저의 메시지 한 통입니다. 위가 한국어, 아래가 번역입니다. */
export type PrologueChatMessage = {
  readonly id: string;
  /** `other`는 상대가 보내 저절로 오고, `self`는 입력창에 채워져 사용자가 보냅니다. */
  readonly sender: "other" | "self";
  readonly text: string;
  readonly translation: string;
};

/**
 * 표지의 `Next` 뒤에 이어지는 서사 메신저입니다. **학습이 아닙니다** — 고를 답이 없고,
 * 내 차례가 되면 보낼 말이 입력창에 채워져 보내기만 누릅니다.
 */
export type PrologueChat = {
  readonly partnerName: string;
  /** 비어 있지 않습니다. */
  readonly messages: readonly PrologueChatMessage[];
};

/**
 * 서사 한 구간입니다. 통화의 인물 그림을 생략하면 기존 인물을, null이면 익명 아바타를 씁니다.
 */
export type EpisodePrologueSegment =
  | { readonly kind: "call"; readonly call: PrologueCall; readonly callerPortrait?: string | null }
  | { readonly kind: "messenger"; readonly chat: PrologueChat }
  | { readonly kind: "visual-novel"; readonly narrative: EpisodeNarrative };

/** 구간 전부를 마친 뒤에만 학습 완료를 엽니다. 단일 형식의 기존 에피소드도 유지합니다. */
export type EpisodePrologue =
  | EpisodePrologueSegment
  | {
      readonly kind: "sequence";
      readonly segments: readonly [EpisodePrologueSegment, ...EpisodePrologueSegment[]];
    };

export type PrologueChatScreenProps = {
  /** 없으면 MotionProvider의 값을 따릅니다. */
  readonly reducedMotion?: boolean;
  readonly guided?: boolean;
  readonly insets: SafeAreaInsets;
  /** 머리 줄입니다 — `Episode 0.` */
  readonly episodeLabel: string;
  readonly chat: PrologueChat;
  /** 끝난 대화의 하단 버튼을 눌렀습니다. 대화가 끝나는 것만으로는 불리지 않습니다. */
  readonly onComplete: () => void;
  /** 서사를 본 것으로 적지 않고 맵으로 돌아갑니다. */
  readonly onBack: () => void;
};

/** 소리 크기 단계입니다. 0은 쓰지 않습니다 — 소리를 없애는 것은 음소거의 몫입니다. */
export type PrologueCallVolume = 1 | 2 | 3 | 4 | 5;

export type PrologueCallScreenProps = {
  /** 없으면 MotionProvider의 값을 따릅니다. */
  readonly reducedMotion?: boolean;
  readonly guided?: boolean;
  readonly insets: SafeAreaInsets;
  /** 머리 줄입니다 — `Episode 0.` */
  readonly episodeLabel: string;
  readonly call: PrologueCall;
  /** 통화 상대의 얼굴 그림입니다. */
  readonly callerPortrait: string | null;
  /**
   * 끝난 통화의 하단 버튼을 눌렀습니다. 통화가 끝나는 것(마지막 대사가 흐름 · 종료
   * 버튼)만으로는 불리지 않습니다 — 끝나면 하단에 버튼이 서고, 그 버튼이 다음으로 갑니다.
   */
  readonly onComplete: () => void;
  /** 서사를 본 것으로 적지 않고 맵으로 돌아갑니다. */
  readonly onBack: () => void;
};
