// Story 줄에 서는 에피소드 카드입니다. **에피소드가 하나 나올 때마다 사람이 맨 앞에 하나 더합니다** — 줄은 이 배열 순서 그대로
// 새 것이 먼저고, 첫 카드에 `New` 표가 붙습니다. 다음 에피소드의 내용 · 시기는 여기에도 적지 않습니다(스펙 「이야기를 공항으로 못 박지 않는다」).
//
// 카드는 홍보용이라 **그림만** 보입니다. 제목 · 때 · 티저는 카드 위에 올려 두거나(호버 · 포커스) 눌러야 보이는 숨김 층입니다.
// 그래서 그림은 **인물이 나오지 않는 컷**으로 고릅니다 — 얼굴을 먼저 보여 주면 만남의 기대가 꺾입니다. 손 · 뒷모습 정도는 됩니다.
//
// 더하는 절차(README 「Story 카드 더하기」):
//   1. 인물 없는 버킷 그림 하나를 고르고 `node scripts/fetch-content-image.mjs images/<unit>/<file>.webp`로 사본을 받는다(바이트 그대로, 재인코딩 없음).
//   2. `episodes.contract.ts`의 `storyEpisodeIds` **맨 앞**에 id를 더하고, 언어 파일 다섯(`text/en.ts` · `ko.ts` · `vi.ts` · `id.ts` · `ms.ts`)에
//      같은 id로 넷(때 · 제목 · 티저 · alt)을 채운다 — 빠지면 타입 검사가 짚는다. 제목은 앱 JSON의 `title_en` · `title`(vi · id는 내장 번역표의 제목, ms는 사람이 옮긴다)
//      그대로, 티저는 **한 문장**, 등장인물 이름과 결말 · 대사의 답을 말하지 않는다. `alt`는 그림에 **보이는 것**만 적는다.
//      그런 다음 아래 배열 **맨 앞**에 `card(id, 번호, 그림)`을 더한다.
//   3. `pnpm --filter @libitums/landing test:ui`(카드 수 · New 표 · 숨김 층)와 `test:integration`(빌드)을 돌린다.
//
// 주의 — 체험판(`src/assets/trial/images/u00-tutorial/`)에 u00 컷의 **같은 바이트** 사본이 있다(이름은 다를 수 있다 — 체험판 `pre-4` =
// 버킷 `pre-5-v2`). Vite는 내용이 같은 파일을 빌드 결과에서 하나로 합치고, 그 하나를 여기서 `<Image>`로 변환하면 Astro가 원본을
// 지워 체험판이 404를 낸다(2026-10-29 e2e TE1). 그래서 체험판에 없는 컷만 쓴다 — `episodes.unit.test.ts`가 바이트를 대조해 막는다.

import type { ImageMetadata } from "astro";

import u00 from "../assets/content/images/u00-tutorial/pre-3-v2.webp";
import u01 from "../assets/content/images/u01-water/post-1.webp";
import u02 from "../assets/content/images/u02-checkin/post-3.webp";
import u03 from "../assets/content/images/u03-mina/post-2.webp";
import u04 from "../assets/content/images/u04-directions/pre-1.webp";
import u05 from "../assets/content/images/u05-baekban/post-2.webp";
import u06 from "../assets/content/images/u06-cafe/pre-2-v2.webp";
import u07 from "../assets/content/images/u07-jaemin/post-3.webp";
import u08 from "../assets/content/images/u08-umbrella/post-2.webp";
import u09 from "../assets/content/images/u09-subway/pre-1.webp";
import u10 from "../assets/content/images/u10-laundry/pre-2.webp";

import { type Language, languages } from "../site";
import type {
  Localized,
  StoryEpisode,
  StoryEpisodeId,
  StoryEpisodeText,
} from "./episodes.contract";
import { en } from "./text/en";
import { id } from "./text/id";
import { ko } from "./text/ko";
import { ms } from "./text/ms";
import { vi } from "./text/vi";

export type { StoryEpisode } from "./episodes.contract";

const text: Record<Language, Record<StoryEpisodeId, StoryEpisodeText>> = { en, ko, vi, id, ms };

const localized = (episodeId: StoryEpisodeId, key: keyof StoryEpisodeText): Localized =>
  Object.fromEntries(
    languages.map((language) => [language, text[language][episodeId][key]]),
  ) as Localized;

/** 카드 하나 — 글은 언어 파일에서 id로 모은다. */
const card = (
  episodeId: StoryEpisodeId,
  number: number,
  image: ImageMetadata,
  focus?: string,
): StoryEpisode => ({
  id: episodeId,
  number,
  image,
  ...(focus === undefined ? {} : { focus }),
  when: localized(episodeId, "when"),
  title: localized(episodeId, "title"),
  teaser: localized(episodeId, "teaser"),
  alt: localized(episodeId, "alt"),
});

/** 새 것이 먼저다. 맨 앞 카드가 `New`. */
export const storyEpisodes: readonly StoryEpisode[] = [
  card("u10-laundry", 10, u10),
  card("u09-subway", 9, u09),
  card("u08-umbrella", 8, u08),
  card("u07-jaemin", 7, u07),
  card("u06-cafe", 6, u06),
  card("u05-baekban", 5, u05),
  card("u04-directions", 4, u04),
  card("u03-mina", 3, u03),
  card("u02-checkin", 2, u02),
  card("u01-water", 1, u01),
  card("u00-tutorial", 0, u00),
];
