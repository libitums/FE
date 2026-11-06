import type { CatalogProgress } from "../lib/catalog-progress";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { currentDownloadEpisodeId, downloadCatalogEntriesOf } from "./download-progress";
import type { DownloadCatalogInput } from "./download-progress";
import { tabRootActions } from "./nav-reducer";
import type { NavAction } from "./nav-state";

// 「설정 바꾸기」 — 설정 탭 루트로 간 뒤 설정 › 다운로드를 쌓습니다(동작 목록을 순서대로 dispatch).
export function downloadSettingsNav(dispatch: (action: NavAction) => void) {
  return {
    openDownloadSettings: () => {
      const actions: readonly NavAction[] = [
        ...tabRootActions("settings"),
        { type: "push", screen: { name: "download-settings" } },
      ];
      for (const action of actions) dispatch(action);
    },
  };
}

// 설정 › 다운로드 집계의 입력 — 받을 수 있는 편 목록과 지금 진행 중인 편.
export function downloadCatalogOf(
  content: { readonly catalog: readonly CatalogEntry[] },
  sections: readonly CatalogMapSection[],
  progress: CatalogProgress,
): DownloadCatalogInput {
  return {
    entries: downloadCatalogEntriesOf(content.catalog),
    currentEpisodeId: currentDownloadEpisodeId(sections, progress),
  };
}
