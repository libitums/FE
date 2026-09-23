import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { roleplayFormLabel, roleplayItemAccessibilityLabel } from "./roleplay-list";
import type { RoleplayItem } from "./roleplay-list.contract";
import { RoleplayListItem } from "./RoleplayListItem";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 봅니다 (ADR-0006 D4). 로직을 다시
// 짓지 않습니다 — 기대값은 순수 함수(`roleplayItemAccessibilityLabel`·`roleplayFormLabel`)의
// 결과로 비교하고, 항목 데이터는 이 파일 안의 fixture로 줍니다(code.md 「임시 입력값의
// 이음매」).
//
// `roleplayItemsFrom`이 뽑는 세 형태를 그대로 fixture로 씁니다 — unitId·title은 각
// 화면 계약의 리터럴 타입이라 값 자체를 바꿀 수 없습니다(roleplay-list.unit.test.ts와
// 같은 fixture입니다).

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

describe("RoleplayListItem UI", () => {
  describe("[L1] 조작 단위 루트의 접근성 채널", () => {
    for (const item of fixtures) {
      it(`${item.form} — accessibility-element·traits·label이 정확하다`, () => {
        render(<RoleplayListItem item={item} onSelect={vi.fn()} />);

        const root = screen.getByTestId(`roleplay-list-item-${item.unitId}`);
        expect(root).toHaveAttribute("accessibility-element", "true");
        expect(root).toHaveAttribute("accessibility-traits", "button");
        expect(root).toHaveAttribute("accessibility-label", roleplayItemAccessibilityLabel(item));
      });
    }
  });

  describe("[L2] 제목·형태 텍스트", () => {
    for (const item of fixtures) {
      it(`${item.form} — 제목은 item.title, 형태는 roleplayFormLabel(item.form)`, () => {
        render(<RoleplayListItem item={item} onSelect={vi.fn()} />);

        expect(screen.getByTestId(`roleplay-list-item-title-${item.unitId}`)).toHaveTextContent(
          item.title,
        );
        expect(screen.getByTestId(`roleplay-list-item-form-${item.unitId}`)).toHaveTextContent(
          roleplayFormLabel(item.form),
        );
      });
    }
  });

  // L3 — 예전 규칙(A11Y-01 R1)은 이 래퍼가 가림을 졌지만, 지금은 반대로 가리지
  // 않습니다. 되돌리면 스크린리더가 제목·형태를 다시 못 읽습니다.
  describe("[L3] 글 묶음 래퍼에 가림이 없다", () => {
    for (const item of fixtures) {
      it(`${item.form} — -text 래퍼가 accessibility-elements-hidden을 지지 않고, 제목·형태는 여전히 그 안에 있으며 accessibility-* 속성이 0개다`, () => {
        const { container } = render(<RoleplayListItem item={item} onSelect={vi.fn()} />);

        const wrapper = screen.getByTestId(`roleplay-list-item-text-${item.unitId}`);
        expect(wrapper).not.toHaveAttribute("accessibility-elements-hidden");

        const title = screen.getByTestId(`roleplay-list-item-title-${item.unitId}`);
        const form = screen.getByTestId(`roleplay-list-item-form-${item.unitId}`);
        expect(wrapper).toContainElement(title);
        expect(wrapper).toContainElement(form);

        for (const el of [title, form]) {
          expect(el).not.toHaveAttribute("accessibility-element");
          expect(el).not.toHaveAttribute("accessibility-traits");
          expect(el).not.toHaveAttribute("accessibility-label");
          expect(el).not.toHaveAttribute("accessibility-elements-hidden");
        }

        expect(container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);
      });
    }
  });

  describe("[L4] 루트 tap이 onSelect를 정확히 1회, 그 항목으로 올린다", () => {
    for (const item of fixtures) {
      it(`${item.form}`, () => {
        const onSelect = vi.fn();
        render(<RoleplayListItem item={item} onSelect={onSelect} />);

        fireEvent.tap(screen.getByTestId(`roleplay-list-item-${item.unitId}`), {});

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(item);
      });
    }
  });

  describe("[L5] 완료·잠김 표식이 없다", () => {
    for (const item of fixtures) {
      it(`${item.form} — data-status 없음, header·disabled trait 0건, 완료됨·잠김 텍스트 0건`, () => {
        const { container } = render(<RoleplayListItem item={item} onSelect={vi.fn()} />);

        const root = screen.getByTestId(`roleplay-list-item-${item.unitId}`);
        expect(root).not.toHaveAttribute("data-status");

        const traitsElements = container.querySelectorAll("[accessibility-traits]");
        for (const el of Array.from(traitsElements)) {
          expect(el.getAttribute("accessibility-traits")).not.toBe("header");
          expect(el.getAttribute("accessibility-traits")).not.toBe("disabled");
        }

        expect(container).not.toHaveTextContent("완료됨");
        expect(container).not.toHaveTextContent("잠김");
      });
    }
  });
});
