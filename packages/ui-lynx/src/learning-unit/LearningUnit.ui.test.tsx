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

  test("Narrative 배지는 별도 control 없이 이름에만 이야기 연결을 추가한다", () => {
    render(
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
    expect(screen.getByTestId("ui-lynx-learning-unit-badge")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
    expect(screen.getByTestId("ui-lynx-learning-unit-ring").getAttribute("content")).toContain(
      "<path",
    );
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

// 테스트 렌더러는 값이 undefined인 data-* 속성을 문자열 "null"로 남깁니다. 부재는 null 또는 "null"로 봅니다.
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

  test.each([
    ["Provider 없음", false],
    ["standard Provider", true],
  ] as const)("LU2: %s이면 data-motion과 motion 클래스가 없다", (_name, wrapped) => {
    const unit = <LearningUnit accessibilityLabel="발음 연습" icon={headset} status="active" />;
    render(wrapped ? <MotionProvider motion="standard">{unit}</MotionProvider> : unit);
    const element = screen.getByTestId("ui-lynx-learning-unit");
    expect([null, "null"]).toContain(element.getAttribute("data-motion"));
    expect(element.getAttribute("class") ?? "").not.toContain("motion");
  });
});
