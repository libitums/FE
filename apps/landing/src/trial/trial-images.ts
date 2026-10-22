// 콘텐츠 그림 경로 → 랜딩 사본(Astro 자산)의 표입니다. 사본은 앱 src/assets/content/images의 같은 상대 경로와 바이트가 같습니다.

import type { ImageMetadata } from "astro";

import hello from "../assets/trial/images/items/hello.webp";
import cultJalhasineyo from "../assets/trial/images/u00-tutorial/cult-u00-jalhasineyo.webp";
import post1 from "../assets/trial/images/u00-tutorial/post-1.webp";
import post2 from "../assets/trial/images/u00-tutorial/post-2.webp";
import pre1 from "../assets/trial/images/u00-tutorial/pre-1.webp";
import pre2 from "../assets/trial/images/u00-tutorial/pre-2.webp";
import pre3 from "../assets/trial/images/u00-tutorial/pre-3.webp";
import pre4 from "../assets/trial/images/u00-tutorial/pre-4.webp";
import pre5 from "../assets/trial/images/u00-tutorial/pre-5.webp";
import pre6 from "../assets/trial/images/u00-tutorial/pre-6.webp";

/** 키 = 콘텐츠 그림 경로(선두 `content/` 없음, 예: `images/items/hello.webp`). */
export const TRIAL_IMAGES: Readonly<Record<string, ImageMetadata>> = {
  "images/items/hello.webp": hello,
  "images/u00-tutorial/cult-u00-jalhasineyo.webp": cultJalhasineyo,
  "images/u00-tutorial/post-1.webp": post1,
  "images/u00-tutorial/post-2.webp": post2,
  "images/u00-tutorial/pre-1.webp": pre1,
  "images/u00-tutorial/pre-2.webp": pre2,
  "images/u00-tutorial/pre-3.webp": pre3,
  "images/u00-tutorial/pre-4.webp": pre4,
  "images/u00-tutorial/pre-5.webp": pre5,
  "images/u00-tutorial/pre-6.webp": pre6,
};

/** 선두 `content/`를 떼고 표를 찾는다. 표에 없으면 null. */
export function trialImageUrlOf(contentPath: string): string | null {
  const key = contentPath.replace(/^content\//, "");
  return Object.hasOwn(TRIAL_IMAGES, key) ? (TRIAL_IMAGES[key]?.src ?? null) : null;
}
