// 에피소드 최종 테스트 route 둘(테스트 · 학습 완료)을 화면으로 옮깁니다. `render-screen.tsx`가
// 커서 떼어 둔 것이고, `render-episode-intro.tsx`와 같은 갈래입니다.

import { EpisodeFinalScreen } from "../screens/episode-final/EpisodeFinalScreen";
import { episodeFinalTestFor } from "../screens/episode-final/episode-final-tests";
import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import { journeyMapSections } from "../screens/journey-map/journey-map";
import { LessonCompleteScreen } from "../screens/lesson-complete/LessonCompleteScreen";
import { lessonRewardPlaceholder } from "../screens/lesson-complete/lesson-complete";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

// 최종 테스트가 속한 에피소드의 머리 제목입니다(`Episode 0.`). 없으면 던집니다 — 이 route를
// 쌓는 자리는 맵 구획의 항목 하나뿐이라, 어느 구획에도 없다면 데이터 오류입니다.
function episodeLabelOf(unitId: EpisodeFinalUnitId): string {
  const section = journeyMapSections.find((candidate) =>
    candidate.items.some((item) => item.kind === "episode-final" && item.id === unitId),
  );
  if (section === undefined) {
    throw new Error(`최종 테스트가 어느 에피소드에도 없습니다: ${unitId}`);
  }
  return section.episode.label;
}

type EpisodeFinalFlowScreen = Extract<Screen, { name: "episode-final" | "episode-final-complete" }>;

export function renderEpisodeFinalFlow(screen: EpisodeFinalFlowScreen, wiring: ScreenWiring) {
  switch (screen.name) {
    case "episode-final":
      return (
        <EpisodeFinalScreen
          key={screen.unitId}
          insets={wiring.safeAreaInsets}
          episodeLabel={episodeLabelOf(screen.unitId)}
          test={episodeFinalTestFor(screen.unitId)}
          onFinish={(results) => wiring.onFinishEpisodeFinal(screen.unitId, results)}
          onExit={wiring.onExitEpisodeFinal}
        />
      );
    // 틀린 문항이 있어도 에피소드는 끝납니다 — 판정은 늘 통과이고, 실수 수는 결과에서
    // 셉니다. 지표와 보상은 서사 뒤의 학습 완료와 같은 값입니다(`render-episode-intro.tsx`).
    case "episode-final-complete":
      return (
        <LessonCompleteScreen
          results={screen.results}
          verdict="passed"
          streakDays={0}
          trophyCount={0}
          diamondCount={wiring.gemCount}
          reward={lessonRewardPlaceholder}
          onExit={() => wiring.onCompleteEpisodeFinal(screen.unitId)}
        />
      );
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
