// 테스트 지원 — 듣기 조작 부품(다시 듣기 · 재생)의 바깥 상자는 testid만 갖고, 이름 · 탭 · 크기는 안쪽
// `RoundButton`이 집니다. 바깥 testid로 그 안쪽 버튼을 찾습니다. 제품 코드는 값 import하지 않습니다.
import { screen } from "@lynx-js/react/testing-library";

const roundButtonTestId = "ui-lynx-round-button";

/** 바깥 상자(`outerTestId`) 안의 `RoundButton`입니다. 없으면 던집니다. */
export function listenButtonIn(outerTestId: string): HTMLElement {
  const outer = screen.getByTestId(outerTestId);
  const button = outer.querySelector<HTMLElement>(`[data-testid="${roundButtonTestId}"]`);
  if (button === null) throw new Error(`${outerTestId} 안에 RoundButton이 없음`);
  return button;
}

/** 바깥 상자 안에 `RoundButton`이 있는지 봅니다(없어도 던지지 않습니다). */
export function hasListenButtonIn(outerTestId: string): boolean {
  const outer = screen.queryByTestId(outerTestId);
  return outer?.querySelector(`[data-testid="${roundButtonTestId}"]`) != null;
}

/** 무대 안 조작 단위 목록에서 RoundButton이 보이는 testid입니다. */
export const roundButtonId = roundButtonTestId;
