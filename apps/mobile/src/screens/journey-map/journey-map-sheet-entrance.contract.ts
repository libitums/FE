// 말풍선 등장 종류의 타입만 둡니다 — 머리 슬롯 계약(`catalog-map.contract`)과 모션 모듈이 함께 읽고, 이 파일은 아무것도
// import하지 않아 두 쪽 사이에 순환이 생기지 않습니다.

/** none = 모션 없음(직접 렌더 기본값 — 지금 DOM 그대로). 앱 결선은 나머지 셋만 냅니다. */
export type SheetEntranceMotion = "none" | "awaiting" | "expressive" | "fade";
