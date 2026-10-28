// 에피소드 표지의 타입 전용 계약입니다 — 구현 · JSX를 두지 않습니다. 표지 컷은 카탈로그 표지 화면(`catalog-cover`)이 잇습니다.

import type { EpisodeUpdateSplashClosedEvent } from "../../lib/episode-update-event.contract";
import type { CatalogLearningEvent } from "../../lib/catalog-learning-event.contract";
import type { ProgressLoadEvent } from "../../lib/progress-load-event.contract";
import type { SafeAreaInsets } from "../../lib/safe-area";
import type { TicketEvent } from "../tickets/tickets.contract";
import type { RoleplayStoryEvent } from "../roleplay-story/roleplay-story.contract";
import type { StoryEvent } from "../story-intro/story-intro.contract";

/**
 * 표지 · 서사의 제품 사용 이벤트입니다. 필드는 문자열 · 불리언뿐입니다.
 *   - `episode_intro_viewed` — 맵의 표지 항목을 눌러 표지가 설 때. 끝낸 표지를 다시 열어도 납니다
 *   - `episode_intro_skipped` — 확인 모달에서 `건너뛰기`를 골랐을 때. `Skip`을 누른 것만으로는 나지 않습니다
 *   - `episode_intro_continued` — `Next`. 서사가 없는 에피소드면 곧장 유닛이 열립니다(`hasPrologue: false`)
 *   - `episode_intro_exited` — 표지(`intro`)나 서사(`prologue`)에서 뒤로 나갈 때
 *   - `episode_prologue_completed` — 서사를 끝까지 보고 하단 버튼을 눌렀을 때
 *   - `episode_content_refreshed` — 에피소드 콘텐츠 갱신이 끝났고 매니페스트를 받았을 때
 *   - `episode_lesson_started` · `episode_lesson_finished` · `episode_final_passed` — 카탈로그
 *     레슨 · 최종 테스트의 시작 · 판정 · 최종 통과(`CatalogLearningEvent`)
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
/** 표지 컷을 끝까지 본 것입니다. 옛 통화 · 메신저 · 비주얼 노벨 서사는 사라졌습니다. */
export type EpisodePrologueCompletedKind = "cuts";
export type EpisodePrologueCompletedEvent = {
  readonly name: "episode_prologue_completed";
  readonly episodeId: string;
  readonly prologueKind: EpisodePrologueCompletedKind;
};
export type EpisodeContentRefreshedEvent = {
  readonly name: "episode_content_refreshed";
  readonly manifest: "updated" | "unchanged" | "invalid";
  /** 10진 문자열입니다. */
  readonly fetchedCount: string;
  readonly lockedCount: string;
  readonly failedCount: string;
  /** `LockReason` 중복 제거 · 사전순 · "," 연결, 없으면 "". */
  readonly lockReasons: string;
  /** "http" | "network" 중복 제거 · 사전순 · "," 연결, 없으면 "". */
  readonly failReasons: string;
  readonly persisted: boolean;
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
  | EpisodeContentRefreshedEvent
  | EpisodeUpdateSplashClosedEvent
  | EpisodeSurveyAnsweredEvent
  | EpisodeSurveySkippedEvent
  | CatalogLearningEvent
  | ProgressLoadEvent
  | TicketEvent
  | RoleplayStoryEvent
  | StoryEvent;
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
  /** 둘째 줄을 이 줄들로 나눠 그립니다. 없으면 `title` 한 덩어리입니다. 낭독 이름은 줄을 공백으로 이은 것입니다(`title`을 나눈 줄이면 `title`과 같습니다). */
  readonly titleLines?: readonly [string, ...string[]];
  /** 건너뛰기 확인 모달의 설명입니다. 없으면 튜토리얼의 기본 문구(다시 서지 않는다)입니다. */
  readonly skipDescription?: string;
  /**
   * 화면 전체에 까는 장면 그림입니다(절대 URL) — 카탈로그 에피소드는 그 에피소드의 첫 컷 그림입니다.
   * 없거나 `null`이면 어두운 면만 그립니다. 로드 전 · 실패 때도 어두운 면이 보입니다.
   */
  readonly backgroundImageUrl?: string | null;
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
  | "episode-intro-screen-confirm";
