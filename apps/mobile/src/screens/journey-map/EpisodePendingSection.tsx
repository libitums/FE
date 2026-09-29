import { Fog } from "@libitums/ui-lynx/fog";

import { episodePendingAccessibilityLabel, episodePendingLabel } from "./journey-map";
import type { JourneyPendingEpisode } from "./journey-map";

import "./episode-pending.css";

export type EpisodePendingSectionProps = {
  readonly episode: JourneyPendingEpisode;
};

// 가려진 자리에 서는 표식의 수입니다. **유닛이 아니라 장식**이라 데이터에서 오지 않습니다 —
// 이 구획이 말하는 것은 「무엇이 몇 개 있다」가 아니라 **「더 있는데 아직 준비 중」** 하나이고,
// 그 말에 필요한 최소가 「하나보다 많다」입니다. 셋이면 줄이 이어지는 것으로 읽히고 화면을
// 넘기지 않습니다.
const veiledMarkerCount = 3;

// 아직 유닛이 없는 에피소드의 구획입니다. 머리는 읽히고 그 아래가 안개에 가려집니다 —
// 「더 있긴 한데 준비 중이구나」만 전하면 되는 자리입니다.
//
// **누를 수 없습니다.** 가려진 표식은 `<view>`일 뿐 `bindtap`이 없고, 머리 카드도
// 마찬가지입니다.
export function EpisodePendingSection({ episode }: EpisodePendingSectionProps) {
  return (
    // 구획 전체가 접근성 요소 하나입니다 — 번호 · 이름 · 상태가 따로 읽히면 「준비 중」이
    // 무엇의 준비 중인지 잃습니다. 안쪽 표식은 장식이라 낭독에 이름이 없습니다.
    <view
      className="episode-pending"
      data-testid={`episode-pending-${episode.id}`}
      accessibility-element={true}
      accessibility-label={episodePendingAccessibilityLabel(episode.label, episode.title)}
    >
      {/* 에피소드 사이를 가르는 연한 가로 선입니다. 면을 칠하지 않고 선 하나만 둡니다 —
          「여기서 다른 에피소드가 시작한다」만 말하면 되고, 띠를 깔면 그 자체가 내용처럼
          읽힙니다. */}
      <view className="episode-pending-divider" />

      {/* 머리는 **가리지 않습니다.** 다음 이야기가 무엇인지는 알려 주고 내용만 감춥니다.
          `EpisodeHeader`(ui-lynx)를 쓰지 않는 것은 그 계약이 `totalUnitCount`에 0을
          거부하기 때문입니다 — 진행이 없는 에피소드는 그 컴포넌트가 지는 모양이 아닙니다.
          표면은 헤더 카드와 같은 토큰으로 맞춰 형제로 읽히게 합니다. */}
      <view className="episode-pending-card">
        <text className="episode-pending-card-label">{episode.label}</text>
        <text className="episode-pending-card-title">{episode.title}</text>
      </view>

      {/* 가려지는 자리입니다. 표식은 장식이라 `accessibility-elements-hidden`으로 낭독에서
          걷습니다 — 위 상자가 이미 이 구획을 한 덩어리로 읽습니다. */}
      <view className="episode-pending-veil" accessibility-elements-hidden={true}>
        <view className="episode-pending-markers">
          {Array.from({ length: veiledMarkerCount }, (_, index) => (
            <view key={index} className="episode-pending-marker" />
          ))}
        </view>

        {/* 안개는 표식 **위**에 절대 배치로 얹힙니다. 손가락과 낭독을 먹지 않는 것은
            `Fog`가 스스로 집니다(`event-through` · `accessibility-elements-hidden`).

            방향이 `bottom`입니다 — **아래가 짙고 위로 갈수록 옅어집니다.** 그래야 줄이
            이어지다가 사라지는 것으로 읽힙니다. ⚠ `top`으로 뒀더니 실기에서 표식이
            **통째로 지워져** 「더 있긴 한데」가 전달되지 않았습니다: 가리는 것과 아예
            없애는 것은 다릅니다. */}
        <Fog direction="bottom" size="full" color="surface-default" />

        <text className="episode-pending-caption" data-testid="episode-pending-caption">
          {episodePendingLabel}
        </text>
      </view>
    </view>
  );
}
