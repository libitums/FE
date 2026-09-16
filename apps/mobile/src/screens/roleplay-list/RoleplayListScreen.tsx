import type { ReactNode } from "@lynx-js/react";

import { RoleplayListItem } from "./RoleplayListItem";
import type { RoleplayListScreenProps } from "./roleplay-list.contract";

import "./roleplay-list-screen.css";

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
// 이 화면이 그리는 것은 제목 텍스트 하나와 흐름 영역의 목록 상자다 — 아이콘은 바텀
// 네비게이션의 것이고, 같은 헤더 덩어리를 화면마다 복사하지 않는다 (screens.contract.ts).
//
// LIB-255 (ui): 받은 `items`를 목록 상자(스크롤의 유일한 직계 자식) 안에 여정 순서
// 그대로 그린다(§2.5). 화면은 목록을 계산하지 않는다.
export function RoleplayListScreen({ items, onSelectItem }: RoleplayListScreenProps): ReactNode {
  return (
    <view className="roleplay-list-screen">
      <text
        data-testid="roleplay-list-screen-title"
        className="roleplay-list-screen-title"
        accessibility-traits="header"
      >
        롤플레이
      </text>
      {/* [흐름] 내용 슬롯 — LIB-226 계약 §1.6. `scroll-orientation`·`scroll-bar-enable`을
          적는다 — 안 적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로
          불가능하다(계약 R5.2·R5.3). accessibility-*를 붙이지 않는다(계약 R6). */}
      <scroll-view
        className="roleplay-list-screen-scroll"
        data-testid="roleplay-list-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* 목록 상자 — 스크롤의 유일한 직계 자식(§2.5). `<scroll-view>`는 강제 linear라
            gap이 없으므로 간격은 이 상자가 진다(design.md §3). accessibility-*를
            붙이지 않는다(ADR-0022 D4·D5). */}
        <view className="roleplay-list-screen-list" data-testid="roleplay-list-screen-list">
          {items.map((item) => (
            <RoleplayListItem key={item.unitId} item={item} onSelect={onSelectItem} />
          ))}
        </view>
      </scroll-view>
    </view>
  );
}
