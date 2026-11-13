// 여정 맵 루트의 일회성 안내를 한 자리에서 잇습니다 — 엽전 출시 · 채팅 모달(ADR-0140)이 먼저, 그다음 끝낸 에피소드 업데이트
// 안내(시안 G-A). 둘 다 지도가 한가할 때만(진행을 읽었고 · 지도 루트 · 겹침 · 티켓 대화상자 · 설문 · 연속 학습 축하 없음).

import type { ReactNode } from "@lynx-js/react";

import type { CatalogProgress } from "../lib/catalog-progress";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { CatalogUpdateNoticeDialog } from "../screens/catalog-update/CatalogUpdateNoticeDialog";
import type { ScreenWiring } from "./screen-wiring";
import { useCatalogUpdateNotice } from "./use-catalog-update-notice";
import { useLaunchCoins } from "./use-launch-coins";

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
} {
  const launch = useLaunchCoins({
    wiring: input.wiring,
    catalogProgress: input.progress,
    localCoins: input.localCoins,
    idle: input.idle,
    onStartChatting: input.onStartChatting,
  });
  const updateNotice = useCatalogUpdateNotice({
    catalog: input.catalog,
    sections: input.sections,
    progress: input.progress,
    ready: input.idle && !launch.open,
  });
  return {
    coinCount: launch.coinCount,
    layer: (
      <>
        {launch.layer}
        {updateNotice.open ? <CatalogUpdateNoticeDialog onClose={updateNotice.onClose} /> : null}
      </>
    ),
  };
}
