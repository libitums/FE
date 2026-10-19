import { createContext, useContext, type ReactNode } from "@lynx-js/react";

import type { SheetTargetId } from "./catalog-map.contract";
import { noMapUnitEntrance, type MapUnitEntrance } from "./journey-map-sheet-motion";

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
};

/** 표식을 감싸는 무대입니다 — 아직 자식을 그대로 통과시킵니다. */
export function MapUnitStage({ children }: MapUnitStageProps): ReactNode {
  return children;
}
