import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import refresh from "@libitums/icons/lynx/refresh";
import { color, motion as motionTokens } from "@libitums/design-tokens";
import { motionDurationMs, useMotion } from "@libitums/ui-lynx/motion";

import { announce } from "../../lib/accessibility";
import { useUiCopy } from "../../lib/ui-copy";

import "./lesson-review-badge.css";

// 틀린 문제 다시 풀기의 시작 배지입니다(2026-10-23) — 「Let’s fix n mistakes」 알약이 내용 가운데 위에 한 번
// 떴다가 사라집니다. 톡 튀어 들어와(살짝 1을 넘었다가 자리) 1초쯤 머문 뒤 조금 떠오르며 흐려집니다 — 전체 1.8초.
// 움직임 줄이기에서는 크기 · 이동 없이 나타났다 흐려지기만 합니다.
//
// 터치를 받지 않습니다(`user-interaction-enabled={false}`) — 떠 있는 동안에도 아래 문항을 바로 풀 수 있고, 다 끝나면
// DOM에서 걷힙니다. 보이는 글을 서는 순간 한 번 낭독합니다(화면이 바뀐 까닭을 듣는 사람에게도 알립니다).

/** 배지가 지나는 국면입니다 — 들어와 머묾 · 떠나며 흐려짐 · 걷힘. */
export type LessonReviewBadgePhase = "enter" | "exit" | "gone";

/** 들어오는 길이(`d7`) + 머무는 길이(`d9`) 뒤에 떠나기 시작합니다. */
export const lessonReviewBadgeExitAtMs =
  motionDurationMs(motionTokens.duration.d7) + motionDurationMs(motionTokens.duration.d9);

/** 떠나는 길이(`d7`)까지 지나면 걷힙니다 — 전체 길이입니다. */
export const lessonReviewBadgeGoneAtMs =
  lessonReviewBadgeExitAtMs + motionDurationMs(motionTokens.duration.d7);

export function LessonReviewBadge({ count }: { readonly count: number }): ReactNode {
  const copy = useUiCopy();
  const reduced = useMotion() === "reduced";
  const [phase, setPhase] = useState<LessonReviewBadgePhase>("enter");
  const label = copy.learningShell.review.intro(count);

  // 한 번만 재생합니다 — 마운트 때 낭독하고 두 타이머를 걸며, 화면이 먼저 떠나면 cleanup이 거둡니다. 수(`label`)는
  // 배지가 서 있는 동안 바뀌지 않아 마운트 한 번만 봅니다.
  useEffect(() => {
    announce(label);
    const exit = setTimeout(() => setPhase("exit"), lessonReviewBadgeExitAtMs);
    const gone = setTimeout(() => setPhase("gone"), lessonReviewBadgeGoneAtMs);
    return () => {
      clearTimeout(exit);
      clearTimeout(gone);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "gone") return null;
  const motionClass = `lesson-review-badge-${phase}${reduced ? "-reduced" : ""}`;
  return (
    <view
      className="lesson-review-badge-layer"
      data-testid="lesson-review-badge-layer"
      user-interaction-enabled={false}
    >
      <view
        className={`lesson-review-badge ${motionClass}`}
        data-testid="lesson-review-badge"
        data-phase={phase}
        {...(reduced ? { "data-motion": "reduced" } : {})}
      >
        <svg className="lesson-review-badge-icon" content={refresh} current-color={color.white} />
        <text className="lesson-review-badge-label">{label}</text>
      </view>
    </view>
  );
}
