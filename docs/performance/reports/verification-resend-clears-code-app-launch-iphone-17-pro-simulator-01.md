# 재전송 시 코드 지우기 수정 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-23T07:08:05Z
- 상태: 측정 — Release Simulator Host를 새로 설치해 성능 캡처 모드로 실행하고, 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했습니다.
- 기능 PR: 코드 검증 화면에서 Resend를 누르면 입력한 코드를 지우는 수정(이 보고서와 같은 PR)
- 대상 commit: `f6dda5d19f5b1c5fe2b8ab75ab5beda7ef3436fb`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장 `main.lynx.bundle`;
  `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 앱을 지우고 새로 설치했습니다. 저장된 로그인 토큰이 없어 스플래시가 끝나면 온보딩
  첫 스텝으로 갑니다. 앞선 두 기록(④-C · ④-D)과 같은 조건입니다.
- 단계: `performance:capture -- start`로 Host를 새로 실행하고 조작하지 않습니다. 약 9초 뒤
  `report`로 보고하고 `stop`으로 종료합니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot입니다.

⚠ **이 시나리오는 고친 화면을 지나지 않습니다.** 코드 검증 화면은 전화번호로 로그인해야
닿는 자리이고, 이 캡처는 온보딩 첫 스텝에서 멈춥니다. 수정의 동작 확인은 자동 테스트
(`[VC-U9]`)와 시뮬레이터 수동 확인이 졌습니다.

## 이 변경이 무엇을 건드렸나

Resend를 눌러도 이미 입력한 코드가 남아, 아무것도 치지 않고 Continue를 누르면 **이전 코드가
제출되던 문제**를 고쳤습니다.

- `round`가 바뀔 때 `digits`를 비웁니다.
- 값을 스스로 드는(비제어) 칸 넷을 `key={round}`로 다시 마운트해 화면에서도 지워지게 했습니다.

동작이 바뀌는 수정이라 테스트를 먼저 썼습니다 — `[VC-U9]`는 고치기 전 빨갛고 고친 뒤
초록입니다. 시뮬레이터에서도 `1234`를 넣고 Resend를 누르면 칸이 비고 타이머가 05:00부터
다시 세는 것을 확인했습니다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 66.679 ms, fcp 67.052 ms
  LoadBundle loadBundle: loadBundle 10.196 ms, parse 2.334 ms,
    loadBackground 7.388 ms, pipeline 66.687 ms, mtsRender 3.607 ms,
    resolve 1.222 ms, layout 0.02 ms,
    paintingUiOperationExecute 2.084 ms, layoutUiOperationExecute 0.362 ms

Memory
  after-initial-load [complete]: totalBytes 1282048 bytes,
    elementBytes 6240 bytes, viewBytes 3072 bytes,
    mainThreadRuntimeBytes 1272736 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 38324480 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 1 ms
```

## 비교

- 기준 기록: [설정·탐침 화면 주석 정리·SpeechProbeScreen 분리 후 앱 초기 로드 — 01](comment-convention-settings-probe-screens-app-launch-iphone-17-pro-simulator-01.md)
  와 [진입 흐름 화면 주석 정리·OnboardingScreen 분리 후 앱 초기 로드 — 01](comment-convention-entry-screens-app-launch-iphone-17-pro-simulator-01.md)
  — 셋 다 같은 시나리오(새 설치 → 온보딩)입니다.

| 값 | PR ④-C | PR ④-D | 이번 |
|---|---|---|---|
| 초기 `pipeline` | 77.361 ms | 75.769 ms | 66.687 ms |
| `parse` | 3.217 ms | 2.869 ms | 2.334 ms |
| `mainThreadRuntimeBytes` | 1,271,744 | 1,284,832 | 1,272,736 |

같은 시나리오 세 회차가 77.4 · 75.8 · 66.7 ms입니다. **가장 작은 값과 가장 큰 값이 10.7 ms
차이나고, 이번 변경은 한 화면의 상태 초기화 두 줄이라 이 폭을 만들 자리가 없습니다.**
회차 간 흔들림이 이 정도라는 관측으로 읽습니다.

## 해석

이번 실행에서 초기 `pipeline`은 66.687 ms였고 element node는 6개(스플래시)였습니다. 첫 paint
직후 memory query는 Lynx 귀속 1,282,048 bytes를 반환했습니다.

**단일 실행끼리의 비교라는 한계가 있어 회귀 여부는 이 자료로 판정할 수 없습니다.** 이 기록의
쓸모는 수치가 아니라, 같은 시나리오를 세 번 재는 동안 초기 `pipeline`이 10.7 ms 폭으로
흔들렸다는 사실입니다. 앞선 보고서들이 1~6 ms 차이를 두고 「커졌다·작아졌다」고 적었는데,
그 폭이 흔들림 안에 들어간다는 것을 이 기록이 보여 줍니다.

수치의 분산, 실제 기기 체감, 다른 iOS·기기에서의 결과를 일반화하지 않으며 성능 통과·개선·
회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace 미수집입니다. 코드 검증 화면의 칸 재마운트 비용은 그 화면에 닿는 수집 경로가
  먼저 필요합니다.
- fluency: 미확인입니다. 1초 카운트다운은 이 캡처가 지나지 않습니다.
- memory: `after-initial-load` 하나뿐입니다. `key`로 칸을 다시 마운트할 때의 메모리 변화는
  이 기록 밖입니다.
- NativeModule: 해당 없음 — 이 시나리오에 NativeModule 호출이 없습니다.

## 결론과 후속

- 결론: 재전송 수정이 들어간 대상 commit에서 초기 load를 한 회차 수집했습니다. 수정은 코드
  검증 화면 안에 있고 이 시나리오는 그 화면을 지나지 않으므로, 이 기록은 수정의 영향을 재지
  않습니다. 같은 시나리오 세 회차의 흔들림 폭(10.7 ms)을 남기는 것이 이 기록의 몫입니다.
- 후속: 같은 commit을 여러 회차 재어 흔들림 폭을 수치로 잡습니다. 코드 검증 화면 자체의 렌더
  비용은 그 화면까지 가는 캡처 경로를 만든 뒤에 봅니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
