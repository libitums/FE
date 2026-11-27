import { afterEach, expect, test } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

import {
  boot,
  lessonPlan,
  resetApp,
  tapId,
  tapNode,
  u01,
} from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";

// `integration` 계층: 앱 전체를 걸어, Android 호스트(대역)가 낸 인식 실패의 오류 코드 · 한국어 팩 · 되돌아감이
// 낱말 말하기의 건너뜀 측정 이벤트(`episode_item_answered`)에 닿는지 봅니다. 대역은 Android 결과 페이로드
// 모양 그대로(키 이름 · 값)이고, 앱 쪽은 모킹하지 않습니다.

afterEach(resetApp);

const beforeS6 = ["intro", "S1", "S2", "S3", "S4", "S5"];

test("ISD1. 온디바이스 한국어 팩이 없어 실패한 낱말 말하기의 Skip은 오류 코드 · 팩 · 되돌아감을 이벤트에 싣는다", async () => {
  const plan = lessonPlan(u01, "S6");
  const { events } = await boot(
    { [u01]: beforeS6 },
    {
      speech: {
        granted: true,
        heard: () => null,
        failure: {
          errorDomain: "android.speech.SpeechRecognizer",
          errorCode: 13,
          requestedOnDevice: true,
          supportsOnDevice: true,
          requiresOnDevice: true,
          onDevice: "guaranteed",
          koreanPack: "unknown",
          fallback: "none",
          fallbackErrorCode: 0,
        },
      },
    },
  );

  tapNode(u01, "S6");
  const target = plan.activities.findIndex((activity) => activity.form === "speak-word");
  plan.activities.slice(0, target).forEach((activity) => solveActivity(activity, true, false));

  fireEvent(screen.getByTestId("speak-word-picture-image"), new window.Event("bindEvent:load"));
  tapId("speak-word-mic-button");
  expect(screen.getByTestId("speak-word-content")).toHaveAttribute("data-reason", "failed");
  tapId("learning-shell-action");

  const spoken = events.filter(
    (event) => event.name === "episode_item_answered" && event.itemType === "SPEAK_WORD",
  );
  expect(spoken).toHaveLength(1);
  expect(spoken[0]).toMatchObject({
    result: "skipped",
    skipReason: "unavailable:failed",
    speechErrorCode: "13",
    speechFallback: "none",
    speechKoreanPack: "unknown",
  });
});

test("ISD2. 네트워크로 되돌아가 들은 정답은 pack-missing · available을 판정 이벤트에 싣는다", async () => {
  const plan = lessonPlan(u01, "S6");
  const activity = plan.activities.find((candidate) => candidate.form === "speak-word");
  if (activity?.form !== "speak-word") throw new Error("no speak-word activity");
  const answer = activity.questions[0]?.answers[0] ?? "";
  const { events } = await boot(
    { [u01]: beforeS6 },
    { speech: { granted: true, heard: () => answer } },
  );
  // 들림 페이로드에도 Android 키를 싣도록 대역의 start를 감쌉니다 — 되돌아간 세션의 모양입니다.
  const host = (
    NativeModules as Record<string, { start: (a: unknown, c: (p: unknown) => void) => void }>
  )["SpeechRecognitionModule"];
  if (host === undefined) throw new Error("no speech host");
  const start = host.start;
  host.start = (args, callback) =>
    start(args, (payload) =>
      callback({
        ...(payload as Record<string, unknown>),
        requiresOnDevice: false,
        onDevice: "not-guaranteed",
        koreanPack: "available",
        fallback: "pack-missing",
      }),
    );

  tapNode(u01, "S6");
  const target = plan.activities.indexOf(activity);
  plan.activities.slice(0, target).forEach((before) => solveActivity(before, true, false));
  fireEvent(screen.getByTestId("speak-word-picture-image"), new window.Event("bindEvent:load"));
  tapId("speak-word-mic-button");

  const spoken = events.filter(
    (event) => event.name === "episode_item_answered" && event.itemType === "SPEAK_WORD",
  );
  expect(spoken[0]).toMatchObject({
    result: "correct",
    speechErrorCode: "0",
    speechFallback: "pack-missing",
    speechKoreanPack: "available",
  });
});
