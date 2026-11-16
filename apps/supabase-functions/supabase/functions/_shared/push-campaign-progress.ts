// 자동 푸시 캠페인 — 카탈로그 진행 → 세그먼트 · 예고 자리(콘솔 classifyLearner · storyStepOf와 같은 규칙)입니다.

import type {
  CatalogEpisode,
  SegmentId,
  StoryOption,
  StoryPlace,
  StoryUnits,
} from "./push-campaign-types.ts";

export const keysIn = (progress: Record<string, unknown>, id: string): string[] => {
  const keys = progress[id];
  return Array.isArray(keys) ? keys.filter((key): key is string => typeof key === "string") : [];
};

/** 진행 단계 세그먼트와 지금 에피소드입니다(콘솔 classifyLearner와 같은 규칙). */
export function classify(
  catalogProgress: Record<string, unknown> | null,
  catalog: readonly CatalogEpisode[],
): { segment: SegmentId; episode: CatalogEpisode | null } {
  const progress = catalogProgress ?? {};
  const [tutorial, ...episodes] = catalog;
  if (tutorial === undefined) return { segment: "all-done", episode: null };
  const tutorialKeys = keysIn(progress, tutorial.id);
  if (!tutorialKeys.includes("intro")) return { segment: "tutorial-cover", episode: tutorial };
  if (!tutorialKeys.includes("S1")) return { segment: "tutorial-lesson1", episode: tutorial };
  if (!tutorialKeys.includes("S2")) return { segment: "tutorial-lesson2", episode: tutorial };
  if (!tutorialKeys.includes("RP")) return { segment: "tutorial-rest", episode: tutorial };
  const current = episodes.find((episode) => !keysIn(progress, episode.id).includes("RP"));
  if (current === undefined) return { segment: "all-done", episode: null };
  return {
    segment: keysIn(progress, current.id).length === 0 ? "episode-next" : "episode-mid",
    episode: current,
  };
}

/** 예고할 자리 — 지금 에피소드에서 단계 순서상 마지막으로 끝낸 단계, 없으면 앞 에피소드 파이널(D11). */
export function storyPlaceOf(
  catalogProgress: Record<string, unknown> | null,
  catalog: readonly CatalogEpisode[],
): StoryPlace | null {
  const progress = catalogProgress ?? {};
  const currentIndex = catalog.findIndex((episode) => !keysIn(progress, episode.id).includes("RP"));
  const finale = (index: number): StoryPlace => ({
    unitId: catalog[index]!.id,
    stepId: "RP",
    nextEpisodeId: catalog[index + 1]?.id ?? null,
  });
  if (currentIndex === -1) return catalog.length > 0 ? finale(catalog.length - 1) : null;
  const current = catalog[currentIndex]!;
  const keys = keysIn(progress, current.id);
  const cleared = current.steps.filter((step) => keys.includes(step));
  if (cleared.length > 0)
    return { unitId: current.id, stepId: cleared[cleared.length - 1]!, nextEpisodeId: null };
  return currentIndex > 0 ? finale(currentIndex - 1) : null;
}

export function storyOptions(units: StoryUnits, place: StoryPlace | null): StoryOption[] {
  if (place === null) return [];
  const options = units[place.unitId]?.after?.[place.stepId];
  return Array.isArray(options)
    ? options.filter(
        (option): option is StoryOption => option !== null && typeof option === "object",
      )
    : [];
}
