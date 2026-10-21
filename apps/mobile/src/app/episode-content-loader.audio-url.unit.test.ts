import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { noEpisodeContent } from "./episode-content";

// `unit` 계층: 로더가 닫아 만드는 문항 음성 주소 포트 `audioUrlOf`가 재생 모듈 유무로 갈리는지 봅니다.
// 호스트 경계(`NativeModules`)만 대역입니다.

const PATH = "audio/u00-tutorial/d-04.m4a";

const storage = {
  get: () => null,
  set: () => {},
  remove: () => {},
};
const audioModule = { play: () => {}, stop: () => {}, pause: () => {}, resume: () => {} };

async function freshLoader(): Promise<typeof import("./episode-content-loader")> {
  vi.resetModules();
  return import("./episode-content-loader");
}

/** 포트에 `audioUrlOf`가 아직 없는 타입에서도 읽습니다. */
const audioUrlOfPort = (content: unknown): ((path: string) => string | null) =>
  (content as { audioUrlOf: (path: string) => string | null }).audioUrlOf;

beforeEach(() => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("loadEpisodeContent - audioUrlOf", () => {
  test("CL1. 재생 모듈이 없으면 모든 경로가 null이다", async () => {
    vi.stubGlobal("NativeModules", { StorageModule: storage });
    const { loadEpisodeContent } = await freshLoader();

    expect(audioUrlOfPort(loadEpisodeContent())(PATH)).toBeNull();
  });

  test("CL1. 재생 모듈이 있으면 imageUrlOf와 같은 값이다", async () => {
    vi.stubGlobal("NativeModules", { StorageModule: storage, AudioPlaybackModule: audioModule });
    const { loadEpisodeContent } = await freshLoader();
    const content = loadEpisodeContent();

    const url = audioUrlOfPort(content)(PATH);

    expect(url).not.toBeNull();
    expect(url).toBe(content.imageUrlOf(PATH));
  });

  test("CL1. 모듈 유무는 부를 때마다 판정한다 — 포트를 만든 뒤에 바뀌어도 따라간다", async () => {
    vi.stubGlobal("NativeModules", { StorageModule: storage });
    const { loadEpisodeContent } = await freshLoader();
    const audioUrlOf = audioUrlOfPort(loadEpisodeContent());
    expect(audioUrlOf(PATH)).toBeNull();

    vi.stubGlobal("NativeModules", { StorageModule: storage, AudioPlaybackModule: audioModule });

    expect(audioUrlOf(PATH)).not.toBeNull();
  });
});

describe("noEpisodeContent - audioUrlOf", () => {
  test("CL1. 콘텐츠가 없을 때는 모든 경로가 null이다", () => {
    expect(audioUrlOfPort(noEpisodeContent)(PATH)).toBeNull();
  });
});
