import { LessonCompleteScreen } from "../screens/lesson-complete/LessonCompleteScreen";
import { lessonRewardPlaceholder } from "../screens/lesson-complete/lesson-complete";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

// 중간 서사 완료 화면입니다. 메신저는 이번 답장의 정오를, 통화·비주얼 노벨은
// 판정 문항이 없는 완료([])를 표시합니다. 나가기 라벨은 연 탭의 루트를 따릅니다.
export function renderMessengerCompleteScreen(
  screen: Extract<Screen, { name: "messenger-complete" | "special-unit-complete" }>,
  wiring: ScreenWiring,
) {
  return (
    <LessonCompleteScreen
      results={screen.name === "messenger-complete" ? screen.results : []}
      skippedCount={0}
      verdict="passed"
      streakDays={wiring.streakDays}
      trophyCount={wiring.trophyCount}
      reward={lessonRewardPlaceholder}
      exitTo={screen.exitTo}
      onExit={wiring.onExitMessengerComplete}
    />
  );
}
