import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { TopBar } from "../components/TopBar";
import type { FeedbackRating } from "../lib/feedback.contract";
import { EpisodeSurveySheet } from "../screens/episode-survey/EpisodeSurveySheet";
import { JourneyStatModal } from "../screens/journey-map/JourneyStatModal";
import {
  streakTrack,
  trophyTrack,
  type JourneyStatKind,
} from "../screens/journey-map/journey-stat";

// 전역 레이아웃의 머리입니다 — 탭 루트 화면(여정 · 롤플레이 · 설정) 위에 바텀
// 네비게이션과 짝으로 섭니다. 지표 칩 둘과 알림 버튼(`TopBar`), 연속 학습 · 트로피 모달을 집니다.
//
// 레이어 열림은 이 컴포넌트가 소유합니다 — 레이어는 화면 위에 겹칠 뿐 화면 전환이 아니라
// `Nav`가 관여하지 않습니다(ADR-0007 D3). 전에는 여정 맵이 지표 모달을 소유했는데,
// 머리가 셸로 올라오면서 모달도 함께 올라왔습니다.

type AppHeaderLayer = JourneyStatKind | "survey";

export type AppHeaderProps = {
  readonly streakDays: number;
  readonly trophyCount: number;
  readonly onOpenNotifications: () => void;
  /**
   * 화면 쪽 겹침 레이어(여정의 스텝 말풍선 · 롤플레이의 플러스 안내)가 떠 있는가입니다.
   * 그 동안 머리를 낭독에서 가립니다 — 레이어가 머리 위를 덮지 않아도 뒤쪽은 조작
   * 대상이 아닙니다(ADR-0016 D9).
   */
  readonly obscured?: boolean;
  /**
   * 오늘의 요일입니다(`Date#getDay()`, 0 = 일). 연속 학습 모달의 요일 줄이 여기서
   * 시작점을 셉니다. 넘기지 않으면 기기 시계를 읽습니다.
   */
  readonly todayWeekday?: number;
  /**
   * 활동을 끝내 연속이 늘었는가입니다(ADR-0035). 머리가 설 때 참이면 연속 학습 모달을 **한 번** 스스로 열고
   * `onStreakCelebrated`로 알립니다 — 결과 화면에서 맵으로 돌아온 순간 새 일수를 보여 줍니다.
   */
  readonly celebrateStreak?: boolean;
  readonly onStreakCelebrated?: () => void;
  /**
   * 활동으로 끝낸 에피소드의 설문입니다(ADR-0036). 연속 모달이 먼저이고, 레이어가 모두 닫히면 뜹니다. 답하거나
   * 건너뛰면 `onEpisodeSurveyClosed`가 불립니다.
   */
  readonly episodeSurvey?: { readonly id: string; readonly title: string } | null;
  readonly onAnswerEpisodeSurvey?: (episodeId: string, rating: FeedbackRating) => void;
  readonly onSkipEpisodeSurvey?: (episodeId: string) => void;
};

export function AppHeader({
  streakDays,
  trophyCount,
  onOpenNotifications,
  obscured = false,
  todayWeekday,
  celebrateStreak = false,
  onStreakCelebrated,
  episodeSurvey = null,
  onAnswerEpisodeSurvey,
  onSkipEpisodeSurvey,
}: AppHeaderProps): ReactNode {
  const [openLayer, setOpenLayer] = useState<AppHeaderLayer | null>(null);
  const close = () => setOpenLayer(null);

  // 다른 레이어가 떠 있거나 화면 쪽 레이어가 덮고 있으면 기다립니다 — 겹쳐 띄우지 않습니다.
  useEffect(() => {
    if (!celebrateStreak || openLayer !== null || obscured) return;
    setOpenLayer("streak");
    onStreakCelebrated?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrateStreak, openLayer, obscured]);

  useEffect(() => {
    if (episodeSurvey === null || celebrateStreak || openLayer !== null || obscured) return;
    setOpenLayer("survey");
  }, [episodeSurvey, celebrateStreak, openLayer, obscured]);

  return (
    <>
      {/* 레이어가 떠 있는 동안 머리를 낭독에서 뺍니다 — 뒤쪽 칩 · 버튼은 조작 대상이
          아닙니다(ADR-0016 D9). 레이어는 머리가 연 것일 수도, 화면이 연 것일 수도
          있습니다(`obscured`). */}
      <view
        className="app-header"
        data-testid="app-header"
        accessibility-elements-hidden={openLayer !== null || obscured}
      >
        <TopBar
          streakDays={streakDays}
          trophyCount={trophyCount}
          onOpenNotifications={onOpenNotifications}
          onOpenStreak={() => setOpenLayer("streak")}
          onOpenTrophy={() => setOpenLayer("trophy")}
        />
      </view>
      {openLayer === "streak" || openLayer === "trophy" ? (
        <JourneyStatModal
          kind={openLayer}
          value={openLayer === "streak" ? streakDays : trophyCount}
          track={
            openLayer === "streak"
              ? streakTrack(streakDays, todayWeekday ?? new Date().getDay())
              : trophyTrack(trophyCount)
          }
          onClose={close}
        />
      ) : null}
      {openLayer === "survey" && episodeSurvey !== null ? (
        <EpisodeSurveySheet
          episodeTitle={episodeSurvey.title}
          onAnswer={(rating) => {
            close();
            onAnswerEpisodeSurvey?.(episodeSurvey.id, rating);
          }}
          onSkip={() => {
            close();
            onSkipEpisodeSurvey?.(episodeSurvey.id);
          }}
        />
      ) : null}
    </>
  );
}
