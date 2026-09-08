# 완료 안내 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 시뮬레이터 실행이며 성능 예산이나 회귀 통과를 판정하지 않는다.

## 실행 조건

- 측정 일시: 2026-09-08T20:13:30+09:00
- 상태: 측정 — iOS Host의 PerformanceEntry와 전역 메모리 query를 수집·검증했다.
- 기능 PR: [#61 — 완료 안내가 VoiceOver에서 끝까지 들리도록 수정](https://github.com/libitums/FE/pull/61)
- 대상 commit: `d4942a43a47091402e82c168f8cc2679651ae37f`
- 기기: iPhone 17 Pro 시뮬레이터 (`3B5DADAD-597A-406C-AC83-26B3D3FADECB`)
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: Release Host, `CODE_SIGNING_ALLOWED=NO`, `pnpm bundle:host`로 만든 `main.lynx.bundle` 내장; 번들 289,403 bytes, SHA-256 `6961d8ef8959b12739c33dfd8936b8c8daf1cd8e97180ee364a001497c1bc78c`
- 실행 회차: 01

## 시나리오

- 전제: 기존 booted iPhone 17 Pro 시뮬레이터에 위 Release Host를 설치한다.
- 단계: `simulator.mjs`의 `runSimulatorCommand` seam에 `simctl` 주입을 사용해 `booted`를 명시적 UDID `3B5DADAD-597A-406C-AC83-26B3D3FADECB`로 치환한 뒤 `start → path → report → stop`을 순서대로 실행한다. 이는 제품 CLI 수정이 아니라 명령 주입이다. 홈 화면이 나타날 때까지 조작하지 않는다.
- 관찰 구간: 초기 `loadBundle` 시작부터 첫 paint까지와 직후 `after-initial-load` 메모리 query.

설치된 Host app과 Release derived-data app의 번들 SHA-256은 위 SHA와 일치함을 확인했다.

이번 시나리오는 완료 화면으로 이동하거나 완료 안내를 발생시키지 않았다. 따라서 `announceCompletion` 실행 시간, VoiceOver 가청성·완주, announcement callback은 측정 대상이 아니다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 91.116 ms, fcp 91.523 ms
  LoadBundle loadBundle: loadBundle 25.53 ms, parse 2.811 ms,
    loadBackground 7.327 ms, pipeline 91.126 ms, mtsRender 2.482 ms,
    resolve 1.597 ms, layout 11.025 ms,
    paintingUiOperationExecute 6.234 ms, layoutUiOperationExecute 0.723 ms

Memory
  after-initial-load [complete]: totalBytes 610512 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 557936 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 37701936 bytes,
    elementNodeCount 30 nodes; status completed; instances 1/1; collection 1 ms
```

## 비교

- 기준 기록: 없음 — 동일 기기·OS·빌드 조건으로 재수집한 baseline이 없다.
- 차이: 계산하지 않음. 저장소의 기존 수치는 다른 commit·조건의 기록이므로 기계적으로 비교하거나 이번 변경의 성능 차이로 재사용하지 않는다.

## 해석

이번 실행은 변경된 번들의 초기 로드 pipeline과 초기 메모리 snapshot만 보여 준다. 완료 전이 발화 코드는 관찰 구간에서 실행되지 않았으므로 그 비용이나 회귀를 말할 수 없다. 단일 시뮬레이터 회차라 실제 기기, 반복 실행 분산, 사용자 체감 성능도 판정할 수 없다.

## Trace 후속 확인

- render: 초기 parse→MTS render→resolve→layout→UI operation→paint는 기록했지만 Trace는 미수집.
- fluency: 해당 없음 — 스크롤·완료 전이 구간을 수행하지 않았다.
- memory: 초기 snapshot 하나뿐이므로 before/peak/after 잔류를 말할 수 없다.
- NativeModule: 초기 로드에서 완료 안내 NativeModule 호출을 관찰하지 않았다.

## 결론과 후속

- 결론: LIB-253 대상 번들의 초기 로드 측정은 확보했지만 완료 안내의 실행 시간이나 가청성은 이 기록으로 판정할 수 없다.
- 후속: 기존 E10 실기 청취 확인은 별도 자료로 유지하며 이 성능 측정으로 대체하지 않는다. 완료 전이 조작 구간은 별도 Trace/계측으로 수집한다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아니다.
- [x] 미측정 범위를 baseline이나 성능 통과로 표현하지 않았다.
