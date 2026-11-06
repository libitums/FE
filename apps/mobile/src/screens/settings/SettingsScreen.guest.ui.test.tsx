import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AccountDeletionResult } from "../../lib/account.contract";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { settingsNavTargetsFor } from "./settings";
import { SettingsScreen } from "./SettingsScreen";
import { initialSessionOptions } from "../../lib/session-options";
import type { SettingsScreenProps } from "./settings.contract";

// `ui` 계층: 비회원 설정 화면(spec §3-2, test-plan ST3~ST5). 행 구성은 `account` prop이 고릅니다.
// 기대 행은 순수 함수 `settingsNavTargetsFor`의 결과로 비교합니다.

function renderSettings(account: SettingsScreenProps["account"]) {
  const onSignIn = vi.fn();
  const onSignOut = vi.fn();
  const onLayerChange = vi.fn();
  const view = render(
    <SettingsScreen
      onSelectNavTarget={() => undefined}
      learnerProfileSummary="Not set"
      languageSummary="Intermediate English"
      appVersion={null}
      sessionOptions={initialSessionOptions}
      onToggleSessionOption={() => undefined}
      account={account}
      onSignIn={onSignIn}
      onSignOut={onSignOut}
      onDeleteAccount={() => new Promise<AccountDeletionResult>(() => undefined)}
      onLayerChange={onLayerChange}
    />,
  );
  return { ...view, onSignIn, onSignOut, onLayerChange };
}

function itemTestIds(): (string | null)[] {
  const list = screen.getByTestId("settings-screen-list");
  return Array.from(list.querySelectorAll('[data-testid^="ui-lynx-settings-group-item-"]')).map(
    (el) => el.getAttribute("data-testid"),
  );
}

function cell(id: string): HTMLElement {
  return within(screen.getByTestId(`ui-lynx-settings-group-item-${id}`)).getByTestId(
    "ui-lynx-settings-cell",
  );
}

test("[ST3] guest면 계정 묶음 여섯과 로그인 행 하나만 서고 라벨이 copy.settings.action[sign-in]이다", () => {
  renderSettings("guest");

  expect(settingsNavTargetsFor("guest")).toHaveLength(6);
  expect(itemTestIds()).toEqual([
    // 학습 묶음(보기 로마자 토글 — ADR-0108)은 비회원에게도 선다(기기 설정).
    "ui-lynx-settings-group-item-show-choice-romanization",
    ...settingsNavTargetsFor("guest").map((target) => `ui-lynx-settings-group-item-${target}`),
    "ui-lynx-settings-group-item-sign-in",
  ]);
  expect(screen.queryByTestId("ui-lynx-settings-group-item-notifications")).toBeNull();
  expect(screen.queryByTestId("ui-lynx-settings-group-item-feedback")).toBeNull();
  expect(screen.queryByTestId("ui-lynx-settings-group-item-sign-out")).toBeNull();
  expect(screen.queryByTestId("ui-lynx-settings-group-item-delete-account")).toBeNull();
  expect(cell("sign-in")).toHaveAttribute(
    "accessibility-label",
    expect.stringContaining(uiCopyEn.settings.action["sign-in"]),
  );
});

test("[ST4] 로그인 행을 누르면 onSignIn이 1회 불리고 대화상자는 열리지 않으며 onLayerChange는 불리지 않는다", () => {
  const { onSignIn, onLayerChange, onSignOut } = renderSettings("guest");

  fireEvent.tap(cell("sign-in"), {});

  expect(onSignIn).toHaveBeenCalledTimes(1);
  expect(onSignOut).not.toHaveBeenCalled();
  expect(screen.queryByTestId("settings-screen-sign-out-dialog")).toBeNull();
  expect(screen.queryByTestId("settings-screen-delete-dialog")).toBeNull();
  expect(onLayerChange).not.toHaveBeenCalled();
});

test("[ST5] signed-in에서는 onSignIn이 불리지 않고 로그인 행이 없다(회귀)", () => {
  const { onSignIn } = renderSettings("signed-in");

  expect(screen.queryByTestId("ui-lynx-settings-group-item-sign-in")).toBeNull();
  expect(screen.getByTestId("ui-lynx-settings-group-item-sign-out")).toBeInTheDocument();
  fireEvent.tap(cell("sign-out"), {});
  fireEvent.tap(cell("delete-account"), {});
  expect(onSignIn).not.toHaveBeenCalled();
});
