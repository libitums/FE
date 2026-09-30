import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { writingPassCriterion } from "../../lib/writing-judge";
import type { WritingQuestion } from "../../lib/writing-session";
import type { JourneyStepId } from "../journey-map/journey-map";
import { WritingScreen } from "./WritingScreen";

// `ui` 계층: 실제 화면을 렌더하고 상태 · 상호작용을 봅니다(ADR-0006 D4). 공용 핵심(리듀서 ·
// 판정 · 캔버스)은 대역하지 않습니다 — 화면이 그것을 실제로 부르는지가 이 파일이 보는 것의
// 절반입니다.
//
// **문항 값에 기대지 않습니다** — `writingQuestionsForStep` 하나만 부분 대역하고 자기 픽스처를
// 씁니다(`WordChoiceScreen.ui.test.tsx`와 같은 형태). 문항마다 음절 수를 다르게 줘 음절 수가
// 계약이 아니라는 것을 테스트가 실물로 집니다.

const QUESTIONS: readonly WritingQuestion[] = [
  {
    id: "one",
    before: "앞 ",
    syllables: ["가", "나"],
    after: ".",
    translation: "First.",
    passCriterion: writingPassCriterion,
  },
  {
    id: "two",
    before: "",
    syllables: ["다"],
    after: "!",
    translation: "Second.",
    passCriterion: writingPassCriterion,
  },
];

vi.mock("./writing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./writing")>();
  return {
    ...actual,
    writingQuestionsForStep: (id: JourneyStepId) => (id === "directions" ? QUESTIONS : []),
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

type HostCalls = { guide: unknown[]; compare: unknown[] };

// 쓰기 호스트 대역입니다. 견주기의 답은 `scores`를 차례로 씁니다.
function stubHost(scores: readonly (readonly [string, string])[]): HostCalls {
  const calls: HostCalls = { guide: [], compare: [] };
  let next = 0;
  vi.stubGlobal("NativeModules", {
    HandwritingTraceModule: {
      guide: (args: unknown, callback: (payload: unknown) => void) => {
        calls.guide.push(args);
        callback({ status: "rendered", image: "aGVsbG8=", box: "0,0,1,1", font: "Stub" });
      },
      compare: (args: unknown, callback: (payload: unknown) => void) => {
        calls.compare.push(args);
        const [coverage, stay] = scores[next] ?? ["0", "0"];
        next += 1;
        callback({
          status: "compared",
          coverage,
          stay,
          drawnArea: "1",
          guideArea: "1",
          font: "Stub",
          guideBox: "0,0,1,1",
        });
      },
    },
  });
  return calls;
}

function renderScreen(stepId: JourneyStepId = "directions") {
  const props = {
    stepId,
    onExit: vi.fn<() => void>(),
    onFinish: vi.fn<(id: JourneyStepId, results: readonly AnswerResult[]) => void>(),
  };
  render(<WritingScreen {...props} />);
  return props;
}

function draw(): void {
  const surface = screen.getByTestId("drawing-surface");
  fireEvent.touchstart(surface, { touches: [{ x: 10, y: 10 }] });
  fireEvent.touchmove(surface, { touches: [{ x: 30, y: 30 }] });
  fireEvent.touchend(surface, {});
}

const action = () => screen.getByTestId("learning-shell-action");
const phase = () => screen.getByTestId("writing-screen-content").getAttribute("data-phase");

// WSC1 — 빈 판에는 버튼이 없습니다. 누를 수 없는 버튼을 두지 않습니다.
test("[WSC1] 첫 음절의 흐린 안내가 깔리고, 쓰기 전에는 아래 버튼이 없다", () => {
  const calls = stubHost([]);
  renderScreen();

  expect(screen.getByTestId("writing-canvas-guide")).toBeInTheDocument();
  expect(calls.guide).toEqual([expect.objectContaining({ glyph: "가", width: 340, height: 200 })]);
  expect(screen.getByTestId("syllable-slots-slot-0")).toHaveAttribute("data-status", "current");
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
});

// WSC2 — 견주기는 안내와 같은 요청 모양에 쓴 획을 싣습니다.
test("[WSC2] 쓰면 확인하기가 서고, 누르면 쓴 획으로 견주고 판정 배지가 선다 — 안내는 걷힌다", () => {
  const calls = stubHost([["0.9", "0.9"]]);
  renderScreen();
  draw();

  expect(action()).toHaveAttribute("accessibility-label", "확인하기");
  fireEvent.tap(action(), {});

  expect(calls.compare).toEqual([
    expect.objectContaining({
      glyph: "가",
      strokes: [
        [
          { x: 10, y: 10 },
          { x: 30, y: 30 },
        ],
      ],
    }),
  ]);
  expect(phase()).toBe("judged");
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  // 판정은 형제 학습형처럼 무대 카드에 섭니다.
  expect(screen.getByTestId("learning-shell-stage")).toContainElement(
    screen.getByTestId("answer-verdict"),
  );
  expect(screen.queryByTestId("writing-canvas-guide")).not.toBeInTheDocument();
  expect(action()).toHaveAttribute("accessibility-label", "다음");
});

// WSC3 — 틀리면 캔버스의 `다시 쓰기`로 같은 음절을 빈 판에서 다시 씁니다.
test("[WSC3] 틀리면 다시 쓰기가 서고, 누르면 같은 음절의 빈 판으로 돌아가 안내가 다시 선다", () => {
  stubHost([["0.1", "0.1"]]);
  renderScreen();
  draw();
  fireEvent.tap(action(), {});
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");

  const retry = within(screen.getByTestId("writing-canvas-erase")).getByTestId(
    "ui-lynx-round-button",
  );
  expect(retry).toHaveAttribute("accessibility-label", "다시 쓰기");
  fireEvent.tap(retry, {});

  expect(phase()).toBe("writing");
  expect(screen.getByTestId("drawing-surface")).toHaveAttribute("data-strokes", "0");
  expect(screen.getByTestId("writing-canvas-guide")).toBeInTheDocument();
  expect(screen.getByTestId("syllable-slots-slot-0")).toHaveAttribute("data-status", "current");
});

// WSC4 — 쓰는 중에는 캔버스의 `지우기`가 판을 비웁니다.
test("[WSC4] 쓰는 중에 지우기를 누르면 판이 비고 확인하기가 걷힌다", () => {
  stubHost([]);
  renderScreen();
  draw();
  fireEvent.tap(
    within(screen.getByTestId("writing-canvas-erase")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.getByTestId("drawing-surface")).toHaveAttribute("data-strokes", "0");
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
});

// WSC5 — 다음은 칸을 채우고 다음 음절로 갑니다. 마지막 음절 뒤에는 다음 문항입니다. 결과는
// 문항 단위이고, 끝에서 결과 보기가 그것을 싣습니다.
test("[WSC5] 음절을 모두 쓰면 다음 문항으로, 끝에서 결과 보기가 문항별 결과를 싣는다", () => {
  stubHost([
    ["0.9", "0.9"],
    ["0.1", "0.9"],
    ["0.9", "0.9"],
  ]);
  const props = renderScreen();

  draw();
  fireEvent.tap(action(), {}); // 확인하기 — 가: 정답
  fireEvent.tap(action(), {}); // 다음
  expect(screen.getByTestId("syllable-slots-slot-0")).toHaveAttribute("data-status", "done");
  expect(screen.getByTestId("syllable-slots-slot-1")).toHaveAttribute("data-status", "current");

  draw();
  fireEvent.tap(action(), {}); // 나: 오답
  fireEvent.tap(action(), {}); // 다음 — 첫 문항 끝
  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 2 / 2");
  expect(screen.getByTestId("writing-prompt").textContent).toBe("_!");

  draw();
  fireEvent.tap(action(), {}); // 다: 정답
  fireEvent.tap(action(), {}); // 다음 — 둘째 문항 끝

  expect(screen.getByTestId("writing-screen-complete")).toBeInTheDocument();
  fireEvent.tap(action(), {}); // 결과 보기
  expect(props.onFinish).toHaveBeenCalledWith("directions", ["incorrect", "correct"]);
});

// WSC6 — 호스트가 없으면 안내는 글자로 대신 서고, 판정 없이 넘어가며 결과에 싣지 않습니다.
test("[WSC6] 호스트가 없으면 글자 안내가 서고, 확인하기가 잴 수 없음으로 가 결과 없이 넘어간다", () => {
  const props = renderScreen();

  expect(screen.getByTestId("writing-canvas-guide-text").textContent).toBe("가");
  for (let index = 0; index < 3; index += 1) {
    draw();
    fireEvent.tap(action(), {});
    expect(phase()).toBe("unmeasurable");
    expect(screen.getByTestId("writing-canvas-notice")).toBeInTheDocument();
    expect(screen.queryByTestId("answer-verdict")).not.toBeInTheDocument();
    fireEvent.tap(action(), {});
  }

  fireEvent.tap(action(), {}); // 결과 보기
  expect(props.onFinish).toHaveBeenCalledWith("directions", []);
});

// WSC7 — 문항이 없는 스텝은 마운트가 곧 완료입니다.
test("[WSC7] 문항이 없는 스텝은 곧장 완료이고 결과 보기가 빈 결과를 싣는다", () => {
  const props = renderScreen("greeting");

  expect(screen.getByTestId("writing-screen-complete")).toBeInTheDocument();
  expect(screen.queryByTestId("writing-canvas")).not.toBeInTheDocument();
  fireEvent.tap(action(), {});
  expect(props.onFinish).toHaveBeenCalledWith("greeting", []);
});

// WSC8 — 형제 학습형과 같은 배치입니다: 카드에 문장 · 음절 칸, 카드 아래 작업 영역에 캔버스.
// 작업 영역은 스크롤을 끕니다 — 그리기 표면과 스크롤이 제스처를 다투지 않게 합니다.
test("[WSC8] 문장 · 음절 칸은 무대 카드에, 캔버스는 스크롤을 끈 작업 영역에 선다", () => {
  renderScreen();

  const stage = screen.getByTestId("learning-shell-stage");
  expect(stage).toContainElement(screen.getByTestId("writing-prompt"));
  expect(stage).toContainElement(screen.getByTestId("syllable-slots"));
  expect(stage).not.toContainElement(screen.getByTestId("writing-canvas"));

  const scroll = screen.getByTestId("learning-shell-scroll");
  expect(scroll).toContainElement(screen.getByTestId("writing-canvas"));
  expect(scroll).toHaveAttribute("enable-scroll", "false");
});
