import type { ReactNode } from "@lynx-js/react";

import cross from "@libitums/icons/lynx/cross";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type { AssessmentVerdict } from "../assessment/assessment";
import type { LessonReviewSummary } from "./lesson-complete-screen-props";

import "./lesson-complete-review.css";

// 틀린 문제를 다시 풀고 온 결과 화면의 조각입니다(ADR-0058 ⟨2026-10-30⟩, 시안 F6 · F7) — 제목 · 설명 줄의 글과, 설명 아래
// 문항별 점 줄(푼 순서 · 고침 ✓ · 놓침 ✗) · 미통과의 모자란 수 줄입니다. 상태가 없습니다.

/** 다시 풀고 온 결과의 제목입니다 — 통과는 만점 표기 없이 `LESSON COMPLETE!`, 미통과는 `SO CLOSE!`. */
export function lessonReviewTitle(verdict: AssessmentVerdict, copy: UiCopy): string {
  return verdict === "failed"
    ? copy.lessonComplete.review.soClose
    : copy.lessonComplete.title.complete;
}

/** 점 줄 한 행의 점 수입니다 — 넘으면 다음 행으로 끊습니다(사용자 결정 2026-10-30). */
export const lessonReviewDotsPerRow = 10;

function rowsOf<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let start = 0; start < items.length; start += size)
    rows.push(items.slice(start, start + size));
  return rows;
}

function fixedCountOf(review: LessonReviewSummary): number {
  return review.outcomes.filter((outcome) => outcome === "fixed").length;
}

/** 설명 줄입니다 — `YOU FIXED 2 OF 3 MISTAKES`. */
export function lessonReviewSubtitle(review: LessonReviewSummary, copy: UiCopy): string {
  return copy.lessonComplete.review.fixedOf(fixedCountOf(review), review.outcomes.length);
}

/** 다시 도전 결과의 낭독입니다 — 보이는 셋(판정 · 고친 수 · 모자란 수)을 같은 순서로 읽습니다(WCAG 1.3.1). */
export function lessonReviewAnnouncement(
  review: LessonReviewSummary,
  verdict: AssessmentVerdict,
  copy: UiCopy,
): string {
  const parts = [
    copy.lessonComplete.outcome[verdict],
    copy.lessonComplete.review.dotsLabel(fixedCountOf(review), review.outcomes.length),
  ];
  if (verdict === "failed" && review.remainingToPass > 0) {
    parts.push(copy.lessonComplete.review.neededMore(review.remainingToPass));
  }
  return parts.join(". ");
}

export function LessonCompleteReviewSummary({
  review,
  verdict,
}: {
  readonly review: LessonReviewSummary;
  readonly verdict: AssessmentVerdict;
}): ReactNode {
  const copy = useUiCopy();
  const fixed = fixedCountOf(review);
  return (
    <>
      {/* 점 줄은 한 요소로 묶어 수를 낭독합니다 — 점 하나하나는 장식입니다. */}
      <view
        className="lesson-complete-review-dots"
        data-testid="lesson-complete-review-dots"
        accessibility-element={true}
        accessibility-label={copy.lessonComplete.review.dotsLabel(fixed, review.outcomes.length)}
      >
        {rowsOf(review.outcomes, lessonReviewDotsPerRow).map((row, rowIndex) => (
          <view
            key={String(rowIndex)}
            className="lesson-complete-review-dots-row"
            data-testid="lesson-complete-review-dots-row"
          >
            {row.map((outcome, index) => (
              <view
                key={`${String(index)}:${outcome}`}
                className={`lesson-complete-review-dot lesson-complete-review-dot-${outcome}`}
                data-testid="lesson-complete-review-dot"
                data-outcome={outcome}
              >
                <svg
                  className="lesson-complete-review-dot-icon"
                  content={outcome === "fixed" ? tick : cross}
                  current-color={outcome === "fixed" ? color.white : color.feedback.incorrect}
                />
              </view>
            ))}
          </view>
        ))}
      </view>
      {verdict === "failed" && review.remainingToPass > 0 ? (
        <text className="lesson-complete-review-needed" data-testid="lesson-complete-review-needed">
          {copy.lessonComplete.review.neededMore(review.remainingToPass)}
        </text>
      ) : null}
    </>
  );
}
