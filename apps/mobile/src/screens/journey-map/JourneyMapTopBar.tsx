import type { ReactNode } from "@lynx-js/react";

import fire from "@libitums/icons/lynx/fire";
import notification from "@libitums/icons/lynx/notification";
import trophy from "@libitums/icons/lynx/trophy";
import { color } from "@libitums/design-tokens";

import "./journey-map-top-bar.css";

// 여정 맵의 상단 줄입니다 — 왼쪽에 지표 칩 둘, 오른쪽에 알림 버튼. 화면 제목은 여기
// 없습니다. 에피소드 헤더 카드가 「지금 어느 에피소드인가」를 이미 말하므로 제목 줄을
// 따로 두면 같은 말이 두 번 섭니다.

export type JourneyMapTopBarProps = {
  /** 연속으로 학습한 날 수입니다. */
  readonly streakDays: number;
  /** 얻은 트로피 수입니다. */
  readonly trophyCount: number;
  readonly onOpenNotifications: () => void;
};

export function JourneyMapTopBar({
  streakDays,
  trophyCount,
  onOpenNotifications,
}: JourneyMapTopBarProps): ReactNode {
  const handleOpenNotifications = () => {
    "background only";
    onOpenNotifications();
  };

  return (
    <view className="journey-map-top-bar">
      <view className="journey-map-top-bar-stats">
        {/* 칩은 읽기 전용 지표라 버튼이 아닙니다. 숫자만 낭독되면 무엇의 3인지 알 수
            없으므로 칩마다 이름을 답니다 — 아이콘은 그 이름 안에 이미 들어 있습니다. */}
        <view
          className="journey-map-top-bar-chip"
          data-testid="journey-map-top-bar-streak"
          accessibility-element={true}
          accessibility-label={`연속 학습 ${streakDays}일`}
        >
          <svg
            className="journey-map-top-bar-chip-icon"
            content={fire}
            current-color={color.brand.secondary}
          />
          <text className="journey-map-top-bar-chip-streak">{String(streakDays)}</text>
        </view>
        <view
          className="journey-map-top-bar-chip"
          data-testid="journey-map-top-bar-trophy"
          accessibility-element={true}
          accessibility-label={`트로피 ${trophyCount}개`}
        >
          <svg
            className="journey-map-top-bar-chip-icon"
            content={trophy}
            current-color={color.feedback.warning}
          />
          <text className="journey-map-top-bar-chip-trophy">{String(trophyCount)}</text>
        </view>
      </view>
      <view
        className="journey-map-top-bar-notifications"
        data-testid="journey-map-screen-notifications"
        accessibility-element={true}
        accessibility-label="알림"
        accessibility-traits="button"
        bindtap={handleOpenNotifications}
      >
        <svg
          className="journey-map-top-bar-notifications-icon"
          content={notification}
          current-color={color.gray[700]}
        />
      </view>
    </view>
  );
}
