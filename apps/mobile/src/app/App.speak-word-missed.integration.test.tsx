import { afterEach, expect, test } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

import {
  boot,
  lessonPlan,
  resetApp,
  tapId,
  tapNode,
  u01,
} from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";

// `integration` 계층: 앱 전체를 걸어, Android 호스트(대역)의 ERROR_NO_MATCH(7)가 낱말 말하기에서 「인식 불가」가
// 아니라 다시 말하기 국면으로 서고, Try again 뒤의 판정 · Skip이 측정 이벤트(`episode_item_answered`)를 문항당
// 한 번만 내는지 봅니다(ADR-0181). 대역은 Android 결과 페이로드 모양 그대로이고 앱 쪽은 모킹하지 않습니다.

afterEach(resetApp);

const beforeS6 = ["intro", "S1", "S2", "S3", "S4", "S5"];
const noMatch = {
  errorDomain: "android.speech.SpeechRecognizer",
  errorCode: 7,
  koreanPack: "available",
  fallback: "none",
};

function speakWordOfS6() {
  const plan = lessonPlan(u01, "S6");
  const activity = plan.activities.find((candidate) => candidate.form === "speak-word");
  if (activity?.form !== "speak-word") throw new Error("no speak-word activity");
  return { plan, activity, answer: activity.questions[0]?.answers[0] ?? "" };
}

function openSpeakWord(plan: ReturnType<typeof lessonPlan>, target: number): void {
  tapNode(u01, "S6");
  plan.activities.slice(0, target).forEach((before) => solveActivity(before, true, false));
  fireEvent(screen.getByTestId("speak-word-picture-image"), new window.Event("bindEvent:load"));
}

const spokenEvents = (events: readonly { readonly name: string; readonly itemType?: string }[]) =>
  events.filter(
    (event) => event.name === "episode_item_answered" && event.itemType === "SPEAK_WORD",
  );

test("ISM1. no-match 뒤 Try again으로 맞히면 판정 이벤트는 정답 하나뿐이다", async () => {
  const { plan, activity, answer } = speakWordOfS6();
  const { events } = await boot(
    { [u01]: beforeS6 },
    {
      speech: {
        granted: true,
        heard: (attempt) => (attempt === 0 ? null : answer),
        failure: noMatch,
      },
    },
  );
  openSpeakWord(plan, plan.activities.indexOf(activity));

  tapId("learning-shell-action");
  expect(screen.getByTestId("speak-word-content")).toHaveAttribute("data-phase", "missed");
  expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
    "accessibility-label",
    "Try again",
  );
  expect(spokenEvents(events)).toHaveLength(0);

  tapId("learning-shell-action");

  const spoken = spokenEvents(events);
  expect(spoken).toHaveLength(1);
  expect(spoken[0]).toMatchObject({ result: "correct", speechErrorCode: "0" });
});

test("ISM2. no-match 뒤 Skip은 missed:no-match와 오류 코드 7을 한 번 싣는다", async () => {
  const { plan, activity } = speakWordOfS6();
  const { events } = await boot(
    { [u01]: beforeS6 },
    { speech: { granted: true, heard: () => null, failure: noMatch } },
  );
  openSpeakWord(plan, plan.activities.indexOf(activity));

  tapId("learning-shell-action");
  tapId("learning-shell-action");
  expect(screen.getByTestId("speak-word-content")).toHaveAttribute("data-phase", "missed");
  expect(spokenEvents(events)).toHaveLength(0);

  const skip = within(screen.getByTestId("speak-word-secondary")).getByTestId("ui-lynx-button");
  fireEvent.tap(skip, {});

  const spoken = spokenEvents(events);
  expect(spoken).toHaveLength(1);
  expect(spoken[0]).toMatchObject({
    result: "skipped",
    skipReason: "missed:no-match",
    speechErrorCode: "7",
    speechKoreanPack: "available",
  });
});
