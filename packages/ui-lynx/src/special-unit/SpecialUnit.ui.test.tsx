import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test, vi } from "vitest";
import fivePointedStar from "@libitums/icons/lynx/five-pointed-star";
import lock from "@libitums/icons/lynx/lock";
import star from "@libitums/icons/lynx/star";
import tick from "@libitums/icons/lynx/tick";

import { MotionProvider } from "../motion";
import { SpecialUnit } from "./SpecialUnit";
import { getSpecialUnitContract } from "./special-unit.contract";
import type { SpecialUnitStatus } from "./special-unit.contract";

// `ui` 계층: 실제 SpecialUnit을 렌더해 DOM 구조 · 접근성 요소 · 탭 · 막 · focused를 봅니다.
// 색 픽셀은 jsdom에서 단언하지 않습니다 — 아이콘 색은 계약의 `iconColor`, 면 색은 CSS 문자열
// 테스트가 봅니다.

const root = "ui-lynx-special-unit-x";
const statuses: readonly SpecialUnitStatus[] = [
  "default",
  "checking",
  "available",
  "active",
  "clear",
];
const interactiveStatuses = ["available", "active", "clear"] as const;

/** 테스트 렌더러가 조건부 자식에 두르는 <wrapper>를 풀어 논리적 자식 목록을 돌려줍니다. */
const logicalChildren = (element: Element): Element[] =>
  Array.from(element.children).flatMap((child) =>
    child.tagName.toLowerCase() === "wrapper" ? logicalChildren(child) : [child],
  );

const idsOf = (element: Element): (string | null)[] =>
  logicalChildren(element).map((child) => child.getAttribute("data-testid"));

/** 칠한 색을 `currentColor`로 되돌려 원본 글리프를 꺼냅니다. */
function glyphOf(node: Element): string {
  const content = node.getAttribute("content") ?? "";
  const painted = node.getAttribute("current-color") ?? "";
  return painted === "" ? content : content.split(painted).join("currentColor");
}

const accessibilityAttributes = [
  "accessibility-element",
  "accessibility-label",
  "accessibility-traits",
  "accessibility-role-description",
  "accessibility-enable-tap",
  "accessibility-value",
  "focusable",
] as const;

function unit(status: SpecialUnitStatus, bindtap?: () => void) {
  return (
    <SpecialUnit
      id="x"
      accessibilityLabel="special, Episode intro"
      status={status}
      {...(bindtap === undefined ? {} : { bindtap })}
    />
  );
}

describe("SpecialUnit", () => {
  test("SUU1. default는 잠긴 비활성 접근성 요소이고 탭을 전달하지 않는다", () => {
    const onTap = vi.fn<() => void>();
    render(unit("default", onTap));

    const element = screen.getByTestId(root);
    expect(element).toHaveAttribute("accessibility-label", "special, Episode intro, locked");
    expect(element).toHaveAttribute("accessibility-traits", "disabled");
    expect(element).toHaveAttribute("focusable", "false");
    expect(element).not.toHaveAttribute("accessibility-value");
    expect(element).toHaveAttribute("data-status", "default");
    fireEvent.tap(element, {});
    expect(onTap).not.toHaveBeenCalled();
  });

  test("SUU2. checking은 loading 이름으로 비활성이고 Shade 요소는 있고 눌림 막은 reduced에서도 없다", () => {
    const onTap = vi.fn<() => void>();
    render(<MotionProvider motion="reduced">{unit("checking", onTap)}</MotionProvider>);

    const element = screen.getByTestId(root);
    expect(element).toHaveAttribute("accessibility-label", "special, Episode intro, loading");
    expect(element).toHaveAttribute("accessibility-traits", "disabled");
    expect(element).toHaveAttribute("focusable", "false");
    expect(element).not.toHaveAttribute("accessibility-value");
    expect(screen.getByTestId(`${root}-shade`)).toBeInTheDocument();
    expect(screen.queryByTestId(`${root}-pressed-shade`)).not.toBeInTheDocument();
    fireEvent.tap(element, {});
    expect(onTap).not.toHaveBeenCalled();
  });

  test.each([
    ["available", "special, Episode intro"],
    ["active", "special, Episode intro, current"],
    ["clear", "special, Episode intro, completed"],
  ] as const)("SUU3. %s는 button 요소이고 탭을 한 번 전달한다", (status, label) => {
    const onTap = vi.fn<() => void>();
    render(unit(status, onTap));

    const element = screen.getByTestId(root);
    expect(element).toHaveAttribute("accessibility-label", label);
    expect(element).toHaveAttribute("accessibility-traits", "button");
    expect(element).toHaveAttribute("focusable", "true");
    expect(element).not.toHaveAttribute("accessibility-value");
    fireEvent.tap(element, {});
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  test("SUU4. 루트 → halo → body → [shade, face] → icon 순으로 선다", () => {
    render(unit("available"));

    const element = screen.getByTestId(root);
    expect(idsOf(element)).toEqual([`${root}-halo`]);
    expect(idsOf(screen.getByTestId(`${root}-halo`))).toEqual([`${root}-body`]);
    expect(idsOf(screen.getByTestId(`${root}-body`))).toEqual([`${root}-shade`, `${root}-face`]);
    expect(idsOf(screen.getByTestId(`${root}-face`))).toEqual([`${root}-icon`]);
    expect(screen.getByTestId(`${root}-halo`)).toHaveClass("ui-lynx-special-unit-halo");
    expect(screen.getByTestId(`${root}-body`)).toHaveClass("ui-lynx-special-unit-body");
    expect(screen.getByTestId(`${root}-shade`)).toHaveClass("ui-lynx-special-unit-shade");
    expect(screen.getByTestId(`${root}-face`)).toHaveClass("ui-lynx-special-unit-face");
    expect(screen.getByTestId(`${root}-icon`)).toHaveClass("ui-lynx-special-unit-icon");
  });

  test.each(statuses)(
    "SUU5. %s의 아이콘은 오각 별이고 별(star) · 자물쇠 · 체크가 아니다",
    (status) => {
      render(unit(status));

      const icon = screen.getByTestId(`${root}-icon`);
      expect(glyphOf(icon)).toBe(fivePointedStar);
      expect(glyphOf(icon)).not.toBe(star);
      expect(glyphOf(icon)).not.toBe(lock);
      expect(glyphOf(icon)).not.toBe(tick);
      const { iconColor } = getSpecialUnitContract({ accessibilityLabel: "x", status });
      expect(icon).toHaveAttribute("current-color", iconColor);
    },
  );

  test.each(statuses)("SUU6. %s는 가림 속성이 없고 접근성 요소는 루트 하나뿐이다", (status) => {
    const { container } = render(unit(status));

    expect(container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);
    const elements = Array.from(container.querySelectorAll('[accessibility-element="true"]'));
    expect(elements).toHaveLength(1);
    expect(elements[0]).toBe(screen.getByTestId(root));
  });

  test.each(interactiveStatuses)("SUU7. reduced %s는 face의 첫 자식이 눌림 막이다", (status) => {
    render(<MotionProvider motion="reduced">{unit(status)}</MotionProvider>);

    const element = screen.getByTestId(root);
    expect(element).toHaveAttribute("data-motion", "reduced");
    expect(element).toHaveClass("ui-lynx-special-unit-motion-reduced");
    const face = screen.getByTestId(`${root}-face`);
    expect(idsOf(face)).toEqual([`${root}-pressed-shade`, `${root}-icon`]);
    expect(screen.getByTestId(`${root}-pressed-shade`)).toHaveClass(
      "ui-lynx-special-unit-pressed-shade",
    );
  });

  test.each(["default", "checking"] as const)("SUU7. reduced %s에는 눌림 막이 없다", (status) => {
    render(<MotionProvider motion="reduced">{unit(status)}</MotionProvider>);

    expect(screen.getByTestId(root)).toHaveAttribute("data-motion", "reduced");
    expect(screen.queryByTestId(`${root}-pressed-shade`)).not.toBeInTheDocument();
    expect(idsOf(screen.getByTestId(`${root}-face`))).toEqual([`${root}-icon`]);
  });

  test.each([
    ["Provider 없음", false],
    ["standard Provider", true],
  ] as const)("SUU8. %s이면 data-motion · motion 클래스 · 막이 없다", (_name, wrapped) => {
    const element = unit("active");
    render(wrapped ? <MotionProvider motion="standard">{element}</MotionProvider> : element);

    const node = screen.getByTestId(root);
    expect(node).toHaveClass("ui-lynx-special-unit-active");
    expect(node.hasAttribute("data-motion")).toBe(false);
    expect(node.getAttribute("class") ?? "").not.toContain("motion");
    expect(screen.queryByTestId(`${root}-pressed-shade`)).not.toBeInTheDocument();
  });

  test("SUU9. focused는 열린 상태에서만 data-focused와 클래스를 낸다", () => {
    const view = render(
      <SpecialUnit id="x" accessibilityLabel="Intro" status="available" focused />,
    );
    expect(screen.getByTestId(root)).toHaveAttribute("data-focused", "true");
    expect(screen.getByTestId(root)).toHaveClass("ui-lynx-special-unit-focused");
    view.unmount();

    render(<SpecialUnit id="x" accessibilityLabel="Intro" status="default" focused />);
    expect(screen.getByTestId(root)).toHaveAttribute("data-focused", "false");
    expect(screen.getByTestId(root).getAttribute("class") ?? "").not.toContain("-focused");
  });

  test("SUU10. checking에서 available로 바뀌어도 같은 노드이고 탭이 전달된다", () => {
    const onTap = vi.fn<() => void>();
    const { rerender } = render(unit("checking", onTap));
    const before = screen.getByTestId(root);

    rerender(unit("available", onTap));

    const after = screen.getByTestId(root);
    expect(after).toBe(before);
    expect(after).toHaveAttribute("data-status", "available");
    fireEvent.tap(after, {});
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  test.each(statuses)(
    "SUU11. reduced Provider에서도 %s의 접근성 속성이 Provider 없이와 같다",
    (status) => {
      const plain = render(unit(status));
      const expected = accessibilityAttributes.map((name) =>
        screen.getByTestId(root).getAttribute(name),
      );
      plain.unmount();

      render(<MotionProvider motion="reduced">{unit(status)}</MotionProvider>);
      const node = screen.getByTestId(root);
      expect(accessibilityAttributes.map((name) => node.getAttribute(name))).toEqual(expected);
      expect(expected[1]).not.toBeNull();
    },
  );
});
