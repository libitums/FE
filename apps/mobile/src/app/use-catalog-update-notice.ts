// 끝낸 에피소드 업데이트 안내의 결선입니다 — 새 유닛이 있는 에피소드와 콘텐츠 버전을 기기 기록과 비교해 띄울지 정하고,
// 닫을 때 지금 버전을 적습니다. 띄울 것 없이 지도에 닿아도 지금 버전을 조용히 적어, 이후 유닛을 끝내거나 에피소드를 클리어해
// 진행이 바뀌어도 뜨지 않습니다 — 콘텐츠가 바뀐(앱 시작에 적용된) 뒤 처음 한 번만 뜹니다. 언제 띄워도 되는지(`ready`)는
// 셸이 정합니다(지도 루트 · 다른 겹침 없음 · 진행 조회 끝).

import { useEffect, useMemo, useState } from "@lynx-js/react";

import type { CatalogEntry } from "../lib/episode-catalog";
import type { CatalogProgress } from "../lib/catalog-progress";
import {
  catalogUpdateNoticeNeedsSync,
  isCatalogUpdateNoticeStorageAvailable,
  loadCatalogUpdateNotice,
  saveCatalogUpdateNotice,
  shouldShowCatalogUpdateNotice,
  withCatalogUpdateNoticeVersions,
} from "../lib/catalog-update-notice";
import type { CatalogUpdateNoticeRecord } from "../lib/catalog-update-notice.contract";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { catalogFreshEpisodeIdsOf } from "../screens/journey-map/catalog-update";

export type CatalogUpdateNotice = {
  readonly open: boolean;
  readonly onClose: (muted: boolean) => void;
};

/** 열리는(ready) 에피소드의 id → 콘텐츠 버전. */
function versionsOf(catalog: readonly CatalogEntry[]): Readonly<Record<string, string>> {
  const versions: Record<string, string> = {};
  for (const entry of catalog) if (entry.status === "ready") versions[entry.id] = entry.version;
  return versions;
}

export function useCatalogUpdateNotice(input: {
  readonly catalog: readonly CatalogEntry[];
  readonly sections: readonly CatalogMapSection[];
  readonly progress: CatalogProgress;
  readonly ready: boolean;
}): CatalogUpdateNotice {
  const { catalog, sections, progress, ready } = input;
  const [record, setRecord] = useState(loadCatalogUpdateNotice);
  const versions = useMemo(() => versionsOf(catalog), [catalog]);
  const freshIds = useMemo(
    () => catalogFreshEpisodeIdsOf(sections, progress),
    [sections, progress],
  );
  const storageAvailable = isCatalogUpdateNoticeStorageAvailable();
  const open =
    ready && shouldShowCatalogUpdateNotice({ record, versions, freshIds, storageAvailable });
  const save = (next: CatalogUpdateNoticeRecord) => {
    setRecord(next);
    saveCatalogUpdateNotice(next);
  };
  useEffect(() => {
    if (!ready || open || !storageAvailable) return;
    if (catalogUpdateNoticeNeedsSync(record, versions)) {
      save(withCatalogUpdateNoticeVersions(record, versions, false));
    }
    // 기록을 맞추는 것은 띄울 수 있는 때(`ready`) · 버전 · 열림이 바뀔 때뿐입니다.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, open, versions]);
  return {
    open,
    onClose: (muted) => save(withCatalogUpdateNoticeVersions(record, versions, muted)),
  };
}
