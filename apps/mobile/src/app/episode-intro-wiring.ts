// 에피소드 서사 표지 유닛의 결선입니다. 표지는 맵에 스스로 서는 유닛이라(ADR-0024 D2)
// **다른 유닛의 진입을 감싸지 않습니다** — 이 파일에 게이트가 없습니다. 순서를 지는 자리는
// 맵의 잠김 파생(`mapItemStatus`)이고, 여기는 표지 자신의 흐름(열기 · 넘기기 · 서사 ·
// 결과 화면 · 나가기)만 집니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { JourneyMapSection } from "../screens/journey-map/journey-map";
import type {
  EpisodeIntroUnitId,
  EpisodePrologue,
} from "../screens/episode-intro/episode-intro.contract";
import {
  completeEpisodeIntroUnit,
  episodeOfIntroUnit,
} from "../screens/episode-intro/episode-intro";
import type { NavAction } from "./nav-state";

export type EpisodeIntroWiringArgs = {
  readonly sections: readonly JourneyMapSection[];
  readonly setCompletedEpisodeIntroIds: Dispatch<SetStateAction<readonly EpisodeIntroUnitId[]>>;
  readonly dispatch: Dispatch<NavAction>;
  /** 그 에피소드의 서사 전개입니다. 없으면 표지의 `Next`가 `Skip`과 같은 곳으로 갑니다. */
  readonly prologueFor: (episodeId: string) => EpisodePrologue | undefined;
};

export function episodeIntroWiring(args: EpisodeIntroWiringArgs) {
  const { sections, setCompletedEpisodeIntroIds, dispatch, prologueFor } = args;

  // 표지를 마친 자리입니다. 서사에는 잴 것이 없어 결과가 늘 만점이고, **완료를 적는
  // 자리는 그 결과 화면의 `Check` 하나뿐입니다**(spec §2.5) — `Skip`과 `Next`가 둘 다
  // 여기를 지나므로 두 군데에 적을 필요가 없습니다. `replace`인 것은 넘긴 표지가
  // 스택에 남을 자리가 아니어서입니다.
  const toPrologueComplete = (unitId: EpisodeIntroUnitId) => {
    dispatch({ type: "replace", screen: { name: "episode-prologue-complete", unitId } });
  };

  return {
    /**
     * 맵의 **표지 항목**을 누르는 자리입니다 — 표지로 들어가는 길은 이것 하나입니다.
     * 이미 끝낸 표지를 다시 눌러도 그대로 섭니다(스텝을 다시 푸는 것과 같은 자리).
     */
    onStartEpisodeIntroUnit: (unitId: EpisodeIntroUnitId) => {
      dispatch({ type: "push", screen: { name: "episode-intro", unitId } });
    },
    // `Skip`은 서사를 건너뛰고 결과 화면으로 갑니다(D5). **「건너뛰면 만점」이 규칙인
    // 것이 아니라** 서사에 채점할 것이 없어 실수도 건너뛴 문항도 0인 것입니다(spec §2.8).
    onSkipEpisodeIntro: toPrologueComplete,
    // `Next`는 서사 전개로 갑니다. 에피소드마다 형식이 하나(통화 · 메신저 · 비주얼 노벨)
    // 이고, 어느 형식이든 끝나면 결과 화면입니다. 표지를 서사로 갈아 끼웁니다(`replace` —
    // 서사에서 뒤로 가면 표지가 아니라 맵입니다). 서사가 없는 에피소드면 `Skip`과 **같은
    // 곳**으로 갑니다 — 그래야 완료를 적는 자리가 하나로 남습니다.
    onNextEpisodeIntro: (unitId: EpisodeIntroUnitId) => {
      const episode = episodeOfIntroUnit(sections, unitId);
      if (prologueFor(episode.id) === undefined) {
        toPrologueComplete(unitId);
        return;
      }
      dispatch({ type: "replace", screen: { name: "episode-prologue", unitId } });
    },
    // 서사 전개가 끝났습니다 — 통화 · 메신저의 `Continue`, 비주얼 노벨의 마지막 장면 뒤.
    onCompletePrologue: toPrologueComplete,
    // 결과 화면의 `Check`입니다. **여기가 완료를 적는 유일한 자리입니다** — 결과 화면에
    // 닿는 것이 곧 완료이고, 그 완료가 곧 뒤 유닛들의 잠김 해제입니다.
    onExitPrologueComplete: (unitId: EpisodeIntroUnitId) => {
      setCompletedEpisodeIntroIds((ids) => completeEpisodeIntroUnit(ids, unitId));
      dispatch({ type: "back" });
    },
    // 표지 · 서사에서 뒤로 나갑니다. 완료로 적지 않습니다 — 결과 화면에 닿은 적이
    // 없기 때문이고, 다음에 표지 항목을 누르면 다시 섭니다.
    onExitEpisodeIntro: () => dispatch({ type: "back" }),
  };
}
