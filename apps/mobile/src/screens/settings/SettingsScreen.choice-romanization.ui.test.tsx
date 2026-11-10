import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { initialSessionOptions } from "../../lib/session-options";
import type { SessionOptions } from "../../lib/session-options";
import type { AccountDeletionResult } from "../../lib/account.contract";
import { SettingsScreen } from "./SettingsScreen";

// `ui` 계층: 설정의 「Romanization on choices」 토글 줄 — 맨 위 Learning 묶음에 서고, 탭하면 바뀐 뒤 값을 알립니다.

const itemId = "ui-lynx-settings-group-item-show-choice-romanization";
const vibrationItemId = "ui-lynx-settings-group-item-vibration";

function mount(
  sessionOptions: SessionOptions = initialSessionOptions,
  onToggleSessionOption: (key: string, value: boolean) => void = () => undefined,
) {
  const element = (options: SessionOptions) => (
    <SettingsScreen
      onSelectNavTarget={() => undefined}
      learnerProfileSummary="Not set"
      languageSummary="Intermediate English"
      appVersion={null}
      sessionOptions={options}
      onToggleSessionOption={onToggleSessionOption}
      account="signed-in"
      onSignIn={() => undefined}
      onSignOut={() => undefined}
      onDeleteAccount={() => new Promise<AccountDeletionResult>(() => undefined)}
      onLayerChange={() => undefined}
    />
  );
  const view = render(element(sessionOptions));
  return { rerender: (options: SessionOptions) => view.rerender(element(options)) };
}

const cell = (): HTMLElement =>
  within(screen.getByTestId(itemId)).getByTestId("ui-lynx-settings-cell");

test("SU16. 첫 묶음이 Learning이고 그 안에 로마자 · 진동 토글 줄이 이 순서로, 로마자 줄은 제목 · 설명 · 켬 상태로 선다", () => {
  mount();

  const groups = within(screen.getByTestId("settings-screen-list")).getAllByTestId(
    "ui-lynx-settings-group",
  );
  const first = groups[0];
  expect(first).toHaveAttribute("accessibility-label", "Learning");
  const items = Array.from(
    first?.querySelectorAll('[data-testid^="ui-lynx-settings-group-item-"]') ?? [],
  ).map((el) => el.getAttribute("data-testid"));
  expect(items).toEqual([itemId, vibrationItemId]);

  expect(screen.getByText("Romanization on choices")).toBeInTheDocument();
  expect(
    screen.getByText("Show how each Korean answer is read, in small text above it."),
  ).toBeInTheDocument();
  expect(cell()).toHaveAttribute("data-trailing", "toggle");
  expect(cell()).toHaveAttribute("data-checked", "true");
  expect(cell()).toHaveAttribute(
    "accessibility-label",
    "Romanization on choices, Show how each Korean answer is read, in small text above it., on",
  );
});

test("SU16. 옵션이 꺼져 있으면 줄은 꺼짐으로 서고 이름 끝이 off다", () => {
  mount({ ...initialSessionOptions, "show-choice-romanization": false });

  expect(cell()).toHaveAttribute("data-checked", "false");
  expect(cell().getAttribute("accessibility-label")).toMatch(/, off$/);
});

test("SU17. 켜진 줄을 탭하면 (키, false)를, 꺼진 줄로 다시 그려 탭하면 (키, true)를 한 번씩 알린다", () => {
  const onToggle = vi.fn<(key: string, value: boolean) => void>();
  const view = mount(initialSessionOptions, onToggle);

  fireEvent.tap(cell(), {});

  expect(onToggle).toHaveBeenCalledTimes(1);
  expect(onToggle).toHaveBeenLastCalledWith("show-choice-romanization", false);

  view.rerender({ ...initialSessionOptions, "show-choice-romanization": false });
  fireEvent.tap(cell(), {});

  expect(onToggle).toHaveBeenCalledTimes(2);
  expect(onToggle).toHaveBeenLastCalledWith("show-choice-romanization", true);
});

// ADR-0109 D4 — 앱 안 진동 끔.
const vibrationCell = (): HTMLElement =>
  within(screen.getByTestId(vibrationItemId)).getByTestId("ui-lynx-settings-cell");

test("VB3. 진동 줄은 제목 · 설명 · 켬 상태로 서고, 탭하면 (vibration, false)를 한 번 알린다", () => {
  const onToggle = vi.fn<(key: string, value: boolean) => void>();
  mount(initialSessionOptions, onToggle);

  expect(screen.getByText("Vibration")).toBeInTheDocument();
  expect(
    screen.getByText("Vibrate for right or wrong answers and keyboard taps."),
  ).toBeInTheDocument();
  expect(vibrationCell()).toHaveAttribute("data-trailing", "toggle");
  expect(vibrationCell()).toHaveAttribute("data-checked", "true");

  fireEvent.tap(vibrationCell(), {});

  expect(onToggle).toHaveBeenCalledExactlyOnceWith("vibration", false);
});

test("VB3. 진동이 꺼져 있으면 진동 줄만 꺼짐이고 로마자 줄은 그대로다", () => {
  mount({ ...initialSessionOptions, vibration: false });

  expect(vibrationCell()).toHaveAttribute("data-checked", "false");
  expect(cell()).toHaveAttribute("data-checked", "true");
});
