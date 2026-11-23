import type { ReactNode } from "@lynx-js/react";

import { useMotion } from "@libitums/ui-lynx/motion";

import "./skeleton-value.css";

export type SkeletonValueProps = {
  /** 값 글 자리의 너비(px). */
  readonly width: number;
  /** 값 글의 줄 높이(px) — 자리가 같아 칩이 커지거나 줄지 않습니다. 막대는 그 안 가운데 64%. */
  readonly lineHeight: number;
  readonly testId: string;
  /** 면 위 막대 색 — 밝은 면은 회색, 주황 면(구독 중 칩)은 흰 반투명. */
  readonly tone?: "neutral" | "inverse";
};

/**
 * 칩 값의 스켈레톤(ADR-0163 D3 · 시각 메모 docs/design/purchase-pending.md) — 구매 뒤 서버를 기다리는 동안 옛 값 대신 같은 자리에 막대가 서고
 * 메신저 사진 스켈레톤과 같은 빛 띠가 지나갑니다. 움직임 줄이기면 띠가 없습니다. 이름은 칩이 답니다(이 요소는 낭독에서 빠짐).
 */
export function SkeletonValue({
  width,
  lineHeight,
  testId,
  tone = "neutral",
}: SkeletonValueProps): ReactNode {
  const still = useMotion() === "reduced";
  return (
    <view
      className="skeleton-value"
      data-testid={testId}
      data-still={String(still)}
      accessibility-element={false}
      style={{ width: `${width}px`, height: `${lineHeight}px` }}
    >
      <view
        className={`skeleton-value-bar skeleton-value-bar-${tone}`}
        style={{ height: `${Math.round(lineHeight * 0.64)}px` }}
      >
        {still ? null : <view className="skeleton-value-shimmer" />}
      </view>
    </view>
  );
}
