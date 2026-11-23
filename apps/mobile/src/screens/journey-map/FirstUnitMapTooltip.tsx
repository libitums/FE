import { useUiCopy } from "../../lib/ui-copy";
import type { FirstUnitMapTooltipProps } from "./catalog-map.contract";
import { canSelectMapNode } from "./journey-map-load";

// 첫 유닛 안내의 글입니다 — 대상 표지 아래에 서고, 누르면 표지를 누른 것과 같습니다. 유닛의 탭 길을 지나지 않으므로
// 자체 가드를 둡니다.
// ui-lynx `Tooltip`을 쓰지 않습니다 — 그것은 누를 수 없는 말풍선이라 `event-through`로 터치를 Lynx 밖에 흘려, 글을
// 눌러도 아무 일이 없었습니다(기기 확인 2026-11-22, ADR-0081 적용 기록). 낭독 · 두 번 탭은 이 상자 하나가 받습니다.
export function FirstUnitMapTooltip({ status, onSelect }: FirstUnitMapTooltipProps) {
  const copy = useUiCopy();
  const message = copy.episodeIntro.guide.map;
  const handleTap = () => {
    "background only";
    if (canSelectMapNode(status)) onSelect();
  };

  return (
    <view
      className="first-unit-map-tooltip"
      data-testid="first-unit-map-tooltip"
      flatten={false}
      accessibility-element={true}
      accessibility-enable-tap={true}
      accessibility-label={message}
      accessibility-traits="button"
      bindtap={handleTap}
    >
      <view className="first-unit-map-tooltip-body">
        <text className="first-unit-map-tooltip-message" accessibility-element={false}>
          {message}
        </text>
      </view>
    </view>
  );
}
