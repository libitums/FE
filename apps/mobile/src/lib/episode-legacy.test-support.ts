// 테스트 지원 — 2026-10-14 내장본(옛 형식 3편)을 카탈로그 입력으로 묶습니다. 제품 코드는 import하지 않습니다.
// 새 내장본에 없는 유형(PAIR_MATCH · SENT_BUILD)과 옛 단계 구성(S1 · S3 ~ S9)을 그대로 쓰는 흐름 테스트가 씁니다.
import manifestJson from "../../content/test-fixtures/delivery-2-2026-10-14/manifest.json";
import u01Water from "../../content/test-fixtures/delivery-2-2026-10-14/u01-water.json";
import u02Checkin from "../../content/test-fixtures/delivery-2-2026-10-14/u02-checkin.json";
import u03Mina from "../../content/test-fixtures/delivery-2-2026-10-14/u03-mina.json";
import type { CatalogInput } from "./episode-catalog";
import { decodeManifest } from "./episode-manifest";

const decoded = decodeManifest(manifestJson);
if (!decoded.ok) {
  throw new Error(`legacy manifest is invalid: ${JSON.stringify(decoded.errors)}`);
}

export const legacyCatalogInput: CatalogInput["bundled"] = {
  manifest: decoded.manifest,
  episodes: { "u01-water": u01Water, "u02-checkin": u02Checkin, "u03-mina": u03Mina },
};
