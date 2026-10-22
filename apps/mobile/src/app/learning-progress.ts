// 학습 진행 ↔ 서버 스냅숏(ADR-0035)과 진행에서 파생하는 수(활동 수 · 트로피 · 설문 대상)입니다. 순수 함수만 있습니다.
//
// 스냅숏은 v1 그대로입니다 — 서버 저장 함수가 옛 튜토리얼 필드 여섯을 필수로 검증하고 다른 기기의 옛 앱도 읽으므로,
// 옛 필드는 얼린 기록(`legacyTutorial`)으로 읽어 두고 합치고 **그대로 다시 씁니다**(`legacy-tutorial-progress.ts`).

import type { StatBumpKind, StatBumps } from "../lib/stat-bump";
import {
  catalogProgressFrom,
  completedCatalogEpisodeCount,
  isCatalogEpisodeComplete,
  mergeCatalogProgress,
} from "../lib/catalog-progress";
import type { CatalogCompletionKeysOf, CatalogProgress } from "../lib/catalog-progress";
import type { LearningProgressSnapshotV1 } from "../lib/learning-progress.contract";
import {
  fullTicketLedger,
  isFullTicketLedger,
  mergeTicketLedgers,
  ticketLedgerCovers,
  ticketLedgerFrom,
} from "../lib/learning-tickets";
import type { TicketLedger } from "../lib/learning-tickets";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { catalogSectionTitle } from "../screens/journey-map/catalog-sheet";
import type { JourneyMapProgressLoad } from "../screens/journey-map/journey-map-load.contract";
import {
  emptyLegacyTutorialRecord,
  legacyTutorialActivityCount,
  legacyTutorialPassed,
  legacyTutorialRecordCovers,
  legacyTutorialRecordFrom,
  mergeLegacyTutorialRecords,
} from "./legacy-tutorial-progress";
import type { LegacyTutorialRecord } from "./legacy-tutorial-progress";

/** 저장하는 진행 전부입니다 — 얼린 옛 튜토리얼 기록 · 카탈로그 에피소드 진행 · 학습 티켓 원장입니다. */
export type JourneyProgressState = {
  readonly legacyTutorial: LegacyTutorialRecord;
  /** 카탈로그 에피소드 진행(`lib/catalog-progress.ts`). 없으면 `{}`. */
  readonly catalogProgress: CatalogProgress;
  /** 학습 티켓 원장(`lib/learning-tickets.ts`). 없으면 가득입니다. */
  readonly tickets?: TicketLedger;
};

export const emptyJourneyProgress: JourneyProgressState = {
  legacyTutorial: emptyLegacyTutorialRecord,
  catalogProgress: {},
};

export function learningProgressSnapshotFrom(
  state: JourneyProgressState,
): LearningProgressSnapshotV1 {
  const legacy = state.legacyTutorial;
  return {
    version: 1,
    completedStepCount: legacy.completedStepCount,
    completedEpisodeIntroIds: legacy.completedEpisodeIntroIds,
    completedMessengerUnitIds: legacy.completedMessengerUnitIds,
    completedPhoneCallUnitIds: legacy.completedPhoneCallUnitIds,
    visualNovel: legacy.visualNovel,
    completedEpisodeFinalIds: legacy.completedEpisodeFinalIds,
    // 비면 싣지 않습니다 — 옛 서버 · 옛 앱이 보는 스냅숏과 바이트가 같게.
    ...(Object.keys(state.catalogProgress).length > 0
      ? { catalogProgress: state.catalogProgress }
      : {}),
    ...(state.tickets === undefined || isFullTicketLedger(state.tickets)
      ? {}
      : { tickets: state.tickets }),
  };
}

/** 서버 스냅숏(검증 전) → 진행. 버전이 다르거나 모양이 틀리면 `null` — 그러면 지금 진행을 그대로 둡니다. */
export function journeyProgressFrom(raw: unknown): JourneyProgressState | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (record["version"] !== 1) return null;
  const legacy = legacyTutorialRecordFrom(record);
  if (legacy === null) return null;
  return {
    legacyTutorial: legacy,
    // 모양이 틀린 값은 그 부분만 버립니다 — 스냅숏 전체를 버리지 않습니다.
    catalogProgress: catalogProgressFrom(record["catalogProgress"]),
    ...(record["tickets"] === undefined ? {} : { tickets: ticketLedgerFrom(record["tickets"]) }),
  };
}

/** 카탈로그 에피소드에서 끝낸 유닛 키의 수입니다(에피소드별 키 수의 합). */
export function catalogActivityCount(progress: CatalogProgress): number {
  return Object.values(progress).reduce((sum, keys) => sum + keys.length, 0);
}

/**
 * 끝낸 활동의 수입니다. 이 수가 늘면 「오늘 활동을 끝냈다」입니다(연속 학습의 하루). 옛 튜토리얼 몫은 고정이라
 * 늘어나는 것은 카탈로그 진행뿐입니다.
 */
export function completedActivityCount(state: JourneyProgressState): number {
  return (
    legacyTutorialActivityCount(state.legacyTutorial) + catalogActivityCount(state.catalogProgress)
  );
}

/** 항목을 모두 끝낸 에피소드입니다. 아직 유닛이 없는 에피소드는 들지 않습니다. */
export type CompletedEpisode = { readonly id: string; readonly title: string };

/** 설문을 묻는 에피소드입니다 — 튜토리얼에서만 묻습니다(ADR-0036 D3). */
export const SURVEY_EPISODE_IDS: readonly string[] = [TUTORIAL_EPISODE_ID];

/** 설문 대상 에피소드 가운데 완료 키를 모두 끝낸 준비된 구획입니다. */
export function completedSurveyEpisodesFrom(
  sections: readonly CatalogMapSection[],
  progress: CatalogProgress,
): readonly CompletedEpisode[] {
  return sections.flatMap((section): readonly CompletedEpisode[] => {
    if (section.kind !== "catalog-ready" || !SURVEY_EPISODE_IDS.includes(section.episodeId)) {
      return [];
    }
    return isCatalogEpisodeComplete(progress, section.episodeId, section.completionKeys)
      ? [{ id: section.episodeId, title: catalogSectionTitle(section) }]
      : [];
  });
}

/**
 * 트로피 = 끝낸 카탈로그 에피소드 수 + (옛 통과 기록이 있고 튜토리얼 에피소드를 아직 안 끝냈으면 1)입니다 — 옛 튜토리얼
 * 트로피가 사라지지도 두 번 세어지지도 않습니다.
 */
export function trophyCountFrom(
  state: JourneyProgressState,
  completionKeysOf: CatalogCompletionKeysOf,
): number {
  const tutorialDone = isCatalogEpisodeComplete(
    state.catalogProgress,
    TUTORIAL_EPISODE_ID,
    completionKeysOf(TUTORIAL_EPISODE_ID),
  );
  const legacyOnly = legacyTutorialPassed(state.legacyTutorial) && !tutorialDone ? 1 : 0;
  return completedCatalogEpisodeCount(state.catalogProgress, completionKeysOf) + legacyOnly;
}

/**
 * 두 진행을 합칩니다 — 옛 기록은 합집합 · 최댓값 · 더 나아간 장면, 카탈로그는 키별 합집합입니다. 기기와 서버 중 어느
 * 쪽이 앞서도(오프라인에서 진행했거나 다른 기기에서 진행했거나) 잃지 않습니다.
 */
export function mergeJourneyProgress(
  a: JourneyProgressState,
  b: JourneyProgressState,
): JourneyProgressState {
  return {
    legacyTutorial: mergeLegacyTutorialRecords(a.legacyTutorial, b.legacyTutorial),
    catalogProgress: mergeCatalogProgress(a.catalogProgress, b.catalogProgress),
    // 남은 장수가 적은 쪽을 따릅니다(필드마다 큰 값). 둘 다 없으면 싣지 않습니다.
    ...(a.tickets === undefined && b.tickets === undefined
      ? {}
      : {
          tickets: mergeTicketLedgers(a.tickets ?? fullTicketLedger, b.tickets ?? fullTicketLedger),
        }),
  };
}

/** 상단 지표 칩 둘의 값입니다(연속 학습 일수 · 트로피). 화면 결선이 머리 칩을 그리는 화면들에 내립니다. */
export type JourneyStats = {
  readonly streakDays: number;
  readonly trophyCount: number;
  /** 남은 학습 티켓 수입니다 — 레슨 결과 화면의 한 줄(시안 E5). 티켓 결선(`ticket-wiring.ts`)이 채웁니다. */
  readonly ticketsLeft?: number;
};

/** 화면 결선이 받는 진행 쪽 값입니다 — 칩 둘, 로그인 뒤 서버 진행을 불러오는 함수, 맵이 받는 불러오기 상태. */
export type ProgressWiringArgs = JourneyStats &
  StatBumpWiring & {
    readonly syncProgress: () => Promise<void>;
    readonly journeyMapProgressLoad: JourneyMapProgressLoad;
  };

/** 지표 칩이 굴릴 「오르기 전 값」과 재생을 마쳤다는 알림입니다(ADR-0064). 학습 완료 화면의 칩이 씁니다. */
export type StatBumpWiring = {
  readonly statBumps: StatBumps;
  readonly onStatBumped: (kind: StatBumpKind) => void;
};

function includesAll<T>(whole: readonly T[], part: readonly T[]): boolean {
  return part.every((item) => whole.includes(item));
}

function catalogCovers(server: CatalogProgress, local: CatalogProgress): boolean {
  return Object.entries(local).every(([episodeId, units]) => {
    const own = Object.prototype.hasOwnProperty.call(server, episodeId) ? server[episodeId] : [];
    return includesAll(own ?? [], units);
  });
}

/** server에 local을 합쳐도 늘어나는 것이 없으면 true입니다. 순서·중복은 보지 않습니다. */
export function journeyProgressCovers(
  server: JourneyProgressState,
  local: JourneyProgressState,
): boolean {
  return (
    legacyTutorialRecordCovers(server.legacyTutorial, local.legacyTutorial) &&
    catalogCovers(server.catalogProgress, local.catalogProgress) &&
    ticketLedgerCovers(server.tickets ?? fullTicketLedger, local.tickets ?? fullTicketLedger)
  );
}
