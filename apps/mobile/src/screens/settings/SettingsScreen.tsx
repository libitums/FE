import type { ReactNode } from "@lynx-js/react";

import "./settings-screen.css";

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
// 이 화면이 그리는 것은 제목 텍스트 하나뿐이다 — 아이콘은 바텀 네비게이션의 것이고,
// 같은 헤더 덩어리를 화면마다 복사하지 않는다 (screens.contract.ts).
export function SettingsScreen(): ReactNode {
  return (
    <view className="settings-screen">
      <text
        data-testid="settings-screen-title"
        className="settings-screen-title"
        accessibility-traits="header"
      >
        설정
      </text>
    </view>
  );
}
