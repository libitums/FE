import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { LettersRecommendDialog } from "./LettersRecommendDialog";
import { lettersTestIds as ids } from "./letters.contract";

// `ui` 계층: 여정맵 Letters 추천 대화상자(ADR-0169) — 문구 두 갈래 · ㄱ + ㅏ = 가 그림 · 단추 둘 · 시스템 뒤로.

afterEach(() => {
  cleanup();
});

function mount(reason: "hard" | "failed") {
  const onLearn = vi.fn();
  const onLater = vi.fn();
  render(<LettersRecommendDialog reason={reason} onLearn={onLearn} onLater={onLater} />);
  return { onLearn, onLater };
}

test("RD1. 어렵게 끝낸 레슨 뒤 문구", () => {
  mount("hard");
  expect(screen.getByTestId("ui-lynx-dialog-title").textContent).toBe("Want to learn the letters?");
  expect(screen.getByTestId("ui-lynx-dialog-description").textContent).toContain(
    "That lesson had some tricky reading.",
  );
});

test("RD2. 실패 · 나간 레슨 뒤 문구", () => {
  mount("failed");
  expect(screen.getByTestId("ui-lynx-dialog-title").textContent).toBe(
    "Reading the blocks feels hard?",
  );
});

test("RD3. 제목 위 그림 ㄱ + ㅏ = 가(낭독에서 가림)", () => {
  mount("hard");
  const art = screen.getByTestId("letters-recommend-art");
  expect(art.textContent?.replace(/[\sa-z]/g, "")).toContain("ㄱ+ㅏ=가");
  expect(art).toHaveAttribute("accessibility-elements-hidden", "true");
});

test("RD4. Learn the letters · Keep going", () => {
  const { onLearn, onLater } = mount("hard");
  expect(screen.getByTestId(ids.recommend).textContent).toContain("Learn the letters");
  fireEvent.tap(
    screen
      .getByTestId("ui-lynx-dialog-action-learn")
      .querySelector('[data-testid="ui-lynx-button"]')!,
    {},
  );
  expect(onLearn).toHaveBeenCalledTimes(1);
  fireEvent.tap(
    screen
      .getByTestId("ui-lynx-dialog-action-later")
      .querySelector('[data-testid="ui-lynx-button"]')!,
    {},
  );
  expect(onLater).toHaveBeenCalledExactlyOnceWith("keep_going");
});

test("RD5. 시스템 뒤로는 닫기(Keep going과 같은 길이 아니라 back)", () => {
  const { onLater } = mount("failed");
  backHandlers.runTop();
  expect(onLater).toHaveBeenCalledWith("back");
});
