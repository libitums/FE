import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { entryLoginMethods } from "../../lib/entry-flow";
import { loginMethodLabel } from "./login";
import { LoginScreen } from "./LoginScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 수단 넷의 조작 단위·전화번호 입력을 본다
// (ADR-0006 D4). 라벨 값은 `loginMethodLabel`의 결과로 비교한다(§8 — 수단 라벨은
// 임시가 아니다) — 로직을 다시 적지 않는다.
//
// 계약: .agent-harness/work/lib-261/spec.md §2.5-1(라벨) · §2.6(TextField 소비) ·
//       §4.2~§4.5(구조·testid) · §4.4(조작 단위 접근성).
// 계획: .agent-harness/work/lib-261/test-plan.md ui § `LoginScreen.ui.test.tsx` LG-U1~LG-U5.
//
// 입력 이벤트는 CompactNumericInput.ui.test.tsx 선례와 같은 형태로 쏜다 — lynx의
// `<input>`은 jsdom의 알려진 엘리먼트라 `fireEvent`에 직접 넘길 수 없고
// `lynx.createSelectorQuery().select(...)`로 얻은 NodesRef를 거쳐야 한다.

function dispatchTextFieldInput(anchor: HTMLElement, value: string) {
  const EventConstructor = anchor.ownerDocument.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value } }),
  );
}

describe("LoginScreen (LIB-261)", () => {
  // LG-U1
  it("[LG-U1] 수단 넷이 어휘 순서로 서고 각각 조작 단위다", () => {
    const { container } = render(<LoginScreen onSelectMethod={vi.fn()} />);

    for (const method of entryLoginMethods) {
      const row = screen.getByTestId(`login-screen-method-${method}`);
      expect(row).toHaveAttribute("accessibility-element", "true");
      expect(row).toHaveAttribute("accessibility-traits", "button");
      expect(row).toHaveAttribute("accessibility-label", loginMethodLabel(method));
    }

    const rendered = Array.from(
      container.querySelectorAll('[data-testid^="login-screen-method-"]'),
    ).map((el) => el.getAttribute("data-testid"));
    expect(rendered).toEqual(entryLoginMethods.map((method) => `login-screen-method-${method}`));
  });

  // LG-U2
  it.each(entryLoginMethods)(
    "[LG-U2] %s를 누르면 그 수단으로 onSelectMethod가 1회 불린다",
    (method) => {
      const onSelectMethod = vi.fn();
      render(<LoginScreen onSelectMethod={onSelectMethod} />);

      fireEvent.tap(screen.getByTestId(`login-screen-method-${method}`), {});

      expect(onSelectMethod).toHaveBeenCalledTimes(1);
      expect(onSelectMethod).toHaveBeenCalledWith(method);
    },
  );

  // LG-U3 — n-3(보정 r0.3): 스크롤 상자에 accessibility-*가 0건임을 얹는다(SP1과 같은 형태).
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

  // LG-U4
  it("[LG-U4] 제목이 accessibility-traits='header'다", () => {
    render(<LoginScreen onSelectMethod={vi.fn()} />);

    expect(screen.getByTestId("login-screen-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
  });

  // LG-U5 — 부재 단언(액션 행이 없다)이다. 먼저 수단 넷의 존재를 앵커로 걸고, 그 위에서
  // 조작 단위 목록을 §4.4의 조작 단위 정의(accessibility-element="true" + traits="button")로
  // 재서 수단 넷과 정확히 같은지 본다(개수뿐 아니라 순서·정체까지 한 단언으로 — spec §0.9 (6)
  // 정본). 전화번호 TextField의 <input>은 접근성 요소이지만 traits="button"이 아니라 이
  // 목록에서 빠진다 — 그 자리에 있음을 둘째 단언으로 남겨 미래의 opt-out 회귀를 잡는다.
  it("[LG-U5] 액션 행이 없다 — 조작 단위 목록이 수단 넷과 정확히 같다", () => {
    const { container } = render(<LoginScreen onSelectMethod={vi.fn()} />);

    for (const method of entryLoginMethods) {
      expect(screen.getByTestId(`login-screen-method-${method}`)).toBeInTheDocument();
    }

    const actionUnits = [
      ...container.querySelectorAll(
        '[accessibility-element="true"][accessibility-traits="button"]',
      ),
    ].map((el) => el.getAttribute("data-testid"));
    expect(actionUnits).toEqual(entryLoginMethods.map((method) => `login-screen-method-${method}`));

    const phoneInput = screen.getByTestId("ui-lynx-text-field-input");
    expect(phoneInput).toHaveAttribute("accessibility-element", "true");
    expect(actionUnits).not.toContain("ui-lynx-text-field-input");
  });
});
