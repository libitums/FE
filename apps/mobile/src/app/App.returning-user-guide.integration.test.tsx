import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { productJourneySeed } from "./journey-progress";
import { learningProgressSnapshotFrom } from "./learning-progress";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";

const token = `e30.${btoa(JSON.stringify({ sub: "returning-learner" }))}.sig`;
const empty = learningProgressSnapshotFrom({ ...productJourneySeed, completedEpisodeIntroIds: [] });
type Reply = { status: number; body: string };

function deferred() {
  let resolve!: (reply: Reply) => void;
  const promise = new Promise<Reply>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function expectNoGuide() {
  expect(screen.queryByTestId("first-unit-guide-map")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-scroll")).not.toHaveAttribute(
    "enable-scroll",
    "false",
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("재방문 기록 조회가 늦어도 맵과 다시 연 스토리에 신규 가이드가 뜨지 않는다", async () => {
  const response = deferred();
  await renderSignedInApp(<App />, {
    refreshedAccessToken: token,
    keepFakeTimers: true,
    loadProgress: () => response.promise,
  });
  expectNoGuide();
  await act(async () =>
    response.resolve({
      status: 200,
      body: JSON.stringify({ ...empty, completedEpisodeIntroIds: ["tutorial-intro"] }),
    }),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expectNoGuide();
  expect(screen.getByTestId("ui-lynx-learning-unit-tutorial-intro")).toHaveAttribute(
    "data-status",
    "clear",
  );
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-tutorial-intro"), {});
  fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(screen.queryByTestId("first-unit-guide-story")).not.toBeInTheDocument();
});

test("조회가 끝나 실제로 기록이 없는 사용자에게만 첫 가이드를 표시한다", async () => {
  const response = deferred();
  await renderSignedInApp(<App />, {
    refreshedAccessToken: token,
    keepFakeTimers: true,
    loadProgress: () => response.promise,
  });
  expectNoGuide();
  await act(async () => {
    response.resolve({ status: 200, body: "null" });
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByTestId("first-unit-guide-map")).toBeInTheDocument();
});

test.each([
  { status: 503, body: "" },
  { status: 200, body: "{bad-json" },
  { status: 200, body: JSON.stringify({ version: 2 }) },
])("기록 조회 실패·잘못된 응답은 신규 사용자로 취급하지 않는다: %j", async (reply) => {
  await renderSignedInApp(<App />, {
    refreshedAccessToken: token,
    keepFakeTimers: true,
    loadProgress: async () => reply,
  });
  expectNoGuide();
});

test("초기 조회 실패 뒤 자동 재시도로 불러온 학습 기록에도 가이드를 표시하지 않는다", async () => {
  let attempts = 0;
  await renderSignedInApp(<App />, {
    refreshedAccessToken: token,
    keepFakeTimers: true,
    loadProgress: async () => {
      attempts++;
      return attempts === 1
        ? { status: 503, body: "" }
        : { status: 200, body: JSON.stringify({ ...empty, completedStepCount: 1 }) };
    },
  });
  expectNoGuide();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1_000);
  });
  expect(attempts).toBe(2);
  expectNoGuide();
});

test("미완료 이야기의 진행 기록이 있어도 신규 사용자 가이드를 표시하지 않는다", async () => {
  await renderSignedInApp(<App />, {
    refreshedAccessToken: token,
    keepFakeTimers: true,
    loadProgress: async () => ({
      status: 200,
      body: JSON.stringify({ ...empty, visualNovel: { status: "active", beatIndex: 1 } }),
    }),
  });
  expectNoGuide();
});

test("서버가 비어 있어도 재실행 시 복구한 미전송 학습 기록으로 가이드를 숨긴다", async () => {
  const store = new Map([
    [authSessionStorageKey, serializeAuthSession(signedInBootSession)],
    [
      "libitum.progress.pending.returning-learner",
      JSON.stringify({ ...empty, completedStepCount: 1 }),
    ],
  ]);
  await renderSignedInApp(<App />, {
    refreshedAccessToken: token,
    keepFakeTimers: true,
    storageModule: {
      get: (key) => store.get(key) ?? null,
      set: (key, value) => {
        store.set(key, value);
      },
      remove: (key) => {
        store.delete(key);
      },
    },
    loadProgress: async () => ({ status: 200, body: "null" }),
  });
  expectNoGuide();
});
