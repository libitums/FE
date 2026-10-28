// 막간 이야기 유닛의 결선입니다(ADR-0088) — 레슨 시작 결선 앞에 서서 이야기 유닛이면 컷 화면을 쌓습니다. 티켓 · 레슨
// 이벤트는 없고, 마지막 컷 뒤 진행에 그 키를 적고 맵으로 돌아갑니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { CatalogProgress, CatalogUnitKey } from "../lib/catalog-progress";
import { markCatalogUnitDone } from "../lib/catalog-progress";
import { canStartCatalogUnit } from "../screens/journey-map/catalog-map";
import { catalogIsStoryUnit } from "../screens/journey-map/catalog-map-story";
import type { CatalogWiringValues } from "./catalog-cover-wiring";
import type { CatalogLessonWiring } from "./catalog-lesson-wiring";
import { catalogStoryModelOf } from "./catalog-story";
import type { NavAction } from "./nav-state";

export type CatalogStoryWiring = {
  /** 마지막 컷 — 진행 기록 → `back`. */
  readonly onFinishCatalogStory: (episodeId: string, unitKey: CatalogUnitKey) => void;
  /** 머리 나가기 · 시스템 뒤로 — 기록 없이 `back`. */
  readonly onExitCatalogStory: () => void;
};

export type CatalogStoryWiringArgs = CatalogWiringValues & {
  readonly setCatalogProgress: Dispatch<SetStateAction<CatalogProgress>>;
  readonly dispatch: Dispatch<NavAction>;
};

export function withCatalogStory(
  lesson: CatalogLessonWiring,
  args: CatalogStoryWiringArgs,
): CatalogLessonWiring & CatalogStoryWiring {
  const { episodeContent, catalogSections, catalogProgress, setCatalogProgress, dispatch } = args;
  const markDone = (episodeId: string, unitKey: CatalogUnitKey): void => {
    setCatalogProgress((progress) => markCatalogUnitDone(progress, episodeId, unitKey));
  };
  return {
    ...lesson,
    onStartCatalogUnit: (episodeId, unitKey, source) => {
      if (!catalogIsStoryUnit(catalogSections, episodeId, unitKey)) {
        if (source === undefined) lesson.onStartCatalogUnit(episodeId, unitKey);
        else lesson.onStartCatalogUnit(episodeId, unitKey, source);
        return;
      }
      if (!canStartCatalogUnit(catalogSections, episodeId, unitKey, catalogProgress)) return;
      const model = catalogStoryModelOf(
        episodeContent,
        catalogSections,
        episodeId,
        unitKey,
        args.learnerFill,
      );
      // 디코더가 컷 없는 막간을 버리므로 여기 닿지 않습니다 — 닿으면 막지 않고 끝낸 것으로 적습니다.
      if (model === null) {
        markDone(episodeId, unitKey);
        return;
      }
      dispatch({ type: "push", screen: { name: "catalog-story", episodeId, unitKey } });
    },
    onFinishCatalogStory: (episodeId, unitKey) => {
      markDone(episodeId, unitKey);
      dispatch({ type: "back" });
    },
    onExitCatalogStory: () => {
      dispatch({ type: "back" });
    },
  };
}
