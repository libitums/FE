# 서비스 표시명 변경 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-14T06:43:16.561Z
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 새로 실행해 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했다.
- 기능 PR: [#72 — Duru 서비스 표시명 적용](https://github.com/libitums/FE/pull/72)
- 대상 commit: `75e7fc275b2a5831e2622f493582ab1e9d927924`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장
  `main.lynx.bundle`; `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: `CFBundleDisplayName=Duru`인 현재 commit의 Release Host를 iPhone 17 Pro
  시뮬레이터에 설치한다.
- 단계: 성능 캡처를 활성화해 Host를 새로 실행하고, 초기 홈 화면의 첫 paint와
  `after-initial-load` memory query가 완료될 때까지 조작하지 않는다. 그 뒤 캡처를
  중지하고 저장소 분석기로 보고한다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리
  snapshot.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 93.260 ms, fcp 93.673 ms
  LoadBundle loadBundle: loadBundle 19.854 ms, parse 0.546 ms,
    loadBackground 5.061 ms, pipeline 93.268 ms, mtsRender 1.207 ms,
    resolve 0.606 ms, layout 11.786 ms,
    paintingUiOperationExecute 4.713 ms, layoutUiOperationExecute 0.503 ms

Memory
  after-initial-load [complete]: totalBytes 610512 bytes,
    elementBytes 31200 bytes, viewBytes 21376 bytes,
    mainThreadRuntimeBytes 557936 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 37079368 bytes, elementNodeCount 30 nodes;
    instances 1/1; collection 1 ms
```

## 비교

- 기준 기록: 없음 — 같은 commit·Release 빌드·iPhone 17 Pro 시뮬레이터·iOS 26.5
  조건의 baseline을 별도로 수집하지 않았다.
- 차이: 계산하지 않음. 이번 값은 단일 실행의 관측값이며 성능 개선·회귀 또는 예산
  통과 여부를 판정할 비교 자료가 아니다.

## 해석

이번 실행에서 초기 `pipeline`은 93.268 ms였고, 그 안에서 `loadBundle`은 19.854 ms,
`layout`은 11.786 ms였다. 첫 paint 직후 완료된 memory query는 Lynx 귀속
610,512 bytes, 앱 프로세스 37,079,368 bytes, element node 30개와 완료 instance 1/1을
반환했다. 이는 지정한 Release 시뮬레이터 실행에서 초기 load와 memory snapshot이 실제로
수집됐다는 기록이다.

서비스 표시명 변경은 iOS 번들 메타데이터 경계의 변경이지만, 이 단일 캡처만으로 해당
변경이 Rendering이나 Memory 값에 준 영향을 분리할 수 없다. 같은 조건의 baseline과 반복
회차가 없으므로 수치의 분산, 실제 기기 체감, 다른 iOS·기기에서의 결과를 일반화하지
않으며 성능 통과·개선·회귀를 주장하지 않는다.

## Trace 후속 확인

- render: Trace 미수집. 반복 측정에서 일관된 변화가 확인될 때 parse·MTS render·resolve·
  layout·UI operation·paint 단계를 시간축으로 확인한다.
- fluency: 해당 없음 — 사용자 조작, 스크롤, 연속 애니메이션 없이 초기 로드만 측정했다.
- memory: `after-initial-load` snapshot 하나만 있어 peak나 retained growth를 판정할 수 없다.
  필요하면 같은 조건의 before·peak·after 회차와 Xcode Allocations/Leaks를 추가한다.
- NativeModule: 이 시나리오에서 별도 Trace를 수집하지 않았다. 후속 회차에서 관련 호출이
  관찰될 때 파라미터 변환·콜백 대기·정리 구간을 확인한다.

## 결론과 후속

- 결론: Duru 표시명이 적용된 대상 commit의 Release Host에서 초기 load Rendering과 완료
  상태 Memory snapshot 한 회차를 수집했으며, 이 값만으로 성능 변화 방향을 판정하지 않는다.
- 후속: 같은 기기·OS·SDK·Release 조건에서 기준선과 후보를 각각 여러 번 측정하기 전에는
  성능 baseline이나 허용폭을 정하지 않는다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았다.
