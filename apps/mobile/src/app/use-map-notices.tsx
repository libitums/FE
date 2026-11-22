// 여정 맵 루트의 일회성 안내를 한 자리에서 잇습니다 — 가입 보상(ADR-0174) → 푸시 캠페인 보상(ADR-0175) → 엽전 출시 · 채팅
// 모달(ADR-0140) → 끝낸 에피소드 업데이트 안내(시안 G-A) → Letters 추천(ADR-0169). 둘 다 지도가 한가할 때만(진행을 읽었고 · 지도 루트 · 겹침 · 티켓 대화상자 · 설문 · 연속 학습 축하 없음).

import type { ReactNode } from "@lynx-js/react";
import { useEffect, useRef, useState } from "@lynx-js/react";

import type { CatalogProgress } from "../lib/catalog-progress";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { CatalogUpdateNoticeDialog } from "../screens/catalog-update/CatalogUpdateNoticeDialog";
import type { ScreenWiring } from "./screen-wiring";
import { useCatalogUpdateNotice } from "./use-catalog-update-notice";
import { useLettersRecommend } from "./use-letters-recommend";
import { useLaunchCoins, type LaunchCoins } from "./use-launch-coins";
import { useSignupReward } from "./use-signup-reward";
import { usePushReward } from "./use-push-reward";
import { pushRewardGuideOn } from "./push-reward-record";
import { guestUnlimitedPass, type UnlimitedPass } from "../lib/unlimited-pass";
import { tutorialDone } from "./launch-coins";
import { useMessengerMediaHooks } from "./use-messenger-media-hooks";
import { useStreakReward } from "./use-streak-reward";
import { catalogActivityCount } from "./learning-progress";
import type { Screen } from "./nav-state";
import { usePushPrompt } from "./use-push-prompt";
import type { StreakRewardWiring } from "../screens/journey-map/streak-reward.contract";

export type MapNoticesInput = {
  readonly wiring: ScreenWiring;
  readonly catalog: readonly CatalogEntry[];
  readonly sections: readonly CatalogMapSection[];
  readonly progress: CatalogProgress;
  readonly localCoins: number | null;
  readonly idle: boolean;
  /** 알림 권한 질문(ADR-0176)만 보는 값 — 스토리에서 돌아옴 · 상점이 덮음. */
  readonly promptGate: { readonly screen: Screen["name"]; readonly shopOpen: boolean };
  readonly onStartChatting: () => void;
};

export function useMapNotices(input: MapNoticesInput): {
  readonly coinCount: number | null;
  readonly layer: ReactNode;
  /** 연속 학습 엽전 보상(ADR-0143) — 로그인 사용자만. 머리가 연속 학습 모달에 넘깁니다. */
  readonly streakReward: StreakRewardWiring | undefined;
  /** 스크림 있는 안내(업데이트 · Letters 추천)가 선 동안 — 셸이 뒤 화면 · 바를 낭독에서 뺍니다. */
  readonly blocking: boolean;
  /** 푸시 보상으로 받은 무제한 티켓(ADR-0175) — 머리 칩 · 무제한 모달. 구독 판이 있으면 그쪽이 앞섭니다. */
  readonly ticketPass: UnlimitedPass | undefined;
} {
  // 업데이트 안내가 이미 떠 있으면 엽전 모달이 그 위로 끼어들지 않습니다 — 안내가 닫힘 처리 없이 사라졌다가 다시 뜨면
  // 누르던 손가락이 엉뚱한 단추를 누릅니다(안정성 리뷰 9). 지난 그림의 값을 씁니다(둘이 서로를 기다리므로).
  const updateOpen = useRef(false);
  // Letters 추천이 떠 있으면 엽전 · 업데이트 안내도 그 위로 끼어들지 않습니다(리뷰 m1) — 지난 그림의 값.
  const lettersOpen = useRef(false);
  // 가입 보상(ADR-0174)이 엽전 출시보다 먼저 — 같은 그림에서 미룸을 알도록 먼저 부르고, 출시 결선의 칩 · 잔액은 지난 그림의 것을 씁니다.
  const launchRef = useRef<LaunchCoins | null>(null);
  const launchOpen = useRef(false);
  // 푸시 보상(ADR-0175)은 가입 보상 다음 · 엽전 출시 앞 — 가입 보상이 지난 그림의 푸시 모달을 보고 끼어들지 않습니다.
  const pushOpen = useRef(false);
  // 알림 권한 창의 답을 기다리는 동안 어떤 안내도 그 밑에 서지 않습니다(ADR-0176 D5).
  const [promptAsking, setPromptAsking] = useState(false);
  const idle = input.idle && !promptAsking;
  const signup = useSignupReward({
    wiring: input.wiring,
    idle:
      idle &&
      !launchOpen.current &&
      !updateOpen.current &&
      !lettersOpen.current &&
      !pushOpen.current,
    tutorialDone: tutorialDone(input.progress, input.wiring.legacyTutorialPassed),
    chip: () => launchRef.current?.coinCount ?? null,
    acceptBalance: (balance) => launchRef.current?.acceptServerBalance(balance),
  });
  const push = usePushReward({
    wiring: input.wiring,
    idle:
      idle &&
      !signup.open &&
      !signup.holdsLaunch &&
      !launchOpen.current &&
      !updateOpen.current &&
      !lettersOpen.current,
    guideOn: pushRewardGuideOn(input.progress, input.wiring.legacyTutorialPassed),
    chip: () => launchRef.current?.coinCount ?? null,
    acceptBalance: (balance) => launchRef.current?.acceptServerBalance(balance),
  });
  pushOpen.current = push.open;
  const launch = useLaunchCoins({
    wiring: input.wiring,
    catalogProgress: input.progress,
    localCoins: input.localCoins,
    idle:
      idle &&
      !updateOpen.current &&
      !lettersOpen.current &&
      !signup.holdsLaunch &&
      !push.holdsLater,
    onStartChatting: input.onStartChatting,
  });
  launchRef.current = launch;
  launchOpen.current = launch.open;
  const updateNotice = useCatalogUpdateNotice({
    catalog: input.catalog,
    sections: input.sections,
    progress: input.progress,
    ready: idle && !launch.open && !signup.open && !push.holdsLater && !lettersOpen.current,
  });
  useEffect(() => {
    updateOpen.current = updateNotice.open;
  }, [updateNotice.open]);
  // Letters 추천(ADR-0169)은 줄 맨 뒤 — 엽전 · 업데이트 안내가 모두 닫힌 뒤에만.
  const letters = useLettersRecommend({
    trail: input.wiring.learningTrail,
    more: input.wiring.more,
    ready:
      idle &&
      !launch.open &&
      !signup.open &&
      !push.holdsLater &&
      !updateNotice.open &&
      !updateOpen.current,
  });
  useEffect(() => {
    lettersOpen.current = letters.open;
  }, [letters.open]);
  // 알림 권한 질문(ADR-0176)은 시스템 창이라 다른 안내가 하나도 없을 때만.
  usePushPrompt({
    screen: input.promptGate.screen,
    signedIn: input.wiring.accountState === "signed-in",
    idle:
      input.idle &&
      !input.promptGate.shopOpen &&
      !signup.open &&
      !push.holdsLater &&
      !launch.open &&
      !updateNotice.open &&
      !letters.waiting &&
      !letters.open,
    activityCount: catalogActivityCount(input.progress),
    onAskingChange: setPromptAsking,
  });
  // 연속 학습 보상의 지급 잔액은 엽전 출시 결선의 서버 잔액으로 들어가고, 날아가는 동안 닿지 않은 몫은 칩에서 잠시 뺍니다.
  const streak = useStreakReward({
    signedIn: input.wiring.accountState === "signed-in",
    eventSink: input.wiring.messengerChat.eventSink,
    acceptBalance: launch.acceptServerBalance,
  });
  // 서버 사진 · 음성의 예약 · 확정 잔액도 같은 서버 잔액으로(ADR-0146 「앱 연결」).
  useMessengerMediaHooks(launch.acceptServerBalance, input.wiring.messengerChat.eventSink);
  return {
    coinCount: ((count) => (count === null ? null : Math.max(0, count - streak.held)))(
      push.coinCount(signup.coinCount(launch.coinCount)),
    ),
    streakReward: streak.wiring,
    blocking: updateNotice.open || letters.open || signup.open || push.open,
    ticketPass: push.ticketPass,
    layer: (
      <>
        {signup.layer}
        {push.layer}
        {launch.layer}
        {updateNotice.open ? <CatalogUpdateNoticeDialog onClose={updateNotice.onClose} /> : null}
        {letters.layer}
      </>
    ),
  };
}

/** 머리 티켓 칩의 무제한 판 — 시험 계정 · 구독(ADR-0115 · ADR-0144)이 앞서고, 없으면 푸시 보상 이용권(ADR-0175). */
export function headerUnlimitedPass(
  tester: boolean,
  plans: { readonly unlimitedPass: UnlimitedPass | undefined } | undefined,
  notices: { readonly ticketPass: UnlimitedPass | undefined },
): UnlimitedPass | undefined {
  return tester ? guestUnlimitedPass : (plans?.unlimitedPass ?? notices.ticketPass);
}
