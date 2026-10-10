// 학습 문항 안내(learning-item-guides)의 계약입니다. 타입만 둡니다 — 판정 · 저장은
// `learning-item-guide.ts`, 훅은 `components/use-learning-item-guide.ts`, 그림은
// `components/LearningItemGuide.tsx`가 집니다.

/** 안내의 종류입니다. 종류마다 기기에서 한 번만 뜹니다. */
export type LearningItemGuideKind =
  | "sentence-order"
  | "messenger"
  | "phone-call"
  | "visual-novel"
  | "speaking"
  | "writing";

/**
 * 화면이 설 때의 첫 문항(첫 답장)에서 뽑은 판정 입력입니다. 화면은 자기 데이터의 필드를
 * 그대로 옮기기만 하고 판정하지 않습니다. 문항이 없으면 `null`을 넘깁니다.
 */
export type LearningItemGuideSubject =
  | { readonly form: "sentence-order"; readonly chips: readonly string[] }
  | { readonly form: "messenger"; readonly choices: readonly string[] | undefined }
  | { readonly form: "phone-call" }
  | { readonly form: "visual-novel" }
  | { readonly form: "speaking"; readonly optionalPractice: boolean | undefined }
  | { readonly form: "writing"; readonly optionalPractice: boolean | undefined };

/** 호스트 저장소(StorageModule)의 키입니다. 값은 종류 문자열의 JSON 배열입니다. */
export type LearningItemGuideSeenStorageKey = "libitum.learning-item-guides.seen";

export type LearningItemGuideMessage = {
  readonly title: string;
  readonly description: string;
};

/** `UiCopy.learningItemGuide`의 모양입니다. 닫는 법 줄은 `episodeIntro.guide.continue`를 씁니다. */
export type LearningItemGuideCopy = {
  readonly [K in LearningItemGuideKind]: LearningItemGuideMessage;
};

// ---- 순수 함수 (lib/learning-item-guide.ts)
export type LearningItemGuideKindFor = (
  subject: LearningItemGuideSubject | null,
) => LearningItemGuideKind | null;
export type SeenLearningItemGuidesFrom = (raw: string | null) => readonly LearningItemGuideKind[];
export type WithLearningItemGuideSeen = (
  seen: readonly LearningItemGuideKind[],
  kind: LearningItemGuideKind,
) => readonly LearningItemGuideKind[];
export type ShouldShowLearningItemGuide = (input: {
  readonly kind: LearningItemGuideKind | null;
  readonly seen: readonly LearningItemGuideKind[];
  readonly storageAvailable: boolean;
}) => boolean;

// ---- 저장 접점 (lib/learning-item-guide.ts — lib/storage.ts만 부릅니다)
export type LoadSeenLearningItemGuides = () => readonly LearningItemGuideKind[];
export type MarkLearningItemGuideSeen = (kind: LearningItemGuideKind) => void;

// ---- 훅 (components/use-learning-item-guide.ts)
export type LearningItemGuideState =
  | { readonly visible: false }
  | {
      readonly visible: true;
      readonly kind: LearningItemGuideKind;
      readonly dismiss: () => void;
    };
export type UseLearningItemGuide = (
  subject: LearningItemGuideSubject | null,
) => LearningItemGuideState;

// ---- 컴포넌트 (components/LearningItemGuide.tsx)
export type LearningItemGuideProps = {
  readonly kind: LearningItemGuideKind;
  readonly onDismiss: () => void;
};
