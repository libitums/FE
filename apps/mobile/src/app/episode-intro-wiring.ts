// 에피소드 서사 표지를 유닛 진입 앞에 끼웁니다. 여정의 유닛 시작 넷을 받아, 표지를 아직
// 보지 않은 에피소드면 유닛 대신 표지를 쌓는 판으로 감쌉니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { JourneyMapSection, JourneyStepId } from "../screens/journey-map/journey-map";
import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../screens/visual-novel/visual-novel.contract";
import type {
  EpisodeIntroTarget,
  EpisodeIntroUnitId,
  EpisodePrologue,
} from "../screens/episode-intro/episode-intro.contract";
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
  /** 그 에피소드의 서사 전개입니다. 없으면 표지의 `Next`가 곧장 유닛을 엽니다. */
  readonly prologueFor: (episodeId: string) => EpisodePrologue | undefined;
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

/**
 * 표지 유닛이 속한 구획입니다. `episodeOfIntroUnit`은 **에피소드**만 돌려주는데
 * 여기서는 그 구획의 항목 목록까지 봐야 해서(아래 `firstTargetOf`) 따로 찾습니다.
 * 없으면 던집니다 — 맵의 항목을 누른 데서 온 id라 어느 구획에도 없다면 데이터 오류입니다.
 */
function sectionOfEpisodeIntroUnit(
  sections: readonly JourneyMapSection[],
  unitId: EpisodeIntroUnitId,
): JourneyMapSection {
  const section = sections.find((candidate) =>
    candidate.items.some((item) => item.kind === "episode-intro" && item.id === unitId),
  );
  if (section === undefined) {
    throw new Error(`어느 에피소드에도 없는 표지 유닛입니다: ${unitId}`);
  }
  return section;
}

/** 맵 항목을 표지의 목적지로 옮깁니다. 표지 자신과 최종 테스트는 목적지가 아닙니다. */
function targetOfItem(item: JourneyMapSection["items"][number]): EpisodeIntroTarget | undefined {
  switch (item.kind) {
    case "standard": {
      return { kind: "step", stepId: item.step.id };
    }
    case "messenger": {
      return { kind: "messenger", unitId: item.id };
    }
    case "phone-call": {
      return { kind: "phone-call", unitId: item.id };
    }
    case "visual-novel": {
      return { kind: "visual-novel", unitId: item.id };
    }
    case "episode-intro":
    case "episode-final": {
      return undefined;
    }
  }
}

/**
 * 구획의 첫 목적지 유닛입니다 — 표지를 직접 눌렀을 때 실어 둘 값입니다(위 임시 주석).
 * 없으면 던집니다: 목적지가 될 수 있는 항목이 하나도 없는 구획은 표지만 있고 학습이
 * 없다는 뜻이고, 값으로 표현할 수 있는 상태가 아닙니다.
 */
function firstTargetOf(section: JourneyMapSection): EpisodeIntroTarget {
  for (const item of section.items) {
    const target = targetOfItem(item);
    if (target !== undefined) {
      return target;
    }
  }
  throw new Error(`목적지가 될 유닛이 없는 에피소드입니다: ${section.episode.id}`);
}

export function episodeIntroWiring(args: EpisodeIntroWiringArgs) {
  const { sections, seenEpisodeIntroIds, setSeenEpisodeIntroIds, dispatch, starts, prologueFor } =
    args;

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
    /**
     * 맵의 **표지 항목을 직접** 누르는 자리입니다. 표지가 스스로 유닛이 되면서
     * (ADR-0024 D2) 생긴 경로이고, 오늘까지 표지는 다른 유닛 앞에 끼어들 때만 섰습니다.
     * `gate`를 거치지 않습니다 — 이미 끝낸 표지를 다시 누르면 다시 보여야 하는데,
     * `gate`는 본 표지를 건너뛰고 유닛을 엽니다.
     *
     * ⚠ **`target`은 임시입니다.** 표지가 유닛이 되면 route가 「넘긴 뒤 열 유닛」을
     * 싣지 않게 되고(spec §2.5) 표지의 `Skip`은 유닛이 아니라 결과 화면으로 갑니다(D5).
     * 그 걷어내기는 `nav-state` · `episode-intro.contract`를 함께 움직이는 일이라
     * `integration` 변형의 몫입니다. 그때까지는 그 구획의 **첫 목적지 유닛**을 실어
     * 오늘 흐름을 그대로 둡니다 — 값을 지어내지 않고 맵 데이터에서 파생합니다.
     */
    onStartEpisodeIntroUnit: (unitId: EpisodeIntroUnitId) => {
      const section = sectionOfEpisodeIntroUnit(sections, unitId);
      dispatch({
        type: "push",
        screen: {
          name: "episode-intro",
          episodeId: section.episode.id,
          target: firstTargetOf(section),
        },
      });
    },
    onStartStep: (stepId: JourneyStepId) => gate({ kind: "step", stepId }),
    onStartMessengerUnit: (unitId: MessengerUnitId) => gate({ kind: "messenger", unitId }),
    onStartPhoneCallUnit: (unitId: PhoneCallUnitId) => gate({ kind: "phone-call", unitId }),
    onStartVisualNovelUnit: (unitId: VisualNovelUnitId) => gate({ kind: "visual-novel", unitId }),
    // `Skip`은 서사를 건너뛰고 유닛으로 곧장 갑니다.
    onSkipEpisodeIntro: continueToTarget,
    // `Next`는 서사 전개로 갑니다. 에피소드마다 형식이 하나(통화 · 메신저 · 비주얼 노벨)이고
    // 어느 형식이든 끝나면 학습 완료 → 맵입니다. 표지를 서사로 갈아 끼웁니다(`replace` —
    // 서사에서 뒤로 가면 표지가 아니라 맵입니다). 서사가 없는 에피소드면 `Skip`처럼 유닛으로
    // 곧장 갑니다. 여기서는 본 것으로 적지 않습니다 — 서사 전개를 끝까지 마쳤을 때 적습니다.
    onNextEpisodeIntro: (episodeId: string, target: EpisodeIntroTarget) => {
      if (prologueFor(episodeId) === undefined) {
        continueToTarget(episodeId, target);
        return;
      }
      dispatch({ type: "replace", screen: { name: "episode-prologue", episodeId, target } });
    },
    // 서사 전개가 끝났습니다 — 통화 · 메신저의 `Continue`, 비주얼 노벨의 마지막 장면 뒤.
    // 서사를 학습 완료 화면으로 갈아 끼웁니다(`replace` — 완료 화면에서 돌아갈 곳은 서사가
    // 아닙니다).
    onCompletePrologue: (episodeId: string) => {
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
    // 표지 · 서사에서 뒤로 나갑니다. 본 것으로 적지 않습니다 — 다음에 유닛을 열면 표지부터
    // 다시 뜹니다.
    onExitEpisodeIntro: () => dispatch({ type: "back" }),
  };
}
