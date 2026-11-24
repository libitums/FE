import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { afterEach, describe, expect, test, vi } from "vitest";

import { VisualNovelDialog } from "./index";

// `ui` 계층: FE 확장 `headerSwitch`(2026-11-24, 앱 ADR-0188 개정 D7) — 이름 줄 오른쪽(화자가 없으면 같은 자리 오른쪽 위)의
// 「글자 + 스위치」입니다. 대사 상자는 접근성 요소 하나로 대사를 읽고, 스위치는 그와 따로 닿는 요소여야 합니다
// (iOS에서 접근성 요소 안의 자손은 닿지 않습니다 — 스위치가 대사 요소 밖에 서야 합니다).

afterEach(() => cleanup());

const switchOf = () => screen.getByTestId("ui-lynx-visual-novel-dialog-switch");

/** 요소에서 루트까지 올라가며, 자신을 뺀 조상 중 접근성 요소 · 가림이 있는지 봅니다. */
function blockedByAncestor(element: Element): boolean {
  for (let node = element.parentElement; node !== null; node = node.parentElement) {
    if (node.getAttribute("accessibility-element") === "true") return true;
    if (node.getAttribute("accessibility-elements-hidden") === "true") return true;
  }
  return false;
}

/** 낭독에서 가려졌는가 — 자신이나 조상이 가렸거나, 조상이 접근성 요소입니다. */
function hiddenFromReader(element: Element): boolean {
  return (
    element.getAttribute("accessibility-elements-hidden") === "true" || blockedByAncestor(element)
  );
}

describe("VisualNovelDialog headerSwitch", () => {
  test("HS1. 화자 줄 오른쪽에 글자와 스위치가 서고, 스위치는 switch 역할 · 「글자, 상태」 이름 · 켬 표시를 진다", () => {
    render(
      <VisualNovelDialog
        line="어서 오세요."
        speakerName="점원"
        headerSwitch={{
          label: "Romanization",
          checked: true,
          stateLabel: "on",
          onChange: () => {},
        }}
      />,
    );
    const row = screen.getByTestId("ui-lynx-visual-novel-dialog-speaker-row");
    const control = switchOf();
    expect(row.contains(control)).toBe(true);
    expect(
      screen.getByTestId("ui-lynx-visual-novel-dialog-speaker").compareDocumentPosition(control) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(control).toHaveAttribute("accessibility-element", "true");
    expect(control).toHaveAttribute("accessibility-role-description", "switch");
    expect(control).toHaveAttribute("accessibility-traits", "button");
    expect(control).toHaveAttribute("accessibility-label", "Romanization, on");
    expect(control).toHaveAttribute("data-checked", "true");
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-switch-label")).toHaveTextContent(
      "Romanization",
    );
    expect(
      screen.getByTestId("ui-lynx-visual-novel-dialog-switch-track").getAttribute("class"),
    ).toContain("ui-lynx-visual-novel-dialog-switch-track-on");
  });

  test("HS2. 끔이면 회색 트랙 · data-checked false · 「글자, 상태」가 끔이다", () => {
    render(
      <VisualNovelDialog
        line="어서 오세요."
        speakerName="점원"
        headerSwitch={{
          label: "Romanization",
          checked: false,
          stateLabel: "off",
          onChange: () => {},
        }}
      />,
    );
    expect(switchOf()).toHaveAttribute("data-checked", "false");
    expect(switchOf()).toHaveAttribute("accessibility-label", "Romanization, off");
    expect(
      screen.getByTestId("ui-lynx-visual-novel-dialog-switch-track").getAttribute("class"),
    ).not.toContain("-on");
  });

  test("HS3. 누르면 onChange(!checked)를 한 번 부르고, 대사 상자 탭(bindtap)으로 번지지 않는다", () => {
    const onChange = vi.fn();
    const onDialogTap = vi.fn();
    render(
      <VisualNovelDialog
        line="어서 오세요."
        speakerName="점원"
        bindtap={onDialogTap}
        headerSwitch={{ label: "Romanization", checked: true, stateLabel: "on", onChange }}
      />,
    );
    fireEvent.tap(switchOf(), { eventType: "catchEvent" });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(false);
    expect(onDialogTap).not.toHaveBeenCalled();
  });

  test("HS4. 화자가 없는 내레이션도 같은 자리(맨 위 줄 오른쪽)에 스위치가 선다", () => {
    render(
      <VisualNovelDialog
        variant="narration"
        line="비가 내린다."
        headerSwitch={{
          label: "Romanization",
          checked: true,
          stateLabel: "on",
          onChange: () => {},
        }}
      />,
    );
    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-speaker")).toBeNull();
    const header = screen.getByTestId("ui-lynx-visual-novel-dialog-header-row");
    expect(header.contains(switchOf())).toBe(true);
  });

  test("HS5. 스위치가 있으면 대사 낭독은 따로 선 요소가 지고, 스위치는 어떤 접근성 요소 · 가림 안에도 들지 않는다", () => {
    render(
      <VisualNovelDialog
        line="어서 오세요."
        speakerName="점원"
        romanization="eoseo oseyo."
        translation="Welcome."
        accessibilityLabel="점원: 어서 오세요., Pronunciation: eoseo oseyo., Welcome."
        headerSwitch={{
          label: "Romanization",
          checked: true,
          stateLabel: "on",
          onChange: () => {},
        }}
      />,
    );
    const root = screen.getByTestId("ui-lynx-visual-novel-dialog");
    expect(root).toHaveAttribute("accessibility-element", "false");
    const reading = screen.getByTestId("ui-lynx-visual-novel-dialog-reading");
    expect(reading).toHaveAttribute("accessibility-element", "true");
    expect(reading).toHaveAttribute("accessibility-traits", "text");
    expect(reading).toHaveAttribute(
      "accessibility-label",
      "점원: 어서 오세요., Pronunciation: eoseo oseyo., Welcome.",
    );
    expect(blockedByAncestor(switchOf())).toBe(false);
    // 화면에 선 글은 낭독 요소가 대신 읽으므로 각각 가립니다(두 번 읽지 않게).
    for (const id of [
      "ui-lynx-visual-novel-dialog-speaker",
      "ui-lynx-visual-novel-dialog-line",
      "ui-lynx-visual-novel-dialog-romanization",
      "ui-lynx-visual-novel-dialog-translation",
    ]) {
      expect(hiddenFromReader(screen.getByTestId(id))).toBe(true);
    }
  });

  test("HS6. 스위치가 없으면 이 확장 전 모양 그대로다 — 루트가 낭독 요소이고 따로 선 요소 · 스위치가 없다", () => {
    render(<VisualNovelDialog line="안녕" speakerName="이유나" />);
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
      "accessibility-element",
      "true",
    );
    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-reading")).toBeNull();
    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-switch")).toBeNull();
  });
});
