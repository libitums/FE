// 범용 학습 흐름은 명시적 다중 활동 픽스처로 검증합니다. 제품 튜토리얼은 별도 실물 테스트가 집니다.
vi.mock("../screens/journey-map/journey-map", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../screens/journey-map/journey-map")>()),
  ...(await import("./test-helpers/learning-route-fixture")),
}));

import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { journeySeedBefore } from "./test-helpers/journey-seed";
import type { JourneyStepId } from "../screens/journey-map/journey-map";
import { questionsForStep } from "../screens/listening/listening";
import { writingQuestionsForStep } from "../screens/writing/writing";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// `integration` 계층: App · 배정표 · 듣기 → 쓰기 · 학습 결과의 실제 결선을 봅니다(ADR-0006 D4).
// 쓰기가 배정된 스텝(길 묻기)을 걸어 **쓰기의 결과가 학습 결과까지 실려 가는가**를 봅니다.
//
// 판별은 학습 완료 제목으로 합니다 — 듣기를 모두 맞히면 실수는 쓰기에서만 나올 수 있어,
// `PERFECT LESSON!`과 `LESSON COMPLETE!`가 쓰기의 결과가 실렸는지를 가릅니다.

const completedIntros = ["tutorial-intro"] as const;
const writingStep: JourneyStepId = "directions";

afterEach(() => {
  vi.unstubAllGlobals();
});

// 길 묻기가 지금 스텝이 되도록 앞 넷을 끝낸 진행으로 부팅합니다. `renderSignedInApp`은 이미 세운
// `NativeModules` 대역(쓰기 호스트)을 지우지 않습니다.
async function renderWritingApp(): Promise<void> {
  await renderSignedInApp(
    <App
      completedEpisodeIntroIds={completedIntros}
      journeySeed={journeySeedBefore("directions")}
    />,
  );
}

// 쓰기 호스트 대역입니다. 견주기는 늘 같은 수를 돌려줍니다.
function stubWritingHost(coverage: string, stay: string): void {
  vi.stubGlobal("NativeModules", {
    HandwritingTraceModule: {
      guide: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({ status: "rendered", image: "aGVsbG8=", box: "0,0,1,1", font: "Stub" }),
      compare: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({
          status: "compared",
          coverage,
          stay,
          drawnArea: "10",
          guideArea: "10",
          font: "Stub",
          guideBox: "0,0,1,1",
        }),
    },
  });
}

function startStep(stepId: JourneyStepId): void {
  fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${stepId}`), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
}

function answerListeningCorrectly(stepId: JourneyStepId): void {
  for (const question of questionsForStep(stepId)) {
    fireEvent.tap(screen.getByTestId(`listening-choice-${question.answerIndex}`), {});
    fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
  }
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
}

// 쓰기의 문항을 전부 씁니다 — 음절마다 획 하나 · `확인하기` · `다음`입니다.
function writeAllQuestions(stepId: JourneyStepId): void {
  for (const question of writingQuestionsForStep(stepId)) {
    for (let index = 0; index < question.syllables.length; index += 1) {
      const surface = screen.getByTestId("drawing-surface");
      fireEvent.touchstart(surface, { touches: [{ x: 100, y: 100 }] });
      fireEvent.touchmove(surface, { touches: [{ x: 150, y: 150 }] });
      fireEvent.touchend(surface, {});
      fireEvent.tap(screen.getByTestId("learning-shell-action"), {}); // 확인하기
      fireEvent.tap(screen.getByTestId("learning-shell-action"), {}); // 다음
    }
  }
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {}); // 결과 보기
}

// IW1 — 쓰기가 배정된 스텝은 듣기를 마치면 평가가 아니라 쓰기가 섭니다. 배정표가 결선을 실제로
// 거치는지의 증인입니다.
test("[IW1] 길 묻기는 듣기를 마치면 쓰기가 서고, 첫 문항의 첫 음절부터 쓴다", async () => {
  await renderWritingApp();
  startStep(writingStep);
  answerListeningCorrectly(writingStep);

  expect(screen.getByTestId("writing-screen-content")).toHaveAttribute("data-phase", "writing");
  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 1 / 3");
  expect(screen.getByTestId("syllable-slots-slot-0")).toHaveAttribute("data-status", "current");
  expect(screen.queryByTestId("lesson-complete-screen-title")).not.toBeInTheDocument();
});

// IW2 — 호스트가 없으면 판정을 건너뛰고, 건너뛴 문항은 결과에 실리지 않습니다. 듣기를 모두
// 맞혔으므로 실수가 0이어야 합니다 — 쓰기가 오답으로 접혔다면 `LESSON COMPLETE!`가 섭니다.
test("[IW2] 호스트가 없으면 쓰기를 판정 없이 지나고, 학습 결과에 실수로 세지 않는다", async () => {
  await renderWritingApp();
  startStep(writingStep);
  answerListeningCorrectly(writingStep);
  writeAllQuestions(writingStep);

  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
});

// IW3 — 호스트가 낮은 수를 주면 쓰기가 오답으로 실려 학습 결과의 실수가 됩니다. IW2와 짝으로
// 「쓰기의 결과가 결과 화면까지 간다」를 짓습니다.
test("[IW3] 호스트가 문턱 아래의 수를 주면 쓰기가 오답으로 실려 학습 결과에 실수가 선다", async () => {
  stubWritingHost("0.2", "0.3");
  await renderWritingApp();
  startStep(writingStep);
  answerListeningCorrectly(writingStep);

  expect(screen.getByTestId("writing-canvas-guide")).toBeInTheDocument();
  writeAllQuestions(writingStep);

  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("LESSON COMPLETE!");
});

// IW4 — 문턱 위의 수면 정답으로 실려 실수가 0입니다.
test("[IW4] 호스트가 문턱 위의 수를 주면 쓰기가 정답으로 실린다", async () => {
  stubWritingHost("0.9", "0.9");
  await renderWritingApp();
  startStep(writingStep);
  answerListeningCorrectly(writingStep);
  writeAllQuestions(writingStep);

  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
});
