import { afterEach, describe, expect, test } from "vitest";

import {
  countryNamesKey,
  countryNamesPath,
  forgetCountryNames,
  storedCountryNames,
} from "./country-names";
import { refreshCountryNames } from "./country-names-refresh";
import { fakeFetch, fakeStore, ok } from "./episode-refresh.test-support";
import type { Reply } from "./episode-refresh.test-support";

// `unit` 계층(CN1 ~ CN5): 가짜 전송 · 가짜 저장소로 나라 이름 표 받기 한 차례의 결과와 저장소 · 기억 변화를 봅니다(ADR-0059 개정
// 2026-11-19 — `app-policy-refresh`와 같은 규칙).

const TEXT = JSON.stringify({
  schema: "country-names-1",
  language: "vi",
  names: { VN: "Việt Nam" },
});
const KEY = countryNamesKey("vi");
const reply = (r: Reply) => fakeFetch({ [countryNamesPath("vi")]: r });
const status = (code: number, text = ""): Reply => ({ ok: true, status: code, text });

afterEach(forgetCountryNames);

describe("refreshCountryNames", () => {
  test("CN1. 유효한 파일을 받아 원문 그대로 저장하고 바로 기억한다", async () => {
    const base = reply(ok(TEXT));
    const { store, data } = fakeStore();
    expect(await refreshCountryNames({ fetchText: base.fetchText, store, language: "vi" })).toBe(
      "updated",
    );
    expect(base.calls).toEqual(["country-names/vi.json"]);
    expect(data.get(KEY)).toBe(TEXT);
    expect(storedCountryNames("vi")).toEqual({ VN: "Việt Nam" });
  });

  test("CN2. 같은 원문이면 unchanged로 쓰지 않는다", async () => {
    const { store, sets } = fakeStore({ [KEY]: TEXT });
    const result = await refreshCountryNames({
      fetchText: reply(ok(TEXT)).fetchText,
      store,
      language: "vi",
    });
    expect(result).toBe("unchanged");
    expect(sets).toHaveLength(0);
  });

  test("CN3. 서버에 없으면(400) 저장본을 지우고(removed) 기억도 비우며, 원래 없었으면 absent", async () => {
    const had = fakeStore({ [KEY]: TEXT });
    expect(
      await refreshCountryNames({
        fetchText: reply(status(400)).fetchText,
        store: had.store,
        language: "vi",
      }),
    ).toBe("removed");
    expect(had.data.has(KEY)).toBe(false);
    expect(storedCountryNames("vi")).toBeNull();
    const none = fakeStore();
    expect(
      await refreshCountryNames({
        fetchText: reply(status(404)).fetchText,
        store: none.store,
        language: "vi",
      }),
    ).toBe("absent");
  });

  test("CN4. 형식이 틀리거나(invalid) 연결이 안 되면(unavailable) 저장본을 둔다", async () => {
    const bad = fakeStore({ [KEY]: TEXT });
    expect(
      await refreshCountryNames({
        fetchText: reply(ok("{}")).fetchText,
        store: bad.store,
        language: "vi",
      }),
    ).toBe("invalid");
    expect(bad.data.get(KEY)).toBe(TEXT);
    const offline = fakeStore({ [KEY]: TEXT });
    const network: Reply = { ok: false, reason: "network" };
    expect(
      await refreshCountryNames({
        fetchText: reply(network).fetchText,
        store: offline.store,
        language: "vi",
      }),
    ).toBe("unavailable");
    expect(offline.data.get(KEY)).toBe(TEXT);
  });

  test("CN5. 표가 따로 없는 언어(en · th · my)는 받지 않는다", async () => {
    for (const language of ["en", "th", "my"]) {
      const base = reply(ok(TEXT));
      const { store } = fakeStore();
      expect(await refreshCountryNames({ fetchText: base.fetchText, store, language })).toBe(
        "skipped",
      );
      expect(base.calls).toEqual([]);
    }
  });
});
