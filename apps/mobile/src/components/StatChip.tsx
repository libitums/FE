import type { ReactNode } from "@lynx-js/react";

import diamond from "@libitums/icons/lynx/diamond";
import fire from "@libitums/icons/lynx/fire";
import trophy from "@libitums/icons/lynx/trophy";
import { color } from "@libitums/design-tokens";

import "./stat-chip.css";

// 지표 칩 하나 — 아이콘 + 숫자입니다. 여정 맵 상단 바와 학습 완료 화면 머리가 함께 씁니다
// (화면 둘 이상이 쓰는 컴포넌트, ADR-0008).
//
// 숫자만 낭독되면 무엇의 3인지 알 수 없으므로 칩마다 이름(`accessibilityLabel`)을 답니다 —
// 아이콘은 그 이름 안에 이미 들어 있습니다. `onTap`이 있으면 버튼이고 없으면 읽기 전용입니다.

export type StatChipTone = "streak" | "trophy" | "diamond";

/**
 * 칩의 면입니다. `none`은 바탕이 그대로 비치고(학습 완료 머리), `white`는 흰 면을 칠합니다
 * (상단 바 — 스크롤되는 내용 위에 떠 있어 면이 없으면 칩이 내용과 섞입니다).
 */
export type StatChipSurface = "none" | "white";

// 다이아 색은 디자인 값(#00C3FF, Figma 65-466)이고 맞는 색 토큰이 패키지에 없어 적어 둡니다.
export const statChipDiamondColor = "#00C3FF";

const iconByTone: Record<StatChipTone, string> = { streak: fire, trophy, diamond };

const iconColorByTone: Record<StatChipTone, string> = {
  streak: color.brand.secondary,
  trophy: color.feedback.warning,
  diamond: statChipDiamondColor,
};

export type StatChipProps = {
  readonly tone: StatChipTone;
  readonly value: number;
  readonly accessibilityLabel: string;
  readonly testId: string;
  readonly onTap?: () => void;
  /** 기본값은 `none`입니다. */
  readonly surface?: StatChipSurface;
};

export function StatChip({
  tone,
  value,
  accessibilityLabel,
  testId,
  onTap,
  surface = "none",
}: StatChipProps): ReactNode {
  const handleTap = () => {
    "background only";
    onTap?.();
  };

  return (
    <view
      className={surface === "white" ? "stat-chip stat-chip-surface-white" : "stat-chip"}
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={accessibilityLabel}
      accessibility-traits={onTap ? "button" : undefined}
      bindtap={onTap ? handleTap : undefined}
    >
      <svg
        className="stat-chip-icon"
        content={iconByTone[tone]}
        current-color={iconColorByTone[tone]}
      />
      <text className={`stat-chip-value stat-chip-value-${tone}`}>{String(value)}</text>
    </view>
  );
}
