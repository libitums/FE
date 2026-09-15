import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import search from "@libitums/icons/lynx/search";
import { describe, expect, test, vi } from "vitest";

import { TextField } from "./index";

describe("TextField UI", () => {
  test("Label·Qualifier·Helper·Counter를 input의 접근성 이름에 연결한다", () => {
    render(
      <TextField
        label="이메일 주소"
        qualifier="필수"
        defaultValue="hello"
        supporting={{ kind: "helper", message: "로그인할 주소를 입력해 주세요." }}
        counter={{ maxLength: 30 }}
      />,
    );

    const input = screen.getByTestId("ui-lynx-text-field-input");
    expect(input).toHaveAttribute(
      "accessibility-label",
      "이메일 주소, 필수, 로그인할 주소를 입력해 주세요., 30자 중 5자 입력",
    );
    expect(input).toHaveAttribute("maxlength", "30");
    expect(screen.getByTestId("ui-lynx-text-field-supporting-row")).toHaveTextContent(
      "로그인할 주소를 입력해 주세요.5/30",
    );
  });

  test("입력 purpose와 availability를 native input 속성에 연결한다", () => {
    render(
      <TextField
        accessibilityLabel="검색"
        purpose="search"
        availability="read-only"
        defaultValue="말랑"
      />,
    );

    const input = screen.getByTestId("ui-lynx-text-field-input");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("confirm-type", "search");
    expect(input).toHaveAttribute("readonly", "true");
    expect(screen.getByTestId("ui-lynx-text-field")).toHaveAttribute("data-state", "read-only");
  });

  test("빈 slot은 렌더하지 않고 Prefix·Suffix는 value와 분리한다", () => {
    render(
      <TextField
        label="소요 시간"
        leading={{ kind: "prefix", text: "약" }}
        trailing={{ kind: "suffix", text: "분" }}
        defaultValue="15"
      />,
    );

    expect(screen.getByTestId("ui-lynx-text-field-leading")).toHaveTextContent("약");
    expect(screen.getByTestId("ui-lynx-text-field-trailing")).toHaveTextContent("분");
    expect(screen.getByTestId("ui-lynx-text-field-input")).toHaveAttribute("default-value", "15");
  });

  test("Trailing Action은 별도 button node이며 disabled에서는 tap을 차단한다", () => {
    const enabledTap = vi.fn<() => void>();
    const disabledTap = vi.fn<() => void>();
    const enabled = render(
      <TextField
        label="검색"
        trailing={{
          kind: "action",
          icon: search,
          accessibilityLabel: "검색어 지우기",
          bindtap: enabledTap,
        }}
      />,
    );
    const action = enabled.getByTestId("ui-lynx-text-field-trailing-action");
    fireEvent.tap(action as unknown as Element, {});
    expect(action).toHaveAttribute("accessibility-traits", "button");
    expect(action).toHaveAttribute("focusable", "true");
    expect(enabled.getByTestId("ui-lynx-text-field-trailing-action-icon-pressed")).toHaveAttribute(
      "current-color",
      "#1A1C20",
    );
    enabled.unmount();

    render(
      <TextField
        label="검색"
        availability="disabled"
        trailing={{
          kind: "action",
          icon: search,
          accessibilityLabel: "검색어 지우기",
          bindtap: disabledTap,
        }}
      />,
    );
    const disabledAction = screen.getByTestId("ui-lynx-text-field-trailing-action");
    fireEvent.tap(disabledAction as unknown as Element, {});
    expect(disabledAction).toHaveAttribute("accessibility-traits", "disabled");
    expect(disabledAction).toHaveAttribute("focusable", "false");
    expect(enabledTap).toHaveBeenCalledTimes(1);
    expect(disabledTap).not.toHaveBeenCalled();
  });

  test("Error는 해결 방법을 보이고 input 접근성 이름에도 오류를 포함한다", () => {
    render(
      <TextField
        label="이메일 주소"
        defaultValue="hello"
        supporting={{ kind: "error", message: "name@example.com 형식으로 입력해 주세요." }}
      />,
    );

    const root = screen.getByTestId("ui-lynx-text-field");
    expect(root).toHaveAttribute("data-validation", "error");
    expect(root).toHaveAttribute("data-state", "error");
    expect(screen.getByTestId("ui-lynx-text-field-input")).toHaveAttribute(
      "accessibility-label",
      "이메일 주소, 오류: name@example.com 형식으로 입력해 주세요.",
    );
  });
});
