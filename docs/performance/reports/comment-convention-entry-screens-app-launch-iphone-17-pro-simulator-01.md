# 진입 흐름 화면 주석 정리·OnboardingScreen 분리 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-23T06:06:57Z
- 상태: 측정 — Release Simulator Host를 **새로 설치해** 성능 캡처 모드로 실행하고, 초기
  load의 Rendering entry와 `after-initial-load` Memory snapshot을 수집했습니다.
- 기능 PR: 주석 규약 적용 4-C단계 — 진입 흐름 여섯 폴더의 주석 정리와 `OnboardingScreen`
  분리(이 보고서와 같은 PR)
- 대상 commit: `bb1f5803f462e24bd67aad2e6b39c6110cff5bca`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장
  `main.lynx.bundle`; `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: **앱을 지우고 새로 설치했습니다.** 앞선 기록들과 다른 점이 이것입니다. 저장된 로그인
  토큰이 없어 스플래시가 끝나면 **온보딩 첫 스텝**으로 갑니다. 이번 PR이 쪼갠 화면이 바로
  그 온보딩이라, 바뀐 코드가 실제로 그려지는 상태에서 쟀습니다.
- 단계: `performance:capture -- start`로 Host를 새로 실행하고 조작하지 않습니다. 약 9초 뒤
  화면을 캡처해 온보딩 첫 스텝이 떠 있는 것을 눈으로 확인하고, `report`로 보고한 뒤
  `stop`으로 종료합니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot입니다.
  첫 paint는 스플래시이고, 온보딩 렌더는 이 구간 **밖**입니다.

## 이 변경이 무엇을 건드렸나

진입 흐름 여섯 폴더(`splash` · `onboarding` · `login` · `verification-code` ·
`language-select` · `journey-entry`)의 주석을 규약에 맞추고, `OnboardingScreen.tsx` 370줄을
스텝별 컴포넌트 셋으로 갈랐습니다. **실행되는 코드는 옮겨졌을 뿐 바뀌지 않았습니다.**

- `OnboardingScreen.tsx` 134 · `OnboardingStoryCards.tsx` 77 · `OnboardingQuizCards.tsx` 133 ·
  `OnboardingUnitCard.tsx` 42, 짝 CSS 넷(전부 90줄 미만)
- 스텝 하나에서만 쓰이던 상태 넷(`playing`·`filled`·`run`·`unitCleared`)이 그 카드
  컴포넌트로 함께 내려갔습니다. 「스텝을 떠나면 초기화」가 `useEffect`에서 언마운트로
  바뀌었고, 그 동치는 기존 테스트 `[OB-U13]`이 판정합니다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 77.356 ms, fcp 77.805 ms
  LoadBundle loadBundle: loadBundle 12.775 ms, parse 3.217 ms,
    loadBackground 9.221 ms, pipeline 77.361 ms, mtsRender 4.743 ms,
    resolve 1.646 ms, layout 0.098 ms,
    paintingUiOperationExecute 2.107 ms, layoutUiOperationExecute 0.225 ms

Memory
  after-initial-load [complete]: totalBytes 1281056 bytes,
    elementBytes 6240 bytes, viewBytes 3072 bytes,
    mainThreadRuntimeBytes 1271744 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 38258896 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 2 ms
```

전환 Pipeline entry와 `after-navigation-*` snapshot은 **없습니다.** 그 둘은 바텀 네비게이션의
timing flag가 붙은 탭으로 갈 때만 남는데, 이번 시나리오는 온보딩에서 멈춰 그 자리에 닿지
않기 때문입니다.

## 비교

- 기준 기록: [여정·롤플레이 화면 주석 정리·journey-map.ts 분리 후 앱 초기 로드 — 01](comment-convention-journey-screens-app-launch-iphone-17-pro-simulator-01.md)
  — 같은 기기·OS·SDK·Release 조건이지만 **시나리오가 다릅니다**(토큰 있음 → 여정 맵 / 이번은
  새 설치 → 온보딩).

| 값 | PR ③ | PR ④-A | PR ④-B | 이번(PR ④-C) |
|---|---|---|---|---|
| 초기 `pipeline` | 91.058 ms | 96.904 ms | 91.433 ms | 77.361 ms |
| `parse` | 3.319 ms | 3.495 ms | 2.789 ms | 3.217 ms |
| `mainThreadRuntimeBytes` | 1,275,904 | 1,275,056 | 1,275,056 | 1,271,744 |

⚠ **이번 초기 `pipeline`(77.4 ms)을 앞 세 회차와 나란히 읽으면 안 됩니다.** 앱을 새로 설치해
저장소가 비어 있고 전이 분기가 달라, 같은 조건의 회차가 아닙니다. 표는 값을 나란히 적어
두기만 한 것이고, 이 차이를 변경의 효과로 해석하지 않습니다.

## 해석

이번 실행에서 초기 `pipeline`은 77.361 ms였고 element node는 6개(스플래시)였습니다. 첫 paint
직후 memory query는 Lynx 귀속 1,281,056 bytes를 반환했습니다.

**단일 실행이고 앞 회차들과 시나리오가 달라 회귀 여부는 이 자료로 판정할 수 없습니다.**
이 기록이 실제로 말하는 것은 수치가 아니라 **분리 뒤에도 온보딩 첫 스텝이 그대로 그려진다**는
관측입니다. 캡처한 화면에 배경·인물 그림 카드와 대화 버블 셋, 진행 점, 제목·본문, 다음 버튼이
분리 전과 같은 자리에 있었습니다.

온보딩 자체의 렌더·메모리 비용은 **이 기록에 없습니다.** 첫 paint가 스플래시라 온보딩 렌더는
관찰 구간 밖이고, 온보딩 진입 뒤 snapshot을 남기는 수집 경로가 아직 없습니다.

수치의 분산, 실제 기기 체감, 다른 iOS·기기에서의 결과를 일반화하지 않으며 성능 통과·개선·
회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace 미수집입니다. 카드 컴포넌트 셋으로 나뉜 뒤 스텝 전환의 렌더 비용이 달라지는지는
  스텝 전환에 timing flag를 두는 수집 경로가 먼저 필요합니다.
- fluency: 미확인입니다. 둘째 스텝의 글자 칠하기(350 ms 간격 상태 갱신)는 이 캡처가 재지
  않습니다. 그 타이머가 이제 `OnboardingQuizCards` 안에 있으므로, 스텝을 떠나면 언마운트로
  멈춥니다 — 멈추는지 자체는 `[OB-U13]`이 봅니다.
- memory: `after-initial-load` 하나뿐입니다. 온보딩 첫 스텝 그림 두 장(PNG 약 1.3 MB)의 디코딩
  메모리는 여전히 이 기록 밖입니다.
- NativeModule: 해당 없음 — 이 시나리오에 NativeModule 호출이 없습니다.

## 결론과 후속

- 결론: 진입 흐름 주석 정리와 `OnboardingScreen` 분리가 들어간 대상 commit에서, **바뀐 화면이
  실제로 그려지는 조건**(새 설치)으로 초기 load를 한 회차 수집했습니다. 화면은 분리 전과 같이
  떴고, 수치는 앞 회차들과 조건이 달라 비교하지 않습니다.
- 후속: 남은 분리 PR(④-D)이 끝난 뒤 **같은 commit·같은 시나리오를 여러 회차 재어 흔들림 폭을
  먼저 잡습니다.** 그 폭을 모르는 동안에는 회차 사이 차이를 해석하지 않습니다. 온보딩 진입 뒤
  메모리는 별도 수집 경로가 생긴 다음에 봅니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
