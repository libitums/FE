// 에피소드 서사 표지의 순수 로직입니다. DOM · 컴포넌트를 만지지 않습니다.

import type { JourneyEpisode, JourneyMapSection } from "../journey-map/journey-map";
import type { EpisodeIntroTarget, EpisodeIntroUnitId } from "./episode-intro.contract";

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

// ⚠ 아래 셋(`sectionOfTarget` · `hasSeenEpisodeIntro` · `markEpisodeIntroSeen`)은 계약이
// **삭제하기로** 한 것입니다(spec §2.5) — 표지가 스스로 유닛이 되면서 가로채는 게이트가
// 걷히고 「넘긴 뒤 열 유닛」도 「봤다」는 어휘도 설 자리가 없어집니다. 그 걷어내기는
// `episode-intro-wiring.ts`를 함께 움직이는 일이라 `integration` 변형의 몫이고, 그때까지
// 결선이 이것들을 쓰고 있어 남겨 둡니다.

// 표지의 목적지가 맵의 어느 항목인지 봅니다. 판별은 `default` 없는 `switch`입니다 —
// 목적지 종류가 늘면 반환 경로가 비어 `TS2366`이 섭니다 — 반환 타입을 적어야 그
// 검사가 걸립니다.
function targetsItem(
  target: EpisodeIntroTarget,
  item: JourneyMapSection["items"][number],
): boolean {
  switch (target.kind) {
    case "step": {
      return item.kind === "standard" && item.step.id === target.stepId;
    }
    case "messenger": {
      return item.kind === "messenger" && item.id === target.unitId;
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
