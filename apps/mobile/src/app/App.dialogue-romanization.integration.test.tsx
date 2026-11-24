import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";
import { legacyPassedRecord, legacyPassedSeed } from "./test-helpers/progress-seed";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";

// 내장 u01(고정본)의 S4 뒤에 문자 막간(INT)을 끼웁니다 — 첫 줄은 콘텐츠 로마자가 있고, 둘째 줄(내 말)은 비어 있습니다.
vi.mock("../lib/episode-bundled", async () => {
  const fixture = await import("../lib/episode-bundled.test-support");
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
      form: "message",
      cuts: [
        {
          index: 1,
          cut_kind: "message",
          speaker: "미나",
          line: { ko: "식당 찾았어요?", roman: "sikdang chajasseoyo?", en: "Found it?" },
        },
        {
          index: 2,
          cut_kind: "message",
          speaker: "플레이어",
          line: { ko: "같이 가요", roman: "", en: "Let's go together" },
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

// `integration` 계층(ADR-0188): 실제 App에서 세션 옵션(기기 저장값) → 막간 메신저 말풍선의 로마자 줄까지 이어지는지 봅니다 —
// 기본(저장값 없음)은 켬, 저장값 「off」는 끔. 대역은 경계뿐입니다(`NativeModules` 저장소 · `fetch`).

const EP = "u01-water";
const storageKey = "libitum.session-option.show-choice-romanization";

async function boot(extra: Record<string, string> = {}): Promise<void> {
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
  vi.useFakeTimers();
  render(<App progressSeed={legacyPassedSeed} />);
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
}

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function openStory(): void {
  vi.useFakeTimers();
  fireEvent.tap(screen.getByTestId(`ui-lynx-special-unit-catalog-unit-${EP}-INT`), {});
  for (let i = 0; i < 8; i += 1) {
    act(() => {
      vi.advanceTimersByTime(5000);
    });
  }
}
const bubble = (testId: string) => within(screen.getAllByTestId(testId)[0] as HTMLElement);

test("DRI1. 저장값이 없으면(기본 켬) 막간 메신저 말풍선에 로마자 · 뜻이 서고, 비어 있는 콘텐츠 로마자는 변환한다", async () => {
  await boot();
  openStory();
  const incoming = bubble("story-messenger-incoming");
  expect(incoming.getByTestId("ui-lynx-chat-bubble-annotation-romanization").textContent).toBe(
    "sikdang chajasseoyo?",
  );
  expect(incoming.getByTestId("ui-lynx-chat-bubble-annotation-meaning").textContent).toBe(
    "Found it?",
  );
  const outgoing = bubble("story-messenger-outgoing");
  expect(outgoing.getByTestId("ui-lynx-chat-bubble-annotation-romanization").textContent).toBe(
    "gachi gayo",
  );
});

test("DRI2. 설정에서 끈 값(off)이 저장돼 있으면 말풍선은 뜻 한 줄뿐이다", async () => {
  await boot({ [storageKey]: "off" });
  openStory();
  const incoming = bubble("story-messenger-incoming");
  expect(incoming.queryByTestId("ui-lynx-chat-bubble-annotation-romanization")).toBeNull();
  expect(incoming.getByTestId("ui-lynx-chat-bubble-translation").textContent).toBe("Found it?");
});
