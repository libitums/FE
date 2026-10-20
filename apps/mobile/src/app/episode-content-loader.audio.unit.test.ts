import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { manifestTextOf } from "../lib/audio-manifest.test-support";
import { CONTENT_AUDIO_MANIFEST_KEY } from "../lib/episode-cache";
import { noEpisodeContent } from "./episode-content";

// `unit` 계층: 로더가 저장된 음성 정보 파일 원문을 표로 닫아 audioTimingOf로 싣는지 봅니다.
// 호스트 저장소 경계(`NativeModules.StorageModule`)만 대역이고, 파서는 실물(호출 수만 셉니다).

const parseCalls = vi.hoisted(() => ({ count: 0 }));
vi.mock("../lib/audio-manifest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/audio-manifest")>();
  return {
    ...actual,
    parseAudioManifest: (text: string | null) => {
      parseCalls.count += 1;
      return actual.parseAudioManifest(text);
    },
  };
});

let store: Map<string, string>;

function installStorage(get?: (key: string) => string | null): void {
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: get ?? ((key: string) => store.get(key) ?? null),
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
}

async function freshLoader(): Promise<typeof import("./episode-content-loader")> {
  vi.resetModules();
  return import("./episode-content-loader");
}

beforeEach(() => {
  store = new Map();
  parseCalls.count = 0;
  installStorage();
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("loadEpisodeContent - audioTimingOf", () => {
  test("ECP1. 저장된 원문의 항목을 id로 조회하고 없는 id는 null이다", async () => {
    store.set(CONTENT_AUDIO_MANIFEST_KEY, manifestTextOf());
    const { loadEpisodeContent } = await freshLoader();
    const content = loadEpisodeContent();
    expect(content.audioTimingOf("u01-water/pre-3")).toEqual({
      durationMs: 2299,
      speechEndMs: 1763,
    });
    expect(content.audioTimingOf("u99-none/x")).toBeNull();
  });

  test.each([
    ["키 없음", undefined],
    ["깨진 원문", "{not json"],
    ["스키마가 다름", JSON.stringify({ schema: "audio-manifest-2", audio: {} })],
  ])("ECP1. 저장본이 %s이면 모든 id가 null이다", async (_name, text) => {
    if (text !== undefined) store.set(CONTENT_AUDIO_MANIFEST_KEY, text);
    const { loadEpisodeContent } = await freshLoader();
    expect(loadEpisodeContent().audioTimingOf("u01-water/pre-3")).toBeNull();
  });

  test("ECP1. 저장소 읽기가 던져도 던지지 않고 null이다", async () => {
    installStorage(() => {
      throw new Error("storage down");
    });
    const { loadEpisodeContent } = await freshLoader();
    expect(() => loadEpisodeContent()).not.toThrow();
    expect(loadEpisodeContent().audioTimingOf("u01-water/pre-3")).toBeNull();
  });

  test("ECP1. 원문이 같으면 다시 읽어도 파서를 다시 부르지 않고(메모) 바뀌면 새 표를 쓴다", async () => {
    store.set(CONTENT_AUDIO_MANIFEST_KEY, manifestTextOf());
    const { loadEpisodeContent } = await freshLoader();
    const first = loadEpisodeContent();
    const second = loadEpisodeContent();
    expect(parseCalls.count).toBe(1);
    expect(second.audioTimingOf("u01-water/pre-3")).toEqual(first.audioTimingOf("u01-water/pre-3"));

    store.set(
      CONTENT_AUDIO_MANIFEST_KEY,
      manifestTextOf({ "u01-water/pre-3": { duration_ms: 3000, speech_end_ms: 2500 } }),
    );
    expect(loadEpisodeContent().audioTimingOf("u01-water/pre-3")).toEqual({
      durationMs: 3000,
      speechEndMs: 2500,
    });
  });
});

describe("noEpisodeContent - audioTimingOf", () => {
  test("ECP2. 콘텐츠가 없을 때는 모든 id가 null이다", () => {
    expect(noEpisodeContent.audioTimingOf("u01-water/pre-3")).toBeNull();
  });
});
