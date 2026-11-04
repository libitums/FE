// 구획 하나의 발자국 자리를 잽니다(ADR-0100 D2) — 끝낸 구간이 있을 때만 유닛 표식 상자(`journey-map-mark-…`)를, 구간 목록 · 열 수가 바뀔 때 한 번.
// 스크롤마다 재지 않습니다. 계산은 `map-footprints.ts`(순수)가 하고 이 훅은 호스트 측정과 잇습니다.

import { useEffect, useMemo, useState } from "@lynx-js/react";

import type { CatalogProgress, CatalogUnitKey } from "../../lib/catalog-progress";
import { catalogSectionDomId } from "./catalog-map";
import type { CatalogReadySection } from "./catalog-map.contract";
import { measureRectsWithOptional, type MeasuredRect } from "./journey-map-scroll";
import {
  catalogMarkDomId,
  clearedSegmentsOf,
  footprintLayoutOf,
  mapNodeShapeOf,
  type MapCellRect,
  type MapFootprintSegment,
} from "./map-footprints";
import { useMapColumns } from "./useMapColumns";

export type MapFootprintsInput = {
  readonly section: CatalogReadySection;
  readonly progress: CatalogProgress;
  /** 이 마운트에서 등장 모션을 걸 「방금 끝낸 유닛」 — 이 구획의 유닛이면 그 키, 아니면 null. */
  readonly enteringFrom: CatalogUnitKey | null;
};

export type MapFootprintsState = {
  readonly segments: readonly MapFootprintSegment[];
  readonly enteringFrom: CatalogUnitKey | null;
};

const noSegments: readonly MapFootprintSegment[] = [];

/** 가로 값이 없는 측정은 자리를 못 내므로 버립니다. */
function cellRectOf(rect: MeasuredRect | null): MapCellRect | undefined {
  if (rect === null || rect.left === null || rect.width === null) return undefined;
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

export function useMapFootprints(input: MapFootprintsInput): MapFootprintsState {
  const { section, progress, enteringFrom } = input;
  const columns = useMapColumns();
  const segments = useMemo(() => clearedSegmentsOf(section, progress), [section, progress]);
  const [layout, setLayout] = useState<readonly MapFootprintSegment[]>(noSegments);

  useEffect(() => {
    if (segments.length === 0) {
      setLayout(noSegments);
      return undefined;
    }
    let cancelled = false;
    const keys: CatalogUnitKey[] = [];
    for (const segment of segments) {
      for (const key of [segment.from, segment.to]) {
        if (!keys.includes(key)) keys.push(key);
      }
    }
    const episodeId = section.episodeId;
    measureRectsWithOptional(
      [catalogSectionDomId(episodeId)],
      keys.map((key) => catalogMarkDomId(episodeId, key)),
      (rects, optional) => {
        "background only";
        if (cancelled) return;
        const origin = cellRectOf(rects?.[0] ?? null);
        if (origin === undefined) {
          setLayout(noSegments);
          return;
        }
        const byKey: Record<CatalogUnitKey, MapCellRect | undefined> = {};
        keys.forEach((key, index) => {
          byKey[key] = cellRectOf(optional[index] ?? null);
        });
        setLayout(
          footprintLayoutOf(segments, byKey, { x: origin.left, y: origin.top }, (key) =>
            mapNodeShapeOf(section, key),
          ),
        );
      },
    );
    return () => {
      cancelled = true;
    };
    // 열 수가 바뀌면 자리가 바뀌므로 다시 잽니다.
  }, [segments, section, columns]);

  return { segments: layout, enteringFrom };
}
