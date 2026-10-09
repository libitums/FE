import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";

import type { ProfileScreenProps } from "./profile.contract";

import "./profile-screen.css";

// 나가기(라벨·이름 `설정으로`) · 제목 · 흐름 scroll(유일한 직계 자식
// `profile-screen-list`) · 액션 행 없음(ADR-0022 D1). 항목은 조작 단위가
// 아닙니다 — `accessibility-element`도 `bindtap`도 없습니다. 화면 안 조작
// 단위는 나가기 하나입니다(카드·버튼·입력 상자 0건).
export function ProfileScreen({ items, onExit }: ProfileScreenProps): ReactNode {
  const copy = useUiCopy();
  // 시스템 뒤로가기 = 보이는 나가기와 같은 함수입니다.
  useScreenBack(onExit);
  return (
    <view className="profile-screen">
      {/* 머리 — 알림 화면과 같은 모양입니다: 동그란 뒤로 버튼(첫 자식, 낭독 `설정으로`)과
          줄 가운데의 제목. 동작은 `backToRoot`입니다(App이 결선합니다). */}
      <view className="profile-screen-header">
        <view className="profile-screen-exit" data-testid="profile-screen-exit">
          <RoundButton
            accessibilityLabel={copy.common.backToSettings}
            icon={arrowLeft03}
            variant="neutral"
            size="xl"
            bindtap={onExit}
          />
        </view>
        <text
          className="profile-screen-title"
          data-testid="profile-screen-title"
          accessibility-traits="header"
        >
          {copy.profile.title}
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
          {/* 항목을 설정 화면의 설정 그룹과 같은 카드로 묶습니다 — 흰 면 · 연한 테두리 · 둥근
              모서리 · 안쪽 구분선. 읽기 전용이라 ui-lynx 설정 셀(누르는 행)을 쓰지 않고 모양만
              맞춥니다. 항목이 없으면 카드를 세우지 않습니다 — 빈 테두리 상자만 남습니다. */}
          {items.length === 0 ? null : (
            <view className="profile-screen-card" data-testid="profile-screen-card">
              {items.map((item, index) => (
                <view className="profile-screen-slot" key={item.id}>
                  {index > 0 ? (
                    <view className="profile-screen-divider" accessibility-elements-hidden={true} />
                  ) : null}
                  <view className="profile-screen-item" data-testid={`profile-item-${item.id}`}>
                    {/* 보이는 이름을 지므로 가리지 않습니다(ADR-0016 D5). 조작 단위가
                    아니므로 `accessibility-element`를 붙이지 않습니다. */}
                    <text
                      className="profile-screen-item-name"
                      data-testid={`profile-item-label-${item.id}`}
                    >
                      {copy.profile.itemLabel[item.id]}
                    </text>
                    <text
                      className="profile-screen-item-value"
                      data-testid={`profile-item-value-${item.id}`}
                    >
                      {item.value}
                    </text>
                  </view>
                </view>
              ))}
            </view>
          )}
        </view>
      </scroll-view>
    </view>
  );
}
