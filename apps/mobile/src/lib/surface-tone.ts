/** 부품이 놓이는 면의 밝기입니다. 기본은 `light`(지금 모양)이고 `dark`는 어두운 반투명 면 위입니다. */
export type SurfaceTone = "light" | "dark";

/**
 * `light`면 `base`를 그대로, `dark`면 끝에 `${block}-surface-dark`를 공백 하나로 더해 돌려줍니다.
 * 예: ("answer-reveal", "answer-reveal", "dark") → "answer-reveal answer-reveal-surface-dark".
 */
export function surfaceToneClassName(base: string, _block: string, _surface: SurfaceTone): string {
  return base;
}

/**
 * `#RRGGBB`(대소문자 무관)와 알파 [0, 1]을 `rgba(R, G, B, A)`로 바꿉니다.
 * 형식이 다르거나 알파가 범위 밖 · 비유한이면 `RangeError`입니다.
 */
export function rgbaOfHex(hex: string, _alpha: number): string {
  return hex;
}
