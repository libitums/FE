// 테스트 지원 — 고정 내장본(`episode-bundled.test-support.ts`)의 u00이 가리키는 그림 15장의 표입니다. 그림 파일은 앱에서
// 빠졌으므로 값은 경로를 담은 가짜 주소입니다 — 테스트는 「내장 주소인가」만 견줍니다. 실제 표는
// `bundled-content-images.unit.test.ts`가 봅니다.
const paths = [
  "images/u00-tutorial/pre-1.webp",
  "images/u00-tutorial/pre-2.webp",
  "images/u00-tutorial/pre-3.webp",
  "images/u00-tutorial/pre-4.webp",
  "images/u00-tutorial/pre-5.webp",
  "images/u00-tutorial/pre-6.webp",
  "images/u00-tutorial/post-1.webp",
  "images/u00-tutorial/post-2.webp",
  "images/u00-tutorial/post-3.webp",
  "images/u00-tutorial/post-4.webp",
  "images/u00-tutorial/cult-u00-jalhasineyo.webp",
  "images/u00-tutorial/rp-end.webp",
  "images/u00-tutorial/avatar.webp",
  "images/items/hello.webp",
  "images/items/thanks.webp",
];

export const bundledContentImages: Readonly<Record<string, string>> = Object.fromEntries(
  paths.map((path) => [path, `/static/fixture/${path}`]),
);

export function bundledContentImageUrl(relativePath: string): string | null {
  return Object.prototype.hasOwnProperty.call(bundledContentImages, relativePath)
    ? (bundledContentImages[relativePath] ?? null)
    : null;
}
