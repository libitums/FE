import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { TopBar } from "../components/TopBar";
import { GemPurchaseScreen } from "../screens/gem-purchase/GemPurchaseScreen";
import type { GemPack } from "../screens/gem-purchase/gem-purchase";
import { JourneyStatModal } from "../screens/journey-map/JourneyStatModal";
import {
  streakTrack,
  trophyTrack,
  type JourneyStatKind,
} from "../screens/journey-map/journey-stat";

// 전역 레이아웃의 머리입니다 — 탭 루트 화면(여정 · 롤플레이 · 설정) 위에 바텀
// 네비게이션과 짝으로 섭니다. 칩 셋과 알림 버튼(`TopBar`), 그리고 칩이 여는 겹침 레이어
// 셋(연속 학습 · 트로피 모달 · 젬 구매 화면)을 함께 집니다.
//
// 레이어 열림은 이 컴포넌트가 소유합니다 — 레이어는 화면 위에 겹칠 뿐 화면 전환이 아니라
// `Nav`가 관여하지 않습니다(ADR-0007 D3). 전에는 여정 맵이 지표 모달을 소유했는데,
// 머리가 셸로 올라오면서 모달도 함께 올라왔습니다.

type AppHeaderLayer = JourneyStatKind | "gem";

export type AppHeaderProps = {
  readonly streakDays: number;
  readonly trophyCount: number;
  readonly gemCount: number;
  readonly onOpenNotifications: () => void;
  /**
   * 화면 쪽 겹침 레이어(여정의 스텝 말풍선 · 롤플레이의 플러스 안내)가 떠 있는가입니다.
   * 그 동안 머리를 낭독에서 가립니다 — 레이어가 머리 위를 덮지 않아도 뒤쪽은 조작
   * 대상이 아닙니다(ADR-0016 D9).
   */
  readonly obscured?: boolean;
  /** 젬 구매 화면의 `Pay`입니다. 적립은 젬 수를 소유한 쪽이 집니다. */
  readonly onPurchaseGems: (pack: GemPack) => void;
  /**
   * 오늘의 요일입니다(`Date#getDay()`, 0 = 일). 연속 학습 모달의 요일 줄이 여기서
   * 시작점을 셉니다. 넘기지 않으면 기기 시계를 읽습니다.
   */
  readonly todayWeekday?: number;
};

export function AppHeader({
  streakDays,
  trophyCount,
  gemCount,
  onOpenNotifications,
  obscured = false,
  onPurchaseGems,
  todayWeekday,
}: AppHeaderProps): ReactNode {
  const [openLayer, setOpenLayer] = useState<AppHeaderLayer | null>(null);
  const close = () => setOpenLayer(null);

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
          gemCount={gemCount}
          onOpenNotifications={onOpenNotifications}
          onOpenStreak={() => setOpenLayer("streak")}
          onOpenTrophy={() => setOpenLayer("trophy")}
          onOpenGem={() => setOpenLayer("gem")}
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
      {openLayer === "gem" ? (
        <GemPurchaseScreen
          gemBalance={gemCount}
          onPurchase={(pack) => {
            onPurchaseGems(pack);
            close();
          }}
          // 결제 수단을 바꾸는 화면이 아직 없습니다. 줄은 디자인대로 세우되 누르면 아무
          // 일도 일어나지 않습니다 — 그 화면이 생기면 여기서 엽니다.
          onChangePaymentMethod={() => {}}
          onClose={close}
        />
      ) : null}
    </>
  );
}
