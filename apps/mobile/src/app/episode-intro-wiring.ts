// 에피소드 서사 표지를 유닛 진입 앞에 끼웁니다. 여정의 유닛 시작 넷을 받아, 표지를 아직
// 보지 않은 에피소드면 유닛 대신 표지를 쌓는 판으로 감쌉니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { JourneyMapSection, JourneyStepId } from "../screens/journey-map/journey-map";
import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../screens/visual-novel/visual-novel.contract";
import type { EpisodeIntroTarget } from "../screens/episode-intro/episode-intro.contract";
import { prologueCallFor } from "../screens/episode-intro/prologue-call";
import {
  hasSeenEpisodeIntro,
  markEpisodeIntroSeen,
  sectionOfTarget,
} from "../screens/episode-intro/episode-intro";
import type { NavAction } from "./nav-state";

/** 표지 없이 유닛을 여는 시작 넷입니다. 여정 결선이 만든 그대로입니다. */
export type UnitStarts = {
  readonly onStartStep: (id: JourneyStepId) => void;
  readonly onStartMessengerUnit: (id: MessengerUnitId) => void;
  readonly onStartPhoneCallUnit: (id: PhoneCallUnitId) => void;
  readonly onStartVisualNovelUnit: (id: VisualNovelUnitId) => void;
};

export type EpisodeIntroWiringArgs = {
  readonly sections: readonly JourneyMapSection[];
  readonly seenEpisodeIntroIds: readonly string[];
  readonly setSeenEpisodeIntroIds: Dispatch<SetStateAction<readonly string[]>>;
  readonly dispatch: Dispatch<NavAction>;
  readonly starts: UnitStarts;
};

// 목적지를 표지 없는 시작으로 옮깁니다. 돌려주는 값이 없어 빠진 갈래를 `TS2366`이
// 잡지 못하므로, `default`의 `never` 대입이 망라를 집니다(`render-screen.tsx`와 같은 형태).
function startTarget(starts: UnitStarts, target: EpisodeIntroTarget): void {
  switch (target.kind) {
    case "step": {
      starts.onStartStep(target.stepId);
      return;
    }
    case "messenger": {
      starts.onStartMessengerUnit(target.unitId);
      return;
    }
    case "phone-call": {
      starts.onStartPhoneCallUnit(target.unitId);
      return;
    }
    case "visual-novel": {
      starts.onStartVisualNovelUnit(target.unitId);
      return;
    }
    default: {
      const exhaustive: never = target;
      return exhaustive;
    }
  }
}

export function episodeIntroWiring(args: EpisodeIntroWiringArgs) {
  const { sections, seenEpisodeIntroIds, setSeenEpisodeIntroIds, dispatch, starts } = args;

  // 표지를 봤으면 곧장 열고, 아니면 표지를 쌓습니다. 표지는 유닛을 대신하지 않습니다 —
  // 목적지를 route에 실어 두고, 표지를 넘기는 순간 그 유닛을 엽니다.
  const gate = (target: EpisodeIntroTarget) => {
    const { episode } = sectionOfTarget(sections, target);
    if (hasSeenEpisodeIntro(seenEpisodeIntroIds, episode.id)) {
      startTarget(starts, target);
      return;
    }
    dispatch({ type: "push", screen: { name: "episode-intro", episodeId: episode.id, target } });
  };

  // 표지를 넘깁니다. 본 것으로 적고, 표지를 걷고(`back`), 목적지를 엽니다 — 유닛에서
  // 나가면 표지가 아니라 맵으로 돌아옵니다.
  const continueToTarget = (episodeId: string, target: EpisodeIntroTarget) => {
    setSeenEpisodeIntroIds((seen) => markEpisodeIntroSeen(seen, episodeId));
    dispatch({ type: "back" });
    startTarget(starts, target);
  };

  return {
    onStartStep: (stepId: JourneyStepId) => gate({ kind: "step", stepId }),
    onStartMessengerUnit: (unitId: MessengerUnitId) => gate({ kind: "messenger", unitId }),
    onStartPhoneCallUnit: (unitId: PhoneCallUnitId) => gate({ kind: "phone-call", unitId }),
    onStartVisualNovelUnit: (unitId: VisualNovelUnitId) => gate({ kind: "visual-novel", unitId }),
    // `Skip`은 서사를 건너뛰고 유닛으로 곧장 갑니다.
    onSkipEpisodeIntro: continueToTarget,
    // `Next`는 서사 전개로 갑니다. 그 에피소드에 서사 통화가 있으면 표지를 통화로 갈아
    // 끼우고(`replace` — 통화에서 뒤로 가면 표지가 아니라 맵입니다), 없으면 `Skip`처럼
    // 유닛으로 곧장 갑니다.
    onNextEpisodeIntro: (episodeId: string, target: EpisodeIntroTarget) => {
      if (prologueCallFor(episodeId) === undefined) {
        continueToTarget(episodeId, target);
        return;
      }
      dispatch({ type: "replace", screen: { name: "episode-prologue-call", episodeId, target } });
    },
    // 끝난 통화의 `Continue`입니다. 통화를 학습 완료 화면으로 갈아 끼웁니다(`replace` —
    // 완료 화면에서 돌아갈 곳은 통화가 아닙니다).
    onCompletePrologueCall: (episodeId: string) => {
      dispatch({ type: "replace", screen: { name: "episode-prologue-complete", episodeId } });
    },
    // 학습 완료 화면의 `Check`입니다. 서사를 본 것으로 적고 **여정 맵으로 돌아갑니다** —
    // 누른 유닛을 곧장 열지 않습니다. 서사를 마친 자리는 학습의 끝과 같아서, 학습을
    // 통과했을 때처럼 맵으로 돌아와 다음을 고르게 합니다. 유닛은 맵에서 다시 누르면
    // 표지 없이 열립니다.
    onExitPrologueComplete: (episodeId: string) => {
      setSeenEpisodeIntroIds((seen) => markEpisodeIntroSeen(seen, episodeId));
      dispatch({ type: "back" });
    },
    // 표지를 본 것으로 적지 않습니다 — 다음에 유닛을 열면 다시 뜹니다.
    onExitEpisodeIntro: () => dispatch({ type: "back" }),
  };
}
