// 문항 화면의 밀도(regular · compact)를 정하는 순수 함수입니다. 쓸 수 있는 세로 높이에서 나옵니다.
// 껍데기만 있는 단계입니다 — 계산은 아직 없습니다.

import type { SafeAreaInsets } from "./safe-area";

export type LearningDensity = "regular" | "compact";

/** 이 높이 미만이면 compact입니다(쓸 수 있는 높이 = 창 높이 − 안전 영역 위 − 아래). */
export const learningRegularMinHeight = 756;

/** `SystemInfo`에서 창 높이(pt)를 읽습니다. 모르면 `NaN`입니다. */
export function screenHeightFrom(
  _info: { readonly pixelHeight: number; readonly pixelRatio: number } | undefined,
): number {
  return Number.NaN;
}

export function learningDensityOf(_screenHeight: number, _insets: SafeAreaInsets): LearningDensity {
  return "regular";
}

/** 긴 글 문항은 기기와 무관하게 compact로 내립니다. */
export function questionDensityOf(
  device: LearningDensity,
  _longText: "long" | "regular",
): LearningDensity {
  return device;
}
