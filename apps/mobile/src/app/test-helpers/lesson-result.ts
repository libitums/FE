// 통합 테스트 지원: 레슨 결과 화면에서 맵으로 나갑니다. 제품 코드가 import하지 않습니다.
//
// 맵으로 가는 길은 둘 중 하나입니다 — 다음 학습이 없으면 「Back to map」 버튼(안쪽 `ui-lynx-button`이 탭을 받음),
// 다음 학습이 있으면 지도 버튼(시안 D, 그 자신이 탭을 받음). 둘 다 `lesson-complete-screen-exit`입니다.

import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

export function tapResultExit(): void {
  const exit = screen.getByTestId("lesson-complete-screen-exit");
  const inner = within(exit).queryByTestId("ui-lynx-button");
  fireEvent.tap(inner ?? exit, {});
}
