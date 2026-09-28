import type { ReactNode } from "@lynx-js/react";
import arrowRight02 from "@libitums/icons/lynx/arrow-right-02";
import { color } from "@libitums/design-tokens";

import { RoleplayCard } from "./RoleplayCard";
import { roleplaySectionAccessibilityLabel } from "./roleplay-list";
import type { RoleplayListScreenProps } from "./roleplay-list.contract";

import "./roleplay-list-screen.css";

/**
 * 롤플레이 탭의 루트 화면입니다(Figma 76-692). 에피소드마다 구획 하나가 서고, 구획은
 * 머리 한 줄과 가로로 넘기는 카드 줄입니다.
 *
 * 화면은 구획을 계산하지 않습니다 — 어느 에피소드가 열렸는지는 위(`App`)가 여정의
 * 진행에서 정해 내립니다.
 */
export function RoleplayListScreen({
  sections,
  onSelectItem,
  onViewAll,
}: RoleplayListScreenProps): ReactNode {
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
            gap이 없으므로 간격은 이 상자가 집니다. */}
        <view className="roleplay-list-screen-list" data-testid="roleplay-list-screen-list">
          {sections.map((section) => (
            <view
              key={section.episodeId}
              className="roleplay-list-section"
              data-testid={`roleplay-list-section-${section.episodeId}`}
              data-unlocked={section.unlocked ? "true" : "false"}
            >
              <view className="roleplay-list-section-head">
                {/* 머리 두 줄을 한 접근성 요소로 묶습니다 — 따로 두면 `Episode 0.`와
                    이름이 두 번 멈춰 읽힙니다. */}
                <view
                  className="roleplay-list-section-header"
                  data-testid={`roleplay-list-section-header-${section.episodeId}`}
                  accessibility-element={true}
                  accessibility-traits="header"
                  accessibility-label={roleplaySectionAccessibilityLabel(section)}
                >
                  <text className="roleplay-list-section-label">{section.label}</text>
                  <text className="roleplay-list-section-title">{section.title}</text>
                </view>
                {/* 잠긴 에피소드에는 `전체 보기`가 없습니다 — 펼쳐도 열 수 있는 것이
                    없습니다. */}
                {section.unlocked ? (
                  <view
                    className="roleplay-list-section-view-all"
                    data-testid={`roleplay-list-section-view-all-${section.episodeId}`}
                    accessibility-element={true}
                    accessibility-traits="button"
                    accessibility-label={`${section.label} 전체 보기`}
                    bindtap={() => onViewAll(section.episodeId)}
                  >
                    <text className="roleplay-list-section-view-all-label">전체 보기</text>
                    <svg
                      className="roleplay-list-section-view-all-icon"
                      content={arrowRight02}
                      current-color={color.brand.primary}
                    />
                  </view>
                ) : null}
              </view>
              <scroll-view
                className="roleplay-list-section-scroll"
                scroll-orientation="horizontal"
                scroll-bar-enable={false}
              >
                <view
                  className="roleplay-list-section-row"
                  data-testid={`roleplay-list-section-row-${section.episodeId}`}
                >
                  {section.items.map((item) => (
                    <RoleplayCard
                      key={item.unitId}
                      item={item}
                      locked={!section.unlocked}
                      layout="row"
                      onSelect={onSelectItem}
                    />
                  ))}
                </view>
              </scroll-view>
            </view>
          ))}
        </view>
      </scroll-view>
    </view>
  );
}
