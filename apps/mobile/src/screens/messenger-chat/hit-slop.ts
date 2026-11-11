// 터치 영역 확장값입니다(접근성 M2 — design 4절 「보이는 34 / 터치 44」). 보이는 크기는 그대로 두고 터치만 넓힙니다(Lynx
// `hit-slop`). 이웃 단추와 겹치지 않도록 가로는 사이 간격(8)의 절반 이하로 둡니다. 화면 지역 상수라 토큰이 없습니다.

/** 보이는 34 → 터치 44(알약 · 전구). 알약은 옆 알약과 가로로 붙어 있어 위아래만 넓힙니다. */
export const SLOP_PILL = { top: "5px", bottom: "5px", left: "0px", right: "0px" } as const;

/** 보이는 34 → 터치 44, 사방(전구는 입력 칸 안 왼쪽이라 가로 여유가 있습니다). */
export const SLOP_BULB = "5px" as const;

/** 보이는 40 → 터치 44, 사방(「…」 · 보내기). */
export const SLOP_ROUND = "2px" as const;

/** 보이는 32 → 터치 44, 위아래만(재생 · Type myself). */
export const SLOP_SMALL = { top: "6px", bottom: "6px", left: "0px", right: "0px" } as const;

/** 토글 칸 30 → 터치 44, 위아래만(트랙 안쪽 여백 3 + 줄 여백 6 안에서). */
export const SLOP_TOGGLE = { top: "7px", bottom: "7px", left: "0px", right: "0px" } as const;
