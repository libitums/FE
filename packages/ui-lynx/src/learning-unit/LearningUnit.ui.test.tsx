import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test, vi } from "vitest";
import headset from "@libitums/icons/lynx/headset";

import { MotionProvider } from "../motion";
import { LearningUnit } from "./LearningUnit";

describe("LearningUnit", () => {
  test("Default는 하나의 비활성 접근성 node이며 탭을 전달하지 않는다", () => {
    const onTap = vi.fn<() => void>();
    render(<LearningUnit accessibilityLabel="쇼핑 표현 듣기" icon={headset} bindtap={onTap} />);
    const unit = screen.getByTestId("ui-lynx-learning-unit");
    expect(unit).toHaveAttribute("accessibility-label", "쇼핑 표현 듣기, locked");
    expect(unit).toHaveAttribute("accessibility-traits", "disabled");
    expect(unit).toHaveAttribute("focusable", "false");
    expect(unit).not.toHaveAttribute("accessibility-value");
    fireEvent.tap(unit as unknown as Element, {});
    expect(onTap).not.toHaveBeenCalled();
  });

  test("Active는 학습 아이콘을 표시하고 현재 항목 상태와 탭을 전달한다", () => {
    const onTap = vi.fn<() => void>();
    render(
      <LearningUnit
        accessibilityLabel="발음 연습"
        icon={headset}
        status="active"
        focused
        bindtap={onTap}
      />,
    );
    const unit = screen.getByTestId("ui-lynx-learning-unit");
    expect(unit).toHaveAttribute("accessibility-traits", "button");
    // 상태는 이름 뒤 접미사로 실립니다 — `accessibility-value`는 iOS에서 낭독되지
    // 않아 ADR-0016 D3이 걷은 속성입니다.
    expect(unit).toHaveAttribute("accessibility-label", "발음 연습, current");
    expect(unit).not.toHaveAttribute("accessibility-value");
    expect(unit).toHaveAttribute("focusable", "true");
    expect(unit).toHaveAttribute("data-focused", "true");
    expect(unit.className).toContain("ui-lynx-learning-unit-focused");
    fireEvent.tap(unit as unknown as Element, {});
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  test("Narrative 배지는 별도 control 없이 이름에만 이야기 연결을 추가한다 · LU-E1 가림 속성 부재", () => {
    const { container } = render(
      <LearningUnit
        accessibilityLabel="문화 이야기"
        icon={headset}
        status="clear"
        narrative="narrative"
      />,
    );
    expect(screen.getByTestId("ui-lynx-learning-unit")).toHaveAttribute(
      "accessibility-label",
      // `clear`라 상태 접미사가 먼저 붙고 이야기 연결이 뒤따릅니다.
      "문화 이야기, completed, story",
    );
    expect(screen.getByTestId("ui-lynx-learning-unit-badge")).not.toHaveAttribute(
      "accessibility-elements-hidden",
    );
    expect(screen.getByTestId("ui-lynx-learning-unit-ring")).not.toHaveAttribute(
      "accessibility-elements-hidden",
    );
    expect(container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);
    expect(screen.getByTestId("ui-lynx-learning-unit-ring").getAttribute("content")).toContain(
      "<path",
    );
  });

  test("LU-E1. narrative · reduced · default 어느 트리에도 accessibility-elements-hidden이 없다", () => {
    const narrative = render(
      <LearningUnit
        accessibilityLabel="이야기"
        icon={headset}
        status="clear"
        narrative="narrative"
      />,
    );
    expect(narrative.container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);
    narrative.unmount();

    const reduced = render(
      <MotionProvider motion="reduced">
        <LearningUnit accessibilityLabel="듣기" icon={headset} status="active" />
      </MotionProvider>,
    );
    expect(reduced.container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);
    reduced.unmount();

    const plain = render(<LearningUnit accessibilityLabel="듣기" icon={headset} status="active" />);
    expect(plain.container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);
  });

  test("일반 Learning Unit의 바깥 링은 끊김 없는 원이다", () => {
    render(<LearningUnit accessibilityLabel="듣기" icon={headset} status="active" />);

    expect(screen.getByTestId("ui-lynx-learning-unit-ring").getAttribute("content")).toContain(
      "<circle",
    );
  });

  test("Narrative 아이콘은 별도 배경 면과 테두리 없이 표시한다", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "src/learning-unit/learning-unit.css"),
      "utf8",
    );
    const badgeRule = styles.match(/\.ui-lynx-learning-unit-badge\s*\{([^}]*)\}/s)?.[1];

    expect(badgeRule).toBeDefined();
    expect(badgeRule).not.toMatch(/background/);
    expect(badgeRule).not.toMatch(/border/);
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
  "focusable",
] as const;

describe("LearningUnit motion 컨텍스트", () => {
  test("LU1: reduced Provider에서 data-motion과 reduced 클래스를 낸다(id가 있으면 id testid)", () => {
    render(
      <MotionProvider motion="reduced">
        <LearningUnit
          id="unit-1"
          accessibilityLabel="발음 연습"
          icon={headset}
          status="active"
          focused
        />
      </MotionProvider>,
    );
    const unit = screen.getByTestId("ui-lynx-learning-unit-unit-1");
    expect(unit).toHaveAttribute("data-motion", "reduced");
    expect(unit).toHaveClass("ui-lynx-learning-unit-motion-reduced");
  });

  test.each(["default", "available", "active", "clear"] as const)(
    "LU1(R2). reduced Provider에서도 accessibility-* 속성이 Provider 없이와 같다(%s)",
    (status) => {
      const plain = render(
        <LearningUnit accessibilityLabel="발음" icon={headset} status={status} />,
      );
      const expected = accessibilityAttributes.map((name) =>
        screen.getByTestId("ui-lynx-learning-unit").getAttribute(name),
      );
      plain.unmount();
      render(
        <MotionProvider motion="reduced">
          <LearningUnit accessibilityLabel="발음" icon={headset} status={status} />
        </MotionProvider>,
      );
      const unit = screen.getByTestId("ui-lynx-learning-unit");
      expect(accessibilityAttributes.map((name) => unit.getAttribute(name))).toEqual(expected);
    },
  );

  test.each(["available", "active", "clear"] as const)(
    "LU3. reduced %s는 surface 첫 자식으로 막을 내고 그 뒤에 icon이 온다",
    (status) => {
      render(
        <MotionProvider motion="reduced">
          <LearningUnit id="unit-1" accessibilityLabel="발음" icon={headset} status={status} />
        </MotionProvider>,
      );
      const shade = screen.getByTestId("ui-lynx-learning-unit-unit-1-shade");
      const icon = screen.getByTestId("ui-lynx-learning-unit-unit-1-icon");
      expect(shade).toHaveClass("ui-lynx-learning-unit-shade");
      const surface = shade.closest(".ui-lynx-learning-unit-surface") as Element;
      expect(surface).not.toBeNull();
      const children = logicalChildren(surface);
      expect(children[0]).toBe(shade);
      expect(children[1]).toBe(icon);
    },
  );

  test.each([
    ["reduced default", "reduced", "default"],
    ["Provider 없음 active", "none", "active"],
    ["standard active", "standard", "active"],
  ] as const)("LU4. %s에는 막이 없다", (_name, provider, status) => {
    const unit = (
      <LearningUnit id="unit-1" accessibilityLabel="발음" icon={headset} status={status} />
    );
    render(provider === "none" ? unit : <MotionProvider motion={provider}>{unit}</MotionProvider>);
    expect(screen.queryByTestId("ui-lynx-learning-unit-unit-1-shade")).not.toBeInTheDocument();
  });

  test.each([
    ["Provider 없음", false],
    ["standard Provider", true],
  ] as const)("LU2: %s이면 data-motion과 motion 클래스가 없다", (_name, wrapped) => {
    const unit = <LearningUnit accessibilityLabel="발음 연습" icon={headset} status="active" />;
    render(wrapped ? <MotionProvider motion="standard">{unit}</MotionProvider> : unit);
    const element = screen.getByTestId("ui-lynx-learning-unit");
    expect(element).not.toHaveAttribute("data-motion");
    expect(element.hasAttribute("data-motion")).toBe(false);
    expect(element.getAttribute("class") ?? "").not.toContain("motion");
  });
});
