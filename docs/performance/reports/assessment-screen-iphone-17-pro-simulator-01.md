# 평가 화면 도입 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 회차 시뮬레이터 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-04T19:41+09:00
- 상태: 측정 — iOS native lifecycle PerformanceEntry와 global memory query를 로컬
  `performance:capture`로 수집했다.
- 기능 PR: LIB-227 — 평가 화면
- 대상 commit: `53b16c4`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1
- 빌드: **Release**, 내장 `main.lynx.bundle`, 번들 213,695 bytes (213.7 kB)
- 실행 회차: 01

**번들 동일성을 확인했다.** `pnpm bundle:host`로 만든 `apps/ios/main.lynx.bundle`과
`.app` 안에 들어간 것의 SHA-256이 같다(`d89048a75969d438…`). Xcode는 `dist/`가 아니라
`apps/ios/`의 복사본을 읽으므로, 이 확인 없이는 낡은 번들을 재고도 BUILD SUCCEEDED가
난다.

## 시나리오

- 전제: 앱을 종료한 상태에서 `--performance-capture`로 재실행한다. 시스템 글자 크기는
  기본(`large`)이다.
- 단계: 홈 탭이 초기 화면으로 뜰 때까지 둔다. 사용자 조작을 하지 않는다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 메모리 snapshot.

**이 시나리오가 이 변경을 대표하지 않는다 — 그것을 먼저 적는다.** 평가 화면은
듣기 세션을 끝내야 도달하므로 **초기 로드 경로에 존재하지 않는다.** 이 회차가 재는 것은
「새 화면이 번들에 들어간 뒤의 초기 로드」이지 「새 화면 자체」가 아니다.

지금 도구로 새 화면을 재려면 시뮬레이터에서 듣기 문항 셋을 조작해 통과시켜야 하는데,
`performance:capture`는 실행 시점 캡처이고 조작 구동 수단이 없다. **그것이 이 회차의
한계이고 실기(M1·M2)가 그 자리를 맡는다.**

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 147.598 ms, fcp 148.059 ms
  LoadBundle loadBundle: loadBundle 44.796 ms, parse 2.02 ms,
    loadBackground 7.17 ms, pipeline 147.607 ms, mtsRender 2.494 ms,
    resolve 1.809 ms, layout 30.259 ms,
    paintingUiOperationExecute 6.995 ms, layoutUiOperationExecute 0.643 ms

Memory
  after-initial-load [complete]: totalBytes 534832 bytes,
    elementBytes 31200 bytes, viewBytes 21376 bytes,
    mainThreadRuntimeBytes 482256 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 36899120 bytes, elementNodeCount 30 nodes;
    instances 1/1; collection 3 ms
```

## 비교

- 기준 기록: [화면 스크롤 영역 도입 — 01](scroll-regions-iphone-17-pro-simulator-01.md)
  (`77aa4779`, **Release**)

**직전 기록과 빌드 구성이 같다** — 둘 다 Release, 같은 시뮬레이터, 같은 OS, 같은 SDK.
**이 저장소에서 시간 수치를 대조할 수 있는 첫 회차다.**

| | 기준 | 이번 | 차 |
|---|---|---|---|
| `lynxFcp` | 122.622 ms | 147.598 ms | **+24.976 ms** |
| `loadBundle` | 36.203 ms | 44.796 ms | +8.593 ms |
| `layout` | 22.679 ms | 30.259 ms | +7.580 ms |
| `parse` | 1.743 ms | 2.020 ms | +0.277 ms |
| `totalBytes` | 521,488 | 534,832 | +13,344 |
| `elementNodeCount` | 30 | **30** | **0** |
| 번들 | 201.6 kB | 213.7 kB | +12.1 kB |

## 해석

**`elementNodeCount`가 30으로 같다. 이것이 이 표에서 가장 중요한 값이다.**

초기 화면(홈)의 구조가 이 변경으로 한 노드도 바뀌지 않았다는 뜻이다. 평가 화면·
문항 행·판정 블록은 **이 시나리오가 지나가지 않는다.** `elementBytes`(31,200)와
`viewBytes`(21,376)도 기준과 정확히 같다.

**그래서 시간 +25 ms를 이 변경으로 설명할 수 없다.**

설명이 되는 것은 번들 +12.1 kB 하나인데, 그것이 실제로 늘린 것은 `parse` **+0.277 ms**
뿐이다. `loadBundle` +8.6 ms와 `layout` +7.6 ms는 **지나가지 않는 DOM으로 설명되지
않는다.**

**남는 설명은 회차 간 변동이다.** 양쪽 다 **단일 회차**라 변동과 회귀를 가를 수 없다.
`mainThreadRuntimeBytes` +13,344은 새 모듈 넷(`assessment.ts` · `lib/accessibility.ts` ·
컴포넌트 둘)이 런타임에 올라간 것으로 설명되고 번들 증가와 자릿수가 맞는다.

**「+25 ms 회귀」로 읽으면 안 되고 「모른다」로 읽어야 한다.** 가르려면 양쪽을 여러 번
재야 하고, 이 회차는 그것을 하지 않았다.

## Trace 후속 확인

- **render** — `loadBundle` +8.6 ms가 반복되는지부터 본다. 반복되면 parse/MTS render/
  resolve/layout 중 어느 단계인지 가른다. 지금 데이터로는 `parse`가 아니다.
- **fluency** — 이 회차의 대상이 아니다. 평가 화면의 스크롤 유창성은 도달 경로가 없어
  못 쟀다. 실기 E5·M2가 그 자리다.
- **memory** — `after-initial-load` 하나뿐이라 before/peak/after 대조가 없다. 평가
  화면 진입·이탈의 보유 증가는 이 기록이 답하지 않는다.
- **NativeModule** — `lib/accessibility.ts`가 `LynxAccessibilityModule`을 부르지만
  **초기 로드에서는 불리지 않는다**(평가 화면 마운트 때 한 번). 이 기록에 그 비용이 없다.

## 결론과 후속

- **구조는 변하지 않았다** — `elementNodeCount` · `elementBytes` · `viewBytes` 셋이
  기준과 동일하다.
- **시간 +25 ms는 미해결이다.** 단일 회차 둘로는 변동과 회귀를 가를 수 없다.
- **새 화면 자체는 안 쟀다.** 도달에 조작이 필요하고 지금 캡처 도구에 구동 수단이 없다.

후속 둘:

1. **같은 커밋을 여러 번 재는 회차** — 변동 폭을 먼저 알아야 이 표의 +25 ms를 판정할 수
   있다. 이 저장소에 아직 그 값이 없다.
2. **조작이 필요한 화면의 캡처 수단** — 평가·듣기처럼 초기 로드에 없는 화면은 지금
   구조로 못 잰다.

## 정제 확인

- `pnpm verify` exit 0 (unit 239 · ui 247 · integration 47).
- 이 기록은 **예산 판정이 아니다.** 이 저장소에 성능 예산이 없다.
- 이 기록은 **수용 기준을 닫지 않는다.** LIB-227의 열린 수용 기준 6은 실기가 닫는다.
