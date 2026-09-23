import type { ReactNode } from "@lynx-js/react";

import type { SettingsScreenProps } from "./settings.contract";
import { settingsNavTargets } from "./settings";
import { SettingsNavItem } from "./SettingsNavItem";
import { SettingsToggleItem } from "./SettingsToggleItem";
import { sessionOptionKeys } from "../../lib/session-options";

import "./settings-screen.css";

// 제목 텍스트 하나와 흐름 영역의 목록 상자를 그립니다. 흐름 영역의 유일한 직계
// 자식은 목록 상자(`settings-screen-list`) 하나이고(ADR-0022 D4), 안에는 이동
// 항목 둘(`settingsNavTargets` 순서) 뒤에 토글 항목 둘(`sessionOptionKeys` 순서)이
// 옵니다. 화면은 목록을 계산·정렬·거르지 않고 토글 값도 판정하지 않습니다 — 받은
// 것을 그대로 내립니다.
export function SettingsScreen({
  sessionOptions,
  onSelectNavTarget,
  onToggleSessionOption,
}: SettingsScreenProps): ReactNode {
  return (
    <view className="settings-screen">
      <text
        data-testid="settings-screen-title"
        className="settings-screen-title"
        accessibility-traits="header"
      >
        설정
      </text>
      {/* [흐름] 내용 슬롯 — `scroll-orientation`·`scroll-bar-enable`을 적습니다.
          안 적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로 불가능합니다.
          `accessibility-*`는 붙이지 않습니다 — 조작 단위가 아니라 상자입니다. */}
      <scroll-view
        className="settings-screen-scroll"
        data-testid="settings-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* `<scroll-view>`의 직계 자식은 이 상자 하나입니다(ADR-0022 D4) — 간격은
            이 상자가 집니다(`<scroll-view>` 안은 강제 linear라 `gap`이 무동작입니다). */}
        <view className="settings-screen-list" data-testid="settings-screen-list">
          {settingsNavTargets.map((target) => (
            <SettingsNavItem key={target} target={target} onSelect={onSelectNavTarget} />
          ))}
          {sessionOptionKeys.map((key) => (
            <SettingsToggleItem
              key={key}
              optionKey={key}
              value={sessionOptions[key]}
              onToggle={onToggleSessionOption}
            />
          ))}
        </view>
      </scroll-view>
    </view>
  );
}
