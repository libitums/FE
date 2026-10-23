import { afterEach, expect, test, vi } from "vitest";
import { tapResultExit } from "./test-helpers/lesson-result";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { catalogFinalPlanOf } from "./catalog-final-model";
import type { CatalogRoleplayTurn } from "./catalog-final-model";
import { resetPushWiringForTests } from "./push-wiring";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { isTypedAnswerCorrect } from "../lib/hangul-keyboard";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { systemBackEventName } from "../lib/system-back";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { EPISODE_BANNER_HOLD_MS } from "../screens/catalog-cover/episode-banner";
import {
  legacyPassedRecord,
  legacyPassedSeed,
  tutorialDoneProgress,
} from "./test-helpers/progress-seed";
import { catalogNodeTestId } from "./test-helpers/map-unit-testid";

// `integration` 계층: 내장 u01 원문의 소리 id가 디코드 · 모델 · 화면 · 결선을 지나 실제 공개 버킷 주소
// 문자열로 호스트 `AudioPlaybackModule.play`에 닿는지, 소리가 실패해도 흐름 · 기록 · 이벤트가 같은지를
// 한 트리에서 봅니다. 대역은 경계뿐입니다 — `NativeModules`(저장소 · 시스템 뒤로 · 오디오) · `fetch` · env.

const supabaseUrl = "https://test.supabase.co";
const u01 = "u01-water";
const u02 = "u02-checkin";
const url = (id: string): string =>
  `${supabaseUrl}/storage/v1/object/public/content/audio/${id}.m4a`;

type Rpc = { readonly name: string; readonly body: Record<string, unknown> };
type Play = ReturnType<typeof vi.fn<(source: string, done: (result: unknown) => void) => void>>;

const refreshedBody = JSON.stringify({
  access_token: `e30.${btoa(JSON.stringify({ sub: "u" })).replace(/=+$/, "")}.sig`,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "u" },
});

const tutorialDoneSeed = legacyPassedSeed;

const tutorialDoneSnapshot = {
  version: 1,
  completedStepCount: legacyPassedRecord.completedStepCount,
  completedEpisodeIntroIds: ["tutorial-intro"],
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovel: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

const throughCult = {
  [u01]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT"],
  [u02]: [],
};

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const finalTurns = (episodeId: string): readonly CatalogRoleplayTurn[] => {
  const entry = realCatalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") throw new Error(`not ready: ${episodeId}`);
  return catalogFinalPlanOf(
    entry,
    1,
    (text, script) => fillPlaceholders(text, {}, script),
    (path) => path,
  ).turns;
};

type Booted = {
  readonly rpcs: Rpc[];
  readonly events: EpisodeIntroEvent[];
  readonly play: Play;
  readonly stop: ReturnType<typeof vi.fn<() => void>>;
};

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

type BootOptions = {
  readonly progress: Record<string, string[]>;
  readonly failAudio?: boolean;
  readonly backHost?: { readonly respond: (token: string, outcome: string) => void };
};

async function boot(options: BootOptions): Promise<Booted> {
  const store = new Map<string, string>();
  store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  const play: Play = vi.fn<(source: string, done: (result: unknown) => void) => void>();
  if (options.failAudio === true) play.mockImplementation((_source, done) => done("failed"));
  const stop = vi.fn<() => void>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    AudioPlaybackModule: { play, stop },
    ...(options.backHost === undefined
      ? {}
      : { SystemBackModule: { ready: vi.fn<() => void>(), respond: options.backHost.respond } }),
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

  const rpcs: Rpc[] = [];
  // 튜토리얼(u00)을 끝낸 진행을 함께 둡니다 — u01 표지가 열리려면 앞 에피소드를 끝냈어야 합니다.
  const snapshot = {
    ...tutorialDoneSnapshot,
    catalogProgress: { ...tutorialDoneProgress(), ...options.progress },
  };
  vi.stubGlobal("fetch", (target: string, init?: { body?: string }) => {
    if (target.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedBody });
    }
    if (isContentRequest(target)) return Promise.resolve(contentNotFoundResponse());
    const name = target.split("/rest/v1/rpc/")[1] ?? target;
    rpcs.push({ name, body: JSON.parse(init?.body ?? "{}") as Record<string, unknown> });
    const reply =
      name === "load_learning_progress"
        ? { status: 200, body: JSON.stringify(snapshot) }
        : name === "learning_streak" || name === "record_learning_days"
          ? { status: 200, body: "1" }
          : { status: 204, body: "" };
    return Promise.resolve({ status: reply.status, text: async () => reply.body });
  });

  const events: EpisodeIntroEvent[] = [];
  vi.useFakeTimers();
  render(
    <App progressSeed={tutorialDoneSeed} episodeIntroEventSink={(event) => events.push(event)} />,
  );
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await flush();
  return { rpcs, events, play, stop };
}

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const tapId = (id: string): void => void fireEvent.tap(screen.getByTestId(id), {});
const tapButtonIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});
const tapRoundIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-round-button"), {});
const cover = (episodeId: string) =>
  screen.getByTestId(`ui-lynx-special-unit-catalog-cover-${episodeId}`);
const unitNode = (episodeId: string, key: string) =>
  screen.getByTestId(catalogNodeTestId(episodeId, key));
const present = (id: string): boolean => screen.queryByTestId(id) !== null;
const tapNext = () => tapButtonIn("catalog-cover-screen-next");
const cutIndex = (): string | null =>
  screen.getByTestId("catalog-cover-screen").getAttribute("data-cut-index");

/** 컷 하나를 넘깁니다 — 타자기가 쓰는 중이면 먼저 대사를 완성합니다. */
function advanceCut(): void {
  const dialog = screen.queryByTestId("ui-lynx-visual-novel-dialog");
  if (dialog?.getAttribute("data-status") === "revealing") tapNext();
  tapNext();
}

function openCovers(episodeId: string): void {
  fireEvent.tap(cover(episodeId), {});
  tapButtonIn("episode-intro-screen-next");
}

const firstArgs = (play: Play): string[] => play.mock.calls.map((call) => call[0]);
const stopCalls = (stop: Booted["stop"]) => stop.mock.calls.length;

const savedProgress = (rpcs: readonly Rpc[]): Record<string, unknown>[] =>
  rpcs
    .filter((rpc) => rpc.name === "save_learning_progress")
    .map((rpc) => rpc.body["p_progress"] as Record<string, unknown>);
const savedUnits = (rpcs: readonly Rpc[], episodeId: string): string[] =>
  (savedProgress(rpcs).at(-1)?.["catalogProgress"] as Record<string, string[]> | undefined)?.[
    episodeId
  ] ?? [];

/** 표지 컷 여섯을 끝까지 읽고 배너 → 맵까지 갑니다. 컷 인덱스 열을 돌려줍니다. */
async function readCoverToMap(play: Play): Promise<{ indexes: string[]; playsAt: number[] }> {
  const indexes: string[] = [];
  const playsAt: number[] = [];
  vi.useFakeTimers();
  for (let i = 0; i < 6; i += 1) {
    indexes.push(cutIndex() ?? "");
    playsAt.push(play.mock.calls.length);
    advanceCut();
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByTestId("episode-banner-screen")).toHaveAttribute("data-kind", "start");
  expect(play.mock.calls.length).toBe(playsAt[5] ?? -1);
  act(() => {
    vi.advanceTimersByTime(EPISODE_BANNER_HOLD_MS);
  });
  vi.useRealTimers();
  await flush();
  return { indexes, playsAt };
}

function correctPlacement(turn: CatalogRoleplayTurn): number[] {
  const count = turn.tiles.length;
  const search = (placed: number[]): number[] | null => {
    if (placed.length === count) {
      const typed = placed.map((index) => turn.tiles[index]?.ko ?? "").join(" ");
      return turn.accepted.some((answer) => isTypedAnswerCorrect(typed, answer)) ? placed : null;
    }
    for (let index = 0; index < count; index += 1) {
      if (placed.includes(index)) continue;
      const found = search([...placed, index]);
      if (found !== null) return found;
    }
    return null;
  };
  const found = search([]);
  if (found === null) throw new Error(`no placement: ${turn.id}`);
  return found;
}

/** 한 턴을 놓고 `Check`까지 누릅니다(다음 걸음 버튼은 누르지 않습니다). */
function checkTurn(turn: CatalogRoleplayTurn, right: boolean): void {
  const order = correctPlacement(turn);
  for (const tile of right ? order : [...order].reverse()) tapId(`sentence-order-chip-${tile}`);
  tapButtonIn("catalog-final-screen-action");
}
const nextStep = () => tapButtonIn("catalog-final-screen-action");

const coverSounds = [url("u01-water/pre-3-v2"), url("u01-water/pre-4"), url("u01-water/pre-6-v2")];
const startEventNames: string[] = [
  "episode_intro_viewed",
  "episode_intro_continued",
  "episode_prologue_completed",
];
const startEvents = (events: readonly EpisodeIntroEvent[]) => events.map((event) => event.name);

test("EA1. u01 표지: 컷 3에서 pre-3-v2, 컷 4에서 pre-4, 컷 6에서 pre-6-v2가 실제 버킷 주소로 재생되고 다른 컷에서는 재생이 없으며 진행은 같다", async () => {
  const { play, stop, rpcs, events } = await boot({ progress: {} });

  openCovers(u01);
  const { indexes, playsAt } = await readCoverToMap(play);

  expect(indexes).toEqual(["0", "1", "2", "3", "4", "5"]);
  // 컷 i가 서 있는 동안 쌓인 재생 수: 컷 1 · 2는 0, 컷 3은 1, 컷 4에서 2, 컷 5는 그대로, 컷 6에서 3.
  expect(playsAt).toEqual([0, 0, 1, 2, 2, 3]);
  expect(firstArgs(play)).toEqual(coverSounds);
  expect(stopCalls(stop)).toBeGreaterThanOrEqual(1);
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(cover(u01)).toHaveAttribute("data-status", "clear");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("intro"));
  expect(startEvents(events)).toEqual(startEventNames);
});

test("EA2. 소리 중인 컷 3에서 머리 나가기 · 시스템 뒤로는 정지를 부르고 맵으로 나가며 진행을 기록하지 않는다", async () => {
  const respond = vi.fn<(token: string, outcome: string) => void>();
  const { play, stop, rpcs } = await boot({ progress: {}, backHost: { respond } });

  openCovers(u01);
  advanceCut();
  advanceCut();
  expect(cutIndex()).toBe("2");
  expect(firstArgs(play)).toEqual([coverSounds[0]]);
  const stopsBefore = stopCalls(stop);
  tapRoundIn("catalog-cover-screen-back");
  await flush();

  expect(stopCalls(stop)).toBeGreaterThan(stopsBefore);
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(cover(u01)).toHaveAttribute("data-status", "available");
  for (const snapshot of savedProgress(rpcs)) {
    expect(snapshot["catalogProgress"]).toBeUndefined();
  }

  openCovers(u01);
  advanceCut();
  advanceCut();
  const stopsBeforeBack = stopCalls(stop);
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, ["1"]);
  });
  await flush();

  expect(respond).toHaveBeenCalledWith("1", "handled");
  expect(stopCalls(stop)).toBeGreaterThan(stopsBeforeBack);
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(cover(u01)).toHaveAttribute("data-status", "available");
});

test("EA3. u01 최종 테스트: 상대 줄은 턴마다 자동, 내 줄은 정답 뒤에만, 오답은 추가 재생이 없다", async () => {
  const { play } = await boot({ progress: throughCult });
  const turns = finalTurns(u01);
  expect(turns).toHaveLength(3);

  fireEvent.tap(unitNode(u01, "RP"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(firstArgs(play)).toEqual([url("u01-water/d-01")]);
  checkTurn(turns[0] as CatalogRoleplayTurn, true);
  expect(firstArgs(play)).toEqual([url("u01-water/d-01"), url("u01-water/d-02")]);
  nextStep();
  expect(firstArgs(play).at(-1)).toBe(url("u01-water/d-03"));
  expect(play).toHaveBeenCalledTimes(3);

  checkTurn(turns[1] as CatalogRoleplayTurn, false);
  expect(screen.getByTestId("catalog-final-screen-verdict")).toBeInTheDocument();
  expect(play).toHaveBeenCalledTimes(3);
  nextStep();
  expect(firstArgs(play)).toEqual([
    url("u01-water/d-01"),
    url("u01-water/d-02"),
    url("u01-water/d-03"),
    url("u01-water/d-05"),
  ]);

  checkTurn(turns[2] as CatalogRoleplayTurn, true);
  expect(screen.getByTestId("catalog-final-screen-verdict")).toBeInTheDocument();
  expect(firstArgs(play).at(-1)).toBe(url("u01-water/d-06"));
  expect(play).toHaveBeenCalledTimes(5);
  nextStep();
  await flush();
  expect(present("lesson-complete-screen-title")).toBe(true);
  expect(play).toHaveBeenCalledTimes(5);
});

test("EA3b. 전부 맞힌 최종 테스트: 재생 열은 여섯이고 결과 뒤로는 통과 뒤 컷 3의 post-3만 더해지고 맵까지 그 밖의 재생이 없다", async () => {
  const { play, rpcs } = await boot({ progress: throughCult });
  const turns = finalTurns(u01);

  fireEvent.tap(unitNode(u01, "RP"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  for (const turn of turns) {
    checkTurn(turn, true);
    nextStep();
  }
  expect(firstArgs(play)).toEqual(
    ["d-01", "d-02", "d-03", "d-04", "d-05", "d-06"].map((name) => url(`u01-water/${name}`)),
  );
  expect(present("lesson-complete-screen-title")).toBe(true);

  vi.useFakeTimers();
  tapResultExit();
  expect(present("catalog-cover-screen")).toBe(true);
  for (let i = 0; i < 3; i += 1) advanceCut();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  act(() => {
    vi.advanceTimersByTime(EPISODE_BANNER_HOLD_MS);
  });
  vi.useRealTimers();
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(firstArgs(play)).toHaveLength(7);
  expect(firstArgs(play).at(-1)).toBe(url("u01-water/post-3"));
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("RP"));
});

test("EA4. 호스트가 즉시 실패를 알려도(오프라인 · 404) 컷은 저절로 넘어가지 않고 표지와 최종 테스트의 화면 열 · 기록이 같다", async () => {
  const { play, rpcs, events } = await boot({ progress: {}, failAudio: true });

  openCovers(u01);
  const { indexes } = await readCoverToMap(play);
  expect(indexes).toEqual(["0", "1", "2", "3", "4", "5"]);
  expect(firstArgs(play)).toEqual(coverSounds);
  expect(cover(u01)).toHaveAttribute("data-status", "clear");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("intro"));
  expect(startEvents(events)).toEqual(startEventNames);
});

test("EA4a. 컷 3에서 실패가 즉시 알려져도 그 컷에 남는다", async () => {
  const { play } = await boot({ progress: {}, failAudio: true });

  openCovers(u01);
  advanceCut();
  advanceCut();
  await flush();
  expect(cutIndex()).toBe("2");
  expect(play).toHaveBeenCalledTimes(1);
  expect(present("episode-banner-screen")).toBe(false);
});

test("EA4b. 실패하는 소리에도 최종 테스트는 같은 화면 열과 결과(오답 하나 포함)로 끝난다", async () => {
  const { play, rpcs } = await boot({ progress: throughCult, failAudio: true });
  const turns = finalTurns(u01);

  fireEvent.tap(unitNode(u01, "RP"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  const phases: (string | null)[] = [];
  const phase = () => screen.getByTestId("catalog-final-screen").getAttribute("data-phase");
  turns.forEach((turn, index) => {
    phases.push(phase());
    checkTurn(turn, index !== 1);
    phases.push(phase());
    nextStep();
  });

  expect(phases).toEqual(["arranging", "checked", "arranging", "checked", "arranging", "checked"]);
  expect(firstArgs(play).length).toBeGreaterThanOrEqual(3);
  expect(present("lesson-complete-screen-title")).toBe(true);
  expect(everRecorded(rpcs)).toBe(false);
});

const everRecorded = (rpcs: readonly Rpc[]): boolean => savedUnits(rpcs, u01).includes("RP");

test("EA5. (개정 A) u02 표지: 컷 1 · 2 · 3 · 5가 u02 버킷 주소로 재생되고 소리 id가 없는 컷은 조용하다", async () => {
  const { play } = await boot({
    progress: { [u01]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"] },
  });

  fireEvent.tap(cover(u02), {});
  tapButtonIn("episode-intro-screen-next");
  expect(cutIndex()).toBe("0");
  expect(firstArgs(play)).toEqual([url("u02-checkin/pre-1-far")]);
  advanceCut();
  advanceCut();
  expect(cutIndex()).toBe("2");
  expect(firstArgs(play)).toEqual([
    url("u02-checkin/pre-1-far"),
    url("u02-checkin/pre-2"),
    url("u02-checkin/pre-3"),
  ]);
  advanceCut();
  advanceCut();
  expect(cutIndex()).toBe("4");
  expect(firstArgs(play)).toEqual([
    url("u02-checkin/pre-1-far"),
    url("u02-checkin/pre-2"),
    url("u02-checkin/pre-3"),
    url("u02-checkin/d-01"),
  ]);
});
