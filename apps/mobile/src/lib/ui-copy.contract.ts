// UI 언어와 문구표의 뿌리 계약입니다. 타입만 둡니다 — 구현은 `ui-copy.ts`(조회 · context) ·
// `ui-language.ts`(저장) · `ui-copy-en*.ts`(영어 표)가 집니다.
//
// **학습 콘텐츠는 여기 없습니다.** 이 앱은 한국어를 배우는 앱이라 대사 · 예문 · 보기 ·
// 받아쓰기 대상은 늘 한국어이고, 문구표는 그 둘레의 UI 문구만 집니다.

import type { EntryLanguage } from "./entry-language";
import type { FeedbackCopy } from "./feedback.contract";
import type { LearningItemGuideCopy } from "./learning-item-guide.contract";
import type {
  AssessmentCopy,
  CommonCopy,
  CultureCopy,
  CultureQuizCopy,
  EpisodeFinalCopy,
  EpisodeIntroCopy,
  EpisodeNarrativeCopy,
  GemPurchaseCopy,
  JourneyMapCopy,
  LearningShellCopy,
  LessonCompleteCopy,
  ListeningCopy,
  MessengerCopy,
  NotificationsCopy,
  PhoneCallCopy,
  ProfileCopy,
  RoleplayCopy,
  SentenceOrderCopy,
  SettingsCopy,
  ShellCopy,
  SpeakingCopy,
  VisualNovelCopy,
  WordChoiceCopy,
  WritingCopy,
} from "./ui-copy-sections.contract";

/**
 * UI 언어입니다. **진입 흐름이 고르는 언어와 같은 어휘입니다** — 언어 선택 화면에서 고른
 * 것이 곧 UI 언어이고, 둘을 따로 두지 않습니다. 언어가 늘면 `EntryLanguage`가 늘고, 아래
 * `UiCopyCatalog`가 그 키를 요구해 TS 오류로 섭니다.
 */
export type UiLanguage = EntryLanguage;

/** 한 언어의 UI 문구 전부입니다. 영어 표는 이 타입 그대로 — **모든 키가 필수**입니다. */
export type UiCopy = {
  readonly common: CommonCopy;
  readonly shell: ShellCopy;
  readonly journeyMap: JourneyMapCopy;
  readonly learningShell: LearningShellCopy;
  readonly listening: ListeningCopy;
  readonly wordChoice: WordChoiceCopy;
  readonly sentenceOrder: SentenceOrderCopy;
  readonly speaking: SpeakingCopy;
  readonly writing: WritingCopy;
  readonly learningItemGuide: LearningItemGuideCopy;
  readonly culture: CultureCopy;
  readonly cultureQuiz: CultureQuizCopy;
  readonly assessment: AssessmentCopy;
  readonly lessonComplete: LessonCompleteCopy;
  readonly episodeIntro: EpisodeIntroCopy;
  readonly episodeNarrative: EpisodeNarrativeCopy;
  readonly episodeFinal: EpisodeFinalCopy;
  readonly messenger: MessengerCopy;
  readonly phoneCall: PhoneCallCopy;
  readonly visualNovel: VisualNovelCopy;
  readonly roleplay: RoleplayCopy;
  readonly notifications: NotificationsCopy;
  readonly settings: SettingsCopy;
  readonly profile: ProfileCopy;
  readonly feedback: FeedbackCopy;
  readonly gemPurchase: GemPurchaseCopy;
};

/**
 * 영어 밖 언어의 표입니다. **어느 깊이의 키든 빠질 수 있고, 빠진 키는 영어로 채워집니다.**
 * 함수 문구는 통째로 바꾸거나 통째로 빠집니다(함수 안을 부분으로 가르지 않습니다).
 *
 * 옵셔널이 ADR-0007 D5(「아직 없다」를 옵셔널로 두지 않는다)에 걸리지 않는 까닭: 빈자리를
 * 소비자가 가르지 않습니다. 채우는 자리가 `uiCopyWithOverrides` 하나이고 화면은 늘 완전한
 * `UiCopy`만 받습니다 — D5가 막으려던 「교체 지점이 소비자 수만큼 는다」가 생기지 않습니다.
 */
export type UiCopyOverrides = DeepPartialCopy<UiCopy>;

export type DeepPartialCopy<T> = T extends (...args: never[]) => unknown
  ? T
  : { readonly [K in keyof T]?: DeepPartialCopy<T[K]> };

/**
 * 언어별 표 전체입니다. **언어 키는 빠질 수 없고**(`en` 밖도 `{}`로라도 적어야 합니다),
 * 영어만 완전한 표입니다.
 */
export type UiCopyCatalog = { readonly en: UiCopy } & {
  readonly [L in Exclude<UiLanguage, "en">]: UiCopyOverrides;
};

/** 호스트 저장소(StorageModule)의 키입니다. 값은 `UiLanguage` 문자열 하나입니다. */
export type UiLanguageStorageKey = "libitum.ui.language";

// ---------------------------------------------------------------- 함수 모양

/** 저장된 값(없으면 `null`)을 언어로 좁힙니다. 모르는 값 · `null`은 `initialEntryLanguage`. 던지지 않습니다. */
export type UiLanguageFrom = (stored: string | null) => UiLanguage;

/** 저장소를 읽어 언어를 냅니다. 저장소가 없어도(테스트 · Explorer · 메인 스레드) 던지지 않습니다. */
export type LoadUiLanguage = () => UiLanguage;

/** 고른 언어를 저장합니다. 저장소가 없으면 아무것도 하지 않습니다. */
export type SaveUiLanguage = (language: UiLanguage) => void;

/** 영어 표 위에 덮어쓸 표를 깊이 병합합니다. 순수 · 던지지 않음 · 입력을 바꾸지 않음. */
export type UiCopyWithOverrides = (base: UiCopy, overrides: UiCopyOverrides) => UiCopy;

/** 언어의 완전한 표입니다. **같은 언어면 같은 객체**(참조 동일)를 돌려줍니다. 던지지 않습니다. */
export type UiCopyFor = (language: UiLanguage) => UiCopy;

/** 화면 · 공용 컴포넌트가 문구표를 읽는 hook입니다. Provider가 없으면 영어 표입니다. */
export type UseUiCopy = () => UiCopy;
