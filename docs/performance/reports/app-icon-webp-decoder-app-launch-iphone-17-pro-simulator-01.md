# 앱 아이콘 · WebP 디코더 등록 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-21T06:09:18Z
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 새로 실행해 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했다.
- 기능 PR: [#95 — 앱 아이콘 적용 · Host WebP 디코더 등록](https://github.com/libitums/FE/pull/95)
- 대상 commit: `6c538da30e5d6a372d5b75d5c7d3e3fdd0c3769e`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장
  `main.lynx.bundle`; `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 앱 아이콘과 `SDImageWebPCoder` 등록(`AppDelegate`), brand.primary 런치 스크린이
  들어간 대상 commit의 Release Host를 iPhone 17 Pro 시뮬레이터에 설치한다.
- 단계: `performance:capture -- start`로 Host를 새로 실행하고, 초기 화면의 첫 paint와
  `after-initial-load` memory query가 완료될 때까지 조작하지 않는다. 그 뒤
  `performance:capture -- report`로 보고하고 `stop`으로 종료한다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리
  snapshot.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 125.864 ms, fcp 126.289 ms
  LoadBundle loadBundle: loadBundle 48.777 ms, parse 1.931 ms,
    loadBackground 6.607 ms, pipeline 125.873 ms, mtsRender 2.083 ms,
    resolve 2.201 ms, layout 36.219 ms,
    paintingUiOperationExecute 5.367 ms, layoutUiOperationExecute 0.426 ms

Memory
  after-initial-load [complete]: totalBytes 850208 bytes,
    elementBytes 9360 bytes, viewBytes 6016 bytes,
    mainThreadRuntimeBytes 834832 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 38258944 bytes, elementNodeCount 9 nodes;
    instances 1/1; collection 0 ms
```

## 비교

- 기준 기록: [서비스 표시명 변경 후 앱 초기 로드 — 01](service-display-name-app-launch-iphone-17-pro-simulator-01.md)
  — 같은 기기·OS·SDK·Release 조건이지만 대상 commit과 초기 화면이 다르다.
- 차이: 계산하지 않음. 그 사이 진입 흐름(스플래시가 첫 화면)과 여러 화면이 바뀌어
  초기 트리 자체가 다르다(elementNodeCount 30 → 9). 두 값은 단일 실행의 관측값이며
  이번 변경의 영향이나 예산 통과 여부를 판정할 비교 자료가 아니다.

## 해석

이번 실행에서 초기 `pipeline`은 125.873 ms였고, 그 안에서 `loadBundle`은 48.777 ms,
`layout`은 36.219 ms였다. 첫 paint 직후 완료된 memory query는 Lynx 귀속
850,208 bytes, 앱 프로세스 38,258,944 bytes, element node 9개와 완료 instance 1/1을
반환했다. 지정한 Release 시뮬레이터 실행에서 초기 load와 memory snapshot이 실제로
수집됐다는 기록이다.

이번 변경은 앱 아이콘 에셋, 런치 스크린 배경색, 앱 시작 시 WebP 디코더 등록 한 줄이다.
대상 commit의 첫 화면은 WebP를 그리지 않으므로 이 시나리오는 **WebP 디코딩 경로를
지나지 않는다** — 디코더 등록 비용이 있다면 앱 시작 쪽이고, Lynx `loadBundle` 이후 구간과는
분리돼 있다. 단일 캡처이고 같은 commit의 등록 전 baseline이 없으므로 이 변경의
Rendering·Memory 영향을 분리할 수 없으며, 수치의 분산이나 실제 기기 결과를 일반화하지
않는다. 성능 통과·개선·회귀를 주장하지 않는다.

## Trace 후속 확인

- render: Trace 미수집. 반복 측정에서 일관된 변화가 확인될 때 parse·MTS render·resolve·
  layout·UI operation·paint 단계를 시간축으로 확인한다.
- fluency: 해당 없음 — 사용자 조작, 스크롤, 연속 애니메이션 없이 초기 로드만 측정했다.
- memory: `after-initial-load` snapshot 하나만 있어 peak나 retained growth를 판정할 수 없다.
  animated WebP를 실제로 그리는 스플래시 변경에서는 디코딩 프레임 메모리를 before·peak·after로
  따로 본다.
- NativeModule: 해당 없음 — 이번 변경은 NativeModule을 추가·변경하지 않았고 이 시나리오에서
  관련 호출이 없다.

## 결론과 후속

- 결론: 앱 아이콘·WebP 디코더 등록이 들어간 대상 commit의 Release Host에서 초기 load
  Rendering과 완료 상태 Memory snapshot 한 회차를 수집했으며, 이 값만으로 성능 변화 방향을
  판정하지 않는다.
- 후속: animated WebP 스플래시가 들어가는 PR에서 디코딩이 실제로 일어나는 초기 로드를 따로
  측정한다. 같은 조건의 기준선과 후보를 여러 번 측정하기 전에는 baseline이나 허용폭을
  정하지 않는다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았다.
