import { screen } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test } from "vitest";

import {
  boot,
  exitResult,
  flush,
  lessonPlan,
  resetApp,
  tapNode,
  u01,
} from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";
import {
  openTab,
  resetMessengerChatSource,
  tapId,
  textOf,
  testerAccessToken,
} from "./test-helpers/messenger-chat-app";

// `integration` 계층(MC2-I5 지갑 경계): 메신저 지갑의 잔액은 앱의 실제 엽전(coinCount = 받은 유닛 × 10)을 따라간다 —
// 앱을 쓰는 중에 레슨을 처음 통과해 번 엽전이 메신저 목록 칩 · 방의 사진 요청 대화상자에 곧바로 나타나야 한다
// (번 엽전은 effect로 지갑에 동기화되고 쓴 양은 로컬 원장에 남는다 — spec §17 Q2).

beforeEach(async () => {
  // 시험 계정(무제한)으로 부팅하므로 일반 계정의 엽전 흐름은 등급을 free로 고정해 봅니다(ADR-0128).
  await resetMessengerChatSource({ tier: "free" });
});
afterEach(resetApp);

test("MC2-I5. 레슨을 처음 통과해 번 엽전 10은 메신저 목록 칩과 방의 요청 대화상자 잔액에 곧바로 보인다", async () => {
  await boot({ [u01]: ["intro"] }, { accessToken: testerAccessToken });
  openTab("messenger");
  expect(textOf("messenger-list-coins")).toContain("0");
  expect(textOf("messenger-list-coins")).not.toContain("10");
  openTab("journey");

  tapNode(u01, "S1");
  const plan = lessonPlan(u01, "S1");
  plan.activities.forEach((activity, index) =>
    solveActivity(activity, true, index === plan.activities.length - 1),
  );
  await flush();
  exitResult();
  await flush();

  openTab("messenger");
  expect(textOf("messenger-list-coins")).toContain("10");
  tapId("messenger-list-row-owner");
  tapId("messenger-chat-feature-snapshot");
  expect(textOf("messenger-chat-ask-balance")).toBe("You have 10 coins");
  expect(screen.getByTestId("messenger-chat-ask").getAttribute("data-plan")).toBe("top-up");
});
