import { createContext, useContext } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { TopBar } from "../../components/TopBar";

// 학습 화면의 상단 줄입니다. 연속 학습 · 트로피는 화면마다 prop으로 내리지 않고 앱이 한 번 공급합니다 —
// 학습형이 늘 때마다 두 값을 잊으면 칩이 0으로 서기 때문입니다. prop을 주면 그 값이 이깁니다.

export type LearningStats = { readonly streakDays: number; readonly trophyCount: number };

export const LearningStatsContext = createContext<LearningStats>({ streakDays: 0, trophyCount: 0 });

export type LearningTopBarProps = {
  readonly streakDays?: number;
  readonly trophyCount?: number;
  readonly onOpenNotifications: () => void;
};

export function LearningTopBar({
  streakDays,
  trophyCount,
  onOpenNotifications,
}: LearningTopBarProps): ReactNode {
  const stats = useContext(LearningStatsContext);
  return (
    <TopBar
      streakDays={streakDays ?? stats.streakDays}
      trophyCount={trophyCount ?? stats.trophyCount}
      onOpenNotifications={onOpenNotifications}
    />
  );
}
