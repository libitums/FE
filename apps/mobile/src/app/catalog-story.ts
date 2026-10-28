// 막간 이야기 유닛의 표시 모델입니다(ADR-0088) — 시작 화면 · 컷 · 메신저 · 전화. 순수 함수만 둡니다.

import type { CatalogUnitKey } from "../lib/catalog-progress";
import type { EpisodeStory } from "../lib/episode-content.model";
import type { LearnerProfile } from "../lib/placeholder-fill";
import { catalogCutViewsOf, catalogCutsOf } from "../screens/catalog-cover/catalog-cover";
import type { CatalogCuts } from "../screens/catalog-cover/catalog-cover.contract";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { storyCallViewOf } from "../screens/story-call/story-call";
import type { StoryCallView } from "../screens/story-call/story-call.contract";
import type { StoryIntroView } from "../screens/story-intro/story-intro.contract";
import { storyChatViewOf } from "../screens/story-messenger/story-messenger";
import type { StoryChatView } from "../screens/story-messenger/story-messenger.contract";
import type { EpisodeContent } from "./episode-content";

export type CatalogStoryModel = {
  readonly ordinal: number;
  readonly version: string;
  /** 와이어 형식(cuts · look · message · call) — 분석 속성입니다. */
  readonly form: string;
  /** 시작 화면 — 자막이 없으면 `null`(곧장 본편). */
  readonly intro: StoryIntroView | null;
  readonly cuts: CatalogCuts;
  /** 문자 막간이면 메신저 표시 모델. */
  readonly chat: StoryChatView | null;
  /** 전화 막간이면 통화 표시 모델. */
  readonly call: StoryCallView | null;
};

function storyOf(
  content: EpisodeContent,
  episodeId: string,
  unitKey: CatalogUnitKey,
): { story: EpisodeStory; version: string } | null {
  const entry = content.catalog.find((item) => item.id === episodeId);
  if (entry === undefined || entry.status !== "ready") return null;
  const story = entry.episode.units.find((unit) => unit.id === unitKey)?.story;
  return story === undefined ? null : { story, version: entry.version };
}

/** 이야기 유닛의 형식 — 이야기가 아니면 `null`. 분석 이벤트가 씁니다. */
export function catalogStoryFormOf(
  content: EpisodeContent,
  episodeId: string,
  unitKey: CatalogUnitKey,
): string | null {
  return storyOf(content, episodeId, unitKey)?.story.form ?? null;
}

/** 준비된 구획의 이야기 유닛이 아니거나 그릴 컷이 없으면 `null`. */
export function catalogStoryModelOf(
  content: EpisodeContent,
  sections: readonly CatalogMapSection[],
  episodeId: string,
  unitKey: CatalogUnitKey,
  profile: LearnerProfile,
): CatalogStoryModel | null {
  const found = storyOf(content, episodeId, unitKey);
  const section = sections.find((item) => item.episodeId === episodeId);
  if (found === null || section === undefined) return null;
  const { story, version } = found;
  const fill = (text: string, script: "ko" | "roman" | "en") =>
    content.fillText(text, profile, script);
  const port = { imageUrlOf: content.imageUrlOf, fill };
  const cuts = catalogCutsOf(
    catalogCutViewsOf(story.cuts, {
      imageUrlOf: content.imageUrlOf,
      audioTimingOf: content.audioTimingOf,
      fill,
    }),
  );
  if (cuts === null) return null;
  // 시작 화면 배경은 막간 배경, 없으면 첫 컷 그림입니다.
  const background =
    story.chat?.backgroundUrl ?? story.call?.backgroundUrl ?? story.cuts[0].imageUrl;
  return {
    ordinal: section.ordinal,
    version,
    form: story.form,
    intro:
      story.caption === undefined
        ? null
        : {
            ordinal: section.ordinal,
            caption: {
              ko: fill(story.caption.ko, "ko"),
              en: story.caption.en === undefined ? "" : fill(story.caption.en, "en"),
            },
            backgroundUrl: background === undefined ? null : content.imageUrlOf(background),
          },
    cuts,
    chat: story.chat === undefined ? null : storyChatViewOf(story.chat, port),
    call:
      story.call === undefined
        ? null
        : storyCallViewOf(story.call, { ...port, audioTimingOf: content.audioTimingOf }),
  };
}
