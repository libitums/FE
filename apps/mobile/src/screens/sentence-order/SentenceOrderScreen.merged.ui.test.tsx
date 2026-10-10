import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { guideRoots, stubGuideStorage } from "../../lib/learning-item-guide.storage.test-support";
import { learningShellScrollId } from "../learning/learning-shell-scroll";
import { SentenceOrderScreen } from "./SentenceOrderScreen";

// `ui` 계층: 문장 만들기에서 학습 문항 안내가 떠 있는 채로 껍데기가 합쳐져도(learning-shell-large-font)
// 안내 · 루트 가림 · 조각 이동이 그대로인지 봅니다(SO1). 합칠 때 무대와 작업 영역이 한 번 다시
// 서므로, 화면이 들고 있는 상태(안내 · 놓은 조각)가 그 사이에 살아 있어야 합니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function reportHeight(height: number): void {
  const ref = lynx.createSelectorQuery().select(`#${learningShellScrollId}`);
  act(() => {
    fireEvent.layoutchange(ref as unknown as Element, { detail: { height } });
  });
}

test("[SO1] 안내가 떠 있는 채로 합쳐져도 안내 · 가림이 그대로이고, 닫은 뒤 흐름 안의 조각이 무대의 답 줄에 놓인다", () => {
  stubGuideStorage();
  render(<SentenceOrderScreen stepId="greeting" onExit={() => {}} onFinish={() => {}} />);
  expect(guideRoots()).toHaveLength(1);

  reportHeight(0);

  // 선행: 합친 구조가 섰습니다.
  const mergedFlow = screen.queryByTestId("learning-shell-flow");
  expect(mergedFlow).not.toBeNull();
  // 합친 뒤에도 안내는 하나 그대로이고 루트는 낭독에서 가려져 있습니다.
  expect(guideRoots()).toHaveLength(1);
  expect(screen.getByTestId("learning-item-guide-sentence-order")).toBeInTheDocument();
  expect(screen.getByTestId("learning-shell")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );

  fireEvent.tap(screen.getByTestId("learning-item-guide-sentence-order"), {
    eventType: "catchEvent",
  });

  expect(screen.queryByTestId("learning-item-guide-sentence-order")).toBeNull();
  expect(screen.getByTestId("learning-shell")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );

  // 창고 조각이 흐름 안에 있고, 누르면 무대의 답 줄로 옮겨 갑니다.
  const bank = within(mergedFlow as HTMLElement).getByTestId("sentence-order-screen-bank");
  const chip = within(bank).getByTestId("sentence-order-chip-0");
  fireEvent.tap(chip, {});

  const sentence = within(screen.getByTestId("learning-shell-stage")).getByTestId(
    "sentence-order-screen-sentence",
  );
  expect(within(sentence).getByTestId("sentence-order-chip-0")).toHaveAttribute("data-placed", "1");
});

// SO2 — 답하면 맨 위로 (r03). `greeting`은 문항이 하나(조각 하나)라 `Next`는 다음 문항이 아니라
// 완료로 가는 버튼입니다. 그때도 호출 수는 누름 1 + 완료 효과 1 = 2라 계약 표(누름 1 + 문항 변경 1)와
// 같고, 누적은 Check 1 + 2 = 3입니다.
test("[SO2] 합친 흐름에서 칸을 채우는 동안은 보내지 않고, Check 뒤 한 번 · Next 뒤 누적 세 번이다", () => {
  stubGuideStorage({ seen: ["sentence-order"] });
  render(<SentenceOrderScreen stepId="greeting" onExit={() => {}} onFinish={() => {}} />);
  expect(guideRoots()).toHaveLength(0);
  const ref = lynx.createSelectorQuery().select(`#${learningShellScrollId}`);
  act(() => {
    fireEvent.layoutchange(ref as unknown as Element, { detail: { height: 0 } });
  });
  expect(screen.queryByTestId("learning-shell-flow")).not.toBeNull();

  const scrollTos: string[] = [];
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: (selector: string) => ({
          invoke: (options: { method: string }) => ({
            exec: () => {
              if (options.method === "scrollTo") scrollTos.push(selector);
            },
          }),
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );

  try {
    expect(screen.queryByTestId("learning-shell-action")).toBeNull();
    fireEvent.tap(screen.getByTestId("sentence-order-chip-0"), {});
    // 칸이 다 차 `Check`가 섰습니다 — 버튼이 서는 것만으로는 보내지 않습니다.
    expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
      "accessibility-label",
      "Check",
    );
    expect(scrollTos).toHaveLength(0);

    fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

    expect(scrollTos).toEqual([`#${learningShellScrollId}`]);
    const verdict = within(screen.getByTestId("learning-shell-stage")).getByTestId(
      "answer-verdict",
    );
    expect(verdict).toBeInTheDocument();

    fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

    expect(screen.getByTestId("sentence-order-screen-complete")).toBeInTheDocument();
    expect(scrollTos).toHaveLength(3);
  } finally {
    vi.restoreAllMocks();
  }
});
