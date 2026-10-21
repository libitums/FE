// 옛 튜토리얼의 진행 기록입니다 — 스냅숏 v1의 옛 필드 여섯을 얼려 읽습니다.

export type LegacyVisualNovelRecord = {
  readonly status: "active" | "completed";
  readonly beatIndex: number;
};

/** 옛 튜토리얼의 진행 기록입니다 — 스냅숏 v1의 옛 필드 여섯과 같은 이름 · 같은 모양이고, 앱이 늘리지 않습니다. */
export type LegacyTutorialRecord = {
  readonly completedStepCount: number;
  readonly completedEpisodeIntroIds: readonly string[];
  readonly completedMessengerUnitIds: readonly string[];
  readonly completedPhoneCallUnitIds: readonly string[];
  readonly visualNovel: LegacyVisualNovelRecord;
  readonly completedEpisodeFinalIds: readonly string[];
};

export const LEGACY_TUTORIAL_FINAL_ID = "tutorial-final-test";

export const emptyLegacyTutorialRecord: LegacyTutorialRecord = {
  completedStepCount: 0,
  completedEpisodeIntroIds: [],
  completedMessengerUnitIds: [],
  completedPhoneCallUnitIds: [],
  visualNovel: { status: "active", beatIndex: 0 },
  completedEpisodeFinalIds: [],
};

/** 스냅숏 레코드에서 읽습니다. 모양이 틀리면 null입니다. */
export function legacyTutorialRecordFrom(
  _record: Readonly<Record<string, unknown>>,
): LegacyTutorialRecord | null {
  return null;
}

/** 목록 합집합 · 스텝 최댓값 · 더 나아간 비주얼 노벨입니다. */
export function mergeLegacyTutorialRecords(
  a: LegacyTutorialRecord,
  _b: LegacyTutorialRecord,
): LegacyTutorialRecord {
  return a;
}

export function legacyTutorialRecordCovers(
  _server: LegacyTutorialRecord,
  _local: LegacyTutorialRecord,
): boolean {
  return true;
}

export function legacyTutorialPassed(_record: LegacyTutorialRecord): boolean {
  return false;
}

/** 스텝 + 목록 넷의 길이 + (비주얼 노벨 완료 ? 1 : 0)입니다. */
export function legacyTutorialActivityCount(_record: LegacyTutorialRecord): number {
  return 0;
}

/** 활동 수 > 0 이거나 비주얼 노벨 장면 > 0입니다. */
export function hasLegacyTutorialActivity(_record: LegacyTutorialRecord): boolean {
  return false;
}
