import type {} from "@lynx-js/react";

import { getEpisodeHeaderContract, type EpisodeHeaderProps } from "./episode-header.contract";

export function EpisodeHeader(props: EpisodeHeaderProps) {
  const contract = getEpisodeHeaderContract(props);

  return (
    // 카드 전체가 접근성 요소 하나입니다 — 번호 · 이름 · 진행이 따로 읽히면 「7 / 20」이
    // 무엇의 7인지 잃습니다. 안쪽 글자는 이름에 이미 들어 있습니다.
    <view
      className="ui-lynx-episode-header"
      data-testid="ui-lynx-episode-header"
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      accessibility-traits="header"
    >
      <text className="ui-lynx-episode-header-label" data-testid="ui-lynx-episode-header-label">
        {contract.episodeLabel}
      </text>
      <text className="ui-lynx-episode-header-title" data-testid="ui-lynx-episode-header-title">
        {contract.title}
      </text>
      <view className="ui-lynx-episode-header-progress">
        <view className="ui-lynx-episode-header-track" data-testid="ui-lynx-episode-header-track">
          {/* 채움은 0%일 때 그리지 않습니다 — 폭 0짜리 상자는 「아직 시작 안 함」을 「조금 했음」으로 읽히게 합니다. */}
          {contract.fillPercent === 0 ? null : (
            <view
              className="ui-lynx-episode-header-fill"
              data-testid="ui-lynx-episode-header-fill"
              style={{ width: `${contract.fillPercent}%` }}
            />
          )}
        </view>
        <text className="ui-lynx-episode-header-count" data-testid="ui-lynx-episode-header-count">
          {contract.countLabel}
        </text>
      </view>
    </view>
  );
}
