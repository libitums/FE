// 바텀 네비게이션 셸입니다. `tab` prop에서 선택 상태를 파생할 뿐 자체 상태를
// 갖지 않습니다.

// 아이콘은 필요한 이름의 subpath만 가져옵니다. SVG XML 문자열을 그대로 받는
// `<svg content>` 경로를 씁니다(ADR-0014 D6). `roleplay-list-item.css`와 같은
// 패턴입니다.
import map from "@libitums/icons/lynx/map";
import userGroup from "@libitums/icons/lynx/user-group";
import settings from "@libitums/icons/lynx/settings";

// 아이콘 색에 한해 TS token 상수를 씁니다(ADR-0014 D2). Lynx `<svg>`는 CSS `color`를
// 읽지 않고 `current-color` 속성만 받는데, 속성이라 `var()`가 풀리지 않습니다.
import { color } from "@libitums/design-tokens";

import type { ReactNode } from "@lynx-js/react";

import type { Tab } from "../app/navigation";

import "./bottom-navigator.css";

export type BottomNavigatorProps = {
  tab: Tab;
  onSelectTab: (tab: Tab) => void;
};

// 항목은 모듈 내부 상수입니다. export하지 않고 props로도 받지 않습니다 — 세 탭은
// `Tab` union이 이미 닫아 두었습니다. 배열 순서가 좌→우 배치 순서입니다.
type BottomNavigatorItem = {
  tab: Tab;
  label: string;
  icon: string;
};

const items: readonly BottomNavigatorItem[] = [
  { tab: "journey", label: "여정", icon: map },
  { tab: "roleplay", label: "롤플레이", icon: userGroup },
  { tab: "settings", label: "설정", icon: settings },
];

export function BottomNavigator({ tab, onSelectTab }: BottomNavigatorProps): ReactNode {
  return (
    <view className="bottom-navigator">
      {items.map((item) => {
        const selected = item.tab === tab;
        return (
          <view
            key={item.tab}
            className="bottom-navigator-tab"
            data-testid={`bottom-navigator-tab-${item.tab}`}
            data-selected={selected ? "true" : "false"}
            {...(selected ? { __lynx_timing_flag: `libitum:navigation:${item.tab}` } : {})}
            accessibility-element={true}
            accessibility-label={selected ? `${item.label}, 선택됨` : item.label}
            accessibility-traits="button"
            bindtap={() => onSelectTab(item.tab)}
          >
            {/* 선택 지시선입니다. 선택이든 아니든 항상 렌더합니다 — 색만으로 상태를
                전달하지 않기 위한 형태 채널입니다(WCAG 1.4.1). 순수 장식이라 접근성
                트리에서 뺍니다 — 이름은 탭 전체가 이미 지고 있습니다. */}
            <view
              className={
                selected
                  ? "bottom-navigator-indicator bottom-navigator-indicator-selected"
                  : "bottom-navigator-indicator"
              }
            />
            <svg
              className="bottom-navigator-icon"
              data-testid={`bottom-navigator-icon-${item.tab}`}
              content={item.icon}
              current-color={selected ? color.fg.brand : color.fg["neutral-muted"]}
            />
            <text
              className={
                selected
                  ? "bottom-navigator-label bottom-navigator-label-selected"
                  : "bottom-navigator-label"
              }
            >
              {item.label}
            </text>
          </view>
        );
      })}
    </view>
  );
}
