import lock from "@libitums/icons/lynx/lock";
import { Fog } from "@libitums/ui-lynx/fog";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import { episodeSectionId } from "./journey-map-scroll";
import { episodePendingAccessibilityLabel, episodePendingLabel } from "./journey-map";
import type { JourneyPendingEpisode } from "./journey-map";

import "./episode-pending.css";

export type EpisodePendingSectionProps = {
  readonly episode: JourneyPendingEpisode;
};

// 아직 유닛이 없는 에피소드의 구획입니다. 앞 에피소드와 **연한 가로 선**으로 갈리고, 그
// 아래가 안개에 가려집니다 — 「더 있긴 한데 준비 중이구나」만 전하면 되는 자리라 실제
// 유닛이 없어도 됩니다.
//
// **머리를 그리지 않습니다.** 맵에 머리 카드가 **하나만** 서고 스크롤 자리가 그 내용을
// 고릅니다 — 가로 선을 넘으면 따라다니던 카드가 이 에피소드를 말합니다
// (`useCurrentEpisode`). 흐름 안에 카드를 또 두면 같은 것이 두 번 보입니다.
export function EpisodePendingSection({ episode }: EpisodePendingSectionProps) {
  return (
    // 구획 전체가 접근성 요소 하나입니다 — 번호 · 이름 · 상태가 따로 읽히면 「준비 중」이
    // 무엇의 준비 중인지 잃습니다. 안쪽 표식은 장식이라 낭독에 이름이 없습니다.
    <view
      // ⚠ **`id`입니다.** 머리 카드가 무엇을 말할지 고르려면 이 구획이 어디서 시작하는지
      // 재야 하고, `measureRects`는 `#id` 선택자만 씁니다 — `data-testid`로는 못 찾고,
      // 하나라도 못 찾으면 **측정 전체가 `null`**이라 머리 카드가 영영 안 바뀝니다.
      id={episodeSectionId(episode.id)}
      className="journey-map-screen-episode"
      data-testid={`episode-pending-${episode.id}`}
      accessibility-element={true}
      accessibility-label={episodePendingAccessibilityLabel(episode.label, episode.title)}
    >
      {/* 에피소드 사이를 가르는 연한 가로 선입니다. 면을 칠하지 않고 선 하나만 둡니다 —
          「여기서 다른 에피소드가 시작한다」만 말하면 되고, 띠를 깔면 그 자체가 내용처럼
          읽힙니다. */}
      <view className="episode-pending-divider" />

      {/* 가려지는 자리입니다. 표식 **하나**만 둡니다 — 이 구획이 말하는 것은 「무엇이 몇 개
          있다」가 아니라 「더 있는데 아직 준비 중」 하나이고, 여럿을 세우면 개수가 뜻을
          갖는 것처럼 읽힙니다.

          장식이라 낭독에서 걷습니다 — 위 상자가 이미 이 구획을 한 덩어리로 읽습니다. */}
      <view className="episode-pending-veil" accessibility-elements-hidden={true}>
        {/* 잠긴 유닛과 **같은 조각**입니다. 직접 원을 그렸더니 잠긴 유닛의 회색보다 훨씬
            연해서 안개가 가릴 것이 없었습니다. `status="default"`가 자물쇠를 그리고,
            `bindtap`을 주지 않아 눌리지 않습니다. */}
        <LearningUnit accessibilityLabel={episode.title} icon={lock} status="default" />

        {/* 안개가 표식 **위에 정확히 겹칩니다.** 상자를 표식 높이로 두는 것이 핵심입니다 —
            상자가 더 크면 표식이 투명한 구간에 앉아 **안개가 없는 것처럼 보입니다**(실기에서
            두 번 그랬습니다).

            방향이 `bottom`이라 아래가 짙습니다 — 표식이 아래로 갈수록 지워져 「이어지다
            사라진다」로 읽힙니다. 손가락과 낭독은 `Fog`가 스스로 막습니다. */}
        <Fog direction="bottom" size="full" color="surface-default" />
      </view>

      <text className="episode-pending-caption" data-testid="episode-pending-caption">
        {episodePendingLabel}
      </text>
    </view>
  );
}
