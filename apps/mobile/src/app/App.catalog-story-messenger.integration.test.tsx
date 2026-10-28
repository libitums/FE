import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";
import { catalogNodeTestId } from "./test-helpers/map-unit-testid";
import { legacyPassedRecord, legacyPassedSeed } from "./test-helpers/progress-seed";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";

// 내장 u01(고정본)의 S4 뒤에 문자 막간(INT)을 끼우고 완료 키에도 넣습니다(ADR-0088 보충).
vi.mock("../lib/episode-bundled", async () => {
  const fixture = await import("../lib/episode-bundled.test-support");
  const t3 = (ko: string) => ({ ko, roman: `r-${ko}`, en: `e-${ko}` });
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
      caption: t3("조금 전"),
      cuts: [
        { index: 1, cut_kind: "message", speaker: "미나", line: t3("식당 찾았어요?") },
        {
          index: 2,
          cut_kind: "message_reply",
          speaker: "플레이어",
          options: [t3("아니요"), t3("어디예요?")],
        },
        { index: 3, cut_kind: "message", speaker: "미나", line: t3("괜찮아요"), after_option: 1 },
        { index: 3, cut_kind: "message", speaker: "미나", line: t3("맛있어요"), after_option: 2 },
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

// `integration` 계층: 맵 Story 노드(문자) → 시간 표시 화면 → 메신저(상대 이름) → 답장 고르기 → 분기 줄 → Finish story →
// 진행에 INT 기록 → 맵으로 돌아와 S5가 열림. 대역은 경계뿐입니다(`NativeModules` 저장소 · `fetch`).

type Rpc = { readonly name: string; readonly body: Record<string, unknown> };
const EP = "u01-water";
const throughS4 = { [EP]: ["intro", "S1", "S2", "S3", "S4"] };

async function boot(): Promise<Rpc[]> {
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
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  const snapshot = {
    version: 1,
    ...legacyPassedRecord,
    catalogProgress: {
      "u00-tutorial": ["intro", ...Array.from({ length: 13 }, (_, i) => `S${i + 1}`), "RP"],
      ...throughS4,
    },
  };
  const rpcs: Rpc[] = [];
  vi.stubGlobal("fetch", (url: string, init?: { body?: string }) => {
    if (url.includes("grant_type=refresh_token")) {
      const token = `e30.${btoa(JSON.stringify({ sub: "u" })).replace(/=+$/, "")}.sig`;
      const body = JSON.stringify({ access_token: token, refresh_token: "r2", expires_in: 3600 });
      return Promise.resolve({ status: 200, text: async () => body });
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
  return rpcs;
}

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const storyNode = () => screen.getByTestId(`ui-lynx-special-unit-catalog-unit-${EP}-INT`);
const saved = (rpcs: readonly Rpc[]) =>
  rpcs
    .filter((rpc) => rpc.name === "save_learning_progress")
    .map((rpc) => rpc.body["p_progress"] as Record<string, Record<string, string[]> | undefined>);

// 메신저 타이머는 하나가 끝나야 다음이 걸리므로 나눠 흘립니다.
const drain = () => {
  for (let i = 0; i < 8; i += 1) {
    act(() => {
      vi.advanceTimersByTime(5000);
    });
  }
};

test("[SMI1] 문자 Story → 시간 표시 → 메신저 → 답장 2 → 분기 줄 → Finish story → 배너 → INT 기록 · S5 열림", async () => {
  const rpcs = await boot();

  fireEvent.tap(storyNode(), {});
  vi.useFakeTimers();
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(screen.getByTestId("story-messenger-intro").textContent).toContain("조금 전");
  fireEvent.tap(screen.getByTestId("story-messenger-intro"), {});
  expect(screen.getByTestId("story-messenger-title").textContent).toBe("미나");

  drain();
  fireEvent.tap(screen.getByTestId("story-messenger-option-1"), {});
  drain();
  const incoming = screen.getAllByTestId("story-messenger-incoming").map((el) => el.textContent);
  expect(incoming.join("|")).toContain("맛있어요");
  expect(incoming.join("|")).not.toContain("괜찮아요");

  fireEvent.tap(
    within(screen.getByTestId("story-messenger-finish")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(screen.getByTestId("episode-banner-screen").textContent).toContain("To be continued");
  fireEvent.tap(screen.getByTestId("episode-banner-screen"), {});
  vi.useRealTimers();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(screen.queryByTestId("story-messenger-screen")).toBeNull();
  expect(screen.getByTestId(catalogNodeTestId(EP, "S5")).getAttribute("data-status")).toBe(
    "available",
  );
  await vi.waitFor(() =>
    expect(saved(rpcs).some((p) => p["catalogProgress"]?.[EP]?.includes("INT"))).toBe(true),
  );
});
