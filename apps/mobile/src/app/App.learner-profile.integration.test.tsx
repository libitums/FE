import { legacyPassedSeed, legacyPassedRecord } from "./test-helpers/progress-seed";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { catalogLessonPlanOf } from "./catalog-lesson-plan";
import type { CatalogActivity } from "./catalog-lesson-plan";
import { resetPushWiringForTests } from "./push-wiring";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import { guestLearnerProfileKey, learnerProfileCacheKey } from "../lib/learner-profile-cache";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { systemBackEventName } from "../lib/system-back";
import { uiCopyEn } from "../lib/ui-copy-en";
import { EPISODE_BANNER_HOLD_MS } from "../screens/catalog-cover/episode-banner";
import { catalogNodeTestId } from "./test-helpers/map-unit-testid";

// `integration` 계층(3d-2 · 2026-10-20 개정): 이름 · 나라가 「가입 -> ① 이름 -> ② 나라 -> 업로드」(에피소드 전 묻기는
// 걷혔습니다 — ADR-0059 D7), 「설정 수정 -> 다음 레슨부터 새 값」, 「서버 404 · 오프라인 -> 기기 캐시」, 「다른 기기 -> 서버 값」,
// 「계정 삭제 -> 캐시 삭제」를 지나 화면에 서는 것을 한 트리에서 봅니다. 대역은 경계뿐입니다 - `NativeModules`(저장소 ·
// 웹 인증 · 시스템 뒤로) · `fetch`(Supabase) · `vi.stubEnv`. 카탈로그 · 나라 표 · 치환 · 동기화는 실물입니다.
// 이름 · 나라 토큰이 화면에 서는 곳은 실데이터에서 u02 · u03의 최종 테스트뿐이라 값은 거기서 읽습니다.

const supabaseUrl = "https://test.supabase.co";
const copy = uiCopyEn.learnerProfile;
const u01 = "u01-water";
const u02 = "u02-checkin";
const u03 = "u03-mina";
const sessionSub = "u";
const profileCacheKey = learnerProfileCacheKey(sessionSub);
const profileKeyPrefix = "libitum.learner-profile.";

type Rpc = { readonly name: string; readonly body: Record<string, unknown> };
type Mode = "ok" | "missing" | "offline";
type Record2 = { readonly name: string; readonly countryCode: string };
type Server = {
  profile: Record2 | null;
  load: Mode;
  save: Mode;
  /** 있으면 조회 응답이 이 약속이 풀릴 때까지 늦습니다. */
  loadGate: Promise<void> | null;
  /** 소셜 로그인이 내는 세션의 사용자입니다. */
  pkceSub: string;
  /** 있으면 소셜 세션 토큰의 `user_metadata.full_name`입니다. */
  pkceFullName?: string;
};
type NamedEvent = { readonly name: string };
type Events = { episode: NamedEvent[]; settings: NamedEvent[]; entry: NamedEvent[] };

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

function jwtFor(sub: string, fullName?: string): string {
  const payload =
    fullName === undefined ? { sub } : { sub, user_metadata: { full_name: fullName } };
  return `e30.${btoa(JSON.stringify(payload)).replace(/=+$/, "")}.sig`;
}
const sessionBody = (sub: string, fullName?: string): string =>
  JSON.stringify({
    access_token: jwtFor(sub, fullName),
    refresh_token: `refresh-${sub}`,
    expires_in: 3600,
    token_type: "bearer",
    user: { id: sub },
  });

// ---------------------------------------------------------------- 진행 씨앗

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});

function readyIn(episodeId: string): Extract<CatalogEntry, { status: "ready" }> {
  const entry = realCatalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") throw new Error(`not ready: ${episodeId}`);
  return entry;
}
const unitIds = (episodeId: string): string[] => readyIn(episodeId).episode.units.map((u) => u.id);
/** 표지 · 레슨 · 최종 테스트까지 끝낸 에피소드입니다. */
const finished = (episodeId: string): string[] => ["intro", ...unitIds(episodeId), "RP"];
/** 레슨을 다 끝내 최종 테스트(RP)가 열려 있는 에피소드입니다. */
const beforeFinal = (episodeId: string): string[] => ["intro", ...unitIds(episodeId)];

const toFinalOfU02 = { [u01]: finished(u01), [u02]: beforeFinal(u02) };
const toFinalOfU03 = { [u01]: finished(u01), [u02]: finished(u02), [u03]: beforeFinal(u03) };
const atU02Cover = { [u01]: finished(u01) };
const atU02S1 = { [u01]: finished(u01), [u02]: ["intro"] };

const fill = (text: string, script: Parameters<typeof fillPlaceholders>[2]) =>
  fillPlaceholders(text, {}, script);
function firstActivityOf(episodeId: string, key: string): CatalogActivity {
  const plan = catalogLessonPlanOf(readyIn(episodeId), key, fill, () => null);
  const activity = plan?.activities[0];
  if (activity === undefined) throw new Error(`no activity: ${episodeId}/${key}`);
  return activity;
}
const contentIdOf: Record<CatalogActivity["form"], string> = {
  "word-choice": "word-choice-screen-content",
  listening: "listening-screen-content",
  "sentence-order": "sentence-order-screen-content",
  typing: "typing-activity-content",
  "vocab-card": "vocab-card-content",
  "pair-match": "pair-match-content",
  "culture-card": "culture-card-content",
  "syllable-build": "syllable-build-content",
  "read-aloud": "read-aloud-content",
  "speak-word": "speak-word-content",
};

// ---------------------------------------------------------------- 부팅

type BootOptions = {
  readonly signedIn?: boolean;
  readonly progress?: Record<string, string[]>;
  readonly preStore?: Record<string, string>;
  readonly store?: Map<string, string>;
  readonly server?: Partial<Server>;
  readonly backHost?: { readonly respond: (token: string, outcome: string) => void };
};

type Booted = {
  readonly rpcs: Rpc[];
  readonly events: Events;
  readonly store: Map<string, string>;
  readonly server: Server;
};

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function reply(status: number, body = "") {
  return Promise.resolve({ status, text: async () => body });
}

async function boot(options: BootOptions = {}): Promise<Booted> {
  const signedIn = options.signedIn ?? true;
  const store = options.store ?? new Map<string, string>(Object.entries(options.preStore ?? {}));
  if (signedIn && !store.has(authSessionStorageKey)) {
    store.set(
      authSessionStorageKey,
      serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
    );
  }
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  const server: Server = {
    profile: null,
    load: "ok",
    save: "ok",
    loadGate: null,
    pkceSub: sessionSub,
    ...options.server,
  };
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    AudioPlaybackModule: {
      play: vi.fn<(source: string, done: (result: unknown) => void) => void>(),
      stop: vi.fn<() => void>(),
    },
    WebAuthenticationModule: {
      randomBytes: () => "7418dfb49799e0254ffa607dd8adbbba16d4254d69d6bff05b58055853848d79",
      start: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({ status: "completed", callbackUrl: "duru://auth-callback?code=abc" }),
    },
    ...(options.backHost === undefined
      ? {}
      : { SystemBackModule: { ready: vi.fn<() => void>(), respond: options.backHost.respond } }),
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

  const rpcs: Rpc[] = [];
  const snapshot =
    options.progress === undefined
      ? null
      : { ...tutorialDoneSnapshot, catalogProgress: options.progress };
  vi.stubGlobal("fetch", (url: string, init?: { body?: string }) => {
    if (url.includes("grant_type=refresh_token")) return reply(200, sessionBody(sessionSub));
    if (url.includes("grant_type=pkce")) {
      return reply(200, sessionBody(server.pkceSub, server.pkceFullName));
    }
    if (isContentRequest(url)) return Promise.resolve(contentNotFoundResponse());
    if (url.includes("/auth/v1/logout")) return reply(204);
    if (url.includes("/functions/v1/delete-account")) return reply(204);
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    const body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
    rpcs.push({ name, body });
    if (name === "load_learning_progress") return reply(200, JSON.stringify(snapshot));
    if (name === "learning_streak" || name === "record_learning_days") return reply(200, "1");
    if (name === "load_learner_profile") {
      const answer = () => {
        if (server.load === "offline") return Promise.reject(new Error("offline"));
        if (server.load === "missing") return reply(404);
        return reply(200, JSON.stringify(server.profile));
      };
      return server.loadGate === null ? answer() : server.loadGate.then(answer);
    }
    if (name === "save_learner_profile") {
      if (server.save === "offline") return Promise.reject(new Error("offline"));
      if (server.save === "missing") return reply(404);
      server.profile = {
        name: String(body["p_name"]),
        countryCode: String(body["p_country_code"]),
      };
      return reply(204);
    }
    return reply(204);
  });

  const events: Events = { episode: [], settings: [], entry: [] };
  vi.useFakeTimers();
  render(
    <App
      progressSeed={tutorialDoneSeed}
      episodeIntroEventSink={(event) => events.episode.push(event)}
      settingsEventSink={(event) => events.settings.push(event)}
      entryEventSink={(event) => events.entry.push(event)}
    />,
  );
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await flush();
  return { rpcs, events, store, server };
}

const rejections: unknown[] = [];
const onRejection = (reason: unknown): void => void rejections.push(reason);

beforeEach(() => {
  rejections.length = 0;
  process.on("unhandledRejection", onRejection);
});

afterEach(() => {
  process.off("unhandledRejection", onRejection);
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------- 조작 · 관찰 헬퍼

const tapId = (id: string): void => void fireEvent.tap(screen.getByTestId(id), {});
const tapButtonIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});
const node = (episodeId: string, key: string) =>
  screen.getByTestId(catalogNodeTestId(episodeId, key));
// 열린 노드를 누르면 말풍선이 서고 `Start`가 유닛을 엽니다. 잠긴 노드는 말풍선이 없어 누름으로 끝납니다.
const tapNode = (episodeId: string, key: string): void => {
  fireEvent.tap(node(episodeId, key), {});
  const start = screen.queryByTestId("step-sheet-start");
  if (start !== null) fireEvent.tap(start, {});
};
const tapCover = (episodeId: string): void =>
  void fireEvent.tap(screen.getByTestId(`ui-lynx-special-unit-catalog-cover-${episodeId}`), {});
const tapRoundIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-round-button"), {});
const present = (id: string): boolean => screen.queryByTestId(id) !== null;

function pressBack(token: string): void {
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, [token]);
  });
}

function typeName(value: string): void {
  const input = screen.getByTestId("ui-lynx-text-field-input");
  const EventConstructor = input.ownerDocument.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value } }),
  );
}

function chooseCountry(code: string): void {
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-country")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
  fireEvent.tap(screen.getByTestId(`ui-lynx-option-selector-item-${code}`), {});
}

/** 이름 칸에 입력하고 나라 줄을 눌러 고릅니다. 제출은 화면마다 버튼이 달라 호출부가 누릅니다. */
function fillProfile(name: string, code: string): void {
  typeName(name);
  chooseCountry(code);
}
const learnerRowCell = (): HTMLElement =>
  within(screen.getByTestId("ui-lynx-settings-group-item-learner-profile")).getByTestId(
    "ui-lynx-settings-cell",
  );
const openSettings = (): void =>
  void fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
/** 설정의 「Name and country in lessons」에서 이름과 나라를 저장하고 설정 목록으로 돌아옵니다. */
function saveInSettings(name: string, code: string): void {
  openSettings();
  fireEvent.tap(learnerRowCell(), {});
  fillProfile(name, code);
  tapButtonIn("learner-profile-screen-submit");
}
const openJourney = (): void =>
  void fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

const tapNext = (): void => tapButtonIn("onboarding-screen-next");
/** 온보딩 세 스텝을 넘겨 로그인에 섭니다. */
function completeOnboarding(): void {
  tapNext();
  tapNext();
  tapNext();
}

/** 로그인 뒤 ① 이름 또는 맵 — 서버 진행이 있는 계정은 ① · ② · 언어 선택 없이 맵으로 갑니다. */
async function signInWithGoogle(): Promise<void> {
  tapButtonIn("login-screen-method-google");
  await vi.waitFor(() =>
    expect(present("learner-name-screen") || present("journey-map-screen")).toBe(true),
  );
}

/** ① 이름 · ② 나라에서 이름과 나라를 정해 언어 선택에 섭니다. */
function passSignupProfile(name: string, code: string): void {
  typeName(name);
  tapButtonIn("learner-name-screen-next");
  tapId(`learner-country-screen-row-${code}`);
  tapButtonIn("learner-country-screen-next");
}

/** 언어 선택 -> 여정 입구 -> 앱 구간까지 갑니다. 이미 맵이면 건너뜁니다. */
async function enterJourney(): Promise<void> {
  if (present("learner-name-screen")) passSignupProfile("Emma", "DE");
  if (!present("journey-map-screen")) {
    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-en"), {});
    tapButtonIn("language-select-screen-next");
    tapButtonIn("journey-entry-screen-start");
  }
  await flush();
}

async function signedOutToApp(): Promise<void> {
  await signInWithGoogle();
  await enterJourney();
}

function tapCoverNext(): void {
  tapButtonIn("catalog-cover-screen-next");
}
function tapIntroNext(): void {
  tapButtonIn("episode-intro-screen-next");
}
/**
 * 표지의 Next → 컷을 모두 넘김 → 배너를 지나 맵으로 돌아옵니다. 대사를 쓰는 중이면 첫 탭은 완성이라 한 번 더
 * 누릅니다. 배너의 유지 시간만 가짜 시계로 밀고 끝에 실제 시계로 되돌립니다.
 */
function finishCover(): void {
  tapIntroNext();
  vi.useFakeTimers();
  for (let guard = 0; guard < 30 && present("catalog-cover-screen"); guard += 1) {
    const dialog = screen.queryByTestId("ui-lynx-visual-novel-dialog");
    if (dialog?.getAttribute("data-status") === "revealing") tapCoverNext();
    tapCoverNext();
  }
  if (present("episode-banner-screen")) {
    act(() => {
      vi.advanceTimersByTime(EPISODE_BANNER_HOLD_MS);
    });
  }
  vi.useRealTimers();
}

const learnerNames = (list: readonly NamedEvent[]): NamedEvent[] =>
  list.filter((event) => event.name.startsWith("learner_profile_"));
const profileKeys = (store: Map<string, string>): string[] =>
  [...store.keys()].filter((key) => key.startsWith(profileKeyPrefix));
const callsOf = (rpcs: readonly Rpc[], name: string): Rpc[] =>
  rpcs.filter((rpc) => rpc.name === name);
const rowDescription = (): string => learnerRowCell().textContent ?? "";

function expectNoProfileValues(events: Events): void {
  const text = JSON.stringify([...events.episode, ...events.settings, ...events.entry]);
  for (const value of ["Emma", "Liam", "Mina", '"DE"', '"KR"', "Germany", "독일"]) {
    expect(text).not.toContain(value);
  }
}

type TurnView = { readonly hint: string; readonly bank: string };

/** 최종 테스트의 턴마다 지시 · 힌트 · 타일 글자를 읽으며 (틀리게라도) 끝까지 넘깁니다. 결과 화면에서 멈춥니다. */
function walkFinalTurns(): TurnView[] {
  const views: TurnView[] = [];
  const total = Number(
    /of (\d+)/.exec(screen.getByTestId("catalog-final-screen-progress").textContent ?? "")?.[1],
  );
  for (let turn = 0; turn < total; turn += 1) {
    const bank = screen.getByTestId("catalog-final-screen-bank");
    views.push({
      hint: screen.queryByTestId("catalog-final-screen-hint")?.textContent ?? "",
      bank: bank.textContent ?? "",
    });
    const count = within(bank).getAllByTestId(/^sentence-order-chip-\d+$/).length;
    for (let index = 0; index < count; index += 1) tapId(`sentence-order-chip-${index}`);
    tapButtonIn("catalog-final-screen-action");
    tapButtonIn("catalog-final-screen-action");
  }
  return views;
}
const bankOfFirstTurn = (): string =>
  screen.getByTestId("catalog-final-screen-bank").textContent ?? "";
const headingAxis = (container: HTMLElement): (string | null)[] =>
  [...container.querySelectorAll("[accessibility-traits]")]
    .filter((el) => (el.getAttribute("accessibility-traits") ?? "").split(",").includes("header"))
    .map((el) => el.getAttribute("data-testid"));

const startedEvents = (events: Events) =>
  events.episode.filter((event) => event.name === "episode_lesson_started");

// ---------------------------------------------------------------- 테스트

test("P1. (AC1) 새 사용자는 가입 직후 ① 이름(소셜 이름으로 미리 채움) → ② 나라 → 언어 선택을 지나고, ②에서 서버로 올라가 최종 테스트 대사에 선다", async () => {
  const { rpcs, events, store, server } = await boot({ signedIn: false });
  server.pkceFullName = "Mia Kim";
  expect(present("onboarding-screen")).toBe(true);

  completeOnboarding();
  expect(present("login-screen-title")).toBe(true);
  await signInWithGoogle();

  expect(present("learner-name-screen")).toBe(true);
  expect(screen.getByTestId("ui-lynx-text-field-input")).toHaveAttribute(
    "default-value",
    "Mia Kim",
  );
  typeName("Emma");
  tapButtonIn("learner-name-screen-next");
  expect(present("learner-country-screen")).toBe(true);
  expect(callsOf(rpcs, "save_learner_profile")).toHaveLength(0);

  tapId("learner-country-screen-row-DE");
  tapButtonIn("learner-country-screen-next");
  expect(present("language-select-screen-title")).toBe(true);
  await vi.waitFor(() => expect(callsOf(rpcs, "save_learner_profile")).toHaveLength(1));
  expect(callsOf(rpcs, "save_learner_profile")[0]?.body).toEqual({
    p_name: "Emma",
    p_country_code: "DE",
  });
  await vi.waitFor(() =>
    expect(JSON.parse(store.get(profileCacheKey) ?? "null")).toMatchObject({ sync: "synced" }),
  );
  expect(store.has(guestLearnerProfileKey)).toBe(false);
  expect(server.profile).toEqual({ name: "Emma", countryCode: "DE" });
  expect(learnerNames(events.entry)).toEqual([
    { name: "learner_profile_saved", entry: "signup", change: "created" },
  ]);
  expect(
    events.entry
      .filter((event) => event.name === "entry_screen_viewed")
      .map((event) => (event as unknown as { screen: string }).screen),
  ).toEqual(["onboarding", "login", "learner-name", "learner-country", "language-select"]);
  expectNoProfileValues(events);
  expect(JSON.stringify(events)).not.toContain("Mia");
});

test("P1b. 소셜 이름이 없으면 무작위 이름으로 미리 채우고 Shuffle이 다른 이름으로 바꾼다", async () => {
  await boot({ signedIn: false });
  completeOnboarding();
  await signInWithGoogle();

  const input = (): string =>
    screen.getByTestId("ui-lynx-text-field-input").getAttribute("default-value") ?? "";
  const first = input();
  expect(first).toMatch(/^[A-Z][a-z]{1,5}$/);
  tapId("learner-name-screen-shuffle");
  expect(input()).toMatch(/^[A-Z][a-z]{1,5}$/);
  expect(input()).not.toBe(first);
});

test("P1c. 기존 회원(서버 진행 있음)은 로그인 뒤 ① · ② 없이 맵으로 간다", async () => {
  const { events } = await boot({ signedIn: false, progress: { [u01]: ["intro"] } });
  completeOnboarding();
  await signInWithGoogle();

  await vi.waitFor(() => expect(present("journey-map-screen")).toBe(true));
  expect(present("learner-name-screen")).toBe(false);
  expect(learnerNames(events.entry)).toEqual([]);
});

test("P2. (AC2) 기록이 없어도 u02 표지 · 레슨 · 최종 테스트는 묻지 않고 바로 서며 대사는 기본값 「이름」이다", async () => {
  const { events, rpcs } = await boot({ progress: toFinalOfU02 });

  tapNode(u02, "RP");

  expect(present("catalog-final-screen")).toBe(true);
  expect(bankOfFirstTurn()).toContain("이름으로");
  expect(startedEvents(events)).toHaveLength(1);
  expect(learnerNames(events.episode)).toEqual([]);
  expect(callsOf(rpcs, "save_learner_profile")).toHaveLength(0);
});

test("P2b. 기록이 없어도 u02 표지와 첫 레슨이 곧바로 선다", async () => {
  const { events } = await boot({ progress: atU02Cover });

  tapCover(u02);
  expect(present("episode-intro-screen")).toBe(true);
  finishCover();
  await flush();

  expect(present("journey-map-screen")).toBe(true);
  tapNode(u02, "S1");
  expect(present(contentIdOf[firstActivityOf(u02, "S1").form])).toBe(true);
  expect(startedEvents(events)).toHaveLength(1);
});

test("P3. (둘 다 필수) ② 나라를 고르지 않고 Continue하면 머물고 오류가 서며 저장 · RPC가 없다", async () => {
  const { rpcs, events, store } = await boot({ signedIn: false });
  completeOnboarding();
  await signInWithGoogle();
  tapButtonIn("learner-name-screen-next");

  tapButtonIn("learner-country-screen-next");

  expect(present("learner-country-screen")).toBe(true);
  expect(screen.getByTestId("learner-country-screen-error")).toHaveTextContent(copy.countryMissing);
  expect(profileKeys(store)).toEqual([]);
  expect(callsOf(rpcs, "save_learner_profile")).toHaveLength(0);
  expect(learnerNames(events.entry)).toEqual([]);
});

test("P3b. ① 이름을 비우고 Continue하면 머물고 빈 이름 오류가 선다", async () => {
  await boot({ signedIn: false });
  completeOnboarding();
  await signInWithGoogle();

  typeName("  ");
  tapButtonIn("learner-name-screen-next");

  expect(present("learner-name-screen")).toBe(true);
  expect(present("learner-country-screen")).toBe(false);
  expect(screen.getByTestId("learner-name-screen-field")).toHaveTextContent(copy.nameIssue.empty);
});

test("P4. (AC4) 기기에 Emma · Germany가 있으면 묻지 않고 설정에서 Liam으로 고치면 다음 레슨부터 Liam으로 선다", async () => {
  const { rpcs, events } = await boot({
    progress: toFinalOfU02,
    preStore: {
      [profileCacheKey]: JSON.stringify({ v: 1, name: "Emma", countryCode: "DE", sync: "synced" }),
    },
    server: { profile: { name: "Emma", countryCode: "DE" } },
  });

  tapNode(u02, "RP");
  expect(bankOfFirstTurn()).toContain("Emma로");
  tapRoundIn("catalog-final-screen-back");
  await flush();

  openSettings();
  expect(rowDescription()).toContain("Emma · Germany");
  fireEvent.tap(learnerRowCell(), {});
  expect(present("learner-profile-screen")).toBe(true);
  expect(events.settings.map((event) => event.name)).toContain("learner_profile_opened");

  typeName("Liam");
  tapButtonIn("learner-profile-screen-submit");

  await vi.waitFor(() =>
    expect(callsOf(rpcs, "save_learner_profile").map((rpc) => rpc.body)).toEqual([
      { p_name: "Liam", p_country_code: "DE" },
    ]),
  );
  expect(present("learner-profile-screen")).toBe(false);
  expect(present("settings-screen-title")).toBe(true);
  expect(rowDescription()).toContain("Liam · Germany");
  expect(learnerNames(events.settings)).toEqual([
    { name: "learner_profile_opened" },
    { name: "learner_profile_saved", entry: "settings", change: "updated" },
  ]);

  openJourney();
  tapNode(u02, "RP");
  expect(bankOfFirstTurn()).toContain("Liam으로");
  expect(screen.getByTestId("catalog-final-screen-hint")).toHaveTextContent("I booked under Liam.");
  expectNoProfileValues(events);
});

test("P5. (AC5) 저장 RPC가 404여도 값이 서고 사용자 칸은 pending이며 설정에 기기에 저장됨이 보이고 오류가 없다", async () => {
  const { rpcs, store } = await boot({ progress: toFinalOfU02, server: { save: "missing" } });

  saveInSettings("Emma", "DE");

  await vi.waitFor(() => expect(callsOf(rpcs, "save_learner_profile").length).toBeGreaterThan(0));
  expect(JSON.parse(store.get(profileCacheKey) ?? "null")).toMatchObject({
    name: "Emma",
    sync: "pending",
  });
  expect(rowDescription()).toContain("Saved on this device");
  openJourney();
  tapNode(u02, "RP");
  expect(present("catalog-final-screen")).toBe(true);
  expect(bankOfFirstTurn()).toContain("Emma로");
  expect(present("error-boundary-fallback")).toBe(false);
  expect(rejections).toEqual([]);
});

test("P5b. (AC5) 올리지 못한 값은 다음 부팅에서 조회 없이 저장되어 synced가 된다", async () => {
  const first = await boot({ progress: toFinalOfU02, server: { save: "missing" } });
  saveInSettings("Emma", "DE");
  await vi.waitFor(() => expect(first.store.has(profileCacheKey)).toBe(true));
  cleanup();

  const second = await boot({
    progress: toFinalOfU02,
    store: first.store,
    server: { save: "ok" },
  });

  await vi.waitFor(() => expect(callsOf(second.rpcs, "save_learner_profile")).toHaveLength(1));
  expect(callsOf(second.rpcs, "load_learner_profile")).toHaveLength(0);
  expect(callsOf(second.rpcs, "save_learner_profile")[0]?.body).toEqual({
    p_name: "Emma",
    p_country_code: "DE",
  });
  await vi.waitFor(() =>
    expect(JSON.parse(second.store.get(profileCacheKey) ?? "null")).toMatchObject({
      sync: "synced",
    }),
  );
  tapNode(u02, "RP");
  expect(bankOfFirstTurn()).toContain("Emma로");
  tapRoundIn("catalog-final-screen-back");
  await flush();
  openSettings();
  expect(rowDescription()).toContain("Emma · Germany");
  expect(rowDescription()).not.toContain("Saved on this device");
});

test("P5c. (AC5) 다른 기기에서 저장한 값은 캐시 없이 로그인해도 서버에서 와 u03에 선다", async () => {
  await boot({
    progress: toFinalOfU03,
    server: { profile: { name: "Mina", countryCode: "KR" } },
  });
  await vi.waitFor(() => expect(present("journey-map-screen")).toBe(true));

  tapNode(u03, "RP");
  expect(present("catalog-final-screen")).toBe(true);
  const views = walkFinalTurns();

  expect(views.map((view) => view.bank).join("|")).toContain("한국에서");
  expect(views.map((view) => view.bank).join("|")).toContain("Mina");
});

test("P5d. (AC5) 조회 · 저장이 전부 연결 실패여도 캐시 값으로 서고 조회는 한 번뿐이다", async () => {
  const { rpcs } = await boot({
    progress: toFinalOfU02,
    preStore: {
      [profileCacheKey]: JSON.stringify({ v: 1, name: "Emma", countryCode: "DE", sync: "synced" }),
    },
    server: { load: "offline", save: "offline" },
  });

  tapNode(u02, "RP");

  expect(bankOfFirstTurn()).toContain("Emma로");
  await flush();
  expect(callsOf(rpcs, "load_learner_profile")).toHaveLength(1);
  expect(callsOf(rpcs, "save_learner_profile")).toHaveLength(0);
});

test("P6. 계정 삭제가 끝나면 그 사용자의 프로필 칸이 지워진다", async () => {
  const { store } = await boot({
    progress: toFinalOfU02,
    preStore: {
      [profileCacheKey]: JSON.stringify({ v: 1, name: "Emma", countryCode: "DE", sync: "synced" }),
    },
    server: { profile: { name: "Emma", countryCode: "DE" } },
  });
  expect(store.has(profileCacheKey)).toBe(true);

  openSettings();
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-delete-account")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-delete")).getByTestId("ui-lynx-button"),
    {},
  );
  await vi.waitFor(() => expect(present("login-screen-title")).toBe(true));

  expect(store.has(authSessionStorageKey)).toBe(false);
  expect(store.has(profileCacheKey)).toBe(false);
});

async function signOutToLogin(): Promise<void> {
  openSettings();
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-sign-out")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-sign-out")).getByTestId("ui-lynx-button"),
    {},
  );
  await vi.waitFor(() => expect(present("login-screen-title")).toBe(true));
}

test("P6b. 로그아웃해도 프로필 칸은 남고 같은 계정으로 다시 로그인하면 조회 전에 캐시 값으로 선다", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { store, server } = await boot({
    progress: toFinalOfU02,
    preStore: {
      [profileCacheKey]: JSON.stringify({ v: 1, name: "Emma", countryCode: "DE", sync: "synced" }),
    },
    server: { profile: { name: "Emma", countryCode: "DE" } },
  });

  await signOutToLogin();
  expect(store.has(profileCacheKey)).toBe(true);

  server.loadGate = gate;
  await signedOutToApp();
  await vi.waitFor(() => expect(present("journey-map-screen")).toBe(true));
  tapNode(u02, "RP");

  expect(bankOfFirstTurn()).toContain("Emma로");
  release();
});

test("P6c. 로그아웃 뒤 다른 계정(조회 null)으로 로그인하면 앞 계정의 값을 쓰지 않고 u02 대사는 기본값이다", async () => {
  const { server, store } = await boot({
    progress: toFinalOfU02,
    preStore: {
      [profileCacheKey]: JSON.stringify({ v: 1, name: "Emma", countryCode: "DE", sync: "synced" }),
    },
    server: { profile: { name: "Emma", countryCode: "DE" } },
  });

  await signOutToLogin();
  server.pkceSub = "w";
  server.profile = null;
  await signedOutToApp();
  await vi.waitFor(() => expect(present("journey-map-screen")).toBe(true));
  tapNode(u02, "RP");

  expect(present("catalog-final-screen")).toBe(true);
  expect(bankOfFirstTurn()).toContain("이름으로");
  expect(bankOfFirstTurn()).not.toContain("Emma");
  expect(store.has(learnerProfileCacheKey("w"))).toBe(false);
  expect(store.get(profileCacheKey)).toBeDefined();
});

test("P7. 이벤트: 설정 열림 -> 저장이 settings sink로 나가고 모든 이벤트의 직렬화에 이름 · 나라 값이 없다", async () => {
  const { events } = await boot({
    progress: toFinalOfU02,
    preStore: {
      [profileCacheKey]: JSON.stringify({ v: 1, name: "Emma", countryCode: "DE", sync: "synced" }),
    },
    server: { profile: { name: "Emma", countryCode: "DE" } },
  });

  openSettings();
  fireEvent.tap(learnerRowCell(), {});
  typeName("Liam");
  chooseCountry("FR");
  tapButtonIn("learner-profile-screen-submit");

  expect(learnerNames(events.settings)).toEqual([
    { name: "learner_profile_opened" },
    { name: "learner_profile_saved", entry: "settings", change: "updated" },
  ]);
  expect(learnerNames(events.episode)).toEqual([]);
  expect(learnerNames(events.entry)).toEqual([]);
  expectNoProfileValues(events);
  expect(JSON.stringify(events)).not.toContain("France");
});

test("P8. 접근성: ① 이름 · ② 나라의 heading 축은 제목 하나이고 탭 바가 없다", async () => {
  await boot({ signedIn: false });
  completeOnboarding();
  await signInWithGoogle();

  expect(headingAxis(screen.getByTestId("learner-name-screen"))).toEqual([
    "learner-name-screen-title",
  ]);
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);
  tapButtonIn("learner-name-screen-next");
  expect(headingAxis(screen.getByTestId("learner-country-screen"))).toEqual([
    "learner-country-screen-title",
  ]);
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);
});

test("P8b. 접근성: 설정 화면 · 설정의 나라 고르기의 heading 축은 제목 하나이고 탭 바가 없다", async () => {
  await boot({ progress: atU02S1 });

  openSettings();
  fireEvent.tap(learnerRowCell(), {});
  expect(headingAxis(screen.getByTestId("learner-profile-screen"))).toEqual([
    "learner-profile-screen-title",
  ]);
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-country")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
  expect(headingAxis(screen.getByTestId("learner-country-picker"))).toEqual([
    "learner-country-picker-title",
  ]);
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);
});

test("P10. 같은 프로필이면 동기화가 끝나 상태가 바뀌어도 진행 중인 레슨이 되돌지 않는다", async () => {
  const { store } = await boot({
    progress: atU02S1,
    preStore: {
      [profileCacheKey]: JSON.stringify({ v: 1, name: "Emma", countryCode: "DE", sync: "pending" }),
    },
  });

  tapNode(u02, "S1");
  // 첫 활동은 단어 카드라 진행은 카드 진행 헤더의 캡션으로 읽습니다(ADR-0073).
  const chapter = (): string => screen.getByTestId("learning-run-header-caption").textContent ?? "";
  tapButtonIn("vocab-card-got-it");
  const advanced = chapter();
  expect(advanced).toMatch(/^Word 2 of \d+$/);
  await vi.waitFor(() =>
    expect(JSON.parse(store.get(profileCacheKey) ?? "null")).toMatchObject({ sync: "synced" }),
  );
  await flush();

  expect(chapter()).toBe(advanced);
});

test("P11. (D9) 시스템 뒤로: 설정의 나라 고르기는 양식으로만, 설정 화면은 설정 루트로, ② 나라는 ① 이름으로 간다", async () => {
  const respond = vi.fn<(token: string, outcome: string) => void>();
  await boot({ progress: atU02S1, backHost: { respond } });

  openSettings();
  fireEvent.tap(learnerRowCell(), {});
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-country")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
  expect(present("learner-country-picker")).toBe(true);
  pressBack("1");
  await flush();
  expect(present("learner-country-picker")).toBe(false);
  expect(present("learner-profile-screen")).toBe(true);

  pressBack("2");
  await flush();
  expect(present("learner-profile-screen")).toBe(false);
  expect(present("settings-screen-title")).toBe(true);
  expect(respond).toHaveBeenCalledWith("1", "handled");
  expect(respond).toHaveBeenCalledWith("2", "handled");
});

test("P11b. (D9) 시스템 뒤로: ② 나라 → ① 이름 → 로그인으로 한 칸씩 간다", async () => {
  const respond = vi.fn<(token: string, outcome: string) => void>();
  await boot({ signedIn: false, backHost: { respond } });
  completeOnboarding();
  await signInWithGoogle();
  tapButtonIn("learner-name-screen-next");
  expect(present("learner-country-screen")).toBe(true);

  pressBack("1");
  await flush();
  expect(present("learner-country-screen")).toBe(false);
  expect(present("learner-name-screen")).toBe(true);

  pressBack("2");
  await flush();
  expect(present("learner-name-screen")).toBe(false);
  expect(present("login-screen-title")).toBe(true);
  expect(respond).toHaveBeenCalledWith("1", "handled");
  expect(respond).toHaveBeenCalledWith("2", "handled");
});
