import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { JourneyStatModal } from "./JourneyStatModal";
import type { JourneyStatKind } from "./journey-stat";

// `ui` 계층: 지표 모달의 움직임(ADR-0064 — 시안 ②C). 등장은 늘 서고, 반복 층(불꽃 숨 · 트로피 빛 · 운석 둥실)은
// 움직임 표준에서만 섭니다. 곡선 · 반복의 체감은 e2e가 봅니다.

afterEach(() => {
  cleanup();
});

const modal = (kind: JourneyStatKind) => (
  <JourneyStatModal kind={kind} value={4} track={{ completedCount: 4 }} onClose={vi.fn()} />
);
const reduced = (element: ReactNode) => <MotionProvider motion="reduced">{element}</MotionProvider>;
const count = (selector: string) => document.querySelectorAll(selector).length;

test("JSM-M1. 열리면 큰 숫자 · 제목이 커지며 나타난다 (줄이기면 페이드)", () => {
  render(modal("streak"));
  expect(screen.getByTestId("journey-stat-modal-hero").getAttribute("class")).toBe(
    "journey-stat-modal-hero journey-stat-modal-hero-enter",
  );
  cleanup();

  render(reduced(modal("streak")));
  expect(screen.getByTestId("journey-stat-modal-hero").getAttribute("class")).toBe(
    "journey-stat-modal-hero journey-stat-modal-hero-fade",
  );
});

test("JSM-M2. 연속 학습: 불꽃이 일렁이고 숨 쉬며 운석 셋이 들어와 둥실 뜬다", () => {
  render(modal("streak"));

  expect(count(".journey-stat-modal-fire-flicker")).toBe(1);
  expect(count(".journey-stat-modal-fire-breathe")).toBe(1);
  for (const slot of ["a", "b", "c"]) {
    expect(count(`.journey-stat-modal-meteor-in-${slot}`)).toBe(1);
    expect(count(`.journey-stat-modal-meteor-bob-${slot}`)).toBe(1);
  }
});

test("JSM-M3. 트로피: 한 번 흔들리고 빛 층이 선다", () => {
  render(modal("trophy"));

  expect(count(".journey-stat-modal-trophy-wobble")).toBe(1);
  expect(count(".journey-stat-modal-trophy-glint")).toBe(1);
});

test("JSM-M4. 가장 최근 칸 하나만 체크가 톡 찍힌다", () => {
  render(modal("trophy"));

  const latest = document.querySelectorAll(".journey-stat-modal-tick-latest");
  expect(latest).toHaveLength(1);
  const boxes = Array.from(document.querySelectorAll(".journey-stat-modal-tick-box"));
  expect(boxes.at(-1)).toBe(latest[0]);
});

test.each(["streak", "trophy"] as const)(
  "JSM-M5. 움직임 줄이기(%s)에는 반복 층이 하나도 서지 않는다",
  (kind) => {
    render(reduced(modal(kind)));

    for (const selector of [
      ".journey-stat-modal-fire-flicker",
      ".journey-stat-modal-fire-breathe",
      ".journey-stat-modal-trophy-wobble",
      ".journey-stat-modal-trophy-glint",
      "[class*='journey-stat-modal-meteor-in-']",
      "[class*='journey-stat-modal-meteor-bob-']",
      ".journey-stat-modal-tick-latest",
    ]) {
      expect(count(selector)).toBe(0);
    }
  },
);
