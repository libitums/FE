// 테스트 지원 — 2026-10-23 고정본의 u01에 베트남어 번역표를 붙인 내장 카탈로그입니다(ADR-0091 D1). 콘텐츠 번역이
// 화면까지 닿는지 보는 흐름 테스트가 `vi.mock`으로 `episode-bundled`를 이 모듈로 바꿉니다. 제품 코드는 import하지
// 않습니다.
import { bundledCatalogInput as base } from "./episode-bundled.test-support";
import type { CatalogInput } from "./episode-catalog";

export const u01TitleVi = "Mua nước";
export const u01TitleId = "Membeli Air";

const u01 = base.episodes["u01-water"] as Record<string, unknown>;

export const bundledCatalogInput: CatalogInput["bundled"] = {
  ...base,
  episodes: {
    ...base.episodes,
    "u01-water": {
      ...u01,
      translations: {
        vi: { [String(u01["title_en"])]: u01TitleVi },
        id: { [String(u01["title_en"])]: u01TitleId },
      },
    },
  },
};
