import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { legacyPassedRecord } from "./test-helpers/progress-seed";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { emptyWordbook, saveWordbook, withCardsSeen, withStarred } from "../lib/wordbook";

// `integration` 계층: 끝낸 레슨의 단어 채움(ADR-0169 개정 2026-11-25) — 진행에 끝낸 레슨이 있는데 기기 단어장이 빈 설치(단어장 이전에
// 끝냄 · 재설치)에서 세션이 진행을 받으면 그 레슨의 단어 카드 단어가 단어장 칸에 채워지고 My words에 보입니다. 경계 대역은 저장소뿐.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** 실제 내장 카탈로그에서 단어 카드(카탈로그에 단어가 있는 voca ref)가 둘 이상인 첫 유닛. */
function lessonWithCards(): {
  readonly episodeId: string;
  readonly unitKey: string;
  readonly refs: readonly string[];
} {
  const catalog = buildEpisodeCatalog({
    bundled: bundledCatalogInput,
    cache: { manifest: null, episodes: {} },
  });
  for (const entry of catalog) {
    if (entry.status !== "ready") continue;
    for (const unit of entry.episode.units) {
      const refs: string[] = [];
      for (const item of unit.items) {
        const ref = item.ref ?? "";
        if (item.type !== "VOCAB_CARD" || ref.indexOf("voca:") !== 0 || refs.indexOf(ref) >= 0)
          continue;
        if (entry.episode.words.some((word) => word.id === ref)) refs.push(ref);
      }
      if (refs.length >= 2) return { episodeId: entry.id, unitKey: unit.id, refs };
    }
  }
  throw new Error("no lesson with vocab cards in bundled catalog");
}

async function boot(seed: (lesson: ReturnType<typeof lessonWithCards>) => void = () => {}) {
  const lesson = lessonWithCards();
  const store = new Map<string, string>();
  store.set(authSessionStorageKey, serializeAuthSession(signedInBootSession));
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  const storageModule = {
    get: (key: string) => store.get(key) ?? null,
    set: (key: string, value: string) => void store.set(key, value),
    remove: (key: string) => void store.delete(key),
  };
  vi.stubGlobal("NativeModules", { StorageModule: storageModule });
  seed(lesson);
  await renderSignedInApp(
    <App
      progressSeed={{
        legacyTutorial: legacyPassedRecord,
        catalogProgress: { [lesson.episodeId]: [lesson.unitKey] },
      }}
    />,
    { storageModule },
  );
  return { lesson, store };
}

// 부팅 토큰은 JWT가 아니라 계정 id가 없어 비회원 칸(guest)을 읽고 씁니다.
const savedWords = (store: Map<string, string>) =>
  (
    JSON.parse(store.get("libitum.wordbook.guest") ?? '{"words":{}}') as {
      words: Record<string, { starred?: boolean; correct: number }>;
    }
  ).words;

test("WBI1. 끝낸 레슨이 있는데 단어장이 비면 — 그 레슨의 단어 카드 단어가 채워지고 My words에 그 수만큼 줄", async () => {
  const { lesson, store } = await boot();
  const words = savedWords(store);
  for (const ref of lesson.refs) expect(words[`${lesson.episodeId}|${ref}`]).toBeDefined();
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-more"), {});
  expect(screen.getByTestId("more-menu-row-wordbook").textContent).toContain(
    `${lesson.refs.length} words`,
  );
  fireEvent.tap(screen.getByTestId("more-menu-row-wordbook"), { eventType: "catchEvent" });
  expect(screen.queryAllByTestId(/^wordbook-row-\d+$/)).toHaveLength(lesson.refs.length);
});

test("WBI2. 이미 있는 단어의 별 · 맞힘은 그대로 두고 없는 단어만 더한다", async () => {
  const { lesson, store } = await boot((seeded) => {
    const first = seeded.refs[0] as string;
    let book = withCardsSeen(emptyWordbook, seeded.episodeId, [first], "2026-01-01");
    book = withStarred(book, seeded.episodeId, first, true, "2026-01-01");
    saveWordbook("guest", { words: { ...book.words } });
  });
  const words = savedWords(store);
  expect(words[`${lesson.episodeId}|${lesson.refs[0] as string}`]?.starred).toBe(true);
  expect(Object.keys(words)).toHaveLength(lesson.refs.length);
});
