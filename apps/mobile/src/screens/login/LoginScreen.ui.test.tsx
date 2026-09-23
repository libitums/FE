import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { entryLoginMethods } from "../../lib/entry-flow";
import { loginMethodLabel } from "./login";
import { loginCountries } from "./login-countries";
import { LoginScreen } from "./LoginScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 수단 넷의 조작 단위·전화번호 입력을 봅니다
// (ADR-0006 D4). 라벨 값은 `loginMethodLabel`의 결과로 비교합니다 — 수단 라벨은
// 임시가 아닙니다 — 로직을 다시 적지 않습니다.
//
// 입력 이벤트는 CompactNumericInput.ui.test.tsx 선례와 같은 형태로 쏩니다 — lynx의
// `<input>`은 jsdom의 알려진 엘리먼트라 `fireEvent`에 직접 넘길 수 없고
// `lynx.createSelectorQuery().select(...)`로 얻은 NodesRef를 거쳐야 합니다.

function dispatchTextFieldInput(anchor: HTMLElement, value: string) {
  const EventConstructor = anchor.ownerDocument.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value } }),
  );
}

// 수단 행 안의 ui-lynx Button(2026-09-21 디자인 반영).
function methodButton(method: string): HTMLElement {
  return within(screen.getByTestId(`login-screen-method-${method}`)).getByTestId("ui-lynx-button");
}

// 조작 단위(accessibility-element="true" + traits="button")를 화면 쪽 testid로
// 부릅니다. ui-lynx 컴포넌트 안의 단위는 그것을 감싼 `login-screen-*` 자리의
// 이름으로 읽습니다.
function actionUnitIds(container: Element): (string | null)[] {
  return [
    ...container.querySelectorAll('[accessibility-element="true"][accessibility-traits="button"]'),
  ].map((el) => el.closest('[data-testid^="login-screen-"]')?.getAttribute("data-testid") ?? null);
}

describe("LoginScreen", () => {
  it("[LG-U1] 수단 넷이 어휘 순서로 서고 각각 조작 단위다", () => {
    const { container } = render(<LoginScreen onSelectMethod={vi.fn()} />);

    for (const method of entryLoginMethods) {
      const button = methodButton(method);
      expect(button).toHaveAttribute("accessibility-element", "true");
      expect(button).toHaveAttribute("accessibility-traits", "button");
      expect(button).toHaveAttribute("accessibility-label", loginMethodLabel(method));
    }

    const rendered = Array.from(
      container.querySelectorAll('[data-testid^="login-screen-method-"]'),
    ).map((el) => el.getAttribute("data-testid"));
    expect(rendered).toEqual(entryLoginMethods.map((method) => `login-screen-method-${method}`));
  });

  it.each(entryLoginMethods)(
    "[LG-U2] %s를 누르면 그 수단으로 onSelectMethod가 1회 불린다",
    (method) => {
      const onSelectMethod = vi.fn();
      render(<LoginScreen onSelectMethod={onSelectMethod} />);

      fireEvent.tap(methodButton(method), {});

      expect(onSelectMethod).toHaveBeenCalledTimes(1);
      // 번호를 넣지 않았으므로 phone도 번호를 싣지 않습니다.
      expect(onSelectMethod.mock.calls[0]?.[0]).toBe(method);
      expect(onSelectMethod.mock.calls[0]?.[1]).toBeUndefined();
    },
  );

  // LG-U2b — 2026-09-21 디자인 반영: Continue는 국가 번호를 붙인 입력값을 함께
  // 올립니다.
  it("[LG-U2b] 번호를 넣고 Continue를 누르면 국가 번호를 붙인 번호가 함께 올라간다", () => {
    const onSelectMethod = vi.fn();
    render(<LoginScreen onSelectMethod={onSelectMethod} />);

    const EventConstructor = document.defaultView?.CustomEvent;
    if (!EventConstructor) throw new Error("CustomEvent is unavailable");
    const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
    fireEvent(
      ref as unknown as Element,
      new EventConstructor("bindEvent:input", { detail: { value: " 10 1234 5678 " } }),
    );
    fireEvent.tap(methodButton("phone"), {});

    expect(onSelectMethod).toHaveBeenCalledWith("phone", "+82 10 1234 5678");
  });

  // LG-U3 — 스크롤 상자에 accessibility-*가 0건임을 얹습니다(SP1과 같은 형태입니다).
  it("[LG-U3] 전화번호 입력 칸이 서고, 입력만 해서는 onSelectMethod가 0회다", () => {
    const onSelectMethod = vi.fn();
    render(<LoginScreen onSelectMethod={onSelectMethod} />);

    const field = screen.getByTestId("login-screen-phone-field");
    const input = within(field).getByTestId("ui-lynx-text-field-input");

    dispatchTextFieldInput(input, "01012345678");

    expect(onSelectMethod).not.toHaveBeenCalled();

    const scroll = screen.getByTestId("login-screen-scroll");
    const accessibilityAttrs = Array.from(scroll.attributes).filter((attr) =>
      attr.name.startsWith("accessibility-"),
    );
    expect(accessibilityAttrs).toHaveLength(0);
  });

  it("[LG-U4] 제목이 accessibility-traits='header'다", () => {
    render(<LoginScreen onSelectMethod={vi.fn()} />);

    expect(screen.getByTestId("login-screen-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
  });

  // LG-U5 — 전화번호 TextField의 <input>은 접근성 요소이지만 traits="button"이
  // 아니라 이 목록에서 빠집니다.
  it("[LG-U5] 조작 단위 목록이 국가 칩과 수단 넷과 정확히 같다", () => {
    const { container } = render(<LoginScreen onSelectMethod={vi.fn()} />);

    expect(actionUnitIds(container)).toEqual([
      "login-screen-country",
      ...entryLoginMethods.map((method) => `login-screen-method-${method}`),
    ]);

    const phoneInput = screen.getByTestId("ui-lynx-text-field-input");
    expect(phoneInput).toHaveAttribute("accessibility-element", "true");
  });

  // LG-U6 — 2026-09-21 디자인 반영: 좌상단 뒤로가기입니다.
  it("[LG-U6] onBack이 있으면 뒤로가기가 맨 앞 조작 단위로 서고 누르면 1회 불린다", () => {
    const onBack = vi.fn();
    const { container } = render(<LoginScreen onSelectMethod={vi.fn()} onBack={onBack} />);

    const back = within(screen.getByTestId("login-screen-header")).getByTestId(
      "ui-lynx-round-button",
    );
    expect(back).toHaveAttribute("accessibility-label", "Back");
    expect(actionUnitIds(container)[0]).toBe("login-screen-header");

    fireEvent.tap(back, {});
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // LG-U7 — 2026-09-21 디자인 반영: 국가 선택 바텀시트입니다(국가 번호가 있는 모든
  // 지역입니다).
  it("[LG-U7] 국가 칩을 누르면 전체 국가 목록 시트가 열려 뒤쪽이 가려지고, 고르면 코드가 바뀌며 닫힌다", () => {
    render(<LoginScreen onSelectMethod={vi.fn()} />);

    const chip = screen.getByTestId("login-screen-country");
    expect(chip).toHaveAttribute("accessibility-label", "Country code, South Korea +82");
    expect(screen.queryByTestId("ui-lynx-bottom-sheet")).toBeNull();

    fireEvent.tap(chip, {});
    const list = screen.getByTestId("login-screen-country-list");
    const body = chip.closest(".login-screen-body");
    expect(body).toHaveAttribute("accessibility-elements-hidden", "true");

    // 모든 지역이 ui-lynx OptionSelector 선택지 하나씩으로 섭니다(국기·이름·국가
    // 번호 한 라벨입니다).
    const selector = within(list).getByTestId("ui-lynx-option-selector");
    expect(selector).toHaveAttribute("data-selection", "single");
    expect(selector).toHaveAttribute("data-commit", "immediate");
    const options = list.querySelectorAll('[data-testid^="ui-lynx-option-selector-item-"]');
    expect(options.length).toBe(loginCountries.length);
    const korea = screen.getByTestId("ui-lynx-option-selector-item-kr");
    expect(korea).toHaveAttribute("data-selected", "true");
    expect(korea).toHaveAttribute("accessibility-label", "South Korea +82, 선택됨");

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-jp"), {});

    expect(screen.queryByTestId("ui-lynx-bottom-sheet")).toBeNull();
    expect(screen.getByTestId("login-screen-country")).toHaveAttribute(
      "accessibility-label",
      "Country code, Japan +81",
    );
    expect(body).toHaveAttribute("accessibility-elements-hidden", "false");
  });

  // LG-U8 — 국가 목록이 국가 번호가 있는 지역을 빠짐없이 담습니다.
  it("[LG-U8] 국가 목록에 id가 겹치지 않고 모든 항목에 국기·이름·+국가 번호가 있다", () => {
    expect(loginCountries.length).toBe(245);
    expect(new Set(loginCountries.map((option) => option.id)).size).toBe(loginCountries.length);
    for (const option of loginCountries) {
      expect(option.name.trim()).not.toBe("");
      expect(option.flag).not.toBe("");
      expect(option.dialCode).toMatch(/^\+\d{1,4}$/);
    }
    for (const id of ["kr", "us", "jp", "vn", "xk"]) {
      expect(loginCountries.some((option) => option.id === id)).toBe(true);
    }
  });
});
