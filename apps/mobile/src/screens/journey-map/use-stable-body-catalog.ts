// 지도 본문에 넘기는 카탈로그를 내용이 같으면 같은 객체로 둡니다. 셸은 그릴 때마다 새 `catalog` 객체(새 함수 · 새
// 진행 객체)를 넘기는데, 그대로 쓰면 지도 본문(`JourneyMapBody` memo — 18편 전체)이 매번 다시 계산됐습니다(기기에서 탭
// 전환마다 백그라운드 250 ~ 390 ms, ADR-0106 후속). 데이터는 내용이 같으면 이전 값을, 콜백은 최신 함수를 부르는 고정
// 함수를 씁니다.

import { useMemo, useRef } from "@lynx-js/react";

import type { JourneyMapCatalogProps } from "./catalog-map.contract";

/** 작은 데이터(진행 · 티켓 유닛 · 확인 시각)를 내용이 같으면 이전 참조로 둡니다. */
function useSameContent<T>(value: T): T {
  const kept = useRef<{ value: T; key: string | undefined } | null>(null);
  // `undefined`는 `JSON.stringify`가 문자열이 아닌 `undefined`로 돌려줘 `null`("null")과 갈립니다.
  const key: string | undefined = JSON.stringify(value);
  if (kept.current === null || kept.current.key !== key) kept.current = { value, key };
  return kept.current.value;
}

export function useStableBodyCatalog(catalog: JourneyMapCatalogProps): JourneyMapCatalogProps {
  const latest = useRef(catalog);
  latest.current = catalog;
  const progress = useSameContent(catalog.progress);
  const ticketUnits = useSameContent(catalog.ticketUnits);
  const freshness = useSameContent(catalog.freshness);
  const hasCover = catalog.coverImageUrlOf !== undefined;
  const hasItemCount = catalog.unitItemCountOf !== undefined;
  const hasPending = catalog.onTapPending !== undefined;
  const hasCheckNew = catalog.onCheckNew !== undefined;
  return useMemo<JourneyMapCatalogProps>(
    () => ({
      sections: catalog.sections,
      progress,
      ...(ticketUnits === undefined ? {} : { ticketUnits }),
      legacyTutorialPassed: catalog.legacyTutorialPassed,
      onStartCover: (episodeId) => latest.current.onStartCover(episodeId),
      onStartUnit: (episodeId, unitKey) => latest.current.onStartUnit(episodeId, unitKey),
      ...(hasCover
        ? { coverImageUrlOf: (path: string) => latest.current.coverImageUrlOf?.(path) ?? null }
        : {}),
      ...(hasItemCount
        ? {
            unitItemCountOf: (episodeId: string, unitKey: string) =>
              latest.current.unitItemCountOf?.(episodeId, unitKey) ?? 0,
          }
        : {}),
      ...(hasPending
        ? { onTapPending: (episodeId: string) => latest.current.onTapPending?.(episodeId) }
        : {}),
      ...(freshness === undefined ? {} : { freshness }),
      ...(hasCheckNew ? { onCheckNew: () => latest.current.onCheckNew?.() } : {}),
      ...(catalog.clearedUnit === undefined ? {} : { clearedUnit: catalog.clearedUnit }),
    }),
    // 콜백은 최신을 가리키므로 의존에 넣지 않습니다 — 데이터와 「있는가」만 봅니다.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [
      catalog.sections,
      progress,
      ticketUnits,
      catalog.legacyTutorialPassed,
      freshness,
      catalog.clearedUnit,
      hasCover,
      hasItemCount,
      hasPending,
      hasCheckNew,
    ],
  );
}
