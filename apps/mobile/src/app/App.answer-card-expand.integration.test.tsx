import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, screen } from "@lynx-js/react/testing-library";

import { bootItemAudioApp } from "./test-helpers/item-audio-harness";
import { resetApp, tapId, tapNode } from "./test-helpers/episode-format-harness";

// `integration` 계층: 앱 전체 트리에서 듣기 문항에 답하면 제시 카드가 펼쳐진다(ADR-0212, 시안 C안).
// 움직임 정책은 호스트 globalProps `reducedMotion` → 앱 루트 `MotionProvider` → 펼침 상자로 이어집니다.
// 대역은 경계뿐입니다(`NativeModules` · `fetch` · env · 호스트의 `layoutchange`). 계획 · 화면 · 결선은 실물입니다.

const u00 = "u00-tutorial";
const afterS1 = { [u00]: ["intro", "S1"] };

function setReducedMotion(reduced: boolean | undefined): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps =
    reduced === undefined
      ? undefined
      : { safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 }, reducedMotion: reduced };
}

afterEach(() => {
  setReducedMotion(undefined);
  resetApp();
});

const reveal = () => screen.queryByTestId("listening-card-reveal");

test("AE1. 듣기 문항에 답하면 카드가 재는 중 → 잰 높이까지 펼침 → 높이 auto로 선다", async () => {
  await bootItemAudioApp({ progress: afterS1 });
  tapNode(u00, "S2");
  expect(reveal()).not.toBeInTheDocument();
  vi.useFakeTimers();

  tapId("ui-lynx-option-selector-item-choice-1");

  expect(reveal()).toHaveAttribute("data-phase", "measuring");
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent("진짜요? 감사합니다!");

  act(() => {
    fireEvent.layoutchange(screen.getByTestId("listening-card-reveal-content"), {
      detail: { height: 112 },
    });
  });
  expect(reveal()).toHaveAttribute("data-phase", "expanding");
  expect(reveal()?.getAttribute("style") ?? "").toMatch(/height:\s*112px/);

  act(() => {
    vi.advanceTimersByTime(400);
  });
  expect(reveal()).toHaveAttribute("data-phase", "open");
  expect(reveal()?.getAttribute("style") ?? "").not.toContain("height");
});

test("AE2. 호스트가 움직임 줄이기를 넘기면 답하자마자 열림이다", async () => {
  setReducedMotion(true);
  await bootItemAudioApp({ progress: afterS1 });
  tapNode(u00, "S2");

  tapId("ui-lynx-option-selector-item-choice-1");

  expect(reveal()).toHaveAttribute("data-phase", "open");
  expect(screen.getByTestId("listening-prompt-romanization")).toBeInTheDocument();
});
