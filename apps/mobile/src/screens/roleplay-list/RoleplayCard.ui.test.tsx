import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { roleplayFormLabel, roleplayItemAccessibilityLabel } from "./roleplay-list";
import type { RoleplayItem } from "./roleplay-list.contract";
import { RoleplayCard } from "./RoleplayCard";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태 · 상호작용을 봅니다 (ADR-0006 D4). 기대값은
// 순수 함수의 결과로 비교하고, 항목은 이 파일 안의 fixture로 줍니다. `toHaveClass`·
// `toHaveStyle`을 쓰지 않습니다. 텍스트 질의(`getByText`)를 쓰지 않습니다.

const messengerItem: RoleplayItem = {
  form: "messenger",
  unitId: "appointment-confirmation",
  title: "A Message from Minseo",
};

const phoneCallItem: RoleplayItem = {
  form: "phone-call",
  unitId: "appointment-confirmation-phone-call",
  title: "A Call from Minseo",
};

const visualNovelItem: RoleplayItem = {
  form: "visual-novel",
  unitId: "cafe-arrival-visual-novel",
  title: "Our Imagined Café",
};

const fixtures: readonly RoleplayItem[] = [messengerItem, phoneCallItem, visualNovelItem];

describe("RoleplayCard — 열린 카드", () => {
  for (const item of fixtures) {
    it(`[C1] ${item.form}: 버튼으로 서고 이름이 제목과 형태다`, () => {
      render(<RoleplayCard item={item} locked={false} layout="row" onSelect={vi.fn()} />);

      const card = screen.getByTestId(`roleplay-list-item-${item.unitId}`);
      expect(card).toHaveAttribute("accessibility-element", "true");
      expect(card).toHaveAttribute("accessibility-traits", "button");
      expect(card).toHaveAttribute(
        "accessibility-label",
        roleplayItemAccessibilityLabel(item, false, uiCopyEn),
      );
      expect(card).toHaveAttribute("data-locked", "false");
    });

    it(`[C2] ${item.form}: 제목과 형태 낱말을 그린다`, () => {
      render(<RoleplayCard item={item} locked={false} layout="row" onSelect={vi.fn()} />);

      expect(screen.getByTestId(`roleplay-list-item-title-${item.unitId}`)).toHaveTextContent(
        item.title,
      );
      expect(screen.getByTestId(`roleplay-list-item-form-${item.unitId}`)).toHaveTextContent(
        roleplayFormLabel(item.form, uiCopyEn),
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
    expect(card).toHaveAttribute("accessibility-label", "A Message from Minseo, Messenger");
    fireEvent.tap(card, {});

    expect(onSelect).toHaveBeenCalledWith(messengerItem);
  });
});

describe("RoleplayCard — 잠긴 카드", () => {
  it("[C6] 버튼이 아니고 이름 뒤에 잠김이 붙는다", () => {
    render(<RoleplayCard item={messengerItem} locked={true} layout="row" onSelect={vi.fn()} />);

    const card = screen.getByTestId("roleplay-list-item-appointment-confirmation");
    expect(card).toHaveAttribute("accessibility-traits", "none");
    expect(card).toHaveAttribute("accessibility-label", "A Message from Minseo, Messenger, locked");
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

describe("[RP1-M] 롤플레이 카드는 문구표에서 읽는다", () => {
  for (const item of fixtures) {
    it(`${item.form}: 형태 낱말 · 이름`, () => {
      render(
        <UiCopyContext.Provider value={markedUiCopy}>
          <RoleplayCard item={item} locked={false} layout="row" onSelect={vi.fn()} />
        </UiCopyContext.Provider>,
      );

      expect(screen.getByTestId(`roleplay-list-item-form-${item.unitId}`)).toHaveTextContent(
        `⟦roleplay.form.${item.form}⟧`,
      );
      expect(screen.getByTestId(`roleplay-list-item-${item.unitId}`)).toHaveAttribute(
        "accessibility-label",
        expect.stringContaining(`⟦roleplay.form.${item.form}⟧`),
      );
    });
  }

  it("잠긴 카드 이름의 잠김 낱말", () => {
    render(
      <UiCopyContext.Provider value={markedUiCopy}>
        <RoleplayCard item={messengerItem} locked layout="row" onSelect={vi.fn()} />
      </UiCopyContext.Provider>,
    );

    expect(screen.getByTestId(`roleplay-list-item-${messengerItem.unitId}`)).toHaveAttribute(
      "accessibility-label",
      expect.stringContaining("⟦common.locked⟧"),
    );
  });
});

// ------------------------------------------------------------- 동작 줄이기 표지 · 눌림 막

// 클래스는 순수 함수 unit이 지고(U-R6 ~ U-R8), 이 계층은 `data-motion` · 막 testid · 자식 순서만 봅니다.

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
  "accessibility-elements-hidden",
] as const;

describe("RoleplayCard — 동작 줄이기", () => {
  it("UI-R1. reduced 열린 카드는 data-motion과 흰 막을 낸다 — 막은 첫 자식이고 그러데이션보다 앞이다", () => {
    render(
      <MotionProvider motion="reduced">
        <RoleplayCard item={messengerItem} locked={false} layout="row" onSelect={vi.fn()} />
      </MotionProvider>,
    );

    const card = screen.getByTestId(`roleplay-list-item-${messengerItem.unitId}`);
    const shade = screen.getByTestId(`roleplay-list-item-pressed-shade-${messengerItem.unitId}`);
    const title = screen.getByTestId(`roleplay-list-item-title-${messengerItem.unitId}`);
    expect(card).toHaveAttribute("data-motion", "reduced");
    for (const name of accessibilityAttributes) {
      expect(shade).not.toHaveAttribute(name);
    }

    const children = logicalChildren(card);
    expect(children).toHaveLength(3);
    expect(children[0]).toBe(shade);
    // 둘째는 그러데이션(글자를 품지 않는다), 셋째가 글 묶음이다.
    expect(children[1]?.contains(title)).toBe(false);
    expect(children[2]?.contains(title)).toBe(true);
  });

  it.each([
    ["Provider 없음", false],
    ["standard Provider", true],
  ])("UI-R2. %s에서는 data-motion · 막이 없다", (_name, withProvider) => {
    const card = (
      <RoleplayCard item={messengerItem} locked={false} layout="row" onSelect={vi.fn()} />
    );
    const { container } = render(
      withProvider ? <MotionProvider motion="standard">{card}</MotionProvider> : card,
    );

    expect(
      screen.getByTestId(`roleplay-list-item-${messengerItem.unitId}`).hasAttribute("data-motion"),
    ).toBe(false);
    expect(
      screen.queryByTestId(`roleplay-list-item-pressed-shade-${messengerItem.unitId}`),
    ).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-motion]")).toHaveLength(0);
  });

  it("UI-R3. reduced 잠긴 카드는 data-motion이 있고 막이 없으며 잠김 계약은 그대로다", () => {
    const onSelect = vi.fn();
    render(
      <MotionProvider motion="reduced">
        <RoleplayCard item={messengerItem} locked={true} layout="row" onSelect={onSelect} />
      </MotionProvider>,
    );

    const card = screen.getByTestId(`roleplay-list-item-${messengerItem.unitId}`);
    expect(card).toHaveAttribute("data-motion", "reduced");
    expect(
      screen.queryByTestId(`roleplay-list-item-pressed-shade-${messengerItem.unitId}`),
    ).not.toBeInTheDocument();
    expect(card).toHaveAttribute("data-locked", "true");
    expect(card).toHaveAttribute("accessibility-traits", "none");
    fireEvent.tap(card, {});
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("UI-R4. Provider 없음 잠긴 카드는 기존 계약 그대로다 — 자물쇠 · 가림 속성 · 막 없음", () => {
    render(<RoleplayCard item={messengerItem} locked={true} layout="row" onSelect={vi.fn()} />);

    const card = screen.getByTestId(`roleplay-list-item-${messengerItem.unitId}`);
    expect(card).toHaveAttribute("data-locked", "true");
    expect(card.hasAttribute("data-motion")).toBe(false);
    expect(screen.getByTestId(`roleplay-list-item-lock-${messengerItem.unitId}`)).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
    expect(
      screen.queryByTestId(`roleplay-list-item-pressed-shade-${messengerItem.unitId}`),
    ).not.toBeInTheDocument();
  });

  it("UI-R5. reduced 열린 카드를 tap하면 onSelect가 한 번 불리고 이름이 Provider 없음과 같다", () => {
    const onSelect = vi.fn<(selected: RoleplayItem) => void>();
    render(
      <MotionProvider motion="reduced">
        <RoleplayCard item={messengerItem} locked={false} layout="row" onSelect={onSelect} />
      </MotionProvider>,
    );

    const card = screen.getByTestId(`roleplay-list-item-${messengerItem.unitId}`);
    expect(card).toHaveAttribute(
      "accessibility-label",
      roleplayItemAccessibilityLabel(messengerItem, false, uiCopyEn),
    );
    expect(card).toHaveAttribute("accessibility-traits", "button");
    fireEvent.tap(card, {});
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(messengerItem);
  });
});
