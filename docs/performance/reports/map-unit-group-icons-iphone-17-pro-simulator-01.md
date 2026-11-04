# 여정 맵 유닛의 묶음별 아이콘 (잠김에도 아이콘) — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 레슨 · 문화 노드의 아이콘 문자열이 스텝 id 표에서 정해지고 ui-lynx `LearningUnit` 계약에 문자열 비교 한 줄이 늘었을 뿐, 그리는 요소 수 · 레이아웃은 그대로다.
- 기능 PR: 묶음별 아이콘 — `catalog-unit-icon.ts`(스텝 id → 묶음 → 아이콘), `LearningUnit.lockedGlyph`(잠김에도 받은 아이콘), `CatalogUnitNode` 결선([ADR-0101](../../adr/0101-map-unit-group-icons.md))
- 대상 commit: 이 보고서와 같은 PR의 `feat/map-unit-group-icons` 브랜치 HEAD(`feat/map-footprints` 95b7973b 위)
- 기기: 측정 기기 없음(번들 크기만) — 아이콘 식별은 시뮬레이터 · 실기에서 사용자가 한다([e2e](../../e2e/map-unit-group-icons.md))
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle` · `packages/ui-lynx/dist`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-11-04

## 시나리오

- 번들 크기: 앞 PR(`feat/map-footprints` 95b7973b)의 같은 설정 실측과 이 변경을 비교했다.

## 이 변경이 무엇을 건드렸나

- JS(mobile): 아이콘 import 다섯(light · card · dumbbell · mic · earth, 각 SVG 문자열 0.3 ~ 1 kB)과 표 모듈. lantern-05 · play는 다른 곳에서 여전히 쓰여 남는다.
- JS(ui-lynx): 계약에 enum 검증 · 분기 한 줄.
- 그림 · 음원 · 의존성 · 네이티브는 바뀌지 않았다.

## 분석 결과

| 산출물 | 앞 PR(95b7973b) | 이 변경 | 차이 |
| --- | ---: | ---: | ---: |
| `main.lynx.bundle` | 3,876,867 bytes | 3,881,200 bytes | +4,333 (+0.11 %) |
| `packages/ui-lynx/dist` | 554.3 kB | 555.6 kB | +1.3 kB |

- 상한(mobile 4,060,000 · ui-lynx 556,000)은 그대로 둔다. ui-lynx dist는 여유가 0.4 kB뿐이다 — 다음 ui-lynx 변경 때 상한 재조정이 필요하다(실측 기준 +250 kB 관례).

## 제한 사항

- 번들만 쟀고 렌더 성능은 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- ui-lynx dist 증가분 1.3 kB는 계약의 주석 · 검증 코드와 타입 선언이다.

## 결론과 후속

- 다섯 아이콘이 72px 면 안에서 구분되는지 · 잠김 회색이 열림과 갈리는지는 [e2e](../../e2e/map-unit-group-icons.md) EG-1 ~ EG-5로 기기에서 확인한다.
- ui-lynx dist 상한(556,000)은 다음 ui-lynx 변경 PR에서 실측 위 여유로 올린다.
