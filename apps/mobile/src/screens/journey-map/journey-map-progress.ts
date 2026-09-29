// 여정 진행의 파생값과 접근성 라벨을 소유합니다 — 스텝 축(`stepStatusAt`·
// `stepAccessibilityLabel`·`findStep`·`journeyStepOrdinal`·`completeStep`)과 **맵 항목
// 축**(`JourneyProgress`·`isMapItemComplete`·`completedMapItemCount`·`mapItemStatus`)
// 둘입니다. 진행의 진실의 출처는 App의 상태이고, 이 파일은 그 값에서 파생만 합니다.
//
// ⟨2026-09-29⟩ 맵 항목 축이 여기 들어온 것은 **잠김이 항목 종류 전부에 오게 됐기**
// 때문입니다(표지 게이트). 전에는 잠김이 스텝과 최종 테스트 둘에만 있어 종류마다 다른
// 자리가 냈습니다.

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

// export하지 않는 모듈 내부 상수입니다 — 구분자는 쉼표 + 공백입니다(ADR-0016 D3이
// 고른 것과 같은 부호).
const stepStatusSuffix: Record<JourneyStepStatus, string> = {
  done: "완료됨",
  current: "현재 스텝",
  locked: "잠김",
};

export function stepAccessibilityLabel(title: string, status: JourneyStepStatus): string {
  return `${title}, ${stepStatusSuffix[status]}`;
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

/**
 * 맵 항목 하나가 줄에서 어떤 상태로 서는가입니다.
 *
 * **표지가 먼저입니다** — 그 구획의 표지가 끝나지 않았으면 나머지는 진행이 무엇이든
 * `locked`입니다. 잠김이 완료를 지우는 것이 아니라 **가리는 것**이고, 표지를 끝내면
 * 가려져 있던 완료가 그대로 드러납니다. `initialCompletedStepCount`가 2인 것과 표지
 * 미완료가 동시에 참일 수 있는데(데이터로는 표현되지만 도메인에 없는 상태), 이 순서가
 * 그것을 흡수합니다 — 씨앗을 고쳐 관찰을 0으로 만들지 않습니다.
 *
 * 표지 자신은 잠기지 않습니다 — 구획의 첫 항목이라 앞에 걸 것이 없습니다.
 *
 * 최종 테스트의 잠김이 이 함수 **안으로 접혔습니다**(옛 `episodeFinalStatus`). 남겨
 * 두면 최종 테스트의 잠김을 세는 자리가 둘이 되고, 표지가 그 「다른 항목」에 끼는
 * 것을 한쪽만 고치면 조용히 어긋납니다. 뜻은 그대로입니다 — 같은 구획의 다른 항목이
 * 모두 끝나야 열립니다.
 *
 * ⚠ **스텝 노드는 이 함수를 쓰지 않습니다** — 스텝은 `current`를 지고 그 어휘가
 * `JourneyMapItemStatus`에 없습니다. 여기서 스텝을 받는 것은 **잠김 축의 판정**까지이고,
 * 줄에 그릴 상태(`done`/`current`)는 `stepStatusAt`이 그대로 냅니다.
 *
 * 던지지 않는 총함수입니다 — `kind`가 닫힌 판별자라 `default`를 두지 않습니다.
 */
export function mapItemStatus(
  item: JourneyMapItem,
  sectionItems: readonly JourneyMapItem[],
  progress: JourneyProgress,
): JourneyMapItemStatus {
  if (item.kind === "episode-intro") {
    return isMapItemComplete(item, progress) ? "completed" : "available";
  }
  if (!isEpisodeIntroDone(sectionItems, progress)) {
    return "locked";
  }
  switch (item.kind) {
    case "standard": {
      // 스텝의 세 어휘를 맵 항목의 셋으로 옮깁니다 — `current`가 곧 「지금 열려 있다」입니다.
      const status = stepStatusAt(
        journeyStepOrdinal(item.step.id) - 1,
        progress.completedStepCount,
      );
      if (status === "done") {
        return "completed";
      }
      return status === "current" ? "available" : "locked";
    }
    case "episode-final": {
      if (isMapItemComplete(item, progress)) {
        return "completed";
      }
      const rest = sectionItems.filter((other) => other !== item);
      return rest.every((other) => isMapItemComplete(other, progress)) ? "available" : "locked";
    }
    // 특별 유닛 셋은 표지 뒤에는 언제나 열려 있습니다(ADR-0024 D6) — 서로 순서가
    // 걸리지 않습니다. 순차는 표지 → 가운데 → 최종의 세 구간에만 섭니다.
    case "messenger":
    case "phone-call":
    case "visual-novel": {
      return isMapItemComplete(item, progress) ? "completed" : "available";
    }
  }
}
