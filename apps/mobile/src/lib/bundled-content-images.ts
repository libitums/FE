// 앱에 실은 콘텐츠 그림의 표입니다 — 버킷 상대 경로(선두 `content/` 없음) → 번들 주소. 경로가 곧 키라 표가 어긋날 자리가 없습니다.
import imgU00TutorialPre1 from "../assets/content/level-3/images/u00-tutorial/pre-1.webp";
import imgU00TutorialPre2 from "../assets/content/level-3/images/u00-tutorial/pre-2.webp";
import imgU00TutorialPre3 from "../assets/content/level-3/images/u00-tutorial/pre-3.webp";
import imgU00TutorialPre4 from "../assets/content/level-3/images/u00-tutorial/pre-4.webp";
import imgU00TutorialPre5 from "../assets/content/level-3/images/u00-tutorial/pre-5.webp";
import imgU00TutorialPre6 from "../assets/content/level-3/images/u00-tutorial/pre-6.webp";
import imgU00TutorialPre7 from "../assets/content/level-3/images/u00-tutorial/pre-7.webp";
import imgU00TutorialPost1 from "../assets/content/level-3/images/u00-tutorial/post-1.webp";
import imgU00TutorialPost2 from "../assets/content/level-3/images/u00-tutorial/post-2.webp";
import imgU00TutorialPost3 from "../assets/content/level-3/images/u00-tutorial/post-3.webp";
import imgU00TutorialPost4 from "../assets/content/level-3/images/u00-tutorial/post-4.webp";
import imgU00TutorialCultU00Jalhasineyo from "../assets/content/level-3/images/u00-tutorial/cult-u00-jalhasineyo.webp";
import imgU00TutorialRpEnd from "../assets/content/level-3/images/u00-tutorial/rp-end.webp";
import imgU00TutorialAvatar from "../assets/content/level-3/images/u00-tutorial/avatar.webp";
import imgCoverU01Water from "../assets/content/covers/u01-water.webp";
import imgCoverU02Checkin from "../assets/content/covers/u02-checkin.webp";
import imgCoverU03Mina from "../assets/content/covers/u03-mina.webp";
import imgCoverU04Directions from "../assets/content/covers/u04-directions.webp";
import imgCoverU05Baekban from "../assets/content/covers/u05-baekban.webp";
import imgCoverU06Cafe from "../assets/content/covers/u06-cafe.webp";
import imgCoverU07Jaemin from "../assets/content/covers/u07-jaemin.webp";
import imgCoverU08Umbrella from "../assets/content/covers/u08-umbrella.webp";
import imgCoverU09Subway from "../assets/content/covers/u09-subway.webp";
import imgCoverU10Laundry from "../assets/content/covers/u10-laundry.webp";
import imgItemsHello from "../assets/content/level-3/images/items/hello.webp";

export const bundledContentImages: Readonly<Record<string, string>> = {
  "level-3/images/u00-tutorial/pre-1.webp": imgU00TutorialPre1,
  "level-3/images/u00-tutorial/pre-2.webp": imgU00TutorialPre2,
  "level-3/images/u00-tutorial/pre-3.webp": imgU00TutorialPre3,
  "level-3/images/u00-tutorial/pre-4.webp": imgU00TutorialPre4,
  "level-3/images/u00-tutorial/pre-5.webp": imgU00TutorialPre5,
  "level-3/images/u00-tutorial/pre-6.webp": imgU00TutorialPre6,
  "level-3/images/u00-tutorial/pre-7.webp": imgU00TutorialPre7,
  "level-3/images/u00-tutorial/post-1.webp": imgU00TutorialPost1,
  "level-3/images/u00-tutorial/post-2.webp": imgU00TutorialPost2,
  "level-3/images/u00-tutorial/post-3.webp": imgU00TutorialPost3,
  "level-3/images/u00-tutorial/post-4.webp": imgU00TutorialPost4,
  "level-3/images/u00-tutorial/cult-u00-jalhasineyo.webp": imgU00TutorialCultU00Jalhasineyo,
  "level-3/images/u00-tutorial/rp-end.webp": imgU00TutorialRpEnd,
  "level-3/images/u00-tutorial/avatar.webp": imgU00TutorialAvatar,
  "level-3/images/items/hello.webp": imgItemsHello,
  // 표지 일러스트(내장 매니페스트 `cover`) — 수준과 무관하게 `images/covers/`입니다.
  "images/covers/u01-water.webp": imgCoverU01Water,
  "images/covers/u02-checkin.webp": imgCoverU02Checkin,
  "images/covers/u03-mina.webp": imgCoverU03Mina,
  "images/covers/u04-directions.webp": imgCoverU04Directions,
  "images/covers/u05-baekban.webp": imgCoverU05Baekban,
  "images/covers/u06-cafe.webp": imgCoverU06Cafe,
  "images/covers/u07-jaemin.webp": imgCoverU07Jaemin,
  "images/covers/u08-umbrella.webp": imgCoverU08Umbrella,
  "images/covers/u09-subway.webp": imgCoverU09Subway,
  "images/covers/u10-laundry.webp": imgCoverU10Laundry,
};

/** 표에 있으면 그 주소, 없으면 null입니다. 순수 · 던지지 않음. */
export function bundledContentImageUrl(relativePath: string): string | null {
  return Object.prototype.hasOwnProperty.call(bundledContentImages, relativePath)
    ? (bundledContentImages[relativePath] ?? null)
    : null;
}
