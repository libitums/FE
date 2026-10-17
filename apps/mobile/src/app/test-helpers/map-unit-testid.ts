// 맵 노드의 testid를 만드는 테스트 지원입니다. 제품 코드가 import하지 않습니다.
//
// 스페셜 8종(표지 · 메신저 · 전화 · 비주얼 노벨 · 튜토리얼 최종 · 카탈로그 표지 · 문화 · 최종)은
// `ui-lynx-special-unit-<id>`이고 스텝 · 카탈로그 레슨은 `ui-lynx-learning-unit-<id>`입니다.

const specialTutorialIds: ReadonlySet<string> = new Set([
  "tutorial-intro",
  "appointment-confirmation",
  "appointment-confirmation-phone-call",
  "cafe-arrival-visual-novel",
  "tutorial-final-test",
]);

const specialCatalogKeys: ReadonlySet<string> = new Set(["CULT", "RP"]);

/** 맵 노드 id(`tutorial-intro` · `greeting` · `catalog-cover-u01-water` …)의 testid입니다. */
export function mapUnitTestId(id: string): string {
  const special =
    specialTutorialIds.has(id) ||
    id.startsWith("catalog-cover-") ||
    (id.startsWith("catalog-unit-") && specialCatalogKeys.has(id.slice(id.lastIndexOf("-") + 1)));
  return `ui-lynx-${special ? "special" : "learning"}-unit-${id}`;
}

/** 카탈로그 유닛 노드의 testid입니다. 키가 `CULT` · `RP`면 스페셜, 그 밖(`S1` …)은 레슨입니다. */
export function catalogNodeTestId(episodeId: string, key: string): string {
  return mapUnitTestId(`catalog-unit-${episodeId}-${key}`);
}
