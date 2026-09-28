import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { roleplayFormLabel, roleplayItemAccessibilityLabel } from "./roleplay-list";
import type { RoleplayItem } from "./roleplay-list.contract";
import { RoleplayCard } from "./RoleplayCard";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태 · 상호작용을 봅니다 (ADR-0006 D4). 기대값은
// 순수 함수의 결과로 비교하고, 항목은 이 파일 안의 fixture로 줍니다. `toHaveClass`·
// `toHaveStyle`을 쓰지 않습니다. 텍스트 질의(`getByText`)를 쓰지 않습니다.

const messengerItem: RoleplayItem = {
  form: "messenger",
  unitId: "appointment-confirmation",
  title: "약속 확인 메시지",
};

const phoneCallItem: RoleplayItem = {
  form: "phone-call",
  unitId: "appointment-confirmation-phone-call",
  title: "약속 확인 전화",
};

const visualNovelItem: RoleplayItem = {
  form: "visual-novel",
  unitId: "cafe-arrival-visual-novel",
  title: "카페에 도착한 지민",
};

const fixtures: readonly RoleplayItem[] = [messengerItem, phoneCallItem, visualNovelItem];

describe("RoleplayCard — 열린 카드", () => {
  for (const item of fixtures) {
    it(`[C1] ${item.form}: 버튼으로 서고 이름이 제목과 형태다`, () => {
      render(<RoleplayCard item={item} locked={false} layout="row" onSelect={vi.fn()} />);

      const card = screen.getByTestId(`roleplay-list-item-${item.unitId}`);
      expect(card).toHaveAttribute("accessibility-element", "true");
      expect(card).toHaveAttribute("accessibility-traits", "button");
      expect(card).toHaveAttribute("accessibility-label", roleplayItemAccessibilityLabel(item));
      expect(card).toHaveAttribute("data-locked", "false");
    });

    it(`[C2] ${item.form}: 제목과 형태 낱말을 그린다`, () => {
      render(<RoleplayCard item={item} locked={false} layout="row" onSelect={vi.fn()} />);

      expect(screen.getByTestId(`roleplay-list-item-title-${item.unitId}`)).toHaveTextContent(
        item.title,
      );
      expect(screen.getByTestId(`roleplay-list-item-form-${item.unitId}`)).toHaveTextContent(
        roleplayFormLabel(item.form),
      );
    });

    it(`[C3] ${item.form}: tap → onSelect가 정확히 1회, 인자는 그 항목`, () => {
      const onSelect = vi.fn<(selected: RoleplayItem) => void>();
      render(<RoleplayCard item={item} locked={false} layout="row" onSelect={onSelect} />);

      fireEvent.tap(screen.getByTestId(`roleplay-list-item-${item.unitId}`), {});

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(item);
    });
  }

  it("[C4] 자물쇠도 완료 표식도 없다", () => {
    const { container } = render(
      <RoleplayCard item={messengerItem} locked={false} layout="row" onSelect={vi.fn()} />,
    );

    expect(
      screen.queryByTestId("roleplay-list-item-lock-appointment-confirmation"),
    ).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-status]")).toHaveLength(0);
  });

  it("[C5] 세로 목록 배치에서도 같은 이름 · 같은 조작이다", () => {
    const onSelect = vi.fn<(selected: RoleplayItem) => void>();
    render(<RoleplayCard item={messengerItem} locked={false} layout="list" onSelect={onSelect} />);

    const card = screen.getByTestId("roleplay-list-item-appointment-confirmation");
    expect(card).toHaveAttribute("accessibility-label", "약속 확인 메시지, 메신저");
    fireEvent.tap(card, {});

    expect(onSelect).toHaveBeenCalledWith(messengerItem);
  });
});

describe("RoleplayCard — 잠긴 카드", () => {
  it("[C6] 버튼이 아니고 이름 뒤에 잠김이 붙는다", () => {
    render(<RoleplayCard item={messengerItem} locked={true} layout="row" onSelect={vi.fn()} />);

    const card = screen.getByTestId("roleplay-list-item-appointment-confirmation");
    expect(card).toHaveAttribute("accessibility-traits", "none");
    expect(card).toHaveAttribute("accessibility-label", "약속 확인 메시지, 메신저, 잠김");
    expect(card).toHaveAttribute("data-locked", "true");
  });

  it("[C7] 자물쇠가 서고 접근성 트리에서는 가려진다 — 잠김은 이름이 이미 말한다", () => {
    render(<RoleplayCard item={messengerItem} locked={true} layout="row" onSelect={vi.fn()} />);

    expect(screen.getByTestId("roleplay-list-item-lock-appointment-confirmation")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
  });

  it("[C8] tap해도 onSelect가 불리지 않는다", () => {
    const onSelect = vi.fn<(selected: RoleplayItem) => void>();
    render(<RoleplayCard item={messengerItem} locked={true} layout="row" onSelect={onSelect} />);

    fireEvent.tap(screen.getByTestId("roleplay-list-item-appointment-confirmation"), {});

    expect(onSelect).not.toHaveBeenCalled();
  });
});
