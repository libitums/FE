import { expect, test, vi } from "vitest";

// `unit` 계층 — 기기 측정(ADR-0105): 카탈로그를 읽을 때마다 앱에 실은 내장 에피소드 11편을 처음부터 다시 디코드해
// `catalog.load`가 기기에서 수백 ms ~ 2초대였다. 내장본은 바뀌지 않으므로 편마다 한 번만 디코드한다.

const decodes = vi.hoisted(() => ({ count: 0 }));
vi.mock("./episode-content", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./episode-content")>();
  return {
    ...actual,
    decodeEpisode: (input: unknown) => {
      decodes.count += 1;
      return actual.decodeEpisode(input);
    },
  };
});

const { bundledCatalogInput } = await import("./episode-bundled");
const { buildEpisodeCatalog } = await import("./episode-catalog");

const build = () =>
  buildEpisodeCatalog({ bundled: bundledCatalogInput, cache: { manifest: null, episodes: {} } });

test("BC1. 같은 내장 입력으로 카탈로그를 다시 만들면 내장본을 다시 디코드하지 않고 같은 에피소드 객체다", () => {
  const first = build();
  const afterFirst = decodes.count;
  expect(afterFirst).toBe(bundledCatalogInput.manifest.episodes.length);

  const second = build();

  expect(decodes.count).toBe(afterFirst);
  const pick = (entries: ReturnType<typeof build>) =>
    entries.find((entry) => entry.status === "ready" && entry.source === "bundled");
  const a = pick(first);
  const b = pick(second);
  expect(a?.status === "ready" && b?.status === "ready" && a.episode === b.episode).toBe(true);
});
