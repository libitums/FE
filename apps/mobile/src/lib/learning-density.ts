// 문항 화면의 밀도(regular · compact)를 정하는 순수 함수입니다. 쓸 수 있는 세로 높이에서 나옵니다.
//
// 학습 화면은 스크롤이 없는 것이 설계입니다. 작은 기기(13 mini의 쓸 수 있는 높이 728)는
// compact로 그림 · 여백 · 글자 단계를 한 칸씩 줄여 같은 구조를 세로에 맞춥니다.

import type { SafeAreaInsets } from "./safe-area";

export type LearningDensity = "regular" | "compact";

/** 이 높이 미만이면 compact입니다(쓸 수 있는 높이 = 창 높이 − 안전 영역 위 − 아래). */
export const learningRegularMinHeight = 756;

/** `SystemInfo`에서 창 높이(pt)를 읽습니다. 모르면 `NaN`입니다. */
export function screenHeightFrom(
  info: { readonly pixelHeight: number; readonly pixelRatio: number } | undefined,
): number {
  if (info === undefined) return Number.NaN;
  const { pixelHeight, pixelRatio } = info;
  if (!Number.isFinite(pixelHeight) || !Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    return Number.NaN;
  }
  return pixelHeight / pixelRatio;
}

/** 높이를 모르면 compact입니다 — 스크롤이 생기는 쪽보다 줄어든 쪽이 안전합니다. */
export function learningDensityOf(screenHeight: number, insets: SafeAreaInsets): LearningDensity {
  const usable = screenHeight - insets.top - insets.bottom;
  return usable >= learningRegularMinHeight ? "regular" : "compact";
}

/** 긴 글 문항은 기기와 무관하게 compact로 내립니다. */
export function questionDensityOf(
  device: LearningDensity,
  longText: "long" | "regular",
): LearningDensity {
  return longText === "long" ? "compact" : device;
}
