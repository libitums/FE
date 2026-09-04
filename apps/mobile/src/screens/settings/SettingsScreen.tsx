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
      {/* [흐름] 내용 슬롯 — LIB-226 계약 §1.7. 지금은 자식이 없다. `scroll-orientation`·
          `scroll-bar-enable`을 적는다 — 안 적으면 초기값이 각각 가로·꺼짐이라
          세로 스크롤이 원리적으로 불가능하다(계약 R5.2·R5.3). accessibility-*를
          붙이지 않는다(계약 R6). */}
      <scroll-view
        className="settings-screen-scroll"
        data-testid="settings-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      ></scroll-view>
    </view>
  );
}
