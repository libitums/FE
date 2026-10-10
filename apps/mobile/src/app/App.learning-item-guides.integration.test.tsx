import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AppJourneySeed } from "./App";
import { episodePrologueFor } from "./episode-prologues";
import { productJourneySeed } from "./journey-progress";
import { journeySeedBefore } from "./test-helpers/journey-seed";
import { advanceNarrative } from "./test-helpers/narrative";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import {
  guideRoots,
  guideSeenKey,
  stubGuideStorage,
} from "../lib/learning-item-guide.storage.test-support";
import type { GuideStorageDouble } from "../lib/learning-item-guide.storage.test-support";
import { lightStatusBarIcons } from "../lib/status-bar-icons";
import { systemBackEventName } from "../lib/system-back";
import { journeySteps } from "../screens/journey-map/journey-map";

// `integration` 계층: 학습 문항 안내가 App 전체 트리에서 「처음 열 때 뜨고, 닫으면 기기에 적히고, 다시 열면
// 안 뜬다」를 지키는가. 저장소는 호출을 기록하는 `StorageModule` 대역이고 나머지는 실물이다.
// 정본은 learning-item-guides 계약 G1 ~ G10과 test-plan의 IG1 ~ IG14다.

const completedIntros = ["tutorial-intro"] as const;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ------------------------------------------------------------ 준비

function newStorage(options: Parameters<typeof stubGuideStorage>[0] = {}): GuideStorageDouble {
  return stubGuideStorage({
    ...options,
    entries: {
      [authSessionStorageKey]: serializeAuthSession(signedInBootSession),
      ...options.entries,
    },
  });
}

async function boot(
  seed: AppJourneySeed,
  storage: GuideStorageDouble,
  extra: Partial<Parameters<typeof renderSignedInApp>[1]> = {},
): Promise<void> {
  await renderSignedInApp(<App completedEpisodeIntroIds={completedIntros} journeySeed={seed} />, {
    storageModule: storage,
    ...extra,
  });
}

const tap = (id: string): void => void fireEvent.tap(screen.getByTestId(id), {});
const catchTap = (id: string): void =>
  void fireEvent.tap(screen.getByTestId(id), { eventType: "catchEvent" });
const tapButtonIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});
const guide = (kind: string) => screen.queryByTestId(`learning-item-guide-${kind}`);
const dismiss = (kind: string): void => catchTap(`learning-item-guide-${kind}`);
const unit = (id: string): void => tap(`ui-lynx-learning-unit-${id}`);
const startSheet = (id: string): void => {
  unit(id);
  tap("step-sheet-start");
};
const markerCount = (): number =>
  document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`).length;

const greetingSeed = journeySeedBefore("greeting");

/** greeting을 끝까지 풀어 맵으로 돌아옵니다(안내는 먼저 닫아 둡니다). */
function solveGreetingAndReturn(): void {
  tap("sentence-order-chip-0");
  tap("learning-shell-action");
  tap("learning-shell-action");
  tap("learning-shell-action");
  tapButtonIn("lesson-complete-screen-exit");
}

/** 학습 셸의 나가기(`×` → 그만두기)로 맵에 돌아옵니다. */
function leaveShell(): void {
  tap("learning-shell-exit");
  tapButtonIn("ui-lynx-dialog-action-leave");
}

// ------------------------------------------------------------ IG1 ~ IG3

test("[IG1] greeting에서 안내를 닫고 풀면 둘째 단원(introduction)에는 뜨지 않고 쓰기는 한 번이다", async () => {
  const storage = newStorage();
  await boot(greetingSeed, storage);

  startSheet("greeting");
  expect(guide("sentence-order")).not.toBeNull();
  expect(storage.guideWrites()).toHaveLength(0);
  dismiss("sentence-order");
  solveGreetingAndReturn();

  startSheet("introduction");
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
  expect(guideRoots()).toHaveLength(0);
  expect(storage.guideWrites()).toHaveLength(1);
  expect(storage.savedKinds()).toEqual(["sentence-order"]);
});

test("[IG2] 안내를 닫고 맵으로 나갔다가 같은 단원을 다시 열면 뜨지 않는다", async () => {
  const storage = newStorage();
  await boot(greetingSeed, storage);

  startSheet("greeting");
  expect(guide("sentence-order")).not.toBeNull();
  dismiss("sentence-order");
  leaveShell();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();

  startSheet("greeting");
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
  expect(guideRoots()).toHaveLength(0);
});

test("[IG3] 메신저 · 전화 · 비주얼 노벨을 차례로 열면 각자의 안내가 한 번씩 뜨고 저장값이 세 종류를 담는다", async () => {
  const storage = newStorage();
  await boot(journeySeedBefore("directions"), storage);

  unit("appointment-confirmation");
  expect(guide("messenger")).not.toBeNull();
  dismiss("messenger");
  tap("messenger-screen-exit");

  unit("appointment-confirmation-phone-call");
  expect(guide("phone-call")).not.toBeNull();
  dismiss("phone-call");
  tap("phone-call-exit-button");

  unit("cafe-arrival-visual-novel");
  expect(guide("visual-novel")).not.toBeNull();
  dismiss("visual-novel");

  expect(storage.savedKinds()).toEqual(["messenger", "phone-call", "visual-novel"]);
});

// ------------------------------------------------------------ IG4

test("[IG4] 말하기 · 쓰기 단원은 각자의 안내가 한 번 뜨고, 닫은 뒤 Skip으로 넘길 수 있다", async () => {
  const storage = newStorage();
  await boot({ ...journeySeedBefore("tutorial-speaking") }, storage);

  startSheet("tutorial-speaking");
  expect(guide("speaking")).not.toBeNull();
  dismiss("speaking");
  tapButtonIn("speaking-screen-skip");
  expect(screen.getByTestId("speaking-screen-complete")).toBeInTheDocument();
  expect(guideRoots()).toHaveLength(0);
  // 단원 완료는 완료 카드의 `See results`(onFinishLearning)에서만 기록된다 — `×`로 나가면
  // 말하기가 끝난 것으로 치지 않아 쓰기 단원이 잠긴 채 남는다. 앱의 진행 규칙대로 결과까지 간다.
  tap("learning-shell-action");
  tapButtonIn("lesson-complete-screen-exit");

  startSheet("tutorial-writing");
  expect(guide("writing")).not.toBeNull();
  dismiss("writing");
  tapButtonIn("writing-screen-skip");
  expect(screen.getByTestId("writing-screen-complete")).toBeInTheDocument();
  expect(storage.savedKinds()).toEqual(["speaking", "writing"]);
});

// ------------------------------------------------------------ IG5 ~ IG7

test("[IG5] 닫은 뒤 같은 저장소로 앱을 다시 세워도 같은 단원에 뜨지 않는다", async () => {
  const storage = newStorage();
  await boot(greetingSeed, storage);
  startSheet("greeting");
  dismiss("sentence-order");
  expect(storage.savedKinds()).toEqual(["sentence-order"]);

  cleanup();
  vi.unstubAllGlobals();
  await boot(greetingSeed, storage);
  startSheet("greeting");

  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
  expect(guideRoots()).toHaveLength(0);
});

test("[IG6] 로그아웃해도 안내 기록은 지워지지 않는다", async () => {
  const storage = newStorage();
  await boot(greetingSeed, storage);
  startSheet("greeting");
  dismiss("sentence-order");
  leaveShell();
  vi.stubGlobal("fetch", () => Promise.resolve({ status: 204, text: async () => "" }));

  tap("ui-lynx-bottom-navigator-item-settings");
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-sign-out")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
  tapButtonIn("ui-lynx-dialog-action-sign-out");
  await waitFor(() => expect(screen.getByTestId("login-screen-title")).toBeTruthy());

  expect(storage.remove.mock.calls.map(([key]) => key)).not.toContain(guideSeenKey);
  expect(storage.savedKinds()).toEqual(["sentence-order"]);
});

test("[IG7] 안내가 뜬 채 닫지 않고 앱을 내리면 쓰지 않았고, 다시 세워 열면 다시 뜬다", async () => {
  const storage = newStorage();
  await boot(greetingSeed, storage);
  startSheet("greeting");
  expect(guide("sentence-order")).not.toBeNull();

  cleanup();
  expect(storage.guideWrites()).toHaveLength(0);
  vi.unstubAllGlobals();
  await boot(greetingSeed, storage);
  startSheet("greeting");

  expect(guide("sentence-order")).not.toBeNull();
  expect(storage.guideWrites()).toHaveLength(0);
});

// ------------------------------------------------------------ IG8

test("[IG8] 시스템 뒤로가기 한 번은 안내만 닫고 처리했다고 답하며, 한 번 더는 나가기 확인창이다", async () => {
  const respond = vi.fn<(token: string, outcome: string) => void>();
  const storage = newStorage({
    modules: { SystemBackModule: { ready: vi.fn<() => void>(), respond } },
  });
  await boot(greetingSeed, storage);
  startSheet("greeting");
  expect(guide("sentence-order")).not.toBeNull();
  const press = (token: string): void =>
    void act(() => {
      lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, [token]);
    });

  press("1");
  expect(guide("sentence-order")).toBeNull();
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
  expect(screen.queryByTestId("ui-lynx-dialog")).not.toBeInTheDocument();
  expect(respond).toHaveBeenCalledTimes(1);
  expect(respond).toHaveBeenLastCalledWith("1", "handled");

  press("2");
  expect(screen.getByTestId("ui-lynx-dialog")).toBeInTheDocument();
  expect(respond).toHaveBeenLastCalledWith("2", "handled");
});

// ------------------------------------------------------------ IG9

test.each(["ordering", "appointment", "directions", "tutorial-listening"] as const)(
  "[IG9] %s 단원에는 안내가 없고 안내 키에 쓰지 않는다",
  async (id) => {
    const storage = newStorage();
    await boot(journeySeedBefore(id), storage);

    startSheet(id);

    expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
    expect(guideRoots()).toHaveLength(0);
    expect(document.querySelector('[data-testid^="learning-item-guide-"]')).toBeNull();
    expect(storage.guideWrites()).toHaveLength(0);
  },
);

// ------------------------------------------------------------ IG10

test("[IG10] 표지 수: 학습 셸 위 안내는 0 → 1 → 0, 비주얼 노벨 위 안내는 1 → 2 → 1", async () => {
  await renderSignedInApp(
    <App completedEpisodeIntroIds={completedIntros} journeySeed={journeySeedBefore("greeting")} />,
    { learningItemGuides: "unseen" },
  );
  expect(markerCount()).toBe(0);
  startSheet("greeting");
  expect(guide("sentence-order")).not.toBeNull();
  expect(markerCount()).toBe(1);
  dismiss("sentence-order");
  expect(markerCount()).toBe(0);
  leaveShell();

  cleanup();
  vi.unstubAllGlobals();
  await renderSignedInApp(
    <App
      completedEpisodeIntroIds={completedIntros}
      journeySeed={journeySeedBefore("cafe-arrival-visual-novel")}
    />,
    { learningItemGuides: "unseen" },
  );
  unit("cafe-arrival-visual-novel");
  expect(guide("visual-novel")).not.toBeNull();
  expect(markerCount()).toBe(2);
  dismiss("visual-novel");
  expect(markerCount()).toBe(1);
});

// ------------------------------------------------------------ IG11

type Segment =
  NonNullable<ReturnType<typeof episodePrologueFor>> extends infer Prologue
    ? Prologue extends { kind: "sequence"; segments: readonly (infer S)[] }
      ? S
      : never
    : never;

function finishSegment(segment: Segment): void {
  switch (segment.kind) {
    case "visual-novel":
      for (const _beat of segment.narrative.beats) advanceNarrative();
      break;
    case "messenger":
      for (const message of segment.chat.messages) {
        if (message.sender === "other") {
          act(() => {
            vi.advanceTimersByTime(1500);
          });
        } else {
          tap("prologue-chat-screen-send");
        }
      }
      tap("prologue-chat-screen-complete");
      break;
    case "call":
      tap("prologue-call-screen-accept");
      tap("prologue-call-screen-end");
      tap("prologue-call-screen-complete");
      break;
  }
}

test("[IG11] 새 사용자의 첫 단원: 기존 안내 넷이 전과 같이 뜨고, 어느 때도 새 안내와 함께 서지 않으며 새 키에 쓰지 않는다", async () => {
  const storage = newStorage();
  const prologue = episodePrologueFor("tutorial");
  if (prologue?.kind !== "sequence") throw new Error("Expected tutorial sequence");
  const [first, chat, second, call] = prologue.segments;
  if (!first || !chat || !second || !call) throw new Error("Expected five segments");
  const noNewGuide = (): void => expect(guideRoots()).toHaveLength(0);

  await renderSignedInApp(<App journeySeed={{ ...productJourneySeed, completedStepCount: 0 }} />, {
    storageModule: storage,
    refreshedAccessToken: `e30.${btoa(JSON.stringify({ sub: "new-learner" }))}.sig`,
    loadProgress: async () => ({ status: 200, body: "null" }),
  });
  expect(screen.getByTestId("first-unit-guide-map")).toBeInTheDocument();
  noNewGuide();
  catchTap("first-unit-guide-map");

  unit("tutorial-intro");
  vi.useFakeTimers();
  tapButtonIn("episode-intro-screen-next");
  expect(screen.getByTestId("first-unit-guide-story")).toBeInTheDocument();
  noNewGuide();
  catchTap("first-unit-guide-story");

  finishSegment(first);
  expect(screen.getByTestId("first-unit-guide-messenger")).toBeInTheDocument();
  noNewGuide();
  catchTap("first-unit-guide-messenger");

  finishSegment(chat);
  finishSegment(second);
  expect(screen.getByTestId("first-unit-guide-call")).toBeInTheDocument();
  noNewGuide();
  catchTap("first-unit-guide-call");

  noNewGuide();
  expect(storage.guideWrites()).toHaveLength(0);
  expect(storage.store.has(guideSeenKey)).toBe(false);
});

// ------------------------------------------------------------ IG12

test("[IG12] 롤플레이 탭에서 연 메신저도 출처를 가리지 않고 한 번 뜨며 같은 키에 적힌다", async () => {
  const finished: AppJourneySeed = {
    completedStepCount: journeySteps.length,
    completedMessengerUnitIds: ["appointment-confirmation"],
    completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
    visualNovelProgress: { status: "completed", beatIndex: 2 },
    completedEpisodeFinalIds: ["tutorial-final-test"],
  };
  const open = (): void => {
    tap("ui-lynx-bottom-navigator-item-roleplay");
    tap("roleplay-list-item-appointment-confirmation");
  };

  const seen = newStorage({ seen: ["messenger"] });
  await boot(finished, seen);
  open();
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  expect(guideRoots()).toHaveLength(0);

  cleanup();
  vi.unstubAllGlobals();
  const unseen = newStorage();
  await boot(finished, unseen);
  open();
  expect(guide("messenger")).not.toBeNull();
  dismiss("messenger");
  expect(unseen.savedKinds()).toEqual(["messenger"]);
});

// ------------------------------------------------------------ IG13 · IG14

test("[IG13] 헬퍼 기본값은 안내를 본 설치다 — 옵션 없이 연 greeting · 메신저에 안내가 없다", async () => {
  await renderSignedInApp(
    <App
      completedEpisodeIntroIds={completedIntros}
      journeySeed={journeySeedBefore("directions")}
    />,
  );

  startSheet("greeting");
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
  expect(document.querySelector('[data-testid^="learning-item-guide-"]')).toBeNull();
  leaveShell();

  unit("appointment-confirmation");
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  expect(document.querySelector('[data-testid^="learning-item-guide-"]')).toBeNull();
});

test("[IG14] 저장값이 깨져 있으면 안내가 뜨고, 닫으면 정상 배열로 덮어쓴다", async () => {
  const storage = newStorage({ raw: "{bad" });
  await boot(greetingSeed, storage);

  startSheet("greeting");
  expect(guide("sentence-order")).not.toBeNull();
  dismiss("sentence-order");

  expect(storage.savedKinds()).toEqual(["sentence-order"]);
});
