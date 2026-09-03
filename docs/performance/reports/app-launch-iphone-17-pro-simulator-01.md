# 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-03T21:22:44.918+09:00
- 상태: 측정 — iOS native lifecycle PerformanceEntry와 global memory query를 로컬
  NDJSON로 수집한 뒤 저장소 CLI로 검증했다.
- 기능 PR: [#35 — Lynx 성능 캡처 수집·분석 경로](https://github.com/libitums/FE/pull/35)
- 대상 commit: `7e86d1bc1fe1cf016296bda2b7938d7920eaf329`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: Debug, `CODE_SIGNING_ALLOWED=NO`, `ONLY_ACTIVE_ARCH=YES`, 내장 `main.lynx`
- 번들: `dist/main.lynx.bundle` 164.7 kB
- 실행 회차: 01

## 시나리오

- 전제: 최신 Debug Host와 같은 source tree에서 만든 Lynx bundle을 시뮬레이터에 설치한다.
- 단계: `performance:capture -- start`로 Host를 새로 실행하고 초기 홈 화면의 paint와
  `after-initial-load` memory query가 끝난 뒤 `performance:capture -- report`를 실행한다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 101.963 ms, fcp 102.309 ms
  LoadBundle loadBundle: loadBundle 31.081 ms, parse 3.11 ms,
    loadBackground 5.55 ms, pipeline 101.993 ms, mtsRender 3.723 ms,
    resolve 2.752 ms, layout 15.455 ms,
    paintingUiOperationExecute 3.593 ms, layoutUiOperationExecute 0.867 ms

Memory
  after-initial-load [complete]: totalBytes 463376 bytes,
    elementBytes 30160 bytes, viewBytes 20096 bytes,
    mainThreadRuntimeBytes 413120 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 36653360 bytes, elementNodeCount 29 nodes;
    instances 1/1; collection 0 ms
```

## 비교

- 기준 기록: 없음 — 이 시나리오의 첫 실측 회차다.
- 차이: 계산하지 않음. 단일 시뮬레이터 실행을 성능 예산이나 회귀 판정으로 쓰지 않는다.

## 해석

이 실행에서 초기 pipeline은 약 102ms였고, 그 안에서 `loadBundle`은 약 31ms, layout은
약 15ms였다. 완료 상태의 메모리 query는 Lynx가 귀속한 463,376 bytes와 element node
29개를 반환했다. 이 값은 수집→검증→보고서 경로가 실제 Lynx 4.0.1 iOS callback으로
연결됐다는 근거다.

시뮬레이터 단일 회차이므로 실제 기기의 체감 성능, 분산, 회귀 여부는 말할 수 없다.
초기 화면에 포함된 `libitum:navigation:home` timing flag는 loadBundle entry의 identifier로
관찰됐지만 사용자 탭 조작이 아니므로 별도 내비게이션 메모리 snapshot으로 세지 않았다.

## Trace 후속 확인

- render: Trace 미수집. 반복 실행에서 pipeline이 늘어나면 parse·MTS render·resolve·layout·
  UI operation을 시간축으로 확인한다.
- fluency: 해당 없음 — 이 회차는 스크롤이나 연속 애니메이션 없이 초기 로드만 측정했다.
- memory: 초기 snapshot만 있어 잔류 증가를 말할 수 없다. 기능 조작의 before/peak/after가
  필요하면 같은 조건에서 추가 회차를 기록하고 Xcode Allocations/Leaks로 이어간다.
- NativeModule: 호출 없는 초기 로드 회차여서 별도 Trace를 수집하지 않았다.

## 결론과 후속

- 결론: iOS Host의 opt-in 수집기가 실제 loadBundle/FCP와 완료 상태의 전역 메모리 값을
  NDJSON로 기록했고 기존 분석기가 오류 없이 보고했다.
- 후속: 동일 기기·빌드에서 3회 이상 반복하기 전에는 baseline과 허용폭을 정하지 않는다.
  탭 전환·여정 맵 스크롤은 사용자 조작 구간을 고정한 별도 보고서로 측정한다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았다.
