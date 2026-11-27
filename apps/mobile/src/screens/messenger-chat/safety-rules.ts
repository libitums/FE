// 법 · 안전 UI의 순수 규칙입니다(ADR-0125) — 생년 목록 · 시각 · 열 수 있는 외부 주소. DOM · 네트워크를 만지지 않습니다.

/** 생년 시트의 연도입니다. 올해부터 100년 전까지, 새 연도가 먼저입니다. */
export function birthYearOptions(now: number): readonly number[] {
  const thisYear = new Date(now).getFullYear();
  return Array.from({ length: 101 }, (_, index) => thisYear - index);
}

/** 생년 칸(높이 240 · 줄 48)에 보이는 줄 가운데 위로 몇 줄이 있는지입니다 — 가운데 줄 위로 둘. */
const ROWS_ABOVE_CENTER = 2;
const VISIBLE_ROWS = ROWS_ABOVE_CENTER * 2 + 1;

/**
 * 생년 시트를 열 때 스크롤 칸 맨 위에 올 줄의 인덱스입니다(ADR-0125 개정 2026-11-27).
 * 고른 연도가 있으면 그 줄이, 없으면 목록 가운데 줄이 칸 가운데 옵니다. 자리만 정할 뿐 값을 고르지 않습니다 —
 * 맨 위(올해)에서 열었더니 대충 누른 탭이 0세로 저장됐습니다(운영 2026년생 55명).
 */
export function birthYearScrollIndex(years: readonly number[], selected: number | null): number {
  const found = selected === null ? -1 : years.indexOf(selected);
  const center = found >= 0 ? found : Math.floor((years.length - 1) / 2);
  const last = Math.max(0, years.length - VISIBLE_ROWS);
  return Math.min(Math.max(0, center - ROWS_ABOVE_CENTER), last);
}

/** 기기 시각의 시 · 분입니다. 문구가 언어별로 12 · 24시간을 정합니다(PrimJS에 `Intl`이 없습니다). */
export function clockOf(at: number): { readonly hour: number; readonly minute: number } {
  const date = new Date(at);
  return { hour: date.getHours(), minute: date.getMinutes() };
}

const telPattern = /^tel:\+?[0-9][0-9 -]*$/;
const httpsPattern = /^https:\/\/[^\s/?#]+([/?#]\S*)?$/;

/** 위기 카드가 열 수 있는 주소입니다 — 전화(`tel:` 번호) · `https` 웹 주소만. 호스트도 같은 규칙으로 한 번 더 거릅니다. */
export function isOpenableExternalUrl(url: string): boolean {
  return telPattern.test(url) || httpsPattern.test(url);
}
