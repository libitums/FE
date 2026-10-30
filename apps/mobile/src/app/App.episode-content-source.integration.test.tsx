import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { contentPathOf } from "./test-helpers/content-requests";
import { signedInBootSession } from "./test-helpers/signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { bundledCatalogInput } from "../lib/episode-bundled";
import {
  CONTENT_MANIFEST_KEY,
  contentEpisodeKey,
  readCachedSource,
  type ContentStore,
} from "../lib/episode-cache";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { minimalRoleplayTurnWire } from "../lib/episode-content.test-support";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { sha256Hex, utf8Bytes } from "../lib/sha256";

// `integration` 계층: 앱 세션이 마운트된 뒤 에피소드 콘텐츠 갱신이 실제 전송 · 저장소 경계에
// 닿는지를 봅니다. 대역은 경계뿐입니다 — 가짜 전송(`fetch`) · `NativeModules.StorageModule` ·
// Supabase 설정(`vi.stubEnv`). 갱신 · 원격 · 캐시 모듈은 실물입니다.

const supabaseUrl = "https://test.supabase.co";

type ContentFetchMode = "serve" | "reject" | "status-zero";

type Booted = {
  readonly urls: string[];
  readonly inits: Map<string, unknown>;
  readonly store: Map<string, string>;
};

let unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => void unhandled.push(reason);

beforeEach(() => {
  unhandled = [];
  process.on("unhandledRejection", onUnhandled);
});

afterEach(() => {
  process.off("unhandledRejection", onUnhandled);
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const t3 = (ko: string) => ({ ko, roman: `r-${ko}`, en: `e-${ko}` });

// 디코드를 통과하는 최소 에피소드(와이어)입니다.
function minimalEpisodeText(unitId: string): string {
  const cut = (kind: string) => ({
    index: 1,
    kind,
    cut_kind: "narration",
    narration: t3("지문"),
    image_brief: "brief",
    image_url: "",
  });
  const line = (seq: number) => ({
    seq,
    role: seq % 2 === 1 ? "counterpart" : "player",
    text: t3(`대사${seq}`),
    audio_url: "",
  });
  const options = [1, 2, 3].map((n) => {
    const option = { id: `o${n}`, ko: `보기${n}`, roman: `bogi${n}`, correct: n === 1 };
    return n === 1 ? option : { ...option, why_wrong: "이 자리에 맞는 말이 아니다" };
  });
  const roleLine = {
    id: "S1-01",
    type: "ROLE_LINE",
    mode: "choice",
    event: "R",
    prompt: { ko: "질문", en: "question" },
    context: t3("상대 대사"),
    options,
    feedback: { correct: { ko: "맞아요" }, wrong_option: "o2" },
  };
  return JSON.stringify({
    schema: "delivery-2",
    unit_id: unitId,
    title: "최소 에피소드",
    day: 1,
    time_of_day: "낮",
    place: "최소 에피소드",
    counterpart: "미나",
    pre_cuts: [cut("pre")],
    dialogue: [line(1), line(2)],
    post_cuts: [cut("post")],
    steps: [
      { id: "S1", order: 1, items: [roleLine] },
      { id: "RP", order: 2, items: [minimalRoleplayTurnWire("RP-01")] },
    ],
    words: [{ id: "voca:1", ko: "물", roman: "mul", gloss_en: "water", role: "target" }],
    patterns: [{ id: "patt:1", ko: "{명사} 주세요", roman: "juseyo", gloss_en: "please give me" }],
  });
}

const episodeText = minimalEpisodeText("u04-x");
const remoteManifestText = JSON.stringify({
  schema: "manifest-1",
  generated_at: "2026-10-13T00:00:00Z",
  episodes: [
    {
      id: "u04-x",
      order: 4,
      title: "제목 u04-x",
      schema: "delivery-2",
      version: "2026-10-13.1",
      sha256: sha256Hex(utf8Bytes(episodeText)),
      bytes: utf8Bytes(episodeText).length,
      url: "episodes/u04-x.json",
    },
  ],
});

const refreshedSessionBody = JSON.stringify({
  access_token: "refreshed-access-token",
  refresh_token: "refreshed-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "boot-user" },
});

// 로그인된 설치로 부팅합니다(`renderSignedInApp`과 같은 순서). 그 헬퍼는 전송을 스스로 세워
// 콘텐츠 요청을 받을 수 없어, 같은 부팅을 이 파일의 전송 대역으로 다시 합니다.
async function bootApp(mode: ContentFetchMode): Promise<Booted> {
  const store = new Map<string, string>();
  store.set(authSessionStorageKey, serializeAuthSession(signedInBootSession));
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

  const urls: string[] = [];
  const inits = new Map<string, unknown>();
  vi.stubGlobal("fetch", (url: string, init?: unknown) => {
    urls.push(url);
    inits.set(url, init);
    if (url.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedSessionBody });
    }
    if (url.includes("/rest/v1/rpc/")) {
      return Promise.resolve({ status: 200, text: async () => "null" });
    }
    if (url.includes("/storage/v1/object/public/content/")) {
      if (mode === "reject") return Promise.reject(new Error("network down"));
      if (mode === "status-zero") return Promise.resolve({ status: 0, text: async () => "" });
      if (contentPathOf(url) === "manifest.json") {
        return Promise.resolve({ status: 200, text: async () => remoteManifestText });
      }
      if (contentPathOf(url) === "episodes/u04-x.json") {
        return Promise.resolve({ status: 200, text: async () => episodeText });
      }
      return Promise.resolve({ status: 404, text: async () => "" });
    }
    return Promise.reject(new Error(`예상 밖 요청 ${url}`));
  });

  vi.useFakeTimers();
  render(<App />);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  return { urls, inits, store };
}

const manifestRequests = (urls: readonly string[]): string[] =>
  urls.filter((url) => contentPathOf(url) === "manifest.json");
// 수준 2 앱은 `manifests/level-2.json`부터 묻습니다(ADR-0087) — 연결이 실패하면 거기서 멈춥니다.
const anyManifestRequests = (urls: readonly string[]): string[] =>
  urls.filter((url) =>
    /^(manifest\.json|manifests\/level-\d+\.json)$/.test(contentPathOf(url) ?? ""),
  );

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
  }
}

test("[I1] 앱 세션이 마운트되면 콘텐츠 매니페스트를 설정된 Supabase 주소로 정확히 한 번 요청한다", async () => {
  const { urls, inits } = await bootApp("serve");

  await vi.waitFor(() => expect(manifestRequests(urls)).toHaveLength(1));
  await settle();

  const requests = manifestRequests(urls);
  expect(requests).toHaveLength(1);
  expect(requests[0]?.startsWith(supabaseUrl)).toBe(true);
  // W-4: 공개 버킷 읽기는 GET이고 anon 키를 apikey 헤더로 보낸다(본문 없음).
  const init = inits.get(requests[0] as string) as
    | { method?: string; headers?: Record<string, string>; body?: unknown }
    | undefined;
  expect(init?.method).toBe("GET");
  expect(init?.headers?.["apikey"]).toBe("test-anon-key");
  expect(init?.body).toBeUndefined();
});

test("[I2] 원격 매니페스트의 새 에피소드를 받아 호스트 저장소에 매니페스트와 에피소드 원문을 쓴다", async () => {
  const { store } = await bootApp("serve");

  await vi.waitFor(() => {
    expect(store.get(CONTENT_MANIFEST_KEY)).toBe(remoteManifestText);
    expect(store.get(contentEpisodeKey("u04-x"))).toBe(episodeText);
  });
});

test.each<[string, ContentFetchMode]>([
  ["전송이 reject", "reject"],
  ["전송이 status 0", "status-zero"],
])("[I3] %s여도 첫 화면은 그대로 서고 예외도 저장도 없다", async (_name, mode) => {
  const { urls, store } = await bootApp(mode);

  await vi.waitFor(() => expect(anyManifestRequests(urls).length).toBeGreaterThanOrEqual(1));
  await settle();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect([...store.keys()].filter((key) => key.startsWith("libitum.content."))).toEqual([]);
  expect(unhandled).toEqual([]);
});

test("[I4] 내장 카탈로그와 저장소 가짜 기반 캐시 읽기를 합치면 실제 JSON 모듈로 u00 · u01 · u02 · u03이 ready다", () => {
  const data = new Map<string, string>();
  const store: ContentStore = {
    available: () => true,
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  };

  const catalog = buildEpisodeCatalog({
    bundled: bundledCatalogInput,
    cache: readCachedSource(store, ["u00-tutorial", "u01-water", "u02-checkin", "u03-mina"]),
  });

  expect(catalog.map((entry) => entry.id)).toEqual([
    "u00-tutorial",
    "u01-water",
    "u02-checkin",
    "u03-mina",
  ]);
  expect(catalog.map((entry) => entry.status)).toEqual(["ready", "ready", "ready", "ready"]);
});
