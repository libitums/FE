import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AppJourneySeed } from "./App";
import { journeySteps } from "../screens/journey-map/journey-map";
import { answerMessengerReplies } from "../screens/messenger/messenger.test-support";
import { journeySeedBefore } from "./test-helpers/journey-seed";
import {
  assembleSinks,
  fakeTransport,
  runEntryFlow,
  sentEventNames,
  stubAirbridgeHost,
} from "./test-helpers/airbridge-events-harness";
import type { AirbridgeHostMode } from "./test-helpers/airbridge-events-harness";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// 「App의 한 사용자 흐름 → 합성 sink → 매핑 → tracker → NativeModules.AirbridgeEventsModule」을 한
// 트리에서 봅니다. 대역은 호스트 모듈(`trackEvent` 기록) · PostHog 가짜 transport · 저장소뿐이고
// 매핑 · 합성 · 해석은 진짜입니다. 조립은 진입점을 따라 합니다(`assembleSinks`). 진입점
// (`index.tsx`)이 그 조립을 실제로 하는지는 `pnpm build`와 e2e의 몫입니다.

const completedIntros = ["tutorial-intro"] as const;
const messengerUnit = "appointment-confirmation";
const visualNovelUnit = "cafe-arrival-visual-novel";

const finishedTutorial: AppJourneySeed = {
  completedStepCount: journeySteps.length,
  completedMessengerUnitIds: [messengerUnit],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

let unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => void unhandled.push(reason);

beforeEach(() => {
  unhandled = [];
  process.on("unhandledRejection", onUnhandled);
});

afterEach(() => {
  process.off("unhandledRejection", onUnhandled);
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const tap = (id: string) => fireEvent.tap(screen.getByTestId(id), {});

// 한 케이스 안에서 흐름을 둘 거치므로 앞 트리와 대역을 걷습니다.
function nextPhase(): void {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

// 여정의 메신저 유닛을 끝냅니다.
async function completeJourneyMessenger(sinks: ReturnType<typeof assembleSinks>) {
  await renderSignedInApp(
    <App
      {...sinks}
      journeySeed={journeySeedBefore(messengerUnit)}
      completedEpisodeIntroIds={completedIntros}
    />,
  );
  tap("ui-lynx-bottom-navigator-item-journey");
  tap(`ui-lynx-special-unit-${messengerUnit}`);
  answerMessengerReplies();
}

// 여정의 비주얼 노벨 유닛을 끝냅니다.
async function completeJourneyVisualNovel(sinks: ReturnType<typeof assembleSinks>) {
  await renderSignedInApp(
    <App
      {...sinks}
      journeySeed={journeySeedBefore(visualNovelUnit)}
      completedEpisodeIntroIds={completedIntros}
    />,
  );
  tap(`ui-lynx-special-unit-${visualNovelUnit}`);
  for (let i = 0; i < 5 && screen.queryByTestId("visual-novel-advance-button"); i++) {
    tap("visual-novel-advance-button");
  }
  tap("visual-novel-finish-button");
}

const registration = ["airbridge.user.signup", {}] as const;
const messengerLevel = [
  "airbridge.achieveLevel",
  { level: messengerUnit, label: "messenger" },
] as const;
const visualNovelLevel = [
  "airbridge.achieveLevel",
  { level: visualNovelUnit, label: "visual_novel" },
] as const;

test("I1. 진입 흐름을 「여정 시작하기」까지 가면 trackEvent가 가입 완료로 정확히 1회 불리고 그 앞에서는 0회다", async () => {
  const calls = stubAirbridgeHost("ok");
  const { transport } = fakeTransport();
  let before = -1;

  await runEntryFlow(assembleSinks(transport), () => {
    before = calls.length;
  });

  expect(before).toBe(0);
  expect(calls).toEqual([registration]);
});

test("I2. 메신저 유닛 완료와 비주얼 노벨 유닛 완료가 각각 achieveLevel로 1회씩 불린다", async () => {
  const messengerCalls = stubAirbridgeHost("ok");
  await completeJourneyMessenger(assembleSinks(fakeTransport().transport));
  expect(messengerCalls).toEqual([messengerLevel]);
  nextPhase();

  const visualNovelCalls = stubAirbridgeHost("ok");
  await completeJourneyVisualNovel(assembleSinks(fakeTransport().transport));
  expect(visualNovelCalls).toEqual([visualNovelLevel]);
});

test("I3. 완료가 아닌 이벤트(열기 · 중도 이탈 · 설정 · 알림)는 trackEvent 0회이고 PostHog에는 실린다", async () => {
  const calls = stubAirbridgeHost("ok");
  const { transport, calls: sent } = fakeTransport();
  await renderSignedInApp(
    <App
      {...assembleSinks(transport)}
      journeySeed={journeySeedBefore(messengerUnit)}
      completedEpisodeIntroIds={completedIntros}
    />,
  );
  tap("ui-lynx-bottom-navigator-item-journey");
  tap(`ui-lynx-special-unit-${messengerUnit}`);
  tap("messenger-screen-exit");
  tap("ui-lynx-bottom-navigator-item-settings");
  tap("top-bar-notifications");

  await vi.waitFor(() =>
    expect(sentEventNames(sent)).toEqual(
      expect.arrayContaining([
        "messenger_unit_opened",
        "messenger_unit_exited_incomplete",
        "settings_opened",
        "notifications_opened",
      ]),
    ),
  );
  expect(calls).toEqual([]);
});

test("I3. 롤플레이에서 연 메신저를 끝내도 trackEvent 0회이고 PostHog에는 completed가 실린다", async () => {
  const calls = stubAirbridgeHost("ok");
  const { transport, calls: sent } = fakeTransport();
  await renderSignedInApp(
    <App
      {...assembleSinks(transport)}
      journeySeed={finishedTutorial}
      completedEpisodeIntroIds={completedIntros}
    />,
  );
  tap("ui-lynx-bottom-navigator-item-roleplay");
  tap(`roleplay-list-item-${messengerUnit}`);
  answerMessengerReplies();

  await vi.waitFor(() => expect(sentEventNames(sent)).toContain("messenger_unit_completed"));
  expect(calls).toEqual([]);
});

test.each<AirbridgeHostMode>(["absent", "throws"])(
  "I4/I5. 호스트 모듈이 %s여도 흐름이 끝까지 가고 PostHog 전송이 유지되며 처리되지 않은 예외가 없다",
  async (mode) => {
    const calls = stubAirbridgeHost(mode);
    const entry = fakeTransport();
    await runEntryFlow(assembleSinks(entry.transport));
    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
    await vi.waitFor(() => expect(sentEventNames(entry.calls)).toContain("entry_completed"));
    expect(calls.length).toBe(mode === "absent" ? 0 : 1);
    nextPhase();

    stubAirbridgeHost(mode);
    const lesson = fakeTransport();
    await completeJourneyMessenger(assembleSinks(lesson.transport));
    expect(screen.getByTestId("messenger-finish")).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(sentEventNames(lesson.calls)).toContain("messenger_unit_completed"),
    );
    await settle();
    expect(unhandled).toEqual([]);
  },
);

test("I6. PostHog 설정 없이 호스트 모듈만 있어도 I1 · I2와 같은 trackEvent가 불리고 꽂은 transport 호출은 0이다", async () => {
  const calls = stubAirbridgeHost("ok");
  const recording = fakeTransport();
  await runEntryFlow(assembleSinks(recording.transport, null));
  expect(calls).toEqual([registration]);
  nextPhase();

  const lessonCalls = stubAirbridgeHost("ok");
  await completeJourneyMessenger(assembleSinks(recording.transport, null));
  expect(lessonCalls).toEqual([messengerLevel]);
  await settle();
  expect(recording.calls).toHaveLength(0);
});
