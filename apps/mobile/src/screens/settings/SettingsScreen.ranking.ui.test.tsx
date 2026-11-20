import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AccountDeletionResult } from "../../lib/account.contract";
import { initialSessionOptions } from "../../lib/session-options";
import { SettingsScreen } from "./SettingsScreen";
import type { SettingsScreenProps } from "./settings.contract";

// `ui` 계층(ADR-0170 ST-UI): 설정의 「Hide me from ranking」 토글 — 결선이 있을 때만(회원), 누르면 바뀐 값으로.

afterEach(cleanup);

function mount(rankingHidden: SettingsScreenProps["rankingHidden"]) {
  render(
    <SettingsScreen
      onSelectNavTarget={() => undefined}
      onOpenChatSettings={null}
      learnerProfileSummary="Not set"
      languageSummary="English"
      appVersion={null}
      sessionOptions={initialSessionOptions}
      onToggleSessionOption={() => undefined}
      account="signed-in"
      onSignIn={() => undefined}
      onSignOut={() => undefined}
      onDeleteAccount={() => new Promise<AccountDeletionResult>(() => undefined)}
      onLayerChange={() => undefined}
      rankingHidden={rankingHidden}
    />,
  );
}

test("ST-UI. 토글 줄은 결선이 있을 때만 서고, 누르면 onChange(바뀐 값)", () => {
  const onChange = vi.fn<(hidden: boolean) => void>();
  mount({ hidden: false, onChange });
  const row = screen.getByTestId("ui-lynx-settings-group-item-ranking-hidden");
  expect(row).toHaveTextContent("Hide me from ranking");
  expect(row).toHaveTextContent("Others won't see you in the weekly ranking");
  fireEvent.tap(within(row).getByTestId("ui-lynx-settings-cell"), {});
  expect(onChange).toHaveBeenCalledWith(true);
  cleanup();
  mount(null);
  expect(screen.queryByTestId("ui-lynx-settings-group-item-ranking-hidden")).toBeNull();
});
