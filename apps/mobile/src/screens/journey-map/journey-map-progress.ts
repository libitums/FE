// 여정 진행의 파생값과 접근성 라벨을 소유합니다 — 스텝 축(`stepStatusAt`·
// `stepAccessibilityLabel`·`findStep`·`journeyStepOrdinal`·`completeStep`)과 **맵 항목
// 축**(`JourneyProgress`·`isMapItemComplete`·`completedMapItemCount`·`mapItemStatus`)
// 둘입니다. 진행의 진실의 출처는 App의 상태이고, 이 파일은 그 값에서 파생만 합니다.
//
// ⟨2026-09-29⟩ 맵 항목 축이 여기 들어온 것은 **잠김이 항목 종류 전부에 오게 됐기**
// 때문입니다(표지 게이트). 전에는 잠김이 스텝과 최종 테스트 둘에만 있어 종류마다 다른
// 자리가 냈습니다.

import type { UiCopy } from "../../lib/ui-copy.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";
import { journeySteps } from "./journey-map-units";
import type {
  JourneyMapItem,
  JourneyMapItemStatus,
  JourneyStep,
  JourneyStepId,
  JourneyStepStatus,
} from "./journey-map-units";

// 판정 규칙입니다(그대로):
//   index < completedCount   → "done"
//   index === completedCount → "current"
//   그 밖                     → "locked"
// 방어 분기를 두지 않습니다 — `navigation.ts`의 `currentScreen`과 같은 판단으로, 범위
// 밖 입력에도 위 세 줄이 그대로 적용됩니다.
export function stepStatusAt(index: number, completedCount: number): JourneyStepStatus {
  if (index < completedCount) {
    return "done";
  }
  if (index === completedCount) {
    return "current";
  }
  return "locked";
}

// 접미 낱말은 문구표(`copy.journeyMap.stepStatus`)가 냅니다 — 구분자는 쉼표 + 공백입니다
// (ADR-0016 D3이 고른 것과 같은 부호).

export function stepAccessibilityLabel(
  title: string,
  status: JourneyStepStatus,
  copy: UiCopy,
): string {
  return `${title}, ${copy.journeyMap.stepStatus[status]}`;
}

/**
 * 준비 중 구획의 접근성 이름입니다. 형태가 `${이름}, ${상태낱말}`로 저장소 전체와 같습니다
 * (ADR-0016 D3) — 바로 위 `stepAccessibilityLabel`의 `, locked`와 **같은 부호·같은 자리**
 * 입니다.
 *
 * 이름 부분이 `${label} ${title}`인 것은 롤플레이 구획 머리와 같습니다 — 두 줄을 따로
 * 두면 `Episode 1.`과 이름이 **두 번 멈춰** 읽힙니다.
 *
 * ⚠ **낱말을 여기서 짓지 않고 문구표에서 받습니다.** 처음에는 보이는 문구를 영문으로,
 * 낭독을 한국어로 갈랐는데 **이 앱에 한국어 UI 언어가 없습니다** — 영어가 기준이고 다른
 * 언어가 그것을 덮습니다(`ui-copy.ts`). 낭독만 한국어로 두면 영어 부팅에서 한글이 혼자
 * 남습니다.
 */
export function episodePendingAccessibilityLabel(
  label: string,
  title: string,
  copy: UiCopy,
): string {
  return copy.journeyMap.episodePending(label, title);
}

export function findStep(
  steps: readonly JourneyStep[],
  id: JourneyStepId,
): JourneyStep | undefined {
  return steps.find((step) => step.id === id);
}

// 스텝의 1-based 자리입니다. `journeySteps`의 순서에서 **파생**합니다 — 서수를 따로
// 표에 적으면 `journeySteps`와 그 표가 어긋날 자리가 생깁니다(ADR-0007 D3과 같은
// 논리). 던지지 않습니다: union이 닫혀 있고 `journeySteps`가 다섯을 전부 갖습니다.
export function journeyStepOrdinal(id: JourneyStepId): number {
  return journeySteps.findIndex((step) => step.id === id) + 1;
}

// 단조성이 계약입니다 — 모든 입력에 대해 `completeStep(c, id) >= c`입니다. 조건
// 분기(`if (ordinal > c) …`)로 쓰면 같은 값이 나오지만 단조성이 *분기의 결과*가 되어
// 다음 사람이 분기를 고칠 때 조용히 깨집니다. `Math.max`가 그 성질을 구조적으로
// 보장합니다.
export function completeStep(completedCount: number, id: JourneyStepId): number {
  return Math.max(completedCount, journeyStepOrdinal(id));
}

/**
 * 맵 항목 하나가 끝났는지 봅니다. 완료의 출처가 항목 종류마다 다릅니다 — 일반 스텝은
 * 끝낸 스텝 수, 특별 유닛은 각자의 완료 id 목록입니다. 그것을 한자리에 모아야 에피소드
 * 진행을 셀 수 있습니다.
 *
 * **출처의 수를 문면에 적지 않습니다** — 특별 유닛이 늘 때마다 이 주석이 조용히
 * 거짓이 됩니다(실제로 그렇게 됐습니다). 세는 방법은 `JourneyProgress`의 필드
 * 목록입니다.
 *
 * 던지지 않는 총함수입니다 — `kind`가 닫힌 판별자라 `default`를 두지 않습니다. 종류가
 * 늘면 `never` 대입이 컴파일 단계에서 섭니다.
 */
export function isMapItemComplete(item: JourneyMapItem, progress: JourneyProgress): boolean {
  switch (item.kind) {
    case "standard": {
      return (
        stepStatusAt(journeyStepOrdinal(item.step.id) - 1, progress.completedStepCount) === "done"
      );
    }
    case "episode-intro": {
      return progress.completedEpisodeIntroIds.includes(item.id);
    }
    case "messenger": {
      return progress.completedMessengerUnitIds.includes(item.id);
    }
    case "phone-call": {
      return progress.completedPhoneCallUnitIds.includes(item.id);
    }
    case "visual-novel": {
      return progress.completedVisualNovelUnitIds.includes(item.id);
    }
    case "episode-final": {
      return progress.completedEpisodeFinalIds.includes(item.id);
    }
  }
}

/** 진행의 출처 여섯을 한 묶음으로 받습니다 — 셀 때마다 따로 넘기면 하나를 빠뜨립니다. */
export type JourneyProgress = {
  readonly completedStepCount: number;
  /** 끝낸 표지 유닛입니다. 표지의 완료는 다른 특별 유닛과 같은 축입니다(ADR-0024 D6). */
  readonly completedEpisodeIntroIds: readonly EpisodeIntroUnitId[];
  readonly completedMessengerUnitIds: readonly string[];
  readonly completedPhoneCallUnitIds: readonly string[];
  readonly completedVisualNovelUnitIds: readonly string[];
  readonly completedEpisodeFinalIds: readonly string[];
};

/** 항목들 가운데 끝난 것의 수입니다. 에피소드 헤더의 진행 막대가 이 값을 씁니다. */
export function completedMapItemCount(
  items: readonly JourneyMapItem[],
  progress: JourneyProgress,
): number {
  return items.filter((item) => isMapItemComplete(item, progress)).length;
}

/**
 * 그 구획의 표지가 끝났는지 봅니다. 표지 항목이 없는 구획은 걸 것이 없어 `true`입니다 —
 * 게이트는 표지가 **있을 때만** 섭니다.
 */
function isEpisodeIntroDone(
  sectionItems: readonly JourneyMapItem[],
  progress: JourneyProgress,
): boolean {
  return sectionItems
    .filter((item) => item.kind === "episode-intro")
    .every((item) => isMapItemComplete(item, progress));
}

/** 맵 순서상 앞선 항목을 모두 완료해야 다음 미완료 항목이 열립니다.
 * 기존 완료 기록은 유지하며, 표지를 완료한 뒤에는 완료한 항목을 다시 열 수 있습니다.
 */
export function mapItemStatus(
  item: JourneyMapItem,
  sectionItems: readonly JourneyMapItem[],
  progress: JourneyProgress,
): JourneyMapItemStatus {
  const index = sectionItems.indexOf(item);
  if (index < 0) return "locked";
  if (item.kind !== "episode-intro" && !isEpisodeIntroDone(sectionItems, progress)) {
    return "locked";
  }
  if (isMapItemComplete(item, progress)) return "completed";
  return sectionItems.slice(0, index).every((previous) => isMapItemComplete(previous, progress))
    ? "available"
    : "locked";
}
