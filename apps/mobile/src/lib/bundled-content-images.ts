// 앱에 실은 콘텐츠 그림의 표입니다 — 버킷 상대 경로(선두 `content/` 없음) → 번들 주소.

export const bundledContentImages: Readonly<Record<string, string>> = {};

/** 표에 있으면 그 주소, 없으면 null입니다. 순수 · 던지지 않음. */
export function bundledContentImageUrl(relativePath: string): string | null {
  return Object.prototype.hasOwnProperty.call(bundledContentImages, relativePath)
    ? (bundledContentImages[relativePath] ?? null)
    : null;
}
