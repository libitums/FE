// 상단 바 칩의 표시 규칙입니다(ADR-0116 개정 2026-11-10, 사용자 결정). 화면은 여기서 만든 값을 그리기만 합니다.
//
// 칩 넷(연속 · 트로피 · 티켓 · 엽전)과 알림 버튼이 한 줄이라 좁은 폭에서 알림 버튼이 엽전 칩을 덮었다(320 · 340 실측,
// 360 이상은 아슬아슬하게 맞음). 그래서 999를 넘는 수는 「999+」로 줄이고, 360 미만 폭에서는 엽전 칩의 「+」를 뺀다 —
// 칩 자체가 상점을 여는 버튼이고 이름(「N coins, get more」)이 그 뜻을 그대로 전한다.

/** 이 폭(pt) 미만이면 엽전 칩의 「+」를 뺍니다. */
export const coinPlusMinWidth = 360;

/** 칩에 보이는 수의 상한입니다 — 넘으면 「999+」. 낭독 이름은 실제 수를 그대로 읽습니다. */
export const statChipMaxShown = 999;

/** 칩 숫자를 보이는 글로 — 999까지 그대로, 넘으면 「999+」, 수가 아니거나 음수면 「0」. */
export function statChipText(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  const whole = Math.trunc(value);
  return whole > statChipMaxShown ? `${statChipMaxShown}+` : String(whole);
}

/** `SystemInfo`에서 창 폭(pt)을 읽습니다. 모르면 `NaN`입니다. */
export function screenWidthFrom(
  info: { readonly pixelWidth: number; readonly pixelRatio: number } | undefined,
): number {
  if (info === undefined) return Number.NaN;
  const { pixelWidth, pixelRatio } = info;
  if (!Number.isFinite(pixelWidth) || !Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    return Number.NaN;
  }
  return pixelWidth / pixelRatio;
}

/**
 * 이 폭(pt) 미만이면 칩 줄을 촘촘하게 합니다(사용자 결정 A, 2026-11-10) — 320 폭 iOS 시뮬레이터에서 「+」를 빼도 알림
 * 버튼이 엽전 칩 끝을 약 18pt 덮었다. 간격 6 → 4 · 칩 좌우 여백 8 → 6으로 약 22pt를 번다.
 */
export const topBarDenseMaxWidth = 340;

/** 칩 줄을 촘촘하게 하는가 — 340 미만만. 폭을 모르면 하지 않습니다. */
export function topBarDenseAt(screenWidth: number): boolean {
  return !Number.isNaN(screenWidth) && screenWidth < topBarDenseMaxWidth;
}

/** 엽전 칩의 「+」를 보이는가 — 360 미만이면 뺍니다. 폭을 모르면 둡니다(기기에는 늘 SystemInfo가 있다). */
export function coinPlusShownAt(screenWidth: number): boolean {
  return Number.isNaN(screenWidth) || screenWidth >= coinPlusMinWidth;
}
