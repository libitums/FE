import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { writingPassCriterion } from "../../lib/writing-judge";
import type { EpisodeFinalVisualNovelTest } from "./episode-final.contract";
import { episodeFinalAdvanceDelayMs } from "./episode-final";
import { EpisodeFinalScreen } from "./EpisodeFinalScreen";

// `ui` 계층: 최종 테스트의 쓰기 문항(Figma 79-6378)을 봅니다(ADR-0006 D4). 문항은 이 파일의
// 대역입니다 — 쓰기 하나 뒤에 낱말 고르기 하나를 둬, 쓰기를 마치면 **다음 문항으로 곧장**
// 넘어가는지와 결과가 이어 실리는지를 봅니다. 쓰기 흐름의 자세한 갈래(다시 쓰기 · 지우기)는
// 공용 핵심이라 `WritingScreen.ui.test.tsx`가 봅니다.

const finalTest: EpisodeFinalVisualNovelTest = {
  format: "visual-novel",
  unitId: "tutorial-final-test",
  questions: [
    {
      kind: "writing",
      id: "write",
      before: "이 화장품 찾아",
      syllables: ["주", "세"],
      after: ".",
      translation: "Please help me find this cosmetic product.",
      passCriterion: writingPassCriterion,
    },
    {
      kind: "word-choice",
      id: "choose",
      speakerName: "나",
      before: "어서 ",
      after: "!",
      translation: "Welcome!",
      options: ["오세요", "주세요", "가세요"],
      answerIndex: 0,
    },
  ],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stubHost(coverage: string, stay: string): void {
  vi.stubGlobal("NativeModules", {
    HandwritingTraceModule: {
      guide: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({ status: "rendered", image: "aGVsbG8=", box: "0,0,1,1", font: "Stub" }),
      compare: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({
          status: "compared",
          coverage,
          stay,
          drawnArea: "1",
          guideArea: "1",
          font: "Stub",
          guideBox: "0,0,1,1",
        }),
    },
  });
}

function renderFinal(test: EpisodeFinalVisualNovelTest = finalTest) {
  vi.useFakeTimers();
  const props = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    episodeLabel: "Episode 0.",
    test,
    onFinish: vi.fn<(results: readonly AnswerResult[]) => void>(),
    onExit: vi.fn<() => void>(),
  };
  render(<EpisodeFinalScreen {...props} />);
  return props;
}

function draw(): void {
  const surface = screen.getByTestId("drawing-surface");
  fireEvent.touchstart(surface, { touches: [{ x: 10, y: 10 }] });
  fireEvent.touchend(surface, {});
}

const actionButton = () =>
  within(screen.getByTestId("episode-final-screen-writing-action")).getByTestId("ui-lynx-button");

// EFW1 — 디자인의 자리: `Write` 표식 · 빈칸 문장 · 음절 칸 · 장면 크기의 캔버스.
test("[EFW1] 쓰기 문항은 Write 표식 · 빈칸 문장 · 음절 칸 · 캔버스로 서고, 쓰기 전에는 버튼이 없다", () => {
  stubHost("0.9", "0.9");
  renderFinal();

  const panel = screen.getByTestId("episode-final-screen-writing");
  expect(panel).toHaveTextContent("Write");
  expect(screen.getByTestId("writing-prompt").textContent).toBe("이 화장품 찾아 _ _.");
  expect(screen.getByTestId("syllable-slots-slot-0")).toHaveAttribute("data-status", "current");
  expect(screen.getByTestId("drawing-surface").getAttribute("class")).toBe(
    "drawing-surface writing-canvas-stage",
  );
  expect(screen.getByTestId("writing-canvas-guide")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-final-screen-writing-action")).not.toBeInTheDocument();
});

// EFW2 — 음절마다 Check → 판정 → Next이고, 판정 뒤 저절로 넘어가지 않습니다(학습자가 다시 쓸지
// 고릅니다). 마지막 음절의 Next가 곧 다음 문항입니다.
test("[EFW2] Check로 판정이 서고 저절로 넘어가지 않으며, 마지막 음절의 Next가 다음 문항을 연다", () => {
  stubHost("0.9", "0.9");
  const props = renderFinal();

  draw();
  expect(actionButton()).toHaveAttribute("accessibility-label", "Check");
  fireEvent.tap(actionButton(), {});
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(actionButton()).toHaveAttribute("accessibility-label", "Next");

  act(() => {
    vi.advanceTimersByTime(episodeFinalAdvanceDelayMs * 2);
  });
  expect(screen.getByTestId("episode-final-screen-writing")).toBeInTheDocument();

  fireEvent.tap(actionButton(), {});
  expect(screen.getByTestId("syllable-slots-slot-1")).toHaveAttribute("data-status", "current");
  draw();
  fireEvent.tap(actionButton(), {});
  fireEvent.tap(actionButton(), {});

  expect(screen.queryByTestId("episode-final-screen-writing")).not.toBeInTheDocument();
  expect(screen.getByTestId("episode-final-screen-word-choice")).toBeInTheDocument();

  // 쓰기의 결과(정답)가 다음 문항의 결과 앞에 이어 실립니다.
  fireEvent.tap(screen.getByTestId("episode-final-screen-option-1"), {});
  act(() => {
    vi.advanceTimersByTime(episodeFinalAdvanceDelayMs);
  });
  expect(props.onFinish).toHaveBeenCalledWith(["correct", "incorrect"]);
});

// EFW3 — 호스트가 없으면 판정 없이 넘어가고, 그 문항은 결과에 싣지 않습니다. 쓰기가 마지막
// 문항이면 그 Next가 곧 onFinish입니다.
test("[EFW3] 호스트가 없으면 글자 안내 · 잴 수 없음으로 지나고, 마지막 문항이면 결과 없이 끝낸다", () => {
  const props = renderFinal({ ...finalTest, questions: [finalTest.questions[0]] });

  expect(screen.getByTestId("writing-canvas-guide-text").textContent).toBe("주");
  for (let index = 0; index < 2; index += 1) {
    draw();
    fireEvent.tap(actionButton(), {});
    expect(screen.getByTestId("writing-canvas-notice")).toBeInTheDocument();
    fireEvent.tap(actionButton(), {});
  }

  expect(props.onFinish).toHaveBeenCalledWith([]);
});

// EFW4 — 쓰기 문항도 다른 문항처럼 장면 위 패널로 섭니다(흰 시트를 깔지 않습니다). 빈칸 앞 글자가
// 어두운 패널 위에서 읽히도록 문장이 장면용 모양으로 섭니다 — 색은 `ui`가 못 보므로 클래스
// 문자열까지만 봅니다.
test("[EFW4] 쓰기 문항은 장면 위 패널로 서고, 빈칸 문장은 장면용 모양이다", () => {
  renderFinal();

  expect(screen.getByTestId("episode-final-screen-writing")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-final-screen-sheet")).not.toBeInTheDocument();
  expect(screen.getByTestId("writing-prompt").getAttribute("class")).toBe(
    "writing-prompt writing-prompt-scene",
  );
});
