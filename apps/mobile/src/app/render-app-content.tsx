// 셸 콘텐츠의 입구입니다. 탭 루트(여정 · 롤플레이 · 설정)끼리는 여정맵을 지우지 않고 숨겨 둡니다(ADR-0106) — 돌아올 때
// 지도를 처음부터 다시 만들지 않습니다. 탭 루트가 아닌 화면은 지금처럼 그 화면 하나만 그립니다.

import type { Screen } from "./nav-state";
import { renderEntryScreen } from "./render-entry-screen";
import { renderJourneyMap, renderScreen } from "./render-screen";
import type { ScreenWiring } from "./screen-wiring";
import { TabRootsLayout } from "./TabRootsLayout";

const TAB_ROOTS: ReadonlySet<Screen["name"]> = new Set([
  "journey-map",
  "roleplay-list",
  "messenger-list",
  "ranking",
  "settings",
  // 더보기 메뉴의 루트 화면(ADR-0169) — 바가 서는 more 스택 루트.
  "letters",
  "wordbook",
]);

export function renderAppContent(screen: Screen, wiring: ScreenWiring) {
  // 메인 스레드는 첫 화면만 그립니다 — 첫 렌더 · 첫 동기화 전 `updatePage` · template reload 모두 처음 상태(스플래시)에서
  // 시작하고(ADR-0031 D8), 그 뒤 화면은 background가 그려 패치로 보냅니다. 그래서 메인 스레드 번들에서 다른 화면의
  // 컴포넌트 코드가 빠집니다(약 −430 kB, ADR-0149 「줄인 기록」 1). 그리기 틀 등록은 남습니다(`pnpm size:snapshots`).
  if (!__BACKGROUND__) return screen.name === "splash" ? renderEntryScreen(screen, wiring) : null;
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
