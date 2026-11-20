import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { emptyWordbook, localDayOf, saveWordbook, withCardsSeen } from "../lib/wordbook";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import type { SettingsEvent } from "../screens/settings/settings.contract";

// `integration` 계층: 더보기(ADR-0169) — 바 넷째 ⋯ → 메뉴 카드(스크림 없음) → Letters · My words · Settings, 선택 C,
// 바깥 · 다시 누름으로 닫힘, 설정 길(설정 열람 이벤트 · 하위 화면 · 돌아옴), 단어장 기기 기록 · 이벤트. 경계 대역은 저장소뿐입니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const more = () => screen.getByTestId("ui-lynx-bottom-navigator-item-more");
const tapMore = () => fireEvent.tap(more(), {});
const row = (root: string) => screen.getByTestId(`more-menu-row-${root}`);

/** 실제 내장 카탈로그에서 단어 카드로 만나는 voca ref 둘 — 단어장 기록의 재료. */
function vocabRefs(): { readonly episodeId: string; readonly refs: readonly string[] } {
  const catalog = buildEpisodeCatalog({
    bundled: bundledCatalogInput,
    cache: { manifest: null, episodes: {} },
  });
  for (const entry of catalog) {
    if (entry.status !== "ready") continue;
    const refs = entry.episode.units
      .flatMap((unit) => unit.items)
      .filter((item) => item.type === "VOCAB_CARD" && (item.ref ?? "").indexOf("voca:") === 0)
      .map((item) => item.ref as string)
      .filter((ref) => entry.episode.words.some((word) => word.id === ref));
    if (refs.length >= 2) return { episodeId: entry.id, refs: refs.slice(0, 2) };
  }
  throw new Error("no vocab cards in bundled catalog");
}

async function boot(seedWords = false) {
  const store = new Map<string, string>();
  store.set(authSessionStorageKey, serializeAuthSession(signedInBootSession));
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  const storageModule = {
    get: (key: string) => store.get(key) ?? null,
    set: (key: string, value: string) => void store.set(key, value),
    remove: (key: string) => void store.delete(key),
  };
  if (seedWords) {
    vi.stubGlobal("NativeModules", { StorageModule: storageModule });
    const { episodeId, refs } = vocabRefs();
    // 부팅 토큰은 JWT가 아니라 계정 id가 없어 비회원 칸(guest)을 읽습니다.
    saveWordbook("guest", withCardsSeen(emptyWordbook, episodeId, refs, "2026-01-01"));
  }
  const events: EpisodeIntroEvent[] = [];
  const settings: SettingsEvent[] = [];
  await renderSignedInApp(
    <App
      progressSeed={legacyPassedSeed}
      episodeIntroEventSink={(event) => events.push(event)}
      settingsEventSink={(event) => settings.push(event)}
    />,
    { storageModule },
  );
  return { events, settings, store };
}

const named = (events: readonly EpisodeIntroEvent[], name: string) =>
  events.filter((event) => event.name === name);

test("MI1. 마지막(다섯째) 탭은 More, 누르면 스크림 없이 메뉴 카드 · ×(Close menu), 다시 누르면 닫힘", async () => {
  const { events } = await boot();
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(5);
  expect(more()).toHaveAttribute("accessibility-label", "More");
  tapMore();
  expect(screen.getByTestId("more-menu")).toBeInTheDocument();
  expect(screen.queryByTestId("ui-lynx-overlay")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(more()).toHaveAttribute("accessibility-label", "Close menu");
  expect(named(events, "more_menu_opened")).toHaveLength(1);
  tapMore();
  expect(screen.queryByTestId("more-menu")).not.toBeInTheDocument();
  expect(more()).toHaveAttribute("accessibility-label", "More");
});

test("MI2. 바깥을 누르면 닫힘", async () => {
  await boot();
  tapMore();
  fireEvent.tap(screen.getByTestId("more-menu-catch"), {});
  expect(screen.queryByTestId("more-menu")).not.toBeInTheDocument();
});

test("MI3. Letters 줄 → Letters 화면 · 바 그대로 · 선택 C(More, selected) · 이벤트 · 열어 본 기록", async () => {
  const { events, store } = await boot();
  tapMore();
  fireEvent.tap(row("letters"), {});
  expect(screen.queryByTestId("more-menu")).not.toBeInTheDocument();
  expect(screen.getByTestId("letters-screen")).toBeInTheDocument();
  expect(more()).toHaveAttribute("accessibility-label", "More, selected");
  expect(more()).toHaveAttribute("data-selected", "true");
  expect(named(events, "more_menu_item_clicked")).toMatchObject([{ item: "letters" }]);
  expect(JSON.parse(store.get("libitum.letters") ?? "{}")).toMatchObject({ lettersOpened: true });
  // 다른 탭으로 가면 평소 동그라미.
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(more()).toHaveAttribute("accessibility-label", "More");
});

test("MI4. Letters의 연습 단추 → 합치기 퀴즈(바 없음) · 나가면 Letters로", async () => {
  await boot();
  tapMore();
  fireEvent.tap(row("letters"), {});
  fireEvent.tap(within(screen.getByTestId("letters-practice")).getByTestId("ui-lynx-button"), {});
  expect(screen.getByTestId("letters-compose")).toBeInTheDocument();
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);
  fireEvent.tap(screen.getByTestId("learning-shell-exit"), {});
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-leave")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(screen.getByTestId("letters-screen")).toBeInTheDocument();
});

test("MI5. Settings 줄 → 기존 설정 화면 · settings_opened · 선택 C", async () => {
  const { settings } = await boot();
  tapMore();
  fireEvent.tap(row("settings"), {});
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expect(settings).toEqual([{ name: "settings_opened" }]);
  expect(more()).toHaveAttribute("accessibility-label", "More, selected");
});

test("MI6. My words — 메뉴 줄에 단어 수 · 복습 수, 목록 · 자세히 · 이벤트", async () => {
  const { events } = await boot(true);
  tapMore();
  expect(row("wordbook").textContent).toContain("2 words · 2 to review");
  fireEvent.tap(row("wordbook"), {});
  expect(screen.getByTestId("wordbook-screen")).toBeInTheDocument();
  expect(screen.queryAllByTestId(/^wordbook-row-\d+$/)).toHaveLength(2);
  expect(named(events, "wordbook_opened")).toMatchObject([{ words: "2", due: "2" }]);
  fireEvent.tap(screen.getByTestId("wordbook-row-0"), {});
  expect(screen.getByTestId("wordbook-word")).toBeInTheDocument();
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);
});

test("MI7. 오늘의 복습 — 맞히면 단어장 기록이 Got it으로(맞힘 +1) · 이벤트", async () => {
  const { events, store } = await boot(true);
  tapMore();
  fireEvent.tap(row("wordbook"), {});
  fireEvent.tap(screen.getByTestId("wordbook-review-cta"), {});
  expect(screen.getByTestId("wordbook-review")).toBeInTheDocument();
  const answer = screen.getByTestId("wordbook-review").getAttribute("data-answer") ?? "";
  const choice = screen
    .queryAllByTestId(/^wordbook-choice-\d$/)
    .find((element) => element.textContent?.includes(answer));
  fireEvent.tap(choice!, {});
  expect(named(events, "wordbook_review_answered")).toMatchObject([{ correct: true }]);
  const saved = JSON.parse(store.get("libitum.wordbook.guest") ?? "{}") as {
    words: Record<string, { correct: number; due: string }>;
  };
  const records = Object.values(saved.words);
  expect(records.filter((record) => record.correct === 1)).toHaveLength(1);
  expect((records.find((record) => record.correct === 1)?.due ?? "") > localDayOf(new Date())).toBe(
    true,
  );
});

// ---------------------------------------------------------------- 접근성 감사(ADR-0169 a11y)

test("MI8. 메뉴가 열린 동안 뒤 화면 · 머리는 낭독에서 빠지고(바는 남음) 열림을 한 번 낭독한다", async () => {
  await boot();
  const announced: string[] = [];
  const modules = (globalThis as { NativeModules?: Record<string, unknown> }).NativeModules ?? {};
  vi.stubGlobal("NativeModules", {
    ...modules,
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }) => void announced.push(args.content),
    },
  });
  tapMore();
  expect(screen.getByTestId("app-content")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
  expect(screen.getByTestId("app-navigator")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
  expect(announced).toEqual(["Menu, 3 items"]);
  tapMore();
  expect(screen.getByTestId("app-content")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});
