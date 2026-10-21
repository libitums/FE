import { describe, expect, test } from "vitest";

import { AUDIO_MANIFEST_PATH } from "./audio-manifest";
import { refreshAudioManifest } from "./audio-manifest-refresh";
import { manifestTextOf } from "./audio-manifest.test-support";
import { bundledCatalogInput } from "./episode-bundled";
import { refreshEpisodeCatalog } from "./episode-refresh";
import { fakeFetch, fakeStore, ok } from "./episode-refresh.test-support";
import type { FetchText } from "./episode-remote";
import { activeSeed, repliesFor, versioned } from "./episode-update.test-support";

// `unit` 계층: 받기 호출자가 전송에 넘기는 둘째 인자(주소 키)를 대역 `fetchText`로 기록해 봅니다(ER-CK6).

function keyed(replies: ReturnType<typeof repliesFor>) {
  const base = fakeFetch(replies);
  const seen: [string, unknown][] = [];
  const fetchText = (async (relative: string, key?: unknown) => {
    seen.push([relative, key]);
    return base.fetchText(relative);
  }) as unknown as FetchText;
  return { fetchText, seen };
}

const keyOf = (seen: readonly [string, unknown][], path: string) =>
  seen.find(([relative]) => relative === path)?.[1];

describe("받기 호출자의 주소 키", () => {
  test("ER-CK6a. 새 에피소드: 매니페스트는 fresh, 본문은 그 항목의 sha256으로 version", async () => {
    const fresh = versioned("u05-n", 5, "2026-10-14.1", "새");
    const { fetchText, seen } = keyed(repliesFor([fresh]));
    await refreshEpisodeCatalog({
      fetchText,
      store: fakeStore().store,
      bundled: bundledCatalogInput,
    });
    expect(keyOf(seen, "manifest.json")).toEqual({ kind: "fresh" });
    expect(keyOf(seen, "episodes/u05-n.json")).toEqual({
      kind: "version",
      sha256: fresh.entry["sha256"],
    });
  });

  test("ER-CK6b. 바뀐 에피소드: 본문은 새 항목의 sha256으로 version", async () => {
    const v1 = versioned("u04-x", 4, "2026-10-13.1", "옛");
    const v2 = versioned("u04-x", 4, "2026-10-14.1", "새");
    const { fetchText, seen } = keyed(repliesFor([v2]));
    await refreshEpisodeCatalog({
      fetchText,
      store: fakeStore(activeSeed(v1)).store,
      bundled: bundledCatalogInput,
    });
    expect(keyOf(seen, "episodes/u04-x.json")).toEqual({
      kind: "version",
      sha256: v2.entry["sha256"],
    });
  });

  test("ER-CK6c. 음성 정보 파일은 fresh", async () => {
    const { fetchText, seen } = keyed({ [AUDIO_MANIFEST_PATH]: ok(manifestTextOf()) });
    await refreshAudioManifest({ fetchText, store: fakeStore().store });
    expect(keyOf(seen, AUDIO_MANIFEST_PATH)).toEqual({ kind: "fresh" });
  });
});
