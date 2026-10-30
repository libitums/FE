import { expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import { CONTENT_MANIFEST_KEY } from "./episode-cache";
import { refreshEpisodeCatalog } from "./episode-refresh";
import {
  fakeFetch,
  fakeStore,
  manifestText,
  ok,
  remote,
  type Reply,
} from "./episode-refresh.test-support";

// `unit` 계층: 수준별 매니페스트를 차례로 시도합니다(ADR-0087). 서버에 없는 경로만 다음으로 넘어갑니다.

const LEVEL_2 = ["manifests/level-2.json", "manifest.json"];
const X = remote("u04-x", 4);
const Y = remote("u05-y", 5, { url: "episodes/level-2/u05-y.json" });

const run = (replies: Record<string, Reply>, manifestPaths?: readonly string[]) => {
  const { fetchText, calls } = fakeFetch(replies);
  const { store, data } = fakeStore();
  return refreshEpisodeCatalog({
    fetchText,
    store,
    bundled: bundledCatalogInput,
    ...(manifestPaths === undefined ? {} : { manifestPaths }),
  }).then((summary) => ({ summary, calls, data }));
};

test("RL1. 경로를 주지 않으면 지금 앱 수준(2)이라 level-2를 먼저, 없으면 manifest.json을 받는다", async () => {
  const { calls, summary } = await run({
    "manifest.json": ok(manifestText([X])),
    [X.entry.url as string]: ok(X.text),
  });
  expect(calls.slice(0, 2)).toEqual(["manifests/level-2.json", "manifest.json"]);
  expect(summary.fetched).toEqual(["u04-x"]);
});

test("RL2. 수준 2 매니페스트가 있으면 그것만 받고 그 항목의 url을 따른다", async () => {
  const { calls, summary, data } = await run(
    {
      "manifests/level-2.json": ok(manifestText([Y])),
      "manifest.json": ok(manifestText([X])),
      [Y.entry.url as string]: ok(Y.text),
    },
    LEVEL_2,
  );
  expect(calls).toEqual(["manifests/level-2.json", "episodes/level-2/u05-y.json"]);
  expect(summary.fetched).toEqual(["u05-y"]);
  expect(data.get(CONTENT_MANIFEST_KEY)).toBe(manifestText([Y]));
});

test.each([400, 403, 404, 410])(
  "RL3. 수준 2 매니페스트가 %i(서버에 없음)이면 manifest.json으로 내려간다",
  async (status) => {
    const { calls, summary } = await run(
      {
        "manifests/level-2.json": { ok: true, status, text: "" },
        "manifest.json": ok(manifestText([X])),
        [X.entry.url as string]: ok(X.text),
      },
      LEVEL_2,
    );
    expect(calls.slice(0, 2)).toEqual(["manifests/level-2.json", "manifest.json"]);
    expect(summary.manifest).toBe("updated");
    expect(summary.fetched).toEqual(["u04-x"]);
  },
);

test.each<[string, Reply]>([
  ["연결 실패", { ok: false, reason: "network" }],
  ["전송 reject", "reject"],
  ["500", { ok: true, status: 500, text: "" }],
])("RL4. 수준 2 매니페스트가 %s이면 내려가지 않고 unavailable이다", async (_label, reply) => {
  const { calls, summary } = await run(
    { "manifests/level-2.json": reply, "manifest.json": ok(manifestText([X])) },
    LEVEL_2,
  );
  expect(calls).toEqual(["manifests/level-2.json"]);
  expect(summary.manifest).toBe("unavailable");
});
