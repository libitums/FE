import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";

import type { ProfileItem } from "./profile.contract";
import { ProfileScreen } from "./ProfileScreen";

// `ui` 계층: 시스템 뒤로가기(`backHandlers.runTop()`)가 보이는 닫기를 누른 것과 같은 결과를
// 내는지 봅니다. 스택은 실물이고, 케이스 사이에 정리 뒤 비어 있어야 합니다.

afterEach(() => {
  cleanup();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
}

const items: readonly ProfileItem[] = [{ id: "name", value: "Duru Learner" }];

test("[US7] 뒤로가기 → onExit 1회", () => {
  const onExit = vi.fn<() => void>();
  render(<ProfileScreen items={items} onExit={onExit} />);

  expect(pressBack()).toBe(true);

  expect(onExit).toHaveBeenCalledTimes(1);
});
