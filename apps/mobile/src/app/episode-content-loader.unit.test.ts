import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CONTENT_MANIFEST_KEY, contentEpisodeKey } from "../lib/episode-cache";
import { minimalRoleplayTurnWire } from "../lib/episode-content.test-support";
import { sha256Hex, utf8Bytes } from "../lib/sha256";

// `unit` 계층: 로더는 호스트 저장소 경계(`NativeModules.StorageModule`)와 Supabase 설정만 대역으로 두고
// 나머지는 실물로 부릅니다. 로더가 모듈 수준 캐시를 가지므로 케이스마다 모듈을 새로 불러옵니다.

const supabaseUrl = "https://test.supabase.co";

type Loader = typeof import("./episode-content-loader");

let store: Map<string, string>;

function installStorage(overrides: { get?: (key: string) => string | null } = {}): void {
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: overrides.get ?? ((key: string) => store.get(key) ?? null),
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
}

async function freshLoader(): Promise<Loader> {
  vi.resetModules();
  return import("./episode-content-loader");
}

beforeEach(() => {
  store = new Map();
  installStorage();
  vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

afterEach(() => {
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

describe("loadEpisodeContent", () => {
  test("EL1. 빈 저장소에서는 내장 넷이 모두 ready이고 이미지 경로가 공개 URL로 풀린다", async () => {
    const { loadEpisodeContent } = await freshLoader();

    const content = loadEpisodeContent();

    expect(content.catalog).toHaveLength(4);
    expect(content.catalog.every((entry) => entry.status === "ready")).toBe(true);
    expect(content.catalog.map((entry) => entry.id).join(",")).toBe(
      "u00-tutorial,u01-water,u02-checkin,u03-mina",
    );
    expect(content.imageUrlOf("images/u01-water/pre-1.jpg")).toBe(
      "https://test.supabase.co/storage/v1/object/public/content/images/u01-water/pre-1.jpg",
    );
  });

  test("EL2. 거부 경로와 설정 없음은 null이다", async () => {
    const { loadEpisodeContent } = await freshLoader();
    const content = loadEpisodeContent();

    expect(content.imageUrlOf("../x")).toBeNull();
    expect(content.imageUrlOf("https://evil/x")).toBeNull();

    vi.stubEnv("PUBLIC_SUPABASE_URL", "");
    expect(content.imageUrlOf("images/u01-water/pre-1.jpg")).toBeNull();
  });

  test("EL3. 같은 저장소 상태로 두 번 부르면 catalog가 같은 참조다", async () => {
    const { loadEpisodeContent } = await freshLoader();

    const first = loadEpisodeContent();
    const second = loadEpisodeContent();

    expect(first.catalog).toHaveLength(4);
    expect(second.catalog).toBe(first.catalog);
  });

  test("EL4. 원격 매니페스트만 있으면 pending, 본문이 들어오면 ready이고 다른 참조가 된다", async () => {
    const { loadEpisodeContent } = await freshLoader();
    store.set(CONTENT_MANIFEST_KEY, remoteManifestText);

    const before = loadEpisodeContent();
    const pendingEntry = before.catalog[4];

    expect(before.catalog).toHaveLength(5);
    expect(pendingEntry?.id).toBe("u04-x");
    expect(pendingEntry?.status).toBe("pending");

    store.set(contentEpisodeKey("u04-x"), episodeText);
    const after = loadEpisodeContent();

    expect(after.catalog[4]?.status).toBe("ready");
    expect(after.catalog).not.toBe(before.catalog);
  });

  test("EL5. 저장소 읽기가 던져도 던지지 않고 내장 넷을 낸다", async () => {
    installStorage({
      get: () => {
        throw new Error("storage down");
      },
    });
    const { loadEpisodeContent } = await freshLoader();

    const content = loadEpisodeContent();

    expect(content.catalog.map((entry) => entry.id)).toEqual([
      "u00-tutorial",
      "u01-water",
      "u02-checkin",
      "u03-mina",
    ]);
  });

  test("EL6. fillText는 실제 치환기다", async () => {
    const { loadEpisodeContent } = await freshLoader();

    expect(loadEpisodeContent().fillText("저는 {이름}이에요.", { name: "민지" }, "ko")).toBe(
      "저는 민지예요.",
    );
  });

  test("EL7. 첫 줄이 background-only import다", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/episode-content-loader.ts"),
      "utf8",
    );

    expect(source.split("\n")[0]).toBe('import "background-only";');
  });
  test("EL8. 파일 모듈이 있으면 받아 둔 그림 · 음성은 file 주소, 없는 것은 공개 URL이다", async () => {
    installStorage();
    const native = NativeModules as Record<string, unknown>;
    vi.stubGlobal("NativeModules", {
      ...native,
      ContentFileModule: {
        download: vi.fn(),
        fileUrl: (path: string) =>
          path === "images/u01-water/pre-1.jpg" ? "file:///f/pre-1.jpg" : "",
      },
    });
    const { loadEpisodeContent } = await freshLoader();
    const content = loadEpisodeContent();

    expect(content.imageUrlOf("content/images/u01-water/pre-1.jpg")).toBe("file:///f/pre-1.jpg");
    expect(content.imageUrlOf("audio/u01-water/pre-3.m4a")).toBe(
      `${supabaseUrl}/storage/v1/object/public/content/audio/u01-water/pre-3.m4a`,
    );
  });

  test("EL9. 파일 모듈이 있으면 원격 에피소드는 자산 완료 표시가 그 본문 sha와 맞을 때만 ready다", async () => {
    vi.stubGlobal("NativeModules", {
      ...(NativeModules as Record<string, unknown>),
      ContentFileModule: { download: vi.fn(), fileUrl: () => "" },
    });
    const { loadEpisodeContent } = await freshLoader();
    store.set(CONTENT_MANIFEST_KEY, remoteManifestText);
    store.set(contentEpisodeKey("u04-x"), episodeText);

    expect(loadEpisodeContent().catalog[4]?.status).toBe("pending");
    store.set(
      "libitum.content.assets.u04-x",
      JSON.stringify({ sha256: sha256Hex(utf8Bytes(episodeText)), missing: [] }),
    );
    expect(loadEpisodeContent().catalog[4]?.status).toBe("ready");
  });

  test("BI4. 파일 모듈이 없어도 내장 그림 주소가 서고, 받기 포트는 내장 그림을 이미 가진 것으로 답한다", async () => {
    const { loadEpisodeContent, hostAssetDeps } = await freshLoader();
    const { bundledContentImageUrl } = await import("../lib/bundled-content-images");
    const bundledPath = "images/u00-tutorial/pre-1.webp";
    const bundledUrl = bundledContentImageUrl(bundledPath);

    expect(bundledUrl).not.toBeNull();
    expect(loadEpisodeContent().imageUrlOf(`content/${bundledPath}`)).toBe(bundledUrl);
    expect(hostAssetDeps()).toBeUndefined();

    const fileUrl = vi.fn((path: string) =>
      path === "images/items/other.webp" ? "file:///f/other.webp" : "",
    );
    vi.stubGlobal("NativeModules", {
      ...(NativeModules as Record<string, unknown>),
      ContentFileModule: { download: vi.fn(), fileUrl },
    });
    const deps = (await freshLoader()).hostAssetDeps();

    expect(deps?.has("images/items/hello.webp")).toBe(true);
    expect(deps?.has(bundledPath)).toBe(true);
    expect(deps?.has("images/items/other.webp")).toBe(true);
    expect(deps?.has("images/items/missing.webp")).toBe(false);
  });
});
