// 셸 콘텐츠의 입구입니다. 탭 루트(여정 · 롤플레이 · 설정)끼리는 여정맵을 지우지 않고 숨겨 둡니다(ADR-0106) — 돌아올 때
// 지도를 처음부터 다시 만들지 않습니다. 탭 루트가 아닌 화면은 지금처럼 그 화면 하나만 그립니다.

import type { Screen } from "./nav-state";
import { renderJourneyMap, renderScreen } from "./render-screen";
import type { ScreenWiring } from "./screen-wiring";
import { TabRootsLayout } from "./TabRootsLayout";

const TAB_ROOTS: ReadonlySet<Screen["name"]> = new Set([
  "journey-map",
  "roleplay-list",
  "messenger-list",
  "settings",
]);

export function renderAppContent(screen: Screen, wiring: ScreenWiring) {
  if (!TAB_ROOTS.has(screen.name)) return renderScreen(screen, wiring);
  const mapActive = screen.name === "journey-map";
  return (
    <TabRootsLayout
      mapActive={mapActive}
      map={renderJourneyMap(wiring, mapActive)}
      current={mapActive ? null : renderScreen(screen, wiring)}
    />
  );
}
