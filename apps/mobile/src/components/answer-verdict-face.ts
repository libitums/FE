import { color } from "@libitums/design-tokens";

import type { AnswerResult } from "../lib/answer-result";
import type { SurfaceTone } from "../lib/surface-tone";

/** 판정 배지의 면 색입니다 — light: `color.feedback[result]` 그대로, dark: 그 색 × `opacity["16"]`의 rgba. */
export function answerVerdictFaceColor(result: AnswerResult, _surface: SurfaceTone): string {
  return color.feedback[result];
}
