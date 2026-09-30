// 여정 진행의 상태와 서버 저장(ADR-0035)입니다. `AppSession`에서 옮겨 왔습니다 — 진행 여섯 상태 · 연속 학습 · 트로피가
// 한 자리에 있습니다.
//
// - **불러오기** — 로그인(부팅의 세션 갱신 · 새 로그인) 뒤 `syncFromServer`가 서버 진행을 받아 지금 진행과
//   **합칩니다**(완료 목록은 합집합, 스텝 수는 큰 쪽). 한쪽이 앞서도 잃지 않습니다.
// - **저장하기** — 진행이 바뀔 때마다 스냅숏을 저장합니다. 불러오기가 한 번도 성공하지 않았으면 저장하지 않고
//   먼저 다시 불러옵니다 — 실패를 빈 진행으로 읽어 서버를 덮어쓰지 않습니다.
// - **연속 학습** — 끝낸 활동 수가 늘면 오늘(기기 날짜)을 학습한 날로 적고 새 연속 일수를 받습니다.
//
// **모두 기다리지 않고 실패를 삼킵니다** — 진행 저장은 학습을 막지 않습니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import {
  fetchLearningStreak,
  loadLearningProgress,
  localDayFrom,
  recordLearningDay,
  saveLearningProgress,
} from "../lib/progress-api";
import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../screens/episode-intro/episode-intro.contract";
import { journeyMapSections } from "../screens/journey-map/journey-map-units";
import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import type { VisualNovelProgress } from "../screens/visual-novel/visual-novel.contract";
import type { AppJourneySeed } from "./journey-progress";
import {
  completedActivityCount,
  journeyProgressFrom,
  learningProgressSnapshotFrom,
  mergeJourneyProgress,
  trophyCountFrom,
} from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";

export function useJourneyProgress(
  journeySeed: AppJourneySeed,
  initialCompletedEpisodeIntroIds: readonly EpisodeIntroUnitId[],
) {
  const [completedStepCount, setCompletedStepCount] = useState(journeySeed.completedStepCount);
  const [completedMessengerUnitIds, setCompletedMessengerUnitIds] = useState<
    readonly MessengerUnitId[]
  >(journeySeed.completedMessengerUnitIds);
  const [completedPhoneCallUnitIds, setCompletedPhoneCallUnitIds] = useState<
    readonly PhoneCallUnitId[]
  >(journeySeed.completedPhoneCallUnitIds);
  const [visualNovelProgress, setVisualNovelProgress] = useState<VisualNovelProgress>(
    journeySeed.visualNovelProgress,
  );
  const [completedEpisodeFinalIds, setCompletedEpisodeFinalIds] = useState<
    readonly EpisodeFinalUnitId[]
  >(journeySeed.completedEpisodeFinalIds);
  const [completedEpisodeIntroIds, setCompletedEpisodeIntroIds] = useState<
    readonly EpisodeIntroUnitId[]
  >(initialCompletedEpisodeIntroIds);
  const [streakDays, setStreakDays] = useState(0);

  const state: JourneyProgressState = {
    completedStepCount,
    completedMessengerUnitIds,
    completedPhoneCallUnitIds,
    visualNovelProgress,
    completedEpisodeFinalIds,
    completedEpisodeIntroIds,
  };
  const latest = useRef(state);
  latest.current = state;
  // 서버와 같다고 아는 마지막 스냅숏(JSON)입니다. `null`이면 아직 한 번도 불러오지 못했습니다.
  const syncedJson = useRef<string | null>(null);
  const activityCount = useRef(completedActivityCount(state));

  const apply = (next: JourneyProgressState): void => {
    activityCount.current = completedActivityCount(next);
    setCompletedStepCount(next.completedStepCount);
    setCompletedMessengerUnitIds(next.completedMessengerUnitIds);
    setCompletedPhoneCallUnitIds(next.completedPhoneCallUnitIds);
    setVisualNovelProgress(next.visualNovelProgress);
    setCompletedEpisodeFinalIds(next.completedEpisodeFinalIds);
    setCompletedEpisodeIntroIds(next.completedEpisodeIntroIds);
  };

  /** 서버 진행을 받아 지금 진행과 합치고, 연속 일수를 받습니다. 로그인 뒤에 부릅니다. */
  const syncFromServer = async (): Promise<void> => {
    try {
      const loaded = await loadLearningProgress();
      if (loaded.ok) {
        const server = journeyProgressFrom(loaded.raw);
        syncedJson.current =
          server === null ? "" : JSON.stringify(learningProgressSnapshotFrom(server));
        if (server !== null) apply(mergeJourneyProgress(latest.current, server));
      }
      const streak = await fetchLearningStreak(localDayFrom(new Date()));
      if (streak !== null) setStreakDays(streak);
    } catch {
      // 진행 저장은 학습을 막지 않습니다.
    }
  };

  useEffect(() => {
    const count = completedActivityCount(state);
    const grew = count > activityCount.current;
    activityCount.current = count;
    if (grew) {
      void recordLearningDay(localDayFrom(new Date()))
        .then((streak) => {
          if (streak !== null) setStreakDays(streak);
        })
        .catch(() => undefined);
    }

    if (syncedJson.current === null) {
      // 한 번도 불러오지 못했습니다 — 저장 대신 다시 불러와 합칩니다(합친 결과가 다르면 다음 차례에 저장됩니다).
      if (grew) void syncFromServer();
      return;
    }
    const json = JSON.stringify(learningProgressSnapshotFrom(state));
    if (json === syncedJson.current) return;
    syncedJson.current = json;
    void saveLearningProgress(learningProgressSnapshotFrom(state)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    completedStepCount,
    completedMessengerUnitIds,
    completedPhoneCallUnitIds,
    visualNovelProgress,
    completedEpisodeFinalIds,
    completedEpisodeIntroIds,
  ]);

  return {
    ...state,
    setCompletedStepCount,
    setCompletedMessengerUnitIds,
    setCompletedPhoneCallUnitIds,
    setVisualNovelProgress,
    setCompletedEpisodeFinalIds,
    setCompletedEpisodeIntroIds,
    streakDays,
    trophyCount: trophyCountFrom(journeyMapSections, state),
    syncFromServer,
  };
}
