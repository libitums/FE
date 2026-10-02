// 에피소드 최종 테스트 route 둘(테스트 · 학습 완료)을 화면으로 옮깁니다. `render-screen.tsx`가
// 커서 떼어 둔 것이고, `render-episode-intro.tsx`와 같은 갈래입니다.

import { EpisodeFinalCallScreen } from "../screens/episode-final/EpisodeFinalCallScreen";
import { EpisodeFinalJourneyScreen } from "./EpisodeFinalJourneyScreen";
import type { AnswerResult } from "../lib/answer-result";
import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import { journeyMapSections } from "../screens/journey-map/journey-map";
import { LessonCompleteScreen } from "../screens/lesson-complete/LessonCompleteScreen";
import { lessonRewardPlaceholder } from "../screens/lesson-complete/lesson-complete";
// 통화 상대의 얼굴입니다 — 서사 통화와 같은 임시 그림입니다(`render-episode-intro.tsx`).
import jiminPortrait from "../screens/visual-novel/assets/cafe/character-jimin-smile.png";
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
    case "episode-final": {
      // 형식은 에피소드의 서사 형식을 따릅니다 — 통화면 통화 위에서, 비주얼 노벨이면 장면 위에서.
      const test = wiring.episodeFinalTestFor(screen.unitId);
      const common = {
        insets: wiring.safeAreaInsets,
        episodeLabel: episodeLabelOf(screen.unitId),
        onFinish: (results: readonly AnswerResult[]) =>
          wiring.onFinishEpisodeFinal(screen.unitId, results),
        onExit: wiring.onExitEpisodeFinal,
      };
      return test.format === "call" ? (
        <EpisodeFinalCallScreen
          key={screen.unitId}
          {...common}
          test={test}
          callerPortrait={jiminPortrait}
        />
      ) : (
        <EpisodeFinalJourneyScreen key={screen.unitId} {...common} test={test} />
      );
    }
    // 이야기형 복습은 통과와 마무리 서사를 끝낸 뒤에만 이 route에 닿습니다. 실수 수는 결과에서
    // 셉니다. 지표와 보상은 서사 뒤의 학습 완료와 같은 값입니다(`render-episode-intro.tsx`).
    case "episode-final-complete":
      return (
        <LessonCompleteScreen
          results={screen.results}
          skippedCount={0}
          verdict="passed"
          streakDays={wiring.streakDays}
          trophyCount={wiring.trophyCount}
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
