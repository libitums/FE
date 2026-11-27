// 가입 직후 ① 이름 · ② 나라를 지나 ③ 언어 선택에 닿게 하는 통합 테스트 도우미입니다(ADR-0059 D7 2026-10-20).
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
