# 바텀 네비게이션 셸 — 미측정 소급 기록

> 상태: **미측정 — 과거 누락 소급.** 이 문서는 baseline이나 성능 통과 증거가 아니다.

## 실행 조건

- 측정 일시: 미측정. 누락 기록 작성일은 2026-09-03이다.
- 상태: 미측정 — 기능 병합 당시 성능 분석 규칙과 CLI가 없었고 PerformanceEntry·메모리·
  Trace 캡처를 수행하지 않았다.
- 기능 PR: [#32 — 뼈대: Nav와 바텀 네비게이션 셸](https://github.com/libitums/FE/pull/32)
- 대상 commit: `c23ec0155a211ed7531ba18b72fd51672f20ec56`
- 기기: 성능 측정 기기 미기록. 별도 시각 검증은 iPhone 17 Pro 시뮬레이터에서 했다.
- OS: 성능 측정 OS 미기록. 별도 시각 검증 환경은 iOS 26.5였다.
- Lynx SDK: 4.0.1
- 빌드: 성능 측정 구성 미기록. PR의 `pnpm verify` 빌드는 147.1 kB였다.
- 실행 회차: 01

## 시나리오

- 전제: 자체 호스트 앱을 실행하고 홈 탭에서 시작한다.
- 단계: 여정 → 롤플레이 → 설정 → 홈 탭을 차례로 연다.
- 관찰 구간: 미기록. 앱 시작과 탭 전환의 timing flag가 없었다.

## 분석 결과

```text
PerformanceEntry: 미측정 — 캡처 없음
Memory snapshot: 미측정 — 캡처 없음
Trace: 미측정 — 캡처 없음
Bundle: 147.1 kB — PR #32의 pnpm verify 기록, 런타임 성능 수치가 아님
```

당시 자동 검증은 unit 22개, UI 27개, integration 5개가 통과했다. 별도 실기 검증은
12개 중 10개가 통과했고 2개는 미판정이었다. 이 값들은 동작·시각·접근성 검증이며
렌더 시간, 프레임, 메모리 사용량을 설명하지 않는다.

## 비교

- 기준 기록: 없음 — 첫 기능 경계지만 성능 캡처가 없어 baseline을 만들 수 없다.
- 차이: 계산할 수 없음.

## 해석

탭 셸의 런타임 성능이 좋거나 나쁘다고 판정할 자료가 없다. 번들 크기와 기능 검증 통과를
FCP·유창성·메모리 통과로 읽으면 안 된다.

## Trace 후속 확인

- render: 미측정 — 초기 LoadBundle과 첫 화면 pipeline 캡처 필요
- fluency: 미측정 — 탭 전환 구간의 프레임 Trace 필요
- memory: 미측정 — 앱 시작 전후 snapshot 필요
- NativeModule: 해당 없음 — 이 기능이 새 NativeModule을 호출하지 않았다.

## 결론과 후속

- 결론: #32는 앱 셸의 기능 baseline은 남겼지만 성능 baseline은 남기지 못했다.
- 후속: 2단계 수집기가 연결되면 앱 시작과 탭 전환을 같은 시나리오로 새로 측정한다.

## 출처

- [PR #32](https://github.com/libitums/FE/pull/32)
- [탭 네비게이션 실기 기록](../../e2e/tab-navigation.md)

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다. 당시 캡처가 없다.
- [x] 로컬 절대 경로와 계정 이름을 포함하지 않았다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 포함하지 않았다.
- [x] timing flag identifier가 없다.
- [x] 미측정 기록을 baseline이나 성능 통과로 표현하지 않았다.
