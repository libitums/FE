import { afterEach, expect, test } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import type { CatalogLessonPlan } from "./catalog-lesson-plan";
import { exitResult, flush, lessonPlan, tapNode } from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";
import {
  bootGuestAfterFirstUnit,
  guestProgressKey,
  installGuestHost,
  openSettingsTab,
  resetGuestHost,
  signInFromSettingsWithGoogle,
} from "./test-helpers/guest-entry";
import type { GuestHost } from "./test-helpers/guest-entry";

// `integration` 계층: 비회원의 엽전(ADR-0116 × ADR-0111) — 비회원도 레슨을 처음 통과하면 엽전을 받고, 받은 유닛은
// 기기의 비회원 진행 칸에 실리며, 설정에서 로그인하면 사용자 진행으로 올라가 서버에 저장됩니다.

afterEach(() => {
  cleanup();
  resetGuestHost();
});

const U00 = TUTORIAL_EPISODE_ID;

function solveAll(plan: CatalogLessonPlan): void {
  plan.activities.forEach((activity, index) =>
    solveActivity(activity, true, index === plan.activities.length - 1),
  );
}

const lastSaved = (host: GuestHost): Record<string, unknown> => {
  const bodies = host.bodiesOf("save_learning_progress");
  return (bodies[bodies.length - 1] as Record<string, unknown>)["p_progress"] as Record<
    string,
    unknown
  >;
};

test("[GE-C1] 비회원이 레슨을 처음 통과하면 엽전 5 — 기기 칸에 실리고, 로그인하면 서버로 올라간다", async () => {
  const host = installGuestHost({ userId: "u1" });
  await bootGuestAfterFirstUnit(host);
  expect(screen.getByTestId("top-bar-coins")).toHaveTextContent("0");

  tapNode(U00, "S1");
  solveAll(lessonPlan(U00, "S1"));
  await flush();
  expect(screen.getByTestId("lesson-complete-screen-reward-coins")).toHaveTextContent("+ 5");
  exitResult();
  await flush();

  expect(screen.getByTestId("top-bar-coins")).toHaveTextContent("5");
  const guestCell = JSON.parse(host.store.get(guestProgressKey) ?? "null") as {
    coinUnits?: unknown;
  } | null;
  expect(JSON.stringify(guestCell)).toContain('"coinUnits"');
  expect(host.bodiesOf("save_learning_progress")).toHaveLength(0);

  openSettingsTab();
  await signInFromSettingsWithGoogle();

  expect(lastSaved(host)["coinUnits"]).toEqual({ [U00]: ["S1"] });
});
