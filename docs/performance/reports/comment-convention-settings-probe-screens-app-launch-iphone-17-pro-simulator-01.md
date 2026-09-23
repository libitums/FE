# 설정·탐침 화면 주석 정리·SpeechProbeScreen 분리 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-23T07:02:27Z
- 상태: 측정 — Release Simulator Host를 새로 설치해 성능 캡처 모드로 실행하고, 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했습니다.
- 기능 PR: 주석 규약 적용 4-D단계 — 설정·탐침 다섯 폴더의 주석 정리와 `SpeechProbeScreen`
  분리(이 보고서와 같은 PR). **주석 정리 연작의 마지막 영역입니다.**
- 대상 commit: `b1cfd87aff64c56df3ce2b9148199641dfd267ad`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장 `main.lynx.bundle`;
  `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 앱을 지우고 새로 설치했습니다. 저장된 로그인 토큰이 없어 스플래시가 끝나면 온보딩
  첫 스텝으로 갑니다. 직전 기록(④-C)과 같은 조건이라 그 기록과는 나란히 읽을 수 있습니다.
- 단계: `performance:capture -- start`로 Host를 새로 실행하고 조작하지 않습니다. 약 9초 뒤
  `report`로 보고하고 `stop`으로 종료합니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot입니다.

## 이 변경이 무엇을 건드렸나

설정·탐침 다섯 폴더(`settings` · `profile` · `terms` · `handwriting-probe` ·
`speech-probe`)의 주석을 규약에 맞추고, `SpeechProbeScreen.tsx` 418줄을 관측과 액션으로
갈랐습니다. **실행되는 코드는 옮겨졌을 뿐 바뀌지 않았습니다.**

- `SpeechProbeScreen.tsx` 161 · `SpeechProbeObservations.tsx` 233 · `SpeechProbeActions.tsx` 91,
  짝 CSS 둘
- 두 컴포넌트가 함께 쓰던 `flag`는 순수 로직 파일(`speech-probe.ts`, 294줄)로 옮겼습니다.

**탐침 화면은 개발용이라 제품 경로에서 열리지 않습니다.** 이 시나리오도 그 화면을 그리지
않으므로, 이 기록이 보는 것은 번들에 실린 코드가 초기 load에 주는 영향뿐입니다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 75.759 ms, fcp 76.27 ms
  LoadBundle loadBundle: loadBundle 11.347 ms, parse 2.869 ms,
    loadBackground 11.768 ms, pipeline 75.769 ms, mtsRender 4.063 ms,
    resolve 1.375 ms, layout 0.098 ms,
    paintingUiOperationExecute 1.855 ms, layoutUiOperationExecute 0.319 ms

Memory
  after-initial-load [complete]: totalBytes 1294144 bytes,
    elementBytes 6240 bytes, viewBytes 3072 bytes,
    mainThreadRuntimeBytes 1284832 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 40110312 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 2 ms
```

## 비교

- 기준 기록: [진입 흐름 화면 주석 정리·OnboardingScreen 분리 후 앱 초기 로드 — 01](comment-convention-entry-screens-app-launch-iphone-17-pro-simulator-01.md)
  — **같은 시나리오**(새 설치 → 온보딩)로 잰 유일한 앞 기록입니다.

| 값 | PR ④-C | 이번(PR ④-D) |
|---|---|---|
| 초기 `pipeline` | 77.361 ms | 75.769 ms |
| `parse` | 3.217 ms | 2.869 ms |
| `mainThreadRuntimeBytes` | 1,271,744 bytes | 1,284,832 bytes |
| `totalBytes` | 1,281,056 bytes | 1,294,144 bytes |

같은 조건의 두 회차가 초기 `pipeline` 77.4 ms와 75.8 ms로 1.6 ms 차이입니다. 메모리는
13 KB 늘었는데, 파일이 넷 늘어난 것과 방향은 맞지만 두 회차로는 원인을 확정하지 않습니다.

토큰이 남아 있던 조건으로 잰 앞 기록들(PR ③ · ④-A · ④-B)은 전이 분기가 달라 이 표에 넣지
않았습니다.

## 해석

이번 실행에서 초기 `pipeline`은 75.769 ms였고 element node는 6개(스플래시)였습니다. 첫 paint
직후 memory query는 Lynx 귀속 1,294,144 bytes를 반환했습니다.

**단일 실행끼리의 비교라는 한계가 있어 회귀 여부는 이 자료로 판정할 수 없습니다.** 같은
시나리오의 회차가 둘뿐이라 1.6 ms 차이나 13 KB 차이가 변경 때문인지 회차 간 흔들림인지
갈리지 않습니다. 앞선 기록들에서 같은 코드로도 초기 `pipeline`이 91 ms와 97 ms로 6 ms 가까이
흔들린 적이 있어, 이 폭의 차이를 해석하지 않는 편이 자료에 맞습니다.

주석 정리 연작 전체(PR ② ~ ④-D)를 통틀어 **300줄 넘는 제품 파일이 7개에서 0개가 되었고**,
그 과정에서 제품 파일이 31개 늘었습니다. 번들 크기는 774.1 kB(연작 시작 전) → 776.6 kB로
2.5 kB(0.3%) 커진 뒤 그 수준을 유지했습니다.

수치의 분산, 실제 기기 체감, 다른 iOS·기기에서의 결과를 일반화하지 않으며 성능 통과·개선·
회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace 미수집입니다. 모듈이 31개 늘어난 것이 초기 평가에 주는 영향은 Trace의 모듈
  평가 구간을 봐야 갈립니다.
- fluency: 미확인입니다. 이 변경은 애니메이션·타이머를 건드리지 않습니다.
- memory: `after-initial-load` 하나뿐입니다. 탐침 화면은 제품 경로에서 열리지 않아 그 화면의
  메모리는 이 기록의 관심사가 아닙니다.
- NativeModule: 해당 없음 — 이 시나리오에 NativeModule 호출이 없습니다. 음성 인식 모듈 호출은
  탐침 화면 안에 있고 이 경로를 지나지 않습니다.

## 결론과 후속

- 결론: 설정·탐침 주석 정리와 `SpeechProbeScreen` 분리가 들어간 대상 commit에서 초기 load를
  한 회차 수집했습니다. 같은 시나리오의 직전 기록과 비교해 렌더 수치는 1.6 ms 작고 메모리는
  13 KB 큽니다. 두 회차뿐이라 이 차이로 성능 변화 방향을 판정하지 않습니다.
- 후속: **연작이 끝났으므로 같은 commit·같은 시나리오를 여러 회차 재어 흔들림 폭을 먼저
  잡습니다.** 그 폭을 잡은 뒤에야 연작 전체의 누적 영향(번들 +2.5 kB, 모듈 +31개)을 수치로
  말할 수 있습니다. 그 전까지는 회차 사이 차이를 해석하지 않습니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
