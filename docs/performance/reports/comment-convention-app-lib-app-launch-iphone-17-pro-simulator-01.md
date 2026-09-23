# 주석 정리·파일 분리(lib·app) 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-23T03:04:41Z
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 새로 실행해 초기 load의 Rendering
  entry와 `after-initial-load` Memory snapshot을 수집했습니다. 같은 실행에서 스플래시 뒤 첫
  화면 전환(여정 맵 탭)의 Pipeline entry와 `after-navigation-journey-01` snapshot도 함께
  남았습니다.
- 기능 PR: 주석 규약 적용 3단계 — `lib`·`app` 주석 정리와 파일 분리(이 보고서와 같은 PR)
- 대상 commit: `5896aeb12d9cb9b0ecb389ecb48d25cdfd717945`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장
  `main.lynx.bundle`(776.7 kB); `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 대상 commit의 Release Host를 iPhone 17 Pro 시뮬레이터에 설치합니다. 첫 화면은
  스플래시이고, 시뮬레이터에 이전 실행이 저장한 로그인 토큰이 남아 있어 스플래시가 끝나면
  진입 흐름을 건너뛰고 여정 맵으로 넘어갑니다.
- 단계: `performance:capture -- start`로 Host를 새로 실행하고 조작하지 않습니다. 약 8초 뒤
  `performance:capture -- report`로 보고하고 `stop`으로 종료합니다. report 전 `paintEnd`가
  직전 캡처와 다른 것을 확인해 이전 실행의 파일을 읽지 않았음을 확인했습니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot,
  그리고 스플래시 뒤 여정 맵 탭 전환 한 번입니다.

## 이 변경이 무엇을 건드렸나

주석을 지우고 문체를 옮겼으며, 파일 셋을 책임별로 갈랐습니다. **실행되는 코드는 옮겨졌을
뿐 바뀌지 않았습니다.** 모듈 경계가 늘었으므로 번들 크기와 파싱 시간이 이 기록의 관심사입니다.

- `App.tsx` 999줄 → 8개 파일(가장 큰 조각 253줄)
- `navigation.ts` 368줄 → 4개 + 배럴
- `speech-recognition.ts` 375줄 → 2개 + 접점
- `journey-wiring.ts`에서 특별 유닛 콜백을 `special-unit-wiring.ts`로 한 번 더 분리

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 91.05 ms, fcp 91.534 ms
  LoadBundle loadBundle: loadBundle 12.336 ms, parse 3.319 ms,
    loadBackground 11.017 ms, pipeline 91.058 ms, mtsRender 4.76 ms,
    resolve 0.75 ms, layout 0.132 ms,
    paintingUiOperationExecute 2.236 ms, layoutUiOperationExecute 0.262 ms
  Pipeline updateTriggeredByBts (libitum:navigation:journey): pipeline 58.788 ms,
    mtsRender 1.687 ms, resolve 2.784 ms, layout 31.927 ms,
    paintingUiOperationExecute 6.584 ms, layoutUiOperationExecute 12.213 ms

Memory
  after-initial-load [complete]: totalBytes 1285216 bytes,
    elementBytes 6240 bytes, viewBytes 3072 bytes,
    mainThreadRuntimeBytes 1275904 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 38258944 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 1 ms
  after-navigation-journey-01 [complete]: totalBytes 1440416 bytes,
    elementBytes 73840 bytes, viewBytes 49280 bytes,
    mainThreadRuntimeBytes 1317296 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 60541448 bytes, elementNodeCount 71 nodes
```

## 비교

- 기준 기록: [진입 화면 디자인 반영 후 앱 초기 로드 — 01](entry-screens-design-app-launch-iphone-17-pro-simulator-01.md)
  — 같은 기기·OS·SDK·Release 조건, 같은 첫 화면, 같은 전환(여정 맵).
- 차이: 단일 실행끼리의 관측 차이만 적습니다.

| 값 | 기준(2026-09-21) | 이번(2026-09-23) |
|---|---|---|
| 번들 | 774.1 kB | 776.7 kB |
| `parse` | 3.658 ms | 3.319 ms |
| 초기 `pipeline` | 95.296 ms | 91.058 ms |
| `mainThreadRuntimeBytes`(초기) | 1,276,352 bytes | 1,275,904 bytes |
| 여정 전환 `pipeline` | 80.876 ms | 58.788 ms |

번들이 2.6 kB 늘었습니다. 파일이 13개 늘어 모듈 헤더와 재수출이 더해진 몫으로 보이지만,
한 회차뿐이라 원인으로 확정하지 않습니다. `parse`·`pipeline`은 오히려 작게 나왔는데 이
역시 단일 실행의 분산과 구분되지 않습니다.

⚠ **`viewBytes`가 2,392,136 → 3,072 bytes로 크게 다릅니다.** 이 값은 스플래시 로고 WebP의
디코딩 메모리이고, 캡처 시점이 애니메이션의 어느 프레임인지에 따라 달라집니다. 이번 변경과
무관한 축이며 두 기록을 이 값으로 비교하지 않습니다.

## 해석

이번 실행에서 초기 `pipeline`은 91.058 ms였고 element node는 6개(스플래시)였습니다. 첫
paint 직후 memory query는 Lynx 귀속 1,285,216 bytes를 반환했습니다.

이 변경은 실행되는 코드를 바꾸지 않으므로 런타임 수치가 같은 수준에 머무르는 것이 기대값이고,
관측도 그 범위 안에 있습니다. **다만 단일 실행끼리의 비교라는 한계가 있어 「차이가 없다」를
주장하지 않습니다** — 회귀 여부는 이 자료로 판정할 수 없습니다. 번들이 2.6 kB(0.3%) 커진 것은
파일 분리의 대가로 볼 수 있는 방향이지만, 같은 조건의 반복 측정이 필요합니다.

수치의 분산, 실제 기기 체감, 다른 iOS·기기에서의 결과를 일반화하지 않으며 성능 통과·개선·
회귀를 주장하지 않습니다.

스플래시 뒤 전환은 남아 있던 로그인 토큰 때문에 여정 맵으로 갔습니다. 이번 PR이 고친
`lib`·`app` 코드는 그 경로에서 실제로 실행됩니다 — `navReducer`·`tabRootActions`·wiring
조립이 모두 이 전환에 관여하므로, 전환이 정상적으로 일어난 것 자체가 분리가 결선을 끊지
않았다는 관측입니다.

## Trace 후속 확인

- render: Trace 미수집입니다. 모듈 수가 늘어 초기 평가 시간이 늘었는지는 Trace의 모듈 평가
  구간을 봐야 갈립니다.
- fluency: 미확인입니다. 이 변경은 애니메이션·타이머를 건드리지 않습니다.
- memory: `after-initial-load`와 전환 후 snapshot 둘입니다. 진입 흐름 화면들은 토큰이 남아
  있어 이번에도 그려지지 않았습니다.
- NativeModule: 해당 없음 — 이 시나리오에 NativeModule 호출이 없습니다. `speech-recognition.ts`
  분리가 NativeModule 조회 경로를 건드렸지만 이 시나리오는 그 경로를 지나지 않습니다.

## 결론과 후속

- 결론: 주석 정리와 파일 분리가 들어간 대상 commit에서 초기 load와 첫 전환을 한 회차
  수집했습니다. 수치는 기준 기록과 같은 수준이고, 번들은 2.6 kB 커졌습니다. 이 값만으로
  성능 변화 방향을 판정하지 않습니다.
- 후속: 남은 분리 PR(④-A~D)이 화면 파일을 더 쪼개므로 번들 증가가 누적되는지 같은 조건에서
  다시 봅니다. 화면 파일까지 끝난 뒤 한 번 더 측정해 누적분을 확인합니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
