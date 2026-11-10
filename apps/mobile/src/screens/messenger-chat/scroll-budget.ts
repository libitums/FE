// 큰 글자에서 새 친구 시트 · T3 판이 화면 밖으로 넘치지 않게 하는 px 예산입니다(접근성 C1 · M1). 퍼센트 높이는 쓰지 않고
// (기기 교훈) 화면 높이에서 px로 뺍니다. 스크롤 칸은 flex만으로는 높이가 정해지지 않으니(ADR-0113 기기 교훈 3) 잰 값으로 px 높이를 줍니다.

/** 스크롤 칸이 줄 수 있는 가장 작은 높이(px)입니다. */
export const MIN_SCROLL_PX = 64;
/** 시트 위로 늘 남겨 두는 막 띠(px) — 탭으로 닫을 자리입니다(design 6절). */
const SHEET_TOP_SCRIM_PX = 24;
/** T3 판 아래로 늘 남겨 두는 로그 높이(px)입니다(design 6절 spacing-96). */
const OUT_PANEL_LOG_MIN_PX = 96;
/** 머리 최소 높이(px)입니다 — 제목 줄 + 부제 줄이 한 줄씩일 때 기본값(row min-height 64 + 아래 선). */
const HEADER_MIN_PX = 72;
/** 머리 가로 줄 위아래 패딩 합(px) · 제목 + 부제 줄 높이 합(px, heading-s 24 + body-s 18) · 어긋남 여유(px). 제목 · 부제는 한 줄로 자르므로 두 줄 높이가 상한입니다. */
const HEADER_ROW_PAD_PX = 16;
const HEADER_LINES_PX = 42;
const HEADER_SLACK_PX = 8;

/** 시트 판의 최대 높이 = 화면 − 상태 바 − 24. 화면 높이를 모르면 null(상한 없음). */
export function sheetMaxHeightOf(input: {
  readonly screenHeight: number;
  readonly insetTop: number;
}): number | null {
  if (!Number.isFinite(input.screenHeight)) return null;
  return Math.floor(input.screenHeight - input.insetTop - SHEET_TOP_SCRIM_PX);
}

/** T3 판의 최대 높이 = 화면 − 상태 바 − 머리 − 96. 머리는 제목 · 부제 한 줄씩(말줄임)이라 높이가 (42 × 배율 + 패딩)입니다. 화면 높이를 모르면 null. */
export function outPanelMaxHeightOf(input: {
  readonly screenHeight: number;
  readonly insetTop: number;
  readonly fontScale: number | null;
}): number | null {
  if (!Number.isFinite(input.screenHeight)) return null;
  const scale = input.fontScale === null ? 1 : Math.max(1, input.fontScale);
  const header = Math.ceil(
    Math.max(HEADER_MIN_PX, HEADER_ROW_PAD_PX + HEADER_LINES_PX * scale + HEADER_SLACK_PX),
  );
  return Math.floor(input.screenHeight - input.insetTop - header - OUT_PANEL_LOG_MIN_PX);
}

/** 스크롤 칸 높이(px)입니다. 못 잰 값이 있으면 null(높이를 강제하지 않음). 내용이 들어가면 내용 높이, 넘치면 남는 높이입니다. */
export function scrollBodyHeightOf(input: {
  readonly max: number | null;
  readonly fixed: number | null;
  readonly content: number | null;
}): number | null {
  const { max, fixed, content } = input;
  if (max === null || fixed === null || content === null) return null;
  const room = Math.max(MIN_SCROLL_PX, Math.floor(max - fixed));
  return Math.min(Math.ceil(content), room);
}
