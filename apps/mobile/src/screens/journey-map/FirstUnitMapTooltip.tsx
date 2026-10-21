import type { FirstUnitMapTooltipProps } from "./catalog-map.contract";

// 첫 유닛 안내의 말풍선입니다 — 대상 표지 아래에 섭니다.
export function FirstUnitMapTooltip(_props: FirstUnitMapTooltipProps) {
  return <view className="first-unit-map-tooltip" data-testid="first-unit-map-tooltip" />;
}
