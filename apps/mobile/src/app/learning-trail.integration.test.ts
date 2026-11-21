import { afterEach, expect, test, vi } from "vitest";

import type { AnswerResult } from "../lib/answer-result";
import {
  adoptGuestWordbook,
  emptyWordbook,
  isStarredIn,
  loadWordbook,
  saveWordbook,
  wordbookKeyOf,
} from "../lib/wordbook";
import { catalogItemReportWiring } from "./catalog-item-report-wiring";
import { catalogLessonFinish, type CatalogLessonFinishDeps } from "./catalog-lesson-finish";
import type { CatalogItemRef, CatalogLessonPlan } from "./catalog-lesson-types";
import type { CatalogReview } from "./catalog-review";
import { createLearningTrail } from "./learning-trail";
import { deviceLearningTrailPort } from "./learning-trail-port";
import type { NavAction } from "./nav-state";

// `integration` 계층: 레슨 결선 ↔ 레슨 자취 ↔ 기기 단어장(ADR-0169). 활동 보고(단어 카드 끝 · 첫 판정) · 판정 · 다시 풀기가
// 자취를 부르고, 자취가 저장소의 단어장 칸과 추천 신호를 남기는지 봅니다. 대역은 저장소(`NativeModules`)뿐입니다.

afterEach(() => {
  vi.unstubAllGlobals();
});

function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  return store;
}

const syllableItem = {
  itemId: "s3-02",
  itemType: "SYLLABLE_BUILD" as const,
  contentRef: "voca:a1",
};

test("TI1. 단어 카드 활동 끝 → 비회원 단어장에 voca가 들고, 그 단어의 첫 판정이 기록된다", () => {
  installStorage();
  const trail = createLearningTrail(deviceLearningTrailPort());
  const report = catalogItemReportWiring({ episodeIntroEventSink: null, learningTrail: trail });
  report.onCatalogCardsSeen("u01-water", [
    { itemId: "s1-01", itemType: "VOCAB_CARD", contentRef: "voca:a1" },
    { itemId: "s1-02", itemType: "VOCAB_CARD", contentRef: "expr:b2" },
  ]);
  report.onCatalogItemAnswered("u01-water", "S3", syllableItem, {
    questionIndex: 0,
    outcome: "incorrect",
    density: "regular",
  });
  const record = loadWordbook("guest").words[wordbookKeyOf("u01-water", "voca:a1")];
  expect(record).toMatchObject({ incorrect: 1, last: "incorrect" });
  expect(Object.keys(loadWordbook("guest").words)).toHaveLength(1);
});

test("TI-S1. (즐겨찾기 개정) 레슨 카드 별 → 비회원 단어장에 별과 함께 들고, 로그인 이관 뒤에도 계정 칸에 별이 남는다", () => {
  installStorage();
  const trail = createLearningTrail(deviceLearningTrailPort());
  const report = catalogItemReportWiring({ episodeIntroEventSink: null, learningTrail: trail });
  const cards: readonly CatalogItemRef[] = [
    { itemId: "s1-01", itemType: "VOCAB_CARD", contentRef: "voca:a1" },
    { itemId: "s1-02", itemType: "VOCAB_CARD", contentRef: "expr:b2" },
  ];
  expect(report.catalogCardStars("u01-water", cards)).toEqual([false, null]);
  report.onCatalogCardStar("u01-water", cards[0]!, true);
  expect(report.catalogCardStars("u01-water", cards)).toEqual([true, null]);
  expect(loadWordbook("guest").words[wordbookKeyOf("u01-water", "voca:a1")]?.starred).toBe(true);
  saveWordbook("u1", emptyWordbook);
  adoptGuestWordbook("u1");
  expect(isStarredIn(loadWordbook("u1"), "u01-water", "voca:a1")).toBe(true);
});

function finishWith(trail: ReturnType<typeof createLearningTrail>) {
  const plan = {
    episodeId: "u01-water",
    unitKey: "S3",
    activities: [{ form: "syllable-build", questions: [{}] }],
    questionCount: 1,
    shownItemCount: 1,
    skippedItemCount: 0,
    counterpartName: "",
    counterpartAvatarUrl: null,
    itemRefs: [[syllableItem]],
  } as unknown as CatalogLessonPlan;
  const actions: NavAction[] = [];
  let pending: readonly AnswerResult[] = [];
  const deps: CatalogLessonFinishDeps = {
    planOf: () => plan,
    dispatch: (action) => actions.push(action),
    sink: null,
    pendingResults: [],
    setPendingResults: (value) => {
      pending = typeof value === "function" ? value(pending) : value;
    },
    pendingSkippedCount: 0,
    setPendingSkippedCount: () => {},
    pendingMistakes: [],
    setPendingMistakes: () => {},
    claimFinish: () => true,
    clearSession: () => {},
    markDone: () => {},
    showComplete: () => {},
    learningTrail: trail,
  };
  return {
    finish: catalogLessonFinish(deps),
    actions,
    deps: () => ({ ...deps, pendingResults: pending }),
  };
}

test("TI2. 틀린 한글 읽기 문항을 다시 풀기에서 또 틀리고 실패 → 신호(연속 2 · failed)", () => {
  installStorage();
  const trail = createLearningTrail(deviceLearningTrailPort());
  catalogItemReportWiring({
    episodeIntroEventSink: null,
    learningTrail: trail,
  }).onCatalogItemAnswered("u01-water", "S3", syllableItem, {
    questionIndex: 0,
    outcome: "incorrect",
    density: "regular",
  });
  const { finish, actions, deps } = finishWith(trail);
  finish.onFinishCatalogActivity("u01-water", "S3", 0, ["incorrect"], 0);
  const review = (actions[actions.length - 1] as { screen: { review: CatalogReview } } | undefined)
    ?.screen.review;
  expect(review).toBeDefined();
  catalogLessonFinish(deps()).onFinishCatalogReview("u01-water", "S3", review!, ["incorrect"]);
  expect(trail.takeSignal()).toEqual({ hangulWrong: 1, repeatWrong: 2, end: "failed" });
});

test("TI3. 다 맞혀 끝내면 finished, 문턱 아래", () => {
  installStorage();
  const trail = createLearningTrail(deviceLearningTrailPort());
  finishWith(trail).finish.onFinishCatalogActivity("u01-water", "S3", 0, ["correct"], 0);
  expect(trail.takeSignal()).toEqual({ hangulWrong: 0, repeatWrong: 0, end: "finished" });
});
