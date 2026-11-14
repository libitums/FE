import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AccountDeletionResult } from "../../lib/account.contract";
import { initialSessionOptions } from "../../lib/session-options";
import { SettingsScreen } from "./SettingsScreen";

// `ui` 계층(SB-UI6): 설정의 「Plans」 줄(ADR-0144) — 결선이 있을 때만 서고, 누르면 요금제 화면을 연다.

afterEach(cleanup);

function mount(onOpenPlans: (() => void) | null | undefined) {
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
      {...(onOpenPlans === undefined ? {} : { onOpenPlans })}
    />,
  );
}

test("SB-UI6a 결선이 있으면 「Plans」 줄 → 누르면 onOpenPlans", () => {
  const onOpenPlans = vi.fn<() => void>();
  mount(onOpenPlans);
  const row = screen.getByTestId("ui-lynx-settings-group-item-plans");
  expect(row).toHaveTextContent("Plans");
  expect(row).toHaveTextContent("Unlimited Tickets · Chat Plus · Premium");
  fireEvent.tap(within(row).getByTestId("ui-lynx-settings-cell"), {});
  expect(onOpenPlans).toHaveBeenCalledTimes(1);
});

test("SB-UI6b 결선이 null · 없으면 줄이 없다(지금 그대로)", () => {
  mount(null);
  expect(screen.queryByTestId("ui-lynx-settings-group-item-plans")).toBeNull();
  cleanup();
  mount(undefined);
  expect(screen.queryByTestId("ui-lynx-settings-group-item-plans")).toBeNull();
});
