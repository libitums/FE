import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";
import type { LearningShellProps } from "./learning-shell-props";

// `ui` 계층: 판정 배지 옆 다시 듣기 스피커(ADR-0189) — 배지가 설 때만, 저절로 넘어가는 동안은 없다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void) => string>(() => "started"),
  stopAudio: vi.fn<() => void>(),
}));
vi.mock("../../lib/audio", () => audio);

const ECHO = "https://cdn/audio/u01-water/echo.m4a";

function renderShell(overrides: Partial<LearningShellProps> = {}) {
  return render(
    <LearningShell
      form="sentence-order"
      questionIndex={0}
      questionCount={4}
      instruction="Put the words in order."
      onExit={() => {}}
      card={<text>카드 안</text>}
      actionLabel="Next"
      onAction={() => {}}
      {...overrides}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("LR1. 배지와 다시 듣기가 함께 서고, 누르면 정답 문장을 다시 내며 onReplayed를 부른다", () => {
  const onReplayed = vi.fn();
  renderShell({
    verdict: "correct",
    verdictReplay: { replay: { kind: "available", source: ECHO }, onReplayed },
  });

  const verdict = screen.getByTestId("learning-shell-verdict");
  const replay = within(verdict).getByTestId("learning-shell-verdict-replay");
  // 읽는 순서 = 보이는 순서: 배지 → 스피커.
  const ids = [...verdict.querySelectorAll("[data-testid]")].map((node) =>
    node.getAttribute("data-testid"),
  );
  expect(ids.indexOf("answer-verdict")).toBeLessThan(ids.indexOf("learning-shell-verdict-replay"));
  expect(replay.getAttribute("data-state")).toBe("available");
  fireEvent.tap(within(replay).getByTestId("ui-lynx-round-button"), {});

  expect(audio.playAudio.mock.calls.map((call) => call[0])).toContain(ECHO);
  expect(onReplayed).toHaveBeenCalledTimes(1);
});

test("LR2. 정답 음성이 없으면 배지 옆 회색 스피커", () => {
  renderShell({ verdict: "incorrect", verdictReplay: { replay: { kind: "unavailable" } } });

  expect(screen.getByTestId("learning-shell-verdict-replay").getAttribute("data-state")).toBe(
    "unavailable",
  );
});

test("LR3. 배지가 없으면(판정 전) 다시 듣기도 없다", () => {
  renderShell({ verdictReplay: { replay: { kind: "available", source: ECHO } } });

  expect(screen.queryByTestId("learning-shell-verdict-replay")).toBeNull();
});

test("LR4. 저절로 넘어가는 동안은 그리지 않는다 — 화면 전체가 넘김 단추라 닿지 않는다", () => {
  renderShell({
    verdict: "correct",
    verdictReplay: { replay: { kind: "available", source: ECHO } },
    advance: { label: "Continue", run: () => {}, delayMs: 2500 },
    actionLabel: undefined,
    onAction: undefined,
  });

  expect(screen.getByTestId("learning-shell-verdict")).toBeTruthy();
  expect(screen.queryByTestId("learning-shell-verdict-replay")).toBeNull();
});
