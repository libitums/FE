import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowRight02 from "@libitums/icons/lynx/arrow-right-02";
import crown from "@libitums/icons/lynx/crown";
import { color } from "@libitums/design-tokens";
import { Dialog } from "@libitums/ui-lynx/dialog";

import { useScreenLayer } from "../../lib/use-screen-layer";
import { PremiumRoleplayCard } from "./PremiumRoleplayCard";
import { RoleplayCard } from "./RoleplayCard";
import {
  premiumRoleplayLock,
  premiumRoleplayNotice,
  roleplaySectionAccessibilityLabel,
} from "./roleplay-list";
import type { PremiumRoleplayItem, RoleplayListScreenProps } from "./roleplay-list.contract";

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
  onLayerChange,
}: RoleplayListScreenProps): ReactNode {
  // 결제 잠김 카드를 누르면 뜨는 안내입니다. 화면이 집니다 — 결제 화면이 아직 없어 갈
  // 곳이 없고, 안내는 이 화면 위에 겹칠 뿐 화면 전환이 아닙니다.
  const [noticeItem, setNoticeItem] = useState<PremiumRoleplayItem | null>(null);
  // 이 화면 밖의 전역 머리도 안내가 떠 있는 동안 가려야 합니다 — 아래 제목 · 목록 가림과
  // 같은 규칙을 셸에 알립니다.
  useScreenLayer(noticeItem !== null, onLayerChange);

  return (
    <view className="roleplay-list-screen">
      {/* 안내가 떠 있는 동안 뒤쪽을 가립니다(ADR-0016 D9). 가림은 자손에 걸리므로(D5)
          제목 자신이 아니라 이 상자에 붙입니다. */}
      <view
        className="roleplay-list-screen-head"
        data-testid="roleplay-list-screen-head"
        accessibility-elements-hidden={noticeItem !== null}
      >
        <text
          data-testid="roleplay-list-screen-title"
          className="roleplay-list-screen-title"
          accessibility-traits="header"
        >
          롤플레이
        </text>
      </view>
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
              // 안내가 떠 있는 동안 뒤쪽을 가립니다. 스크롤과 목록 상자에는 붙이지
              // 않습니다 — 그 둘은 accessibility-*를 지지 않습니다(ADR-0022 D4·D5).
              accessibility-elements-hidden={noticeItem !== null}
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
              {/* 결제 롤플레이 줄 — 기본 줄 아래에 따로 섭니다. 같은 줄에 섞으면 옆으로
                  넘겨야 보입니다. */}
              {section.premiumItems.length === 0 ? null : (
                <view
                  className="roleplay-list-section-premium"
                  data-testid={`roleplay-list-section-premium-${section.episodeId}`}
                >
                  <view
                    className="roleplay-list-section-premium-header"
                    data-testid={`roleplay-list-section-premium-header-${section.episodeId}`}
                    accessibility-element={true}
                    accessibility-label={`${section.label} 플러스 롤플레이, 이 에피소드와 닮은 상황을 더 연습해요`}
                  >
                    <svg
                      className="roleplay-list-section-premium-icon"
                      content={crown}
                      current-color={color.brand.primary}
                    />
                    <text className="roleplay-list-section-premium-label">플러스</text>
                    <text className="roleplay-list-section-premium-caption">
                      닮은 상황을 더 연습해요
                    </text>
                  </view>
                  <scroll-view
                    className="roleplay-list-section-scroll"
                    scroll-orientation="horizontal"
                    scroll-bar-enable={false}
                  >
                    <view
                      className="roleplay-list-section-row"
                      data-testid={`roleplay-list-section-premium-row-${section.episodeId}`}
                    >
                      {section.premiumItems.map((item) => (
                        <PremiumRoleplayCard
                          key={item.id}
                          item={item}
                          lock={premiumRoleplayLock(section)}
                          onSelect={setNoticeItem}
                        />
                      ))}
                    </view>
                  </scroll-view>
                </view>
              )}
            </view>
          ))}
        </view>
      </scroll-view>
      {/* [겹침 레이어] 스크롤 밖, 화면 루트의 직계 자식입니다. */}
      {noticeItem === null ? null : (
        <view className="roleplay-list-premium-notice" data-testid="roleplay-list-premium-notice">
          <Dialog
            title="플러스 롤플레이"
            description={premiumRoleplayNotice(noticeItem)}
            actions={[{ id: "close", label: "확인" }]}
            phase="visible"
            bindaction={() => setNoticeItem(null)}
          />
        </view>
      )}
    </view>
  );
}
