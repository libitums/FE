// 첫 유닛 안내를 켤지입니다 — 서버 진행을 불러온 뒤에도 아무것도 끝내지 않은 학습자에게만 켭니다. 옛 튜토리얼
// 기록에 활동이 있는 학습자(옛 앱 사용자)에게는 뜨지 않습니다. AppSession에서 옮겨 왔습니다(파일 300줄).

import type { CatalogProgress } from "../lib/catalog-progress";
import { catalogActivityCount } from "./learning-progress";
import { hasLegacyTutorialActivity } from "./legacy-tutorial-progress";
import type { LegacyTutorialRecord } from "./legacy-tutorial-progress";

export type FirstUnitGuideProgress = {
  readonly hasLoadedProgress: boolean;
  readonly legacyTutorial: LegacyTutorialRecord;
  readonly catalogProgress: CatalogProgress;
};

export function firstUnitGuideEnabled(progress: FirstUnitGuideProgress): boolean {
  return (
    progress.hasLoadedProgress &&
    !hasLegacyTutorialActivity(progress.legacyTutorial) &&
    catalogActivityCount(progress.catalogProgress) === 0
  );
}
