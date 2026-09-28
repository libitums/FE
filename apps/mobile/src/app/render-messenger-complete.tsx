import { LessonCompleteScreen } from "../screens/lesson-complete/LessonCompleteScreen";
import { lessonRewardPlaceholder } from "../screens/lesson-complete/lesson-complete";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

// 메신저 유닛(서사 기반 최종 테스트)을 마친 뒤의 학습 완료 화면입니다. 대화를 끝까지 가야
// 여기 닿으므로 판정은 늘 통과이고 다시 하기가 없습니다. 틀린 적이 없으면 PERFECT LESSON,
// 있으면 LESSON COMPLETE입니다 — 실수 수는 답장마다 첫 시도의 정오에서 셉니다. 지표와
// 보상은 서사 전개 뒤 학습 완료와 같은 값(연속 · 트로피 0, 젬은 전역 머리와 같은 값, 보상은
// 임시값)입니다.
export function renderMessengerCompleteScreen(
  screen: Extract<Screen, { name: "messenger-complete" }>,
  wiring: ScreenWiring,
) {
  return (
    <LessonCompleteScreen
      results={screen.results}
      verdict="passed"
      streakDays={0}
      trophyCount={0}
      diamondCount={wiring.gemCount}
      reward={lessonRewardPlaceholder}
      onExit={wiring.onExitMessengerComplete}
    />
  );
}
