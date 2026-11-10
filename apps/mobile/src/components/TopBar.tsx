import type { ReactNode } from "@lynx-js/react";

import notification03 from "@libitums/icons/lynx/notification-03";
import { color } from "@libitums/design-tokens";
import { useMotion } from "@libitums/ui-lynx/motion";

import { noStatBumps } from "../lib/stat-bump";
import type { StatBumpKind, StatBumps } from "../lib/stat-bump";
import { useUiCopy } from "../lib/ui-copy";

import { StatChip } from "./StatChip";
import { coinPlusShownAt, screenWidthFrom, statChipText, topBarDenseAt } from "./top-bar-layout";
import { UnlimitedTicketChip } from "./UnlimitedTicketChip";
import { hasTopBarNotificationsShade, topBarNotificationsClassName } from "./top-bar-press";

import "./top-bar.css";

// 화면들이 함께 쓰는 상단 줄입니다 — 왼쪽에 연속 학습 · 트로피 · 학습 티켓 · 엽전, 오른쪽에 알림 버튼.
// 엽전 칩은 상점을 여는 버튼입니다(ADR-0116 D7). 화면 제목은 여기 없습니다. 여정 맵에서는
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
  /** 남은 학습 티켓 수입니다. 넘기지 않거나 `null`이면 칩을 그리지 않습니다. */
  readonly ticketCount?: number | null;
  readonly onOpenTickets?: () => void;
  /** 보유 엽전입니다(ADR-0116). 넘기지 않거나 `null`(진행을 불러오는 중)이면 칩을 그리지 않습니다. */
  readonly coinCount?: number | null;
  /** 엽전 상점을 엽니다. 넘기면 엽전 칩이 「+」를 단 버튼이 되고, 없으면 읽기 전용입니다. */
  readonly onOpenCoins?: () => void;
  /** 무제한입니다(시험 계정 — ADR-0085) — 티켓 칩이 무제한 칩(ADR-0115)이고, 누르면 `onOpenTickets`입니다. */
  readonly ticketsUnlimited?: boolean;
  /** 활동으로 오르기 전 값입니다(ADR-0064). 칩이 그 값에서 지금 값으로 한 번 굴립니다. */
  readonly bumps?: StatBumps;
  /** 참인 동안 오름 재생을 미룹니다 — 모달이 덮고 있거나 곧 열릴 때입니다. */
  readonly bumpHeld?: boolean;
  readonly onBumped?: (kind: StatBumpKind) => void;
  /** 학습 티켓을 쓰기 전 장수입니다(시안 E4). 티켓 칩이 그 값에서 지금 값으로 한 번 줄어듭니다. */
  readonly ticketDropFrom?: number | null;
  readonly onTicketDropped?: () => void;
};

export function TopBar({
  streakDays,
  trophyCount,
  onOpenNotifications,
  onOpenStreak,
  onOpenTrophy,
  ticketCount = null,
  onOpenTickets,
  ticketsUnlimited = false,
  coinCount = null,
  onOpenCoins,
  bumps = noStatBumps,
  bumpHeld = false,
  onBumped,
  ticketDropFrom = null,
  onTicketDropped,
}: TopBarProps): ReactNode {
  const copy = useUiCopy();
  const motion = useMotion();
  // 좁은 폭(360 미만)에서는 엽전 칩의 「+」를 뺍니다 — 알림 버튼이 덮지 않게(ADR-0116 개정 2026-11-10).
  const screenWidth = screenWidthFrom(typeof SystemInfo === "undefined" ? undefined : SystemInfo);
  const coinPlus = coinPlusShownAt(screenWidth);
  // 340 미만 폭에서는 칩 줄을 더 촘촘하게 합니다(사용자 결정 A, 2026-11-10). 엽전 칩이 선 줄(compact)에만 겁니다.
  const statsClass =
    coinCount === null
      ? "top-bar-stats"
      : topBarDenseAt(screenWidth)
        ? "top-bar-stats top-bar-stats-compact top-bar-stats-dense"
        : "top-bar-stats top-bar-stats-compact";
  // standard에서는 속성을 아예 넘기지 않습니다 — undefined로 넘기면 테스트 렌더러가 "null"로 남깁니다.
  const motionProps = motion === "reduced" ? { "data-motion": "reduced" } : {};
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
  const handleOpenTickets = () => {
    "background only";
    onOpenTickets?.();
  };
  const handleOpenCoins = () => {
    "background only";
    onOpenCoins?.();
  };

  // 막은 있을 때와 없을 때를 갈래로 나눕니다 — 조건 자식 한 칸을 두면 렌더러가 그 칸을 감싸는
  // 요소를 끼워 「첫 자식」이 막이 아니게 됩니다.
  const shaded = hasTopBarNotificationsShade(motion);
  const notificationsProps = {
    className: topBarNotificationsClassName(motion),
    "data-testid": "top-bar-notifications",
    ...motionProps,
    "accessibility-element": true,
    "accessibility-label": copy.shell.notifications,
    "accessibility-traits": "button" as const,
    bindtap: handleOpenNotifications,
  };
  const notificationsIcon = (
    <svg
      className="top-bar-notifications-icon"
      data-testid="top-bar-notifications-icon"
      content={notification03}
      current-color={color.fg.neutral}
    />
  );

  // **칩이 버튼인지는 화면마다 다릅니다.** 여정 맵은 칩을 눌러 지표 모달을 열지만,
  // 학습 화면은 열 모달이 없어 콜백을 안 넘깁니다. 그때도 `traits="button"`을 붙이면
  // **누르면 무언가 일어난다고 말해 놓고 아무 일도 안 하는 정지점**이 됩니다.
  //
  // 그 규칙을 `StatChip`이 집니다 — `onTap`이 있으면 버튼이고 없으면 읽기 전용입니다.
  // 이름은 두 경우 모두 답니다: 숫자만 낭독되면 무엇의 3인지 알 수 없는 것은 누를 수
  // 있든 없든 같습니다.

  return (
    <view className="top-bar">
      {/* 엽전 칩이 서면 칩이 넷이라 간격 · 칩 좌우 여백을 줄입니다 — 360 폭에서 알림 버튼과 겹치지 않게(ADR-0116). */}
      <view className={statsClass}>
        {/* 칩은 누르면 지표 모달을 여는 버튼입니다. 숫자만 낭독되면 무엇의 3인지 알 수
            없으므로 칩마다 이름을 답니다 — 아이콘은 그 이름 안에 이미 들어 있습니다. */}
        <StatChip
          tone="streak"
          value={streakDays}
          formatValue={statChipText}
          accessibilityLabel={copy.common.count.streakDays(streakDays)}
          testId="top-bar-streak"
          surface="white"
          height="touch-target"
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
            formatValue={statChipText}
            accessibilityLabel={copy.common.count.trophies(trophyCount)}
            testId="top-bar-trophy"
            surface="white"
            height="touch-target"
            onTap={onOpenTrophy === undefined ? undefined : handleOpenTrophy}
            bumpFrom={bumps.trophy}
            bumpHeld={bumpHeld}
            onBumped={() => onBumped?.("trophy")}
          />
        )}
        {/* 학습 티켓은 숫자만 섭니다(시안 E1). 오르지는 않고, 새 레슨에 한 장을 쓴 순간 한 번 줄어듭니다(시안 E4).
            무제한(ADR-0115)이면 숫자 대신 무제한 칩이 서고, 누르면 무제한 모달을 엽니다(ADR-0085 D3 개정). */}
        {ticketCount === null ? null : ticketsUnlimited ? (
          <UnlimitedTicketChip
            testId="top-bar-tickets"
            accessibilityLabel={copy.tickets.unlimited}
            height="touch-target"
            onTap={onOpenTickets === undefined ? undefined : handleOpenTickets}
          />
        ) : (
          <StatChip
            tone="ticket"
            value={ticketCount}
            formatValue={statChipText}
            accessibilityLabel={copy.tickets.ticketsLeft(ticketCount)}
            testId="top-bar-tickets"
            surface="white"
            height="touch-target"
            onTap={onOpenTickets === undefined ? undefined : handleOpenTickets}
            dropFrom={ticketDropFrom}
            onDropped={onTicketDropped}
          />
        )}
        {/* 보유 엽전(ADR-0116) — 상점을 열 수 있으면 「+」를 단 버튼이고 이름이 「120 coins, get more」입니다. */}
        {coinCount === null ? null : (
          <StatChip
            tone="coin"
            value={coinCount}
            formatValue={statChipText}
            accessibilityLabel={
              onOpenCoins === undefined
                ? copy.common.count.coins(coinCount)
                : copy.coinShop.openShop(coinCount)
            }
            testId="top-bar-coins"
            surface="white"
            height="touch-target"
            onTap={onOpenCoins === undefined ? undefined : handleOpenCoins}
            plus={onOpenCoins !== undefined && coinPlus}
          />
        )}
      </view>
      {shaded ? (
        <view {...notificationsProps}>
          <view className="top-bar-notifications-shade" data-testid="top-bar-notifications-shade" />
          {notificationsIcon}
        </view>
      ) : (
        <view {...notificationsProps}>{notificationsIcon}</view>
      )}
    </view>
  );
}
