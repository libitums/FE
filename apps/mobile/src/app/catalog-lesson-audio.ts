// 활동 하나가 받는 `LessonAudio`를 짓습니다 — 레슨 결선과 세션 옵션, 호스트 지원 여부를 묶습니다.

import { slowPlaybackSupport } from "../lib/audio";
import type { CatalogUnitKey } from "../lib/catalog-progress";
import { autoPlayAudioOf } from "../lib/question-audio";
import type { LessonAudio } from "../lib/question-audio";
import type { SessionOptions } from "../lib/session-options";
import type { CatalogListenWiring } from "./catalog-listen-wiring";

export function catalogLessonAudioOf(
  wiring: CatalogListenWiring & { readonly sessionOptions: SessionOptions },
  episodeId: string,
  unitKey: CatalogUnitKey,
): LessonAudio {
  return {
    pace: wiring.listenPace,
    slowPlayback: slowPlaybackSupport(),
    autoPlay: autoPlayAudioOf(wiring.sessionOptions),
    onTogglePace: wiring.onToggleListenPace,
    onListenItemAnswered: (report) => wiring.onListenItemAnswered(episodeId, unitKey, report),
  };
}
