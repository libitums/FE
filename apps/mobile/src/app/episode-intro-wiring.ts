// 에피소드 서사 표지를 유닛 진입 앞에 끼웁니다. 여정의 유닛 시작 넷을 받아, 표지를 아직
// 보지 않은 에피소드면 유닛 대신 표지를 쌓는 판으로 감쌉니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { JourneyMapSection, JourneyStepId } from "../screens/journey-map/journey-map";
import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../screens/visual-novel/visual-novel.contract";
import type { EpisodeIntroTarget } from "../screens/episode-intro/episode-intro.contract";
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

// 목적지를 표지 없는 시작으로 옮깁니다. `default` 없는 `switch`입니다.
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
    // ⚠ 둘이 같은 일을 합니다. `Next`는 서사 전개(메신저 · 전화 · 대화로 이어지는 학습이
    // 아닌 서사)의 시작이 될 자리인데, 그 전개의 대본이 아직 없습니다. 대본이 오는 날
    // `Next`만 전개로 갈라지고, `Skip`은 지금처럼 유닛으로 곧장 갑니다.
    onSkipEpisodeIntro: continueToTarget,
    onNextEpisodeIntro: continueToTarget,
    // 표지를 본 것으로 적지 않습니다 — 다음에 유닛을 열면 다시 뜹니다.
    onExitEpisodeIntro: () => dispatch({ type: "back" }),
  };
}
