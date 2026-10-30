// 랜딩 소개 그림의 표입니다. 전부 콘텐츠 버킷(Supabase `content`)의 `images/…`를 같은 상대 경로에 바이트 그대로 둔 사본이며,
// 다시 인코딩하지 않습니다(새 그림을 들이는 절차는 README 「그림」 — `scripts/fetch-content-image.mjs`).
// Story 줄의 에피소드별 표지는 여기가 아니라 `src/story/episodes.ts`에 있습니다.

import attendant from "./content/images/u00-tutorial/avatar.webp";
import descent from "./content/images/u00-tutorial/post-1.webp";
import sky from "./content/images/u00-tutorial/pre-1-v2.webp";
import waterCounter from "./content/images/u01-water/pre-5.webp";
import minaAvatar from "./content/images/u03-mina/avatar.webp";
import minaLeaving from "./content/images/u03-mina/post-3.webp";
import minaWave from "./content/images/u03-mina/pre-4.webp";
import eveningAlley from "./content/images/u04-directions/pre-2.webp";
import cafeWindow from "./content/images/u06-cafe/post-4.webp";
import cafeCounter from "./content/images/u06-cafe/pre-5-v2.webp";
import rainAlley from "./content/images/u08-umbrella/pre-2.webp";
import market from "./content/images/u09-subway/post-3.webp";
import subway from "./content/images/u09-subway/pre-2.webp";

export const img = {
  /** 히어로 — 장면 속으로(기내 창밖 바다) · 말로 풀어(카페 카운터의 도윤) · 진짜 하루로(광장시장 지붕 아래). */
  heroSky: sky,
  heroCafe: cafeCounter,
  heroMarket: market,
  /** Features — 흐리게 깔리는 배경 넷(저녁 골목 · 카페 창가 · 비 오는 골목 · 지하철 통로). */
  backdropAlley: eveningAlley,
  backdropCafeWindow: cafeWindow,
  backdropRain: rainAlley,
  backdropSubway: subway,
  /** Features — 휴대폰 목업 속 그림(손 흔드는 미나)과 메시지 · 전화의 프로필. */
  phoneMinaWave: minaWave,
  avatarMina: minaAvatar,
  /** Phrases — 표현 셋 옆의 작은 그림. */
  wordHello: attendant,
  wordWater: waterCounter,
  wordTomorrow: minaLeaving,
  /** 맺음 인용 — 착륙 직전 창밖. */
  closingDescent: descent,
};
