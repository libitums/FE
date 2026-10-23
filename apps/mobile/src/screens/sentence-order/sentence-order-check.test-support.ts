// 테스트 지원 — 문장 순서의 아래 버튼은 셸 `actionButton`으로 서는 같은 자리의 같은 ui-lynx Button입니다. 감싼 상자는
// Check일 때 `sentence-order-check`, Next · See results일 때 `sentence-order-action`입니다(요소는 그대로, 문구 ·
// 동작만 바뀝니다). 제품 코드는 값 import하지 않습니다.
import { expect } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

export type CheckState = "absent" | "disabled" | "enabled";

const wrapperIds = ["sentence-order-check", "sentence-order-action"] as const;

function bottomWrapper(): HTMLElement | null {
  for (const id of wrapperIds) {
    const found = screen.queryByTestId(id);
    if (found !== null) return found;
  }
  return null;
}

/** 아래 버튼(ui-lynx Button)입니다 — Check · Next · See results 어느 문구든 같은 요소입니다. 없으면 `null`입니다. */
export function bottomActionOrNull(): HTMLElement | null {
  const wrapper = bottomWrapper();
  if (wrapper === null) return null;
  return within(wrapper).queryByTestId("ui-lynx-button") ?? wrapper;
}

/** 아래 버튼(ui-lynx Button)입니다 — 없으면 단언이 실패합니다. */
export function bottomAction(): HTMLElement {
  const button = bottomActionOrNull();
  expect(button).not.toBeNull();
  return button as HTMLElement;
}

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

/** 아래 버튼의 이름입니다 — 없으면 `null`입니다. */
export function actionLabel(): string | null {
  return bottomActionOrNull()?.getAttribute("accessibility-label") ?? null;
}

/** 아래 버튼의 이름을 확인하고 탭합니다(Check는 켜진 채여야 합니다). */
export function tapAction(label: string): void {
  if (label === "Check") {
    tapCheck();
    return;
  }
  const action = bottomAction();
  expect(action).toHaveAttribute("accessibility-label", label);
  fireEvent.tap(action, {});
}

/** 아래 버튼을 탭합니다 — Check · Next · See results 어느 쪽이든 서 있는 그것입니다. */
export function tapBottom(): void {
  fireEvent.tap(bottomAction(), {});
}

/**
 * 탭 대상을 testid로 찾습니다. 문장 순서의 Next · See results는 셸 기본 버튼(`learning-shell-action`)이 아니라 같은 자리의
 * ui-lynx Button이라, 그 id를 주면 문장 순서 화면에서는 안쪽 버튼을 돌려줍니다.
 */
export function tapTargetById(id: string): HTMLElement {
  if (id === "learning-shell-action") {
    const wrapper = screen.queryByTestId("sentence-order-action");
    if (wrapper !== null) return within(wrapper).getByTestId("ui-lynx-button");
  }
  return screen.getByTestId(id);
}
