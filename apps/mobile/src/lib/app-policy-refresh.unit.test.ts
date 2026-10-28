import { describe, expect, test } from "vitest";

import { APP_POLICY_KEY, APP_POLICY_PATH } from "./app-policy";
import { refreshAppPolicy } from "./app-policy-refresh";
import type { FetchText } from "./episode-remote";
import { fakeFetch, fakeStore, ok } from "./episode-refresh.test-support";
import type { Reply } from "./episode-refresh.test-support";

// `unit` 계층: 가짜 전송 · 가짜 저장소로 한 차례의 결과와 저장소 변화를 봅니다(ADR-0086).

const TEXT = JSON.stringify({ schema: "app-policy-1", min_build: { android: 7 } });
const reply = (r: Reply) => fakeFetch({ [APP_POLICY_PATH]: r });
const status = (code: number, text = ""): Reply => ({ ok: true, status: code, text });

describe("refreshAppPolicy", () => {
  test("AR1. 유효한 파일을 fresh 키로 한 번 받아 원문 그대로 저장한다", async () => {
    const keys: unknown[] = [];
    const base = reply(ok(TEXT));
    const fetchText: FetchText = (relative, key) => {
      keys.push(key);
      return base.fetchText(relative, key);
    };
    const { store, data } = fakeStore();
    expect(await refreshAppPolicy({ fetchText, store })).toBe("updated");
    expect(base.calls).toEqual([APP_POLICY_PATH]);
    expect(keys).toEqual([{ kind: "fresh" }]);
    expect(data.get(APP_POLICY_KEY)).toBe(TEXT);
  });

  test("AR2. 같은 원문이면 unchanged로 쓰지 않는다", async () => {
    const { store, sets } = fakeStore({ [APP_POLICY_KEY]: TEXT });
    expect(await refreshAppPolicy({ fetchText: reply(ok(TEXT)).fetchText, store })).toBe(
      "unchanged",
    );
    expect(sets).toHaveLength(0);
  });

  test("AR3. 서버에 없으면(404) 저장본을 지우고(removed), 원래 없었으면 absent", async () => {
    const had = fakeStore({ [APP_POLICY_KEY]: TEXT });
    expect(
      await refreshAppPolicy({ fetchText: reply(status(404)).fetchText, store: had.store }),
    ).toBe("removed");
    expect(had.data.has(APP_POLICY_KEY)).toBe(false);
    expect(
      await refreshAppPolicy({ fetchText: reply(status(404)).fetchText, store: fakeStore().store }),
    ).toBe("absent");
  });

  test.each<[label: string, r: Reply]>([
    ["연결 실패", { ok: false, reason: "network" }],
    ["설정 없음", { ok: false, reason: "unconfigured" }],
    ["reject", "reject"],
    ["500", status(500)],
  ])("AR4. %s면 unavailable이고 저장본을 둔다", async (_label, r) => {
    const { store, data, removes } = fakeStore({ [APP_POLICY_KEY]: TEXT });
    expect(await refreshAppPolicy({ fetchText: reply(r).fetchText, store })).toBe("unavailable");
    expect(data.get(APP_POLICY_KEY)).toBe(TEXT);
    expect(removes).toHaveLength(0);
  });

  test("AR5. 200이어도 형식이 틀리면 invalid이고 저장본을 두며, 저장소가 없으면 unavailable", async () => {
    const { store, data } = fakeStore({ [APP_POLICY_KEY]: TEXT });
    expect(await refreshAppPolicy({ fetchText: reply(ok("{bad")).fetchText, store })).toBe(
      "invalid",
    );
    expect(data.get(APP_POLICY_KEY)).toBe(TEXT);
    const gone = fakeStore({}, { available: false });
    expect(
      await refreshAppPolicy({ fetchText: reply(ok(TEXT)).fetchText, store: gone.store }),
    ).toBe("unavailable");
  });
});
