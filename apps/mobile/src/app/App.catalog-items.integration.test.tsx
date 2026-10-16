import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AppJourneySeed } from "./journey-progress";
import { catalogLessonPlanOf } from "./catalog-lesson-plan";
import type { CatalogActivity, CatalogLessonPlan } from "./catalog-lesson-plan";
import { resetPushWiringForTests } from "./push-wiring";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { CONTENT_MANIFEST_KEY, contentEpisodeKey } from "../lib/episode-cache";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import { isTypeableAnswer, keystrokesFor } from "../lib/hangul-keyboard";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { fillPlaceholders } from "../lib/placeholder-fill";
import type { FillScript } from "../lib/placeholder-fill";
import { sha256Hex, utf8Bytes } from "../lib/sha256";
import { systemBackEventName } from "../lib/system-back";
import type { PairMatchQuestion } from "../screens/pair-match/pair-match.contract";
import type { TypingQuestion } from "../screens/typing/typing.contract";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { journeySteps } from "../screens/journey-map/journey-map";

// 옛 형식 내장본(2026-10-14)의 흐름을 걷는 테스트입니다 — 내장본 자리를 옛 픽스처로 바꿉니다.
vi.mock("../lib/episode-bundled", async () => {
  const legacy = await import("../lib/episode-legacy.test-support");
  return { bundledCatalogInput: legacy.legacyCatalogInput };
});

// `integration` 계층(3d-1): 단어 카드 · 짝 맞추기 · 그림 고르기가 앱 세션에서 「맵 → 카드 활동(결과 없음)
// → 채점 활동 → 판정(채점 수 기준) → 기록 → 이벤트」를 지나는 것과, 캐시에서 온 그림 문항이 계획 · 화면 ·
// 판정을 지나는 것을 한 트리에서 봅니다. 대역은 경계뿐입니다 — `NativeModules`(저장소 · 시스템 뒤로 ·
// 오디오) · `fetch` · `vi.stubEnv`. 정답은 계약 함수(`catalogLessonPlanOf`)가 내는 계획에서 읽어 탭합니다.

const supabaseUrl = "https://test.supabase.co";
const imageBase = `${supabaseUrl}/storage/v1/object/public/content/`;
const pictureImagePath = "images/u01-water/s1-05.jpg";

type Rpc = { readonly name: string; readonly body: Record<string, unknown> };
type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;

const refreshedBody = JSON.stringify({
  access_token: `e30.${btoa(JSON.stringify({ sub: "u" })).replace(/=+$/, "")}.sig`,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "u" },
});

const tutorialDoneSeed: AppJourneySeed = {
  completedStepCount: journeySteps.length,
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

const tutorialDoneSnapshot = {
  version: 1,
  completedStepCount: journeySteps.length,
  completedEpisodeIntroIds: ["tutorial-intro"],
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovel: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

const u01 = "u01-water";
const u02 = "u02-checkin";
const u03 = "u03-mina";
const upTo = (...keys: string[]) => ({ [u01]: ["intro", ...keys] });

// ---------------------------------------------------------------- 계획 (정답의 출처)

const fill = (text: string, script: FillScript) => fillPlaceholders(text, {}, script);
// 빈 경로는 거절합니다 — 앱의 `imageUrlOf`와 같은 규칙입니다.
const imageUrlOf = (path: string): string | null => (path === "" ? null : `${imageBase}${path}`);

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});

function readyIn(catalog: readonly CatalogEntry[], episodeId: string): ReadyEntry {
  const entry = catalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") throw new Error(`not ready: ${episodeId}`);
  return entry;
}

function planOf(entry: ReadyEntry, key: string): CatalogLessonPlan {
  const plan = catalogLessonPlanOf(entry, key, fill, imageUrlOf);
  if (plan === null) throw new Error(`no unit: ${key}`);
  return plan;
}
const lessonPlan = (episodeId: string, key: string) => planOf(readyIn(realCatalog, episodeId), key);

/** 앞 에피소드 둘을 끝내고 u03은 S8까지 끝낸 진행입니다. */
function throughU03S8(): Record<string, string[]> {
  const keysOf = (episodeId: string) =>
    readyIn(realCatalog, episodeId).episode.units.map((unit) => unit.id);
  const u03Keys = keysOf(u03);
  return {
    [u01]: ["intro", ...keysOf(u01)],
    [u02]: ["intro", ...keysOf(u02)],
    [u03]: ["intro", ...u03Keys.slice(0, u03Keys.indexOf("S9"))],
  };
}

type RawItem = { id: string; stimulus: Record<string, unknown> };
type Cache = { readonly manifest: string; readonly body: string };

/** u01 본문의 S1 문항을 바꾼 캐시 씨앗입니다 — 본문을 가리키며 버전을 올린 매니페스트와 한 쌍입니다. */
function u01Cache(mapS1Items: (items: RawItem[]) => RawItem[]): Cache {
  const bundled = JSON.parse(
    readFileSync(
      resolve(process.cwd(), "content/test-fixtures/delivery-2-2026-10-14/u01-water.json"),
      "utf8",
    ),
  ) as { steps: { id: string; items: RawItem[] }[] };
  const body = JSON.stringify({
    ...bundled,
    steps: bundled.steps.map((step) =>
      step.id === "S1" ? { ...step, items: mapS1Items(step.items) } : step,
    ),
  });
  const bundledManifest = JSON.parse(
    readFileSync(
      resolve(process.cwd(), "content/test-fixtures/delivery-2-2026-10-14/manifest.json"),
      "utf8",
    ),
  ) as { episodes: { id: string }[] } & Record<string, unknown>;
  const manifest = JSON.stringify({
    ...bundledManifest,
    episodes: bundledManifest.episodes.map((entry) =>
      entry.id === u01
        ? {
            ...entry,
            version: "2099-01-01.1",
            sha256: sha256Hex(utf8Bytes(body)),
            bytes: utf8Bytes(body).length,
          }
        : entry,
    ),
  });
  return { manifest, body };
}

/** `S1-05`의 그림 경로를 채운 씨앗입니다. */
const pictureCache = (): Cache =>
  u01Cache((items) =>
    items.map((item) =>
      item.id === "S1-05"
        ? { ...item, stimulus: { ...item.stimulus, image_url: pictureImagePath } }
        : item,
    ),
  );

/** S1을 카드 셋만 남긴 씨앗입니다(채점 문항 0). */
const cardsOnlyCache = (): Cache => u01Cache((items) => items.slice(0, 3));

const preStoreOf = (cache: Cache): Record<string, string> => ({
  [CONTENT_MANIFEST_KEY]: cache.manifest,
  [contentEpisodeKey(u01)]: cache.body,
});

function seededPlan(cache: Cache, key: string): CatalogLessonPlan {
  const seeded = buildEpisodeCatalog({
    bundled: bundledCatalogInput,
    cache: { manifest: cache.manifest, episodes: { [u01]: cache.body } },
  });
  return planOf(readyIn(seeded, u01), key);
}

// ---------------------------------------------------------------- 부팅

type BootOptions = {
  readonly progress?: Record<string, string[]>;
  readonly preStore?: Record<string, string>;
  readonly backHost?: { readonly respond: (token: string, outcome: string) => void };
};

type Booted = {
  readonly rpcs: Rpc[];
  readonly events: EpisodeIntroEvent[];
};

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function boot(options: BootOptions = {}): Promise<Booted> {
  const store = new Map<string, string>(Object.entries(options.preStore ?? {}));
  store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
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
    if (url.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedBody });
    }
    if (isContentRequest(url)) {
      // 콘텐츠 버킷은 늘 404입니다 — 그림 씨앗은 기기 캐시(`preStore`)로만 들어옵니다.
      return Promise.resolve(contentNotFoundResponse());
    }
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
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
    <App
      journeySeed={tutorialDoneSeed}
      completedEpisodeIntroIds={["tutorial-intro"]}
      episodeIntroEventSink={(event) => events.push(event)}
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
  return { rpcs, events };
}

afterEach(() => {
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
  screen.getByTestId(`ui-lynx-learning-unit-catalog-unit-${episodeId}-${key}`);
const tapNode = (episodeId: string, key: string): void =>
  void fireEvent.tap(node(episodeId, key), {});
// u02 · u03은 이름 · 나라가 드는 에피소드라 기록이 없으면 첫 유닛 앞에 가드 화면이 섭니다 - 건너뛰면 기본 문구로 이어집니다.
const skipProfileGate = (): void => tapButtonIn("learner-profile-gate-skip");
const status = (episodeId: string, key: string) => node(episodeId, key).getAttribute("data-status");
const exitResult = () => tapButtonIn("lesson-complete-screen-exit");
const title = () => screen.getByTestId("lesson-complete-screen-title");
const chapter = () => screen.getByTestId("learning-shell-chapter");
const action = (): void => tapId("learning-shell-action");
const advance = (): void => tapId("learning-shell-advance");

function pressBack(token: string): void {
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, [token]);
  });
}

const savedProgress = (rpcs: readonly Rpc[]): Record<string, unknown>[] =>
  rpcs
    .filter((rpc) => rpc.name === "save_learning_progress")
    .map((rpc) => rpc.body["p_progress"] as Record<string, unknown>);
const savedUnits = (rpcs: readonly Rpc[], episodeId: string): string[] =>
  (savedProgress(rpcs).at(-1)?.["catalogProgress"] as Record<string, string[]> | undefined)?.[
    episodeId
  ] ?? [];
const everSaved = (rpcs: readonly Rpc[], episodeId: string, key: string): boolean =>
  savedProgress(rpcs).some((snapshot) =>
    (snapshot["catalogProgress"] as Record<string, string[]> | undefined)?.[episodeId]?.includes(
      key,
    ),
  );

const learningEvents = (events: readonly EpisodeIntroEvent[]) =>
  events.filter(
    (event) => event.name.startsWith("episode_lesson_") || event.name === "episode_final_passed",
  );

const contentIdOf: Record<CatalogActivity["form"], string> = {
  "word-choice": "word-choice-screen-content",
  listening: "listening-screen-content",
  "sentence-order": "sentence-order-screen-content",
  typing: "typing-activity-content",
  "vocab-card": "vocab-card-content",
  "pair-match": "pair-match-content",
  "culture-card": "culture-card-content",
  "syllable-build": "syllable-build-content",
};

/** 활동의 모양을 「W3」 같은 구간 표기로 적습니다 — 계획의 구간 열과 같은 표기입니다. */
const spanLetter: Record<CatalogActivity["form"], string> = {
  "word-choice": "W",
  typing: "T",
  "pair-match": "P",
  "vocab-card": "C",
  listening: "L",
  "sentence-order": "O",
  "culture-card": "U",
  "syllable-build": "B",
};
const spanOf = (plan: CatalogLessonPlan): string[] =>
  plan.activities.map((activity) => `${spanLetter[activity.form]}${activity.questions.length}`);

const lettersOnly = (text: string) => text.normalize("NFC").replace(/[^ㄱ-ㆎ가-힣]/g, "");
function typeKeys(text: string): void {
  for (const key of keystrokesFor(text)) tapId(`messenger-key-${key}`);
}
function typeAnswer(question: TypingQuestion): void {
  typeKeys(lettersOnly(question.answers.find(isTypeableAnswer) ?? question.answers[0]));
}

/** 카드는 문항 수만큼 버튼을 누릅니다 — 마지막 카드의 버튼이 곧 다음 걸음이라 완료 카드가 없습니다. */
function flipCards(count: number): void {
  for (let index = 0; index < count; index += 1) action();
}

/** 짝 하나를 잇습니다 — 틀릴 때는 모든 낱말을 뜻 한 칸씩 밀어 잇습니다. */
function linkPairs(question: PairMatchQuestion, right: boolean): void {
  question.answer.forEach((meaning, word) => {
    tapId(`pair-match-word-${word}`);
    tapId(`pair-match-meaning-${right ? meaning : (meaning + 1) % question.meanings.length}`);
  });
}

/** 단어 선택 활동을 풉니다 — `rights[i]`가 거짓이면 그 문항은 틀립니다. 그림이 서 있으면 load부터 쏩니다. */
function answerWordChoice(
  activity: Extract<CatalogActivity, { form: "word-choice" }>,
  rights: readonly boolean[],
): void {
  activity.questions.forEach((question, index) => {
    const picture = screen.queryByTestId("word-choice-picture-image");
    if (picture !== null) fireEvent(picture, new window.Event("bindEvent:load"));
    const right = rights[index] ?? true;
    tapId(
      `word-choice-option-${right ? question.answerIndex : question.answerIndex === 0 ? 1 : 0}`,
    );
    advance();
  });
}

/**
 * 활동 하나를 끝까지 풉니다. 레슨의 마지막 활동이면 완료 카드의 `See results`까지 누르고, 중간 활동이면
 * 마지막 문항 뒤 곧바로 다음 활동으로 넘어가므로 누르지 않습니다. 카드는 완료 카드가 없습니다.
 */
function solveActivity(activity: CatalogActivity, right: boolean, last: boolean): void {
  switch (activity.form) {
    case "vocab-card":
      flipCards(activity.questions.length);
      return;
    case "word-choice":
      answerWordChoice(
        activity,
        activity.questions.map(() => right),
      );
      break;
    case "pair-match":
      for (const question of activity.questions) {
        linkPairs(question, right);
        action();
        action();
      }
      break;
    case "typing":
      for (const question of activity.questions) {
        if (right) typeAnswer(question);
        else typeKeys("가");
        action();
        action();
      }
      break;
    case "sentence-order":
      for (const question of activity.questions) {
        const order = right ? question.answerOrder : [...question.answerOrder].reverse();
        for (const chip of order) tapId(`sentence-order-chip-${chip}`);
        action();
        action();
      }
      break;
    case "listening":
      throw new Error("listening is not part of these scenarios");
  }
  if (last) action();
}

/** 계획의 활동을 순서대로 풀며 서는 화면의 루트 testid를 모읍니다. */
function solveLesson(plan: CatalogLessonPlan, right: boolean): string[] {
  const seen: string[] = [];
  plan.activities.forEach((activity, index) => {
    const id = contentIdOf[activity.form];
    expect(screen.getByTestId(id)).toBeInTheDocument();
    seen.push(id);
    solveActivity(activity, right, index === plan.activities.length - 1);
  });
  return seen;
}

function wordChoiceAt(plan: CatalogLessonPlan, index: number) {
  const activity = plan.activities[index];
  if (activity?.form !== "word-choice") throw new Error(`activity ${index} is word-choice`);
  return activity;
}

// ---------------------------------------------------------------- 테스트

test("I1. (AC1 · 2) S1: 카드 셋(결과 없음) → 단어 선택 셋 → 결과 → 기록 → 이벤트 속성 셋", async () => {
  const { rpcs, events } = await boot({ progress: upTo() });
  const plan = lessonPlan(u01, "S1");
  expect(spanOf(plan)).toEqual(["C3", "W3"]);
  expect([plan.shownItemCount, plan.questionCount, plan.skippedItemCount]).toEqual([6, 3, 2]);

  tapNode(u01, "S1");
  expect(screen.getByTestId("vocab-card-content")).toBeInTheDocument();
  expect(screen.getByTestId("vocab-card-word")).toHaveTextContent("물");
  expect(chapter()).toHaveTextContent("Lesson 1 / 6");
  flipCards(3);

  // 카드를 넘기면 완료 카드도 결과 화면도 없이 곧바로 단어 선택이다.
  expect(screen.queryByTestId("lesson-complete-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("word-choice-screen-content")).toBeInTheDocument();
  expect(chapter()).toHaveTextContent("Lesson 4 / 6");
  solveActivity(wordChoiceAt(plan, 1), true, true);
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(status(u01, "S1")).toBe("clear");
  expect(status(u01, "S3")).toBe("available");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S1"));
  expect(learningEvents(events)).toEqual([
    {
      name: "episode_lesson_started",
      episodeId: u01,
      unitKey: "S1",
      unitRole: "lesson",
      questionCount: "3",
      shownItemCount: "6",
      skippedItemCount: "2",
    },
    {
      name: "episode_lesson_finished",
      episodeId: u01,
      unitKey: "S1",
      unitRole: "lesson",
      verdict: "passed",
      correctCount: "3",
      questionCount: "3",
    },
  ]);
});

test("I2. (AC2 기준) 카드를 다 넘겨도 통과에 세지 않는다: 셋 중 하나만 맞히면 미통과, 다시 하면 카드부터이고 둘을 맞히면 통과한다", async () => {
  const { rpcs, events } = await boot({ progress: upTo() });
  const plan = lessonPlan(u01, "S1");

  tapNode(u01, "S1");
  flipCards(3);
  answerWordChoice(wordChoiceAt(plan, 1), [true, false, false]);
  action();
  expect(screen.getByTestId("lesson-complete-screen-retry")).toBeInTheDocument();
  expect(title()).not.toHaveTextContent("PERFECT LESSON!");
  await flush();
  expect(everSaved(rpcs, u01, "S1")).toBe(false);

  tapButtonIn("lesson-complete-screen-retry");
  expect(screen.getByTestId("vocab-card-content")).toBeInTheDocument();
  flipCards(3);
  answerWordChoice(wordChoiceAt(plan, 1), [true, true, false]);
  action();
  expect(screen.queryByTestId("lesson-complete-screen-retry")).not.toBeInTheDocument();
  exitResult();
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S1"));

  const lessonEvents = learningEvents(events);
  expect(lessonEvents.map((event) => event.name)).toEqual([
    "episode_lesson_started",
    "episode_lesson_finished",
    "episode_lesson_started",
    "episode_lesson_finished",
  ]);
  expect(lessonEvents[1]).toMatchObject({
    verdict: "failed",
    correctCount: "1",
    questionCount: "3",
  });
  expect(lessonEvents[3]).toMatchObject({
    verdict: "passed",
    correctCount: "2",
    questionCount: "3",
  });
});

test("I3. (AC3) u03 S9: 짝 맞추기가 단어 선택 · 받아쓰기 사이에 서고, 틀린 짝만 정답이 공개되며, 하나 틀려도 통과한다", async () => {
  const { rpcs, events } = await boot({ progress: throughU03S8() });
  const plan = lessonPlan(u03, "S9");
  expect(spanOf(plan)).toEqual(["W1", "P1", "W2", "T1", "P1", "W2", "T1", "W1"]);
  expect([plan.shownItemCount, plan.questionCount]).toEqual([10, 10]);
  expect(status(u03, "S9")).toBe("available");

  tapNode(u03, "S9");
  skipProfileGate();
  const seen: string[] = [];
  let pairScreens = 0;
  plan.activities.forEach((activity, index) => {
    const last = index === plan.activities.length - 1;
    expect(screen.getByTestId(contentIdOf[activity.form])).toBeInTheDocument();
    seen.push(contentIdOf[activity.form]);
    if (activity.form !== "pair-match") {
      solveActivity(activity, true, last);
      return;
    }
    // 첫 짝 화면만 틀리게 잇습니다 — Check 한 번에 판정되고, 틀린 짝의 정답이 공개된다.
    const wrong = pairScreens === 0;
    pairScreens += 1;
    const question = activity.questions[0];
    expect(screen.queryByTestId("pair-match-reveal")).not.toBeInTheDocument();
    linkPairs(question, !wrong);
    expect(screen.queryByTestId("pair-match-reveal")).not.toBeInTheDocument();
    action();
    if (wrong) expect(screen.getByTestId("pair-match-reveal")).toBeInTheDocument();
    else expect(screen.queryByTestId("pair-match-reveal")).not.toBeInTheDocument();
    action();
    if (last) action();
  });

  expect(seen).toEqual(plan.activities.map((activity) => contentIdOf[activity.form]));
  expect(title()).toHaveTextContent("LESSON COMPLETE!");
  expect(screen.queryByTestId("lesson-complete-screen-retry")).not.toBeInTheDocument();
  exitResult();
  await vi.waitFor(() => expect(savedUnits(rpcs, u03)).toContain("S9"));
  expect(learningEvents(events).at(-1)).toMatchObject({
    name: "episode_lesson_finished",
    unitKey: "S9",
    verdict: "passed",
    correctCount: "9",
    questionCount: "10",
  });
});

async function openPictureLesson(): Promise<{
  readonly plan: CatalogLessonPlan;
  readonly rpcs: Rpc[];
  readonly events: EpisodeIntroEvent[];
}> {
  const cache = pictureCache();
  const plan = seededPlan(cache, "S1");
  const booted = await boot({ progress: upTo(), preStore: preStoreOf(cache) });
  tapNode(u01, "S1");
  flipCards(3);
  const first = wordChoiceAt(plan, 1).questions[0];
  tapId(`word-choice-option-${first.answerIndex}`);
  advance();
  return { plan, ...booted };
}

test("I4. (AC4) 캐시에서 온 그림 문항: 그림이 서고 error면 뜻 글자로 바뀌어 막히지 않으며, 끝까지 풀면 통과한다", async () => {
  const { plan } = await openPictureLesson();
  expect(spanOf(plan)).toEqual(["C3", "W4"]);
  expect([plan.shownItemCount, plan.questionCount, plan.skippedItemCount]).toEqual([7, 4, 1]);

  // 카드 셋 뒤 단어 선택 화면이 하나로 이어지고 그 둘째 문항에서 그림이 선다.
  expect(screen.getByTestId("word-choice-screen-content")).toBeInTheDocument();
  expect(chapter()).toHaveTextContent("Lesson 5 / 7");
  const picture = wordChoiceAt(plan, 1).questions[1];
  expect(picture.picture).toBeDefined();
  expect(screen.getByTestId("word-choice-picture")).toBeInTheDocument();
  expect(screen.getByTestId("word-choice-picture-image").getAttribute("src")).toMatch(
    /\/images\/u01-water\/s1-05\.jpg$/,
  );

  // 그림을 기다리는 동안에는 답을 받지 않는다.
  tapId(`word-choice-option-${picture.answerIndex}`);
  expect(screen.queryByTestId("answer-verdict")).not.toBeInTheDocument();

  fireEvent(screen.getByTestId("word-choice-picture-image"), new window.Event("bindEvent:error"));
  expect(screen.queryByTestId("word-choice-picture-image")).not.toBeInTheDocument();
  expect(screen.getByTestId("word-choice-picture-fallback")).toHaveTextContent(picture.prompt);
  expect(picture.prompt).toBe("water");

  tapId(`word-choice-option-${picture.answerIndex}`);
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  advance();
  // 같은 화면의 다음 문항(제시문)이다.
  expect(screen.queryByTestId("word-choice-picture")).not.toBeInTheDocument();
  expect(screen.getByTestId("word-choice-screen-content")).toBeInTheDocument();

  const rest = wordChoiceAt(plan, 1).questions.slice(2);
  for (const question of rest) {
    tapId(`word-choice-option-${question.answerIndex}`);
    advance();
  }
  action();
  expect(screen.queryByTestId("lesson-complete-screen-retry")).not.toBeInTheDocument();
  expect(title()).toHaveTextContent("PERFECT LESSON!");
});

test("I4b. 그림이 load되면 그림 그대로 보기가 열리고, 시작 이벤트가 표시 · 채점 · 건너뜀 수를 싣는다", async () => {
  const { plan, events } = await openPictureLesson();
  const picture = wordChoiceAt(plan, 1).questions[1];

  fireEvent(screen.getByTestId("word-choice-picture-image"), new window.Event("bindEvent:load"));
  expect(screen.getByTestId("word-choice-picture")).toHaveAttribute("data-load-state", "loaded");
  tapId(`word-choice-option-${picture.answerIndex}`);
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(screen.getByTestId("word-choice-picture-answer")).toBeInTheDocument();

  expect(learningEvents(events)[0]).toEqual({
    name: "episode_lesson_started",
    episodeId: u01,
    unitKey: "S1",
    unitRole: "lesson",
    questionCount: "4",
    shownItemCount: "7",
    skippedItemCount: "1",
  });
});

test("I4c. 그림 이벤트가 영영 오지 않아도 6초 뒤 뜻 글자로 바뀌어 보기가 열린다", async () => {
  const cache = pictureCache();
  const plan = seededPlan(cache, "S1");
  await boot({ progress: upTo(), preStore: preStoreOf(cache) });
  vi.useFakeTimers();
  tapNode(u01, "S1");
  flipCards(3);
  tapId(`word-choice-option-${wordChoiceAt(plan, 1).questions[0].answerIndex}`);
  advance();
  const picture = wordChoiceAt(plan, 1).questions[1];

  expect(screen.getByTestId("word-choice-picture")).toHaveAttribute("data-load-state", "loading");
  act(() => {
    vi.advanceTimersByTime(6000);
  });
  expect(screen.getByTestId("word-choice-picture")).toHaveAttribute("data-load-state", "failed");
  expect(screen.getByTestId("word-choice-picture-fallback")).toHaveTextContent("water");
  tapId(`word-choice-option-${picture.answerIndex}`);
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
});

test("I4d. (AC2 카드뿐인 유닛) 채점 문항이 없어도 카드를 한 장씩 보이고, 마지막 카드의 See results로 통과 · 기록된다", async () => {
  const cache = cardsOnlyCache();
  const plan = seededPlan(cache, "S1");
  expect(spanOf(plan)).toEqual(["C3"]);
  expect([plan.shownItemCount, plan.questionCount]).toEqual([3, 0]);
  const { rpcs, events } = await boot({ progress: upTo(), preStore: preStoreOf(cache) });

  tapNode(u01, "S1");
  expect(screen.getByTestId("vocab-card-content")).toBeInTheDocument();
  expect(screen.queryByTestId("lesson-complete-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-action")).toHaveTextContent("Next");
  flipCards(2);
  expect(screen.getByTestId("learning-shell-action")).toHaveTextContent("See results");
  action();
  exitResult();
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S1"));

  expect(learningEvents(events)).toMatchObject([
    { name: "episode_lesson_started", questionCount: "0", shownItemCount: "3" },
    { name: "episode_lesson_finished", verdict: "passed", correctCount: "0", questionCount: "0" },
  ]);
});

test("I5. (AC4 실데이터) 그림 경로가 없는 실데이터에는 그림 문항이 서지 않고 S1을 끝까지 걸어도 그림 틀이 한 번도 없다", async () => {
  for (const entry of realCatalog) {
    if (entry.status !== "ready") continue;
    for (const unit of entry.episode.units) {
      if (unit.id === "RP") continue;
      for (const activity of planOf(entry, unit.id).activities) {
        if (activity.form !== "word-choice") continue;
        for (const question of activity.questions) expect(question.picture).toBeUndefined();
      }
    }
  }

  await boot({ progress: upTo() });
  const plan = lessonPlan(u01, "S1");
  tapNode(u01, "S1");
  flipCards(3);
  for (const question of wordChoiceAt(plan, 1).questions) {
    expect(screen.queryByTestId("word-choice-picture")).not.toBeInTheDocument();
    tapId(`word-choice-option-${question.answerIndex}`);
    advance();
  }
  action();
  expect(screen.queryByTestId("word-choice-picture")).not.toBeInTheDocument();
  expect(title()).toHaveTextContent("PERFECT LESSON!");
});

test("I6. 카드 화면의 나가기와 짝 화면의 시스템 뒤로는 기록 없이 맵으로 돌아가고 시작 이벤트만 남는다", async () => {
  const respond = vi.fn<(token: string, outcome: string) => void>();
  const { rpcs, events } = await boot({ progress: throughU03S8(), backHost: { respond } });

  tapNode(u01, "S1");
  expect(screen.getByTestId("vocab-card-content")).toBeInTheDocument();
  tapId("learning-shell-exit");
  tapButtonIn("ui-lynx-dialog-action-leave");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();

  const plan = lessonPlan(u03, "S9");
  tapNode(u03, "S9");
  skipProfileGate();
  solveActivity(plan.activities[0] as CatalogActivity, true, false);
  expect(screen.getByTestId("pair-match-content")).toBeInTheDocument();
  pressBack("1");
  await flush();
  expect(respond).toHaveBeenCalledWith("1", "handled");
  tapButtonIn("ui-lynx-dialog-action-leave");
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(everSaved(rpcs, u03, "S9")).toBe(false);
  expect(learningEvents(events).map((event) => event.name)).toEqual([
    "episode_lesson_started",
    "episode_lesson_started",
  ]);
});

test("I7. (3c 회귀) S3 전부 정답: 3c와 같은 흐름이고 시작 이벤트에 표시 문항 수 6이 실린다", async () => {
  const { rpcs, events } = await boot({ progress: upTo("S1") });
  const plan = lessonPlan(u01, "S3");
  expect(plan.shownItemCount).toBe(6);
  expect(plan.questionCount).toBe(6);

  tapNode(u01, "S3");
  expect(solveLesson(plan, true)).toEqual(
    plan.activities.map((activity) => contentIdOf[activity.form]),
  );
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S3"));

  expect(learningEvents(events)).toEqual([
    {
      name: "episode_lesson_started",
      episodeId: u01,
      unitKey: "S3",
      unitRole: "lesson",
      questionCount: "6",
      shownItemCount: "6",
      skippedItemCount: String(plan.skippedItemCount),
    },
    {
      name: "episode_lesson_finished",
      episodeId: u01,
      unitKey: "S3",
      unitRole: "lesson",
      verdict: "passed",
      correctCount: "6",
      questionCount: "6",
    },
  ]);
});
