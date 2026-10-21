// 진행 씨앗 테스트 지원입니다 — 옛 튜토리얼을 다 끝낸 기록 · u00 완료 진행. 제품 코드가 import하지 않습니다.

import type { CatalogProgress } from "../../lib/catalog-progress";
import { TUTORIAL_EPISODE_ID } from "../../lib/tutorial-episode";
import { LEGACY_TUTORIAL_FINAL_ID } from "../legacy-tutorial-progress";
import type { LegacyTutorialRecord } from "../legacy-tutorial-progress";

/** u00 레슨 단원 키입니다(문화 둘 포함) — 완료 키는 여기에 `RP`가 더해집니다. */
export const TUTORIAL_LESSON_KEYS: readonly string[] = Array.from(
  { length: 13 },
  (_, index) => `S${index + 1}`,
);

/** 옛 튜토리얼을 다 끝낸 기록입니다 — 스텝 8 · 표지 · 메신저 · 전화 · 비주얼 노벨 완료 · 최종 테스트. */
export const legacyPassedRecord: LegacyTutorialRecord = {
  completedStepCount: 8,
  completedEpisodeIntroIds: ["tutorial-intro"],
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovel: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: [LEGACY_TUTORIAL_FINAL_ID],
};

/** 부팅 씨앗의 모양입니다(`AppProgressSeed`와 같은 필드). */
export type ProgressSeedShape = {
  readonly legacyTutorial?: LegacyTutorialRecord;
  readonly catalogProgress?: CatalogProgress;
};

export const legacyPassedSeed: ProgressSeedShape = { legacyTutorial: legacyPassedRecord };

/** u00을 다 끝낸 진행입니다 — 완료 키 14 + 표지. */
export function tutorialDoneProgress(): CatalogProgress {
  return { [TUTORIAL_EPISODE_ID]: ["intro", ...TUTORIAL_LESSON_KEYS, "RP"] };
}

/** u00 표지만 끝낸 진행입니다. */
export function tutorialCoverDoneProgress(): CatalogProgress {
  return { [TUTORIAL_EPISODE_ID]: ["intro"] };
}
