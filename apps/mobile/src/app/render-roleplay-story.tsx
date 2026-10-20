// 에피소드 롤플레이 route 둘을 그립니다 — 흐름(`roleplay-story`)과 결과(`roleplay-story-complete`).
// 결과는 레슨과 같은 화면 · 같은 판정 기준이고, 나가기는 롤플레이 목록, 다시 하기는 처음부터입니다.

import { judgeAssessment } from "../screens/assessment/assessment";
import { LessonCompleteScreen } from "../screens/lesson-complete/LessonCompleteScreen";
import { lessonRewardPlaceholder } from "../screens/lesson-complete/lesson-complete";
import { catalogPassCriterion } from "./catalog-lesson-plan";
import type { Screen } from "./nav-state";
import { RoleplayStoryFlow } from "./RoleplayStoryFlow";
import { roleplayStoryModelOf } from "./roleplay-story-model";
import type { ScreenWiring } from "./screen-wiring";

type RoleplayStoryScreen = Extract<Screen, { name: "roleplay-story" | "roleplay-story-complete" }>;

export function renderRoleplayStory(screen: RoleplayStoryScreen, wiring: ScreenWiring) {
  const { episodeId } = screen;
  if (screen.name === "roleplay-story-complete") {
    const questionCount = screen.results.length + screen.skippedCount;
    return (
      <LessonCompleteScreen
        key={`${episodeId}:roleplay-complete`}
        results={screen.results}
        skippedCount={screen.skippedCount}
        verdict={judgeAssessment(screen.results, catalogPassCriterion(questionCount))}
        streakDays={wiring.streakDays}
        trophyCount={wiring.trophyCount}
        reward={lessonRewardPlaceholder}
        exitTo="roleplay"
        onExit={wiring.onExitRoleplayStory}
        onRetry={() => wiring.onRetryRoleplayStory(episodeId)}
      />
    );
  }
  const model = roleplayStoryModelOf(
    wiring.episodeContent,
    wiring.catalogSections,
    episodeId,
    wiring.learnerFill,
  );
  // 목록은 말할 턴이 있는 에피소드만 싣습니다 — 여기서 없다면 데이터 오류라 숨기지 않고 던집니다.
  if (model === null) {
    throw new Error(`Roleplay has no playable turns: ${episodeId}`);
  }
  return (
    <RoleplayStoryFlow
      key={episodeId}
      insets={wiring.safeAreaInsets}
      model={model}
      onFinish={(results, skippedCount) =>
        wiring.onFinishRoleplayStory(episodeId, results, skippedCount)
      }
      onExit={wiring.onExitRoleplayStory}
    />
  );
}
