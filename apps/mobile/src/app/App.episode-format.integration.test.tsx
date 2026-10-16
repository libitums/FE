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
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { isTypeableAnswer, keystrokesFor } from "../lib/hangul-keyboard";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { fillPlaceholders } from "../lib/placeholder-fill";
import type { FillScript } from "../lib/placeholder-fill";
import type { TypingQuestion } from "../screens/typing/typing.contract";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { journeySteps } from "../screens/journey-map/journey-map";

// `integration` 계층: 새 형식 내장본(모킹 없음) 그대로 앱 전체를 걷습니다 - 활동이 0개인 CULT 단계의 즉시 완료,
// 완료 키(`completion.requires`)에 따른 트로피 · 다음 표지 열림, 건너뜀이 섞인 단계의 진행, 대화 조립의 칸
// 화자, 옛 진행 키(`S9`) 내성을 한 트리에서 봅니다. 대역은 경계뿐입니다 - `NativeModules`(저장소 · 오디오) ·
// `fetch`(Supabase 갱신 · 학습 RPC · 콘텐츠 버킷) · `vi.stubEnv`. 카탈로그 · 계획 · 화면은 실물입니다.
// 정답은 계약 함수(`catalogLessonPlanOf`)가 내는 계획에서 읽어 탭합니다.

const supabaseUrl = "https://test.supabase.co";

type Rpc = { readonly name: string; readonly body: Record<string, unknown> };

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
const nodeKeys = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"];

// ---------------------------------------------------------------- 계획 (정답의 출처)

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const fill = (text: string, script: FillScript) => fillPlaceholders(text, {}, script);

function lessonPlan(episodeId: string, key: string): CatalogLessonPlan {
  const entry = realCatalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") throw new Error(`not ready: ${episodeId}`);
  const plan = catalogLessonPlanOf(entry, key, fill, () => null);
  if (plan === null) throw new Error(`no unit: ${key}`);
  return plan;
}

// ---------------------------------------------------------------- 부팅

type Booted = { readonly rpcs: Rpc[]; readonly events: EpisodeIntroEvent[] };

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function boot(progress: Record<string, string[]>): Promise<Booted> {
  const store = new Map<string, string>();
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
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

  const rpcs: Rpc[] = [];
  const snapshot = { ...tutorialDoneSnapshot, catalogProgress: progress };
  vi.stubGlobal("fetch", (url: string, init?: { body?: string }) => {
    if (url.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedBody });
    }
    if (isContentRequest(url)) return Promise.resolve(contentNotFoundResponse());
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
const status = (episodeId: string, key: string) => node(episodeId, key).getAttribute("data-status");
const cover = (episodeId: string) =>
  screen.getByTestId(`ui-lynx-learning-unit-catalog-cover-${episodeId}`);
const exitResult = () => tapButtonIn("lesson-complete-screen-exit");
const title = () => screen.getByTestId("lesson-complete-screen-title");
// 칩의 이름(`2 trophies`)에서 읽습니다 — 오름 재생(ADR-0064) 동안 칩은 옛 값과 새 값을 함께 보이지만 이름은 처음부터 새 값입니다.
const trophyCount = (): number =>
  Number(
    /\d+/.exec(screen.getByTestId("top-bar-trophy").getAttribute("accessibility-label") ?? "")?.[0],
  );

const savedProgress = (rpcs: readonly Rpc[]): Record<string, unknown>[] =>
  rpcs
    .filter((rpc) => rpc.name === "save_learning_progress")
    .map((rpc) => rpc.body["p_progress"] as Record<string, unknown>);
const savedUnits = (rpcs: readonly Rpc[], episodeId: string): string[] =>
  (savedProgress(rpcs).at(-1)?.["catalogProgress"] as Record<string, string[]> | undefined)?.[
    episodeId
  ] ?? [];

const learningEvents = (events: readonly EpisodeIntroEvent[]) =>
  events.filter((event) => event.name.startsWith("episode_lesson_"));

const contentIdOf: Record<CatalogActivity["form"], string> = {
  "word-choice": "word-choice-screen-content",
  listening: "listening-screen-content",
  "sentence-order": "sentence-order-screen-content",
  typing: "typing-activity-content",
  "vocab-card": "vocab-card-content",
  "pair-match": "pair-match-content",
};
const activityScreenIds = Object.values(contentIdOf);

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
      // 카드는 문항 수만큼 버튼을 누릅니다 — 마지막 카드의 버튼이 곧 다음 걸음이라 완료 카드가 없습니다.
      for (let index = 0; index < activity.questions.length; index += 1) {
        tapId("learning-shell-action");
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

// ---------------------------------------------------------------- 테스트

const throughS8 = ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];

test("EF1. (AC4) 표지만 끝낸 진행: u01 구획에 노드 10개(레슨 9 + 최종)가 서고 S1만 열리며 CULT는 Lesson 9로 잠겨 있다", async () => {
  await boot({ [u01]: ["intro"] });

  const nodes = Array.from(
    document.querySelectorAll('[data-testid^="ui-lynx-learning-unit-catalog-unit-u01-water-"]'),
  ).filter((element) => /-u01-water-[A-Za-z0-9]+$/.test(element.getAttribute("data-testid") ?? ""));
  expect(nodes).toHaveLength(10);
  expect(status(u01, "S1")).toBe("available");
  for (const key of nodeKeys.slice(1)) expect(status(u01, key)).toBe("default");
  expect(node(u01, "CULT")).toHaveAttribute("accessibility-label", "Episode 1. Lesson 9, locked");
  tapNode(u01, "CULT");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  for (const id of activityScreenIds) expect(screen.queryByTestId(id)).not.toBeInTheDocument();
});

test("EF2. (AC4) 활동이 0개인 CULT: 활동 화면 없이 결과 화면 → 나가기 → CULT 끝 · RP 열림 · 기록 · 이벤트 둘", async () => {
  const { rpcs, events } = await boot({ [u01]: throughS8 });
  const plan = lessonPlan(u01, "CULT");
  expect(plan.activities).toHaveLength(0);
  expect(plan.skippedItemCount).toBe(6);
  expect(status(u01, "CULT")).toBe("available");
  expect(status(u01, "RP")).toBe("default");

  tapNode(u01, "CULT");
  for (const id of activityScreenIds) expect(screen.queryByTestId(id)).not.toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-exit")).toBeInTheDocument();
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(status(u01, "CULT")).toBe("clear");
  expect(status(u01, "RP")).toBe("available");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("CULT"));
  expect(learningEvents(events)).toEqual([
    {
      name: "episode_lesson_started",
      episodeId: u01,
      unitKey: "CULT",
      unitRole: "lesson",
      questionCount: "0",
      shownItemCount: "0",
      skippedItemCount: "6",
    },
    {
      name: "episode_lesson_finished",
      episodeId: u01,
      unitKey: "CULT",
      unitRole: "lesson",
      verdict: "passed",
      correctCount: "0",
      questionCount: "0",
    },
  ]);
});

test("EF3. (AC3) 옛 키 모양 진행(S2 · CULT 없음)은 완료가 아니고, S2 · CULT를 끝내면 트로피 +1 · u02 표지가 열린다", async () => {
  const oldShape = ["intro", "S1", "S3", "S4", "S5", "S6", "S7", "S8", "RP"];
  await boot({ [u01]: oldShape });
  const baseline = trophyCount();
  expect(cover(u02)).toHaveAttribute("data-status", "default");
  expect(status(u01, "S2")).toBe("available");
  expect(status(u01, "CULT")).toBe("available");

  tapNode(u01, "S2");
  solveLesson(lessonPlan(u01, "S2"), true);
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();
  expect(status(u01, "S2")).toBe("clear");
  expect(trophyCount()).toBe(baseline);
  expect(cover(u02)).toHaveAttribute("data-status", "default");

  tapNode(u01, "CULT");
  exitResult();
  await flush();
  expect(status(u01, "CULT")).toBe("clear");
  expect(trophyCount()).toBe(baseline + 1);
  expect(cover(u02)).toHaveAttribute("data-status", "available");
});

test("EF4. (AC5) 건너뜀이 섞인 S5: 계획의 단어 선택 · 타자 문항을 끝까지 맞히면 PERFECT · 기록 · 이벤트의 건너뜀 수가 계획과 같다", async () => {
  const { rpcs, events } = await boot({ [u01]: ["intro", "S1", "S2", "S3", "S4"] });
  const plan = lessonPlan(u01, "S5");
  expect(plan.skippedItemCount).toBeGreaterThan(0);
  expect(plan.activities.map((activity) => activity.form)).toContain("word-choice");

  tapNode(u01, "S5");
  expect(solveLesson(plan, true)).toEqual(
    plan.activities.map((activity) => contentIdOf[activity.form]),
  );
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();

  expect(status(u01, "S5")).toBe("clear");
  expect(status(u01, "S6")).toBe("available");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S5"));
  expect(learningEvents(events)).toEqual([
    {
      name: "episode_lesson_started",
      episodeId: u01,
      unitKey: "S5",
      unitRole: "lesson",
      questionCount: String(plan.questionCount),
      shownItemCount: String(plan.shownItemCount),
      skippedItemCount: String(plan.skippedItemCount),
    },
    {
      name: "episode_lesson_finished",
      episodeId: u01,
      unitKey: "S5",
      unitRole: "lesson",
      verdict: "passed",
      correctCount: String(plan.questionCount),
      questionCount: String(plan.questionCount),
    },
  ]);
});

test("EF5. (D9) S2의 대화 조립: 칸 0의 화자가 콘텐츠 턴 화자를 따른다 - 나부터 시작하는 문항은 me, 상대부터인 문항은 counterpart", async () => {
  await boot({ [u01]: ["intro", "S1"] });
  const plan = lessonPlan(u01, "S2");
  tapNode(u01, "S2");

  const expected: (string | undefined)[] = [];
  const shown: (string | null)[] = [];
  plan.activities.forEach((activity, index) => {
    expect(screen.getByTestId(contentIdOf[activity.form])).toBeInTheDocument();
    const first = activity.form === "sentence-order" ? activity.questions[0] : undefined;
    const slot = screen.queryByTestId("sentence-order-dialogue-slot-0");
    if (first !== undefined || slot !== null) {
      expected.push(first?.dialogue?.speakers[0]);
      shown.push(slot?.getAttribute("data-speaker") ?? null);
    }
    solveActivity(activity, true, index === plan.activities.length - 1);
  });
  expect(shown).toEqual(expected);
  expect(shown).toContain("me");
  expect(shown).toContain("counterpart");
});

test("EF6. (A3 옛 키) 옛 키 S9가 섞인 진행도 맵 · 시작이 던지지 않고 S9 노드는 서지 않는다", async () => {
  await boot({ [u01]: ["intro", "S1", "S9"] });

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(status(u01, "S1")).toBe("clear");
  expect(status(u01, "S2")).toBe("available");
  expect(document.querySelector('[data-testid$="-u01-water-S9"]')).toBeNull();
  tapNode(u01, "S2");
  const first = lessonPlan(u01, "S2").activities[0];
  expect(screen.getByTestId(contentIdOf[first?.form ?? "word-choice"])).toBeInTheDocument();
});
