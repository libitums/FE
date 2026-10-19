import { describe, expect, test, vi } from "vitest";

import { AUDIO_MANIFEST_PATH } from "./audio-manifest";
import { changesAudioTiming, refreshAudioManifest } from "./audio-manifest-refresh";
import type { AudioManifestRefresh } from "./audio-manifest-refresh";
import { ABSENT_BODY, manifestTextOf } from "./audio-manifest.test-support";
import { ABSENT_HTTP_CODES } from "./episode-asset-sync";
import { CONTENT_AUDIO_MANIFEST_KEY } from "./episode-cache";
import type { ContentStore } from "./episode-cache";
import { fakeFetch, fakeStore, ok } from "./episode-refresh.test-support";
import type { Reply } from "./episode-refresh.test-support";

// `unit` 계층: 가짜 전송 · 가짜 저장소로 한 차례의 결과와 저장소 변화를 봅니다.

const TEXT = manifestTextOf();
const reply = (r: Reply) => fakeFetch({ [AUDIO_MANIFEST_PATH]: r });
const run = (fetchText: ReturnType<typeof fakeFetch>["fetchText"], store: ContentStore) =>
  refreshAudioManifest({ fetchText, store });
const status = (code: number, text = ""): Reply => ({ ok: true, status: code, text });

describe("refreshAudioManifest", () => {
  test("AMR1. 유효한 파일을 한 번 받아 원문 그대로 저장한다", async () => {
    const { fetchText, calls } = reply(ok(TEXT));
    const { store, data } = fakeStore();
    expect(await run(fetchText, store)).toBe("updated");
    expect(calls).toEqual([AUDIO_MANIFEST_PATH]);
    expect(data.get(CONTENT_AUDIO_MANIFEST_KEY)).toBe(TEXT);
  });

  test("AMR2. 같은 원문이면 unchanged로 쓰지 않고, 원문이 다르면(generated_at만 달라도) updated", async () => {
    const same = fakeStore({ [CONTENT_AUDIO_MANIFEST_KEY]: TEXT });
    expect(await run(reply(ok(TEXT)).fetchText, same.store)).toBe("unchanged");
    expect(same.sets).toHaveLength(0);
    const newer = manifestTextOf(undefined, "2026-10-20T00:00:00Z");
    const other = fakeStore({ [CONTENT_AUDIO_MANIFEST_KEY]: TEXT });
    expect(await run(reply(ok(newer)).fetchText, other.store)).toBe("updated");
    expect(other.data.get(CONTENT_AUDIO_MANIFEST_KEY)).toBe(newer);
  });

  test.each([
    ["JSON이 아님", "{not json"],
    ["스키마가 다름", JSON.stringify({ schema: "audio-manifest-2", audio: {} })],
    ["audio가 배열", JSON.stringify({ schema: "audio-manifest-1", audio: [] })],
  ])("AMR3. 200이어도 형식이 틀리면(%s) invalid이고 저장본을 둔다", async (_name, bad) => {
    const { store, data, sets, removes } = fakeStore({ [CONTENT_AUDIO_MANIFEST_KEY]: TEXT });
    expect(await run(reply(ok(bad)).fetchText, store)).toBe("invalid");
    expect(data.get(CONTENT_AUDIO_MANIFEST_KEY)).toBe(TEXT);
    expect(sets).toHaveLength(0);
    expect(removes).toHaveLength(0);
  });

  test.each([400, 403, 404, 410])(
    "AMR4. 서버에 없음(%i)이면 저장본이 있을 때 지우고 removed, 없으면 absent",
    async (code) => {
      const body = code === 400 ? ABSENT_BODY : "";
      const had = fakeStore({ [CONTENT_AUDIO_MANIFEST_KEY]: TEXT });
      expect(await run(reply(status(code, body)).fetchText, had.store)).toBe("removed");
      expect(had.data.has(CONTENT_AUDIO_MANIFEST_KEY)).toBe(false);
      const none = fakeStore();
      expect(await run(reply(status(code, body)).fetchText, none.store)).toBe("absent");
      expect(none.removes).toHaveLength(0);
    },
  );

  test.each<[string, Reply]>([
    ["500", status(500)],
    ["503", status(503)],
    ["연결 실패", { ok: false, reason: "network" }],
    ["설정 없음", { ok: false, reason: "unconfigured" }],
    ["reject", "reject"],
  ])("AMR5. 그 밖 실패(%s)는 unavailable이고 저장본을 두며 던지지 않는다", async (_name, r) => {
    const { store, data, sets, removes } = fakeStore({ [CONTENT_AUDIO_MANIFEST_KEY]: TEXT });
    expect(await run(reply(r).fetchText, store)).toBe("unavailable");
    expect(data.get(CONTENT_AUDIO_MANIFEST_KEY)).toBe(TEXT);
    expect(sets).toHaveLength(0);
    expect(removes).toHaveLength(0);
  });

  test("AMR6. 저장소가 없거나 던지면 unavailable이다", async () => {
    const unavailable = fakeStore({}, { available: false });
    const probe = reply(ok(TEXT));
    expect(await run(probe.fetchText, unavailable.store)).toBe("unavailable");
    expect(probe.calls).toHaveLength(0);

    const throwing: ContentStore = {
      available: () => {
        throw new Error("boom");
      },
      get: () => null,
      set: () => undefined,
      remove: () => undefined,
    };
    const second = reply(ok(TEXT));
    expect(await run(second.fetchText, throwing)).toBe("unavailable");
    expect(second.calls).toHaveLength(0);

    const failSet = fakeStore(
      { [CONTENT_AUDIO_MANIFEST_KEY]: manifestTextOf({}) },
      { throwOnSet: true },
    );
    expect(await run(reply(ok(TEXT)).fetchText, failSet.store)).toBe("unavailable");
    expect(failSet.data.get(CONTENT_AUDIO_MANIFEST_KEY)).toBe(manifestTextOf({}));

    const base = fakeStore({ [CONTENT_AUDIO_MANIFEST_KEY]: TEXT });
    const failRemove: ContentStore = {
      ...base.store,
      remove: vi.fn<(key: string) => void>(() => {
        throw new Error("io");
      }),
    };
    expect(await run(reply(status(400, ABSENT_BODY)).fetchText, failRemove)).toBe("unavailable");
    expect(base.data.get(CONTENT_AUDIO_MANIFEST_KEY)).toBe(TEXT);
  });
});

describe("changesAudioTiming", () => {
  test("AMR7. updated · removed만 다시 읽게 하고, 없음 판정 코드는 {400, 403, 404, 410}이다", () => {
    const all: AudioManifestRefresh[] = [
      "updated",
      "unchanged",
      "removed",
      "absent",
      "unavailable",
      "invalid",
    ];
    expect(all.filter(changesAudioTiming)).toEqual(["updated", "removed"]);
    expect([...ABSENT_HTTP_CODES].sort()).toEqual([400, 403, 404, 410]);
  });
});
