# 학습 화면 주석 정리·listening.ts 분리 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-23T04:24:43Z
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 새로 실행해 초기 load의 Rendering
  entry와 `after-initial-load` Memory snapshot을 수집했습니다. 같은 실행에서 스플래시 뒤 첫
  화면 전환(여정 맵 탭)의 Pipeline entry와 `after-navigation-journey-01` snapshot도 함께
  남았습니다.
- 기능 PR: 주석 규약 적용 4-A단계 — 학습 화면 여섯 폴더의 주석 정리와 `listening.ts` 분리
  (이 보고서와 같은 PR)
- 대상 commit: `84b5cbcb860c5293cb65fe0fac9eab96344e430f`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장
  `main.lynx.bundle`(776.6 kB); `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 대상 commit의 Release Host를 iPhone 17 Pro 시뮬레이터에 설치합니다. 첫 화면은
  스플래시이고, 시뮬레이터에 이전 실행이 저장한 로그인 토큰이 남아 있어 스플래시가 끝나면
  진입 흐름을 건너뛰고 여정 맵으로 넘어갑니다.
- 단계: `performance:capture -- start`로 Host를 새로 실행하고 조작하지 않습니다. 약 8초 뒤
  `performance:capture -- report`로 보고하고 `stop`으로 종료합니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot,
  그리고 스플래시 뒤 여정 맵 탭 전환 한 번입니다.

## 이 변경이 무엇을 건드렸나

학습 화면 여섯 폴더(`listening` · `word-choice` · `sentence-order` · `culture` ·
`culture-quiz` · `assessment`)의 주석을 규약에 맞추고, `listening.ts` 397줄을 책임별로
갈랐습니다. **실행되는 코드는 옮겨졌을 뿐 바뀌지 않았습니다.**

- `listening.ts` → `listening-questions.ts` 201 · `listening-session.ts` 124 ·
  `listening-copy.ts` 48 · `listening-playback.ts` 25 · 배럴 9

**이 시나리오는 학습 화면을 그리지 않습니다.** 첫 paint는 스플래시이고 그다음은 여정 맵이라,
분리한 모듈은 번들에 실릴 뿐 평가되지 않습니다. 그래서 이 기록이 보는 것은 **번들 크기와
초기 평가 비용**뿐입니다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 96.896 ms, fcp 97.379 ms
  LoadBundle loadBundle: loadBundle 14.173 ms, parse 3.495 ms,
    loadBackground 13.511 ms, pipeline 96.904 ms, mtsRender 5.529 ms,
    resolve 1.595 ms, layout 0.105 ms,
    paintingUiOperationExecute 2.375 ms, layoutUiOperationExecute 0.284 ms
  Pipeline updateTriggeredByBts (libitum:navigation:journey): pipeline 73.538 ms,
    mtsRender 1.389 ms, resolve 2.617 ms, layout 44.189 ms,
    paintingUiOperationExecute 7.288 ms, layoutUiOperationExecute 12.163 ms

Memory
  after-initial-load [complete]: totalBytes 1284368 bytes,
    elementBytes 6240 bytes, viewBytes 3072 bytes,
    mainThreadRuntimeBytes 1275056 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 37865704 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 2 ms
  after-navigation-journey-01 [complete]: totalBytes 1440352 bytes,
    elementBytes 73840 bytes, viewBytes 49280 bytes,
    mainThreadRuntimeBytes 1317232 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 61016584 bytes, elementNodeCount 71 nodes
```

## 비교

- 기준 기록: [주석 정리·파일 분리(lib·app) 후 앱 초기 로드 — 01](comment-convention-app-lib-app-launch-iphone-17-pro-simulator-01.md)
  — 같은 기기·OS·SDK·Release 조건, 같은 첫 화면, 같은 전환, 하루 안의 연속 측정입니다.
- 차이: 단일 실행끼리의 관측 차이만 적습니다.

| 값 | 직전(PR ③) | 이번(PR ④-A) |
|---|---|---|
| 번들 | 776.7 kB | 776.6 kB |
| `parse` | 3.319 ms | 3.495 ms |
| 초기 `pipeline` | 91.058 ms | 96.904 ms |
| `mainThreadRuntimeBytes`(초기) | 1,275,904 bytes | 1,275,056 bytes |
| 여정 전환 `pipeline` | 58.788 ms | 73.538 ms |

번들은 0.1 kB 줄었습니다. 파일은 넷 늘었지만 주석이 그만큼 줄어든 몫으로 보이며, 이 크기
차이는 측정 잡음과 구분되지 않습니다. 초기 `pipeline`과 전환 `pipeline`은 이번이 더 컸는데,
같은 코드 경로를 두 회차 재는 동안에도 흔들리는 폭 안입니다.

## 해석

이번 실행에서 초기 `pipeline`은 96.904 ms였고 element node는 6개(스플래시)였습니다. 첫
paint 직후 memory query는 Lynx 귀속 1,284,368 bytes를 반환했습니다.

**단일 실행끼리의 비교라는 한계가 있어 회귀 여부는 이 자료로 판정할 수 없습니다.** 초기
`pipeline`이 5.8 ms, 전환 `pipeline`이 14.8 ms 커 보이지만, 같은 조건의 반복 측정이 없으면
이 폭이 변경 때문인지 분산인지 갈리지 않습니다. 이 변경이 주석과 파일 위치만 건드렸고 학습
화면은 이 시나리오에서 그려지지도 않는다는 사실이, 커진 값을 변경의 결과로 읽기 어렵게 하는
쪽의 근거입니다.

수치의 분산, 실제 기기 체감, 다른 iOS·기기에서의 결과를 일반화하지 않으며 성능 통과·개선·
회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace 미수집입니다. 모듈이 넷 늘어난 것이 초기 평가에 영향을 주는지는 Trace의 모듈
  평가 구간을 봐야 갈립니다.
- fluency: 미확인입니다. 학습 화면의 재생 타이머와 정오 판정은 이 캡처가 지나지 않습니다.
- memory: 스냅숏 둘뿐이고, 학습 화면 진입 후 메모리는 이 기록에 없습니다.
- NativeModule: 해당 없음 — 이 시나리오에 NativeModule 호출이 없습니다. 듣기 화면의 오디오
  재생은 이 경로 밖입니다.

## 결론과 후속

- 결론: 학습 화면 주석 정리와 `listening.ts` 분리가 들어간 대상 commit에서 초기 load와 첫
  전환을 한 회차 수집했습니다. 번들은 사실상 그대로이고(−0.1 kB), 렌더 수치는 직전 기록보다
  크게 나왔습니다. 두 기록 다 한 회차라 이 차이로 성능 변화 방향을 판정하지 않습니다.
- 후속: 남은 분리 PR(④-B~D)까지 끝난 뒤 같은 조건에서 여러 회차를 재어, 지금까지의 회차별
  흔들림 폭이 어느 정도인지 먼저 잡습니다. 그 폭을 모르는 동안에는 회차 사이 차이를 해석하지
  않습니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
