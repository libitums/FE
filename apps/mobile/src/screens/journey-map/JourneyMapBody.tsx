import { memo } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { JourneyMapCatalogProps, CatalogUnitSelect } from "./catalog-map.contract";
import type { JourneyMapNodeAccess } from "./journey-map-load.contract";
import { JourneyMapCatalogSlot } from "./JourneyMapCatalogSlot";

/** 맵 본문이 부르는 동작들입니다 — 화면이 렌더마다 최신 함수를 넣는 ref라 본문이 다시 그려질 이유가 되지 않습니다. */
export type JourneyMapBodyHandlers = {
  readonly onStartCover: (episodeId: string) => void;
  readonly onSelectCatalogUnit: CatalogUnitSelect;
  readonly dismissGuide: () => void;
};

export type JourneyMapBodyProps = {
  readonly catalog: JourneyMapCatalogProps;
  readonly access: JourneyMapNodeAccess;
  readonly guideVisible: boolean;
  readonly handlers: { readonly current: JourneyMapBodyHandlers };
};

/**
 * 맵의 카탈로그 구획들입니다. **스크롤 한 프레임마다 다시 그리지 않게 떼어 `memo`로 감쌉니다** — 말풍선이 열린
 * 동안 화면은 스크롤을 따라 말풍선 자리만 바꾸는데, 본문이 화면 안에 있으면 노드 수십 개가 매 프레임 다시 그려져
 * 스크롤이 끊겼습니다. 동작은 `handlers` ref를 거쳐 부르므로 함수가 새로 만들어져도 본문은 그대로입니다.
 */
function JourneyMapBodyView({
  catalog,
  access,
  guideVisible,
  handlers,
}: JourneyMapBodyProps): ReactNode {
  const guide = { visible: guideVisible, dismiss: () => handlers.current.dismissGuide() };
  return (
    <JourneyMapCatalogSlot
      catalog={{
        ...catalog,
        onStartCover: (episodeId) => handlers.current.onStartCover(episodeId),
      }}
      access={access}
      guide={guide}
      onSelectUnit={(episodeId, unitKey, tapY) =>
        handlers.current.onSelectCatalogUnit(episodeId, unitKey, tapY)
      }
    />
  );
}

export const JourneyMapBody = memo(JourneyMapBodyView);
