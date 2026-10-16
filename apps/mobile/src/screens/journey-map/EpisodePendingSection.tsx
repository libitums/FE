import lock from "@libitums/icons/lynx/lock";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import { episodePendingAccessibilityLabel } from "./journey-map";
import { useUiCopy } from "../../lib/ui-copy";
import type { JourneyPendingEpisode } from "./journey-map";

import "./episode-pending.css";

export type EpisodePendingSectionProps = {
  readonly episode: JourneyPendingEpisode;
};

// 아직 유닛이 없는 에피소드의 구획입니다. 앞 에피소드와 **연한 가로 선**으로 갈리고, 그
// 아래가 안개에 가려집니다 — 「더 있긴 한데 준비 중이구나」만 전하면 되는 자리라 실제
// 유닛이 없어도 됩니다.
//
// **머리를 그리지 않습니다.** 머리 띠는 스텝 말풍선이 열린 동안만 맵 위에 겹쳐 서고, 열린 스텝은
// 늘 유닛이 있는 구획에 있습니다.
export function EpisodePendingSection({ episode }: EpisodePendingSectionProps) {
  const copy = useUiCopy();

  return (
    // 구획 전체가 접근성 요소 하나입니다 — 번호 · 이름 · 상태가 따로 읽히면 「준비 중」이
    // 무엇의 준비 중인지 잃습니다. 안쪽 표식은 장식이라 낭독에 이름이 없습니다.
    <view
      className="journey-map-screen-episode"
      data-testid={`episode-pending-${episode.id}`}
      accessibility-element={true}
      accessibility-label={episodePendingAccessibilityLabel(episode.label, episode.title, copy)}
    >
      {/* 에피소드 사이를 가르는 연한 가로 선입니다. 면을 칠하지 않고 선 하나만 둡니다 —
          「여기서 다른 에피소드가 시작한다」만 말하면 되고, 띠를 깔면 그 자체가 내용처럼
          읽힙니다. */}
      <view className="episode-pending-divider" />

      {/* 가려진 표식입니다. 표식 **하나**만 둡니다 — 이 구획이 말하는 것은 「무엇이 몇 개
          있다」가 아니라 「더 있는데 아직 준비 중」 하나이고, 여럿을 세우면 개수가 뜻을
          갖는 것처럼 읽힙니다.

          ⚠ **`Fog`를 쓰지 않습니다.** 안개를 이 자리에 놓아 봤지만 **아무것도 그려지지
          않았습니다** — `dark`로 바꾸고 `z-index`를 올려도 같았습니다. 저장소에서 `Fog`가
          동작하는 네 자리는 전부 **화면 루트**이고, 여기는 `<scroll-view>`의 **내용
          안**입니다. ADR-0022 D4가 *"겹침 레이어는 스크롤 밖이다"* 로 적어 둔 규칙이 곧
          Lynx의 제약이었습니다.

          그래서 겹치는 대신 **표식 자체를 흐리게** 그립니다. 가리는 수단이 다를 뿐 「가려져
          있다」는 결과는 같고, 스크롤 안에서도 확실히 섭니다.

          장식이라 낭독에서 걷습니다 — 위 상자가 이미 이 구획을 한 덩어리로 읽습니다. */}
      <view className="episode-pending-veil" accessibility-elements-hidden={true}>
        {/* 잠긴 유닛과 **같은 조각**입니다. 직접 원을 그렸더니 잠긴 유닛의 회색보다 훨씬
            연해서 안개가 가릴 것이 없었습니다. `status="default"`가 자물쇠를 그리고,
            `bindtap`을 주지 않아 눌리지 않습니다. */}
        <LearningUnit accessibilityLabel={episode.title} icon={lock} status="default" />
      </view>

      <text className="episode-pending-caption" data-testid="episode-pending-caption">
        {copy.journeyMap.episodePendingLabel}
      </text>
    </view>
  );
}
