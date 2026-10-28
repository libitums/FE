// 테스트 지원 — 2026-10-23 내장본(u00 ~ u03)을 내장 카탈로그로 고정합니다. 제품 코드는 import하지 않습니다.
// 내장본은 버킷 최신본으로 자주 바뀝니다(2026-10-28 u00 ~ u10 level-2 판). 문장 · 단계 · 소리 id를 짚는 흐름 테스트가 그때마다
// 깨지지 않게, `vitest.setup.ts`가 `episode-bundled`를 이 모듈로 바꿉니다. 실제 내장본은
// `episode-bundled.live.unit.test.ts`가 봅니다.
import manifestJson from "../../content/test-fixtures/bundled-2026-10-23/manifest.json";
import u00Tutorial from "../../content/test-fixtures/bundled-2026-10-23/episodes/u00-tutorial.json";
import u01Water from "../../content/test-fixtures/bundled-2026-10-23/episodes/u01-water.json";
import u02Checkin from "../../content/test-fixtures/bundled-2026-10-23/episodes/u02-checkin.json";
import u03Mina from "../../content/test-fixtures/bundled-2026-10-23/episodes/u03-mina.json";
import type { CatalogInput } from "./episode-catalog";
import { decodeManifest } from "./episode-manifest";

/** 고정본 원문이 있는 폴더입니다(앱 루트 기준) — 디스크 원문의 해시를 견주는 테스트가 씁니다. */
export const BUNDLED_FIXTURE_DIR = "content/test-fixtures/bundled-2026-10-23";

const decoded = decodeManifest(manifestJson);
if (!decoded.ok) {
  throw new Error(`bundled fixture manifest is invalid: ${JSON.stringify(decoded.errors)}`);
}

export const bundledCatalogInput: CatalogInput["bundled"] = {
  manifest: decoded.manifest,
  episodes: {
    "u00-tutorial": u00Tutorial,
    "u01-water": u01Water,
    "u02-checkin": u02Checkin,
    "u03-mina": u03Mina,
  },
};
