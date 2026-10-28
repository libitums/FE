// 끝낸 에피소드 업데이트 안내의 결선입니다 — 진행 · 구획에서 서명을 파생하고, 기기 기록과 비교해 띄울지 정하며, 닫을 때
// 기록을 남깁니다. 언제 띄워도 되는지(`ready`)는 셸이 정합니다(지도 루트 · 다른 겹침 없음 · 진행 조회 끝).

import { useState } from "@lynx-js/react";

import type { CatalogProgress } from "../lib/catalog-progress";
import {
  isCatalogUpdateNoticeStorageAvailable,
  loadCatalogUpdateNotice,
  saveCatalogUpdateNotice,
  shouldShowCatalogUpdateNotice,
  withCatalogUpdateNoticeClosed,
} from "../lib/catalog-update-notice";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { catalogUpdateSignaturesOf } from "../screens/journey-map/catalog-update";

export type CatalogUpdateNotice = {
  readonly open: boolean;
  readonly onClose: (muted: boolean) => void;
};

export function useCatalogUpdateNotice(input: {
  readonly sections: readonly CatalogMapSection[];
  readonly progress: CatalogProgress;
  readonly ready: boolean;
}): CatalogUpdateNotice {
  const [record, setRecord] = useState(loadCatalogUpdateNotice);
  const signatures = catalogUpdateSignaturesOf(input.sections, input.progress);
  const open =
    input.ready &&
    shouldShowCatalogUpdateNotice({
      record,
      signatures,
      storageAvailable: isCatalogUpdateNoticeStorageAvailable(),
    });
  return {
    open,
    onClose: (muted) => {
      const next = withCatalogUpdateNoticeClosed(record, signatures, muted);
      setRecord(next);
      saveCatalogUpdateNotice(next);
    },
  };
}
