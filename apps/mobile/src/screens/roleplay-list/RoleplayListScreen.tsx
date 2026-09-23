import type { ReactNode } from "@lynx-js/react";

import { RoleplayListItem } from "./RoleplayListItem";
import type { RoleplayListScreenProps } from "./roleplay-list.contract";

import "./roleplay-list-screen.css";

/**
 * 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사입니다(ADR-0003
 * D6). 이 화면이 그리는 것은 제목 텍스트 하나와 흐름 영역의 목록 상자입니다 — 아이콘은
 * 바텀 네비게이션의 것이고, 같은 헤더 덩어리를 화면마다 복사하지 않습니다.
 *
 * 받은 `items`를 목록 상자(스크롤의 유일한 직계 자식) 안에 여정 순서 그대로
 * 그립니다. 화면은 목록을 계산하지 않습니다.
 */
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
      {/* [흐름] 내용 슬롯 — `scroll-orientation`·`scroll-bar-enable`을 적습니다 — 안
          적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로 불가능합니다.
          accessibility-*를 붙이지 않습니다. */}
      <scroll-view
        className="roleplay-list-screen-scroll"
        data-testid="roleplay-list-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* 목록 상자 — 스크롤의 유일한 직계 자식입니다. `<scroll-view>`는 강제 linear라
            gap이 없으므로 간격은 이 상자가 집니다. accessibility-*를 붙이지
            않습니다(ADR-0022 D4·D5). */}
        <view className="roleplay-list-screen-list" data-testid="roleplay-list-screen-list">
          {items.map((item) => (
            <RoleplayListItem key={item.unitId} item={item} onSelect={onSelectItem} />
          ))}
        </view>
      </scroll-view>
    </view>
  );
}
