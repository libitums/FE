// 에피소드 서사 표지의 순수 로직입니다. DOM · 컴포넌트를 만지지 않습니다.

import type { JourneyEpisode, JourneyMapSection } from "../journey-map/journey-map";
import type { EpisodeIntroUnitId } from "./episode-intro.contract";

/**
 * 그 표지 유닛이 속한 에피소드입니다. 맵의 구획을 인자로 받습니다 — 여정의 값을 이
 * 폴더가 직접 볼 수 없습니다(`code.md` 「import」).
 *
 * 찾는 축이 구획의 **맵 항목**인 것은, 표지 route가 맵의 표지 **항목**을 누른 데서만
 * 오기 때문입니다. 돌려주는 것은 구획이 아니라 **에피소드**입니다 — 표지 화면이 쓰는
 * 것은 머리 두 줄(`label` · `title`)이고 맵 항목 목록이 아닙니다.
 *
 * 없으면 던집니다. 어느 구획에도 없다면 데이터 오류이고 값으로 표현할 수 있는 상태가
 * 아닙니다 — `undefined`를 돌려주면 그 판단이 소비자에게 흩어집니다.
 */
export function episodeOfIntroUnit(
  sections: readonly JourneyMapSection[],
  unitId: EpisodeIntroUnitId,
): JourneyEpisode {
  const section = sections.find((candidate) =>
    candidate.items.some((item) => item.kind === "episode-intro" && item.id === unitId),
  );
  if (section === undefined) {
    throw new Error(`어느 에피소드에도 없는 표지 유닛입니다: ${unitId}`);
  }
  return section.episode;
}

/**
 * 끝낸 표지를 더합니다. 이미 있으면 **같은 참조**를 돌려줍니다 — 새 배열을 내면 값이
 * 같아도 아래로 내려가는 참조가 바뀌어 다시 그릴 이유가 없는 화면이 다시 그려집니다.
 * `completeMessengerUnit`과 같은 형태입니다.
 */
export function completeEpisodeIntroUnit(
  ids: readonly EpisodeIntroUnitId[],
  id: EpisodeIntroUnitId,
): readonly EpisodeIntroUnitId[] {
  return ids.includes(id) ? ids : [...ids, id];
}
