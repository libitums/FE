import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { AccountDeletionResult } from "../../lib/account.contract";
import { SettingsScreen } from "./SettingsScreen";

function renderSettings() {
  const onSignOut = vi.fn<() => void>();
  const onDeleteAccount = vi.fn<() => Promise<AccountDeletionResult>>(
    () => new Promise<AccountDeletionResult>(() => undefined),
  );
  render(
    <SettingsScreen
      onSelectNavTarget={() => undefined}
      onSignOut={onSignOut}
      onDeleteAccount={onDeleteAccount}
      onLayerChange={() => undefined}
    />,
  );
  return { onSignOut, onDeleteAccount };
}

function settingsCell(id: string): HTMLElement {
  return within(screen.getByTestId(`ui-lynx-settings-group-item-${id}`)).getByTestId(
    "ui-lynx-settings-cell",
  );
}

function dialogAction(id: string): HTMLElement {
  return within(screen.getByTestId(`ui-lynx-dialog-action-${id}`)).getByTestId("ui-lynx-button");
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

// `ui` 계층: 시스템 뒤로가기(`backHandlers.runTop()`)가 보이는 닫기를 누른 것과 같은 결과를
// 내는지 봅니다. 스택은 실물이고, 케이스 사이에 정리 뒤 비어 있어야 합니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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

test("[UL4] 로그아웃 확인 열림 → 뒤로가기는 확인창만 닫는다(onSignOut 0회)", () => {
  const { onSignOut } = renderSettings();
  fireEvent.tap(settingsCell("sign-out"), {});
  expect(screen.getByTestId("settings-screen-sign-out-dialog")).toBeInTheDocument();

  expect(pressBack()).toBe(true);

  expect(screen.queryByTestId("settings-screen-sign-out-dialog")).not.toBeInTheDocument();
  expect(onSignOut).not.toHaveBeenCalled();
});

test("[UL5] 삭제 확인 열림 → 뒤로가기는 확인창만 닫는다(onDeleteAccount 0회)", () => {
  const { onDeleteAccount } = renderSettings();
  fireEvent.tap(settingsCell("delete-account"), {});
  expect(screen.getByTestId("settings-screen-delete-dialog")).toBeInTheDocument();

  expect(pressBack()).toBe(true);

  expect(screen.queryByTestId("settings-screen-delete-dialog")).not.toBeInTheDocument();
  expect(onDeleteAccount).not.toHaveBeenCalled();
});

test("[UN5] 삭제 진행 중 → runTop()은 true(등록은 됐다)지만 대화상자는 그대로", async () => {
  const { onDeleteAccount } = renderSettings();
  fireEvent.tap(settingsCell("delete-account"), {});
  fireEvent.tap(dialogAction("delete"), {});
  await flush();
  expect(onDeleteAccount).toHaveBeenCalledTimes(1);

  expect(pressBack()).toBe(true);
  await flush();

  expect(screen.getByTestId("settings-screen-delete-dialog")).toBeInTheDocument();
  expect(onDeleteAccount).toHaveBeenCalledTimes(1);
});

test("[UN6] 설정 탭 루트(층 없음) → 등록이 없어 runTop()은 false", () => {
  renderSettings();

  expect(pressBack()).toBe(false);
});
