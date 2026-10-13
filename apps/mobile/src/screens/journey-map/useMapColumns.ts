import type { MapColumns } from "./journey-map-rows";

/** 호스트가 보낸 배율 · 폭으로 맵의 열 수를 냅니다. 값이 없으면 2. */
export function useMapColumns(): MapColumns {
  return 2;
}
