import type { ReactNode } from "@lynx-js/react";

import refresh from "@libitums/icons/lynx/refresh";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";

import { learningReviewChip } from "./learning-review";
import type { LearningReview } from "./learning-review";
import { useUiCopy } from "../../lib/ui-copy";

// 다시 풀기 세션 헤더의 칩입니다(ADR-0058 ⟨2026-10-30⟩) — 통과까지 더 맞혀야 하는 수(흰 면 · 브랜드 글), 통과선을 넘으면
// 「Pass unlocked」(초록 면 · 흰 글 · 체크)입니다. 이름표 줄 오른쪽에 서서 순번 줄의 가운데 정렬을 건드리지 않습니다.
// 상태가 없습니다. 막대가 이미 낭독 이름을 가지므로 칩은 글 그대로 읽힙니다.
export function LearningReviewChip({ review }: { readonly review: LearningReview }): ReactNode {
  const copy = useUiCopy();
  const chip = learningReviewChip(review, copy);
  return (
    <view
      className={
        chip.unlocked
          ? "learning-shell-review-chip learning-shell-review-chip-unlocked"
          : "learning-shell-review-chip"
      }
      data-testid="learning-shell-review-chip"
      {...(chip.unlocked ? { "data-unlocked": "true" } : {})}
      accessibility-element={true}
      accessibility-label={chip.label}
    >
      <svg
        className="learning-shell-review-chip-icon"
        content={chip.unlocked ? tick : refresh}
        current-color={chip.unlocked ? color.white : color.fg.brand}
      />
      <text className="learning-shell-review-chip-label">{chip.label}</text>
    </view>
  );
}
