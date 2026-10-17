import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { JourneyMapNodeStatus } from "./journey-map-types";
import { SpecialUnitMapItem } from "./SpecialUnitMapItem";

// `ui` 계층: 맵 공유 스페셜 항목 하나를 고립 렌더합니다. 상태 표 · 톤 · 낭독 이름의 계산은 순수
// 함수 unit이 지므로(`journey-special-unit.unit.test.ts`) 여기서는 그 결과를 그리는지만 봅니다.

const unitTestId = "ui-lynx-special-unit-x";
const labelTestId = "journey-special-unit-label-x";

function mount(
  status: JourneyMapNodeStatus,
  overrides: {
    readonly layer?: "map" | "guide";
    readonly accessibilityName?: string;
    readonly title?: string;
    readonly withChild?: boolean;
  } = {},
) {
  const onSelect = vi.fn<() => void>();
  const view = render(
    <SpecialUnitMapItem
      unitId="x"
      title={overrides.title ?? "Our Imagined Café"}
      accessibilityName={overrides.accessibilityName ?? "Our Imagined Café"}
      status={status}
      onSelect={onSelect}
      {...(overrides.layer === undefined ? {} : { layer: overrides.layer })}
    >
      {overrides.withChild === true ? <view data-testid="extra-layer" /> : null}
    </SpecialUnitMapItem>,
  );
  return { onSelect, view };
}

describe("SpecialUnitMapItem", () => {
  test("SMI1. 두 줄 라벨(SPECIAL + 제목)이 유닛 뒤에 서고 셋 다 낭독 요소가 아니다", () => {
    mount("available", { title: "Our Imagined Café" });

    const eyebrow = screen.getByTestId("journey-special-unit-eyebrow-x");
    const title = screen.getByTestId("journey-special-unit-title-x");
    const label = screen.getByTestId(labelTestId);
    expect(eyebrow).toHaveTextContent("SPECIAL");
    expect(title).toHaveTextContent("Our Imagined Café");
    expect(eyebrow).toHaveAttribute("accessibility-element", "false");
    expect(title).toHaveAttribute("accessibility-element", "false");
    expect(label).toHaveAttribute("accessibility-element", "false");
    expect(label.contains(eyebrow)).toBe(true);
    expect(label.contains(title)).toBe(true);
    const unit = screen.getByTestId(unitTestId);
    expect(unit.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test.each([
    ["locked", "muted", "default"],
    ["checking", "muted", "checking"],
    ["available", "brand", "available"],
    ["completed", "correct", "clear"],
  ] as const)("SMI2. %s는 톤 %s · 유닛 상태 %s로 선다", (status, tone, unitStatus) => {
    mount(status);

    expect(screen.getByTestId(labelTestId)).toHaveClass(`journey-special-unit-label-${tone}`);
    expect(screen.getByTestId(unitTestId)).toHaveAttribute("data-status", unitStatus);
  });

  test("SMI3. 낭독 이름은 special 접두 + 받은 이름이고 상태 접미사는 유닛이 붙인다", () => {
    const first = mount("locked", { accessibilityName: "Episode 1. Culture" });
    expect(screen.getByTestId(unitTestId)).toHaveAttribute(
      "accessibility-label",
      "special, Episode 1. Culture, locked",
    );
    first.view.unmount();

    mount("available", { accessibilityName: "Episode 1. Culture" });
    expect(screen.getByTestId(unitTestId)).toHaveAttribute(
      "accessibility-label",
      "special, Episode 1. Culture",
    );
  });

  test.each(["locked", "checking"] as const)("SMI4. %s 탭은 onSelect를 부르지 않는다", (status) => {
    const { onSelect } = mount(status);

    fireEvent.tap(screen.getByTestId(unitTestId), {});

    expect(onSelect).not.toHaveBeenCalled();
  });

  test.each(["available", "completed"] as const)(
    "SMI4. %s 탭은 인자 없이 onSelect를 한 번 부른다",
    (status) => {
      const { onSelect } = mount(status);

      fireEvent.tap(screen.getByTestId(unitTestId), {});

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith();
    },
  );

  test("SMI5. guide 겹은 바깥 상자에 guided 클래스를 붙이고 children이 라벨 뒤에 선다", () => {
    mount("available", { layer: "guide", withChild: true });

    const outer = screen.getByTestId(unitTestId).closest(".journey-special-unit") as Element;
    expect(outer).not.toBeNull();
    expect(outer).toHaveClass("journey-special-unit-guided");
    const label = screen.getByTestId(labelTestId);
    const extra = screen.getByTestId("extra-layer");
    expect(outer.contains(extra)).toBe(true);
    expect(label.compareDocumentPosition(extra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("SMI5. 기본 겹에는 guided 클래스가 없고 라벨이 서 있다", () => {
    mount("available");

    const outer = screen.getByTestId(unitTestId).closest(".journey-special-unit") as Element;
    expect(outer).not.toBeNull();
    expect(outer.getAttribute("class") ?? "").not.toContain("guided");
    expect(screen.getByTestId(labelTestId)).toBeInTheDocument();
  });

  test("SMI6. LearningUnit 표식은 트리에 없고 SpecialUnit이 선다", () => {
    const { view } = mount("available");

    expect(screen.getByTestId(unitTestId)).toBeInTheDocument();
    expect(view.container.querySelectorAll('[data-testid^="ui-lynx-learning-unit"]')).toHaveLength(
      0,
    );
    expect(view.container.querySelectorAll(".ui-lynx-learning-unit")).toHaveLength(0);
  });
});
