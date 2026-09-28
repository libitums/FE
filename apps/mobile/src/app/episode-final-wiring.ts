// 에피소드 최종 테스트의 결선입니다 — 맵에서 열기 · 마지막 문항 뒤 학습 완료로 갈아타기 ·
// 학습 완료의 `Check`로 끝낸 것으로 적고 맵으로 돌아가기 · 나가기.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import type { NavAction } from "./nav-state";

export type EpisodeFinalWiring = {
  readonly completedEpisodeFinalIds: readonly EpisodeFinalUnitId[];
  readonly onStartEpisodeFinal: (id: EpisodeFinalUnitId) => void;
  readonly onFinishEpisodeFinal: (id: EpisodeFinalUnitId, results: readonly AnswerResult[]) => void;
  readonly onCompleteEpisodeFinal: (id: EpisodeFinalUnitId) => void;
  readonly onExitEpisodeFinal: () => void;
};

export type EpisodeFinalWiringArgs = {
  readonly dispatch: Dispatch<NavAction>;
  readonly completedEpisodeFinalIds: readonly EpisodeFinalUnitId[];
  readonly setCompletedEpisodeFinalIds: Dispatch<SetStateAction<readonly EpisodeFinalUnitId[]>>;
};

export function episodeFinalWiring(args: EpisodeFinalWiringArgs): EpisodeFinalWiring {
  const { dispatch, completedEpisodeFinalIds, setCompletedEpisodeFinalIds } = args;
  return {
    completedEpisodeFinalIds,
    // 맵의 항목이 잠겨 있으면 여기까지 오지 않습니다 — 막는 것은 맵 항목입니다.
    onStartEpisodeFinal: (id) => {
      dispatch({ type: "push", screen: { name: "episode-final", unitId: id } });
    },
    // 테스트를 학습 완료로 갈아탑니다(`replace`) — 완료 화면의 `Check`가 맵으로 곧장 돌아가게.
    onFinishEpisodeFinal: (id, results) => {
      dispatch({
        type: "replace",
        screen: { name: "episode-final-complete", unitId: id, results },
      });
    },
    // 끝낸 것으로 적는 자리는 여기 하나입니다 — 문항을 다 풀고 결과를 본 뒤입니다. 틀린
    // 문항이 있어도 에피소드는 끝납니다(정답을 보여 주고 넘어가는 결정, 2026-09-28).
    onCompleteEpisodeFinal: (id) => {
      setCompletedEpisodeFinalIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
      dispatch({ type: "back" });
    },
    // 풀던 도중 나가면 적지 않습니다 — 다시 들어오면 첫 문항부터입니다.
    onExitEpisodeFinal: () => {
      dispatch({ type: "back" });
    },
  };
}
