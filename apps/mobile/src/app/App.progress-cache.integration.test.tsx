import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { emptyJourneyProgress, learningProgressSnapshotFrom } from "./learning-progress";
import { resetPushWiringForTests } from "./push-wiring";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import type { ProgressLoadEvent } from "../lib/progress-load-event.contract";
import { uiCopyEn } from "../lib/ui-copy-en";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";
import { mapUnitTestId } from "./test-helpers/map-unit-testid";

// 「기기 저장본 → 맵 · 확인 중 · 로딩 줄 → 서버 응답」을 App 한 트리에서 봅니다(I1 ~ I13, I6' · I7' · I-T1).
// 대역은 경계뿐입니다 - `StorageModule`(연산을 기록하는 저장소) · `fetch`(Supabase 갱신 · 학습 RPC · 계정 삭제 함수) ·
// 낭독 모듈 · `episodeIntroEventSink`. 문구 기대값은 `uiCopyEn.progressLoad`를 읽습니다.

const copy = uiCopyEn.progressLoad;
const user = "u";

type Reply = { status: number; body: string };
const ok = (body: unknown): Reply => ({ status: 200, body: JSON.stringify(body) });
const down: Reply = { status: 503, body: "" };

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const accessToken = `${base64Url({ alg: "none" })}.${base64Url({
  sub: user,
  app_metadata: { provider: "google", providers: ["google"] },
})}.sig`;

const empty = learningProgressSnapshotFrom(emptyJourneyProgress);
const U00 = "u00-tutorial";
const COVER = `catalog-cover-${U00}`;
const snap = (override: Record<string, unknown> = {}) => ({ ...empty, ...override });
const cachedKey = (u: string) => `libitum.progress.cached.${u}`;
const pendingKey = (u: string) => `libitum.progress.pending.${u}`;
/** u00에서 끝낸 유닛 키(표지는 `intro`)로 만든 진행입니다. */
const progressOf = (done: readonly string[]) => snap({ catalogProgress: { [U00]: done } });

function deferred() {
  let resolve!: (reply: Reply) => void;
  const promise = new Promise<Reply>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

type Env = {
  store: Map<string, string>;
  ops: { op: "get" | "set" | "remove"; key: string }[];
  rpcs: { name: string; body: Record<string, unknown> }[];
  announced: string[];
  events: ProgressLoadEvent[];
  load: () => Promise<Reply>;
  loads: () => number;
};

type BootOptions = {
  readonly store?: Map<string, string>;
  readonly seed?: Record<string, string>;
  readonly load?: () => Promise<Reply>;
  /** false면 부팅이 끝난 뒤 실제 타이머로 돌려놓습니다(설정 · 삭제 · 재실행 흐름). 기본은 가짜 타이머를 남깁니다. */
  readonly fake?: boolean;
};

const env: Env = {
  store: new Map(),
  ops: [],
  rpcs: [],
  announced: [],
  events: [],
  load: async () => ok(null),
  loads: () => env.rpcs.filter((rpc) => rpc.name === "load_learning_progress").length,
};

async function boot(options: BootOptions = {}): Promise<void> {
  const fake = options.fake ?? true;
  env.store = options.store ?? new Map<string, string>();
  for (const [key, value] of Object.entries(options.seed ?? {})) env.store.set(key, value);
  if (!env.store.has(authSessionStorageKey)) {
    env.store.set(
      authSessionStorageKey,
      serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
    );
  }
  env.store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  env.ops = [];
  env.rpcs = [];
  env.announced = [];
  env.events = [];
  env.load = options.load ?? (async () => ok(null));

  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => {
        env.ops.push({ op: "get", key });
        return env.store.get(key) ?? null;
      },
      set: (key: string, value: string) => {
        env.ops.push({ op: "set", key });
        env.store.set(key, value);
      },
      remove: (key: string) => {
        env.ops.push({ op: "remove", key });
        env.store.delete(key);
      },
    },
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: () => void) => {
        env.announced.push(args.content);
        callback();
      },
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubGlobal("fetch", async (url: string, init?: { body?: string }) => {
    if (isContentRequest(url)) return contentNotFoundResponse();
    if (url.includes("grant_type=refresh_token")) {
      return {
        status: 200,
        text: async () =>
          JSON.stringify({
            access_token: accessToken,
            refresh_token: "refreshed-refresh",
            expires_in: 3600,
            token_type: "bearer",
            user: { id: user },
          }),
      };
    }
    if (url.includes("/auth/v1/logout") || url.includes("/functions/v1/delete-account")) {
      return { status: 204, text: async () => "" };
    }
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    const body = init?.body === undefined ? {} : (JSON.parse(init.body) as Record<string, unknown>);
    env.rpcs.push({ name, body });
    const reply: Reply =
      name === "load_learning_progress"
        ? await env.load()
        : name === "learning_streak" || name === "record_learning_days"
          ? { status: 200, body: "0" }
          : { status: 204, body: "" };
    return { status: reply.status, text: async () => reply.body };
  });

  vi.useFakeTimers();
  render(
    <App
      episodeIntroEventSink={(event) => {
        if (event.name.startsWith("progress_load")) env.events.push(event as ProgressLoadEvent);
      }}
    />,
  );
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  if (!fake) {
    vi.useRealTimers();
    await flush();
  }
}

async function flush(): Promise<void> {
  await act(async () => {
    if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(0);
    else await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
async function advance(ms: number): Promise<void> {
  await act(async () => {
    if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(ms);
    else await new Promise((resolve) => setTimeout(resolve, ms));
  });
}
async function respond(pending: ReturnType<typeof deferred>, reply: Reply): Promise<void> {
  pending.resolve(reply);
  await flush();
  await flush();
}

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------- 조회 도구

const unit = (id: string) => screen.getByTestId(mapUnitTestId(id));
const status = (id: string) => unit(id).getAttribute("data-status");
const row = () => screen.queryByTestId("journey-progress-load-row");
const rowStatus = () => row()?.getAttribute("data-status") ?? null;
const retryButton = () =>
  within(screen.getByTestId("journey-progress-load-row-retry")).getByTestId("ui-lynx-button");
const checkingNodes = () =>
  screen
    .queryAllByTestId(/^ui-lynx-(?:learning|special)-unit-/)
    .filter((node) => node.getAttribute("data-status") === "checking");
const announcedCount = (content: string) =>
  env.announced.filter((entry) => entry === content).length;
const lesson = (key: string) => `catalog-unit-${U00}-${key}`;
const cachedOf = (u: string) => {
  const raw = env.store.get(cachedKey(u));
  return raw === undefined ? undefined : (JSON.parse(raw) as Record<string, unknown>);
};
const openSettings = () =>
  void fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
const openJourney = () =>
  void fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
const cell = (id: string) =>
  within(screen.getByTestId(`ui-lynx-settings-group-item-${id}`)).getByTestId(
    "ui-lynx-settings-cell",
  );
const dialogAction = (id: string) =>
  within(screen.getByTestId(`ui-lynx-dialog-action-${id}`)).getByTestId("ui-lynx-button");
const onLogin = () =>
  vi.waitFor(() => expect(screen.getByTestId("login-screen-title")).toBeTruthy());
const tapButtonIn = (testId: string) =>
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});

// ---------------------------------------------------------------- 저장본이 있는 부팅

describe("저장본 먼저", () => {
  test("I1. 저장본을 응답 전에 그리고, 서버 응답 뒤에도 앞의 진행이 사라지지 않는다", async () => {
    const server = deferred();
    await boot({
      seed: { [cachedKey(user)]: JSON.stringify(progressOf(["intro", "S1", "S2"])) },
      load: () => server.promise,
    });

    expect(status(COVER)).toBe("clear");
    expect(status(lesson("S1"))).toBe("clear");
    expect(status(lesson("S2"))).toBe("clear");
    expect(status(lesson("S3"))).toBe("available");
    expect(row()).toBeNull();
    await advance(5_000);
    expect(row()).toBeNull();
    expect(checkingNodes()).toHaveLength(0);

    await respond(server, ok(progressOf(["intro", "S1", "S2", "S3"])));
    expect(status(lesson("S3"))).toBe("clear");
    expect(status(lesson("S1"))).toBe("clear");
    expect(status(lesson("S2"))).toBe("clear");
    expect(status(COVER)).toBe("clear");
    expect(row()).toBeNull();
  });

  test("I2. 저장본이 있으면 조회가 계속 실패해도 줄이 없고 표지를 눌러 학습을 시작한다", async () => {
    await boot({
      seed: { [cachedKey(user)]: JSON.stringify(empty) },
      load: async () => ({ status: 500, body: "" }),
    });
    await advance(60_000);

    expect(row()).toBeNull();
    expect(checkingNodes()).toHaveLength(0);
    fireEvent.tap(unit(COVER), {});
    expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  });

  test("I3. 저장본의 카탈로그 순서가 서버와 달라도 저장을 다시 보내지 않는다", async () => {
    await boot({
      seed: {
        [cachedKey(user)]: JSON.stringify(snap({ catalogProgress: { u01: ["intro", "S1"] } })),
      },
      load: async () => ok(snap({ catalogProgress: { u01: ["S1", "intro"] } })),
    });
    await advance(1_000);

    expect(env.loads()).toBeGreaterThanOrEqual(1);
    expect(env.rpcs.filter((rpc) => rpc.name === "save_learning_progress")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- 저장본이 없는 부팅

describe("저장본 없음 - 확인 중 · 로딩 줄", () => {
  test("I4. 노드가 확인 중이고 눌러도 열리지 않으며, 1초에 줄이 서고 낭독 · 측정이 한 번이다", async () => {
    const server = deferred();
    await boot({ load: () => server.promise });

    expect(status(COVER)).toBe("checking");
    expect(status(lesson("S1"))).toBe("checking");
    fireEvent.tap(unit(COVER), {});
    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("episode-intro-screen")).toBeNull();

    await advance(999);
    expect(row()).toBeNull();
    await advance(1);
    expect(rowStatus()).toBe("loading");
    expect(announcedCount(copy.loadingAnnouncement)).toBe(1);
    expect(env.events.filter((event) => event.name === "progress_load_delayed")).toHaveLength(1);
    expect(status(COVER)).toBe("checking");

    await respond(server, ok(null));
    expect(row()).toBeNull();
    expect(status(COVER)).toBe("available");
  });

  test("I5. 500ms에 응답이 오면 줄이 한 번도 서지 않고 낭독 · 측정이 없다", async () => {
    const server = deferred();
    await boot({ load: () => server.promise });

    await advance(499);
    expect(row()).toBeNull();
    expect(status(COVER)).toBe("checking");
    expect(screen.queryByTestId("top-bar-trophy")).toBeNull();
    await respond(server, ok(null));
    await advance(1);
    expect(row()).toBeNull();
    await advance(500);
    expect(row()).toBeNull();
    await advance(2_000);
    expect(row()).toBeNull();
    expect(env.announced).toHaveLength(0);
    expect(env.events).toHaveLength(0);
  });

  test("I6. 조회 실패는 1초를 기다리지 않고 실패 줄을 서며 자동 재시도에도 반복하지 않는다", async () => {
    await boot({ load: async () => down });

    expect(rowStatus()).toBe("failed");
    expect(screen.getByTestId("journey-progress-load-row-retry")).toBeInTheDocument();
    expect(announcedCount(copy.failed)).toBe(1);
    expect(env.events).toEqual([{ name: "progress_load_failed", attempt: "first" }]);

    await advance(1_000);
    await advance(5_000);
    expect(env.loads()).toBeGreaterThanOrEqual(2);
    expect(rowStatus()).toBe("failed");
    expect(announcedCount(copy.failed)).toBe(1);
    expect(env.events).toHaveLength(1);
  });

  test("I6'. 조회가 실패하면 u00 표지가 열려 탭하면 표지 화면이 열린다 - 나머지는 잠김", async () => {
    await boot({ load: async () => down });

    expect(rowStatus()).toBe("failed");
    expect(checkingNodes()).toHaveLength(0);
    expect(status(COVER)).toBe("available");
    expect(status(lesson("S1"))).not.toBe("checking");
    expect(status(lesson("S1"))).not.toBe("clear");
    expect(status(lesson("S1"))).not.toBe("available");

    fireEvent.tap(unit(COVER), {});
    expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  });

  test("I7. 실패 줄의 Try again을 누르면 줄이 로딩으로 바뀌고(로딩 문구 한 번) 성공하면 채워진다", async () => {
    await boot({ load: async () => down });
    const loadsBefore = env.loads();
    const retry = deferred();
    env.load = () => retry.promise;

    fireEvent.tap(retryButton(), {});
    await flush();

    expect(rowStatus()).toBe("loading");
    expect(env.loads()).toBe(loadsBefore + 1);
    expect(announcedCount(copy.failed)).toBe(1);
    expect(announcedCount(copy.loadingAnnouncement)).toBe(1);

    await respond(retry, ok(progressOf(["intro", "S1", "S2"])));
    expect(row()).toBeNull();
    expect(status(COVER)).toBe("clear");
    expect(status(lesson("S2"))).toBe("clear");
    expect(status(lesson("S3"))).toBe("available");
    expect(env.events.at(-1)).toEqual({ name: "progress_load_recovered", trigger: "manual" });
  });

  test("I7'. 다시 시도로 줄이 로딩인 동안에도 표지 노드는 열려 있고 성공하면 서버 진행이 반영된다", async () => {
    await boot({ load: async () => down });
    const retry = deferred();
    env.load = () => retry.promise;

    fireEvent.tap(retryButton(), {});
    await flush();

    expect(rowStatus()).toBe("loading");
    expect(checkingNodes()).toHaveLength(0);
    expect(status(COVER)).toBe("available");
    await advance(2_000);
    expect(rowStatus()).toBe("loading");
    expect(status(COVER)).toBe("available");

    await respond(retry, ok(progressOf(["intro", "S1"])));
    expect(row()).toBeNull();
    expect(status(COVER)).toBe("clear");
    expect(status(lesson("S1"))).toBe("clear");
  });

  test("I7b. 다시 시도가 또 실패하면 실패 줄로 돌아와 한 번 더 읽고 retry 실패를 알린다", async () => {
    await boot({ load: async () => down });

    fireEvent.tap(retryButton(), {});
    await flush();
    await flush();

    expect(rowStatus()).toBe("failed");
    expect(announcedCount(copy.failed)).toBe(2);
    expect(env.events).toEqual([
      { name: "progress_load_failed", attempt: "first" },
      { name: "progress_load_failed", attempt: "retry" },
    ]);
  });

  test("I7c. 자동 재시도(5초 이내)가 성공하면 줄이 사라지고 recovered auto를 알린다", async () => {
    await boot({ load: async () => down });
    env.load = async () => ok(progressOf(["intro", "S1"]));
    expect(rowStatus()).toBe("failed");

    await advance(1_000);
    await flush();

    expect(row()).toBeNull();
    expect(status(COVER)).toBe("clear");
    expect(env.events.at(-1)).toEqual({ name: "progress_load_recovered", trigger: "auto" });
  });

  test("I11. 실패 줄이 선 채 설정 탭을 다녀오면 줄이 다시 서서 다시 읽지만 측정은 다시 세지 않는다", async () => {
    await boot({ load: async () => down });
    expect(announcedCount(copy.failed)).toBe(1);

    openSettings();
    expect(screen.queryByTestId("journey-map-screen")).toBeNull();
    openJourney();
    await flush();

    expect(rowStatus()).toBe("failed");
    expect(announcedCount(copy.failed)).toBe(2);
    expect(env.events).toHaveLength(1);
  });

  test("I-T1. 응답 전에는 트로피 칩이 없고 머리 띠도 없다(자리 막대 없음), 응답 뒤 트로피 칩이 선다", async () => {
    const server = deferred();
    await boot({ load: () => server.promise });

    expect(screen.queryByTestId("top-bar-trophy")).toBeNull();
    // spec §20: 띠는 말풍선이 열린 동안만 선다 - 확인 중엔 노드를 못 눌러 띠가 없다.
    expect(screen.queryAllByTestId("ui-lynx-episode-header")).toHaveLength(0);
    expect(screen.queryAllByTestId("ui-lynx-episode-header-count-placeholder")).toHaveLength(0);

    await respond(server, ok(null));
    expect(screen.getByTestId("top-bar-trophy")).toBeInTheDocument();
    expect(screen.queryAllByTestId("ui-lynx-episode-header")).toHaveLength(0);
  });

  test("I12. 첫 유닛 안내는 응답 뒤에 뜬다 - 확인 중에는 없다", async () => {
    const server = deferred();
    await boot({ load: () => server.promise });
    await advance(2_000);

    expect(screen.queryByTestId("first-unit-guide-map")).toBeNull();

    await respond(server, ok(null));
    expect(screen.getByTestId("first-unit-guide-map")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- 사용자 경계 · 재실행

describe("저장본의 수명", () => {
  test("I8. 계정 삭제가 성공하면 그 사용자의 저장본을 지운다", async () => {
    await boot({
      fake: false,
      seed: {
        [cachedKey(user)]: JSON.stringify(progressOf(["intro"])),
        [cachedKey("other")]: JSON.stringify(progressOf(["intro", "S1"])),
      },
    });
    expect(env.store.has(cachedKey(user))).toBe(true);

    openSettings();
    fireEvent.tap(cell("delete-account"), {});
    fireEvent.tap(dialogAction("delete"), {});
    await onLogin();

    expect(env.store.has(cachedKey(user))).toBe(false);
    expect(env.store.has(cachedKey("other"))).toBe(true);
  });

  test("I9. 로그아웃은 저장본을 남기고 로그인 화면으로 간다", async () => {
    await boot({ fake: false, seed: { [cachedKey(user)]: JSON.stringify(progressOf(["intro"])) } });

    openSettings();
    fireEvent.tap(cell("sign-out"), {});
    fireEvent.tap(dialogAction("sign-out"), {});
    await onLogin();

    expect(env.store.has(cachedKey(user))).toBe(true);
  });

  test("I10. 진행을 저장한 뒤 다시 켜면 응답 전에 그 진행이 서고 확인 중도 줄도 없다", async () => {
    await boot({ fake: false, load: async () => ok(null) });
    expect(env.store.has(cachedKey(user))).toBe(true);

    fireEvent.tap(unit(COVER), {});
    tapButtonIn("episode-intro-screen-skip");
    tapButtonIn("ui-lynx-dialog-action-skip");
    await vi.waitFor(() =>
      expect(cachedOf(user)?.["catalogProgress"]).toEqual({ [U00]: ["intro"] }),
    );
    expect(env.store.has(pendingKey(user))).toBe(false);

    const store = env.store;
    cleanup();
    resetPushWiringForTests();
    const server = deferred();
    await boot({ fake: false, store, load: () => server.promise });

    expect(status(COVER)).toBe("clear");
    expect(checkingNodes()).toHaveLength(0);
    expect(row()).toBeNull();
  });
});

// ---------------------------------------------------------------- 가드

describe("기존 동작 그대로", () => {
  test("I13. 진행을 조회하지 않는 부팅(JWT 아닌 토큰)은 씨앗 그대로이고 확인 중도 줄도 없다", async () => {
    await renderSignedInApp(
      <App progressSeed={{ catalogProgress: { [U00]: ["intro", "S1", "S2"] } }} />,
      { keepFakeTimers: true },
    );
    await advance(5_000);

    expect(status(COVER)).toBe("clear");
    expect(status(lesson("S2"))).toBe("clear");
    expect(status(lesson("S3"))).toBe("available");
    expect(checkingNodes()).toHaveLength(0);
    expect(row()).toBeNull();
  });
});
