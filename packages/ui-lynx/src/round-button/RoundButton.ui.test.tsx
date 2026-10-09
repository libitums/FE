import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { color } from "@libitums/design-tokens";
import info02 from "@libitums/icons/lynx/info-02";
import { describe, expect, test, vi } from "vitest";

import { MotionProvider } from "../motion";
import { RoundButton } from "./index";

describe("RoundButton", () => {
  test("접근성 이름·trait와 안정적인 data 속성을 노출한다", () => {
    render(<RoundButton accessibilityLabel="정보" icon={info02} variant="brand" size="l" />);

    const button = screen.getByTestId("ui-lynx-round-button");
    expect(button).toHaveClass(
      "ui-lynx-round-button",
      "ui-lynx-round-button-brand",
      "ui-lynx-round-button-l",
    );
    expect(screen.getByTestId("ui-lynx-round-button-surface")).toBeInTheDocument();
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "정보");
    expect(button).toHaveAttribute("accessibility-traits", "button");
    expect(button).toHaveAttribute("accessibility-enable-tap", "true");
    expect(button).toHaveAttribute("data-variant", "brand");
    expect(button).toHaveAttribute("data-size", "l");
    expect(button).toHaveAttribute("data-disabled", "false");
    expect(button).toHaveAttribute("data-loading", "false");
  });

  test("icon content의 currentColor를 variant foreground로 해석해 Web에서도 색을 표시한다", () => {
    render(<RoundButton accessibilityLabel="정보" icon={info02} variant="brand" />);

    const icon = screen.getByTestId("ui-lynx-round-button-icon");
    expect(icon).toHaveAttribute("content", info02.replace(/currentColor/g, color.brand.primary));
    expect(icon.getAttribute("content")).not.toContain("currentColor");
    expect(icon).toHaveAttribute("current-color", color.brand.primary);
    expect(icon.parentElement).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  test("loading은 icon을 spinner로 대체하고 spinner를 장식 자손으로 숨긴다", () => {
    render(<RoundButton accessibilityLabel="정보" icon={info02} loading={true} />);

    const button = screen.getByTestId("ui-lynx-round-button");
    expect(button).toHaveAttribute("accessibility-label", "정보, loading");
    expect(button).toHaveAttribute("data-loading", "true");
    expect(button).toHaveAttribute("accessibility-enable-tap", "false");
    expect(button).toHaveClass("ui-lynx-round-button-loading");
    expect(screen.queryByTestId("ui-lynx-round-button-icon")).not.toBeInTheDocument();
    const spinner = screen.getByTestId("ui-lynx-round-button-spinner");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("ui-lynx-round-button-spinner");
    expect(spinner.parentElement).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  test("활성 tap은 정확히 한 번 전달하고 loading·disabled tap은 차단한다", () => {
    const activeTap = vi.fn<() => void>();
    const loadingTap = vi.fn<() => void>();
    const disabledTap = vi.fn<() => void>();

    const active = render(
      <RoundButton accessibilityLabel="활성" icon={info02} bindtap={activeTap} />,
    );
    fireEvent.tap(active.getByTestId("ui-lynx-round-button") as unknown as Element, {});
    active.unmount();

    const loading = render(
      <RoundButton accessibilityLabel="로딩" icon={info02} loading={true} bindtap={loadingTap} />,
    );
    fireEvent.tap(loading.getByTestId("ui-lynx-round-button") as unknown as Element, {});
    loading.unmount();

    const disabled = render(
      <RoundButton
        accessibilityLabel="비활성"
        icon={info02}
        disabled={true}
        bindtap={disabledTap}
      />,
    );
    fireEvent.tap(disabled.getByTestId("ui-lynx-round-button") as unknown as Element, {});
    expect(activeTap).toHaveBeenCalledTimes(1);
    expect(loadingTap).not.toHaveBeenCalled();
    expect(disabledTap).not.toHaveBeenCalled();
  });

  test("disabled+loading은 disabled semantics를 우선하고 spinner·결합 상태를 유지한다", () => {
    render(
      <RoundButton
        accessibilityLabel="업로드"
        icon={info02}
        variant="brand"
        disabled={true}
        loading={true}
      />,
    );

    const button = screen.getByTestId("ui-lynx-round-button");
    expect(button).toHaveAttribute("accessibility-traits", "disabled");
    expect(button).toHaveAttribute("accessibility-label", "업로드, loading");
    expect(button).toHaveAttribute("data-disabled", "true");
    expect(button).toHaveAttribute("data-loading", "true");
    expect(button).toHaveClass(
      "ui-lynx-round-button-brand",
      "ui-lynx-round-button-disabled",
      "ui-lynx-round-button-loading",
    );
    expect(screen.getByTestId("ui-lynx-round-button-spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("ui-lynx-round-button-icon")).not.toBeInTheDocument();
  });
});

/** 테스트 렌더러가 조건부 자식에 두르는 <wrapper>를 풀어 논리적 자식 목록을 돌려줍니다. */
const logicalChildren = (element: Element): Element[] =>
  Array.from(element.children).flatMap((child) =>
    child.tagName.toLowerCase() === "wrapper" ? logicalChildren(child) : [child],
  );

const accessibilityAttributes = [
  "accessibility-element",
  "accessibility-label",
  "accessibility-traits",
  "accessibility-role-description",
  "accessibility-enable-tap",
  "accessibility-value",
] as const;

describe("RoundButton motion 컨텍스트", () => {
  test("RB1: reduced Provider에서 data-motion과 reduced 클래스를 낸다", () => {
    render(
      <MotionProvider motion="reduced">
        <RoundButton accessibilityLabel="정보" icon={info02} />
      </MotionProvider>,
    );
    const button = screen.getByTestId("ui-lynx-round-button");
    expect(button).toHaveAttribute("data-motion", "reduced");
    expect(button).toHaveClass("ui-lynx-round-button-motion-reduced");
  });

  test.each([
    ["기본", {}],
    ["disabled", { disabled: true }],
    ["loading", { loading: true }],
  ] as const)(
    "R2. reduced Provider에서도 accessibility-* 속성이 Provider 없이와 같다(%s)",
    (_name, extra) => {
      const plain = render(<RoundButton accessibilityLabel="정보" icon={info02} {...extra} />);
      const expected = accessibilityAttributes.map((name) =>
        screen.getByTestId("ui-lynx-round-button").getAttribute(name),
      );
      plain.unmount();
      render(
        <MotionProvider motion="reduced">
          <RoundButton accessibilityLabel="정보" icon={info02} {...extra} />
        </MotionProvider>,
      );
      const button = screen.getByTestId("ui-lynx-round-button");
      expect(accessibilityAttributes.map((name) => button.getAttribute(name))).toEqual(expected);
    },
  );

  test.each(["neutral", "brand"] as const)(
    "RB3. reduced %s는 surface 첫 자식으로 숨겨진 막을 낸다",
    (variant) => {
      render(
        <MotionProvider motion="reduced">
          <RoundButton accessibilityLabel="정보" icon={info02} variant={variant} />
        </MotionProvider>,
      );
      const surface = screen.getByTestId("ui-lynx-round-button-surface");
      const shade = screen.getByTestId("ui-lynx-round-button-shade");
      expect(shade).toHaveClass("ui-lynx-round-button-shade");
      expect(shade).toHaveAttribute("accessibility-elements-hidden", "true");
      expect(logicalChildren(surface)[0]).toBe(shade);
      expect(logicalChildren(surface)).toHaveLength(2);
      expect(logicalChildren(surface)[1]).toBe(
        screen.getByTestId("ui-lynx-round-button-icon").parentElement,
      );
    },
  );

  test("RB3. reduced loading은 막 다음에 spinner wrapper가 온다", () => {
    render(
      <MotionProvider motion="reduced">
        <RoundButton accessibilityLabel="정보" icon={info02} loading={true} />
      </MotionProvider>,
    );
    const surface = screen.getByTestId("ui-lynx-round-button-surface");
    const children = logicalChildren(surface);
    expect(children[0]).toBe(screen.getByTestId("ui-lynx-round-button-shade"));
    expect(children[1]).toBe(screen.getByTestId("ui-lynx-round-button-spinner").parentElement);
    expect(children).toHaveLength(2);
  });

  test.each([
    [
      "reduced overlay",
      <MotionProvider motion="reduced" key="a">
        <RoundButton accessibilityLabel="정보" icon={info02} variant="overlay" />
      </MotionProvider>,
    ],
    ["Provider 없음", <RoundButton accessibilityLabel="정보" icon={info02} key="b" />],
    [
      "standard Provider",
      <MotionProvider motion="standard" key="c">
        <RoundButton accessibilityLabel="정보" icon={info02} />
      </MotionProvider>,
    ],
  ] as const)("RB4. %s에서는 막이 없고 surface 자식은 하나다", (_name, element) => {
    render(element);
    expect(screen.queryByTestId("ui-lynx-round-button-shade")).not.toBeInTheDocument();
    expect(logicalChildren(screen.getByTestId("ui-lynx-round-button-surface"))).toHaveLength(1);
  });

  test.each([
    ["Provider 없음", false],
    ["standard Provider", true],
  ] as const)("RB2: %s이면 data-motion과 motion 클래스가 없다", (_name, wrapped) => {
    render(
      wrapped ? (
        <MotionProvider motion="standard">
          <RoundButton accessibilityLabel="정보" icon={info02} />
        </MotionProvider>
      ) : (
        <RoundButton accessibilityLabel="정보" icon={info02} />
      ),
    );
    const button = screen.getByTestId("ui-lynx-round-button");
    expect(button).not.toHaveAttribute("data-motion");
    expect(button.hasAttribute("data-motion")).toBe(false);
    expect(button.getAttribute("class") ?? "").not.toContain("motion");
  });
});
