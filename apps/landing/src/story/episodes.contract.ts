// Story 줄 에피소드 카드의 타입입니다. 글은 언어별로 `text/<코드>.ts`에, 카드 뼈대(번호 · 그림)는 `episodes.ts`에 있습니다.
import type { ImageMetadata } from "astro";

import type { Language } from "../site";

/** 앱 콘텐츠의 unit id(`u08-umbrella`). **에피소드가 나오면 맨 앞에 더한다** — 언어 파일 다섯과 `episodes.ts`의 배열이 이 목록을 따라 타입 검사된다. */
export const storyEpisodeIds = [
  "u10-laundry",
  "u09-subway",
  "u08-umbrella",
  "u07-jaemin",
  "u06-cafe",
  "u05-baekban",
  "u04-directions",
  "u03-mina",
  "u02-checkin",
  "u01-water",
  "u00-tutorial",
] as const;
export type StoryEpisodeId = (typeof storyEpisodeIds)[number];

/** 한 언어의 카드 글 — 전부 숨김 층(호버 · 포커스 · 누름)에 들어간다. */
export interface StoryEpisodeText {
  /** 이야기 속 때(`Day 2 · Evening`). 앱 JSON의 `day` · `time_of_day`를 사람이 옮긴다. */
  readonly when: string;
  /** 앱 JSON의 `title_en` · `title`(또는 번역표의 제목) 그대로. */
  readonly title: string;
  /** 살짝만 스포하는 **한 문장**. 등장인물 이름 · 답 · 결말을 말하지 않는다. */
  readonly teaser: string;
  /** 그림에 보이는 것만. */
  readonly alt: string;
}

export type Localized = Readonly<Record<Language, string>>;

export interface StoryEpisode {
  /** 카드의 `data-episode`가 된다. */
  readonly id: StoryEpisodeId;
  /** 에피소드 번호. 카드에 두 자리(`08`)로 적는다. 튜토리얼이 0이다. */
  readonly number: number;
  readonly when: Localized;
  readonly title: Localized;
  readonly teaser: Localized;
  /** 버킷 그림의 사본(`src/assets/content/images/…`). 인물이 없는 컷. Astro가 크기별로 다시 굽는다. */
  readonly image: ImageMetadata;
  readonly alt: Localized;
  /** 4:5로 자를 때 남길 자리(`object-position`). 기본은 가운데. */
  readonly focus?: string;
}
