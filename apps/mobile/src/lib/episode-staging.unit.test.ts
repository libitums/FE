import { describe, expect, test } from "vitest";

import { contentAssetsKey } from "./episode-asset-sync";
import {
  CONTENT_MANIFEST_KEY,
  CONTENT_RECEIVED_MANIFEST_KEY,
  contentEpisodeKey,
} from "./episode-cache";
import { decodeManifest } from "./episode-manifest";
import { fakeStore, manifestText } from "./episode-refresh.test-support";
import {
  activeBytes,
  activeSeed,
  catalogOf,
  entryOf,
  manifestEntryIn,
  manifestOf,
  markerText,
  receivedSeed,
  stagedKeys,
  stagedSeed,
  versioned,
} from "./episode-update.test-support";
import {
  composeActiveManifestText,
  contentStagedAssetsKey,
  contentStagedEntryKey,
  contentStagedEpisodeKey,
  discardStagedEpisode,
  heldEpisodeIds,
  promoteStagedEpisodes,
  readStagedEpisode,
  writeStagedEpisode,
} from "./episode-staging";

// `unit` 계층: 스테이징 셋의 읽기 · 쓰기 · 지우기, 보류 id, 활성 원문 합성, 준비된 스테이징을 활성으로 올리는
// 교체와 그 실패 되돌림을 가짜 저장소 하나로 값으로 봅니다.

const V1 = versioned("u04-x", 4, "2026-10-13.1", "옛 제목");
const V2 = versioned("u04-x", 4, "2026-10-14.1", "새 제목");
const V3 = versioned("u04-x", 4, "2026-10-15.1", "더 새 제목");
const ID = "u04-x";

describe("스테이징 키 · 읽기 · 쓰기 · 지우기", () => {
  test("ST1. 키 세 함수의 값", () => {
    expect(contentStagedEpisodeKey(ID)).toBe("libitum.content.staged.episode.u04-x");
    expect(contentStagedEntryKey(ID)).toBe("libitum.content.staged.entry.u04-x");
    expect(contentStagedAssetsKey(ID)).toBe("libitum.content.staged.assets.u04-x");
  });

  test("ST2. 본문 → 항목 순으로 쓰고 읽으면 incomplete, 그 sha의 표시를 쓰면 complete다", () => {
    const { store, sets, data } = fakeStore(activeSeed(V1));

    expect(writeStagedEpisode(store, entryOf(V2), V2.text)).toBe(true);

    expect(sets).toEqual([contentStagedEpisodeKey(ID), contentStagedEntryKey(ID)]);
    expect(readStagedEpisode(store, ID)).toEqual({
      entry: entryOf(V2),
      text: V2.text,
      assets: "incomplete",
    });

    data.set(contentStagedAssetsKey(ID), markerText(V1));
    expect(readStagedEpisode(store, ID)?.assets).toBe("incomplete");

    data.set(contentStagedAssetsKey(ID), markerText(V2));
    expect(readStagedEpisode(store, ID)).toEqual({
      entry: entryOf(V2),
      text: V2.text,
      assets: "complete",
    });
  });

  test("ST2. 쓰기가 하나라도 실패하면 false다", () => {
    const { store } = fakeStore({}, { throwOnSetKeyPrefix: contentStagedEntryKey(ID) });

    expect(writeStagedEpisode(store, entryOf(V2), V2.text)).toBe(false);
  });

  test("ST3. 항목만 있고 본문이 없거나 · 본문 바이트가 다르거나 · 항목 JSON이 깨졌으면 null이고 키는 남긴다", () => {
    const entryOnly = fakeStore({ [contentStagedEntryKey(ID)]: JSON.stringify(V2.entry) });
    expect(readStagedEpisode(entryOnly.store, ID)).toBeNull();
    expect(entryOnly.removes).toHaveLength(0);
    expect(entryOnly.data.has(contentStagedEntryKey(ID))).toBe(true);

    const wrongBody = fakeStore({
      ...stagedSeed(V2),
      [contentStagedEpisodeKey(ID)]: `${V2.text} `,
    });
    expect(readStagedEpisode(wrongBody.store, ID)).toBeNull();
    expect(wrongBody.removes).toHaveLength(0);
    expect(wrongBody.data.has(contentStagedEpisodeKey(ID))).toBe(true);

    const brokenEntry = fakeStore({ ...stagedSeed(V2), [contentStagedEntryKey(ID)]: "{not json" });
    expect(readStagedEpisode(brokenEntry.store, ID)).toBeNull();
    expect(brokenEntry.removes).toHaveLength(0);
  });

  test("ST4. discard는 있는 키만 지우고 셋 다 없으면 remove를 부르지 않는다", () => {
    const partial = fakeStore({
      [contentStagedEpisodeKey(ID)]: V2.text,
      [contentStagedEntryKey(ID)]: JSON.stringify(V2.entry),
    });

    expect(discardStagedEpisode(partial.store, ID)).toBe(true);
    expect([...partial.removes].sort()).toEqual(
      [contentStagedEpisodeKey(ID), contentStagedEntryKey(ID)].sort(),
    );
    expect(partial.data.size).toBe(0);

    const empty = fakeStore();
    expect(discardStagedEpisode(empty.store, ID)).toBe(true);
    expect(empty.removes).toHaveLength(0);
  });
});

describe("보류 id · 활성 원문 합성", () => {
  const S = versioned("u05-s", 5, "2026-10-13.1", "그대로");
  const N = versioned("u06-n", 6, "2026-10-13.1", "새 에피소드");

  test("ST5. 활성에 없거나 sha가 다른 id가 보류이고 같은 id는 아니며 활성이 null이면 전부다", () => {
    const received = manifestOf([V2, S, N]);

    expect([...heldEpisodeIds(received, manifestOf([V1, S]))].sort()).toEqual(["u04-x", "u06-n"]);
    expect([...heldEpisodeIds(received, null)].sort()).toEqual(["u04-x", "u05-s", "u06-n"]);
    expect(heldEpisodeIds(received, manifestOf([V2, S, N])).size).toBe(0);
  });

  test("ST6. overrides가 비면 받은 원문 그대로, 있으면 그 항목만 바꾸거나 빼고 나머지는 받은 것과 같다", () => {
    const text = manifestText([V2, S], { min_client_level: 1 });
    const received = { text, manifest: manifestOf([V2, S], { min_client_level: 1 }) };

    expect(composeActiveManifestText(received, new Map())).toBe(text);

    const swapped = decodeManifest(
      JSON.parse(composeActiveManifestText(received, new Map([[ID, entryOf(V1)]]))),
    );
    expect(swapped.ok && swapped.manifest.episodes.find((e) => e.id === ID)).toEqual(entryOf(V1));
    expect(swapped.ok && swapped.manifest.episodes.find((e) => e.id === "u05-s")).toEqual(
      entryOf(S),
    );
    expect(swapped.ok && swapped.manifest.generatedAt).toBe(received.manifest.generatedAt);
    expect(swapped.ok && swapped.manifest.minClientLevel).toBe(1);

    const removed = decodeManifest(
      JSON.parse(composeActiveManifestText(received, new Map([[ID, null]]))),
    );
    expect(removed.ok && removed.manifest.episodes.map((e) => e.id)).toEqual(["u05-s"]);
    expect(removed.ok && removed.manifest.minClientLevel).toBe(1);
  });
});

describe("promoteStagedEpisodes", () => {
  const readySeed = (): Record<string, string> => ({
    ...activeSeed(V1),
    ...receivedSeed([V2]),
    ...stagedSeed(V2),
  });

  test("ST7. 준비된 스테이징을 활성으로 올리고 활성 매니페스트를 받은 원문으로 확정하며 스테이징을 비운다", () => {
    const { store, data } = fakeStore(readySeed());

    expect(promoteStagedEpisodes(store)).toEqual({ promoted: [ID], persisted: true });

    expect(data.get(contentEpisodeKey(ID))).toBe(V2.text);
    expect(data.get(contentAssetsKey(ID))).toBe(markerText(V2));
    expect(data.get(CONTENT_MANIFEST_KEY)).toBe(manifestText([V2]));
    expect(data.has(CONTENT_RECEIVED_MANIFEST_KEY)).toBe(false);
    for (const key of stagedKeys(ID)) expect(data.has(key)).toBe(false);
    expect(catalogOf(store).find((entry) => entry.id === ID)).toMatchObject({
      status: "ready",
      version: "2026-10-14.1",
    });
  });

  test("ST8. 스테이징 표시가 미완이면 교체하지 않고 활성 셋은 바이트 그대로다", () => {
    const { store, data } = fakeStore({
      ...activeSeed(V1),
      ...receivedSeed([V2]),
      ...stagedSeed(V2, "incomplete"),
    });
    const before = activeBytes(data, ID);

    expect(promoteStagedEpisodes(store).promoted).toEqual([]);

    expect(activeBytes(data, ID)).toEqual(before);
    expect(data.has(contentStagedEpisodeKey(ID))).toBe(true);
  });

  test("ST8. 스테이징 본문의 sha가 항목과 다르면 교체하지 않는다", () => {
    const { store, data } = fakeStore({
      ...readySeed(),
      [contentStagedEpisodeKey(ID)]: `${V2.text} `,
    });
    const before = activeBytes(data, ID);

    expect(promoteStagedEpisodes(store).promoted).toEqual([]);

    expect(activeBytes(data, ID)).toEqual(before);
  });

  test("ST8. 받은 항목의 sha가 스테이징과 다르면(낡음) 교체하지 않고 스테이징을 지운다", () => {
    const { store, data } = fakeStore({
      ...activeSeed(V1),
      ...receivedSeed([V3]),
      ...stagedSeed(V2),
    });
    const before = activeBytes(data, ID);

    expect(promoteStagedEpisodes(store).promoted).toEqual([]);

    expect(activeBytes(data, ID)).toEqual(before);
    for (const key of stagedKeys(ID)) expect(data.has(key)).toBe(false);
  });

  test("ST9. 활성 매니페스트 쓰기가 실패하면 본문 · 표시를 옛 바이트로 되돌리고 스테이징 · 받은 키를 남긴다", () => {
    const { store, data } = fakeStore(readySeed(), { throwOnSetKeyPrefix: CONTENT_MANIFEST_KEY });
    const before = activeBytes(data, ID);

    expect(promoteStagedEpisodes(store)).toEqual({ promoted: [], persisted: false });

    expect(activeBytes(data, ID)).toEqual(before);
    expect(data.get(contentEpisodeKey(ID))).toBe(V1.text);
    expect(data.get(contentAssetsKey(ID))).toBe(markerText(V1));
    expect(data.get(CONTENT_RECEIVED_MANIFEST_KEY)).toBe(manifestText([V2]));
    for (const key of stagedKeys(ID)) expect(data.has(key)).toBe(true);
  });

  test("ST10. 활성 본문 쓰기가 실패하면 그 id를 빼고 표시는 옛 값이며 활성 매니페스트를 쓰지 않는다", () => {
    const { store, data, sets } = fakeStore(readySeed(), {
      throwOnSetKeyPrefix: contentEpisodeKey(ID),
    });

    const result = promoteStagedEpisodes(store);

    expect(result.promoted).toEqual([]);
    expect(result.persisted).toBe(false);
    expect(data.get(contentEpisodeKey(ID))).toBe(V1.text);
    expect(data.get(contentAssetsKey(ID))).toBe(markerText(V1));
    expect(sets).not.toContain(CONTENT_MANIFEST_KEY);
  });

  test("ST11. 교체 도중 앱이 죽은 저장소(본문 · 표시는 새것, 매니페스트는 옛것)에서 다시 교체해도 끝 상태가 ST7과 같다", () => {
    const { store, data } = fakeStore({
      ...readySeed(),
      [contentEpisodeKey(ID)]: V2.text,
      [contentAssetsKey(ID)]: markerText(V2),
    });

    expect(promoteStagedEpisodes(store)).toEqual({ promoted: [ID], persisted: true });

    expect(data.get(contentEpisodeKey(ID))).toBe(V2.text);
    expect(data.get(contentAssetsKey(ID))).toBe(markerText(V2));
    expect(data.get(CONTENT_MANIFEST_KEY)).toBe(manifestText([V2]));
    expect(data.has(CONTENT_RECEIVED_MANIFEST_KEY)).toBe(false);
    for (const key of stagedKeys(ID)) expect(data.has(key)).toBe(false);
  });

  test("ST12. 받은 키가 없으면 활성 매니페스트의 그 항목을 스테이징 항목으로 바꾼다", () => {
    const { store, data } = fakeStore({ ...activeSeed(V1), ...stagedSeed(V2) });

    expect(promoteStagedEpisodes(store)).toEqual({ promoted: [ID], persisted: true });

    expect(manifestEntryIn(data.get(CONTENT_MANIFEST_KEY), ID)).toEqual(entryOf(V2));
    expect(data.get(contentEpisodeKey(ID))).toBe(V2.text);
    expect(data.has(CONTENT_RECEIVED_MANIFEST_KEY)).toBe(false);
  });

  test("ST12. 저장소를 쓸 수 없으면 올린 것이 없고 쓰지 않는다", () => {
    const { store, sets } = fakeStore(readySeed(), { available: false });

    expect(promoteStagedEpisodes(store)).toEqual({ promoted: [], persisted: true });
    expect(sets).toHaveLength(0);
  });

  test("ST12. 활성도 받은 것도 없으면 아무것도 하지 않는다", () => {
    const { store, sets, removes } = fakeStore();

    expect(promoteStagedEpisodes(store)).toEqual({ promoted: [], persisted: true });
    expect(sets).toHaveLength(0);
    expect(removes).toHaveLength(0);
  });
});
