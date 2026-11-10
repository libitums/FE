// 여정 진행과 연속 학습 상태입니다. 미전송 기록·계정별 복구·재시도는 journey-progress-sync가 담당합니다.

import { markCatalogUnitDone } from "../lib/catalog-progress";
import type { CatalogProgress, CatalogUnitKey } from "../lib/catalog-progress";
import { coinBalanceOf } from "../lib/coins";
import { fullTicketLedger } from "../lib/learning-tickets";
import type { TicketLedger } from "../lib/learning-tickets";
import { useEffect, useRef, useState } from "@lynx-js/react";

import { localDayFrom } from "../lib/progress-api";
import { clearStatBump, noStatBumps, recordStatBump } from "../lib/stat-bump";
import type { StatBumpKind, StatBumps } from "../lib/stat-bump";
import { catalogCompletionKeysOf } from "../screens/journey-map/catalog-map";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import type { AppProgressSeed } from "./app-props";
import { loadEpisodeSurveyDone } from "../lib/feedback-api";
import {
  completedActivityCount,
  completedSurveyEpisodesFrom,
  learningDayActivityCount,
  trophyCountFrom,
} from "./learning-progress";
import type { CompletedEpisode, JourneyProgressState } from "./learning-progress";
import { emptyLegacyTutorialRecord, legacyTutorialPassed } from "./legacy-tutorial-progress";
import type { LegacyTutorialRecord } from "./legacy-tutorial-progress";
import { createLearningDaySync } from "./learning-day-sync";
import { createJourneyProgressSync } from "./journey-progress-sync";
import { guestProgressId } from "./guest-progress";
import { createGuestLearningDayStore, createGuestProgressStore } from "./guest-progress-store";
import type { LearningDayHandle, ProgressSyncHandle } from "./guest-progress-store";
import { progressUserId } from "./pending-learning-progress";
import { journeyMapProgressLoadOf } from "./progress-load";
import { useProgressLoad } from "./use-progress-load";

export function useJourneyProgress(
  seed: AppProgressSeed,
  catalogSections: readonly CatalogMapSection[],
) {
  const completionKeysOf = catalogCompletionKeysOf(catalogSections);
  // 옛 튜토리얼 기록은 읽어 둔 값입니다 — 화면도 결선도 바꾸지 않고 불러오기 · 합치기(`apply`)만 바꿉니다.
  const [legacyTutorial, setLegacyTutorial] = useState<LegacyTutorialRecord>(
    seed.legacyTutorial ?? emptyLegacyTutorialRecord,
  );
  // 카탈로그 에피소드 진행 — 표지 컷을 끝내면 결선이 setter로 적습니다.
  const [catalogProgress, setCatalogProgress] = useState<CatalogProgress>(
    seed.catalogProgress ?? {},
  );
  // 학습 티켓 원장 — 진행과 같은 저장 · 병합 경로를 탑니다(`lib/learning-tickets.ts`).
  const [tickets, setTickets] = useState<TicketLedger>(fullTicketLedger);
  // 티켓을 쓰고 연 유닛 — 다시 열 때 티켓을 또 쓰지 않습니다. 원장과 같은 저장 · 병합 경로를 탑니다.
  const [ticketUnits, setTicketUnits] = useState<CatalogProgress>({});
  // 엽전을 받은 유닛(ADR-0116) — 보유 엽전은 여기서 파생합니다. 티켓 유닛과 같은 저장 · 병합 경로를 탑니다.
  const [coinUnits, setCoinUnits] = useState<CatalogProgress>(seed.coinUnits ?? {});
  const [streakDays, setStreakDays] = useState(0);
  // 빈 초기값은 신규 사용자라는 뜻이 아닙니다. 유효한 서버 기록을 합친 뒤에만 안내를 판단합니다.
  // 기기 저장본을 적용한 것만으로는 참이 아닙니다.
  const progressLoad = useProgressLoad();
  const hasLoadedProgress = progressLoad.phase === "loaded";
  // 연속이 **활동으로** 늘었는가입니다 — 머리가 다음에 설 때 연속 학습 모달을 한 번 띄웁니다. 부팅의 불러오기로 받은
  // 값은 축하하지 않습니다.
  const [streakCelebration, setStreakCelebration] = useState(false);
  const streakRef = useRef(0);
  streakRef.current = streakDays;
  // 지표 칩이 굴릴 「오르기 전 값」입니다(ADR-0064). 트로피는 활동이 늘었을 때, 연속은 학습한 날 기록이 일수를 올렸을 때 남깁니다.
  const [statBumps, setStatBumps] = useState<StatBumps>(noStatBumps);
  // 활동으로 끝낸 에피소드의 설문입니다(ADR-0036). 머리가 연속 모달 다음에 띄웁니다. 에피소드마다 한 번만 묻습니다.
  const [episodeSurvey, setEpisodeSurvey] = useState<CompletedEpisode | null>(null);
  // 오늘을 기록하는 중인가입니다. 그동안 설문을 내놓지 않습니다 — 연속이 늘었는지 알기 전에 설문이 먼저 뜨지 않게
  // (연속 모달이 먼저입니다).
  const [recordingDay, setRecordingDay] = useState(false);

  const state: JourneyProgressState = {
    legacyTutorial,
    catalogProgress,
    tickets,
    ticketUnits,
    coinUnits,
  };
  const latest = useRef(state);
  latest.current = state;
  const initial = useRef(state);
  const sync = useRef<ProgressSyncHandle | null>(null);
  const days = useRef<LearningDayHandle | null>(null);
  const renderedSync = sync.current;
  const renderedDays = days.current;
  useEffect(
    () => () => {
      sync.current?.dispose();
      days.current?.dispose();
    },
    [],
  );
  const activityCount = useRef(completedActivityCount(state));
  // 연속 학습의 하루로 세는 활동 수의 직전 값입니다 — 표지는 세지 않습니다(ADR-0035 U2 개정 2026-11-09).
  const dayActivityCount = useRef(learningDayActivityCount(state));
  const completedEpisodeIds = useRef(
    completedSurveyEpisodesFrom(catalogSections, catalogProgress).map((e) => e.id),
  );
  // 트로피 수의 직전 값입니다. 활동 기준과 같이 `apply`(불러오기)가 먼저 맞춰 두므로 불러온 값은 오름이 아닙니다.
  const trophyBaseline = useRef(trophyCountFrom(state, completionKeysOf));

  const apply = (next: JourneyProgressState): void => {
    latest.current = next;
    activityCount.current = completedActivityCount(next);
    dayActivityCount.current = learningDayActivityCount(next);
    completedEpisodeIds.current = completedSurveyEpisodesFrom(
      catalogSections,
      next.catalogProgress,
    ).map((e) => e.id);
    trophyBaseline.current = trophyCountFrom(next, completionKeysOf);
    setLegacyTutorial(next.legacyTutorial);
    setCatalogProgress(next.catalogProgress);
    setTickets(next.tickets ?? fullTicketLedger);
    setTicketUnits(next.ticketUnits ?? {});
    setCoinUnits(next.coinUnits ?? {});
  };

  // 계정이 바뀔 때 앞 계정의 객체 둘을 버리고 화면 상태를 처음으로 되돌립니다.
  const resetForOtherAccount = (): void => {
    sync.current?.dispose();
    days.current?.dispose();
    apply(initial.current);
    setStreakDays(0);
    setStreakCelebration(false);
    setStatBumps(noStatBumps);
    setEpisodeSurvey(null);
    setRecordingDay(false);
  };
  const applyStreak = (streak: number, celebrate: boolean): void => {
    if (celebrate && streak > streakRef.current) {
      const previous = streakRef.current;
      setStreakCelebration(true);
      setStatBumps((bumps) => recordStatBump(bumps, "streak", previous, streak));
    }
    setStreakDays(streak);
  };

  /** 로그인 뒤 호출합니다. 로컬 미전송 진행을 즉시 복구한 다음 서버와 합칩니다. */
  const syncFromServer = async (): Promise<void> => {
    "background only";
    const userId = progressUserId();
    if (userId === null) return;
    if (sync.current?.userId !== userId) {
      if (sync.current !== null) resetForOtherAccount();
      sync.current = createJourneyProgressSync(
        userId,
        () => latest.current,
        apply,
        progressLoad.settle,
      );
      progressLoad.start(sync.current.restoredLocal);
      days.current = createLearningDaySync(userId, applyStreak);
    }
    await Promise.all([sync.current.flush(), days.current?.flush()]);
  };

  /** 비회원 진입 · 재실행 때 기기 전용 객체를 세웁니다(ADR-0111). RPC 0건. 이미 비회원 객체면 아무것도 안 합니다. */
  const startGuestProgress = (): void => {
    "background only";
    if (sync.current?.userId === guestProgressId) return;
    if (sync.current !== null) resetForOtherAccount();
    sync.current = createGuestProgressStore(() => latest.current, apply, progressLoad.settle);
    progressLoad.start(sync.current.restoredLocal);
    days.current = createGuestLearningDayStore(applyStreak);
    void Promise.all([sync.current.flush(), days.current.flush()]);
  };

  useEffect(() => {
    // 계정 전환 이전 렌더에서 예약한 effect는 새 계정에 반영하지 않습니다.
    if (sync.current !== renderedSync) return;
    const count = completedActivityCount(state);
    const grew = count > activityCount.current;
    activityCount.current = count;
    const dayCount = learningDayActivityCount(state);
    const learnedToday = dayCount > dayActivityCount.current;
    dayActivityCount.current = dayCount;
    const episodes = completedSurveyEpisodesFrom(catalogSections, catalogProgress);
    const newlyCompleted = episodes.filter((e) => !completedEpisodeIds.current.includes(e.id));
    completedEpisodeIds.current = episodes.map((e) => e.id);
    const trophies = trophyCountFrom(state, completionKeysOf);
    const trophyBefore = trophyBaseline.current;
    trophyBaseline.current = trophies;
    if (grew) setStatBumps((bumps) => recordStatBump(bumps, "trophy", trophyBefore, trophies));
    if (grew) {
      const done = loadEpisodeSurveyDone();
      const next = newlyCompleted.find((e) => !done.includes(e.id));
      if (next !== undefined) setEpisodeSurvey(next);
    }
    if (learnedToday) {
      setRecordingDay(true);
      void (renderedDays?.record(localDayFrom(new Date())) ?? Promise.resolve())
        .catch(() => undefined)
        .finally(() => {
          if (renderedSync === null || renderedSync.isCurrent()) setRecordingDay(false);
        });
    }

    renderedSync?.capture(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogProgress, tickets, ticketUnits, coinUnits]);

  const onStatBumped = (kind: StatBumpKind): void =>
    setStatBumps((bumps) => clearStatBump(bumps, kind));
  const trophyCount = trophyCountFrom(state, completionKeysOf);
  // 전역 머리의 트로피 칩입니다. 노드가 「확인 중」인 동안(응답을 기다리는 동안)은 0을 보이지 않도록 `null`입니다.
  const progressPending = progressLoad.phase === "checking" || progressLoad.phase === "loading";
  const headerTrophyCount: number | null = progressPending ? null : trophyCount;
  const coinCount = coinBalanceOf(coinUnits);

  return {
    ...state,
    tickets,
    hasLoadedProgress,
    progressLoadPhase: progressLoad.phase,
    wiring: {
      streakDays,
      trophyCount,
      coinCount,
      coinUnits,
      markCoinUnit: (episodeId: string, unitKey: CatalogUnitKey) =>
        setCoinUnits((units) => markCatalogUnitDone(units, episodeId, unitKey)),
      statBumps,
      onStatBumped,
      syncProgress: syncFromServer,
      startGuestProgress,
      journeyMapProgressLoad: journeyMapProgressLoadOf(progressLoad.phase, () => {
        progressLoad.requestRetry();
        void sync.current?.flush();
      }),
    },
    legacyTutorialPassed: legacyTutorialPassed(legacyTutorial),
    setCatalogProgress,
    setTickets,
    ticketUnits,
    markTicketUnit: (episodeId: string, unitKey: CatalogUnitKey) =>
      setTicketUnits((units) => markCatalogUnitDone(units, episodeId, unitKey)),
    streakDays,
    streakCelebration,
    onStreakCelebrated: () => setStreakCelebration(false),
    statBumps,
    onStatBumped,
    episodeSurvey: recordingDay || renderedSync?.userId === guestProgressId ? null : episodeSurvey,
    onEpisodeSurveyClosed: () => setEpisodeSurvey(null),
    trophyCount,
    headerTrophyCount,
    /** 지도 머리의 엽전 칩입니다 — 트로피와 같이 불러오는 동안은 `null`입니다. */
    headerCoinCount: progressPending ? null : coinCount,
    syncFromServer,
  };
}
