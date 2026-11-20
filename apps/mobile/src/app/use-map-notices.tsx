// 여정 맵 루트의 일회성 안내를 한 자리에서 잇습니다 — 엽전 출시 · 채팅 모달(ADR-0140)이 먼저, 그다음 끝낸 에피소드 업데이트
// 안내(시안 G-A), 맨 뒤 Letters 추천(ADR-0168). 둘 다 지도가 한가할 때만(진행을 읽었고 · 지도 루트 · 겹침 · 티켓 대화상자 · 설문 · 연속 학습 축하 없음).

import type { ReactNode } from "@lynx-js/react";
import { useEffect, useRef } from "@lynx-js/react";

import type { CatalogProgress } from "../lib/catalog-progress";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { CatalogUpdateNoticeDialog } from "../screens/catalog-update/CatalogUpdateNoticeDialog";
import type { ScreenWiring } from "./screen-wiring";
import { useCatalogUpdateNotice } from "./use-catalog-update-notice";
import { useLettersRecommend } from "./use-letters-recommend";
import { useLaunchCoins } from "./use-launch-coins";
import { useMessengerMediaHooks } from "./use-messenger-media-hooks";
import { useStreakReward } from "./use-streak-reward";
import type { StreakRewardWiring } from "../screens/journey-map/streak-reward.contract";

export type MapNoticesInput = {
  readonly wiring: ScreenWiring;
  readonly catalog: readonly CatalogEntry[];
  readonly sections: readonly CatalogMapSection[];
  readonly progress: CatalogProgress;
  readonly localCoins: number | null;
  readonly idle: boolean;
  readonly onStartChatting: () => void;
};

export function useMapNotices(input: MapNoticesInput): {
  readonly coinCount: number | null;
  readonly layer: ReactNode;
  /** 연속 학습 엽전 보상(ADR-0143) — 로그인 사용자만. 머리가 연속 학습 모달에 넘깁니다. */
  readonly streakReward: StreakRewardWiring | undefined;
  /** 스크림 있는 안내(업데이트 · Letters 추천)가 선 동안 — 셸이 뒤 화면 · 바를 낭독에서 뺍니다. */
  readonly blocking: boolean;
} {
  // 업데이트 안내가 이미 떠 있으면 엽전 모달이 그 위로 끼어들지 않습니다 — 안내가 닫힘 처리 없이 사라졌다가 다시 뜨면
  // 누르던 손가락이 엉뚱한 단추를 누릅니다(안정성 리뷰 9). 지난 그림의 값을 씁니다(둘이 서로를 기다리므로).
  const updateOpen = useRef(false);
  // Letters 추천이 떠 있으면 엽전 · 업데이트 안내도 그 위로 끼어들지 않습니다(리뷰 m1) — 지난 그림의 값.
  const lettersOpen = useRef(false);
  const launch = useLaunchCoins({
    wiring: input.wiring,
    catalogProgress: input.progress,
    localCoins: input.localCoins,
    idle: input.idle && !updateOpen.current && !lettersOpen.current,
    onStartChatting: input.onStartChatting,
  });
  const updateNotice = useCatalogUpdateNotice({
    catalog: input.catalog,
    sections: input.sections,
    progress: input.progress,
    ready: input.idle && !launch.open && !lettersOpen.current,
  });
  useEffect(() => {
    updateOpen.current = updateNotice.open;
  }, [updateNotice.open]);
  // Letters 추천(ADR-0168)은 줄 맨 뒤 — 엽전 · 업데이트 안내가 모두 닫힌 뒤에만.
  const letters = useLettersRecommend({
    trail: input.wiring.learningTrail,
    more: input.wiring.more,
    ready: input.idle && !launch.open && !updateNotice.open && !updateOpen.current,
  });
  useEffect(() => {
    lettersOpen.current = letters.open;
  }, [letters.open]);
  // 연속 학습 보상의 지급 잔액은 엽전 출시 결선의 서버 잔액으로 들어가고, 날아가는 동안 닿지 않은 몫은 칩에서 잠시 뺍니다.
  const streak = useStreakReward({
    signedIn: input.wiring.accountState === "signed-in",
    eventSink: input.wiring.messengerChat.eventSink,
    acceptBalance: launch.acceptServerBalance,
  });
  // 서버 사진 · 음성의 예약 · 확정 잔액도 같은 서버 잔액으로(ADR-0146 「앱 연결」).
  useMessengerMediaHooks(launch.acceptServerBalance, input.wiring.messengerChat.eventSink);
  return {
    coinCount: launch.coinCount === null ? null : Math.max(0, launch.coinCount - streak.held),
    streakReward: streak.wiring,
    blocking: updateNotice.open || letters.open,
    layer: (
      <>
        {launch.layer}
        {updateNotice.open ? <CatalogUpdateNoticeDialog onClose={updateNotice.onClose} /> : null}
        {letters.layer}
      </>
    ),
  };
}
