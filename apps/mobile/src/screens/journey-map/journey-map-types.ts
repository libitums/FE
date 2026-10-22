// 여정 맵의 **타입만** 소유합니다 — 맵 노드의 상태 어휘입니다. 값 선언이 0건이라 의존 그래프의 바닥에 있습니다.

/**
 * 맵 항목 하나가 줄에서 어떤 상태로 서는가입니다. **항목이 지지 않고 파생이 냅니다** —
 * 항목에 적으면 진행과 어긋날 자리가 생깁니다(ADR-0007 D3). 잠김을 실제로 내는 파생은
 * `catalog-map.ts`의 `catalogCoverStatus` · `catalogUnitStatus`입니다.
 */
export type JourneyMapItemStatus = "locked" | "available" | "completed";

/**
 * 맵 노드가 받는 상태입니다 — 진행에서 파생되는 상태에 「확인 중」이 더해집니다. 파생 함수의
 * 반환 타입은 넓히지 않고, 화면 경계(`journey-map-load.ts`)에서만 덮습니다.
 */
export type JourneyMapNodeStatus = JourneyMapItemStatus | "checking";
