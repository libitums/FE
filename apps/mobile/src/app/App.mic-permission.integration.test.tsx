import { afterEach, expect, test } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import {
  boot,
  lessonPlan,
  resetApp,
  tapId,
  tapNode,
  u01,
} from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";

// `integration` 계층: 앱 전체를 걸어 레슨의 첫 말하기 문항 직전 마이크 사전 안내(P1) · 거부(P2)가 서고, 그 선택이
// 측정 이벤트(PostHog sink)와 「이 레슨의 말하기 건너뜀」으로 이어지는지 봅니다(ADR-0206). 대역은 호스트 모듈 · fetch뿐입니다.

afterEach(resetApp);

const beforeS6 = ["intro", "S1", "S2", "S3", "S4", "S5"];

function speakWordOfS6() {
  const plan = lessonPlan(u01, "S6");
  const activity = plan.activities.find((candidate) => candidate.form === "speak-word");
  if (activity?.form !== "speak-word") throw new Error("no speak-word activity");
  return { plan, activity, answer: activity.questions[0]?.answers[0] ?? "" };
}

function openSpeakWord(plan: ReturnType<typeof lessonPlan>, target: number): void {
  tapNode(u01, "S6");
  plan.activities.slice(0, target).forEach((before) => solveActivity(before, true, false));
}

const micEvents = (events: readonly { readonly name: string }[]) =>
  events.filter((event) => event.name.startsWith("mic_permission_"));
const tapSheet = (action: string) =>
  fireEvent.tap(
    within(screen.getByTestId(`ui-lynx-bottom-sheet-action-${action}`)).getByTestId(
      "ui-lynx-button",
    ),
    {},
  );

test("IMP1. 미요청이면 첫 말하기 직전 사전 안내 → Allow → 허용이면 시트가 닫히고 말해 판정까지 간다", async () => {
  const { plan, activity, answer } = speakWordOfS6();
  const permission = { microphone: "not-determined", onAsk: "granted" };
  const { events } = await boot(
    { [u01]: beforeS6 },
    { speech: { granted: true, heard: () => answer, permission } },
  );
  openSpeakWord(plan, plan.activities.indexOf(activity));

  expect(screen.getByTestId("mic-permission-sheet")).toHaveAttribute("data-sheet", "prime");
  tapSheet("allow");
  expect(screen.queryByTestId("mic-permission-sheet")).not.toBeInTheDocument();

  fireEvent(screen.getByTestId("speak-word-picture-image"), new window.Event("bindEvent:load"));
  tapId("learning-shell-action");
  expect(screen.getByTestId("speak-word-result")).toHaveAttribute("data-grade", "perfect");
  expect(micEvents(events)).toEqual([
    { name: "mic_permission_sheet_shown", surface: "speak-word", sheet: "prime" },
    { name: "mic_permission_answered", surface: "speak-word", result: "allowed", source: "prompt" },
  ]);
});

test("IMP2. Not now는 이 활동의 말하기 문항을 mic:not-now로 건너뛰고 레슨을 이어 간다", async () => {
  const { plan, activity } = speakWordOfS6();
  const permission = { microphone: "not-determined" };
  const { events } = await boot(
    { [u01]: beforeS6 },
    { speech: { granted: true, heard: () => null, permission } },
  );
  openSpeakWord(plan, plan.activities.indexOf(activity));

  tapSheet("not-now");

  const spoken = events.filter(
    (event) => event.name === "episode_item_answered" && event.itemType === "SPEAK_WORD",
  );
  expect(spoken).toHaveLength(activity.questions.length);
  for (const event of spoken) {
    expect(event).toMatchObject({ result: "skipped", skipReason: "mic:not-now" });
  }
  expect(screen.queryByTestId("speak-word-content")).not.toBeInTheDocument();
});

test("IMP3. 거부면 거부 시트 — Open Settings → 설정 열기 이벤트, 돌아와 허용이면 시트가 닫히고 말할 수 있다", async () => {
  const { plan, activity } = speakWordOfS6();
  const permission: { microphone: string; openedSettings?: number } = { microphone: "denied" };
  const { events } = await boot(
    { [u01]: beforeS6 },
    { speech: { granted: true, heard: () => null, permission } },
  );
  openSpeakWord(plan, plan.activities.indexOf(activity));

  expect(screen.getByTestId("mic-permission-sheet")).toHaveAttribute("data-sheet", "denied");
  tapSheet("settings");
  expect(permission.openedSettings).toBe(1);

  permission.microphone = "granted";
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit("contentSyncOpportunity", []);
  });
  expect(screen.queryByTestId("mic-permission-sheet")).not.toBeInTheDocument();
  expect(micEvents(events)).toEqual([
    { name: "mic_permission_sheet_shown", surface: "speak-word", sheet: "denied" },
    { name: "mic_permission_settings_opened", surface: "speak-word" },
    {
      name: "mic_permission_answered",
      surface: "speak-word",
      result: "allowed",
      source: "settings",
    },
  ]);
});
