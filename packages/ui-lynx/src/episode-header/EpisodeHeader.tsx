import type {} from "@lynx-js/react";
import starCoin02 from "@libitums/icons/lynx/star-coin-02";
import { color } from "@libitums/design-tokens";

import { getEpisodeHeaderContract, type EpisodeHeaderProps } from "./episode-header.contract";

export function EpisodeHeader(props: EpisodeHeaderProps) {
  const contract = getEpisodeHeaderContract(props);
  const starContent = starCoin02.replace(/currentColor/g, color.white);

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
      {props.titleLines ? (
        // 줄 나눔은 호출자가 띄어쓰기에서 끝냈습니다 — 여기서는 줄마다 text 하나만 그립니다.
        <view
          className="ui-lynx-episode-header-title-lines"
          data-testid="ui-lynx-episode-header-title"
          // 데이터셋 키는 카멜로 적습니다(하이픈 키는 테스트 환경이 거부합니다) — 속성 이름은 `data-title-size`가 됩니다.
          data-titleSize={props.titleSize === "compact" ? "compact" : undefined}
        >
          {props.titleLines.map((line, index) => (
            <text
              key={`${index}:${line}`}
              className={`ui-lynx-episode-header-title${props.titleSize === "compact" ? " ui-lynx-episode-header-title-compact" : ""}`}
              data-testid={`ui-lynx-episode-header-title-line-${index}`}
              text-maxline="1"
            >
              {line}
            </text>
          ))}
        </view>
      ) : (
        <text className="ui-lynx-episode-header-title" data-testid="ui-lynx-episode-header-title">
          {contract.title}
        </text>
      )}
      <view className="ui-lynx-episode-header-progress">
        <view className="ui-lynx-episode-header-track" data-testid="ui-lynx-episode-header-track">
          {/* 채움은 0%일 때 그리지 않습니다 — 폭 0짜리 상자를 두면 그 안의 별이
              잘린 채 남고, 「아직 시작 안 함」이 「조금 했음」으로 읽힙니다. */}
          {contract.fillPercent === 0 ? null : (
            <view
              className="ui-lynx-episode-header-fill"
              data-testid="ui-lynx-episode-header-fill"
              style={{ width: `${contract.fillPercent}%` }}
            >
              <svg
                className="ui-lynx-episode-header-star"
                content={starContent}
                current-color={color.white}
              />
            </view>
          )}
        </view>
        <text className="ui-lynx-episode-header-count" data-testid="ui-lynx-episode-header-count">
          {contract.countLabel}
        </text>
      </view>
    </view>
  );
}
