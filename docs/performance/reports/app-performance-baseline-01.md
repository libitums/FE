# 앱 성능 기준선 첫 측정 — Android 실기 — 01

## 실행 조건

- 상태: 측정 — 이 PR이 더하는 측정 빌드(`PUBLIC_PERF_PROBE=1`)의 `DuruPerf` 로그. 프레임 · 메모리 캡처는 돌리지 않았습니다.
- 기능 PR: 앱 성능 기준선(50 ms · 1초)과 측정 빌드의 네이티브 로그 통로 — ADR-0105 1단계.
- 대상 commit: `feat/perf-probe`(main `97e445e8` 위) — 측정은 #378 · #379를 합친 로컬 빌드에서 처음, 이후 수정을 더해 반복
- 기기: Samsung Galaxy A52s(SM-A528N)
- OS: Android 14 [추정 — 기기 설정에서 확인하지 않음]
- Lynx SDK: 4.0.1
- 빌드: `PUBLIC_PERF_PROBE=1 pnpm bundle:android` → `./gradlew :app:assembleBundled`, 새로 설치
- 측정 일시: 2026-11-05

## 시나리오

- 새로 설치 → 실행 → 수준 4 버킷 18편을 받는 동안 여정맵 · 튜토리얼 컷 · 레슨을 조작. 50 ms 이상인 동기 작업과 5초 창의 커밋 수가 남습니다.
- 측정 빌드가 아니면(출시 빌드) 측정 함수는 감싼 함수를 그대로 부를 뿐 시간을 재지 않습니다.

## 이 변경이 무엇을 건드렸나

- Android `PerfLogModule`(등록), JS `lib/perf-probe.ts`, 측정 지점(`catalog.load` · `catalog.merge` · `catalog.localize` · `episode.check` · `refresh.activeReady` · `audio.parse`)과 커밋 수(`App` · `JourneyMap` · `LearningShell` · `CatalogCover`).

## 분석 결과

첫 측정(#378 · #379 적용 빌드):

| 항목 | 횟수 | 평균 | 최대 |
|---|---|---|---|
| `episode.check`(받은 본문 한 편 검증 + 디코드) | 18 | 1,105 ms | 2,898 ms |
| `catalog.load` | 13 | 757 ms | 2,669 ms |
| `audio.parse` | 2 | 79 ms | 80 ms |
| `CatalogCover` 커밋 | — | 5초에 최대 68번 | — |

- 같은 기기 로그(측정 장치 이전): 받기 중 화면 갱신(`rLynxChange`) 초당 최대 약 25번, 바뀐 것 없는 갱신 약 8,000번(8분).

## 해석

- 기준선(50 ms)을 15 ~ 58배 넘는 작업이 받기 중 반복됐습니다 — 사용자가 보고한 「탭이 몇 초 늦음」과 맞습니다. 이후 개선(#381)의 근거입니다.
- 이 기록은 측정 장치의 첫 결과이고, 측정 빌드의 시간 재기 비용(`Date.now` 두 번)이 더해진 근사입니다.
- 측정 한계: Android 기기 한 대 · 한 번의 받기 기록이라 다른 기기로 일반화할 수 없습니다. 렌더링 · 메인 스레드 시간과 iOS는 미측정입니다.

## 결론과 후속

- 후속: ADR-0105 D4(줄이기) · D5(스켈레톤). iOS 측정 통로는 아직 없습니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
