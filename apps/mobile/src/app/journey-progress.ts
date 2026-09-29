// 여정 진행의 부팅 값과 파생 도우미입니다. `App.tsx`에서 옮겨 왔습니다 — 셸이 300줄을
// 넘지 않게, 진행의 모양을 한 자리에 모읍니다.

import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import { initialCompletedStepCount } from "../screens/journey-map/journey-map";
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

// 비주얼 노벨의 진행은 완료 id 목록이 아니라 상태 하나입니다(유닛이 하나뿐입니다).
// 여정 맵에 내릴 때(`render-screen.tsx`)와 같은 식으로 목록으로 옮깁니다.
export function completedVisualNovelUnitIdsFrom(
  progress: VisualNovelProgress,
): readonly VisualNovelUnitId[] {
  return progress.status === "completed" ? ["cafe-arrival-visual-novel"] : [];
}
