import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { SettingsScreen } from "./SettingsScreen";
import type { AccountDeletionResult } from "../../lib/account.contract";
import type { AppVersion } from "../../lib/app-version";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// `ui` 계층: 설정 목록 끝의 앱 버전 줄(ADR-0086). 값은 prop으로 받고(호스트 globalProps는 App이 읽음),
// 문구는 표에서 읽습니다.

const baseProps = {
  onSelectNavTarget: () => undefined,
  learnerProfileSummary: "Not set",
  onSignOut: () => undefined,
  onDeleteAccount: () => new Promise<AccountDeletionResult>(() => undefined),
  onLayerChange: () => undefined,
};
const version: AppVersion = { platform: "ios", name: "1.0", build: 11 };

test("[SU1] appVersion이 null이면 버전 줄이 없다", () => {
  render(<SettingsScreen {...baseProps} appVersion={null} />);

  expect(screen.queryByTestId("settings-screen-version")).toBeNull();
});

test("[SU2] appVersion이 있으면 목록 마지막 자식으로 표의 문구가 선다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <SettingsScreen {...baseProps} appVersion={version} />
    </UiCopyContext.Provider>,
  );

  const line = screen.getByTestId("settings-screen-version");
  expect(line).toHaveTextContent("⟦settings.version⟧(1.0, 11)");
  const list = screen.getByTestId("settings-screen-list");
  expect(list.lastElementChild).toBe(line);
});

test("[SU3] 버전 줄은 보이는 문구 그대로 읽히는 요소 하나다(조작 아님)", () => {
  render(<SettingsScreen {...baseProps} appVersion={version} />);

  const line = screen.getByTestId("settings-screen-version");
  expect(line).toHaveTextContent("Version 1.0 (11)");
  expect(line).toHaveAttribute("accessibility-element", "true");
  expect(line).toHaveAttribute("flatten", "false");
  expect(line).not.toHaveAttribute("accessibility-traits", "button");
  expect(line).not.toHaveAttribute("bindtap");
});
