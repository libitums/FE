import { beforeEach, expect, test, vi } from "vitest";

// `unit` 계층 — 버그 재현: 받기 중 카탈로그를 다시 만들 때마다 이미 검증한 원격 본문 전부의 sha256 · 디코드를 다시
// 해 백그라운드 스레드(탭 처리와 같은 스레드)를 막았다. 같은 id · 같은 원문은 이전 검증 결과를 다시 써야 한다.
// 원문이 다르면(변조 · 새 판) 반드시 다시 검증한다.

const sha = vi.hoisted(() => ({ calls: 0 }));
vi.mock("./sha256", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sha256")>();
  return {
    ...actual,
    sha256Hex: (bytes: Uint8Array) => {
      sha.calls += 1;
      return actual.sha256Hex(bytes);
    },
  };
});

const { bundledCatalogInput } = await import("./episode-bundled");
const { buildEpisodeCatalog } = await import("./episode-catalog");
const { activeReadyIds } = await import("./episode-update-plan");
const { decodeManifest } = await import("./episode-manifest");
const { contentEpisodeKey } = await import("./episode-cache");
const { fakeStore, manifestText, remote } = await import("./episode-refresh.test-support");

const remotes = [remote("u31-a", 31), remote("u32-b", 32), remote("u33-c", 33)];
const source = () => ({
  manifest: manifestText(remotes),
  episodes: Object.fromEntries(remotes.map((r) => [r.entry.id as string, r.text])),
});
const build = (cache = source()) => buildEpisodeCatalog({ bundled: bundledCatalogInput, cache });
const readyEpisode = (entries: ReturnType<typeof build>, id: string) => {
  const found = entries.find((entry) => entry.id === id);
  return found?.status === "ready" ? found.episode : null;
};

beforeEach(() => {
  sha.calls = 0;
});

test("VC1. 같은 원문으로 카탈로그를 다시 만들면 sha256을 다시 계산하지 않고 디코드 결과도 같은 객체다", () => {
  const first = build();
  const afterFirst = sha.calls;
  expect(afterFirst).toBeGreaterThan(0);

  const second = build();

  expect(sha.calls).toBe(afterFirst);
  expect(readyEpisode(second, "u31-a")).toBe(readyEpisode(first, "u31-a"));
});

test("VC2. 한 편의 원문만 바뀌면 그 편만 다시 검증한다", () => {
  // 픽스처의 sha256 계산이 세기에 섞이지 않도록 먼저 만듭니다.
  const changed = remote(
    "u32-b",
    32,
    {},
    JSON.stringify({ ...JSON.parse(remotes[1]?.text ?? "{}"), day: 9 }),
  );
  build();
  const before = sha.calls;
  const cache = source();
  const next = buildEpisodeCatalog({
    bundled: bundledCatalogInput,
    cache: {
      manifest: manifestText([remotes[0] as typeof changed, changed, remotes[2] as typeof changed]),
      episodes: { ...cache.episodes, "u32-b": changed.text },
    },
  });

  expect(sha.calls - before).toBe(1);
  expect(next.find((entry) => entry.id === "u32-b")?.status).toBe("ready");
});

test("VC3. 같은 id · 같은 sha 항목이어도 저장된 원문이 다르면(변조) 무결성 실패로 잠근다", () => {
  build();
  const cache = source();
  const original = cache.episodes["u31-a"] ?? "";
  // 길이를 지키며 한 글자만 바꿉니다 — bytes 검사를 지나 sha256 검사가 잡아야 합니다.
  const tampered = original.replace('"day": 1', '"day": 2').replace('"day":1', '"day":2');
  expect(tampered).not.toBe(original);

  const next = build({ ...cache, episodes: { ...cache.episodes, "u31-a": tampered } });

  const entry = next.find((candidate) => candidate.id === "u31-a");
  // 내장본이 없는 id라 잠김이어야 합니다.
  expect(entry).toMatchObject({ status: "locked", reason: "integrity-mismatch" });
});

test("VC4. 받기 차례의 활성 본문 확인(activeReadyIds)도 같은 원문이면 sha256을 다시 계산하지 않는다", () => {
  const decoded = decodeManifest(JSON.parse(manifestText(remotes)));
  if (!decoded.ok) throw new Error("매니페스트 픽스처가 틀렸습니다");
  const { store } = fakeStore(
    Object.fromEntries(remotes.map((r) => [contentEpisodeKey(r.entry.id as string), r.text])),
  );
  const first = activeReadyIds(
    store,
    decoded.manifest,
    bundledCatalogInput.manifest,
    "not-required",
  );
  const afterFirst = sha.calls;

  const second = activeReadyIds(
    store,
    decoded.manifest,
    bundledCatalogInput.manifest,
    "not-required",
  );

  expect([...second]).toEqual([...first]);
  expect(sha.calls).toBe(afterFirst);
});

test("VC5. 호스트가 SHA-256을 계산할 수 있으면 JS 순수 구현을 부르지 않고, 결과는 같다", async () => {
  const actual = await vi.importActual<typeof import("./sha256")>("./sha256");
  vi.stubGlobal("NativeModules", {
    ContentFileModule: {
      download: () => {},
      fileUrl: () => "",
      remove: () => {},
      sha256: (text: string) => {
        const bytes = actual.utf8Bytes(text);
        return `${actual.sha256Hex(bytes)}:${String(bytes.length)}`;
      },
    },
  });
  const fresh = [remote("u41-n", 41), remote("u42-n", 42)];
  sha.calls = 0;

  const entries = buildEpisodeCatalog({
    bundled: bundledCatalogInput,
    cache: {
      manifest: manifestText(fresh),
      episodes: Object.fromEntries(fresh.map((r) => [r.entry.id as string, r.text])),
    },
  });

  expect(sha.calls).toBe(0);
  expect(
    entries.filter((entry) => entry.id.startsWith("u4") && entry.status === "ready"),
  ).toHaveLength(2);
  vi.unstubAllGlobals();
});
