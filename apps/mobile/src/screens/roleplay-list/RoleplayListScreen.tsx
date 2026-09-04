import type { ReactNode } from "@lynx-js/react";

import "./roleplay-list-screen.css";

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
// 이 화면이 그리는 것은 제목 텍스트 하나뿐이다 — 아이콘은 바텀 네비게이션의 것이고,
// 같은 헤더 덩어리를 화면마다 복사하지 않는다 (screens.contract.ts).
export function RoleplayListScreen(): ReactNode {
  return (
    <view className="roleplay-list-screen">
      <text
        data-testid="roleplay-list-screen-title"
        className="roleplay-list-screen-title"
        accessibility-traits="header"
      >
        롤플레이
      </text>
      {/* [흐름] 내용 슬롯 — LIB-226 계약 §1.6. 지금은 자식이 없다. prop을 적지
          않는다(계약 R5). accessibility-*를 붙이지 않는다(계약 R6). */}
      <scroll-view
        className="roleplay-list-screen-scroll"
        data-testid="roleplay-list-screen-scroll"
      ></scroll-view>
    </view>
  );
}
