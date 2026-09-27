import type { ReactNode } from "@lynx-js/react";

import fire from "@libitums/icons/lynx/fire";
import notification from "@libitums/icons/lynx/notification";
import trophy from "@libitums/icons/lynx/trophy";
import { color } from "@libitums/design-tokens";

import "./top-bar.css";

// 화면들이 함께 쓰는 상단 줄입니다 — 왼쪽에 지표 칩 둘, 오른쪽에 알림 버튼. 칩을 누르면
// 그 지표의 모달(연속 학습 · 트로피)이 뜹니다. 화면 제목은 여기 없습니다. 여정 맵에서는
// 에피소드 헤더 카드가, 학습 화면에서는 세션 헤더가 「지금 어디인가」를 이미 말하므로
// 제목 줄을 따로 두면 같은 말이 두 번 섭니다.

export type TopBarProps = {
  /** 연속으로 학습한 날 수입니다. */
  readonly streakDays: number;
  /** 얻은 트로피 수입니다. */
  readonly trophyCount: number;
  readonly onOpenNotifications: () => void;
  /** 칩을 누르면 부릅니다. 모달을 여닫는 일은 화면이 집니다. */
  readonly onOpenStreak?: () => void;
  readonly onOpenTrophy?: () => void;
};

export function TopBar({
  streakDays,
  trophyCount,
  onOpenNotifications,
  onOpenStreak,
  onOpenTrophy,
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

  return (
    <view className="top-bar">
      <view className="top-bar-stats">
        {/* 칩은 누르면 지표 모달을 여는 버튼입니다. 숫자만 낭독되면 무엇의 3인지 알 수
            없으므로 칩마다 이름을 답니다 — 아이콘은 그 이름 안에 이미 들어 있습니다. */}
        <view
          className="top-bar-chip"
          data-testid="top-bar-streak"
          accessibility-element={true}
          accessibility-label={`연속 학습 ${streakDays}일`}
          accessibility-traits="button"
          bindtap={handleOpenStreak}
        >
          <svg className="top-bar-chip-icon" content={fire} current-color={color.brand.secondary} />
          <text className="top-bar-chip-streak">{String(streakDays)}</text>
        </view>
        <view
          className="top-bar-chip"
          data-testid="top-bar-trophy"
          accessibility-element={true}
          accessibility-label={`트로피 ${trophyCount}개`}
          accessibility-traits="button"
          bindtap={handleOpenTrophy}
        >
          <svg
            className="top-bar-chip-icon"
            content={trophy}
            current-color={color.feedback.warning}
          />
          <text className="top-bar-chip-trophy">{String(trophyCount)}</text>
        </view>
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
