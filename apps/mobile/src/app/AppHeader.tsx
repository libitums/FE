import { useEffect, useGlobalProps, useMemo, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { TopBar } from "../components/TopBar";
import type { FeedbackRating, FeedbackReason } from "../lib/feedback.contract";
import { useUiCopy } from "../lib/ui-copy";
import type { StatBumpWiring } from "./learning-progress";
import { PlanChip } from "../components/PlanChip";
import { SubscriptionToast } from "../components/SubscriptionToast";
import type { PlanActivation } from "../screens/plans/plan-change";
import type { HeaderPlanChip, ShopRequest } from "../screens/coin-shop/shop-model";
import { EpisodeSurveySheet } from "../screens/episode-survey/EpisodeSurveySheet";
import { JourneyStatModal } from "../screens/journey-map/JourneyStatModal";
import type { StreakRewardWiring } from "../screens/journey-map/streak-reward.contract";
import { TicketStatModal } from "../screens/tickets/TicketStatModal";
import { UnlimitedTicketModal } from "../screens/tickets/UnlimitedTicketModal";
import { appVersionFrom } from "../lib/app-version";
import { openManageSubscription } from "../lib/manage-subscription";
import { unlimitedPassView } from "../lib/unlimited-pass";
import type { UnlimitedPass } from "../lib/unlimited-pass";
import type { TicketHeaderWiring } from "./use-learning-tickets";
import {
  streakTrack,
  trophyTrack,
  type JourneyStatKind,
} from "../screens/journey-map/journey-stat";

// 전역 레이아웃의 머리입니다 — 탭 루트 화면(여정 · 롤플레이 · 설정) 위에 바텀
// 네비게이션과 짝으로 섭니다. 지표 칩과 알림 버튼(`TopBar`), 칩이 여는 겹침 레이어(연속 학습 · 트로피 · 티켓 모달, 엽전 상점)를 집니다.
//
// 레이어 열림은 이 컴포넌트가 소유합니다 — 레이어는 화면 위에 겹칠 뿐 화면 전환이 아니라
// `Nav`가 관여하지 않습니다(ADR-0007 D3). 전에는 여정 맵이 지표 모달을 소유했는데,
// 머리가 셸로 올라오면서 모달도 함께 올라왔습니다.

type AppHeaderLayer = JourneyStatKind | "survey" | "tickets" | "unlimited";

/** 머리의 요금제 입구(ADR-0160) — 요금제 결선이 있을 때만. */
export type HeaderPlans = {
  /** 둘째 줄 칩 — null이면 줄이 없습니다(여정 지도 밖 탭). */
  readonly chip: HeaderPlanChip | null;
  /** 티켓 모달의 「Go unlimited」 줄 가격 — undefined면 줄이 없습니다(표 없음 · 이미 티켓 무제한). */
  readonly goUnlimited: { readonly price: string | null } | undefined;
  /** 구독 성공 알림 한 번 — 새로 켜진 요금제(미뤄진 내림이면 scheduled). */
  readonly activated: PlanActivation | null;
  readonly onActivatedShown: () => void;
  /** 구매 뒤 서버 확인 대기(ADR-0163) — 바뀔 칩은 값 대신 스켈레톤입니다. */
  readonly updating?: { readonly coins: boolean; readonly plan: boolean };
};

export type AppHeaderProps = {
  readonly streakDays: number;
  /** `null`이면 아직 모르는 값입니다. */
  readonly trophyCount: number | null;
  /** 보유 엽전입니다(ADR-0116) — 불러오는 동안은 `null`이라 칩이 서지 않습니다. 칩의 「+」가 엽전 상점을 엽니다. */
  readonly coinCount?: number | null;
  readonly onOpenNotifications: () => void;
  /**
   * 화면 쪽 겹침 레이어(여정의 스텝 말풍선 · 롤플레이의 플러스 안내)가 떠 있는가입니다.
   * 그 동안 머리를 낭독에서 가립니다 — 레이어가 머리 위를 덮지 않아도 뒤쪽은 조작
   * 대상이 아닙니다(ADR-0016 D9).
   */
  readonly obscured?: boolean;
  /**
   * 머리의 위 모서리입니다. 기본은 화면 위 여백(12)이고, 셸이 위 안전 영역을 잡지 않는 여정 맵에서는 그 높이를
   * 더한 값입니다(⟨2026-10-19⟩ `mapTopLayout`). 인라인을 비우면 Lynx에서 앞 값이 남으므로 늘 값을 넣습니다.
   */
  readonly top?: number;
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
  readonly onAnswerEpisodeSurvey?: (
    episodeId: string,
    rating: FeedbackRating,
    reasons: readonly FeedbackReason[],
    message: string | null,
  ) => void;
  readonly onSkipEpisodeSurvey?: (episodeId: string) => void;
  /**
   * 활동으로 오르기 전 값입니다(ADR-0064). 칩은 레이어가 모두 닫힌 뒤 한 번 굴립니다 — 연속 모달이 곧 열릴 참이면
   * (`celebrateStreak`) 그 모달을 닫은 뒤입니다. 모달이 「4 day streak」을 말하고, 닫으면 칩이 3 → 4로 오릅니다.
   */
  readonly statBump?: StatBumpWiring;
  /** 학습 티켓 칩과 그 모달(시안 E1)입니다. 없으면 칩을 그리지 않습니다. */
  readonly tickets?: TicketHeaderWiring;
  /**
   * 무제한 상태입니다(ADR-0115) — 있으면 티켓 칩이 무제한 칩이고, 누르면 무제한 모달을 엽니다. 지금은 시험 계정
   * (ADR-0085)만 `{ kind: "guest" }`로 넘어옵니다.
   */
  readonly unlimitedPass?: UnlimitedPass;
  /** 연속 학습 엽전 보상(ADR-0143) — 로그인 사용자만. 연속 학습 모달에만 넘깁니다. */
  readonly streakReward?: StreakRewardWiring;
  /** 상점을 엽니다(ADR-0160) — 세션 층이 그립니다. 없으면 엽전 칩은 읽기 전용입니다. */
  readonly onOpenShop?: (request: ShopRequest) => void;
  readonly plans?: HeaderPlans;
};

export function AppHeader({
  top = 12,
  streakDays,
  trophyCount,
  coinCount = null,
  onOpenNotifications,
  obscured = false,
  todayWeekday,
  celebrateStreak = false,
  onStreakCelebrated,
  episodeSurvey = null,
  onAnswerEpisodeSurvey,
  onSkipEpisodeSurvey,
  statBump,
  tickets,
  unlimitedPass,
  streakReward,
  onOpenShop,
  plans,
}: AppHeaderProps): ReactNode {
  const [openLayer, setOpenLayer] = useState<AppHeaderLayer | null>(null);
  const copy = useUiCopy();
  const close = () => setOpenLayer(null);
  // 무제한 레이어가 열린 채 무제한 상태가 사라지면(로그아웃 · 표시 해제) 열린 레이어가 없는 것으로 봅니다 — 아무것도 그리지
  // 않으면서 머리만 낭독에서 가려진 채 남지 않게 합니다.
  const layer = openLayer === "unlimited" && unlimitedPass === undefined ? null : openLayer;
  const unlimitedOpen = layer === "unlimited";
  // 구독 판의 「Manage subscription」 · 「Keep unlimited」 — 해지 · 갱신은 스토어 몫이라 그 구독 관리 화면을 엽니다(ADR-0144).
  const platform = appVersionFrom(useGlobalProps())?.platform ?? null;
  const manageSubscription =
    unlimitedPass?.kind === "subscription"
      ? () => {
          openManageSubscription(platform, unlimitedPass.productId ?? null);
        }
      : undefined;
  // 모달의 모양은 열릴 때(그리고 무제한 상태가 바뀔 때) 한 번 셉니다 — 렌더마다 `Date.now()`로 새 객체를 만들면 머리가
  // 다시 그려질 때마다 모달도 다시 그려집니다. 남은 날은 하루 단위라 모달이 떠 있는 동안 다시 셀 필요가 없습니다.
  const unlimitedView = useMemo(
    () =>
      unlimitedOpen && unlimitedPass !== undefined
        ? unlimitedPassView(unlimitedPass, Date.now())
        : null,
    [unlimitedOpen, unlimitedPass],
  );
  const ticketModalOpen = openLayer === "tickets";
  // 구독 성공 알림은 머리가 보일 때만 섭니다 — 레이어가 덮은 동안 4초가 지나가지 않게 합니다.
  const celebrating = (plans?.activated ?? null) !== null && layer === null && !obscured;
  // 티켓 모달이 떠 있는 동안 1초마다 다시 그리도록 알립니다(카운트다운). 닫히거나 머리가 내려가면 거둡니다.
  useEffect(() => {
    if (!ticketModalOpen) return;
    tickets?.onModalChange(true);
    return () => tickets?.onModalChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketModalOpen]);

  // 무제한 상태가 사라진 채 열린 무제한 레이어는 닫아 둡니다 — 남겨 두면 아래 두 effect가 막히고, 상태가 다시
  // 들어오면 모달이 저절로 다시 뜹니다. 같은 렌더 안에서는 위 `layer`가 이미 닫힌 것으로 봅니다.
  useEffect(() => {
    if (openLayer === "unlimited" && unlimitedPass === undefined) setOpenLayer(null);
  }, [openLayer, unlimitedPass]);

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
        className={
          tickets === undefined || tickets.dropFrom === null
            ? "app-header"
            : "app-header app-header-raised"
        }
        data-testid="app-header"
        style={{ top: `${top}px` }}
        accessibility-elements-hidden={layer !== null || obscured}
      >
        <TopBar
          streakDays={streakDays}
          trophyCount={trophyCount}
          coinCount={coinCount}
          onOpenNotifications={onOpenNotifications}
          onOpenStreak={() => setOpenLayer("streak")}
          onOpenTrophy={() => setOpenLayer("trophy")}
          ticketCount={tickets?.status.available ?? null}
          ticketsUnlimited={unlimitedPass !== undefined}
          onOpenTickets={() => setOpenLayer(unlimitedPass === undefined ? "tickets" : "unlimited")}
          onOpenCoins={
            onOpenShop === undefined
              ? undefined
              : () => onOpenShop({ tab: "coins", placement: "coin_shop", focus: null })
          }
          ticketPulse={celebrating && plans?.activated?.plan !== "chat_plus"}
          bumps={statBump?.statBumps}
          bumpHeld={layer !== null || obscured || celebrateStreak}
          onBumped={statBump?.onStatBumped}
          ticketDropFrom={tickets?.dropFrom ?? null}
          onTicketDropped={tickets?.onDropped}
        />
        {/* 둘째 줄 요금제 칩(ADR-0160 시안 A3) — 종 아래 오른쪽. 지도 스크롤 밖 머리 층이라 z-index가 지도 안으로 들어가지 않습니다. */}
        {plans === undefined || plans.chip === null ? null : (
          <view className="app-header-plan-row" data-testid="app-header-plan-row">
            <PlanChip
              plan={plans.chip}
              pulse={celebrating}
              onPress={() => onOpenShop?.({ tab: "plans", placement: "header_chip", focus: null })}
            />
          </view>
        )}
        {celebrating && plans?.activated != null ? (
          <SubscriptionToast activation={plans.activated} onDone={plans.onActivatedShown} />
        ) : null}
      </view>
      {openLayer === "streak" || openLayer === "trophy" ? (
        <JourneyStatModal
          kind={openLayer}
          value={openLayer === "streak" ? streakDays : (trophyCount ?? 0)}
          track={
            openLayer === "streak"
              ? streakTrack(
                  streakDays,
                  todayWeekday ?? new Date().getDay(),
                  copy.journeyMap.statModal.weekdays,
                )
              : trophyTrack(trophyCount ?? 0)
          }
          {...(openLayer === "streak" && streakReward !== undefined
            ? { reward: streakReward }
            : {})}
          onClose={close}
        />
      ) : null}
      {ticketModalOpen && tickets !== undefined ? (
        <TicketStatModal
          status={tickets.status}
          more={tickets.more}
          onGetMore={tickets.onGetMore}
          onClose={close}
          {...(plans?.goUnlimited === undefined
            ? {}
            : {
                goUnlimited: {
                  price: plans.goUnlimited.price,
                  onPress: () => {
                    close();
                    onOpenShop?.({
                      tab: "plans",
                      placement: "tickets_chip",
                      focus: "unlimited_tickets",
                    });
                  },
                },
              })}
        />
      ) : null}
      {unlimitedView !== null ? (
        <UnlimitedTicketModal
          view={unlimitedView}
          onClose={close}
          onManageSubscription={manageSubscription}
          onKeepUnlimited={manageSubscription}
        />
      ) : null}
      {openLayer === "survey" && episodeSurvey !== null ? (
        <EpisodeSurveySheet
          episodeTitle={episodeSurvey.title}
          onAnswer={(rating, reasons, message) => {
            close();
            onAnswerEpisodeSurvey?.(episodeSurvey.id, rating, reasons, message);
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
