import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AccountDeletionResult } from "../../lib/account.contract";
import { initialSessionOptions } from "../../lib/session-options";
import { SettingsScreen } from "./SettingsScreen";

// `ui` 계층(MS-UI13): 설정의 「My stories」 줄(ADR-0179) — 결선이 있을 때만 Chats 다음에 서고, 누르면 보관함을 연다.

afterEach(cleanup);

function mount(onOpenMyStories: (() => void) | null) {
  render(
    <SettingsScreen
      onSelectNavTarget={() => undefined}
      onOpenChatSettings={() => undefined}
      onOpenMyStories={onOpenMyStories}
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
    />,
  );
}

test("MS-UI13. 결선이 있으면 「My stories」 줄 → 누르면 onOpenMyStories, null이면 줄이 없다", () => {
  const onOpen = vi.fn<() => void>();
  mount(onOpen);
  const row = screen.getByTestId("ui-lynx-settings-group-item-my-stories");
  expect(row).toHaveTextContent("My stories");
  expect(row).toHaveTextContent("Words and cards you shared");
  fireEvent.tap(within(row).getByTestId("ui-lynx-settings-cell"), {});
  expect(onOpen).toHaveBeenCalledTimes(1);
  cleanup();
  mount(null);
  expect(screen.queryByTestId("ui-lynx-settings-group-item-my-stories")).toBeNull();
});
