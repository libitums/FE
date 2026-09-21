# 진입 화면(로그인 · 코드 검증 · 언어 선택 · 여정 입장) 디자인 반영 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-21T09:20:17Z
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 새로 실행해 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했다. 같은 실행에서 스플래시
  뒤 첫 화면 전환(여정 맵 탭)의 Pipeline entry와 `after-navigation-journey-01` snapshot도 함께
  남았다.
- 기능 PR: 로그인 · 코드 검증 · 언어 선택 · 여정 입장 디자인 반영(이 보고서와 같은 PR)
- 대상 commit: `3775e5b6b537002c1da70d78a5e9aaf0fb3abb48`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장
  `main.lynx.bundle`(774.1 kB)과 Host `Resource` 폴더의 그림(여정 입장 배경 PNG 포함);
  `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 대상 commit의 Release Host를 iPhone 17 Pro 시뮬레이터에 설치한다. 첫 화면은
  스플래시(로고 animated WebP)다. 시뮬레이터에 이전 실행이 저장한 로그인 토큰이 남아 있어,
  스플래시가 끝나면 진입 흐름을 건너뛰고 여정 맵으로 넘어간다.
- 단계: `performance:capture -- start`로 Host를 새로 실행하고 조작하지 않는다. 약 7초 뒤
  `performance:capture -- report`로 보고하고 `stop`으로 종료한다. report 전 `paintEnd`가
  직전 캡처와 다른 것을 확인해 이전 실행의 파일을 읽지 않았음을 확인했다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리
  snapshot, 그리고 스플래시 뒤 여정 맵 탭 전환 한 번. **이번 PR이 바꾼 진입 화면(로그인 ·
  코드 검증 · 언어 선택 · 여정 입장)은 이 실행에서 그려지지 않았다.**

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 95.284 ms, fcp 95.756 ms
  LoadBundle loadBundle: loadBundle 14.132 ms, parse 3.658 ms,
    loadBackground 10.834 ms, pipeline 95.296 ms, mtsRender 4.663 ms,
    resolve 1.756 ms, layout 0.101 ms,
    paintingUiOperationExecute 2.383 ms, layoutUiOperationExecute 0.498 ms
  Pipeline updateTriggeredByBts (libitum:navigation:journey): pipeline 80.876 ms,
    mtsRender 1.169 ms, resolve 2.352 ms, layout 58.984 ms,
    paintingUiOperationExecute 5.304 ms, layoutUiOperationExecute 9.999 ms

Memory
  after-initial-load [complete]: totalBytes 3674728 bytes,
    elementBytes 6240 bytes, viewBytes 2392136 bytes,
    mainThreadRuntimeBytes 1276352 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 39913704 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 5 ms
  after-navigation-journey-01 [complete]: totalBytes 1438224 bytes,
    elementBytes 73840 bytes, viewBytes 49280 bytes,
    mainThreadRuntimeBytes 1315104 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 60410376 bytes, elementNodeCount 71 nodes;
    instances 1/1; collection 15 ms
```

## 비교

- 기준 기록: [온보딩 디자인 반영 후 앱 초기 로드 — 01](onboarding-design-app-launch-iphone-17-pro-simulator-01.md)
  — 같은 기기·OS·SDK·Release 조건, 같은 첫 화면(스플래시).
- 차이: 단일 실행끼리의 관측 차이만 적는다. 번들이 624.9 → 774.1 kB로 커졌고(국가 목록
  245개, 국기·로고 SVG, OptionSelector 등), `mainThreadRuntimeBytes`가 944,496 →
  1,276,352 bytes, `parse`가 0.891 → 3.658 ms, 초기 `pipeline`이 69.094 → 95.296 ms였다.
  `viewBytes`는 2,392,136 bytes로 같았다(스플래시 로고 디코딩). 반복 회차가 없어 이 차이가
  분산인지 변경의 영향인지 판정하지 않는다.

## 해석

이번 실행에서 초기 `pipeline`은 95.296 ms였고 element node는 6개(스플래시)였다. 첫 paint
직후 memory query는 Lynx 귀속 3,674,728 bytes를 반환했다. 메인 스레드 런타임 메모리와
parse 시간이 직전 기록보다 큰 것은 번들이 약 149 kB 커진 것과 방향이 맞지만, 단일 실행이라
원인으로 확정하지 않는다.

스플래시 뒤 전환은 남아 있던 로그인 토큰 때문에 여정 맵으로 갔고, 이번 PR이 바꾼 진입
화면의 렌더·메모리 비용(국가 목록 245행 시트, 여정 입장 배경 그림 디코딩 등)은 **이 기록에
없다.** 수치의 분산, 실제 기기 체감, 다른 iOS·기기에서의 결과를 일반화하지 않으며 성능
통과·개선·회귀를 주장하지 않는다.

## Trace 후속 확인

- render: Trace 미수집. 국가 선택 시트를 열 때(245행 OptionSelector) 구간은 시트 열림에
  timing flag를 두는 수집 경로가 먼저 필요하다.
- fluency: 미확인 — 국가 목록 스크롤, 코드 검증 1초 카운트다운 갱신은 이 캡처가 재지 않는다.
- memory: 여정 입장 배경 PNG(약 550 kB)의 디코딩 메모리는 로그인 토큰을 지운 상태에서 진입
  흐름을 끝까지 지나며 따로 확인한다.
- NativeModule: 해당 없음 — 이 시나리오와 이번 변경에 NativeModule 호출이 없다.

## 결론과 후속

- 결론: 진입 화면 디자인이 반영된 대상 commit의 Release Host에서 초기 load Rendering과 완료
  상태 Memory snapshot 한 회차를 수집했다. 바뀐 진입 화면 자체의 비용은 이 기록에 없고, 이
  값만으로 성능 변화 방향을 판정하지 않는다.
- 후속: 로그인 토큰을 지운 상태로 진입 흐름(로그인 → 국가 시트 → 코드 검증 → 언어 선택 →
  여정 입장)을 지나는 캡처 경로를 만든다. 같은 조건의 기준선과 후보를 여러 번 측정하기
  전에는 baseline이나 허용폭을 정하지 않는다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았다.
