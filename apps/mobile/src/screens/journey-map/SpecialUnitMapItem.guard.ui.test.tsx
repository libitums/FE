import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { JourneyMapNodeStatus } from "./journey-map-types";
import { SpecialUnitMapItem } from "./SpecialUnitMapItem";

// `ui` 계층: 맵 쪽 잠금 가드만 봅니다. 진짜 `SpecialUnit`은 Default · Checking에서 탭을 달지 않아 맵 가드를
// 지워도 다른 테스트가 초록으로 남습니다. 그래서 어느 상태에서나 탭을 흘리는 대역으로 바꿔, 막는 것이
// `SpecialUnitMapItem` 자신인지 확인합니다(리뷰 P2-1).
vi.mock("@libitums/ui-lynx/special-unit", () => ({
  SpecialUnit: (props: { readonly bindtap?: () => void }) => (
    <view data-testid="special-unit-double" bindtap={() => props.bindtap?.()} />
  ),
}));

function mount(status: JourneyMapNodeStatus) {
  const onSelect = vi.fn<() => void>();
  render(
    <SpecialUnitMapItem
      unitId="x"
      title="Our Imagined Café"
      accessibilityName="Our Imagined Café"
      status={status}
      onSelect={onSelect}
    />,
  );
  return onSelect;
}

describe("SpecialUnitMapItem 잠금 가드", () => {
  test.each(["locked", "checking"] as const)(
    "SMI7. 유닛이 탭을 흘려도 %s에서는 onSelect를 부르지 않는다",
    (status) => {
      const onSelect = mount(status);

      fireEvent.tap(screen.getByTestId("special-unit-double"), {});

      expect(onSelect).not.toHaveBeenCalled();
    },
  );

  test("SMI7. 대역이 탭을 흘리면 available에서는 onSelect를 부른다", () => {
    const onSelect = mount("available");

    fireEvent.tap(screen.getByTestId("special-unit-double"), {});

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
