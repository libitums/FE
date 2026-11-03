// 테스트 지원 — balance(level-3) u01을 내장 카탈로그로 고정합니다(u00 + u01). 이야기 파이널 흐름 테스트가 `vi.mock`으로
// `episode-bundled`를 이 모듈로 바꿉니다. 제품 코드는 import하지 않습니다.
import manifestJson from "../../content/test-fixtures/balance-2026-10-30/manifest.json";
import u00Tutorial from "../../content/test-fixtures/balance-2026-10-30/episodes/u00-tutorial.json";
import u01Water from "../../content/test-fixtures/balance-2026-10-30/episodes/u01-water.json";
import type { CatalogInput } from "./episode-catalog";
import { decodeManifest } from "./episode-manifest";

const decoded = decodeManifest(manifestJson);
if (!decoded.ok) {
  throw new Error(`balance fixture manifest is invalid: ${JSON.stringify(decoded.errors)}`);
}

export const bundledCatalogInput: CatalogInput["bundled"] = {
  manifest: decoded.manifest,
  episodes: { "u00-tutorial": u00Tutorial, "u01-water": u01Water },
};
