import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import info02 from "@libitums/icons/lynx/info-02";
import { describe, expect, test, vi } from "vitest";

import type { ReactNode } from "@lynx-js/react";
import { MotionProvider } from "../motion";
import { Button } from "./index";

/** 테스트 렌더러가 조건부 자식에 두르는 <wrapper>를 풀어 논리적 자식 목록을 돌려줍니다. */
const logicalChildren = (element: Element): Element[] =>
  Array.from(element.children).flatMap((child) =>
    child.tagName.toLowerCase() === "wrapper" ? logicalChildren(child) : [child],
  );

describe("Button UI", () => {
  test("variant, size, width와 접근성 계약을 속성으로 노출한다", () => {
    render(<Button label="계속" size="xl" variant="brand" width="fill" />);

    const button = screen.getByTestId("ui-lynx-button");
    expect(button).toHaveAttribute("data-variant", "brand");
    expect(button).toHaveAttribute("data-size", "xl");
    expect(button).toHaveAttribute("data-width", "fill");
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "계속");
    expect(button).toHaveAttribute("accessibility-traits", "button");
    expect(button).toHaveAttribute("accessibility-enable-tap", "true");
    expect(button).toHaveAttribute("flatten", "false");
  });

  test("tap을 소비자 callback으로 전달한다", () => {
    const onTap = vi.fn<() => void>();
    render(<Button bindtap={onTap} label="계속" />);

    fireEvent.tap(screen.getByTestId("ui-lynx-button"), {});
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  test("disabled는 callback을 막고 disabled trait을 노출한다", () => {
    const onTap = vi.fn<() => void>();
    render(<Button bindtap={onTap} disabled={true} label="계속" />);

    const button = screen.getByTestId("ui-lynx-button");
    fireEvent.tap(button, {});
    expect(onTap).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("data-disabled", "true");
    expect(button).toHaveAttribute("accessibility-traits", "disabled");
    expect(button).toHaveAttribute("accessibility-enable-tap", "false");
  });

  test("UI-B5 · BU1. loading은 라벨을 숨긴 채 DOM에 두고 spinner만 보인다(폭 유지) · BU-E1 가림 속성 부재", () => {
    const { container } = render(<Button label="저장" loading={true} />);

    const button = screen.getByTestId("ui-lynx-button");
    expect(button).toHaveAttribute("data-loading", "true");
    expect(button).toHaveAttribute("accessibility-label", "저장, loading");
    const label = screen.getByTestId("ui-lynx-button-label");
    expect(label).toHaveTextContent("저장");
    expect(label).toHaveStyle({ opacity: 0 });
    expect(label).not.toHaveStyle({ visibility: "hidden" });
    const spinner = screen.getByTestId("ui-lynx-button-spinner");
    expect(spinner).toBeInTheDocument();
    const wrap = spinner.parentElement as Element;
    expect(wrap).toHaveClass("ui-lynx-button-spinner-wrap");
    expect(wrap).not.toHaveAttribute("accessibility-elements-hidden");
    expect(container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);
    const surface = wrap.closest(".ui-lynx-button-surface") as Element;
    expect(logicalChildren(surface)[0]).toBe(wrap);
  });

  test.each([
    ["leading", ["spinner-wrap", "icon", "label"]],
    ["trailing", ["spinner-wrap", "label", "icon"]],
  ] as const)(
    "UI-B6 · BU2. loading + %s 아이콘은 아이콘도 숨긴 채 렌더하고 자식 순서를 지킨다",
    (position, order) => {
      render(<Button label="저장" loading={true} icon={info02} iconPosition={position} />);

      const icon = screen.getByTestId("ui-lynx-button-icon");
      expect(icon).toHaveStyle({ opacity: 0 });
      expect(screen.getByTestId("ui-lynx-button-label")).toHaveStyle({ opacity: 0 });
      const surface = screen
        .getByTestId("ui-lynx-button-spinner")
        .closest(".ui-lynx-button-surface") as Element;
      const names = logicalChildren(surface).map((child) =>
        child.classList.contains("ui-lynx-button-spinner-wrap")
          ? "spinner-wrap"
          : child.classList.contains("ui-lynx-button-icon")
            ? "icon"
            : "label",
      );
      expect(names).toEqual([...order]);
    },
  );

  test.each([
    ["leading", ["icon", "label"]],
    ["trailing", ["label", "icon"]],
  ] as const)(
    "BU3. loading이 아니면 label · icon에 style 속성이 없고 spinner가 없다(%s)",
    (position, order) => {
      render(<Button label="저장" icon={info02} iconPosition={position} />);

      const label = screen.getByTestId("ui-lynx-button-label");
      const icon = screen.getByTestId("ui-lynx-button-icon");
      expect(label).not.toHaveAttribute("style");
      expect(icon).not.toHaveAttribute("style");
      expect(screen.queryByTestId("ui-lynx-button-spinner")).not.toBeInTheDocument();
      const surface = label.parentElement as Element;
      const names = logicalChildren(surface).map((child) =>
        child.classList.contains("ui-lynx-button-icon") ? "icon" : "label",
      );
      expect(names).toEqual([...order]);
    },
  );

  test("UI-B7 · BU4. disabled + loading도 라벨을 숨기고 disabled trait과 loading 이름을 함께 낸다", () => {
    render(<Button label="저장" disabled={true} loading={true} />);

    const button = screen.getByTestId("ui-lynx-button");
    expect(button).toHaveAttribute("accessibility-traits", "disabled");
    expect(button).toHaveAttribute("accessibility-label", "저장, loading");
    expect(button).toHaveAttribute("accessibility-enable-tap", "false");
    expect(screen.getByTestId("ui-lynx-button-label")).toHaveStyle({ opacity: 0 });
    expect(screen.getByTestId("ui-lynx-button-spinner")).toBeInTheDocument();
  });
});

const accessibilityAttributes = [
  "accessibility-element",
  "accessibility-label",
  "accessibility-traits",
  "accessibility-role-description",
  "accessibility-enable-tap",
  "accessibility-value",
  "accessibility-elements-hidden",
] as const;

const reducedOf = (node: ReactNode) => <MotionProvider motion="reduced">{node}</MotionProvider>;

describe("Button motion 컨텍스트", () => {
  test("UI-B1. reduced Provider에서 data-motion과 reduced 클래스를 낸다", () => {
    render(reducedOf(<Button label="계속" />));
    const button = screen.getByTestId("ui-lynx-button");
    expect(button).toHaveAttribute("data-motion", "reduced");
    expect(button).toHaveClass("ui-lynx-button-motion-reduced");
  });

  test.each([
    ["Provider 없음", false],
    ["standard Provider", true],
  ] as const)("UI-B2. %s이면 data-motion · motion 클래스 · 막이 없다", (_name, wrapped) => {
    const { container } = render(
      wrapped ? (
        <MotionProvider motion="standard">
          <Button label="계속" variant="brand" />
        </MotionProvider>
      ) : (
        <Button label="계속" variant="brand" />
      ),
    );
    const button = screen.getByTestId("ui-lynx-button");
    expect(button.hasAttribute("data-motion")).toBe(false);
    expect(button.getAttribute("class") ?? "").not.toContain("motion");
    expect(screen.queryByTestId("ui-lynx-button-shade")).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-motion]")).toHaveLength(0);
  });

  const shadeCases = [
    ["라벨만", {}, 2],
    ["icon leading", { icon: info02 }, 3],
    ["loading", { loading: true }, 3],
  ] as const;

  describe.each(["neutral", "brand"] as const)("UI-B3. reduced %s", (variant) => {
    test.each(shadeCases)(
      "%s는 surface 첫 자식으로 접근성 속성 없는 막을 낸다",
      (_n, extra, count) => {
        render(reducedOf(<Button label="계속" variant={variant} {...extra} />));
        const surface = screen.getByTestId("ui-lynx-button-label").parentElement as Element;
        const shade = screen.getByTestId("ui-lynx-button-shade");
        expect(shade).toHaveClass("ui-lynx-button-shade");
        for (const name of accessibilityAttributes) {
          expect(shade).not.toHaveAttribute(name);
        }
        const children = logicalChildren(surface);
        expect(children[0]).toBe(shade);
        expect(children).toHaveLength(count);
        // 막은 한 번만, 맨 앞에만 — 뒤로 밀린 막도 자식 수는 같아 개수만으로는 못 잡는다.
        expect(children.filter((child) => child === shade)).toHaveLength(1);
      },
    );
  });

  test("UI-B3. reduced 기본 variant(neutral)도 막을 낸다", () => {
    render(reducedOf(<Button label="계속" />));
    expect(screen.getByTestId("ui-lynx-button-shade")).toBeInTheDocument();
  });

  test.each(["outline", "subtle", "text"] as const)(
    "UI-B4. reduced %s는 막이 없고 surface 자식 수가 standard와 같다",
    (variant) => {
      const plain = render(<Button label="계속" variant={variant} icon={info02} />);
      const expected = logicalChildren(
        screen.getByTestId("ui-lynx-button-label").parentElement as Element,
      ).length;
      plain.unmount();
      render(reducedOf(<Button label="계속" variant={variant} icon={info02} />));
      expect(screen.queryByTestId("ui-lynx-button-shade")).not.toBeInTheDocument();
      expect(
        logicalChildren(screen.getByTestId("ui-lynx-button-label").parentElement as Element),
      ).toHaveLength(expected);
    },
  );

  test.each([
    ["기본", {}],
    ["disabled", { disabled: true }],
    ["loading", { loading: true }],
  ] as const)(
    "UI-B8. reduced Provider에서도 accessibility-* 속성이 Provider 없이와 같다(%s)",
    (_n, extra) => {
      const plain = render(<Button label="계속" variant="brand" {...extra} />);
      const expected = accessibilityAttributes.map((name) =>
        screen.getByTestId("ui-lynx-button").getAttribute(name),
      );
      plain.unmount();
      const reduced = render(reducedOf(<Button label="계속" variant="brand" {...extra} />));
      const button = screen.getByTestId("ui-lynx-button");
      expect(accessibilityAttributes.map((name) => button.getAttribute(name))).toEqual(expected);
      expect(reduced.container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);
    },
  );
});
