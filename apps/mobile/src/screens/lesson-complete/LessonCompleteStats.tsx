import type { ReactNode } from "@lynx-js/react";

import { StatChip } from "../../components/StatChip";
import type { StatBumpKind, StatBumps } from "../../lib/stat-bump";
import { useUiCopy } from "../../lib/ui-copy";

/** 머리 티켓 칩의 값 — 시험 계정이면 무제한(∞)입니다. */
export type LessonCompleteTicketChip = { readonly count: number; readonly unlimited: boolean };

// 결과 화면의 [고정] 머리 — 연속 학습 · 트로피 · 학습 티켓. 읽기 전용입니다(맵 머리와 같은 칩 셋, 사용자 결정
// 2026-11-02). 티켓 칩은 결선이 값을 내릴 때만 섭니다.
export function LessonCompleteStats({
  streakDays,
  trophyCount,
  ticketChip,
  statBumps,
  bumpDelayMs,
  onStatBumped,
}: {
  readonly streakDays: number;
  readonly trophyCount: number;
  readonly ticketChip: LessonCompleteTicketChip | undefined;
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
      {ticketChip === undefined ? null : (
        <StatChip
          tone="ticket"
          value={ticketChip.count}
          {...(ticketChip.unlimited ? { valueText: copy.tickets.unlimitedValue } : {})}
          accessibilityLabel={
            ticketChip.unlimited
              ? copy.tickets.unlimited
              : copy.tickets.ticketsLeft(ticketChip.count)
          }
          testId="lesson-complete-screen-tickets-chip"
        />
      )}
    </view>
  );
}
