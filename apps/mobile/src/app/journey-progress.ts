// 여정 진행의 부팅 값과 파생 도우미입니다. `App.tsx`에서 옮겨 왔습니다 — 셸이 300줄을
// 넘지 않게, 진행의 모양을 한 자리에 모읍니다.

import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../screens/episode-intro/episode-intro.contract";
import { initialCompletedStepCount, journeyMapSections } from "../screens/journey-map/journey-map";
import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import { initialVisualNovelProgress } from "../screens/visual-novel/visual-novel";
import type {
  VisualNovelProgress,
  VisualNovelUnitId,
} from "../screens/visual-novel/visual-novel.contract";

/**
 * 부팅할 때의 여정 진행입니다. 주지 않으면 제품의 씨앗(`initialCompletedStepCount` · 빈
 * 완료 목록)으로 시작합니다.
 *
 * 있는 이유는 **진행이 열어 주는 화면**입니다. 롤플레이는 에피소드를 다 끝내야 열리는데,
 * 그 상태에 닿으려면 유닛 여덟을 모두 지나야 합니다 — 열린 뒤의 동작을 보려는 자리
 * (integration · 개발 중 확인)가 그 길을 매번 걷지 않게 합니다. 제품 진입점은 이 값을
 * 주지 않습니다.
 */
export type AppJourneySeed = {
  readonly completedStepCount: number;
  readonly completedMessengerUnitIds: readonly MessengerUnitId[];
  readonly completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  readonly visualNovelProgress: VisualNovelProgress;
  readonly completedEpisodeFinalIds: readonly EpisodeFinalUnitId[];
};

export const productJourneySeed: AppJourneySeed = {
  completedStepCount: initialCompletedStepCount,
  completedMessengerUnitIds: [],
  completedPhoneCallUnitIds: [],
  visualNovelProgress: initialVisualNovelProgress(),
  completedEpisodeFinalIds: [],
};

/**
 * 끝낸 표지를 **표지 유닛 id**로 셉니다.
 *
 * 완료의 출처는 아직 `seenEpisodeIntroIds`이고 그것은 **에피소드 id**를 듭니다 — 옛
 * 가로채기 게이트가 에피소드 축이었기 때문입니다. 계약(spec §2.5)은 그 상태 자체를
 * `completedEpisodeIntroIds`로 개명하지만, 그것은 `episodeIntroWiring`의 완료 기록 자리를
 * 함께 옮기는 일이라 `integration` 변형의 몫입니다. 그때까지 두 어휘를 **맵 데이터로**
 * 잇습니다 — 유닛 id를 리터럴로 적으면 데이터와 갈릴 자리가 생깁니다.
 *
 * 비주얼 노벨의 `completedVisualNovelUnitIdsFrom`과 같은 갈래입니다 — 진행의 한 출처를
 * 맵이 세는 모양으로 옮기는 자리입니다.
 */
export function completedEpisodeIntroUnitIdsFrom(
  seenEpisodeIntroIds: readonly string[],
): readonly EpisodeIntroUnitId[] {
  return journeyMapSections.flatMap((section) =>
    seenEpisodeIntroIds.includes(section.episode.id)
      ? section.items.flatMap((item) => (item.kind === "episode-intro" ? [item.id] : []))
      : [],
  );
}

// 비주얼 노벨의 진행은 완료 id 목록이 아니라 상태 하나입니다(유닛이 하나뿐입니다).
// 여정 맵에 내릴 때(`render-screen.tsx`)와 같은 식으로 목록으로 옮깁니다.
export function completedVisualNovelUnitIdsFrom(
  progress: VisualNovelProgress,
): readonly VisualNovelUnitId[] {
  return progress.status === "completed" ? ["cafe-arrival-visual-novel"] : [];
}
