// 맵 스크롤 내용의 위 · 아래 여백입니다(순수 상수). 어느 유닛이든 자동 스크롤 · 말풍선이 원하는 자리로
// 옮길 수 있도록 위는 머리 띠 아래까지, 아래는 말풍선 · 바텀 내비가 들어갈 만큼 내용을 늘립니다 — 여백이
// 모자라면 스크롤이 0 아래 · 내용 끝 너머로 갈 수 없어 맨 위 유닛은 띠 뒤에, 맨 아래 유닛의 말풍선은 화면
// 아래 한계에 갇힙니다. CSS(`.journey-map-screen-map`)가 같은 값을 리터럴로 씁니다(unit 테스트가 맞춥니다).

import { autoScrollPlacement } from "./journey-map-scroll-position";
import { bottomMargin, mapBottomInset, sheetGap, sheetHeight } from "./journey-map-sheet";

export type MapContentInsets = { readonly top: number; readonly bottom: number };

/** 띠의 위 모서리(칩 줄 12 + 40 + 12)입니다 — `.journey-map-screen-episode-header`의 `top`. */
const bandTop = 64;
/** 띠 높이의 어림입니다(두 줄 제목 · 진행 줄). 큰 글자에서는 더 커질 수 있습니다. */
const bandHeight = 112;

export const mapContentInsets: MapContentInsets = {
  top: bandTop + bandHeight + autoScrollPlacement.gap,
  bottom: sheetHeight + mapBottomInset + bottomMargin + sheetGap,
};
