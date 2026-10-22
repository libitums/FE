// 옛 튜토리얼의 진행 기록입니다 — 스냅숏 v1의 옛 필드 여섯을 얼려 읽고 · 합치고 · 그대로 다시 쓰게 합니다.
// 서버 저장 함수가 이 여섯을 필수로 검증하고 다른 기기의 옛 앱도 읽으므로 지우지 않습니다. 순수 함수만 있습니다.

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

// 옛 튜토리얼에 있던 id입니다 — 스냅숏에서 이 밖의 값은 버립니다.
const KNOWN_INTRO_IDS: readonly string[] = ["tutorial-intro"];
const KNOWN_MESSENGER_IDS: readonly string[] = ["appointment-confirmation"];
const KNOWN_PHONE_CALL_IDS: readonly string[] = ["appointment-confirmation-phone-call"];
const KNOWN_FINAL_IDS: readonly string[] = [LEGACY_TUTORIAL_FINAL_ID];

function knownIds(known: readonly string[], value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && known.includes(item) && !ids.includes(item)) ids.push(item);
  }
  return ids;
}

function visualNovelFrom(value: unknown): LegacyVisualNovelRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const { status, beatIndex } = value as Record<string, unknown>;
  if (status === "completed") return { status: "completed", beatIndex: 2 };
  if (status === "active" && (beatIndex === 0 || beatIndex === 1)) {
    return { status: "active", beatIndex };
  }
  return null;
}

/** 스냅숏 레코드에서 읽습니다. 모양이 틀리면 null입니다(스냅숏 전체를 버리는 규칙). 알려진 옛 id만 남기고 겹침을 뺍니다. */
export function legacyTutorialRecordFrom(
  record: Readonly<Record<string, unknown>>,
): LegacyTutorialRecord | null {
  const steps = record["completedStepCount"];
  if (typeof steps !== "number" || !Number.isInteger(steps) || steps < 0) return null;
  const intro = knownIds(KNOWN_INTRO_IDS, record["completedEpisodeIntroIds"]);
  const messenger = knownIds(KNOWN_MESSENGER_IDS, record["completedMessengerUnitIds"]);
  const phoneCall = knownIds(KNOWN_PHONE_CALL_IDS, record["completedPhoneCallUnitIds"]);
  const finals = knownIds(KNOWN_FINAL_IDS, record["completedEpisodeFinalIds"]);
  const visualNovel = visualNovelFrom(record["visualNovel"]);
  if (
    intro === null ||
    messenger === null ||
    phoneCall === null ||
    finals === null ||
    visualNovel === null
  ) {
    return null;
  }
  return {
    completedStepCount: steps,
    completedEpisodeIntroIds: intro,
    completedMessengerUnitIds: messenger,
    completedPhoneCallUnitIds: phoneCall,
    visualNovel,
    completedEpisodeFinalIds: finals,
  };
}

function union(x: readonly string[], y: readonly string[]): readonly string[] {
  return [...x, ...y.filter((item) => !x.includes(item))];
}

function includesAll(whole: readonly string[], part: readonly string[]): boolean {
  return part.every((item) => whole.includes(item));
}

/** 목록 합집합(앞쪽 순서 유지) · 스텝 최댓값 · 더 나아간 비주얼 노벨입니다. 입력은 바뀌지 않습니다. */
export function mergeLegacyTutorialRecords(
  a: LegacyTutorialRecord,
  b: LegacyTutorialRecord,
): LegacyTutorialRecord {
  const aheadVisualNovel =
    a.visualNovel.status === "completed"
      ? a.visualNovel
      : b.visualNovel.status === "completed" || b.visualNovel.beatIndex > a.visualNovel.beatIndex
        ? b.visualNovel
        : a.visualNovel;
  return {
    completedStepCount: Math.max(a.completedStepCount, b.completedStepCount),
    completedEpisodeIntroIds: union(a.completedEpisodeIntroIds, b.completedEpisodeIntroIds),
    completedMessengerUnitIds: union(a.completedMessengerUnitIds, b.completedMessengerUnitIds),
    completedPhoneCallUnitIds: union(a.completedPhoneCallUnitIds, b.completedPhoneCallUnitIds),
    visualNovel: aheadVisualNovel,
    completedEpisodeFinalIds: union(a.completedEpisodeFinalIds, b.completedEpisodeFinalIds),
  };
}

/** server에 local을 합쳐도 늘어나는 것이 없으면 true입니다. 순서 · 중복은 보지 않습니다. */
export function legacyTutorialRecordCovers(
  server: LegacyTutorialRecord,
  local: LegacyTutorialRecord,
): boolean {
  return (
    server.completedStepCount >= local.completedStepCount &&
    includesAll(server.completedEpisodeIntroIds, local.completedEpisodeIntroIds) &&
    includesAll(server.completedMessengerUnitIds, local.completedMessengerUnitIds) &&
    includesAll(server.completedPhoneCallUnitIds, local.completedPhoneCallUnitIds) &&
    includesAll(server.completedEpisodeFinalIds, local.completedEpisodeFinalIds) &&
    server.visualNovel.beatIndex >= local.visualNovel.beatIndex
  );
}

/** 옛 튜토리얼을 끝냈는가 — 옛 맵에서 최종 테스트는 같은 에피소드의 나머지를 모두 끝내야 열렸습니다. */
export function legacyTutorialPassed(record: LegacyTutorialRecord): boolean {
  return record.completedEpisodeFinalIds.includes(LEGACY_TUTORIAL_FINAL_ID);
}

/** 스텝 + 목록 넷의 길이 + (비주얼 노벨 완료 ? 1 : 0)입니다. */
export function legacyTutorialActivityCount(record: LegacyTutorialRecord): number {
  return (
    record.completedStepCount +
    record.completedEpisodeIntroIds.length +
    record.completedMessengerUnitIds.length +
    record.completedPhoneCallUnitIds.length +
    record.completedEpisodeFinalIds.length +
    (record.visualNovel.status === "completed" ? 1 : 0)
  );
}

/** 활동 수 > 0 이거나 비주얼 노벨 장면 > 0입니다(돌아온 학습자 판정). */
export function hasLegacyTutorialActivity(record: LegacyTutorialRecord): boolean {
  return legacyTutorialActivityCount(record) > 0 || record.visualNovel.beatIndex > 0;
}
