import { color, opacity } from "@libitums/design-tokens";

import type { AnswerResult } from "../lib/answer-result";
import { rgbaOfHex } from "../lib/surface-tone";
import type { SurfaceTone } from "../lib/surface-tone";

// 면 색입니다. 흰 잉크가 올라가므로 `-text` 변형이 아니라 면 변형을 씁니다 —
// `feedback.correct`(#35A66F)가 디자인 값이고 흰 글자가 그 위에서 3.28:1입니다.
// ⚠ 알려진 대비 위반(light): WCAG 1.4.3의 4.5:1에 미달합니다. 같은 화면의 `시작` · 아래
// 버튼과 같은 갈래로 디자인 값을 따르기로 한 자리이고, 되돌릴 때 갈 곳은 각 색의
// `-text` 변형(6.90 / 6.76)입니다. 어두운 반투명 면(dark)은 색조 면이라 이 위반이 없습니다.

/** 판정 배지의 면 색입니다 — light: `color.feedback[result]` 그대로, dark: 그 색 × `opacity["16"]`의 rgba. */
export function answerVerdictFaceColor(result: AnswerResult, surface: SurfaceTone): string {
  return surface === "dark"
    ? rgbaOfHex(color.feedback[result], opacity["16"])
    : color.feedback[result];
}
