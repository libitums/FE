import type { ReactNode } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { RoleplayCard } from "./RoleplayCard";
import type { RoleplayEpisodeScreenProps } from "./roleplay-list.contract";

import "./roleplay-episode-screen.css";

/**
 * 에피소드 하나의 롤플레이를 세로로 펼친 화면입니다 — 롤플레이 화면 구획 머리의
 * `전체 보기`가 엽니다. 디자인이 없는 화면이라 롤플레이 화면의 카드를 그대로 쓰고
 * 줄 폭으로 폅니다.
 */
export function RoleplayEpisodeScreen({
  section,
  onSelectItem,
  onExit,
}: RoleplayEpisodeScreenProps): ReactNode {
  const copy = useUiCopy();
  // 시스템 뒤로가기 = 보이는 나가기와 같은 함수입니다.
  useScreenBack(onExit);
  return (
    <view className="roleplay-episode-screen">
      {/* 머리 — 나가기가 첫 자식입니다(낭독 순서 `나가기 → 에피소드 → 항목들`). */}
      <view className="roleplay-episode-screen-header">
        <view className="roleplay-episode-screen-exit" data-testid="roleplay-episode-screen-exit">
          <RoundButton
            accessibilityLabel={copy.common.exitTo.roleplay}
            icon={arrowLeft03}
            variant="neutral"
            size="xl"
            bindtap={onExit}
          />
        </view>
        <text
          className="roleplay-episode-screen-title"
          data-testid="roleplay-episode-screen-title"
          accessibility-traits="header"
        >
          {`${section.label} ${section.title}`}
        </text>
      </view>
      <scroll-view
        className="roleplay-episode-screen-scroll"
        data-testid="roleplay-episode-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="roleplay-episode-screen-list" data-testid="roleplay-episode-screen-list">
          {section.items.map((item) => (
            <RoleplayCard
              key={item.unitId}
              item={item}
              locked={!section.unlocked}
              layout="list"
              onSelect={onSelectItem}
            />
          ))}
        </view>
      </scroll-view>
    </view>
  );
}
