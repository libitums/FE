# Lynx 성능 캡처 분석

> 분석과 런타임 수집을 분리한 이유와 재검토 조건은
> [ADR-0018](adr/0018-lynx-performance-analysis-boundary.md)에 있다.

이 저장소에는 Lynx PerformanceEntry와 전역 메모리 query 결과를 검증하고 평문 보고서로
바꾸는 로컬 CLI가 있다. 이 도구는 **캡처를 수집하지 않는다.** iOS 호스트에 수집기를
연결하는 일은 2단계 범위다. 지금 단계에서는 저장된 JSON 또는 NDJSON을 반복 가능한
방식으로 분석한다.

## 실행

저장소 루트에서 다음 명령을 실행한다.

```sh
pnpm --filter @libitums/mobile performance:report -- ./capture.json
```

성공하면 stdout에 보고서를 출력하고 종료 코드 0을 반환한다. 파일 읽기·파싱·계약 오류는
stderr와 종료 코드 1, 인자 오류는 usage와 종료 코드 2로 반환한다.

## 보고서 기록 위치

팀이 비교할 분석 기록은 [`docs/performance/reports/`](performance/reports/)에 Markdown으로
남긴다. 파일 하나는 기기·시나리오·실행 회차 하나이며 파일명은
`YYYY-MM-DD-<scenario>-<device>-<run>.md`다.

CLI stdout을 그대로 그 경로로 redirect하지 않는다. 먼저 로컬에서 결과를 검토한 다음
저장소 commit, 기기·OS·Lynx SDK, 재현 단계, 필요한 보고서 구간, 해석과 후속 작업을 양식에
옮긴다. timing flag identifier, 로컬 파일 경로, URL, NativeModule 파라미터, 사용자 콘텐츠는
제거하거나 일반화한다.

원본 JSON/NDJSON 캡처와 검토 전 stdout은 커밋하지 않는다. 양식과 기록 전 확인 항목은
[`docs/performance/reports/README.md`](performance/reports/README.md)에 있다.

사용자 대면 기능을 추가하거나 바꾸는 PR은 영향 시나리오의 기록을 같은 PR에 남긴다.
수집기가 없는 1단계에도 보고서를 생략하지 않고 `미측정` 사유와 다시 측정할 조건을 쓴다.
이 기록은 baseline이나 성능 통과 증거가 아니다. 뼈대와 첫 화면의 과거 누락도 같은 규칙으로
소급 기록하며 당시 자료에 없는 성능 수치는 만들지 않는다(ADR-0018 D9).

## 입력

입력은 레코드 배열인 JSON 또는 한 줄에 레코드 하나인 NDJSON이다. 모든 레코드는
`source`로 종류를 구분한다. `capturedAt`은 선택 사항이며 ISO 문자열을 권장한다.

### PerformanceEntry

Performance API에서 받은 객체를 `entry`에 넣는다.

```json
{
  "source": "performance",
  "capturedAt": "2026-09-03T10:00:00.000Z",
  "entry": {
    "entryType": "pipeline",
    "name": "feed-card-42",
    "identifier": "feed-card-42:1",
    "pipelineStart": 100,
    "pipelineEnd": 124,
    "mtsRenderStart": 100,
    "mtsRenderEnd": 107,
    "resolveStart": 107,
    "resolveEnd": 111,
    "layoutStart": 111,
    "layoutEnd": 117,
    "paintingUiOperationExecuteStart": 117,
    "paintingUiOperationExecuteEnd": 121,
    "layoutUiOperationExecuteStart": 121,
    "layoutUiOperationExecuteEnd": 123,
    "paintEnd": 124
  }
}
```

지원하는 분석은 다음과 같다.

- `entryType: "metric"`, `name: "fcp"`: `lynxFcp.duration`과 선택적인 `fcp`,
  `totalFcp`
- `entryType: "resource"`, `name: "LoadBundle"`: LoadBundle·pipeline·parse·MTS render·
  resolve·layout·UI operation 구간과 LoadBundle에 포함된 FCP
- `entryType: "pipeline"`: pipeline 및 렌더 단계 구간, timing flag의 `name`과
  `identifier`

시작과 종료 필드 중 한쪽만 있거나 종료가 시작보다 이르면 입력 오류다. 공식 시작 필드가
없는 `paintEnd`를 임의의 paint duration으로 바꾸지 않고 끝점으로만 표시한다.

같은 timing flag는 첫 등장에서만 측정되므로 반복 렌더를 재려면 값에 고유 ID를 포함해야
한다. 예를 들어 `feed-card-42:1`, `feed-card-42:2`처럼 기록하고 `identifier`도 함께
보존한다.

### 메모리 스냅샷

전역 메모리 query 결과를 label과 함께 `result`에 넣는다.

```json
{
  "source": "memory",
  "capturedAt": "2026-09-03T10:00:05.000Z",
  "label": "after",
  "result": {
    "collectionStatus": 1,
    "collectionDurationMs": 2000,
    "collectionTimeoutMs": 2000,
    "expectedInstanceCount": 2,
    "completedInstanceCount": 1,
    "totalBytes": 1120,
    "elementBytes": 90,
    "viewBytes": 240,
    "mainThreadRuntimeBytes": 270,
    "backgroundThreadRuntimeBytes": 340,
    "elementNodeCount": 12
  }
}
```

지원 범주는 `totalBytes`, `elementBytes`, `viewBytes`, `mainThreadRuntimeBytes`,
`backgroundThreadRuntimeBytes`, `appBytes`, `elementNodeCount`다. 첫 스냅샷과 마지막
스냅샷 모두에 존재하는 범주만 delta를 계산한다.

`collectionStatus`는 iOS enum의 `0`(completed), `1`(timeout)을 그대로 받을 수 있고 같은
뜻의 문자열도 허용한다. timeout, `completedInstanceCount < expectedInstanceCount`, 또는
범주 누락이면 결과에 `partial`을 표시한다. timeout은 일부 구성요소의 수집이 늦었다는
뜻일 수 있으므로 이미 수집된 값을 버리거나 0으로 채우지 않는다.
background runtime 값은 전역에서 중복 제거된 합계일 수 있어 특정 LynxView만의 전용
메모리로 해석하면 안 된다. 이 query는 고빈도 계측이 아니라 before/peak/after처럼 필요한
시점에 한 번씩 사용하는 능동 진단용이다.

## 출력 해석

보고서는 다음 세 부분으로 고정된다.

1. `Rendering`: FCP, LoadBundle, pipeline 단계의 밀리초 값
2. `Memory`: snapshot 품질, 범주별 byte/node 값, 처음에서 마지막까지의 delta
3. `Trace follow-up`: render, fluency, memory, NativeModule의 다음 확인 지점

보고서는 성능 예산을 판정하지 않는다. 값이 높고 낮다는 기준은 기기·시나리오·제품 예산을
고정한 뒤 별도로 정해야 한다. 특히 Lynx 유창성 문서의 Android Trace 색상 기준을 iOS의
자동 pass/fail 임곗값으로 사용하지 않는다.

Trace에서는 다음 흐름으로 원인을 좁힌다.

- render: 초기 로드의 parse→MTS render→resolve→layout→UI operation→paint와 업데이트의
  diff/pack/parse/patch를 구분한다.
- fluency: 대표 속도로 수행한 iOS 스크롤 전체 구간을 잡고 긴 프레임과 UI 작업·리소스·
  브리지 활동의 시간 상관관계를 본다.
- memory: before/peak/after 잔류를 먼저 본 뒤 Xcode Leaks 또는 Allocations로 이어 간다.
- NativeModule: parameter conversion→platform implementation→background callback wait→
  result conversion→callback execution을 구분하고 특수 호출의 정리 여부를 확인한다.

## 현재 경계와 다음 단계

이번 1단계에는 다음이 없다.

- iOS `LynxViewClient`의 performance event 연결
- ReactLynx `PerformanceObserver`의 조기 등록
- 전역 메모리 query 실행 및 timeout callback 연결
- 실제 화면의 `__lynx_timing_flag` 삽입
- Trace 캡처 또는 파싱 자동화
- 원본 캡처 또는 분석 기록의 자동 업로드

이 항목들은 Screen 2 작업과 합쳐진 뒤 충돌 지점을 확인해 별도 change로 진행한다.

## 공식 문서

- [Performance API](https://lynxjs.org/guide/performance/monitor-performance/performance-api)
- [Timing Flag](https://lynxjs.org/guide/performance/monitor-performance/timing-flag)
- [Render Process](https://lynxjs.org/guide/performance/analysis-performance/analysis-render-process.html)
- [Fluency](https://lynxjs.org/guide/performance/analysis-performance/analysis-fluency.html)
- [Memory](https://lynxjs.org/guide/performance/analysis-performance/analysis-memory.html)
- [NativeModule](https://lynxjs.org/guide/performance/analysis-performance/analysis-native-module.html)
- [Global Memory Usage Query](https://lynxjs.org/guide/performance/monitor-performance/global-memory-usage-query.html)
