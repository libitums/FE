import type { ReactNode } from "@lynx-js/react";

import type { SettingsScreenProps } from "./settings.contract";
import { settingsNavTargets } from "./settings";
import { SettingsNavItem } from "./SettingsNavItem";
import { SettingsToggleItem } from "./SettingsToggleItem";
import { sessionOptionKeys } from "../../lib/session-options";

import "./settings-screen.css";

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
// 이 화면이 그리는 것은 제목 텍스트 하나뿐이다 — 아이콘은 바텀 네비게이션의 것이고,
// 같은 헤더 덩어리를 화면마다 복사하지 않는다 (screens.contract.ts).
//
// LIB-259 (ui-implementation): 계약(.agent-harness/work/lib-259/spec.md §2.5 · §4.2)
// 그대로. 흐름 영역의 유일한 직계 자식은 목록 상자(`settings-screen-list`) 하나다
// (ADR-0022 D4 · U10). 안에는 이동 항목 둘(`settingsNavTargets` 순서) → 토글 항목
// 둘(`sessionOptionKeys` 순서)이 온다(A6). 화면은 목록을 계산·정렬·거르지 않고
// 토글 값도 판정하지 않는다 — 받은 것을 그대로 내린다.
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
      {/* [흐름] 내용 슬롯 — LIB-226 계약 §1.7. `scroll-orientation`·`scroll-bar-enable`을
          적는다 — 안 적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로
          불가능하다(계약 R5.2·R5.3). accessibility-*를 붙이지 않는다(계약 R6). */}
      <scroll-view
        className="settings-screen-scroll"
        data-testid="settings-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* `<scroll-view>`의 직계 자식은 이 상자 하나다(ADR-0022 D4) — 간격은 이
            상자가 진다(`<scroll-view>` 안은 강제 linear라 `gap`이 무동작이다). */}
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
