import type { ReactNode } from "@lynx-js/react";

import notification from "@libitums/icons/lynx/notification";
import { color } from "@libitums/design-tokens";

import { StatChip } from "./StatChip";

import "./top-bar.css";

// 화면들이 함께 쓰는 상단 줄입니다 — 왼쪽에 칩 셋(연속 학습 · 트로피 · 젬), 오른쪽에 알림
// 버튼. 지표 칩을 누르면 그 지표의 모달(연속 학습 · 트로피)이, 젬 칩을 누르면 젬 구매
// 화면이 뜹니다. 화면 제목은 여기 없습니다. 여정 맵에서는
// 에피소드 헤더 카드가, 학습 화면에서는 세션 헤더가 「지금 어디인가」를 이미 말하므로
// 제목 줄을 따로 두면 같은 말이 두 번 섭니다.

export type TopBarProps = {
  /** 연속으로 학습한 날 수입니다. */
  readonly streakDays: number;
  /** 얻은 트로피 수입니다. */
  readonly trophyCount: number;
  /** 가진 젬 수입니다. */
  readonly gemCount: number;
  readonly onOpenNotifications: () => void;
  /** 칩을 누르면 부릅니다. 모달을 여닫는 일은 화면이 집니다. */
  readonly onOpenStreak?: () => void;
  readonly onOpenTrophy?: () => void;
  readonly onOpenGem?: () => void;
};

export function TopBar({
  streakDays,
  trophyCount,
  onOpenNotifications,
  onOpenStreak,
  onOpenTrophy,
  gemCount,
  onOpenGem,
}: TopBarProps): ReactNode {
  const handleOpenNotifications = () => {
    "background only";
    onOpenNotifications();
  };
  const handleOpenStreak = () => {
    "background only";
    onOpenStreak?.();
  };
  const handleOpenTrophy = () => {
    "background only";
    onOpenTrophy?.();
  };
  const handleOpenGem = () => {
    "background only";
    onOpenGem?.();
  };

  // **칩이 버튼인지는 화면마다 다릅니다.** 여정 맵은 칩을 눌러 지표 모달을 열지만,
  // 학습 화면은 열 모달이 없어 콜백을 안 넘깁니다. 그때도 `traits="button"`을 붙이면
  // **누르면 무언가 일어난다고 말해 놓고 아무 일도 안 하는 정지점**이 됩니다.
  //
  // 그 규칙을 `StatChip`이 집니다 — `onTap`이 있으면 버튼이고 없으면 읽기 전용입니다.
  // 이름은 두 경우 모두 답니다: 숫자만 낭독되면 무엇의 3인지 알 수 없는 것은 누를 수
  // 있든 없든 같습니다.

  return (
    <view className="top-bar">
      <view className="top-bar-stats">
        {/* 칩은 누르면 지표 모달을 여는 버튼입니다. 숫자만 낭독되면 무엇의 3인지 알 수
            없으므로 칩마다 이름을 답니다 — 아이콘은 그 이름 안에 이미 들어 있습니다. */}
        <StatChip
          tone="streak"
          value={streakDays}
          accessibilityLabel={`연속 학습 ${streakDays}일`}
          testId="top-bar-streak"
          surface="white"
          onTap={onOpenStreak === undefined ? undefined : handleOpenStreak}
        />
        <StatChip
          tone="trophy"
          value={trophyCount}
          accessibilityLabel={`트로피 ${trophyCount}개`}
          testId="top-bar-trophy"
          surface="white"
          onTap={onOpenTrophy === undefined ? undefined : handleOpenTrophy}
        />
        {/* 젬 칩은 트로피 옆에 섭니다(Figma 65-554). 지표가 아니라 재화라 누르면 모달이
            아니라 구매 화면이 뜹니다. */}
        <StatChip
          tone="diamond"
          value={gemCount}
          accessibilityLabel={`젬 ${gemCount}개`}
          testId="top-bar-gem"
          surface="white"
          onTap={onOpenGem === undefined ? undefined : handleOpenGem}
        />
      </view>
      <view
        className="top-bar-notifications"
        data-testid="top-bar-notifications"
        accessibility-element={true}
        accessibility-label="알림"
        accessibility-traits="button"
        bindtap={handleOpenNotifications}
      >
        <svg
          className="top-bar-notifications-icon"
          content={notification}
          current-color={color.gray[700]}
        />
      </view>
    </view>
  );
}
