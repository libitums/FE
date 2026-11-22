// 맵 스크롤 내용의 위 · 아래 여백입니다(순수 상수). 위는 칩 줄 바로 아래입니다(사용자 결정 2026-11-22, ADR-0024
// 적용 기록) — 말풍선이 열리는 맨 위 유닛은 표지 줄 아래라 그것만으로 머리 띠 아래에 섭니다(unit IN4). 아래는 말풍선 ·
// 바텀 내비가 들어갈 만큼 늘립니다 — 모자라면 스크롤이 내용 끝 너머로 갈 수 없어 맨 아래 유닛의 말풍선이 화면 아래
// 한계에 갇힙니다. CSS(`.journey-map-screen-map`)가 같은 값을 리터럴로 씁니다(unit 테스트가 맞춥니다).

import { bottomMargin, mapBottomInset, sheetGap, sheetHeight } from "./journey-map-sheet";

export type MapContentInsets = { readonly top: number; readonly bottom: number };

/** 띠의 위 모서리(칩 줄 12 + 40 + 12 — 칩은 44라 간격이 4 좁습니다)입니다 — `.journey-map-screen-episode-header`의 `top`. */
const bandTop = 64;

export const mapContentInsets: MapContentInsets = {
  top: bandTop,
  bottom: sheetHeight + mapBottomInset + bottomMargin + sheetGap,
};

/**
 * 맵이 상태 표시줄 뒤까지 스크롤할 때의 위쪽 배치입니다(⟨2026-10-19⟩ 사용자 결정 — 셸이 위 안전 영역을 칠하던 흰
 * 띠 뒤로 맵이 뚝 끊겨 보였습니다). 셸은 여정 맵에서 위 여백을 잡지 않고(`shellInsetsFor`), 그 높이를 여기서
 * 더합니다: 스크롤 상자는 화면 맨 위에서 시작하고(화면 위 여백 0), 위 모서리 기준으로 선 칩 · 띠 · 로딩 줄 · 첫
 * 내용은 안전 영역만큼 내립니다. ⟨2026-11-22⟩ 첫 내용은 띠와 같은 자리(칩 줄 + 8)에서 시작합니다.
 * Lynx는 인라인 `calc(var())`를 적용하지 않아 숫자로 냅니다. 값은 CSS 리터럴(12 · 64 · 72)과 같습니다.
 */
export type MapTopLayout = {
  readonly screenPaddingTop: number;
  readonly mapPaddingTop: number;
  readonly bandTop: number;
  readonly progressRowTop: number;
  readonly headerTop: number;
};

/** `--libitum-layout-screen-padding-top`(12)입니다 — 칩 줄의 위 여백이기도 합니다. */
const chipRowPaddingTop = 12;
/** 로딩 줄은 띠와 같은 위 모서리에서 spacing-8만큼 내려옵니다. */
const progressRowGap = 8;

export function mapTopLayout(statusBarInset: number): MapTopLayout {
  return {
    screenPaddingTop: 0,
    mapPaddingTop: mapContentInsets.top + statusBarInset,
    bandTop: bandTop + statusBarInset,
    progressRowTop: bandTop + progressRowGap + statusBarInset,
    headerTop: chipRowPaddingTop + statusBarInset,
  };
}
