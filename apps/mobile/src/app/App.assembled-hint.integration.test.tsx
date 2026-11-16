import { afterEach, expect, test } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { boot, lessonPlan, resetApp, tapNode } from "./test-helpers/episode-format-harness";
import { solveActivity, solveSyllable } from "./test-helpers/episode-format-solvers";

// `integration` 계층: 조립 문항 타일 로마자 · 힌트(ADR-0153)가 실제 앱 트리에서 — 하네스 내장 튜토리얼 u00 S4의 음절
// 조립이 콘텐츠 로마자를 창고 타일에 싣고, 힌트 「정답 보기」를 쓴 판정이 측정 이벤트에 hintUsed로 닿는다.
// 계획 · 매핑 · 화면 · 결선은 실물이고 대역은 경계뿐입니다.

afterEach(resetApp);

const u00 = "u00-tutorial";

test("AI1. 튜토리얼 음절 조립은 타일 로마자 · 힌트가 서고, 정답 보기를 쓴 판정은 hintUsed show로 나간다", async () => {
  const booted = await boot({ [u00]: ["intro", "S1", "S2", "S3"] });
  tapNode(u00, "S4");
  const plan = lessonPlan(u00, "S4");
  const at = plan.activities.findIndex((activity) => activity.form === "syllable-build");
  expect(at).toBeGreaterThanOrEqual(0);
  plan.activities.slice(0, at).forEach((activity) => solveActivity(activity, true, false));

  const activity = plan.activities[at];
  if (activity?.form !== "syllable-build") throw new Error("no syllable-build");
  const [question] = activity.questions;
  if (question === undefined) throw new Error("no question");
  expect(question.tileReading?.shown).toBe("always");
  const romans = screen.getAllByText(
    (_, node) => node?.getAttribute("class")?.includes("tile-romanization") ?? false,
  );
  expect(romans.length).toBe(question.tiles.length);

  fireEvent.tap(screen.getByTestId("assembled-hint-button"), {});
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-bottom-sheet-action-show")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(screen.getByTestId("syllable-build-slot-0-ghost")).toBeInTheDocument();
  solveSyllable(question, true);

  const answered = booted.events.filter(
    (event) =>
      event.name === "episode_item_answered" &&
      (event as { itemType?: string }).itemType === "SYLLABLE_BUILD",
  ) as unknown as Record<string, unknown>[];
  expect(answered.at(-1)).toMatchObject({ result: "correct", hintUsed: "show" });
});
