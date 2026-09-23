import type { ReactNode } from "@lynx-js/react";

import userAvatar from "@libitums/icons/lynx/user-avatar";
import document from "@libitums/icons/lynx/document";
import { color } from "@libitums/design-tokens";

import type { SettingsNavItemProps, SettingsNavTarget } from "./settings.contract";
import { settingsNavLabel } from "./settings";

import "./settings-nav-item.css";

// 루트 하나가 조작 단위이고, 보이는 낱말과 접근성 이름이 같은 문자열입니다
// (WCAG 2.5.3). 아이콘은 장식이라 접근성 속성을 붙이지 않습니다(ADR-0016 D5).

// 목적지 아이콘 — 「그 화면이 그리는 것」을 가리킵니다: 프로필은 사람의 정보
// (`user-avatar`), 약관은 문서 본문(`document`)입니다. 두 항목이 같은 색 상수를
// 씁니다. 전체 index를 import하지 않습니다 — 819개가 번들에 들어갑니다.
const settingsNavItemIconByTarget: Record<SettingsNavTarget, string> = {
  profile: userAvatar,
  terms: document,
};

export function SettingsNavItem({ target, onSelect }: SettingsNavItemProps): ReactNode {
  return (
    <view
      className="settings-nav-item"
      data-testid={`settings-nav-item-${target}`}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={settingsNavLabel(target)}
      bindtap={() => onSelect(target)}
    >
      <svg
        className="settings-nav-item-icon"
        content={settingsNavItemIconByTarget[target]}
        current-color={color.fg.brand}
      />
      {/* 보이는 이름을 지므로 가리지 않습니다(ADR-0016 D5). */}
      <text className="settings-nav-item-label" data-testid={`settings-nav-item-label-${target}`}>
        {settingsNavLabel(target)}
      </text>
    </view>
  );
}
