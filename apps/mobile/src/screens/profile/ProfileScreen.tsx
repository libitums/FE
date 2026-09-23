import type { ReactNode } from "@lynx-js/react";

import type { ProfileScreenProps } from "./profile.contract";

import "./profile-screen.css";

// 나가기(라벨·이름 `설정으로`) · 제목 · 흐름 scroll(유일한 직계 자식
// `profile-screen-list`) · 액션 행 없음(ADR-0022 D1). 항목은 조작 단위가
// 아닙니다 — `accessibility-element`도 `bindtap`도 없습니다. 화면 안 조작
// 단위는 나가기 하나입니다(카드·버튼·입력 상자 0건).
export function ProfileScreen({ items, onExit }: ProfileScreenProps): ReactNode {
  return (
    <view className="profile-screen">
      <view className="profile-screen-header">
        {/* 나가는 수단 — 머리 행의 첫 자식입니다. 라벨·`accessibility-label` 모두
            `설정으로`이고 동작은 `backToRoot`입니다(App이 결선합니다). */}
        <view
          className="profile-screen-exit"
          data-testid="profile-screen-exit"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label="설정으로"
          bindtap={onExit}
        >
          <text className="profile-screen-exit-label">설정으로</text>
        </view>
        <text
          className="profile-screen-title"
          data-testid="profile-screen-title"
          accessibility-traits="header"
        >
          사용자 프로필
        </text>
      </view>

      {/* [흐름] 스크롤 3분할(ADR-0022) — 유일한 직계 자식이 `profile-screen-list`입니다. */}
      <scroll-view
        className="profile-screen-scroll"
        data-testid="profile-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="profile-screen-list" data-testid="profile-screen-list">
          {items.map((item) => (
            <view
              className="profile-screen-item"
              data-testid={`profile-item-${item.id}`}
              key={item.id}
            >
              {/* 보이는 이름을 지므로 가리지 않습니다(ADR-0016 D5). 조작 단위가
                  아니므로 `accessibility-element`를 붙이지 않습니다. */}
              <text
                className="profile-screen-item-name"
                data-testid={`profile-item-label-${item.id}`}
              >
                {item.label}
              </text>
              <text
                className="profile-screen-item-value"
                data-testid={`profile-item-value-${item.id}`}
              >
                {item.value}
              </text>
            </view>
          ))}
        </view>
      </scroll-view>
    </view>
  );
}
