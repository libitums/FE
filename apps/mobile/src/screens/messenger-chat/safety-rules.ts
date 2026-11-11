// 법 · 안전 UI의 순수 규칙입니다(ADR-0125) — 생년 목록 · 시각 · 열 수 있는 외부 주소. DOM · 네트워크를 만지지 않습니다.

/** 생년 시트의 연도입니다. 올해부터 100년 전까지, 새 연도가 먼저입니다. */
export function birthYearOptions(now: number): readonly number[] {
  const thisYear = new Date(now).getFullYear();
  return Array.from({ length: 101 }, (_, index) => thisYear - index);
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
