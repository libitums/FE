# 끝낸 에피소드 업데이트 안내 · NEW 태그 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 지도 노드에 조건부 알약 하나와, 지도 루트에서 한 번 뜨는 대화상자 하나가 더해질 뿐이라 평소 렌더 경로에 반복 비용이 거의 없다.
- 기능 PR: 끝낸 에피소드 업데이트 안내([ADR-0089](../../adr/0089-catalog-update-notice.md)) — `CatalogUpdateNoticeDialog` · `catalog-update.ts` · `catalog-update-notice.ts` · 지도 NEW 태그
- 대상 commit: 이 보고서와 같은 PR의 `feat/episode-update-notice` 브랜치 HEAD
- 기기: 측정 기기 없음(번들 크기만) — 화면 확인은 iPhone 17 Pro 시뮬레이터
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-10-28

## 시나리오

- 번들 크기: main(`c0348c19`) CI 설정 실측과 이 변경을 비교했다.
- 렌더 비용: 지도는 구획마다 `catalogFreshUnitKeysOf`(유닛 수만큼 진행 조회)를 한 번 더 돌고, 셸은 렌더마다 서명을 파생한다 — 에피소드 · 유닛 수에 비례하는 배열 순회다.

## 이 변경이 무엇을 건드렸나

- 새 화면 조각: 대화상자(`Overlay` · ui-lynx `Button` · 체크 행 · `tick` 아이콘), 지도 노드의 NEW 알약(`text` 하나).
- 기기 저장소 읽기 한 번(첫 렌더) · 닫을 때 쓰기 한 번.
- 의존성 · 이미지 · 음원 · 네이티브는 바뀌지 않았다.

## 분석 결과

| 번들 | 크기 |
| --- | ---: |
| main CI 설정 실측 | 2,829,631 bytes |
| 이 변경 — CI 설정 | 2,843,418 bytes (+13,787) |

- 상한(3,080.0 kB)은 그대로 둔다. ui-lynx 산출물은 바뀌지 않았다(553.3 / 554.0 kB).

## 제한 사항

- 번들만 쟀고 렌더 성능은 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.

## 결론과 후속

- 대화상자 · 태그의 모습은 시뮬레이터 e2e(CU1 ~ CU4)로 확인한다. Android · VoiceOver는 남는다.
