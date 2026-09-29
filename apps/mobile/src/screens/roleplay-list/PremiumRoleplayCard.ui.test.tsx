import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { premiumRoleplayAccessibilityLabel } from "./roleplay-list";
import type { PremiumRoleplayItem } from "./roleplay-list.contract";
import { PremiumRoleplayCard } from "./PremiumRoleplayCard";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태 · 상호작용을 봅니다 (ADR-0006 D4). 항목은 이
// 파일 안의 fixture로 줍니다(`roleplay-premium-items.ts`를 import하지 않습니다).
// `toHaveClass`·`toHaveStyle`을 쓰지 않습니다. 텍스트 질의(`getByText`)를 쓰지 않습니다.

const item: PremiumRoleplayItem = {
  id: "premium-wrong-order",
  title: "My order came out wrong",
  situation: "Talk politely to the café staff",
};

describe("PremiumRoleplayCard — 결제 잠김", () => {
  it("[PC1] 버튼으로 서고 이름이 제목 · 상황 · 플러스 전용이다", () => {
    render(<PremiumRoleplayCard item={item} lock="payment" onSelect={vi.fn()} />);

    const card = screen.getByTestId("roleplay-premium-card-premium-wrong-order");
    expect(card).toHaveAttribute("accessibility-element", "true");
    expect(card).toHaveAttribute("accessibility-traits", "button");
    expect(card).toHaveAttribute(
      "accessibility-label",
      premiumRoleplayAccessibilityLabel(item, "payment", uiCopyEn),
    );
    expect(card).toHaveAttribute("data-lock", "payment");
  });

  it("[PC2] 제목과 상황을 그린다", () => {
    render(<PremiumRoleplayCard item={item} lock="payment" onSelect={vi.fn()} />);

    expect(screen.getByTestId("roleplay-premium-card-title-premium-wrong-order")).toHaveTextContent(
      "My order came out wrong",
    );
    expect(
      screen.getByTestId("roleplay-premium-card-situation-premium-wrong-order"),
    ).toHaveTextContent("Talk politely to the café staff");
  });

  it("[PC3] 배지가 서고 접근성 트리에서는 가려진다 — 같은 뜻을 이름이 말한다", () => {
    render(<PremiumRoleplayCard item={item} lock="payment" onSelect={vi.fn()} />);

    const badge = screen.getByTestId("roleplay-premium-card-badge-premium-wrong-order");
    expect(badge).toHaveTextContent("PLUS");
    expect(badge).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  it("[PC4] 자물쇠와 막이 없다 — 여정을 끝낸 사람에게는 카드가 온전히 보인다", () => {
    render(<PremiumRoleplayCard item={item} lock="payment" onSelect={vi.fn()} />);

    expect(
      screen.queryByTestId("roleplay-premium-card-lock-premium-wrong-order"),
    ).not.toBeInTheDocument();
  });

  it("[PC5] tap → onSelect가 정확히 1회, 인자는 그 항목", () => {
    const onSelect = vi.fn<(selected: PremiumRoleplayItem) => void>();
    render(<PremiumRoleplayCard item={item} lock="payment" onSelect={onSelect} />);

    fireEvent.tap(screen.getByTestId("roleplay-premium-card-premium-wrong-order"), {});

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(item);
  });
});

describe("PremiumRoleplayCard — 에피소드 잠김", () => {
  it("[PC6] 버튼이 아니고 이름 끝이 잠김이다", () => {
    render(<PremiumRoleplayCard item={item} lock="episode" onSelect={vi.fn()} />);

    const card = screen.getByTestId("roleplay-premium-card-premium-wrong-order");
    expect(card).toHaveAttribute("accessibility-traits", "none");
    expect(card).toHaveAttribute(
      "accessibility-label",
      "My order came out wrong, Talk politely to the café staff, locked",
    );
  });

  it("[PC7] 자물쇠가 서고 배지도 그대로 선다 — 잠겨 있어도 결제 롤플레이임이 읽힌다", () => {
    render(<PremiumRoleplayCard item={item} lock="episode" onSelect={vi.fn()} />);

    expect(screen.getByTestId("roleplay-premium-card-lock-premium-wrong-order")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
    expect(
      screen.getByTestId("roleplay-premium-card-badge-premium-wrong-order"),
    ).toBeInTheDocument();
  });

  it("[PC8] tap해도 onSelect가 불리지 않는다", () => {
    const onSelect = vi.fn<(selected: PremiumRoleplayItem) => void>();
    render(<PremiumRoleplayCard item={item} lock="episode" onSelect={onSelect} />);

    fireEvent.tap(screen.getByTestId("roleplay-premium-card-premium-wrong-order"), {});

    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("[RP1-M] 결제 롤플레이 카드는 문구표에서 읽는다", () => {
  it("결제 잠김 — 이름의 Plus only 낱말", () => {
    render(
      <UiCopyContext.Provider value={markedUiCopy}>
        <PremiumRoleplayCard item={item} lock="payment" onSelect={vi.fn()} />
      </UiCopyContext.Provider>,
    );

    expect(screen.getByTestId("roleplay-premium-card-premium-wrong-order")).toHaveAttribute(
      "accessibility-label",
      expect.stringContaining("⟦roleplay.premiumLock.payment⟧"),
    );
  });

  it("에피소드 잠김 — 이름의 잠김 낱말", () => {
    render(
      <UiCopyContext.Provider value={markedUiCopy}>
        <PremiumRoleplayCard item={item} lock="episode" onSelect={vi.fn()} />
      </UiCopyContext.Provider>,
    );

    expect(screen.getByTestId("roleplay-premium-card-premium-wrong-order")).toHaveAttribute(
      "accessibility-label",
      expect.stringContaining("⟦roleplay.premiumLock.episode⟧"),
    );
  });
});
