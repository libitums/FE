import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";
import { openSettingsFromMore } from "./test-helpers/more-menu";
import { legacyPassedRecord, legacyPassedSeed } from "./test-helpers/progress-seed";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import type { SettingsEvent } from "../screens/settings/settings.contract";

// 내장 u01(고정본)의 S4 뒤에 컷 막간(INT)을 끼웁니다 — 대사 컷 둘 · 지문 컷 하나(모두 콘텐츠 로마자가 있음).
vi.mock("../lib/episode-bundled", async () => {
  const fixture = await import("../lib/episode-bundled.test-support");
  const t3 = (ko: string, roman: string, en: string) => ({ ko, roman, en });
  const u01 = structuredClone(fixture.bundledCatalogInput.episodes["u01-water"]) as {
    steps: { id: string; order: number }[];
    completion: { requires: string[] };
  };
  const at = u01.steps.findIndex((step) => step.id === "S4") + 1;
  for (const step of u01.steps.slice(at)) step.order += 1;
  u01.steps.splice(at, 0, {
    id: "INT",
    order: at + 1,
    kind: "interlude",
    items: [],
    interlude: {
      form: "cuts",
      caption: t3("그 시각, 게스트하우스", "geu sigak", "Meanwhile"),
      cuts: [
        {
          index: 1,
          cut_kind: "speech",
          speaker: "승무원",
          line: t3("한국은 처음이세요?", "hangugeun cheoeumiseyo?", "First time in Korea?"),
        },
        {
          index: 2,
          cut_kind: "narration",
          narration: t3("비행기가 내린다.", "bihaenggiga naerinda.", "The plane lands."),
        },
      ],
    },
  } as { id: string; order: number });
  u01.completion.requires.splice(u01.completion.requires.indexOf("S4") + 1, 0, "INT");
  return {
    bundledCatalogInput: {
      ...fixture.bundledCatalogInput,
      episodes: { ...fixture.bundledCatalogInput.episodes, "u01-water": u01 },
    },
  };
});

// `integration` 계층(ADR-0188 개정 D7): 실제 App에서 대사 상자 안 로마자 스위치 → 세션 옵션(상태 · 기기 저장) → 다음 컷 ·
// 설정 화면 셀 · 분석 이벤트(`session_option_changed`, `source: "dialog"`)까지 이어지는지 봅니다. 대역은 경계뿐입니다
// (`NativeModules` 저장소 · `fetch`).

const EP = "u01-water";
const storageKey = "libitum.session-option.show-choice-romanization";
const settingsItem = "ui-lynx-settings-group-item-show-choice-romanization";

async function boot(
  extra: Record<string, string> = {},
): Promise<{ store: Map<string, string>; settings: SettingsEvent[] }> {
  const store = new Map<string, string>(Object.entries(extra));
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
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  const snapshot = {
    version: 1,
    ...legacyPassedRecord,
    catalogProgress: {
      "u00-tutorial": ["intro", ...Array.from({ length: 13 }, (_, i) => `S${i + 1}`), "RP"],
      [EP]: ["intro", "S1", "S2", "S3", "S4"],
    },
  };
  vi.stubGlobal("fetch", (url: string) => {
    if (url.includes("grant_type=refresh_token")) {
      const token = `e30.${btoa(JSON.stringify({ sub: "u" })).replace(/=+$/, "")}.sig`;
      const body = JSON.stringify({ access_token: token, refresh_token: "r2", expires_in: 3600 });
      return Promise.resolve({ status: 200, text: async () => body });
    }
    if (isContentRequest(url)) return Promise.resolve(contentNotFoundResponse());
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    const reply =
      name === "load_learning_progress"
        ? { status: 200, body: JSON.stringify(snapshot) }
        : name === "learning_streak" || name === "record_learning_days"
          ? { status: 200, body: "1" }
          : { status: 204, body: "" };
    return Promise.resolve({ status: reply.status, text: async () => reply.body });
  });
  const settings: SettingsEvent[] = [];
  vi.useFakeTimers();
  render(
    <App progressSeed={legacyPassedSeed} settingsEventSink={(event) => settings.push(event)} />,
  );
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return { store, settings };
}

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const tapButtonIn = (id: string) =>
  fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});
const switchControl = () => screen.getByTestId("ui-lynx-visual-novel-dialog-switch");
const romanLine = () => screen.queryByTestId("ui-lynx-visual-novel-dialog-romanization");
const optionEvents = (events: readonly SettingsEvent[]) =>
  events.filter((event) => event.name === "session_option_changed");

/** 막간 이야기 첫 컷까지 — 시작 화면의 Start를 누르고 타자기를 끝까지 흘립니다. */
function openStoryCut(): void {
  fireEvent.tap(screen.getByTestId(`ui-lynx-special-unit-catalog-unit-${EP}-INT`), {});
  tapButtonIn("story-intro-start");
  settleTyping();
}
function settleTyping(): void {
  const dialog = screen.queryByTestId("ui-lynx-visual-novel-dialog");
  if (dialog?.getAttribute("data-status") === "revealing") tapButtonIn("catalog-cover-screen-next");
}

test("DS1. 기본(켬)에서 대사 상자 스위치를 끄면 로마자 줄이 빠지고, 이벤트(source dialog) 1건 · 기기 저장 off · 다음 컷도 끔이다", async () => {
  const { store, settings } = await boot();
  openStoryCut();

  expect(switchControl()).toHaveAttribute("data-checked", "true");
  expect(romanLine()?.textContent).toBe("hangugeun cheoeumiseyo?");

  fireEvent.tap(switchControl(), { eventType: "catchEvent" });

  expect(romanLine()).toBeNull();
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-translation").textContent).toBe(
    "First time in Korea?",
  );
  expect(switchControl()).toHaveAttribute("data-checked", "false");
  expect(optionEvents(settings)).toEqual([
    {
      name: "session_option_changed",
      option: "show-choice-romanization",
      value: false,
      source: "dialog",
    },
  ]);
  expect(store.get(storageKey)).toBe("off");

  // 다음 컷(지문 — 화자 없음)에도 끈 값이 그대로다.
  tapButtonIn("catalog-cover-screen-next");
  settleTyping();
  expect(screen.getByTestId("catalog-cover-screen")).toHaveAttribute("data-cut-index", "1");
  expect(switchControl()).toHaveAttribute("data-checked", "false");
  expect(romanLine()).toBeNull();
});

test("DS2. 대사 상자에서 끈 값은 설정 화면의 Romanization 셀에도 꺼짐으로 보이고, 다시 켜면 다음에 연 컷에 로마자가 돌아온다", async () => {
  const { store, settings } = await boot();
  openStoryCut();
  fireEvent.tap(switchControl(), { eventType: "catchEvent" });

  // 이야기를 나가 설정을 엽니다.
  fireEvent.tap(
    within(screen.getByTestId("catalog-cover-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  openSettingsFromMore();
  const cell = within(screen.getByTestId(settingsItem)).getByTestId("ui-lynx-settings-cell");
  expect(cell).toHaveAttribute("data-checked", "false");

  // 설정에서 다시 켜면 설정 이벤트는 source 없이 나갑니다.
  fireEvent.tap(cell, {});
  expect(optionEvents(settings).slice(-1)[0]).toEqual({
    name: "session_option_changed",
    option: "show-choice-romanization",
    value: true,
  });
  expect(store.get(storageKey)).toBe("on");
});

test("DS3. 설정에서 끈 값(off)이 저장돼 있으면 컷 스위치는 꺼짐으로 서고, 켜면 로마자 줄이 서며 저장 on이다", async () => {
  const { store, settings } = await boot({ [storageKey]: "off" });
  openStoryCut();

  expect(switchControl()).toHaveAttribute("data-checked", "false");
  expect(romanLine()).toBeNull();

  fireEvent.tap(switchControl(), { eventType: "catchEvent" });

  expect(switchControl()).toHaveAttribute("data-checked", "true");
  expect(romanLine()?.textContent).toBe("hangugeun cheoeumiseyo?");
  expect(optionEvents(settings)).toEqual([
    {
      name: "session_option_changed",
      option: "show-choice-romanization",
      value: true,
      source: "dialog",
    },
  ]);
  expect(store.get(storageKey)).toBe("on");
});
