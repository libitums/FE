import type { ReactNode } from "@lynx-js/react";

import notification from "@libitums/icons/lynx/notification";
import { color } from "@libitums/design-tokens";

import { noStatBumps } from "../lib/stat-bump";
import type { StatBumpKind, StatBumps } from "../lib/stat-bump";
import { useUiCopy } from "../lib/ui-copy";

import { StatChip } from "./StatChip";

import "./top-bar.css";

// 화면들이 함께 쓰는 상단 줄입니다 — 왼쪽에 연속 학습 · 트로피, 오른쪽에 알림 버튼.
// 젬 구매가 준비될 때까지 젬 칩과 구매 진입점은 표시하지 않습니다. 화면 제목은 여기 없습니다. 여정 맵에서는
// 에피소드 헤더 카드가, 학습 화면에서는 세션 헤더가 「지금 어디인가」를 이미 말하므로
// 제목 줄을 따로 두면 같은 말이 두 번 섭니다.

export type TopBarProps = {
  /** 연속으로 학습한 날 수입니다. */
  readonly streakDays: number;
  /** 얻은 트로피 수입니다. `null`이면 아직 모르는 값입니다. */
  readonly trophyCount: number | null;
  readonly onOpenNotifications: () => void;
  /** 칩을 누르면 부릅니다. 모달을 여닫는 일은 화면이 집니다. */
  readonly onOpenStreak?: () => void;
  readonly onOpenTrophy?: () => void;
  /** 활동으로 오르기 전 값입니다(ADR-0064). 칩이 그 값에서 지금 값으로 한 번 굴립니다. */
  readonly bumps?: StatBumps;
  /** 참인 동안 오름 재생을 미룹니다 — 모달이 덮고 있거나 곧 열릴 때입니다. */
  readonly bumpHeld?: boolean;
  readonly onBumped?: (kind: StatBumpKind) => void;
};

export function TopBar({
  streakDays,
  trophyCount,
  onOpenNotifications,
  onOpenStreak,
  onOpenTrophy,
  bumps = noStatBumps,
  bumpHeld = false,
  onBumped,
}: TopBarProps): ReactNode {
  const copy = useUiCopy();
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
          accessibilityLabel={copy.common.count.streakDays(streakDays)}
          testId="top-bar-streak"
          surface="white"
          onTap={onOpenStreak === undefined ? undefined : handleOpenStreak}
          bumpFrom={bumps.streak}
          bumpHeld={bumpHeld}
          onBumped={() => onBumped?.("streak")}
        />
        {/* 트로피 수를 아직 모르면(null) 0을 보이지 않고 칩을 그리지 않습니다. */}
        {trophyCount === null ? null : (
          <StatChip
            tone="trophy"
            value={trophyCount}
            accessibilityLabel={copy.common.count.trophies(trophyCount)}
            testId="top-bar-trophy"
            surface="white"
            onTap={onOpenTrophy === undefined ? undefined : handleOpenTrophy}
            bumpFrom={bumps.trophy}
            bumpHeld={bumpHeld}
            onBumped={() => onBumped?.("trophy")}
          />
        )}
      </view>
      <view
        className="top-bar-notifications"
        data-testid="top-bar-notifications"
        accessibility-element={true}
        accessibility-label={copy.shell.notifications}
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
