import type { ReactNode } from "@lynx-js/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MotionProvider, type Motion } from "@libitums/ui-lynx/motion";

import type { SessionOptions } from "../../lib/session-options";
import { PlaybackPrompt } from "./ListeningPrompt.test-support";

// `ui` 계층: 듣기 제시 카드가 답하면 펼쳐진다(ADR-0212, 시안 C안). 구분선 · 한글 · 로마자가 펼침 상자 안에
// 순서 0 · 1 · 2로 서고, 대본을 켜 둔 세션 · 움직임 줄이기에서는 움직이지 않습니다.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function options(showTranscript: boolean): SessionOptions {
  return {
    "auto-play-audio": false,
    "show-transcript": showTranscript,
    "show-choice-romanization": true,
    vibration: true,
  };
}

function prompt(revealed: boolean, showTranscript = false, motion: Motion = "standard"): ReactNode {
  return (
    <MotionProvider motion={motion}>
      <PlaybackPrompt
        text="진짜요? 감사합니다!"
        romanization="jinjjayo? gamsahamnida!"
        audioSource="u00-tutorial/d-04"
        sessionOptions={options(showTranscript)}
        revealed={revealed}
      />
    </MotionProvider>
  );
}

const reveal = () => screen.queryByTestId("listening-card-reveal");
const itemClassOf = (testId: string) =>
  screen.getByTestId(testId).parentElement?.getAttribute("class") ?? "";

test("LE1. 답하기 전에는 펼침 상자가 없다", () => {
  render(prompt(false));

  expect(reveal()).not.toBeInTheDocument();
});

test("LE2. 답하면 구분선 · 한글 · 로마자가 펼침 상자 안에 0 · 1 · 2 순서로 펼쳐진다", () => {
  const view = render(prompt(false));
  view.rerender(prompt(true));
  expect(reveal()).toHaveAttribute("data-phase", "measuring");

  act(() => {
    fireEvent.layoutchange(screen.getByTestId("listening-card-reveal-content"), {
      detail: { height: 96 },
    });
  });

  expect(reveal()).toHaveAttribute("data-phase", "expanding");
  expect(reveal()?.getAttribute("style") ?? "").toMatch(/height:\s*96px/);
  expect(itemClassOf("listening-prompt-divider")).toContain("reveal-on-answer-item-0");
  expect(itemClassOf("listening-prompt-text")).toContain("reveal-on-answer-item-1");
  expect(itemClassOf("listening-prompt-romanization")).toContain("reveal-on-answer-item-2");

  act(() => {
    vi.advanceTimersByTime(400);
  });
  expect(reveal()).toHaveAttribute("data-phase", "open");
});

test("LE3. 대본을 켜 둔 세션은 처음부터 열려 있고 답해도 움직이지 않는다", () => {
  const view = render(prompt(false, true));
  expect(reveal()).toHaveAttribute("data-phase", "open");

  view.rerender(prompt(true, true));

  expect(reveal()).toHaveAttribute("data-phase", "open");
  expect(itemClassOf("listening-prompt-text")).toBe("reveal-on-answer-item");
});

test("LE4. 움직임 줄이기 — 답하면 바로 열림", () => {
  const view = render(prompt(false, false, "reduced"));
  view.rerender(prompt(true, false, "reduced"));

  expect(reveal()).toHaveAttribute("data-phase", "open");
  expect(reveal()?.getAttribute("style") ?? "").not.toContain("height");
});
