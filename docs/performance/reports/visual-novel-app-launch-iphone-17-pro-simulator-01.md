# 비주얼 노벨 번들 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 시뮬레이터 실행이며 성능 기준선이나 회귀 통과를 판정하지 않는다.

## 실행 조건

- 측정 일시: 2026-09-10T20:49:45+09:00
- 상태: 측정 — iOS Host의 PerformanceEntry와 전역 메모리 query를 수집·검증했다.
- 기능 PR: [#64 — 비주얼 노벨 특수 유닛 추가](https://github.com/libitums/FE/pull/64)
- 대상 commit: `e893d78f14e0745a79a0ed754530cbbcef54cda1`
- 기기: iPhone 17 Pro 시뮬레이터 (`3B5DADAD-597A-406C-AC83-26B3D3FADECB`)
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: Release Host, `CODE_SIGNING_ALLOWED=NO`, `pnpm bundle:host`로 만든
  `main.lynx.bundle`과 `Resource/static/image` 세 자산 내장; 번들 364,289 bytes,
  SHA-256 `f31dd8a0a3cbd3ad48e0e41d0d810e8b9ef21e0cb5cc9a15dd76a21c4461633c`
- 실행 회차: 01

## 시나리오

- 전제: 기존 booted iPhone 17 Pro 시뮬레이터에 현재 commit의 Release Host를 빌드·설치한다.
- 단계: 저장소의 `performance:capture:smoke`로 build·install·수집 연결을 검증한 뒤 설치된
  Host에서 `performance:capture`의 `start → report → stop`을 순서대로 실행한다. 홈 화면이
  나타난 뒤 별도 조작은 하지 않는다.
- 관찰 구간: 초기 `loadBundle` 시작부터 첫 paint까지와 직후 `after-initial-load` 메모리 query.

이 시나리오는 비주얼 노벨 화면에 진입하지 않았다. 따라서 임시 PNG 세 개의 decode·합성,
arrive→find 이미지 source 교체, 대사 패널의 렌더 비용은 측정 대상이 아니다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 127.595 ms, fcp 128.229 ms
  LoadBundle loadBundle: loadBundle 42.189 ms, parse 1.694 ms,
    loadBackground 7.344 ms, pipeline 127.606 ms, mtsRender 2.591 ms,
    resolve 1.736 ms, layout 28.332 ms,
    paintingUiOperationExecute 6.537 ms, layoutUiOperationExecute 0.709 ms

Memory
  after-initial-load [complete]: totalBytes 703568 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 650992 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 37079344 bytes,
    elementNodeCount 30 nodes; status completed; instances 1/1; collection 1 ms
```

## 비교

- 기준 기록: 없음 — 같은 기기·OS·Host와 최신 `main`을 같은 실행 순서로 다시 수집한 기록이 없다.
- 차이: 계산하지 않음. 기존 보고서는 다른 commit·payload·실행 순서이므로 이 변경의 성능
  차이로 재사용하지 않는다.

## 해석

이번 단일 실행은 비주얼 노벨 코드와 정적 자산을 포함한 Release bundle의 초기 load pipeline과
홈 화면 직후 메모리 한 지점만 보여 준다. 이미지 파일은 Host resource에 포함됐지만 화면에
진입하지 않아 decode 또는 layer 합성 비용을 말할 수 없다. 반복 실행 분산, cache cold 여부,
실제 iPhone, 장면 전환 유창성과 메모리 잔류도 판정할 수 없다. 승인된 성능 예산과 동일 조건의
비교 기록이 없으므로 이 수치는 성능 기준선이나 회귀 통과 증거가 아니다.

## Trace 후속 확인

- render: 초기 parse→MTS render→resolve→layout→UI operation→paint는 기록했지만 Trace는 미수집.
- fluency: 해당 없음 — 비주얼 노벨 진입과 장면 전환을 수행하지 않았다.
- memory: 초기 snapshot 하나뿐이므로 이미지 진입 전/peak/이탈 후 잔류를 말할 수 없다.
- NativeModule: 해당 없음 — 관찰 구간에서 비주얼 노벨 완료 안내를 발생시키지 않았다.

## 결론과 후속

- 결론: 현재 Release bundle의 초기 load Rendering과 Memory 한 회차를 재현 가능한 조건으로
  확보했지만 비주얼 노벨 화면 성능이나 이전 대비 방향은 판정할 수 없다.
- 후속: 임시 이미지가 실제 자산으로 교체되거나 성능 예산이 정해지면 동일 Host에서
  `main`과 candidate를 교차 반복하고, 화면 진입→arrive→find→enter→이탈 구간의 Trace와
  before/peak/after 메모리를 수집한다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아니다.
- [x] 미측정 범위를 기준선이나 성능 통과로 표현하지 않았다.
