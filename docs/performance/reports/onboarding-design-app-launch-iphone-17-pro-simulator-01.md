# 온보딩 디자인 반영 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-21T07:36:39Z
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 새로 실행해 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했다.
- 기능 PR: [#97 — 온보딩 세 스텝 디자인 반영 · ui-lynx 공통 컴포넌트 조정](https://github.com/libitums/FE/pull/97)
- 대상 commit: `6365b5d9307b6d3f69b0d495d09426fcc5d5f4b8`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장
  `main.lynx.bundle`(624.9 kB)과 Host `Resource` 폴더의 온보딩 그림 두 장(PNG);
  `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 대상 commit의 Release Host를 iPhone 17 Pro 시뮬레이터에 설치한다. 첫 화면은
  스플래시(로고 animated WebP)이고, 애니메이션이 끝나면 온보딩 첫 스텝으로 넘어간다.
- 단계: `performance:capture -- start`로 Host를 새로 실행하고 조작하지 않는다. 약 7초 뒤
  `performance:capture -- report`로 보고하고 `stop`으로 종료한다. report 전 `paintEnd`가
  직전 캡처와 다른 것을 확인해 이전 실행의 파일을 읽지 않았음을 확인했다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리
  snapshot. **첫 paint는 스플래시이고 온보딩 화면의 렌더는 이 구간 밖이다.**

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 69.087 ms, fcp 69.299 ms
  LoadBundle loadBundle: loadBundle 4.841 ms, parse 0.891 ms,
    loadBackground 7.28 ms, pipeline 69.094 ms, mtsRender 1.806 ms,
    resolve 0.163 ms, layout 0.014 ms,
    paintingUiOperationExecute 1.159 ms, layoutUiOperationExecute 0.21 ms

Memory
  after-initial-load [complete]: totalBytes 3342872 bytes,
    elementBytes 6240 bytes, viewBytes 2392136 bytes,
    mainThreadRuntimeBytes 944496 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 37800168 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 1 ms
```

## 비교

- 기준 기록: [스플래시 로고 애니메이션 초기 로드 — 01](splash-logo-animation-app-launch-iphone-17-pro-simulator-01.md)
  — 같은 기기·OS·SDK·Release 조건, 같은 첫 화면(스플래시).
- 차이: 단일 실행끼리의 관측 차이만 적는다. `mainThreadRuntimeBytes`가 851,168 →
  944,496 bytes로 컸고(번들에 온보딩 화면과 ui-lynx 컴포넌트가 더 실렸다), `viewBytes`는
  2,392,136 bytes로 같았다(스플래시 로고 디코딩). pipeline은 64.551 → 69.094 ms였다.
  반복 회차가 없어 이 차이가 분산인지 변경의 영향인지 판정하지 않는다.

## 해석

이번 실행에서 초기 `pipeline`은 69.094 ms였고 element node는 6개(스플래시)였다. 첫 paint
직후 memory query는 Lynx 귀속 3,342,872 bytes를 반환했다. 메인 스레드 런타임 메모리가
직전 기록보다 약 91 KB 큰 것은 번들이 커진 것(온보딩 화면 코드와 새로 소비하는 ui-lynx
컴포넌트)과 방향이 맞지만, 단일 실행이라 원인으로 확정하지 않는다.

이 시나리오는 스플래시가 첫 paint라 **온보딩 화면(그림 두 장 디코딩, 카드 겹침, 글자
칠하기 타이머)의 렌더·메모리 비용을 재지 않는다.** 온보딩 진입 뒤 snapshot을 남기는
수집 경로가 아직 없다. 수치의 분산, 실제 기기 체감, 다른 iOS·기기에서의 결과를 일반화하지
않으며 성능 통과·개선·회귀를 주장하지 않는다.

## Trace 후속 확인

- render: Trace 미수집. 온보딩 스텝 전환(카드 영역 교체) 구간을 따로 보려면 스텝 전환에
  timing flag를 두는 수집 경로가 먼저 필요하다.
- fluency: 미확인 — 둘째 스텝의 글자 칠하기(350 ms 간격 상태 갱신)와 셋째 스텝 배지 전환은
  이 캡처가 재지 않는다.
- memory: `after-initial-load` 하나뿐이다. 온보딩 첫 스텝 그림(PNG 두 장, 약 1.3 MB)의 디코딩
  메모리와 스플래시 로고 해제 여부는 before·peak·after로 따로 확인한다.
- NativeModule: 해당 없음 — 이 시나리오와 이번 변경에 NativeModule 호출이 없다.

## 결론과 후속

- 결론: 온보딩 디자인이 반영된 대상 commit의 Release Host에서 초기 load Rendering과 완료
  상태 Memory snapshot 한 회차를 수집했다. 첫 화면이 스플래시라 온보딩 자체의 비용은 이
  기록에 없고, 이 값만으로 성능 변화 방향을 판정하지 않는다.
- 후속: 온보딩 그림을 WebP로 바꾼 뒤 온보딩 진입 후 메모리를 따로 측정한다. 같은 조건의
  기준선과 후보를 여러 번 측정하기 전에는 baseline이나 허용폭을 정하지 않는다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았다.
