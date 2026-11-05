import { afterEach, describe, expect, test } from "vitest";
import { act, fireEvent, screen } from "@lynx-js/react/testing-library";

import { activityGuideKindFor, learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import type { LearningItemGuideKind } from "../lib/learning-item-guide.contract";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { activityGuideSubjectOf } from "./catalog-activity-guide-subject";
import type { CatalogActivity } from "./catalog-lesson-types";
import {
  exitResult,
  lessonPlan,
  resetApp,
  status,
  tapNode,
} from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";
import { tutorialCoverDoneProgress, tutorialDoneProgress } from "./test-helpers/progress-seed";
import { bootTutorialApp, flushAsync } from "./test-helpers/tutorial-boot";

// `integration` 계층: 카탈로그 레슨 활동 안내(ADR-0104)가 실제 앱 트리에서 — 처음 서는 활동에 뜨고 · 닫으면 기록되고 ·
// 같은 종류는 다시 뜨지 않는다. 기대값은 **본문을 읽어 계획에서 뽑습니다**(문항 id · 순서를 적지 않음) — 튜토리얼 본문이
// 바뀌어도 이 테스트는 그 본문에 맞게 같은 규칙을 봅니다. 대역은 경계뿐입니다(공용 헬퍼 참고).

afterEach(resetApp);

const U00 = TUTORIAL_EPISODE_ID;
const U01 = "u01-water";
const kindOf = (activity: CatalogActivity): LearningItemGuideKind | null =>
  activityGuideKindFor(activityGuideSubjectOf(activity));
const guideRoot = (kind: LearningItemGuideKind) =>
  screen.queryByTestId(`learning-item-guide-${kind}`);
const anyGuide = () => screen.queryAllByTestId(/^learning-item-guide-(sentence-order|activity-)/);
const seenOf = (store: Map<string, string>): unknown =>
  JSON.parse(store.get(learningItemGuideSeenStorageKey) ?? "[]");

async function dismiss(kind: LearningItemGuideKind): Promise<void> {
  const root = guideRoot(kind);
  expect(root, `${kind} 안내`).not.toBeNull();
  await act(async () => {
    fireEvent.tap(root as Element, { eventType: "catchEvent" });
  });
}

describe("카탈로그 레슨 활동 안내", () => {
  test("AGI1. 안내를 본 적 없는 설치가 u00 S1을 열면 첫 활동의 화면 종류 안내가 서고, 화면은 낭독에서 가려진다", async () => {
    await bootTutorialApp({
      guidesSeen: false,
      progressSeed: { catalogProgress: tutorialCoverDoneProgress() },
    });
    const first = lessonPlan(U00, "S1").activities[0];
    expect(first).toBeDefined();
    const kind = kindOf(first as CatalogActivity);

    tapNode(U00, "S1");

    if (kind === null) {
      expect(anyGuide()).toHaveLength(0);
      return;
    }
    expect(guideRoot(kind)).toBeInTheDocument();
    expect(screen.getByTestId("learning-shell")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
  });

  test("AGI2. u00 S1을 끝까지 풀면 종류마다 처음 한 번만 서고, 닫을 때마다 기기에 적힌다", async () => {
    const { store } = await bootTutorialApp({
      guidesSeen: false,
      progressSeed: { catalogProgress: tutorialCoverDoneProgress() },
    });
    const plan = lessonPlan(U00, "S1");
    const expected: LearningItemGuideKind[] = [];
    tapNode(U00, "S1");

    for (const [index, activity] of plan.activities.entries()) {
      const kind = kindOf(activity);
      if (kind !== null && !expected.includes(kind)) {
        expected.push(kind);
        // 문장 만들기처럼 화면이 obscured={false}를 넘기는 활동도 층이 덮으면 가려집니다.
        expect(screen.getByTestId("learning-shell"), kind).toHaveAttribute(
          "accessibility-elements-hidden",
          "true",
        );
        await dismiss(kind);
        expect(screen.getByTestId("learning-shell")).toHaveAttribute(
          "accessibility-elements-hidden",
          "false",
        );
      } else {
        expect(anyGuide(), `활동 ${String(index)}`).toHaveLength(0);
      }
      solveActivity(activity, true, index === plan.activities.length - 1);
      await flushAsync();
    }
    exitResult();
    await flushAsync();

    expect(expected.length).toBeGreaterThan(0);
    expect(seenOf(store)).toEqual(expected);
  });

  test("AGI3. 튜토리얼이 아닌 에피소드(u01)에서도 처음 만나는 화면 종류면 안내가 선다", async () => {
    await bootTutorialApp({
      guidesSeen: false,
      progressSeed: { catalogProgress: { ...tutorialDoneProgress(), [U01]: ["intro"] } },
    });
    expect(status(U01, "S1")).toBe("available");
    const first = lessonPlan(U01, "S1").activities[0] as CatalogActivity;
    const kind = kindOf(first);

    tapNode(U01, "S1");

    if (kind === null) expect(anyGuide()).toHaveLength(0);
    else expect(guideRoot(kind)).toBeInTheDocument();
  });

  test("AGI4. 안내를 모두 본 설치에서는 레슨을 열어도 안내가 없고 화면은 가려지지 않는다", async () => {
    await bootTutorialApp({ progressSeed: { catalogProgress: tutorialCoverDoneProgress() } });

    tapNode(U00, "S1");

    expect(anyGuide()).toHaveLength(0);
    expect(screen.getByTestId("learning-shell")).not.toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
  });
});
