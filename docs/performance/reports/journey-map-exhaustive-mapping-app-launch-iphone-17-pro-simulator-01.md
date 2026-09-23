# 여정 맵 특별 유닛 배정을 망라 검사로 바꾼 뒤 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-23T07:41:00Z
- 상태: 측정 — Release Simulator Host를 새로 설치해 성능 캡처 모드로 실행하고, 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했습니다.
- 기능 PR: 여정 맵의 특별 유닛 화면 배정을 중첩 삼항에서 `switch` 망라로 바꾼 수정(이
  보고서와 같은 PR)
- 대상 commit: `773301eb4f7831b6dec90dd8ab2fdc3b5725617a`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장 `main.lynx.bundle`;
  `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 앱을 지우고 새로 설치했습니다. 저장된 로그인 토큰이 없어 스플래시가 끝나면 온보딩
  첫 스텝으로 갑니다. 앞선 세 기록(④-C · ④-D · 재전송 수정)과 같은 조건입니다.
- 단계: `performance:capture -- start`로 Host를 새로 실행하고 조작하지 않습니다. 약 9초 뒤
  `report`로 보고하고 `stop`으로 종료합니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot입니다.

⚠ **이 시나리오는 여정 맵을 그리지 않습니다.** 온보딩 첫 스텝에서 멈추기 때문입니다. 다만
`journeyMapItems`는 **모듈을 읽을 때 한 번 계산되는 상수**라, 화면을 열지 않아도 초기 평가
구간에 들어갑니다. 이 기록이 보는 것은 그 자리입니다.

## 이 변경이 무엇을 건드렸나

특별 유닛(메신저 · 전화 · 비주얼 노벨)을 맵 항목으로 옮기는 자리가 중첩 삼항이었고, 마지막
갈래가 조건 없는 나머지였습니다. **새 화면 타입이 늘면 조용히 비주얼 노벨로 그려지는 모양**
이었습니다(PR #103 리뷰 지적).

`switch`로 바꾸고 `default`에서 `never`로 받습니다(`render-screen.tsx`와 같은 형태입니다).
갈래가 빠지면 그 자리에서 컴파일이 섭니다 — 화면 타입을 하나 더해 `TS2322`로 서는 것을
확인한 뒤 되돌렸습니다.

**그리는 결과는 그대로입니다.** 기존 테스트가 여덟 항목의 순서와 각 항목의 `kind`·`id`·
`title`을 모두 단언하고 있고, 그 테스트가 바뀌지 않은 채 통과합니다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 65.845 ms, fcp 66.263 ms
  LoadBundle loadBundle: loadBundle 8.835 ms, parse 2.304 ms,
    loadBackground 7.51 ms, pipeline 65.854 ms, mtsRender 3.257 ms,
    resolve 0.748 ms, layout 0.121 ms,
    paintingUiOperationExecute 1.53 ms, layoutUiOperationExecute 0.198 ms

Memory
  after-initial-load [complete]: totalBytes 1295520 bytes,
    elementBytes 6240 bytes, viewBytes 3072 bytes,
    mainThreadRuntimeBytes 1286208 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 38340864 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 2 ms
```

## 비교

- 기준 기록: [재전송 시 코드 지우기 수정 후 앱 초기 로드 — 01](verification-resend-clears-code-app-launch-iphone-17-pro-simulator-01.md)
  — 같은 시나리오(새 설치 → 온보딩)의 직전 기록입니다.

| 값 | ④-C | ④-D | 재전송 수정 | 이번 |
|---|---|---|---|---|
| 초기 `pipeline` | 77.361 ms | 75.769 ms | 66.687 ms | 65.854 ms |
| `parse` | 3.217 ms | 2.869 ms | 2.334 ms | 2.304 ms |
| `mainThreadRuntimeBytes` | 1,271,744 | 1,284,832 | 1,272,736 | 1,286,208 |

같은 시나리오 네 회차가 77.4 · 75.8 · 66.7 · 65.9 ms입니다. **폭이 11.5 ms**이고, 이번 변경은
상수 하나를 만드는 방식(삼항 → switch)만 바꾼 것이라 이 폭을 만들 자리가 없습니다.

`mainThreadRuntimeBytes`는 1,271,744 ~ 1,286,208 bytes 사이에서 오르내립니다.

⚠ **정정(2026-09-23, [같은 commit 5회차 반복 측정](same-commit-variance-app-launch-iphone-17-pro-simulator-05runs.md))**:
이 문단은 원래 그 14 KB를 「흔들림 폭 안」이라고 적었습니다. **틀렸습니다.** 같은 commit을 다섯 번
재 보니 이 값은 전혀 흔들리지 않습니다 — commit 사이의 차이는 코드 변화에서 온 실제 차이입니다.

## 해석

이번 실행에서 초기 `pipeline`은 65.854 ms였고 element node는 6개(스플래시)였습니다. 첫 paint
직후 memory query는 Lynx 귀속 1,295,520 bytes를 반환했습니다.

**단일 실행끼리의 비교라는 한계가 있어 회귀 여부는 이 자료로 판정할 수 없습니다.** 네 회차가
모이면서 초기 `pipeline`이 약 11 ms 폭으로 오르내린다는 것까지가 이 기록이 말할 수 있는
전부입니다. 메모리도 같은 폭으로 흔들린다고 적었으나 그것은 뒤에 정정됐습니다(위 「비교」 절).

`switch`가 삼항보다 느리거나 빠르다고 말할 근거는 이 자료에 없습니다. 두 형태 모두 모듈 평가
때 여덟 항목을 한 번 만드는 일이고, 그 비용은 `parse`·`pipeline`의 흔들림에 묻힙니다.

수치의 분산, 실제 기기 체감, 다른 iOS·기기에서의 결과를 일반화하지 않으며 성능 통과·개선·
회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace 미수집입니다. 여정 맵 화면 자체의 렌더는 이 시나리오가 지나지 않습니다.
- fluency: 미확인입니다. 이 변경은 애니메이션·타이머를 건드리지 않습니다.
- memory: `after-initial-load` 하나뿐입니다.
- NativeModule: 해당 없음 — 이 시나리오에 NativeModule 호출이 없습니다.

## 결론과 후속

- 결론: 망라 검사로 바꾼 대상 commit에서 초기 load를 한 회차 수집했습니다. 값은 같은 시나리오
  네 회차의 흔들림 폭 안에 있습니다. 이 값만으로 성능 변화 방향을 판정하지 않습니다.
- 후속: 같은 commit을 여러 회차 재어 흔들림 폭을 수치로 확정합니다. 지금까지 네 회차는 서로
  다른 commit이라 「흔들림」과 「변경의 영향」을 완전히 가르지 못합니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
