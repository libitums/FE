import type { ReactNode } from "@lynx-js/react";

import { StatChip } from "../../components/StatChip";
import { UnlimitedTicketChip } from "../../components/UnlimitedTicketChip";
import type { StatBumpKind, StatBumps } from "../../lib/stat-bump";
import { useUiCopy } from "../../lib/ui-copy";
import { coinFlightTargetId } from "./LessonCompleteCoinFlight";

/** 머리 티켓 칩의 값 — 시험 계정이면 무제한입니다(무제한 칩 — ADR-0115). */
export type LessonCompleteTicketChip = { readonly count: number; readonly unlimited: boolean };

/**
 * 머리 엽전 칩(ADR-0116) — `count`는 보유량(이름), `shown`은 지금 보일 숫자(엽전이 닿을 때마다 오름), `bumpFrom`은
 * 움직임 줄이기에서 한 번 바꿀 보상 전 값, `pulseKey`는 마지막 엽전이 닿을 때 아이콘을 한 번 튀기는 열쇠입니다.
 */
export type LessonCompleteCoinChip = {
  readonly count: number;
  readonly shown: number;
  readonly bumpFrom: number | null;
  readonly pulseKey: number;
  readonly onBumped: () => void;
};

// 결과 화면의 [고정] 머리 — 연속 학습 · 트로피 · 학습 티켓 · 엽전. 읽기 전용입니다(맵 머리와 같은 칩 셋, 사용자 결정
// 2026-11-02). 티켓 칩은 결선이 값을 내릴 때만 섭니다.
export function LessonCompleteStats({
  streakDays,
  trophyCount,
  ticketChip,
  coinChip,
  statBumps,
  bumpDelayMs,
  onStatBumped,
}: {
  readonly streakDays: number;
  readonly trophyCount: number;
  readonly ticketChip: LessonCompleteTicketChip | undefined;
  readonly coinChip?: LessonCompleteCoinChip;
  readonly statBumps: StatBumps;
  readonly bumpDelayMs: number;
  readonly onStatBumped: ((kind: StatBumpKind) => void) | undefined;
}): ReactNode {
  const copy = useUiCopy();
  return (
    <view className="lesson-complete-screen-stats">
      <StatChip
        tone="streak"
        value={streakDays}
        accessibilityLabel={copy.common.count.streakDays(streakDays)}
        testId="lesson-complete-screen-streak"
        bumpFrom={statBumps.streak}
        bumpDelayMs={bumpDelayMs}
        onBumped={() => onStatBumped?.("streak")}
      />
      <StatChip
        tone="trophy"
        value={trophyCount}
        accessibilityLabel={copy.common.count.trophies(trophyCount)}
        testId="lesson-complete-screen-trophy"
        bumpFrom={statBumps.trophy}
        bumpDelayMs={bumpDelayMs}
        onBumped={() => onStatBumped?.("trophy")}
      />
      {/* 무제한이면 무제한 칩(ADR-0115) — 결과 화면에서는 읽기 전용입니다. */}
      {ticketChip === undefined ? null : ticketChip.unlimited ? (
        <UnlimitedTicketChip
          testId="lesson-complete-screen-tickets-chip"
          accessibilityLabel={copy.tickets.unlimited}
          height="hug"
        />
      ) : (
        <StatChip
          tone="ticket"
          value={ticketChip.count}
          accessibilityLabel={copy.tickets.ticketsLeft(ticketChip.count)}
          testId="lesson-complete-screen-tickets-chip"
        />
      )}
      {coinChip === undefined ? null : (
        <StatChip
          tone="coin"
          value={coinChip.shown}
          accessibilityLabel={copy.common.count.coins(coinChip.count)}
          testId="lesson-complete-screen-coins-chip"
          iconId={coinFlightTargetId}
          pulseKey={coinChip.pulseKey}
          bumpFrom={coinChip.bumpFrom}
          bumpDelayMs={bumpDelayMs}
          onBumped={coinChip.onBumped}
        />
      )}
    </view>
  );
}
