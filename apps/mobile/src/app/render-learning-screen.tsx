// `LearningShell` 위에 서는 학습 화면 둘(문장 만들기 · 말하기)의 route를 화면으로 옮깁니다.
// `render-screen.tsx`에서 떼어 둔 것은 그 파일이 300줄에 닿아서이고,
// `render-episode-intro.tsx` · `render-roleplay-screen.tsx`와 같은 갈래입니다.

import { SentenceOrderScreen } from "../screens/sentence-order/SentenceOrderScreen";
import { SpeakingScreen } from "../screens/speaking/SpeakingScreen";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

export function renderShellLearningScreen(
  screen: Extract<Screen, { name: "sentence-order" | "speaking" }>,
  wiring: ScreenWiring,
) {
  const onFinish = (
    id: Parameters<ScreenWiring["onFinishLearning"]>[0],
    results: Parameters<ScreenWiring["onFinishLearning"]>[2],
  ) => wiring.onFinishLearning(id, screen.activityIndex, results);
  return screen.name === "sentence-order" ? (
    <SentenceOrderScreen
      stepId={screen.stepId}
      onExit={wiring.onExitLearning}
      onFinish={onFinish}
    />
  ) : (
    <SpeakingScreen stepId={screen.stepId} onExit={wiring.onExitLearning} onFinish={onFinish} />
  );
}
