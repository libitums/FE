// 탭 루트의 배치입니다(ADR-0106). 여정맵은 탭 루트 사이에서 지우지 않고 남깁니다 — 다른 탭이면 숨김(visibility) · 터치 막음 ·
// 낭독 가림으로 두고 그 탭을 위에 겹쳐 그립니다. 돌아올 때 지도를 처음부터 다시 만들지 않습니다(기기에서 0.7 ~ 0.8초였음).

import type { ReactNode } from "@lynx-js/react";

import "./tab-roots.css";

export type TabRootsLayoutProps = {
  /** 여정맵 탭이 지금 보이는가. */
  readonly mapActive: boolean;
  readonly map: ReactNode;
  /** 여정이 아닌 탭의 화면 — 여정이면 `null`. */
  readonly current: ReactNode;
};

export function TabRootsLayout({ mapActive, map, current }: TabRootsLayoutProps): ReactNode {
  return (
    <view className="app-tab-roots">
      <view
        key="map"
        className={mapActive ? "app-tab-map" : "app-tab-map app-tab-map-hidden"}
        data-testid="app-tab-map"
        user-interaction-enabled={mapActive}
        accessibility-elements-hidden={!mapActive}
      >
        {map}
      </view>
      {mapActive ? null : (
        <view key="current" className="app-tab-current" data-testid="app-tab-current">
          {current}
        </view>
      )}
    </view>
  );
}
