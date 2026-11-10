import { afterEach, expect, test } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

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

// `integration` 계층: 학습 보상 엽전(ADR-0116)을 앱 전체에서 걷습니다 — 카탈로그 레슨을 처음 통과하면 결과 화면에 엽전
// 카드와 머리 엽전 칩이 서고, 받은 유닛이 진행 저장(`coinUnits`)에 실리며, 지도 상단 바의 엽전 칩이 보유량을 보입니다.
// 이미 끝낸 레슨을 다시 통과하면 엽전이 없습니다. 대역은 경계뿐입니다(공용 헬퍼 참고).

afterEach(resetApp);

/** 계획을 처음부터 모두 맞게 풉니다. 마지막 활동 뒤 결과 보기까지 누릅니다. */
function solveAll(plan: CatalogLessonPlan): void {
  plan.activities.forEach((activity, index) =>
    solveActivity(activity, true, index === plan.activities.length - 1),
  );
}

const coinUnitsSaved = (rpcs: Parameters<typeof savedProgress>[0]) =>
  savedProgress(rpcs).at(-1)?.["coinUnits"];

test("IC1. 처음 통과하면 엽전 10 — 결과 화면 카드 · 머리 칩, 저장에 받은 유닛, 지도 칩 10", async () => {
  const { rpcs } = await boot({ [u01]: ["intro"] });
  expect(screen.getByTestId("top-bar-coins")).toHaveTextContent("0");

  tapNode(u01, "S1");
  solveAll(lessonPlan(u01, "S1"));
  await flush();

  const card = screen.getByTestId("lesson-complete-screen-reward-coins");
  expect(card).toHaveTextContent("+ 10 REWARD");
  expect(screen.getByTestId("lesson-complete-screen-coins-chip")).toHaveAttribute(
    "accessibility-label",
    "10 coins",
  );
  expect(coinUnitsSaved(rpcs)).toEqual({ [u01]: ["S1"] });

  exitResult();
  await flush();
  expect(screen.getByTestId("top-bar-coins")).toHaveTextContent("10");
});

test("IC2. 이미 끝낸 레슨을 다시 통과하면 엽전이 없다 — 카드 없음, 칩 그대로, 저장에 받은 유닛 없음", async () => {
  const { rpcs } = await boot({ [u01]: ["intro", "S1"] });

  tapNode(u01, "S1");
  solveAll(lessonPlan(u01, "S1"));
  await flush();

  expect(screen.getByTestId("lesson-complete-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("lesson-complete-screen-reward-coins")).toBeNull();
  expect(screen.getByTestId("lesson-complete-screen-reward-grade")).toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-coins-chip")).toHaveAttribute(
    "accessibility-label",
    "0 coins",
  );
  expect(coinUnitsSaved(rpcs)).toBeUndefined();

  exitResult();
  await flush();
  expect(screen.getByTestId("top-bar-coins")).toHaveTextContent("0");
});

test("IC3. 지도 엽전 칩의 「+」 → 엽전 상점이 보유량을 보이고, 사기는 안내만 띄우며 엽전은 그대로다. 닫으면 지도로", async () => {
  await boot({ [u01]: ["intro"] });

  fireEvent.tap(screen.getByTestId("top-bar-coins"), {});
  await flush();

  expect(screen.getByTestId("coin-shop-screen-balance-value")).toHaveTextContent("0");
  fireEvent.tap(
    screen
      .getByTestId("coin-shop-screen-buy")
      .querySelector('[data-testid="ui-lynx-button"]') as Element,
    {},
  );
  expect(screen.getByTestId("coin-shop-screen-notice")).toBeInTheDocument();

  fireEvent.tap(
    screen
      .getByTestId("coin-shop-screen-close")
      .querySelector('[data-testid="ui-lynx-round-button"]') as Element,
    {},
  );
  await flush();
  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();
  expect(screen.getByTestId("top-bar-coins")).toHaveTextContent("0");
});
