// 학습 진행 ↔ 서버 스냅숏(ADR-0035)과 진행에서 파생하는 두 수(활동 수 · 트로피)입니다. 순수 함수만 있습니다.
//
// 스냅숏을 읽을 때 **이 앱에 있는 유닛 ID만** 남깁니다 — 표가 유닛 타입의 모든 값을 키로 가져야 컴파일되므로,
// 유닛이 늘면 여기서 섭니다(`push-target.ts`와 같은 방식).

import type { LearningProgressSnapshotV1 } from "../lib/learning-progress.contract";
import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../screens/episode-intro/episode-intro.contract";
import { isMapItemComplete } from "../screens/journey-map/journey-map-progress";
import type { JourneyMapSection } from "../screens/journey-map/journey-map-types";
import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import type { VisualNovelProgress } from "../screens/visual-novel/visual-novel.contract";
import { completedVisualNovelUnitIdsFrom } from "./journey-progress";
import type { AppJourneySeed } from "./journey-progress";

/** 저장하는 진행 전부입니다 — 부팅 씨앗에 끝낸 표지 유닛을 더한 것입니다. */
export type JourneyProgressState = AppJourneySeed & {
  readonly completedEpisodeIntroIds: readonly EpisodeIntroUnitId[];
};

const introUnits: Record<EpisodeIntroUnitId, true> = { "tutorial-intro": true };
const messengerUnits: Record<MessengerUnitId, true> = { "appointment-confirmation": true };
const phoneCallUnits: Record<PhoneCallUnitId, true> = {
  "appointment-confirmation-phone-call": true,
};
const finalUnits: Record<EpisodeFinalUnitId, true> = { "tutorial-final-test": true };

function knownIds<Id extends string>(table: Record<Id, true>, value: unknown): Id[] | null {
  if (!Array.isArray(value)) return null;
  const ids: Id[] = [];
  for (const item of value) {
    if (
      typeof item === "string" &&
      Object.prototype.hasOwnProperty.call(table, item) &&
      !ids.includes(item as Id)
    ) {
      ids.push(item as Id);
    }
  }
  return ids;
}

function visualNovelFrom(value: unknown): VisualNovelProgress | null {
  if (typeof value !== "object" || value === null) return null;
  const { status, beatIndex } = value as Record<string, unknown>;
  if (status === "completed") return { status: "completed", beatIndex: 2 };
  if (status === "active" && (beatIndex === 0 || beatIndex === 1)) {
    return { status: "active", beatIndex };
  }
  return null;
}

export function learningProgressSnapshotFrom(
  state: JourneyProgressState,
): LearningProgressSnapshotV1 {
  return {
    version: 1,
    completedStepCount: state.completedStepCount,
    completedEpisodeIntroIds: state.completedEpisodeIntroIds,
    completedMessengerUnitIds: state.completedMessengerUnitIds,
    completedPhoneCallUnitIds: state.completedPhoneCallUnitIds,
    visualNovel: state.visualNovelProgress,
    completedEpisodeFinalIds: state.completedEpisodeFinalIds,
  };
}

/** 서버 스냅숏(검증 전) → 진행. 버전이 다르거나 모양이 틀리면 `null` — 그러면 지금 진행을 그대로 둡니다. */
export function journeyProgressFrom(raw: unknown): JourneyProgressState | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (record["version"] !== 1) return null;
  const steps = record["completedStepCount"];
  if (typeof steps !== "number" || !Number.isInteger(steps) || steps < 0) return null;
  const intro = knownIds(introUnits, record["completedEpisodeIntroIds"]);
  const messenger = knownIds(messengerUnits, record["completedMessengerUnitIds"]);
  const phoneCall = knownIds(phoneCallUnits, record["completedPhoneCallUnitIds"]);
  const finals = knownIds(finalUnits, record["completedEpisodeFinalIds"]);
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
    visualNovelProgress: visualNovel,
    completedEpisodeFinalIds: finals,
  };
}

/**
 * 끝낸 활동의 수입니다. 이 수가 늘면 「오늘 활동을 끝냈다」입니다(연속 학습의 하루). 비주얼 노벨의 장면 이동은
 * 활동이 아니라 끝냈을 때만 셉니다.
 */
export function completedActivityCount(state: JourneyProgressState): number {
  return (
    state.completedStepCount +
    state.completedEpisodeIntroIds.length +
    state.completedMessengerUnitIds.length +
    state.completedPhoneCallUnitIds.length +
    (state.visualNovelProgress.status === "completed" ? 1 : 0) +
    state.completedEpisodeFinalIds.length
  );
}

/** 트로피 = 항목을 모두 끝낸 에피소드 수입니다. 아직 유닛이 없는 에피소드는 세지 않습니다. */
export function trophyCountFrom(
  sections: readonly JourneyMapSection[],
  state: JourneyProgressState,
): number {
  const progress = {
    completedStepCount: state.completedStepCount,
    completedEpisodeIntroIds: state.completedEpisodeIntroIds,
    completedMessengerUnitIds: state.completedMessengerUnitIds,
    completedPhoneCallUnitIds: state.completedPhoneCallUnitIds,
    completedVisualNovelUnitIds: completedVisualNovelUnitIdsFrom(state.visualNovelProgress),
    completedEpisodeFinalIds: state.completedEpisodeFinalIds,
  };
  return sections.filter(
    (section) =>
      section.items.length > 0 && section.items.every((item) => isMapItemComplete(item, progress)),
  ).length;
}

/**
 * 두 진행을 합칩니다 — 완료 목록은 합집합, 스텝 수는 큰 쪽, 비주얼 노벨은 더 나아간 쪽. 기기와 서버 중 어느 쪽이
 * 앞서도(오프라인에서 진행했거나 다른 기기에서 진행했거나) 잃지 않습니다.
 */
function union<T>(x: readonly T[], y: readonly T[]): readonly T[] {
  return [...x, ...y.filter((item) => !x.includes(item))];
}

export function mergeJourneyProgress(
  a: JourneyProgressState,
  b: JourneyProgressState,
): JourneyProgressState {
  const aheadVisualNovel =
    a.visualNovelProgress.status === "completed"
      ? a.visualNovelProgress
      : b.visualNovelProgress.status === "completed" ||
          b.visualNovelProgress.beatIndex > a.visualNovelProgress.beatIndex
        ? b.visualNovelProgress
        : a.visualNovelProgress;
  return {
    completedStepCount: Math.max(a.completedStepCount, b.completedStepCount),
    completedEpisodeIntroIds: union(a.completedEpisodeIntroIds, b.completedEpisodeIntroIds),
    completedMessengerUnitIds: union(a.completedMessengerUnitIds, b.completedMessengerUnitIds),
    completedPhoneCallUnitIds: union(a.completedPhoneCallUnitIds, b.completedPhoneCallUnitIds),
    visualNovelProgress: aheadVisualNovel,
    completedEpisodeFinalIds: union(a.completedEpisodeFinalIds, b.completedEpisodeFinalIds),
  };
}

/** 상단 지표 칩 둘의 값입니다(연속 학습 일수 · 트로피). 화면 결선이 머리 칩을 그리는 화면들에 내립니다. */
export type JourneyStats = { readonly streakDays: number; readonly trophyCount: number };

/** 화면 결선이 받는 진행 쪽 값입니다 — 칩 둘과, 로그인 뒤 서버 진행을 불러오는 함수. */
export type ProgressWiringArgs = JourneyStats & { readonly syncProgress: () => Promise<void> };
