// 학습 진행 · 연속 학습의 서버 저장 어휘입니다(ADR-0035). 요청(`progress-api.ts`) · 스냅숏 해석(`app/learning-progress.ts`) ·
// 훅(`app/use-journey-progress.ts`)이 같은 이름을 씁니다. 타입만 둡니다.

/**
 * 서버에 두는 진행 스냅숏입니다(`learning_progress.progress`). **버전을 싣습니다** — 모양이 바뀌면 `version`을
 * 올리고, 앱은 모르는 버전을 버립니다. 유닛 ID는 앱이 읽을 때 이 앱에 있는 것만 남깁니다.
 */
export type LearningProgressSnapshotV1 = {
  readonly version: 1;
  readonly completedStepCount: number;
  readonly completedEpisodeIntroIds: readonly string[];
  readonly completedMessengerUnitIds: readonly string[];
  readonly completedPhoneCallUnitIds: readonly string[];
  readonly visualNovel: { readonly status: "active" | "completed"; readonly beatIndex: number };
  readonly completedEpisodeFinalIds: readonly string[];
};

/** 기기 시간대의 날짜 `YYYY-MM-DD`입니다. 연속 학습은 이 날짜로 셉니다. */
export type LocalDay = string;

export type LoadLearningProgressPath = "/rest/v1/rpc/load_learning_progress";
export type SaveLearningProgressPath = "/rest/v1/rpc/save_learning_progress";
export type RecordLearningDayPath = "/rest/v1/rpc/record_learning_day";
export type LearningStreakPath = "/rest/v1/rpc/learning_streak";
