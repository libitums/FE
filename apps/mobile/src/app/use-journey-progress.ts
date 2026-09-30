// 여정 진행과 연속 학습 상태입니다. 미전송 기록·계정별 복구·재시도는 journey-progress-sync가 담당합니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { fetchLearningStreak, localDayFrom, recordLearningDay } from "../lib/progress-api";
import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../screens/episode-intro/episode-intro.contract";
import { journeyMapSections } from "../screens/journey-map/journey-map-units";
import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import type { VisualNovelProgress } from "../screens/visual-novel/visual-novel.contract";
import type { AppJourneySeed } from "./journey-progress";
import { loadEpisodeSurveyDone } from "../lib/feedback-api";
import {
  completedActivityCount,
  completedEpisodesFrom,
  trophyCountFrom,
} from "./learning-progress";
import type { CompletedEpisode, JourneyProgressState } from "./learning-progress";
import { createJourneyProgressSync } from "./journey-progress-sync";
import { progressUserId } from "./pending-learning-progress";

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
  // 연속이 **활동으로** 늘었는가입니다 — 머리가 다음에 설 때 연속 학습 모달을 한 번 띄웁니다. 부팅의 불러오기로 받은
  // 값은 축하하지 않습니다.
  const [streakCelebration, setStreakCelebration] = useState(false);
  const streakRef = useRef(0);
  streakRef.current = streakDays;
  // 활동으로 끝낸 에피소드의 설문입니다(ADR-0036). 머리가 연속 모달 다음에 띄웁니다. 에피소드마다 한 번만 묻습니다.
  const [episodeSurvey, setEpisodeSurvey] = useState<CompletedEpisode | null>(null);
  // 오늘을 기록하는 중인가입니다. 그동안 설문을 내놓지 않습니다 — 연속이 늘었는지 알기 전에 설문이 먼저 뜨지 않게
  // (연속 모달이 먼저입니다).
  const [recordingDay, setRecordingDay] = useState(false);

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
  const initial = useRef(state);
  const sync = useRef<ReturnType<typeof createJourneyProgressSync> | null>(null);
  const renderedSync = sync.current;
  useEffect(() => () => sync.current?.dispose(), []);
  const activityCount = useRef(completedActivityCount(state));
  const completedEpisodeIds = useRef(
    completedEpisodesFrom(journeyMapSections, state).map((e) => e.id),
  );

  const apply = (next: JourneyProgressState): void => {
    latest.current = next;
    activityCount.current = completedActivityCount(next);
    completedEpisodeIds.current = completedEpisodesFrom(journeyMapSections, next).map((e) => e.id);
    setCompletedStepCount(next.completedStepCount);
    setCompletedMessengerUnitIds(next.completedMessengerUnitIds);
    setCompletedPhoneCallUnitIds(next.completedPhoneCallUnitIds);
    setVisualNovelProgress(next.visualNovelProgress);
    setCompletedEpisodeFinalIds(next.completedEpisodeFinalIds);
    setCompletedEpisodeIntroIds(next.completedEpisodeIntroIds);
  };

  /** 로그인 뒤 호출합니다. 로컬 미전송 진행을 즉시 복구한 다음 서버와 합칩니다. */
  const syncFromServer = async (): Promise<void> => {
    "background only";
    const userId = progressUserId();
    if (userId === null) return;
    if (sync.current?.userId !== userId) {
      if (sync.current !== null) {
        sync.current.dispose();
        apply(initial.current);
        setStreakDays(0);
        setStreakCelebration(false);
        setEpisodeSurvey(null);
        setRecordingDay(false);
      }
      sync.current = createJourneyProgressSync(userId, () => latest.current, apply);
    }
    const current = sync.current;
    await current.flush();
    if (!current.isCurrent()) return;
    const streak = await fetchLearningStreak(localDayFrom(new Date()));
    if (current.isCurrent() && streak !== null) setStreakDays(streak);
  };

  useEffect(() => {
    // 계정 전환 이전 렌더에서 예약한 effect는 새 계정에 반영하지 않습니다.
    if (sync.current !== renderedSync) return;
    const count = completedActivityCount(state);
    const grew = count > activityCount.current;
    activityCount.current = count;
    const episodes = completedEpisodesFrom(journeyMapSections, state);
    const newlyCompleted = episodes.filter((e) => !completedEpisodeIds.current.includes(e.id));
    completedEpisodeIds.current = episodes.map((e) => e.id);
    if (grew) {
      const done = loadEpisodeSurveyDone();
      const next = newlyCompleted.find((e) => !done.includes(e.id));
      if (next !== undefined) setEpisodeSurvey(next);
    }
    if (grew) {
      setRecordingDay(true);
      void recordLearningDay(localDayFrom(new Date()))
        .then((streak) => {
          if (streak === null || (renderedSync !== null && !renderedSync.isCurrent())) return;
          if (streak > streakRef.current) setStreakCelebration(true);
          setStreakDays(streak);
        })
        .catch(() => undefined)
        .finally(() => {
          if (renderedSync === null || renderedSync.isCurrent()) setRecordingDay(false);
        });
    }

    renderedSync?.capture(state);
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
    streakCelebration,
    onStreakCelebrated: () => setStreakCelebration(false),
    episodeSurvey: recordingDay ? null : episodeSurvey,
    onEpisodeSurveyClosed: () => setEpisodeSurvey(null),
    trophyCount: trophyCountFrom(journeyMapSections, state),
    syncFromServer,
  };
}
