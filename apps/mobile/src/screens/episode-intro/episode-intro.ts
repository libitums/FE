// 에피소드 서사 표지의 순수 로직입니다. DOM · 컴포넌트를 만지지 않습니다.

import type { JourneyMapSection } from "../journey-map/journey-map";
import type { EpisodeIntroTarget } from "./episode-intro.contract";

// 표지의 목적지가 맵의 어느 항목인지 봅니다. 판별은 `default` 없는 `switch`입니다 —
// 목적지 종류가 늘면 반환 경로가 비어 `TS2366`이 섭니다.
function targetsItem(target: EpisodeIntroTarget, item: JourneyMapSection["items"][number]) {
  switch (target.kind) {
    case "step": {
      return item.kind === "standard" && item.step.id === target.stepId;
    }
    case "messenger": {
      return item.kind === "special" && item.id === target.unitId;
    }
    case "phone-call": {
      return item.kind === "phone-call" && item.id === target.unitId;
    }
    case "visual-novel": {
      return item.kind === "visual-novel" && item.id === target.unitId;
    }
  }
}

/**
 * 목적지 유닛이 속한 에피소드의 구획을 찾습니다. 맵의 구획을 인자로 받습니다 — 여정의
 * 값을 이 폴더가 직접 볼 수 없습니다(`code.md` 「import」).
 *
 * 없으면 던집니다. 목적지는 맵의 항목을 누른 데서 오므로, 어느 구획에도 없다면 데이터
 * 오류이고 값으로 표현할 수 있는 상태가 아닙니다.
 */
export function sectionOfTarget(
  sections: readonly JourneyMapSection[],
  target: EpisodeIntroTarget,
): JourneyMapSection {
  const section = sections.find((candidate) =>
    candidate.items.some((item) => targetsItem(target, item)),
  );
  if (section === undefined) {
    throw new Error(`어느 에피소드에도 없는 유닛입니다: ${JSON.stringify(target)}`);
  }
  return section;
}

/** 표지를 이미 본 에피소드인지 봅니다. */
export function hasSeenEpisodeIntro(seen: readonly string[], episodeId: string): boolean {
  return seen.includes(episodeId);
}

/** 본 에피소드를 더합니다. 이미 있으면 같은 참조를 돌려줍니다 — 다시 그릴 이유가 없습니다. */
export function markEpisodeIntroSeen(
  seen: readonly string[],
  episodeId: string,
): readonly string[] {
  return seen.includes(episodeId) ? seen : [...seen, episodeId];
}
