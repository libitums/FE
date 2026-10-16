// 새 형식 내장본 integration 테스트의 공용 부팅 · 조작 · 풀이 헬퍼입니다.
// 제품 코드가 import하지 않습니다. 이름에 `.test.`를 넣지 않습니다.
//
// 대역은 경계뿐입니다 - `NativeModules`(저장소 · 오디오) · `fetch`(Supabase 갱신 · 학습 RPC · 콘텐츠 버킷) ·
// `vi.stubEnv`. 카탈로그 · 계획 · 화면은 실물입니다. 쓰는 파일의 `afterEach`가 `resetApp`을 부릅니다.

import { expect, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "../App";
import type { AppJourneySeed } from "../journey-progress";
import { catalogLessonPlanOf } from "../catalog-lesson-plan";
import type { CatalogActivity, CatalogLessonPlan } from "../catalog-lesson-plan";
import { catalogSpellingOf } from "../catalog-build-map";
import { resetPushWiringForTests } from "../push-wiring";
import { contentNotFoundResponse, isContentRequest } from "./content-requests";
import { authSessionStorageKey, serializeAuthSession } from "../../lib/auth-session";
import { entrySplashDurationMs } from "../../lib/entry-flow";
import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import { isTypeableAnswer, keystrokesFor } from "../../lib/hangul-keyboard";
import { learningItemGuideSeenStorageKey } from "../../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../../lib/learning-item-guide.test-support";
import { fillPlaceholders } from "../../lib/placeholder-fill";
import type { FillScript } from "../../lib/placeholder-fill";
import type { TypingQuestion } from "../../screens/typing/typing.contract";
import type { EpisodeIntroEvent } from "../../screens/episode-intro/episode-intro.contract";
import { journeySteps } from "../../screens/journey-map/journey-map";

const supabaseUrl = "https://test.supabase.co";

export type Rpc = { readonly name: string; readonly body: Record<string, unknown> };

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

export const u01 = "u01-water";
export const u02 = "u02-checkin";
export const u03 = "u03-mina";
export const throughS8 = ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];

// ---------------------------------------------------------------- 계획 (정답의 출처)

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const fill = (text: string, script: FillScript) => fillPlaceholders(text, {}, script);
const imageUrlOf = (path: string): string => `https://cdn/${path}`;

export function lessonPlan(episodeId: string, key: string): CatalogLessonPlan {
  const entry = realCatalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") throw new Error(`not ready: ${episodeId}`);
  const plan = catalogLessonPlanOf(entry, key, fill, imageUrlOf);
  if (plan === null) throw new Error(`no unit: ${key}`);
  return plan;
}

// ---------------------------------------------------------------- 부팅

export type Booted = { readonly rpcs: Rpc[]; readonly events: EpisodeIntroEvent[] };

export async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

export async function boot(progress: Record<string, string[]>): Promise<Booted> {
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

export function resetApp(): void {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
}

// ---------------------------------------------------------------- 조작 · 관찰 헬퍼

export const tapId = (id: string): void => void fireEvent.tap(screen.getByTestId(id), {});
export const tapButtonIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});
export const node = (episodeId: string, key: string) =>
  screen.getByTestId(`ui-lynx-learning-unit-catalog-unit-${episodeId}-${key}`);
export const tapNode = (episodeId: string, key: string): void =>
  void fireEvent.tap(node(episodeId, key), {});
export const status = (episodeId: string, key: string) =>
  node(episodeId, key).getAttribute("data-status");
export const cover = (episodeId: string) =>
  screen.getByTestId(`ui-lynx-learning-unit-catalog-cover-${episodeId}`);
export const exitResult = () => tapButtonIn("lesson-complete-screen-exit");
export const title = () => screen.getByTestId("lesson-complete-screen-title");
export const trophyCount = (): number =>
  Number(within(screen.getByTestId("top-bar-trophy")).getByText(/^\d+$/).textContent);

export const savedProgress = (rpcs: readonly Rpc[]): Record<string, unknown>[] =>
  rpcs
    .filter((rpc) => rpc.name === "save_learning_progress")
    .map((rpc) => rpc.body["p_progress"] as Record<string, unknown>);
export const savedUnits = (rpcs: readonly Rpc[], episodeId: string): string[] =>
  (savedProgress(rpcs).at(-1)?.["catalogProgress"] as Record<string, string[]> | undefined)?.[
    episodeId
  ] ?? [];

export const learningEvents = (events: readonly EpisodeIntroEvent[]) =>
  events.filter((event) => event.name.startsWith("episode_lesson_"));

export const contentIdOf: Record<CatalogActivity["form"], string> = {
  "word-choice": "word-choice-screen-content",
  listening: "listening-screen-content",
  "sentence-order": "sentence-order-screen-content",
  typing: "typing-activity-content",
  "vocab-card": "vocab-card-content",
  "pair-match": "pair-match-content",
  "culture-card": "culture-card-content",
  "syllable-build": "syllable-build-content",
};
export const activityScreenIds = Object.values(contentIdOf);

const lettersOnly = (text: string) => text.normalize("NFC").replace(/[^ㄱ-ㆎ가-힣]/g, "");
export function typeKeys(text: string): void {
  for (const key of keystrokesFor(text)) tapId(`messenger-key-${key}`);
}
export function typeAnswer(question: TypingQuestion): void {
  typeKeys(lettersOnly(question.answers.find(isTypeableAnswer) ?? question.answers[0]));
}

export type SyllableQuestion = Extract<
  CatalogActivity,
  { form: "syllable-build" }
>["questions"][number];

/** 정답으로 이어지는 타일 인덱스 열입니다(철자 탐색). */
export function rightTiles(question: SyllableQuestion): readonly number[] {
  const spelling = catalogSpellingOf(question.tiles, question.answers[0]);
  if (spelling === null) throw new Error(`no spelling: ${question.answers[0]}`);
  return spelling;
}

/** 칸을 다 채우되 어느 정답과도 이어진 글자가 다른 타일 인덱스 열입니다. */
export function wrongTiles(question: SyllableQuestion): readonly number[] {
  const path: number[] = [];
  const found = (): boolean => {
    if (path.length === question.slotCount) {
      const word = path.map((index) => question.tiles[index] ?? "").join("");
      return !question.answers.includes(word);
    }
    for (let index = 0; index < question.tiles.length; index += 1) {
      if (path.includes(index)) continue;
      path.push(index);
      if (found()) return true;
      path.pop();
    }
    return false;
  };
  if (!found()) throw new Error("no wrong placement");
  return [...path];
}

export function solveSyllable(question: SyllableQuestion, right: boolean): void {
  for (const index of right ? rightTiles(question) : wrongTiles(question)) {
    tapId(`syllable-build-tile-${index}`);
  }
  tapId("learning-shell-action");
  tapId("learning-shell-action");
}

/**
 * 활동 하나를 끝까지 풉니다. 레슨의 마지막 활동이면 완료 카드의 `See results`까지 누르고, 중간 활동이면
 * 마지막 문항 뒤 곧바로 다음 활동으로 넘어가므로 누르지 않습니다(E-1). `right`가 거짓이면 전부 틀립니다.
 */
export function solveActivity(activity: CatalogActivity, right: boolean, last = true): void {
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
    case "culture-card":
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
    case "syllable-build":
      for (const question of activity.questions) solveSyllable(question, right);
      break;
  }
  if (last) tapId("learning-shell-action");
}

/** 계획의 활동을 순서대로 풀며 서는 화면의 루트 testid를 모읍니다. */
export function solveLesson(plan: CatalogLessonPlan, right: boolean): string[] {
  const seen: string[] = [];
  plan.activities.forEach((activity, index) => {
    const id = contentIdOf[activity.form];
    expect(screen.getByTestId(id)).toBeInTheDocument();
    seen.push(id);
    solveActivity(activity, right, index === plan.activities.length - 1);
  });
  return seen;
}
