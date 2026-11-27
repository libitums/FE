// 가입 직후 ① 이름 · ② 나라를 지나 ③ 언어 선택에 닿게 하는 통합 테스트 도우미입니다(ADR-0059 D7 2026-10-20).
// 회원은 언어 선택 다음에 ④ 출생 연도가 섭니다(ADR-0059 개정 2026-11-27) — `passLearnerBirthYear`.
// 이름은 미리 채운 값을 그대로 두고, 나라는 `countryCode` 줄을 고릅니다.

import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

const tapButtonIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});

/** ① 이름의 Continue — 미리 채운 이름 그대로 ② 나라로 갑니다. */
export function continueLearnerName(): void {
  tapButtonIn("learner-name-screen-next");
}

/** ② 나라에서 줄 하나를 고르고 Continue — ③ 언어 선택으로 갑니다. */
export function chooseLearnerCountry(countryCode = "KR"): void {
  fireEvent.tap(screen.getByTestId(`learner-country-screen-row-${countryCode}`), {});
  tapButtonIn("learner-country-screen-next");
}

/** ① · ② 를 한 번에 지납니다. */
export function passLearnerSignup(countryCode = "KR"): void {
  continueLearnerName();
  chooseLearnerCountry(countryCode);
}

/** ④ 출생 연도에서 연도 줄을 고르고 Continue — 여정 입구로 갑니다(회원만, ADR-0059 개정 2026-11-27). */
export function passLearnerBirthYear(year = 1990): void {
  fireEvent.tap(screen.getByTestId(`learner-birth-year-screen-row-${year}`), {});
  tapButtonIn("learner-birth-year-screen-next");
}

/** ③ 언어 선택 다음이 ④ 출생 연도(회원)면 지납니다. 비회원 · 설정의 언어 선택에서는 아무것도 하지 않습니다. */
export function passLearnerBirthYearIfShown(year = 1990): void {
  if (screen.queryByTestId("learner-birth-year-screen") !== null) passLearnerBirthYear(year);
}
