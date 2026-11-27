// 법 · 안전 UI의 순수 규칙입니다(ADR-0125) — 생년 목록 · 시각 · 열 수 있는 외부 주소. DOM · 네트워크를 만지지 않습니다.

// 생년 목록 규칙은 가입 직후 ④ 출생 연도 화면과 함께 씁니다(ADR-0059 개정 2026-11-27) — 자리는 `lib/birth-year-options.ts`.
export { birthYearOptions, birthYearScrollIndex } from "../../lib/birth-year-options";

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
