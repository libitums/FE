import { expect, test } from "vitest";

import { BASE_MANIFEST_PATH, contentManifestPathsFor } from "./content-manifest-path";
import { CONTENT_CLIENT_LEVEL } from "./episode-catalog";

// `unit` 계층: 콘텐츠 수준별 매니페스트 경로(ADR-0087).

test("ML1. 수준 1 이하는 manifest.json 하나다", () => {
  expect(contentManifestPathsFor(1)).toEqual(["manifest.json"]);
  expect(contentManifestPathsFor(0)).toEqual(["manifest.json"]);
  expect(BASE_MANIFEST_PATH).toBe("manifest.json");
});

test("ML2. 수준 n은 level-n부터 level-2까지 내려온 뒤 manifest.json이다", () => {
  expect(contentManifestPathsFor(2)).toEqual(["manifests/level-2.json", "manifest.json"]);
  expect(contentManifestPathsFor(3)).toEqual([
    "manifests/level-3.json",
    "manifests/level-2.json",
    "manifest.json",
  ]);
});

test("ML3. 지금 앱의 경로 목록은 manifest.json으로 끝난다", () => {
  const paths = contentManifestPathsFor(CONTENT_CLIENT_LEVEL);
  expect(paths[paths.length - 1]).toBe("manifest.json");
});
