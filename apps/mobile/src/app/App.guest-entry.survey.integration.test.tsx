import { afterEach, expect, test } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { exitResult, tapNode } from "./test-helpers/episode-format-harness";
import {
  flush,
  flushRounds,
  guestMarkerKey,
  installGuestHost,
  present,
  renderGuestApp,
  resetGuestHost,
} from "./test-helpers/guest-entry";
import { tutorialDoneProgress } from "./test-helpers/progress-seed";
import {
  finalPlanOf,
  passBanner,
  readAllCuts,
  settleFake,
  solveFinalTurns,
  useBannerClock,
} from "./test-helpers/tutorial-boot";

// `integration` 계층: 비회원이 에피소드를 끝내도 설문(서버 `submit_feedback`)이 서지 않는다(ADR-0111 §2-3).
// 같은 진행을 로그인 사용자가 하면 설문이 서는 것은 `App.tutorial-u00.integration.test.tsx` TU10이 봅니다.

afterEach(() => {
  cleanup();
  resetGuestHost();
});

const U00 = TUTORIAL_EPISODE_ID;

test("[GE3b] 비회원이 u00을 끝내도 에피소드 설문이 서지 않고 피드백 RPC가 0건이다", async () => {
  const host = installGuestHost({
    store: new Map([
      [guestMarkerKey, "1"],
      [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    ]),
  });
  const withoutFinal = (tutorialDoneProgress()[U00] ?? []).filter((key) => key !== "RP");
  await renderGuestApp(host, {
    platform: "ios",
    appProps: { progressSeed: { catalogProgress: { [U00]: withoutFinal } } },
  });
  expect(present("journey-map-screen")).toBe(true);

  tapNode(U00, "RP");
  solveFinalTurns(finalPlanOf(U00, 0).turns);
  useBannerClock();
  exitResult();
  readAllCuts(4);
  await settleFake();
  passBanner();
  await flushRounds(4);

  // 연속 학습 모달이 먼저 서면 닫고, 설문이 설 자리(모달 다음)까지 기다린다.
  for (let round = 0; round < 3; round += 1) {
    const back = screen.queryByTestId("journey-stat-modal-back");
    if (back !== null) {
      act(() => {
        fireEvent.tap(back.querySelector('[data-testid="ui-lynx-round-button"]') as Element, {});
      });
    }
    await flush();
  }

  expect(present("journey-map-screen")).toBe(true);
  expect(present("episode-survey-options")).toBe(false);
  expect(host.requests.filter((request) => request.rpc === "submit_feedback")).toEqual([]);
  expect(host.requests).toEqual([]);
});
