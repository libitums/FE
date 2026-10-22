// 테스트 지원 — 문장 순서 줄 배치의 Check 버튼은 셸 `actionButton`으로 서는 ui-lynx Button이고 감싼 상자가
// `sentence-order-check`입니다. Next · See results는 셸 기본 버튼(`learning-shell-action`)입니다.
// 제품 코드는 값 import하지 않습니다.
import { expect } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

export type CheckState = "absent" | "disabled" | "enabled";

/** Check 버튼(ui-lynx Button)입니다. 감싼 상자만 있고 안쪽 버튼이 없으면 상자를 돌려줍니다. */
export function checkButton(): HTMLElement {
  const wrapper = screen.getByTestId("sentence-order-check");
  return wrapper.getAttribute("data-testid") === "ui-lynx-button"
    ? wrapper
    : (within(wrapper).queryByTestId("ui-lynx-button") ?? wrapper);
}

/** Check가 서 있는가, 서 있다면 켜졌는가(traits)입니다. */
export function checkState(): CheckState {
  if (screen.queryByTestId("sentence-order-check") === null) return "absent";
  return checkButton().getAttribute("accessibility-traits") === "disabled" ? "disabled" : "enabled";
}

/** Check를 켜진 채로 탭합니다(꺼져 있으면 단언이 실패합니다). */
export function tapCheck(): void {
  const button = checkButton();
  expect(button).toHaveAttribute("accessibility-label", "Check");
  expect(button).not.toHaveAttribute("accessibility-traits", "disabled");
  fireEvent.tap(button, {});
}

/** 아래 버튼의 이름입니다 — Check가 서 있으면 `Check`, 아니면 셸 기본 버튼의 이름, 없으면 `null`입니다. */
export function actionLabel(): string | null {
  if (screen.queryByTestId("sentence-order-check") !== null) return "Check";
  return screen.queryByTestId("learning-shell-action")?.getAttribute("accessibility-label") ?? null;
}

/** 라벨이 `Check`면 Check 버튼을, 그 밖이면 셸 기본 버튼을 탭합니다. */
export function tapAction(label: string): void {
  if (label === "Check") {
    tapCheck();
    return;
  }
  const action = screen.getByTestId("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", label);
  fireEvent.tap(action, {});
}

/** 대화 배치의 아래 버튼입니다 — Check가 서 있으면 그것을, 아니면 셸 기본 버튼(Next · See results)을 탭합니다. */
export function tapBottom(): void {
  if (screen.queryByTestId("sentence-order-check") !== null) {
    fireEvent.tap(checkButton(), {});
    return;
  }
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
}
