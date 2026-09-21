# 스플래시 로고 애니메이션 · 전체 화면 safe area 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-21T06:21:12Z
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 새로 실행해 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했다.
- 기능 PR: [#96 — 스플래시 로고 애니메이션 · 전체 화면 safe area · dev playground](https://github.com/libitums/FE/pull/96)
- 대상 commit: `bacf72d8c85334cc03506a4498faeb447d9a9863`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장
  `main.lynx.bundle`과 `Resource/static/image`의 로고 animated WebP(516,444 bytes, 89 frames,
  1142×523); `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 대상 commit의 Release Host를 iPhone 17 Pro 시뮬레이터에 설치한다. 첫 화면은
  스플래시이고 brand.primary 바탕 가운데에 로고 animated WebP를 한 번 재생한다.
- 단계: `performance:capture -- start`로 Host를 새로 실행하고 조작하지 않는다. 약 6초 뒤
  (로고 재생 약 2.4초와 온보딩 전이가 끝난 뒤) `performance:capture -- report`로 보고하고
  `stop`으로 종료한다. 같은 조작을 직전에 한 번 더 했을 때 report가 **이전 실행의 캡처
  파일**을 읽어 값이 그대로 나온 적이 있어, `paintEnd`가 바뀐 것을 확인한 실행만 기록한다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리
  snapshot.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 64.535 ms, fcp 64.837 ms
  LoadBundle loadBundle: loadBundle 8.499 ms, parse 1.267 ms,
    loadBackground 6.926 ms, pipeline 64.551 ms, mtsRender 3.422 ms,
    resolve 0.54 ms, layout 0.045 ms,
    paintingUiOperationExecute 1.217 ms, layoutUiOperationExecute 0.212 ms

Memory
  after-initial-load [complete]: totalBytes 3249544 bytes,
    elementBytes 6240 bytes, viewBytes 2392136 bytes,
    mainThreadRuntimeBytes 851168 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 37751040 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 1 ms
```

## 비교

- 기준 기록: [앱 아이콘 · WebP 디코더 등록 후 앱 초기 로드 — 01](app-icon-webp-decoder-app-launch-iphone-17-pro-simulator-01.md)
  — 같은 기기·OS·SDK·Release 조건이지만 첫 화면이 텍스트 스플래시였다.
- 참고 관측(기록 파일 없음): 같은 PR에서 `/static/…` 이미지 redirect를 넣기 **전** Release
  Host는 로고를 불러오지 못해(`unsupported URL`) `viewBytes` 3,072 bytes, totalBytes
  860,480 bytes였다. redirect 뒤 이번 실행은 `viewBytes` 2,392,136 bytes다.
- 차이: 계산하지 않음. 모두 단일 실행의 관측값이며 성능 개선·회귀나 예산 통과 여부를
  판정할 비교 자료가 아니다.

## 해석

이번 실행에서 초기 `pipeline`은 64.551 ms였고 element node는 6개였다. 첫 paint 직후 완료된
memory query는 Lynx 귀속 3,249,544 bytes를 반환했고 그중 `viewBytes`가 2,392,136 bytes였다.
로고가 그려지지 않던 실행의 `viewBytes`(3,072 bytes)와 비교하면 이 차이의 대부분은 로고
animated WebP의 디코딩 결과로 **보인다** — 다만 어느 프레임까지 디코딩된 시점인지, 재생이
끝난 뒤 해제되는지는 이 snapshot 하나로 말할 수 없다.

단일 캡처이고 같은 commit의 반복 회차가 없으므로 수치의 분산, 실제 기기 체감, 다른 iOS·
기기에서의 결과를 일반화하지 않는다. 성능 통과·개선·회귀를 주장하지 않는다.

## Trace 후속 확인

- render: Trace 미수집. 반복 측정에서 일관된 변화가 확인될 때 parse·MTS render·resolve·
  layout·UI operation·paint 단계를 시간축으로 확인한다.
- fluency: 미확인 — 로고 재생(약 2.4초, 20 ms 프레임 위주)의 프레임 드롭은 이 캡처가 재지
  않는다. 필요하면 실기에서 Instruments Animation Hitches로 본다.
- memory: `after-initial-load` 하나뿐이다. 스플래시에서 온보딩으로 넘어간 뒤 로고 디코딩
  메모리가 해제되는지 before·peak·after로 따로 확인한다.
- NativeModule: 해당 없음 — 이 시나리오에서 NativeModule 호출이 없다. 이미지 redirect는
  NativeModule이 아니라 Lynx media resource fetcher 경로다.

## 결론과 후속

- 결론: 로고 animated WebP가 Release Host에서 실제로 그려지는 대상 commit의 초기 load
  Rendering과 완료 상태 Memory snapshot 한 회차를 수집했다. 로고 디코딩이 Lynx 귀속 메모리의
  대부분을 차지하는 것으로 보이지만, 이 값만으로 성능 변화 방향을 판정하지 않는다.
- 후속: 스플래시 이탈 후 메모리 잔류를 확인하고, 같은 조건의 기준선과 후보를 여러 번 측정하기
  전에는 baseline이나 허용폭을 정하지 않는다. 로고 WebP를 lossy로 다시 인코딩하면 파일 크기는
  줄지만 디코딩 메모리는 해상도·프레임 수에 달려 있으므로 그 둘을 먼저 본다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았다.
