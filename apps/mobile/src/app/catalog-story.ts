// 막간 이야기 유닛의 표시 모델입니다(ADR-0088) — 자막을 첫 지문 컷으로 세운 컷 목록. 순수 함수만 둡니다.

import type { CatalogUnitKey } from "../lib/catalog-progress";
import type { EpisodeCut } from "../lib/episode-content.model";
import type { LearnerProfile } from "../lib/placeholder-fill";
import { catalogCutViewsOf, catalogCutsOf } from "../screens/catalog-cover/catalog-cover";
import type { CatalogCuts } from "../screens/catalog-cover/catalog-cover.contract";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { storyChatViewOf } from "../screens/story-messenger/story-messenger";
import type { StoryChatView } from "../screens/story-messenger/story-messenger.contract";
import type { EpisodeContent } from "./episode-content";

export type CatalogStoryModel = {
  readonly ordinal: number;
  readonly version: string;
  readonly cuts: CatalogCuts;
  /** 문자 막간이면 메신저 표시 모델 — 그 밖의 형식은 `null`(컷 화면). */
  readonly chat: StoryChatView | null;
};

/** 준비된 구획의 이야기 유닛이 아니거나 그릴 컷이 없으면 `null`. */
export function catalogStoryModelOf(
  content: EpisodeContent,
  sections: readonly CatalogMapSection[],
  episodeId: string,
  unitKey: CatalogUnitKey,
  profile: LearnerProfile,
): CatalogStoryModel | null {
  const entry = content.catalog.find((item) => item.id === episodeId);
  const section = sections.find((item) => item.episodeId === episodeId);
  if (entry === undefined || entry.status !== "ready" || section === undefined) return null;
  const story = entry.episode.units.find((unit) => unit.id === unitKey)?.story;
  if (story === undefined) return null;
  // 자막(「그 시각, …」)은 첫 컷 그림 위의 지문으로 먼저 세웁니다.
  const caption: EpisodeCut[] =
    story.caption === undefined
      ? []
      : [
          {
            kind: "narration",
            index: 0,
            narration: story.caption,
            imageBrief: "",
            ...(story.cuts[0].imageUrl === undefined ? {} : { imageUrl: story.cuts[0].imageUrl }),
          },
        ];
  const cuts = catalogCutsOf(
    catalogCutViewsOf([...caption, ...story.cuts], {
      imageUrlOf: content.imageUrlOf,
      audioTimingOf: content.audioTimingOf,
      fill: (text, script) => content.fillText(text, profile, script),
    }),
  );
  const chat =
    story.chat === undefined
      ? null
      : storyChatViewOf(
          story.chat,
          { ordinal: section.ordinal, caption: story.caption ?? null },
          {
            imageUrlOf: content.imageUrlOf,
            fill: (text, script) => content.fillText(text, profile, script),
          },
        );
  return cuts === null ? null : { ordinal: section.ordinal, version: entry.version, cuts, chat };
}
