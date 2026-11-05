import { expect, test } from "vitest";

import { decodeManifest, encodeManifestText } from "./episode-manifest";
import type { ManifestDecodeResult } from "./episode-manifest";

// `unit` 계층: 매니페스트 항목의 선택 키 `translations`(ADR-0102 D2) — 보존 · 언어별로 거름 · 다시 쓰기.

const HASH = "b".repeat(64);
const ref = (lang: string, extra: Record<string, unknown> = {}) => ({
  url: `translations/${lang}/u01-water.json`,
  version: "2026-11-05.2",
  sha256: HASH,
  bytes: 10,
  ...extra,
});
const wire = (translations: unknown) => ({
  schema: "manifest-1",
  generated_at: "2026-11-05T00:00:00Z",
  episodes: [
    {
      id: "u01-water",
      order: 1,
      title: "물 사기",
      schema: "delivery-2",
      version: "2026-11-05.2",
      sha256: "a".repeat(64),
      bytes: 10,
      url: "episodes/level-4/u01-water.json",
      ...(translations === undefined ? {} : { translations }),
    },
  ],
});
const entryOf = (result: ManifestDecodeResult) => {
  if (!result.ok) throw new Error("ok여야 합니다");
  return result.manifest.episodes[0];
};

test("MT1. 언어별 항목을 그대로 읽는다", () => {
  expect(entryOf(decodeManifest(wire({ vi: ref("vi"), ja: ref("ja") })))?.translations).toEqual({
    vi: { url: "translations/vi/u01-water.json", version: "2026-11-05.2", sha256: HASH, bytes: 10 },
    ja: { url: "translations/ja/u01-water.json", version: "2026-11-05.2", sha256: HASH, bytes: 10 },
  });
});

test("MT2. 틀린 언어 항목 · 모르는 언어는 그 언어만 버리고 매니페스트는 받는다", () => {
  const entry = entryOf(
    decodeManifest(
      wire({
        vi: ref("vi"),
        id: ref("id", { sha256: "zz" }),
        es: ref("es", { url: "" }),
        ja: ref("ja", { bytes: -1 }),
        fr: ref("fr"),
      }),
    ),
  );
  expect(Object.keys(entry?.translations ?? {})).toEqual(["vi"]);
});

test("MT3. 객체가 아니거나 남는 언어가 없으면 키가 없다", () => {
  expect(entryOf(decodeManifest(wire("x")))).not.toHaveProperty("translations");
  expect(entryOf(decodeManifest(wire({ fr: ref("fr") })))).not.toHaveProperty("translations");
  expect(entryOf(decodeManifest(wire(undefined)))).not.toHaveProperty("translations");
});

test("MT4. 다시 쓰면 같은 항목으로 읽힌다", () => {
  const first = decodeManifest(wire({ vi: ref("vi") }));
  if (!first.ok) throw new Error("ok여야 합니다");
  const again = decodeManifest(JSON.parse(encodeManifestText(first.manifest)));
  expect(again).toEqual(first);
});
