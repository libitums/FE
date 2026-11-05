# 받은 본문 SHA-256 호스트 계산 · 내장 디코드 기억 — Android 실기 — 01

## 실행 조건

- 상태: 측정 — 측정 빌드(`PUBLIC_PERF_PROBE=1`, ADR-0105 D2)의 `DuruPerf` 로그. 프레임 · 메모리 캡처는 돌리지 않았습니다.
- 기능 PR: 받은 본문의 SHA-256을 호스트(`ContentFileModule.sha256`)로 계산하고, 카탈로그가 내장 에피소드를 한 번만 디코드합니다 — ADR-0105 2단계(D4).
- 대상 commit: `perf/native-digest`(#378 위) — 측정은 #378 · #379 · #380 · 측정 장치를 합친 로컬 빌드
- 기기: Samsung Galaxy A52s(SM-A528N)
- OS: Android 14 [추정 — 기기 설정에서 확인하지 않음]
- Lynx SDK: 4.0.1
- 빌드: `PUBLIC_PERF_PROBE=1 pnpm bundle:android` → `./gradlew :app:assembleBundled`, 새로 설치
- 측정 일시: 2026-11-05

## 시나리오

- 새로 설치 → 실행 → 수준 4 버킷 18편을 받는 약 2분(Wi-Fi). 50 ms 이상인 동기 작업만 남습니다.

## 이 변경이 무엇을 건드렸나

- Android `ContentDigest` · `ContentFileModule.sha256`, iOS `ContentDigest` · `ContentFileModule.sha256`, JS `content-files.ts` `nativeContentDigest` · `verified-text-cache.ts` · `episode-catalog.ts`(내장 디코드 기억).

## 분석 결과

| 항목 | 이 변경 전(같은 기기 · 같은 시나리오) | 이 변경 후 |
|---|---|---|
| `episode.check`(편마다 검증 + 디코드) | 평균 926 ms · 최대 1,183 ms · 18회 합계 16.7초 | **평균 277 ms · 최대 323 ms · 합계 5.0초** |
| `catalog.load`(받기 중) | 213 ~ 529 ms | **61 ~ 207 ms** |
| `catalog.load`(새 설치 첫 1회) | — | 2,448 ms(내장 11편 첫 디코드) |
| `audio.parse` | 79 ms | 83 ms |

## 해석

- 받는 동안 「약 7초마다 1초」 막히던 것이 「약 6초마다 0.3초」로 줄었습니다(-70 %). 남은 `episode.check`는 SHA-256이 아니라 디코드 시간입니다.
- 기준선(50 ms)에는 아직 못 미칩니다 — 디코드 · 받기 중 다시 읽기 · 앱 시작 첫 디코드가 남습니다(ADR-0105 D4 · D5 후속).
- 측정 한계: Android 기기 한 대 · 받기 한 번의 기록이라 다른 기기로 일반화할 수 없습니다. iOS는 측정 채널이 없어 미측정입니다.

## 결론과 후속

- 후속: 받기 중 다시 읽기 모으기, 디코드 나누기, 앱 시작 첫 디코드(2.4초)의 스켈레톤 또는 나눠 디코드.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
