// 막간 이야기 유닛의 결선입니다(ADR-0088) — 레슨 시작 결선 앞에 서서 이야기 유닛이면 이야기 화면을 쌓습니다. 티켓 · 레슨
// 이벤트는 없고, 에피소드 첫 스페셜 유닛과 같은 다섯 때를 `episode_story_*`로 잽니다(D6).

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { CatalogProgress, CatalogUnitKey } from "../lib/catalog-progress";
import { isCatalogUnitDone, markCatalogUnitDone } from "../lib/catalog-progress";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { canStartCatalogUnit } from "../screens/journey-map/catalog-map";
import { catalogIsStoryUnit } from "../screens/journey-map/catalog-map-story";
import type { StoryExitStage } from "../screens/story-intro/story-intro.contract";
import type { CatalogWiringValues } from "./catalog-cover-wiring";
import type { CatalogLessonWiring } from "./catalog-lesson-wiring";
import { catalogStoryFormOf, catalogStoryModelOf } from "./catalog-story";
import type { NavAction } from "./nav-state";

type StoryHandler = (episodeId: string, unitKey: CatalogUnitKey) => void;

export type CatalogStoryWiring = {
  /** 시작 화면의 Start. */
  readonly onContinueCatalogStory: StoryHandler;
  /** 시작 화면에서 Skip 확정 — 진행 기록 → `back`(배너 없음). */
  readonly onSkipCatalogStory: StoryHandler;
  /** 배너가 닫힘 — 진행 기록 → `back`. */
  readonly onFinishCatalogStory: StoryHandler;
  /** 머리 나가기 · 시스템 뒤로 — 기록 없이 `back`. */
  readonly onExitCatalogStory: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    stage: StoryExitStage,
  ) => void;
};

export type CatalogStoryWiringArgs = CatalogWiringValues & {
  readonly setCatalogProgress: Dispatch<SetStateAction<CatalogProgress>>;
  readonly dispatch: Dispatch<NavAction>;
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
};

export function withCatalogStory(
  lesson: CatalogLessonWiring,
  args: CatalogStoryWiringArgs,
): CatalogLessonWiring & CatalogStoryWiring {
  const { episodeContent, catalogSections, catalogProgress, setCatalogProgress, dispatch } = args;
  const sink = args.episodeIntroEventSink;
  const markDone: StoryHandler = (episodeId, unitKey) => {
    setCatalogProgress((progress) => markCatalogUnitDone(progress, episodeId, unitKey));
  };
  // 이벤트 공통 속성 — 형식을 모르면(닿지 않는 경우) 빈 문자열입니다.
  const base = (episodeId: string, unitKey: CatalogUnitKey) => ({
    episodeId,
    unitKey,
    form: catalogStoryFormOf(episodeContent, episodeId, unitKey) ?? "",
  });
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
      sink?.({ name: "episode_story_viewed", ...base(episodeId, unitKey) });
      dispatch({ type: "push", screen: { name: "catalog-story", episodeId, unitKey } });
    },
    onContinueCatalogStory: (episodeId, unitKey) => {
      sink?.({ name: "episode_story_continued", ...base(episodeId, unitKey) });
    },
    // 이미 끝낸 이야기를 다시 열어 건너뛴 것은 세지 않습니다 — 인트로와 같이 처음 보는 사람의 선택만 봅니다.
    onSkipCatalogStory: (episodeId, unitKey) => {
      if (!isCatalogUnitDone(catalogProgress, episodeId, unitKey)) {
        sink?.({ name: "episode_story_skipped", ...base(episodeId, unitKey) });
        markDone(episodeId, unitKey);
      }
      dispatch({ type: "back" });
    },
    onFinishCatalogStory: (episodeId, unitKey) => {
      sink?.({ name: "episode_story_completed", ...base(episodeId, unitKey) });
      markDone(episodeId, unitKey);
      dispatch({ type: "back" });
    },
    onExitCatalogStory: (episodeId, unitKey, stage) => {
      sink?.({ name: "episode_story_exited", ...base(episodeId, unitKey), stage });
      dispatch({ type: "back" });
    },
  };
}
