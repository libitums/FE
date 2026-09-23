# 여정·롤플레이 화면 주석 정리·journey-map.ts 분리 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-23T05:02:30Z
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 새로 실행해 초기 load의 Rendering
  entry와 `after-initial-load` Memory snapshot을 수집했습니다. 같은 실행에서 스플래시 뒤 첫
  화면 전환(여정 맵 탭)의 Pipeline entry와 `after-navigation-journey-01` snapshot도 함께
  남았습니다.
- 기능 PR: 주석 규약 적용 4-B단계 — 여정·롤플레이 화면 여섯 폴더의 주석 정리와
  `journey-map.ts` 분리(이 보고서와 같은 PR)
- 대상 commit: `ed8ba518e4104b07139cb096c3f5ee18f0b082d3`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장
  `main.lynx.bundle`(776.6 kB); `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 대상 commit의 Release Host를 iPhone 17 Pro 시뮬레이터에 설치합니다. 첫 화면은
  스플래시이고, 시뮬레이터에 남아 있는 로그인 토큰 때문에 스플래시가 끝나면 진입 흐름을
  건너뛰고 여정 맵으로 넘어갑니다.
- 단계: `performance:capture -- start`로 Host를 새로 실행하고 조작하지 않습니다. 약 8초 뒤
  `performance:capture -- report`로 보고하고 `stop`으로 종료합니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot,
  그리고 스플래시 뒤 여정 맵 탭 전환 한 번입니다.

## 이 변경이 무엇을 건드렸나

여정·롤플레이 화면 여섯 폴더(`journey-map` · `roleplay-list` · `messenger` · `phone-call` ·
`visual-novel` · `notifications`)의 주석을 규약에 맞추고, `journey-map.ts` 313줄을 책임별로
갈랐습니다. **실행되는 코드는 옮겨졌을 뿐 바뀌지 않았습니다.**

- `journey-map.ts` → `journey-map-units.ts` 156 · `journey-map-progress.ts` 56 ·
  `journey-map-sheet.ts` 48 · `journey-map-learning-form.ts` 51 · 배럴 8

**앞선 기록들과 달리 이번 변경은 이 시나리오가 실제로 지나는 코드를 포함합니다.** 스플래시
뒤 전환이 여정 맵이고, 그 화면이 쓰는 모듈이 이번에 갈린 넷입니다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 91.416 ms, fcp 91.939 ms
  LoadBundle loadBundle: loadBundle 11.842 ms, parse 2.789 ms,
    loadBackground 11.284 ms, pipeline 91.433 ms, mtsRender 4.027 ms,
    resolve 1.441 ms, layout 0.027 ms,
    paintingUiOperationExecute 2.467 ms, layoutUiOperationExecute 0.27 ms
  Pipeline updateTriggeredByBts (libitum:navigation:journey): pipeline 58.388 ms,
    mtsRender 1.502 ms, resolve 2.728 ms, layout 29.362 ms,
    paintingUiOperationExecute 8.208 ms, layoutUiOperationExecute 12.523 ms

Memory
  after-initial-load [complete]: totalBytes 1284368 bytes,
    elementBytes 6240 bytes, viewBytes 3072 bytes,
    mainThreadRuntimeBytes 1275056 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 38422760 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 2 ms
  after-navigation-journey-01 [complete]: totalBytes 1440352 bytes,
    elementBytes 73840 bytes, viewBytes 49280 bytes,
    mainThreadRuntimeBytes 1317232 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 60656136 bytes, elementNodeCount 71 nodes
```

## 비교

- 기준 기록: [학습 화면 주석 정리·listening.ts 분리 후 앱 초기 로드 — 01](comment-convention-learning-screens-app-launch-iphone-17-pro-simulator-01.md)
  와 [주석 정리·파일 분리(lib·app) 후 앱 초기 로드 — 01](comment-convention-app-lib-app-launch-iphone-17-pro-simulator-01.md)
  — 셋 다 같은 기기·OS·SDK·Release 조건, 같은 첫 화면, 같은 전환이고 하루 안에 쟀습니다.

| 값 | PR ③ | PR ④-A | 이번(PR ④-B) |
|---|---|---|---|
| 번들 | 776.7 kB | 776.6 kB | 776.6 kB |
| `parse` | 3.319 ms | 3.495 ms | 2.789 ms |
| 초기 `pipeline` | 91.058 ms | 96.904 ms | 91.433 ms |
| 여정 전환 `pipeline` | 58.788 ms | 73.538 ms | 58.388 ms |
| `mainThreadRuntimeBytes`(초기) | 1,275,904 | 1,275,056 | 1,275,056 |

**세 회차가 같은 축에서 흔들립니다.** 초기 `pipeline`은 91.1 → 96.9 → 91.4 ms, 전환
`pipeline`은 58.8 → 73.5 → 58.4 ms로, 가운데 회차만 높고 첫째와 셋째가 거의 같습니다.
직전 기록(④-A)에서 「커졌다」고 적은 폭은 **변경과 무관하게 회차마다 생기는 흔들림**으로
읽는 편이 자료에 맞습니다. 다만 회차가 셋뿐이라 그 폭이 얼마인지는 아직 말할 수 없습니다.

## 해석

이번 실행에서 초기 `pipeline`은 91.433 ms였고 element node는 6개(스플래시)였습니다. 첫
paint 직후 memory query는 Lynx 귀속 1,284,368 bytes를 반환했습니다.

**단일 실행끼리의 비교라는 한계가 있어 회귀 여부는 이 자료로 판정할 수 없습니다.** 세 회차가
모인 덕분에 「④-A에서 값이 커졌다」는 관측이 변경 때문이라고 읽을 근거가 약해졌다는 것까지가
이 기록이 말할 수 있는 전부입니다. 흔들림 폭을 수치로 말하려면 같은 commit을 여러 번 재야
합니다.

여정 맵 전환이 정상적으로 일어난 것은, `journey-map.ts`를 넷으로 가르고 배럴만 남긴 뒤에도
그 화면이 쓰는 스텝 상태·진행 파생·시트 전이가 그대로 이어졌다는 관측입니다.

수치의 분산, 실제 기기 체감, 다른 iOS·기기에서의 결과를 일반화하지 않으며 성능 통과·개선·
회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace 미수집입니다. 여정 맵의 스텝 노드 렌더가 분리 전후로 달라지는지는 Trace의
  렌더 구간을 봐야 갈립니다.
- fluency: 미확인입니다. 스텝 시트 열림·닫힘 애니메이션은 이 캡처가 지나지 않습니다.
- memory: 스냅숏 둘뿐입니다. 스텝 시트를 연 뒤 메모리는 이 기록에 없습니다.
- NativeModule: 해당 없음 — 이 시나리오에 NativeModule 호출이 없습니다.

## 결론과 후속

- 결론: 여정·롤플레이 화면 주석 정리와 `journey-map.ts` 분리가 들어간 대상 commit에서 초기
  load와 첫 전환을 한 회차 수집했습니다. 번들은 그대로이고, 렌더 수치는 PR ③ 회차와 거의
  같습니다. 이 값만으로 성능 변화 방향을 판정하지 않습니다.
- 후속: 남은 분리 PR(④-C·④-D)이 끝난 뒤 **같은 commit을 여러 회차 재어 흔들림 폭부터
  잡습니다.** 그 폭을 모르는 동안에는 회차 사이 차이를 해석하지 않습니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
