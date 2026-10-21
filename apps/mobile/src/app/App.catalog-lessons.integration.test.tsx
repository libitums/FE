import { legacyPassedSeed, legacyPassedRecord } from "./test-helpers/progress-seed";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { catalogFinalPlanOf } from "./catalog-final-model";
import type { CatalogRoleplayTurn } from "./catalog-final-model";
import { catalogLessonPlanOf } from "./catalog-lesson-plan";
import type { CatalogActivity, CatalogLessonPlan } from "./catalog-lesson-plan";
import { resetPushWiringForTests } from "./push-wiring";
import {
  contentNotFoundResponse,
  contentPathOf,
  isContentRequest,
} from "./test-helpers/content-requests";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { isTypeableAnswer, isTypedAnswerCorrect, keystrokesFor } from "../lib/hangul-keyboard";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { fillPlaceholders } from "../lib/placeholder-fill";
import type { FillScript } from "../lib/placeholder-fill";
import { sha256Hex, utf8Bytes } from "../lib/sha256";
import { systemBackEventName } from "../lib/system-back";
import type { TypingQuestion } from "../screens/typing/typing.contract";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { EPISODE_BANNER_HOLD_MS } from "../screens/catalog-cover/episode-banner";
import { catalogNodeTestId } from "./test-helpers/map-unit-testid";

// 옛 형식 내장본(2026-10-14)의 흐름을 걷는 테스트입니다 — 내장본 자리를 옛 픽스처로 바꿉니다.
vi.mock("../lib/episode-bundled", async () => {
  const legacy = await import("../lib/episode-legacy.test-support");
  return { bundledCatalogInput: legacy.legacyCatalogInput };
});

// `integration` 계층: 앱 세션에서 「맵 레슨 노드 → 활동들 → 결과 → 진행 기록 → 다음 노드 열림」과
// 「최종 테스트 → 결과 → 통과 뒤 컷 → 다음 에피소드 표지」, 이벤트 sink, 실행 안 세션 고정, 그림 실패를
// 한 트리에서 봅니다. 대역은 경계뿐입니다 — `NativeModules`(저장소 · 시스템 뒤로 · 오디오) ·
// `fetch`(Supabase 갱신 · 학습 RPC · 콘텐츠 버킷) · `vi.stubEnv`. 카탈로그 · 계획 · 화면은 실물입니다.
// 정답은 계약 함수(`catalogLessonPlanOf` · `catalogFinalPlanOf`)가 내는 계획에서 읽어 탭합니다.

const supabaseUrl = "https://test.supabase.co";

type Rpc = { readonly name: string; readonly body: Record<string, unknown> };

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

const u01 = "u01-water";
const u02 = "u02-checkin";
const upTo = (...keys: string[]) => ({ [u01]: ["intro", ...keys] });
const throughS5 = upTo("S1", "S3", "S4", "S5");
const throughS9 = upTo("S1", "S3", "S4", "S5", "S6", "S7", "S8", "S9");

// ---------------------------------------------------------------- 계획 (정답의 출처)

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const fill = (text: string, script: FillScript) => fillPlaceholders(text, {}, script);

function readyEntry(episodeId: string) {
  const entry = realCatalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") throw new Error(`not ready: ${episodeId}`);
  return entry;
}

function lessonPlan(episodeId: string, key: string): CatalogLessonPlan {
  const plan = catalogLessonPlanOf(readyEntry(episodeId), key, fill, () => null);
  if (plan === null) throw new Error(`no unit: ${key}`);
  return plan;
}

const finalPlan = (episodeId: string, ordinal: number) =>
  catalogFinalPlanOf(readyEntry(episodeId), ordinal, fill, (path) => path);

// ---------------------------------------------------------------- 부팅

type BootOptions = {
  readonly progress?: Record<string, string[]>;
  readonly serve?: { readonly manifest: string; readonly episodes: Record<string, string> };
  readonly holdBodies?: boolean;
  readonly backHost?: { readonly respond: (token: string, outcome: string) => void };
};

type Booted = {
  readonly rpcs: Rpc[];
  readonly events: EpisodeIntroEvent[];
  readonly play: ReturnType<
    typeof vi.fn<(source: string, done: (result: unknown) => void) => void>
  >;
  readonly releaseBodies: () => void;
};

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function boot(options: BootOptions = {}): Promise<Booted> {
  const store = new Map<string, string>();
  store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  const play = vi.fn<(source: string, done: (result: unknown) => void) => void>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    AudioPlaybackModule: { play, stop: vi.fn<() => void>() },
    ...(options.backHost === undefined
      ? {}
      : { SystemBackModule: { ready: vi.fn<() => void>(), respond: options.backHost.respond } }),
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

  const rpcs: Rpc[] = [];
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const snapshot =
    options.progress === undefined
      ? null
      : { ...tutorialDoneSnapshot, catalogProgress: options.progress };
  vi.stubGlobal("fetch", (url: string, init?: { body?: string }) => {
    if (url.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedBody });
    }
    if (isContentRequest(url)) {
      if (options.serve === undefined) return Promise.resolve(contentNotFoundResponse());
      if (contentPathOf(url) === "manifest.json") {
        return Promise.resolve({ status: 200, text: async () => options.serve?.manifest ?? "" });
      }
      const id = /^episodes\/([^/]+)\.json$/.exec(contentPathOf(url) ?? "")?.[1];
      const body = id === undefined ? undefined : options.serve.episodes[id];
      if (body === undefined) return Promise.resolve(contentNotFoundResponse());
      const reply = { status: 200, text: async () => body };
      return options.holdBodies === true ? gate.then(() => reply) : Promise.resolve(reply);
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
  return { rpcs, events, play, releaseBodies: release };
}

afterEach(() => {
  cleanup();
  setHostInsets(undefined);
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------- 호스트 인셋 (자판 도킹)

type HostInsets = {
  readonly safeAreaInsets: { top: number; bottom: number; left: number; right: number };
  readonly tappableBottomInset: number;
};
const threeButton: HostInsets = {
  safeAreaInsets: { top: 24, bottom: 48, left: 0, right: 0 },
  tappableBottomInset: 48,
};
function setHostInsets(value: HostInsets | undefined): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
}
const shellPaddingBottom = (): string => screen.getByTestId("app-shell").style.paddingBottom;
const shellPaddingTop = (): string => screen.getByTestId("app-shell").style.paddingTop;
const keyRowsMargin = (): string =>
  screen.getByTestId("messenger-keyboard-rows").style.marginBottom;
const typingBodyMargin = (): string =>
  screen.getByTestId("typing-activity-body").style.marginBottom;

// ---------------------------------------------------------------- 조작 · 관찰 헬퍼

const tapId = (id: string): void => void fireEvent.tap(screen.getByTestId(id), {});
const tapButtonIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});
const tapRoundIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-round-button"), {});
const node = (episodeId: string, key: string) =>
  screen.getByTestId(catalogNodeTestId(episodeId, key));
// 열린 노드를 누르면 말풍선이 서고 `Start`가 유닛을 엽니다. 잠긴 노드는 말풍선이 없어 누름으로 끝납니다.
const tapNode = (episodeId: string, key: string): void => {
  fireEvent.tap(node(episodeId, key), {});
  const start = screen.queryByTestId("step-sheet-start");
  if (start !== null) fireEvent.tap(start, {});
};
const status = (episodeId: string, key: string) => node(episodeId, key).getAttribute("data-status");
const cover = (episodeId: string) =>
  screen.getByTestId(`ui-lynx-special-unit-catalog-cover-${episodeId}`);
const tapNext = () => tapButtonIn("catalog-cover-screen-next");
const tapIntroNext = () => tapButtonIn("episode-intro-screen-next");
// 배너의 유지 시간만 가짜 시계로 밉니다 - 통과 뒤 컷 앞에서 켜고 `passBanner`가 실제 시계로 되돌립니다.
const useBannerClock = () => void vi.useFakeTimers();
async function settleFake(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}
function passBanner(): void {
  if (screen.queryByTestId("episode-banner-screen") !== null) {
    act(() => {
      vi.advanceTimersByTime(EPISODE_BANNER_HOLD_MS);
    });
  }
  vi.useRealTimers();
}
const exitResult = () => tapButtonIn("lesson-complete-screen-exit");

function readAllCuts(count: number): void {
  for (let i = 0; i < count; i += 1) {
    const dialog = screen.queryByTestId("ui-lynx-visual-novel-dialog");
    if (dialog?.getAttribute("data-status") === "revealing") tapNext();
    tapNext();
  }
}

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
  "read-aloud": "read-aloud-content",
  "speak-word": "speak-word-content",
};

const lettersOnly = (text: string) => text.normalize("NFC").replace(/[^ㄱ-ㆎ가-힣]/g, "");
function typeKeys(text: string): void {
  for (const key of keystrokesFor(text)) tapId(`messenger-key-${key}`);
}
function typeAnswer(question: TypingQuestion): void {
  typeKeys(lettersOnly(question.answers.find(isTypeableAnswer) ?? question.answers[0]));
}

/**
 * 활동 하나를 끝까지 풉니다. 레슨의 마지막 활동이면 완료 카드의 `See results`까지 누르고, 중간 활동이면
 * 마지막 문항 뒤 곧바로 다음 활동으로 넘어가므로 누르지 않습니다(E-1). `right`가 거짓이면 전부 틀립니다.
 */
function solveActivity(activity: CatalogActivity, right: boolean, last = true): void {
  switch (activity.form) {
    case "word-choice":
      for (const question of activity.questions) {
        // 그림 문항은 그림이 서야 답을 받습니다 — 먼저 load를 쏩니다.
        const picture = screen.queryByTestId("word-choice-picture-image");
        if (picture !== null) fireEvent(picture, new window.Event("bindEvent:load"));
        tapId(
          `word-choice-option-${right ? question.answerIndex : question.answerIndex === 0 ? 1 : 0}`,
        );
        tapId("learning-shell-advance");
      }
      break;
    case "listening":
      for (const question of activity.questions) {
        tapId(
          `listening-choice-${right ? question.answerIndex : question.answerIndex === 0 ? 1 : 0}`,
        );
        tapId("learning-shell-advance");
      }
      break;
    case "sentence-order":
      for (const question of activity.questions) {
        const order = right ? question.answerOrder : [...question.answerOrder].reverse();
        for (const chip of order) tapId(`sentence-order-chip-${chip}`);
        tapId("learning-shell-action");
        tapId("learning-shell-action");
      }
      break;
    case "typing":
      for (const question of activity.questions) {
        if (right) typeAnswer(question);
        else typeKeys("가");
        tapId("learning-shell-action");
        tapId("learning-shell-action");
      }
      break;
    case "vocab-card":
      // 카드는 문항 수만큼 `Got it`을 누릅니다 — 마지막 카드의 버튼이 곧 다음 걸음이라 완료 카드가 없습니다.
      for (let index = 0; index < activity.questions.length; index += 1) {
        tapButtonIn("vocab-card-got-it");
      }
      return;
    case "pair-match":
      for (const question of activity.questions) {
        question.answer.forEach((meaning, word) => {
          tapId(`pair-match-word-${word}`);
          tapId(`pair-match-meaning-${right ? meaning : (meaning + 1) % question.meanings.length}`);
        });
        tapId("learning-shell-action");
        tapId("learning-shell-action");
      }
      break;
  }
  if (last) tapId("learning-shell-action");
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

function solveFinal(turns: readonly CatalogRoleplayTurn[], right: boolean): void {
  for (const turn of turns) {
    const order = correctPlacement(turn);
    for (const tile of right ? order : [...order].reverse()) tapId(`sentence-order-chip-${tile}`);
    tapButtonIn("catalog-final-screen-action");
    tapButtonIn("catalog-final-screen-action");
  }
}

const title = () => screen.getByTestId("lesson-complete-screen-title");

// ---------------------------------------------------------------- 테스트

test("L1. (AC1) 표지만 끝낸 진행: S1만 열리고 나머지는 잠겨 있으며 잠긴 노드를 눌러도 맵에 남는다", async () => {
  await boot({ progress: upTo() });

  expect(status(u01, "S1")).toBe("available");
  for (const key of ["S3", "S4", "S5", "S6", "S7", "S8", "S9", "RP"]) {
    expect(status(u01, key)).toBe("default");
  }
  tapNode(u01, "S3");
  tapNode(u01, "RP");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId(contentIdOf["word-choice"])).not.toBeInTheDocument();
});

test("L1b. (낭독) 표지 · 레슨 · 최종 노드의 이름은 Episode n.으로 시작하고 상태가 붙는다", async () => {
  await boot({ progress: upTo() });

  expect(node(u01, "S1")).toHaveAttribute("accessibility-label", "Episode 1. Lesson 1");
  expect(node(u01, "S3")).toHaveAttribute("accessibility-label", "Episode 1. Lesson 2, locked");
  expect(node(u01, "RP")).toHaveAttribute(
    "accessibility-label",
    expect.stringMatching(/^special, Episode 1\. Final test, locked/),
  );
  expect(cover(u01)).toHaveAttribute(
    "accessibility-label",
    expect.stringMatching(/^special, Episode 1\. Episode intro, completed/),
  );
  expect(cover(u02)).toHaveAttribute(
    "accessibility-label",
    expect.stringMatching(/^special, Episode 2\. Episode intro, locked/),
  );
  expect(document.querySelectorAll('[data-testid^="catalog-section-caption"]')).toHaveLength(0);
});

test("L2. (AC1 · 5) 카드 뒤 빈칸 고르기가 이어지는 S1: 카드 → 단어 선택 → 결과 PERFECT → 나가기 → S1 완료 · S3 열림 · 저장 · 이벤트", async () => {
  const { rpcs, events } = await boot({ progress: upTo() });
  const plan = lessonPlan(u01, "S1");

  tapNode(u01, "S1");
  expect(solveLesson(plan, true)).toEqual(["vocab-card-content", "word-choice-screen-content"]);
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(status(u01, "S1")).toBe("clear");
  expect(status(u01, "S3")).toBe("available");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toEqual(["intro", "S1"]));
  expect(rpcs.some((rpc) => rpc.name === "record_learning_days")).toBe(true);
  expect(learningEvents(events)).toEqual([
    {
      name: "episode_lesson_started",
      episodeId: u01,
      unitKey: "S1",
      unitRole: "lesson",
      questionCount: String(plan.questionCount),
      shownItemCount: String(plan.shownItemCount),
      skippedItemCount: String(plan.skippedItemCount),
    },
    {
      name: "episode_lesson_finished",
      episodeId: u01,
      unitKey: "S1",
      unitRole: "lesson",
      verdict: "passed",
      correctCount: String(plan.questionCount),
      questionCount: String(plan.questionCount),
      skippedCount: "0",
    },
  ]);
});

test("L2a. 노드를 누르면 말풍선이 서고(세션은 아직), 진행 줄 전체가 레슨의 표시 문항 수이며 Start가 레슨을 연다", async () => {
  await boot({ progress: upTo() });
  const plan = lessonPlan(u01, "S1");

  fireEvent.tap(node(u01, "S1"), { detail: { y: 300 } });
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  // 이 파일의 콘텐츠(내장본)에 영어 제목이 없으면 매니페스트 제목이 섭니다.
  const entry = realCatalog.find((candidate) => candidate.id === u01);
  const episodeTitle =
    entry?.status === "ready" ? (entry.episode.titleEn ?? entry.title) : (entry?.title ?? "");
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent(`Lesson 1: “${episodeTitle}”`);
  expect(screen.getByTestId("step-sheet-progress-count")).toHaveTextContent(
    `0/${String(plan.shownItemCount)}`,
  );
  expect(screen.getByTestId("ui-lynx-episode-header-label")).toHaveTextContent(
    "Episode 1, unit 01",
  );

  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("vocab-card-content")).toBeInTheDocument();
});

test("L2b. (D5 고정) 실데이터의 어느 레슨 · 최종 테스트도 보일 문항이 0개가 아니다", () => {
  for (const entry of realCatalog) {
    if (entry.status !== "ready") continue;
    for (const unit of entry.episode.units) {
      if (unit.id === "RP") continue;
      expect(lessonPlan(entry.id, unit.id).questionCount).toBeGreaterThan(0);
    }
    expect(finalPlan(entry.id, 1).turns.length).toBeGreaterThan(0);
  }
});

test("L3. (AC2 · 4) S3: 소리 없는 듣기는 계획에서 빠져 활동 둘이 서고 전부 맞히면 기록된다", async () => {
  const { rpcs, events, play } = await boot({ progress: upTo("S1") });
  const plan = lessonPlan(u01, "S3");
  expect(plan.activities.map((activity) => activity.form)).toEqual([
    "word-choice",
    "sentence-order",
  ]);
  expect(plan.skippedItemCount).toBeGreaterThan(0);

  tapNode(u01, "S3");
  expect(solveLesson(plan, true)).toEqual(
    plan.activities.map((activity) => contentIdOf[activity.form]),
  );
  expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();
  expect(play).toHaveBeenCalledTimes(0);
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();

  expect(status(u01, "S3")).toBe("clear");
  expect(status(u01, "S4")).toBe("available");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S3"));
  expect(learningEvents(events).at(-1)).toMatchObject({
    name: "episode_lesson_finished",
    unitKey: "S3",
    verdict: "passed",
    correctCount: String(plan.questionCount),
    questionCount: String(plan.questionCount),
    skippedCount: "0",
  });
});

test("L3b. (E-1) 다학습형 레슨: 중간 활동은 완료 카드 없이 이어지고 카운터는 레슨 전체(카드 제외) 기준이며 결과 화면은 한 번이다", async () => {
  const { rpcs, events } = await boot({ progress: upTo("S1", "S3") });
  const plan = lessonPlan(u01, "S4");
  expect(plan.activities.map((activity) => activity.form)).toEqual([
    "vocab-card",
    "word-choice",
    "typing",
    "word-choice",
  ]);
  expect(plan.questionCount).toBe(4);
  expect(plan.shownItemCount).toBe(9);

  tapNode(u01, "S4");
  // ⟨2026-10-19⟩ 카드 다섯은 카운터에 세지 않습니다(ADR-0073) — 카드 구간에는 카운터가 없고, 그 뒤가
  // 카드를 뺀 4에서 1부터입니다.
  expect(screen.queryByTestId("learning-shell-chapter")).not.toBeInTheDocument();
  let ordinal = 0;
  plan.activities.forEach((activity, index) => {
    const last = index === plan.activities.length - 1;
    expect(screen.getByTestId(contentIdOf[activity.form])).toBeInTheDocument();
    if (activity.form !== "vocab-card") {
      expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent(
        `Lesson ${ordinal + 1} / 4`,
      );
      ordinal += activity.questions.length;
    }
    solveActivity(activity, true, last);
    // 중간 활동이 끝난 자리에는 완료 카드도 결과 화면도 없고 곧바로 다음 학습형의 첫 문항이다.
    if (!last) {
      expect(screen.queryByTestId("learning-activity-complete")).not.toBeInTheDocument();
      expect(screen.queryByTestId("lesson-complete-screen")).not.toBeInTheDocument();
    }
  });
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  expect(screen.getAllByTestId("lesson-complete-screen")).toHaveLength(1);
  exitResult();

  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S4"));
  expect(
    learningEvents(events).filter((event) => event.name === "episode_lesson_finished"),
  ).toHaveLength(1);
});

test("L4. (AC2 실패) S3를 전부 틀리면 기록이 없고 Try again이 첫 활동 첫 문항을 연다", async () => {
  const { rpcs } = await boot({ progress: upTo("S1") });
  const plan = lessonPlan(u01, "S3");
  const first = plan.activities[0];

  tapNode(u01, "S3");
  solveLesson(plan, false);
  expect(screen.getByTestId("lesson-complete-screen-retry")).toBeInTheDocument();
  expect(title()).not.toHaveTextContent("PERFECT LESSON!");
  await flush();
  expect(everSaved(rpcs, u01, "S3")).toBe(false);

  tapButtonIn("lesson-complete-screen-retry");
  expect(screen.getByTestId(contentIdOf["word-choice"])).toBeInTheDocument();
  if (first?.form !== "word-choice") throw new Error("first activity is word-choice");
  expect(screen.getByTestId("word-choice-screen-prompt")).toHaveTextContent(
    first.questions[0].prompt,
  );
});

test("L5. (AC3 · 4) S6 받아쓰기: 소리 없는 카드 · 마침표와 띄어쓰기 없이 맞고 다른 말은 틀리며 통과하면 기록된다", async () => {
  const { rpcs, play } = await boot({ progress: throughS5 });
  const plan = lessonPlan(u01, "S6");
  const activity = plan.activities[0];
  if (activity?.form !== "typing") throw new Error("S6 is typing");

  tapNode(u01, "S6");
  expect(screen.getByTestId("typing-activity-content")).toBeInTheDocument();
  expect(screen.getByTestId("typing-activity-audio")).toHaveAttribute(
    "accessibility-traits",
    "disabled",
  );
  expect(screen.getByTestId("typing-activity-cue")).toHaveTextContent(activity.questions[0].cue);

  typeAnswer(activity.questions[0]);
  tapId("learning-shell-action");
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(screen.getByTestId("typing-activity-reveal")).toBeInTheDocument();
  tapId("learning-shell-action");

  typeKeys("가");
  tapId("learning-shell-action");
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  tapId("learning-shell-action");

  for (const question of activity.questions.slice(2)) {
    typeAnswer(question);
    tapId("learning-shell-action");
    tapId("learning-shell-action");
  }
  tapId("learning-shell-action");

  expect(screen.getByTestId("lesson-complete-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("lesson-complete-screen-retry")).not.toBeInTheDocument();
  expect(play).toHaveBeenCalledTimes(0);
  exitResult();
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S6"));
  expect(status(u01, "S6")).toBe("clear");
});

test("L6. (AC6) 최종 테스트: 턴을 타일로 맞히면 결과 → 통과 뒤 컷 → 맵 · 다음 표지 열림 · 기록 · 이벤트", async () => {
  const { rpcs, events } = await boot({ progress: throughS9 });
  const plan = finalPlan(u01, 1);
  expect(status(u01, "RP")).toBe("available");
  expect(cover(u02)).toHaveAttribute("data-status", "default");

  tapNode(u01, "RP");
  expect(screen.getByTestId("catalog-final-screen")).toBeInTheDocument();
  expect(screen.getByTestId("catalog-final-screen-progress")).toHaveTextContent(
    `Turn 1 of ${plan.turns.length}`,
  );
  solveFinal(plan.turns, true);
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  useBannerClock();
  exitResult();

  expect(screen.getByTestId("catalog-cover-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.queryByTestId("catalog-final-screen")).not.toBeInTheDocument();
  readAllCuts(3);
  await settleFake();

  const banner = screen.getByTestId("episode-banner-screen");
  expect(banner).toHaveAttribute("data-kind", "clear");
  expect(banner).toHaveAttribute("accessibility-label", "Episode clear!");
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  passBanner();
  await flush();

  expect(screen.queryByTestId("episode-banner-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(status(u01, "RP")).toBe("clear");
  expect(cover(u02)).toHaveAttribute("data-status", "available");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("RP"));
  const count = String(plan.turns.length);
  expect(learningEvents(events)).toEqual([
    {
      name: "episode_lesson_started",
      episodeId: u01,
      unitKey: "RP",
      unitRole: "final",
      questionCount: count,
      shownItemCount: count,
      skippedItemCount: String(plan.skippedItemCount),
    },
    {
      name: "episode_lesson_finished",
      episodeId: u01,
      unitKey: "RP",
      unitRole: "final",
      verdict: "passed",
      correctCount: count,
      questionCount: count,
      skippedCount: "0",
    },
    { name: "episode_final_passed", episodeId: u01, correctCount: count, turnCount: count },
  ]);
});

test("L6c. 최종 테스트 통과 결과 화면에서 트로피 칩이 오름을 재생한다(튜토리얼 결과 화면과 같은 연결)", async () => {
  await boot({ progress: throughS9 });
  const plan = finalPlan(u01, 1);

  tapNode(u01, "RP");
  solveFinal(plan.turns, true);
  expect(title()).toHaveTextContent("PERFECT LESSON!");

  await vi.waitFor(() =>
    expect(screen.getByTestId("lesson-complete-screen-trophy-roll")).toBeInTheDocument(),
  );
});

test("L6b. 최종 테스트를 전부 틀리면 통과 뒤 컷 없이 Try again이 서고 기록 · final_passed가 없다", async () => {
  const { rpcs, events } = await boot({ progress: throughS9 });
  const plan = finalPlan(u01, 1);

  tapNode(u01, "RP");
  solveFinal(plan.turns, false);
  expect(screen.getByTestId("lesson-complete-screen-retry")).toBeInTheDocument();
  exitResult();
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("catalog-cover-screen")).not.toBeInTheDocument();
  expect(status(u01, "RP")).toBe("available");
  expect(everSaved(rpcs, u01, "RP")).toBe(false);
  expect(learningEvents(events).map((event) => event.name)).toEqual([
    "episode_lesson_started",
    "episode_lesson_finished",
  ]);
});

test("L7. (AC6 잠금) S8까지만 끝낸 진행에서는 RP가 잠겨 있고 눌러도 무반응이다", async () => {
  await boot({ progress: upTo("S1", "S3", "S4", "S5", "S6", "S7", "S8") });

  expect(status(u01, "S9")).toBe("available");
  expect(status(u01, "RP")).toBe("default");
  tapNode(u01, "RP");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("catalog-final-screen")).not.toBeInTheDocument();
});

test("L8. 레슨 도중 나가기 · 최종 도중 시스템 뒤로는 기록 없이 맵으로, 통과 뒤 컷 도중 나가기는 기록을 지킨다", async () => {
  const respond = vi.fn<(token: string, outcome: string) => void>();
  const { rpcs, events } = await boot({ progress: throughS9, backHost: { respond } });

  tapNode(u01, "S9");
  tapId("learning-shell-exit");
  tapButtonIn("ui-lynx-dialog-action-leave");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(status(u01, "S9")).toBe("clear");

  tapNode(u01, "RP");
  expect(screen.getByTestId("catalog-final-screen")).toBeInTheDocument();
  pressBack("1");
  await flush();
  expect(respond).toHaveBeenCalledWith("1", "handled");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(status(u01, "RP")).toBe("available");
  expect(learningEvents(events).map((event) => event.name)).toEqual([
    "episode_lesson_started",
    "episode_lesson_started",
  ]);
  expect(everSaved(rpcs, u01, "RP")).toBe(false);

  tapNode(u01, "RP");
  solveFinal(finalPlan(u01, 1).turns, true);
  exitResult();
  expect(screen.getByTestId("catalog-cover-screen")).toBeInTheDocument();
  tapRoundIn("catalog-cover-screen-back");
  await flush();

  expect(screen.queryByTestId("episode-banner-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(status(u01, "RP")).toBe("clear");
  expect(cover(u02)).toHaveAttribute("data-status", "available");
});

test("L9. (AC7) 컷의 새 그림이 error를 내면 이전 그림 층이 걷히고 실패 상태가 되며 글과 버튼은 그대로다", async () => {
  await boot({ progress: {} });
  fireEvent.tap(cover(u01), {});
  tapIntroNext();
  readAllCuts(2);

  expect(screen.getByTestId("narrative-background-previous-motion")).toBeInTheDocument();
  fireEvent(screen.getByTestId("narrative-background-image"), new window.Event("bindEvent:error"));

  expect(screen.queryByTestId("narrative-background-previous-motion")).not.toBeInTheDocument();
  expect(screen.getByTestId("narrative-background")).toHaveAttribute("data-load-state", "failed");
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toBeInTheDocument();
  expect(screen.getByTestId("catalog-cover-screen-next")).toBeInTheDocument();
});

test("L10. 결과의 Try again 뒤 나가면 스택은 맵 하나라 시스템 뒤로가 앱을 떠난다", async () => {
  const respond = vi.fn<(token: string, outcome: string) => void>();
  await boot({ progress: upTo("S1"), backHost: { respond } });

  tapNode(u01, "S3");
  solveLesson(lessonPlan(u01, "S3"), false);
  tapButtonIn("lesson-complete-screen-retry");
  expect(screen.getByTestId(contentIdOf["word-choice"])).toBeInTheDocument();
  tapId("learning-shell-exit");
  tapButtonIn("ui-lynx-dialog-action-leave");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();

  pressBack("1");
  await flush();
  expect(respond).toHaveBeenCalledWith("1", "leave");
});

test("L11. (D12) 레슨 도중 갱신이 새 버전을 들여도 화면 · 문항 · 판정 기준은 실행 시작 때 그대로다", async () => {
  const bundledBody = JSON.parse(
    readFileSync(
      resolve(process.cwd(), "content/test-fixtures/delivery-2-2026-10-14/u01-water.json"),
      "utf8",
    ),
  ) as { steps: { id: string; items: unknown[] }[] };
  const body = JSON.stringify({
    ...bundledBody,
    steps: bundledBody.steps.map((step) =>
      step.id === "S3" ? { ...step, items: step.items.slice(1) } : step,
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
  const { events, releaseBodies } = await boot({
    progress: upTo("S1"),
    serve: { manifest, episodes: { [u01]: body } },
    holdBodies: true,
  });
  const plan = lessonPlan(u01, "S3");
  const first = plan.activities[0];
  if (first?.form !== "word-choice") throw new Error("first activity is word-choice");

  tapNode(u01, "S3");
  releaseBodies();
  await vi.waitFor(() =>
    expect(events.some((event) => event.name === "episode_content_refreshed")).toBe(true),
  );
  await flush();

  expect(screen.getByTestId("word-choice-screen-prompt")).toHaveTextContent(
    first.questions[0].prompt,
  );
  solveLesson(plan, true);
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  expect(learningEvents(events).at(-1)).toMatchObject({
    name: "episode_lesson_finished",
    unitKey: "S3",
    correctCount: String(plan.questionCount),
    questionCount: String(plan.questionCount),
    skippedCount: "0",
  });
});

test("L12. 카탈로그 학습을 하지 않은 실행은 학습 이벤트를 하나도 내지 않는다", async () => {
  const { events } = await boot({ progress: {} });

  fireEvent.tap(cover(u01), {});
  tapRoundIn("episode-intro-screen-back");

  expect(learningEvents(events)).toEqual([]);
});

test("KL1. (자판 도킹) 3버튼 · S6 받아쓰기: 셸 아래 0px에 자판 묶음 48px, Check 뒤 몸통이 48px를 이어받고 셸은 0px 그대로다", async () => {
  setHostInsets(threeButton);
  await boot({ progress: throughS5 });
  const activity = lessonPlan(u01, "S6").activities[0];
  if (activity?.form !== "typing") throw new Error("S6 is typing");

  tapNode(u01, "S6");
  expect(screen.getByTestId("typing-activity")).toBeInTheDocument();
  expect(shellPaddingTop()).toBe("24px");
  expect(shellPaddingBottom()).toBe("0px");
  expect(screen.queryByTestId("app-navigator")).not.toBeInTheDocument();
  expect(typingBodyMargin()).toBe("0px");
  expect(keyRowsMargin()).toBe("48px");

  typeAnswer(activity.questions[0]);
  tapId("learning-shell-action");

  expect(screen.queryByTestId("messenger-keyboard")).not.toBeInTheDocument();
  expect(typingBodyMargin()).toBe("48px");
  expect(shellPaddingBottom()).toBe("0px");
});

test("KL2. (자판 도킹 회귀 가드) 3버튼 · S1 단어 카드: 셸 아래 48px에 위 24px, 받아쓰기 화면이 없다", async () => {
  setHostInsets(threeButton);
  // 표지를 끝낸 진행이어야 S1이 열립니다 — 아니면 맵에 남아 셸 값이 맵의 것이 됩니다.
  await boot({ progress: upTo() });

  tapNode(u01, "S1");
  expect(screen.getByTestId("vocab-card-content")).toBeInTheDocument();
  expect(screen.queryByTestId("typing-activity")).not.toBeInTheDocument();
  expect(shellPaddingBottom()).toBe("48px");
  expect(shellPaddingTop()).toBe("24px");
});

test("KL3. (자판 도킹) 3버튼 · 다학습형 S4: 받아쓰기 활동에서만 셸이 0px이고 자판 묶음이 48px, 다음 선택 활동에서 다시 48px다", async () => {
  setHostInsets(threeButton);
  await boot({ progress: upTo("S1", "S3") });
  const plan = lessonPlan(u01, "S4");

  tapNode(u01, "S4");
  const bottoms: string[] = [];
  const keyRows: (string | null)[] = [];
  plan.activities.forEach((activity, index) => {
    bottoms.push(shellPaddingBottom());
    keyRows.push(screen.queryByTestId("messenger-keyboard-rows")?.style.marginBottom ?? null);
    solveActivity(activity, true, index === plan.activities.length - 1);
  });

  expect(keyRows).toEqual([null, null, "48px", null]);
  expect(bottoms).toEqual(["48px", "48px", "0px", "48px"]);
});
