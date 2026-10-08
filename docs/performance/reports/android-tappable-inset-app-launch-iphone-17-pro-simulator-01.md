# Android 3버튼 하단 여백 수정 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-10-05T05:27:11Z
- 상태: 측정 — Release Simulator Host를 새 시뮬레이터에 새로 설치해 성능 캡처 모드로 실행하고, 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했습니다.
- 기능 PR: Android 3버튼 내비게이션에서 하단 탭 바 · 바텀 시트 조작이 시스템 바에 가리던 문제를 고친 변경(이 보고서와 같은 PR,
  [ADR-0044](../../adr/0044-android-tappable-inset.md))
- 대상 commit: `d244dd03a70a14604ee45203e41354106e74ade4`
- 기기: iPhone 17 Pro 시뮬레이터(이 측정을 위해 새로 만든 기기)
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값(`pod install --deployment`)
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장 `main.lynx.bundle`;
  `--performance-capture --bundle-url=main.lynx`로 실행. Xcode 26.6
- 실행 회차: 01

## 시나리오

- 전제: 새로 만든 시뮬레이터에 앱을 처음 설치했습니다. 저장된 로그인 세션이 없어 스플래시가 끝나면 온보딩
  첫 스텝으로 갑니다.
- 단계: `pnpm bundle:host` → `pod install --deployment` → Release Host 빌드 → 설치 → 성능 캡처 모드로
  실행하고 조작하지 않습니다. 9초 뒤 캡처 파일을 `performance:report` 분석기로 읽고 Host를 종료합니다.
  `performance:capture:smoke`가 하는 순서와 같고, 그 명령은 수치를 출력하지 않아 같은 단계를 손으로 밟았습니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot입니다. 9초 뒤
  화면이 온보딩 첫 스텝인 것을 스크린샷으로 확인했습니다.

⚠ **이 시나리오는 탭 루트에 닿지 않습니다.** 시뮬레이터에서 로그인을 지날 수단이 없어(소셜 로그인만 보이고 개발용
세션 주입 경로가 없습니다) 탭 바 묶음(`AppNavigator`)은 이 캡처에서 그려지지 않습니다. iOS에는 `tappableBottomInset`
키가 없어 탭 루트에 닿았더라도 바닥 면 · 시트의 빈 상자는 만들어지지 않습니다.

## 이 변경이 무엇을 건드렸나

Android 호스트가 globalProps에 `tappableBottomInset`(터치를 가로채는 아래 높이)을 더해 넘기고, 공유 JS가 그 값으로
탭 루트의 아래 여백과 바닥 면을 정합니다. iOS 초기 로드 경로에 얹힌 것은 다음입니다.

- `AppSession`: 렌더마다 `tappableBottomInsetFrom`(파서) · `shellBottomLayout`(판정) 호출이 하나씩 늘었습니다. iOS에서는
  둘 다 0을 돌려 셸의 여백이 수정 전과 같습니다.
- `apps/mobile/lynx.config.ts`의 `pluginReactLynx({ globalPropsMode: "event" })`: `useGlobalProps`가 `useState`와
  `onGlobalPropsChanged` 구독으로 바뀝니다. 앱 셸이 첫 렌더부터 이 훅을 쓰므로 **이 시나리오가 지나는 경로**입니다.
  iOS 호스트가 첫 로드 뒤 `updateGlobalProps`로 safe area를 넘기면 그 값을 쓰는 컴포넌트가 다시 그립니다.
- 탭 바 묶음 컴포넌트와 두 바텀 시트의 조건부 빈 상자: 번들에 코드가 더해졌지만 이 시나리오에서는 실행되지 않습니다.

iOS에서 사용자가 보는 수치는 바뀌지 않습니다. 영향 시나리오는 **앱 실행(초기 로드)** 입니다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 36.054 ms, fcp 36.924 ms
  LoadBundle loadBundle: loadBundle 14.393 ms, parse 3.605 ms,
    loadBackground 17.117 ms, pipeline 36.064 ms, mtsRender 5.589 ms,
    resolve 1.755 ms, layout 0.032 ms,
    paintingUiOperationExecute 1.881 ms, layoutUiOperationExecute 0.565 ms

Memory
  after-initial-load [complete]: totalBytes 4472216 bytes,
    elementBytes 6240 bytes, viewBytes 2392136 bytes,
    mainThreadRuntimeBytes 2073840 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 50596096 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 0 ms
```

캡처 레코드는 둘(Rendering entry 하나 · Memory snapshot 하나)이고 분석기는 종료 코드 0으로 끝났습니다.

## 비교

- 기준 기록: [Android 시스템 뒤로가기 연결 후 앱 초기 로드 — 01](android-system-back-app-launch-iphone-17-pro-simulator-01.md)
  — 대상 commit `0e8624c2`. 그 commit과 이 변경의 직전 commit(`db7604e4`) 사이에는 문서 변경 하나뿐이라 **앱 런타임 ·
  iOS Host는 이 변경 직전과 같습니다.** 같은 시나리오 · 같은 Xcode 26.6 · 같은 iOS 26.5 · 새로 만든 시뮬레이터입니다.

| 값 | 기준(`0e8624c2`) | 이번(`d244dd03`) | 차이 |
|---|---|---|---|
| 초기 `pipeline` | 46.221 ms | 36.064 ms | −10.157 ms |
| `parse` | 4.383 ms | 3.605 ms | −0.778 ms |
| `mtsRender` | 7.453 ms | 5.589 ms | −1.864 ms |
| `mainThreadRuntimeBytes` | 2,063,040 bytes | 2,073,840 bytes | +10,800 bytes |
| `viewBytes` | 3,072 bytes | 2,392,136 bytes | +2,389,064 bytes |
| `totalBytes` | 2,072,352 bytes | 4,472,216 bytes | +2,399,864 bytes |
| `elementNodeCount` | 6 nodes | 6 nodes | 0 |

- 차이: `mainThreadRuntimeBytes`가 10,800 bytes 큽니다. 같은 번들이면 흔들리지 않는 값이고 두 기록 사이의 런타임 차이는 이
  변경뿐이라, **이 증가는 이 변경(번들에 더해진 코드와 `event` 모드 훅)에 귀속하는 것이 가장 그럴듯합니다.** 다만 양쪽 모두
  단일 실행입니다.
- `viewBytes`가 약 2.39 MB 큽니다(그래서 `totalBytes`도). **이 차이는 이 변경으로 설명되지 않습니다** — 두 시점 모두 element
  node가 6개(스플래시)로 같고, 이 변경은 스플래시 · 온보딩의 뷰를 바꾸지 않습니다. 이번 snapshot의 `collection`이 0 ms(기준 3 ms)라
  수집 시점의 뷰 상태(예: 이미지 디코드가 먼저 끝났는지)가 달랐을 가능성이 있지만 확인하지 않았습니다.
- 렌더 시간은 기준보다 짧습니다. 같은 commit에서도 초기 `pipeline`이 12.6 ms 폭으로 흔들린다는 참고 기록
  ([5회차 반복 측정](same-commit-variance-app-launch-iphone-17-pro-simulator-05runs.md))이 있어, 단일 회차 사이의 10 ms 차이는
  방향을 말하지 않습니다.

## 해석

이번 실행에서 초기 `pipeline`은 36.064 ms, `parse`는 3.605 ms였고 element node는 6개(스플래시)였습니다. 첫 paint 직후
memory query는 Lynx 귀속 4,472,216 bytes를 반환했고 그중 main thread runtime이 2,073,840 bytes입니다.

이 변경 직전과 같은 런타임을 같은 조건으로 잰 기록과 나란히 놓으면 main thread runtime이 10,800 bytes(약 0.5%) 늘었습니다.
초기 로드를 느리게 했다는 신호는 이 자료에 없지만, **각각 단일 실행이라 렌더 시간의 변화는 판정할 수 없습니다.**
`viewBytes`의 큰 차이는 원인을 모르고 이 변경과의 관계도 확인하지 않았습니다 — 같은 조건으로 몇 번 더 재야 수집 시점의
흔들림인지 가릴 수 있습니다.

수치의 분산, 실제 기기 체감, Android에서의 결과(이 변경이 실제로 동작하는 플랫폼입니다), 탭 루트의 렌더, 다른 iOS · 기기에서의
결과를 일반화하지 않으며 성능 통과 · 개선 · 회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace 미수집입니다. 탭 루트의 탭 바 묶음 렌더는 이 시나리오가 닿지 않습니다.
- fluency: 해당 없음 — 이 시나리오에 스크롤 · 전환이 없습니다.
- memory: `after-initial-load` 하나뿐입니다. `viewBytes` 차이의 원인(수집 시점)은 확인하지 않았습니다.
- NativeModule: 해당 없음 — 이 변경은 NativeModule을 더하거나 바꾸지 않았습니다. globalProps 갱신(`updateGlobalProps`) 뒤의
  재렌더 비용은 이 캡처가 재지 않았습니다(초기 로드 뒤 갱신은 관찰 구간 밖입니다).

## 결론과 후속

- 결론: Android 3버튼 하단 여백 수정이 들어간 대상 commit에서 iOS 초기 load를 한 회차 수집했습니다(초기 `pipeline`
  36.064 ms · `mainThreadRuntimeBytes` 2,073,840 bytes). 직전과 같은 런타임의 기록보다 main thread runtime이 10,800 bytes 큽니다.
- 후속: `viewBytes` 차이를 가리려면 같은 조건으로 여러 회차를 재어 같은 commit 안의 흔들림인지 봅니다. iOS에서 회전 등
  `updateGlobalProps` 뒤 다시 그리는 비용은 ADR-0044 D4의 iOS 확인과 함께 봅니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
