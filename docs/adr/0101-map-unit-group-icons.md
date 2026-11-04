# ADR-0101 — 여정 맵 유닛의 묶음별 아이콘 · 잠김에도 아이콘

- 상태: **채택.**
- 날짜: 2026-11-04.
- 다루는 축: 여정 맵 레슨 · 문화 노드의 아이콘, ui-lynx `LearningUnit`의 잠김 글리프 선택.
- **사용자 결정**(2026-11-04): 묶음(배우기 S1 · S3, 기본 문항 S2 · S4, 다지기 S5 · S6, 말하기 S7, 문화 CULT)마다 디자인 시스템 아이콘을 쓴다 — 배우기 `light`, 기본 문항 `card`, 다지기 `dumbbell`, 말하기 `mic`, 문화 `earth`. 최종 테스트는 별 유지. 잠긴 유닛도 자물쇠 대신 묶음 아이콘(B안). 시안 캔버스 https://claude.ai/artifact/779nSijQNu1j2ayuEcMsYp 「묶음별 아이콘」 · 「지도 B안」.

## 맥락

레슨 노드는 전부 `play`, 문화는 `lantern-05`였고 잠긴 유닛은 자물쇠라, 한 에피소드의 흐름(배우기 → 문항 → 다지기 → 말하기 → 테스트)이 맵에서 읽히지 않았다. 현행 규칙(잠김 = 자물쇠)을 두면 묶음 아이콘이 열린 유닛 하나에서만 보여 리디자인의 효과가 거의 없다.

## 결정

### D1. 묶음은 스텝 id 규칙에서 — 콘텐츠 스키마 변경 없음

- `catalog-unit-icon.ts`: `S1 · S3 → learn`, `S2 · S4 → item`, `S5 · S6 → drill`, `S7 → speak`, `CULT → culture`, 그 밖(S8 이후 · RP · INT) 없음. 아이콘은 `learn light · item card · drill dumbbell · speak mic · culture earth`. 문화 역할은 묶음과 무관하게 `earth`, 레슨 역할에서 묶음을 모르면 `play`(지금 기본).
- 최종(`five-pointed-star`) · 막간(film · message · phone)은 그대로.

### D2. ui-lynx `LearningUnit.lockedGlyph`

- 선택 prop `lockedGlyph?: "lock" | "icon"`(기본 `"lock"`). `"icon"`이면 `default` 상태에서 받은 아이콘을 잠김 색(gray-700)으로 둔다. 색 · 낭독 접미사(`locked`) · traits · 탭 규칙은 그대로다 — 잠김은 회색 면과 접미사가 알린다.
- 맵의 레슨 · 문화 노드(`CatalogUnitNode`)만 `lockedGlyph="icon"`. 다른 호출부는 기본값이라 변화가 없다.

## 대가

1. 잠긴 유닛에서 「누를 수 없음」이 자물쇠 없이 회색 면 · 접미사로만 전해진다 — 열린 유닛(연주황 면 · 주황 아이콘)과 색 대비로 가른다.
2. 아이콘 import가 다섯(light · card · dumbbell · mic · earth) 늘고 lantern-05 · play 의존은 남는다(play는 모르는 묶음의 기본).
3. 튜토리얼 u00(S1 ~ S3 · RP)은 같은 규칙이라 S1 light · S2 card · S3 light다.

## 재검토 조건

- 묶음이 콘텐츠마다 달라지면(스텝 id가 규칙을 벗어나면) → 콘텐츠 JSON `steps[].group` 키를 더하고 id 규칙은 폴백으로.
- 잠김이 자물쇠 없이 헷갈린다는 피드백이 오면 → 잠긴 아이콘 위에 작은 자물쇠 배지.
