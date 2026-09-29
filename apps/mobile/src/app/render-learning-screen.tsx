// `LearningShell` 위에 서는 학습 화면 셋(문장 만들기 · 말하기 · 쓰기)의 route를 화면으로
// 옮깁니다. `render-screen.tsx`에서 떼어 둔 것은 그 파일이 300줄에 닿아서이고,
// `render-episode-intro.tsx` · `render-roleplay-screen.tsx`와 같은 갈래입니다.

import { SentenceOrderScreen } from "../screens/sentence-order/SentenceOrderScreen";
import { SpeakingScreen } from "../screens/speaking/SpeakingScreen";
import { WritingScreen } from "../screens/writing/WritingScreen";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

export function renderShellLearningScreen(
  screen: Extract<Screen, { name: "sentence-order" | "speaking" | "writing" }>,
  wiring: ScreenWiring,
) {
  const onFinish = (
    id: Parameters<ScreenWiring["onFinishLearning"]>[0],
    results: Parameters<ScreenWiring["onFinishLearning"]>[2],
  ) => wiring.onFinishLearning(id, screen.activityIndex, results);
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
        <WritingScreen stepId={screen.stepId} onExit={wiring.onExitLearning} onFinish={onFinish} />
      );
  }
}
