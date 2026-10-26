// 앱에 실은 콘텐츠 그림의 표입니다 — 버킷 상대 경로(선두 `content/` 없음) → 번들 주소. 경로가 곧 키라 표가 어긋날 자리가 없습니다.
import imgu00TutorialPre1V2 from "../assets/content/images/u00-tutorial/pre-1-v2.webp";
import imgu00TutorialPre2V2 from "../assets/content/images/u00-tutorial/pre-2-v2.webp";
import imgu00TutorialPre3V2 from "../assets/content/images/u00-tutorial/pre-3-v2.webp";
import imgu00TutorialPre4V2 from "../assets/content/images/u00-tutorial/pre-4-v2.webp";
import imgu00TutorialPre5V2 from "../assets/content/images/u00-tutorial/pre-5-v2.webp";
import imgu00TutorialPre6V2 from "../assets/content/images/u00-tutorial/pre-6-v2.webp";
import imgu00TutorialPre7V2 from "../assets/content/images/u00-tutorial/pre-7-v2.webp";
import imgu00TutorialPost1 from "../assets/content/images/u00-tutorial/post-1.webp";
import imgu00TutorialPost2 from "../assets/content/images/u00-tutorial/post-2.webp";
import imgu00TutorialPost3 from "../assets/content/images/u00-tutorial/post-3.webp";
import imgu00TutorialPost4 from "../assets/content/images/u00-tutorial/post-4.webp";
import imgu00TutorialCultU00Jalhasineyo from "../assets/content/images/u00-tutorial/cult-u00-jalhasineyo.webp";
import imgu00TutorialRpEnd from "../assets/content/images/u00-tutorial/rp-end.webp";
import imgu00TutorialAvatar from "../assets/content/images/u00-tutorial/avatar.webp";
import imgitemsHello from "../assets/content/images/items/hello.webp";

export const bundledContentImages: Readonly<Record<string, string>> = {
  "images/u00-tutorial/pre-1-v2.webp": imgu00TutorialPre1V2,
  "images/u00-tutorial/pre-2-v2.webp": imgu00TutorialPre2V2,
  "images/u00-tutorial/pre-3-v2.webp": imgu00TutorialPre3V2,
  "images/u00-tutorial/pre-4-v2.webp": imgu00TutorialPre4V2,
  "images/u00-tutorial/pre-5-v2.webp": imgu00TutorialPre5V2,
  "images/u00-tutorial/pre-6-v2.webp": imgu00TutorialPre6V2,
  "images/u00-tutorial/pre-7-v2.webp": imgu00TutorialPre7V2,
  "images/u00-tutorial/post-1.webp": imgu00TutorialPost1,
  "images/u00-tutorial/post-2.webp": imgu00TutorialPost2,
  "images/u00-tutorial/post-3.webp": imgu00TutorialPost3,
  "images/u00-tutorial/post-4.webp": imgu00TutorialPost4,
  "images/u00-tutorial/cult-u00-jalhasineyo.webp": imgu00TutorialCultU00Jalhasineyo,
  "images/u00-tutorial/rp-end.webp": imgu00TutorialRpEnd,
  "images/u00-tutorial/avatar.webp": imgu00TutorialAvatar,
  "images/items/hello.webp": imgitemsHello,
};

/** 표에 있으면 그 주소, 없으면 null입니다. 순수 · 던지지 않음. */
export function bundledContentImageUrl(relativePath: string): string | null {
  return Object.prototype.hasOwnProperty.call(bundledContentImages, relativePath)
    ? (bundledContentImages[relativePath] ?? null)
    : null;
}
