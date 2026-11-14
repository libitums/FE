import { afterEach, expect, test } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { setTesterAccessActive } from "../lib/tester-access";
import type { CatalogLessonPlan } from "./catalog-lesson-plan";
import {
  boot,
  exitResult,
  flush,
  lessonPlan,
  resetApp,
  savedProgress,
  tapNode,
  u01,
} from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";
import { openTab } from "./test-helpers/messenger-chat-app";

// `integration` 계층: 같은 날 합쳐진 기능들이 한 앱에서 서로 밟지 않는지 봅니다 — 엽전(ADR-0116) × 무제한 티켓
// (ADR-0115 · 시험 계정 ADR-0085) × 메신저(ADR-0113). 각 기능 홀로의 흐름은 제 파일이 봅니다.

afterEach(() => {
  setTesterAccessActive(false);
  resetApp();
});

function solveAll(plan: CatalogLessonPlan): void {
  plan.activities.forEach((activity, index) =>
    solveActivity(activity, true, index === plan.activities.length - 1),
  );
}

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 시험 계정(ADR-0085)의 접근 토큰입니다 — 세션 토큰에서 시험 계정 표시를 읽습니다. */
const testerToken = `${base64Url({ alg: "none" })}.${base64Url({
  sub: "tester-1",
  app_metadata: { duru_tester: true },
})}.sig`;

const tapRound = (testId: string): void =>
  void fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-round-button"), {});

test("XF1. 시험 계정이 레슨을 처음 통과하면 결과 화면에 무제한 알약과 엽전 카드가 함께 서고, 머리 칩도 둘 다 선다", async () => {
  const { rpcs } = await boot({ [u01]: ["intro"] }, { accessToken: testerToken });

  tapNode(u01, "S1");
  solveAll(lessonPlan(u01, "S1"));
  await flush();

  // 무제한은 티켓을 쓰지 않을 뿐 보상은 그대로다 — 두 줄이 서로의 자리를 빼앗지 않는다.
  expect(screen.getByTestId("lesson-complete-unlimited")).toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-reward-coins")).toHaveTextContent("+ 5 REWARD");
  expect(screen.getByTestId("lesson-complete-screen-coins-chip")).toHaveAttribute(
    "accessibility-label",
    "5 coins",
  );
  expect(screen.getByTestId("lesson-complete-screen-tickets-chip")).toBeInTheDocument();
  expect(savedProgress(rpcs).at(-1)?.["coinUnits"]).toEqual({ [u01]: ["S1"] });

  exitResult();
  await flush();
  expect(screen.getByTestId("top-bar-tickets-infinity")).toBeInTheDocument();
  expect(screen.getByTestId("top-bar-coins")).toHaveTextContent("5");
});

test("XF2. 머리의 무제한 칩과 엽전 칩은 각자 제 겹침을 열고, 한 번에 하나만 선다", async () => {
  await boot({ [u01]: ["intro"] }, { accessToken: testerToken });

  act(() => {
    fireEvent.tap(screen.getByTestId("top-bar-coins"), {});
  });
  expect(screen.getByTestId("coin-shop-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("unlimited-ticket-modal")).toBeNull();
  act(() => tapRound("coin-shop-screen-close"));
  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();

  act(() => {
    fireEvent.tap(screen.getByTestId("top-bar-tickets"), {});
  });
  expect(screen.getByTestId("unlimited-ticket-modal")).toBeInTheDocument();
  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();
});

test("XF3. 레슨으로 번 엽전이 메신저 목록 칩에도 같은 수로 보이고, 그 칩은 같은 엽전 상점을 연다", async () => {
  await boot({ [u01]: ["intro"] });

  tapNode(u01, "S1");
  solveAll(lessonPlan(u01, "S1"));
  await flush();
  exitResult();
  await flush();
  expect(screen.getByTestId("top-bar-coins")).toHaveTextContent("5");

  act(() => openTab("messenger"));
  const chip = screen.getByTestId("messenger-list-coins");
  expect(chip).toHaveTextContent("5");
  expect(chip).toHaveAttribute("accessibility-label", "5 coins, get more");

  act(() => {
    fireEvent.tap(chip, {});
  });
  expect(screen.getByTestId("coin-shop-screen-balance-value")).toHaveTextContent("5");
});
