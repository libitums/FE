import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { SettingsScreen } from "./SettingsScreen";
import type { AccountDeletionResult } from "../../lib/account.contract";

// `ui` 계층: 설정 목록의 「레슨에 쓰는 이름 · 나라」 줄입니다(프로필 줄 바로 다음). 줄의 제목은 사용자
// 결정이 고정한 영어 문구라 값을 적고, 설명은 부모가 내리는 요약 문자열을 그대로 그리는지만 봅니다.
// 요약이 어떻게 만들어지는지는 unit(`learnerProfileSummary`)이 지킵니다.

const rowTitle = "Name and country in lessons";

function renderSettings(summary: string, onSelect: (target: string) => void = () => undefined) {
  const props = {
    onSelectNavTarget: onSelect,
    learnerProfileSummary: summary,
    onSignOut: () => undefined,
    onDeleteAccount: () => new Promise<AccountDeletionResult>(() => undefined),
    onLayerChange: () => undefined,
  };
  return render(<SettingsScreen {...props} />);
}

function learnerCell(): HTMLElement {
  return within(screen.getByTestId("ui-lynx-settings-group-item-learner-profile")).getByTestId(
    "ui-lynx-settings-cell",
  );
}

afterEach(() => {
  cleanup();
});

test("[US-1] 줄이 프로필 줄 바로 다음에 서고 제목 · 설명 · 접근성 이름이 `제목, 설명`이다", () => {
  renderSettings("Emma · Germany");

  const ids = Array.from(
    screen
      .getByTestId("settings-screen-list")
      .querySelectorAll('[data-testid^="ui-lynx-settings-group-item-"]'),
  ).map((el) => el.getAttribute("data-testid"));
  const profileAt = ids.indexOf("ui-lynx-settings-group-item-profile");
  expect(profileAt).toBeGreaterThanOrEqual(0);
  expect(ids[profileAt + 1]).toBe("ui-lynx-settings-group-item-learner-profile");

  const cell = learnerCell();
  expect(cell).toHaveTextContent(rowTitle);
  expect(cell).toHaveTextContent("Emma · Germany");
  expect(cell).toHaveAttribute("accessibility-label", `${rowTitle}, Emma · Germany`);
});

test("[US-1b] 요약이 바뀌면 설명이 따라 바뀐다(기기에만 저장됨 문장 포함)", () => {
  const view = renderSettings("Not set");
  expect(learnerCell()).toHaveTextContent("Not set");

  const pending = "Emma · Germany. Saved on this device. We'll sync it when you're back online.";
  view.rerender(
    <SettingsScreen
      onSelectNavTarget={() => undefined}
      learnerProfileSummary={pending}
      onSignOut={() => undefined}
      onDeleteAccount={() => new Promise<AccountDeletionResult>(() => undefined)}
      onLayerChange={() => undefined}
    />,
  );

  expect(learnerCell()).toHaveTextContent(pending);
  expect(learnerCell()).toHaveAttribute("accessibility-label", `${rowTitle}, ${pending}`);
});

test("[US-2] 줄을 누르면 onSelectNavTarget이 `learner-profile`로 1회 불린다", () => {
  const onSelect = vi.fn<(target: string) => void>();
  renderSettings("Not set", onSelect);

  fireEvent.tap(learnerCell(), {});

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith("learner-profile");
});
