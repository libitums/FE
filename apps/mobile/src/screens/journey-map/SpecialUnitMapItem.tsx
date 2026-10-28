import { SpecialUnit } from "@libitums/ui-lynx/special-unit";
import type { SpecialUnitTapEvent } from "@libitums/ui-lynx/special-unit";

import { useUiCopy } from "../../lib/ui-copy";
import { canSelectMapNode } from "./journey-map-load";
import {
  specialUnitLabelToneOf,
  specialUnitMapAccessibilityLabel,
  specialUnitStatusOf,
} from "./journey-special-unit";
import type { SpecialUnitMapItemProps } from "./journey-special-unit.contract";
import { MapUnitStage } from "./MapUnitStage";

import "./journey-special-unit.css";

// 맵의 스페셜 항목 일곱 종(튜토리얼 표지 · 메신저 · 전화 · 비주얼 노벨 · 최종, 카탈로그 표지 ·
// 최종)이 함께 쓰는 몸통입니다. 어댑터는 id · 제목 · 낭독 이름 · 고름만 고릅니다.
//
// 잠김이면 고르지 않습니다. `SpecialUnit`이 Default · Checking에 탭을 달지 않는 것에만 기대지
// 않고 여기서도 막습니다 — 그 컴포넌트의 내부 동작이 바뀌어도 맵의 잠김은 버팁니다.
export function SpecialUnitMapItem({
  unitId,
  title,
  accessibilityName,
  status,
  onSelect,
  layer = "map",
  icon,
  sheetTargetId,
  children,
}: SpecialUnitMapItemProps) {
  const copy = useUiCopy();
  const unitStatus = specialUnitStatusOf(status);

  // custom prop(`SpecialUnit`의 `bindtap`)을 거쳐 `bindtap`에 닿는 핸들러라 `'background only'`를 둡니다.
  const handleSelect = (event: SpecialUnitTapEvent) => {
    "background only";
    if (canSelectMapNode(status)) {
      // 탭의 세로 좌표를 함께 올립니다 — 카탈로그 맵이 말풍선을 그 자리에 띄웁니다.
      onSelect(event.detail?.y ?? 0);
    }
  };

  return (
    // 바깥 상자는 표식과 라벨을 묶는 자리일 뿐입니다 — 탭도 접근성 요소도 `SpecialUnit`이 집습니다.
    <view
      className={
        layer === "guide"
          ? "journey-special-unit journey-special-unit-guided"
          : "journey-special-unit"
      }
    >
      <MapUnitStage targetId={sheetTargetId ?? null}>
        <SpecialUnit
          id={unitId}
          accessibilityLabel={specialUnitMapAccessibilityLabel(
            accessibilityName,
            copy.specialUnitMap,
          )}
          status={unitStatus}
          bindtap={handleSelect}
          {...(icon === undefined ? {} : { icon })}
        />
      </MapUnitStage>
      <view
        className={`journey-special-unit-label journey-special-unit-label-${specialUnitLabelToneOf(unitStatus)}`}
        data-testid={`journey-special-unit-label-${unitId}`}
        accessibility-element={false}
      >
        <text
          className="journey-special-unit-eyebrow"
          data-testid={`journey-special-unit-eyebrow-${unitId}`}
          accessibility-element={false}
        >
          {copy.specialUnitMap.eyebrow}
        </text>
        <text
          className="journey-special-unit-title"
          data-testid={`journey-special-unit-title-${unitId}`}
          accessibility-element={false}
        >
          {title}
        </text>
      </view>
      {children}
    </view>
  );
}
