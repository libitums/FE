import { createContext, useContext, type ReactNode } from "@lynx-js/react";

import type { SheetTargetId } from "./catalog-map.contract";
import {
  mapUnitBurstRayAngles,
  mapUnitBurstRayCount,
  mapUnitPopClassName,
  mapUnitStageMotionOf,
  noMapUnitEntrance,
  type MapUnitEntrance,
} from "./journey-map-sheet-motion";

import "./journey-step-node-motion.css";

const MapUnitEntranceContext = createContext<MapUnitEntrance>(noMapUnitEntrance);

export type MapUnitEntranceProviderProps = {
  readonly value: MapUnitEntrance;
  readonly children?: ReactNode;
};

/** 맵의 유닛들에 말풍선 등장 상태를 내려 줍니다. DOM 요소를 만들지 않습니다. */
export function MapUnitEntranceProvider(props: MapUnitEntranceProviderProps): ReactNode {
  return (
    <MapUnitEntranceContext.Provider value={props.value}>
      {props.children}
    </MapUnitEntranceContext.Provider>
  );
}

/** Provider 밖에서는 모션 없음입니다. 던지지 않습니다. */
export function useMapUnitEntrance(): MapUnitEntrance {
  return useContext(MapUnitEntranceContext);
}

export type MapUnitStageProps = {
  /** 이 표식이 여는 말풍선의 키. 말풍선을 열지 않는 표식은 null. */
  readonly targetId: SheetTargetId | null;
  /** 표식(LearningUnit · SpecialUnit). */
  readonly children: ReactNode;
  /** 표식 어깨에 겹치는 태그(NEW 등) — 무대가 기준 상자라 표식 오른쪽 위에 섭니다. 튕김에는 들지 않습니다. */
  readonly badge?: ReactNode;
};

const burstAngles = mapUnitBurstRayAngles(mapUnitBurstRayCount);

/**
 * 반짝임 묶음입니다 — 후광 하나와 축 여덟. 장식이라 접근성 트리에 올리지 않고 탭도 받지 않습니다. 축은 인라인
 * `rotate`로 45도씩 돌려 두고(정지값) 조각이 축의 위쪽으로 날아갑니다. 짝수는 사각, 홀수는 원입니다. 자식을 한
 * 배열로 내려 후광과 축이 같은 층에 서게 합니다(중간 래퍼 없이).
 */
function MapUnitBurst(): ReactNode {
  const parts: ReactNode[] = [
    <view key="halo" className="journey-step-node-halo" user-interaction-enabled={false} />,
  ];
  burstAngles.forEach((angle, index) => {
    parts.push(
      <view
        key={`ray-${String(angle)}`}
        className="journey-step-node-ray"
        style={{ transform: `rotate(${String(angle)}deg)` }}
        user-interaction-enabled={false}
      >
        <view
          className={`journey-step-node-spark ${index % 2 === 0 ? "journey-step-node-spark-square" : "journey-step-node-spark-round"}`}
          user-interaction-enabled={false}
        />
      </view>,
    );
  });
  return (
    <view
      className="journey-step-node-burst"
      data-testid="journey-step-node-burst"
      user-interaction-enabled={false}
    >
      {parts}
    </view>
  );
}

/**
 * 표식을 감싸는 무대입니다. 열린 노드면 표식이 한 번 튕기고(탭 시각), 등장이 시작되면 둘레로 후광과 반짝임이
 * 퍼집니다. 측정 대상(노드 · 칸)에는 transform을 걸지 않고 튕김은 이 안쪽 래퍼가 집니다. 단계는 순수 파생이라
 * 닫히면 이 렌더에서 사라집니다. 자식은 키를 단 한 배열이라 반짝임이 들고 나도 튕김 래퍼는 같은 노드로 남습니다.
 */
export function MapUnitStage({ targetId, children, badge }: MapUnitStageProps): ReactNode {
  const stageMotion = mapUnitStageMotionOf(useMapUnitEntrance(), targetId);
  const layers: ReactNode[] = [];
  if (stageMotion === "pop-burst") {
    layers.push(<MapUnitBurst key="burst" />);
  }
  layers.push(
    <view key="pop" className={mapUnitPopClassName(stageMotion)}>
      {children}
    </view>,
  );
  if (badge !== undefined && badge !== null)
    layers.push(
      <view key="badge" className="journey-step-node-badge">
        {badge}
      </view>,
    );
  return <view className="journey-step-node-stage">{layers}</view>;
}
