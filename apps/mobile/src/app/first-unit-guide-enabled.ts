// 첫 유닛 안내를 켤지입니다 — 서버 진행을 불러온 뒤에도 아무것도 끝내지 않은 학습자에게만 켭니다. AppSession에서
// 옮겨 왔습니다(파일 300줄).

import type { VisualNovelProgress } from "../screens/visual-novel/visual-novel.contract";

export type FirstUnitGuideProgress = {
  readonly hasLoadedProgress: boolean;
  readonly completedStepCount: number;
  readonly completedEpisodeIntroIds: readonly string[];
  readonly completedMessengerUnitIds: readonly string[];
  readonly completedPhoneCallUnitIds: readonly string[];
  readonly completedEpisodeFinalIds: readonly string[];
  readonly visualNovelProgress: VisualNovelProgress;
};

export function firstUnitGuideEnabled(progress: FirstUnitGuideProgress): boolean {
  return (
    progress.hasLoadedProgress &&
    progress.completedStepCount === 0 &&
    progress.completedEpisodeIntroIds.length === 0 &&
    progress.completedMessengerUnitIds.length === 0 &&
    progress.completedPhoneCallUnitIds.length === 0 &&
    progress.completedEpisodeFinalIds.length === 0 &&
    progress.visualNovelProgress.status === "active" &&
    progress.visualNovelProgress.beatIndex === 0
  );
}
