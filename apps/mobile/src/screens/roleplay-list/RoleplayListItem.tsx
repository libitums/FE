import type { ReactNode } from "@lynx-js/react";
import book from "@libitums/icons/lynx/book";
import message02 from "@libitums/icons/lynx/message-02";
import phone from "@libitums/icons/lynx/phone";
import { color } from "@libitums/design-tokens";

import { roleplayFormLabel, roleplayItemAccessibilityLabel } from "./roleplay-list";
import type { RoleplayListItemProps, RoleplayUnitForm } from "./roleplay-list.contract";

import "./roleplay-list-item.css";

// LIB-255 (ui): 계약(.agent-harness/work/lib-255/spec.md §2.4)의 구조·testid·접근성을
// 채운다. 세 형태는 상태 어휘·조작이 문자 그대로 같고 다른 것은 데이터(제목·형태 낱말)와
// 아이콘뿐이라 컴포넌트를 변형으로 가르지 않는다(design.md §4.2).

// export하지 않는 사상 표 — 형태 → 아이콘. 여정 맵 항목이 같은 유닛에 쓰는 아이콘과
// 같다(design.md §1.4). `tick`은 이 화면에서 import하지 않는다(완료 표식 0건).
const roleplayItemIconByForm: Record<RoleplayUnitForm, string> = {
  messenger: message02,
  "phone-call": phone,
  "visual-novel": book,
};

export function RoleplayListItem({ item, onSelect }: RoleplayListItemProps): ReactNode {
  return (
    <view
      className="roleplay-list-item"
      data-testid={`roleplay-list-item-${item.unitId}`}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={roleplayItemAccessibilityLabel(item)}
      bindtap={() => onSelect(item)}
    >
      <svg
        className="roleplay-list-item-icon"
        content={roleplayItemIconByForm[item.form]}
        current-color={color.fg.brand}
      />
      <view
        className="roleplay-list-item-text"
        data-testid={`roleplay-list-item-text-${item.unitId}`}
      >
        <text
          className="roleplay-list-item-title"
          data-testid={`roleplay-list-item-title-${item.unitId}`}
        >
          {item.title}
        </text>
        <text
          className="roleplay-list-item-form"
          data-testid={`roleplay-list-item-form-${item.unitId}`}
        >
          {roleplayFormLabel(item.form)}
        </text>
      </view>
    </view>
  );
}
