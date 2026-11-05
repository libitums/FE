# 탭 루트 여정맵 keep-alive · 지도 본문 메모 — Android 실기 — 01

## 실행 조건

- 상태: 측정 — Lynx 엔진 로그(터치 → 백그라운드 커밋 → 메인 반영) · `dumpsys gfxinfo` 프레임 통계 · `DuruPerf` 커밋 수. 메모리는 재지 않았습니다.
- 기능 PR: 탭 루트 사이에서 여정맵을 숨겨 두고(ADR-0106), 내용이 같으면 지도 본문을 다시 그리지 않습니다.
- 대상 commit: `feat/tab-keep-alive` — 측정은 #378 · #379 · #380 · #381 · #382를 합친 로컬 측정 빌드 위
- 기기: Samsung Galaxy A52s(SM-A528N)
- OS: Android 14 [추정 — 기기 설정에서 확인하지 않음]
- Lynx SDK: 4.0.1
- 빌드: `PUBLIC_PERF_PROBE=1 pnpm bundle:android` → `./gradlew :app:assembleBundled`, 데이터 유지 덮어 설치
- 측정 일시: 2026-11-05

## 시나리오

- 로그인 · 받기가 끝난 상태에서 `adb shell input tap`으로 하단 네비게이션 롤플레이 ↔ 여정을 3번 왕복(각 3초 간격). 전환 시간 = 터치(`PageTouchEvent`)부터 1.5초 안의 마지막 메인 반영(`OnPatchFinishForFiber WithPatch` · `onPageChanged`)까지.

## 이 변경이 무엇을 건드렸나

- `app/render-app-content.tsx` · `TabRootsLayout.tsx` · `tab-roots.css`(새), `render-screen.tsx`(`renderJourneyMap`), `AppSession.tsx`(입구 한 줄), `JourneyMapScreen.tsx`(`active`), `use-stable-body-catalog.ts`(새).

## 분석 결과

| 전환 | 이 변경 전 | keep-alive만 | keep-alive + 본문 메모 |
|---|---|---|---|
| 롤플레이 → 여정 | 약 700 ~ 800 ms(백그라운드 약 270 + 메인 약 320 + 후속) | 314 ~ 461 ms | **60 ~ 65 ms** |
| 여정 → 롤플레이 | 약 280 ms | 371 ~ 431 ms | **95 ~ 162 ms** |
| 늦은 프레임 | 9개 중 6개(최대 150 ms) | 31개 중 11개 | 34개 중 11개(최대 125 ms) |

- keep-alive만 넣었을 때 메인 반영은 60 ~ 90 ms로 줄었지만 백그라운드 계산이 250 ~ 390 ms 남았다 — 셸이 매번 새 `catalog` 객체를 넘겨 지도 본문 memo가 깨졌기 때문이다. 본문 메모로 해결.

## 해석

- 두 방향 모두 기준선(화면 전환 300 ms, ADR-0105 D1) 안이다.
- 측정 한계: 기기 한 대(Galaxy A52s) · 롤플레이 ↔ 여정 3회 왕복뿐이라 다른 기기로 일반화할 수 없다. 숨긴 지도가 차지하는 메모리는 미측정(대가 1), 설정 탭 전환은 따로 재지 않았다.

## 결론과 후속

- 후속: 레슨 · 컷에서 지도로 돌아올 때(여전히 다시 만듦)의 시간, 숨긴 지도의 메모리.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
