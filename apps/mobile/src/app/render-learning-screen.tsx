// `LearningShell` 위에 서는 학습 화면 셋(문장 만들기 · 말하기 · 쓰기)과, `render-screen.tsx`가
// 300줄에 닿아 함께 떼어 둔 낱말 고르기의 route를 화면으로 옮깁니다.
// `render-episode-intro.tsx` · `render-roleplay-screen.tsx`와 같은 갈래입니다.

import { SentenceOrderScreen } from "../screens/sentence-order/SentenceOrderScreen";
import { SpeakingScreen } from "../screens/speaking/SpeakingScreen";
import { WordChoiceScreen } from "../screens/word-choice/WordChoiceScreen";
import { WritingScreen } from "../screens/writing/WritingScreen";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

// 셋이 같은 모양으로 쓰는 헬퍼입니다 — `activityIndex`만 다르고 나머지는
// `wiring.onFinishLearning`에 그대로 넘깁니다.
function onFinishActivity(screen: { readonly activityIndex: number }, wiring: ScreenWiring) {
  return (
    id: Parameters<ScreenWiring["onFinishLearning"]>[0],
    results: Parameters<ScreenWiring["onFinishLearning"]>[2],
    skippedCount: Parameters<ScreenWiring["onFinishLearning"]>[3],
  ) => wiring.onFinishLearning(id, screen.activityIndex, results, skippedCount);
}

export function renderShellLearningScreen(
  screen: Extract<Screen, { name: "sentence-order" | "speaking" | "writing" }>,
  wiring: ScreenWiring,
) {
  const onFinish = onFinishActivity(screen, wiring);
  // `default` 없는 `switch`입니다 — 껍데기 위 학습형이 늘면 여기가 TS2366으로 섭니다.
  switch (screen.name) {
    case "sentence-order":
      return (
        <SentenceOrderScreen
          stepId={screen.stepId}
          onExit={wiring.onExitLearning}
          onFinish={onFinish}
        />
      );
    case "speaking":
      return (
        <SpeakingScreen stepId={screen.stepId} onExit={wiring.onExitLearning} onFinish={onFinish} />
      );
    case "writing":
      return (
        <WritingScreen
          stepId={screen.stepId}
          onExit={wiring.onExitLearning}
          // 쓰기에는 건너뛰기가 없습니다 — 잴 수 없던 음절은 결과에 싣지 않을 뿐입니다.
          onFinish={(id, results) => onFinish(id, results, 0)}
        />
      );
  }
}

export function renderWordChoiceScreen(
  screen: Extract<Screen, { name: "word-choice" }>,
  wiring: ScreenWiring,
) {
  return (
    <WordChoiceScreen
      stepId={screen.stepId}
      onExit={wiring.onExitLearning}
      onFinish={onFinishActivity(screen, wiring)}
    />
  );
}
