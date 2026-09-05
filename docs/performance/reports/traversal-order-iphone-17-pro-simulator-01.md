# 낭독 순서 교정 (CSS 선언) — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 회차 시뮬레이터 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-05T02:52+09:00
- 상태: 측정 — iOS native lifecycle PerformanceEntry와 global memory query를 로컬
  `performance:capture`로 수집했다.
- 기능 PR: LIB-228 — 최대 배율에서 낭독 순서가 뒤집힌다
- 대상 commit: `4b196a3`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1
- 빌드: **Release**, 내장 `main.lynx.bundle`, 번들 213,858 bytes (213.9 kB)
- 실행 회차: 01

**번들 동일성을 확인했다.** `apps/ios/main.lynx.bundle`과 `.app` 안의 SHA-256이
같다(`b35e97a1232b3037…`). Xcode는 `dist/`가 아니라 `apps/ios/`의 복사본을 읽는다.

## 시나리오

- 전제: 앱을 종료한 상태에서 `--performance-capture`로 재실행한다. 시스템 글자 크기는
  기본(`large`)이다.
- 단계: 홈 탭이 초기 화면으로 뜰 때까지 둔다. 사용자 조작을 하지 않는다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 메모리 snapshot.

**이 회차의 변경은 CSS 선언뿐이다** — `align-items` 넷 · `padding-top` 하나 ·
`flex-shrink` 넷 · 주석. **DOM이 한 노드도 안 바뀐다.** 그래서 이 시나리오가
「구조가 안 변했다」를 확인하기에 적합하고, **그것이 이 회차가 답하는 것의 전부다.**

**결함 자체는 이 시나리오가 못 본다** — 최대 배율에서만 나타나고 조작이 필요하다.
판정자는 실기(`#44`의 6·7·8묶음 아홉)이고 **아직 안 돌았다.**

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 136.272 ms, fcp 136.585 ms
  LoadBundle loadBundle: loadBundle 46.445 ms, parse 2.15 ms,
    loadBackground 6.799 ms, pipeline 136.284 ms, mtsRender 3.412 ms,
    resolve 1.986 ms, layout 30.032 ms,
    paintingUiOperationExecute 7.316 ms, layoutUiOperationExecute 0.737 ms

Memory
  after-initial-load [complete]: totalBytes 534832 bytes,
    elementBytes 31200 bytes, viewBytes 21376 bytes,
    mainThreadRuntimeBytes 482256 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 36653336 bytes, elementNodeCount 30 nodes;
    instances 1/1; collection 1 ms
```

## 비교

- 기준 기록: [평가 화면 도입 — 01](assessment-screen-iphone-17-pro-simulator-01.md)
  (`53b16c4`, **Release**, 같은 시뮬레이터·OS·SDK)

| | 기준 | 이번 | 차 |
|---|---|---|---|
| `elementNodeCount` | 30 | **30** | **0** |
| `elementBytes` | 31,200 | **31,200** | **0** |
| `viewBytes` | 21,376 | **21,376** | **0** |
| `mainThreadRuntimeBytes` | 482,256 | **482,256** | **0** |
| `totalBytes` | 534,832 | **534,832** | **0** |
| `lynxFcp` | 147.598 ms | 136.272 ms | **−11.326 ms** |
| `loadBundle` | 44.796 ms | 46.445 ms | +1.649 ms |
| `layout` | 30.259 ms | 30.032 ms | −0.227 ms |
| 번들 | 213.7 kB | 213.9 kB | +0.2 kB |

## 해석

**메모리 다섯 값이 전부 바이트 단위로 같다.** 자릿수가 아니라 **완전히 같은 수**다.

CSS 선언만 바뀌었으므로 요소 트리도 뷰 트리도 런타임 객체도 그대로여야 하는데,
**그것이 실측으로 확인된다.** 이 회차가 답하려던 것은 이것 하나이고 답이 나왔다.

### `lynxFcp`가 반대로 움직였다 — 그리고 그것이 앞 회차의 미해결을 푼다

직전 기록이 `lynxFcp` **+24.976 ms**를 「모른다」로 남겼다:

> **「+25 ms 회귀」로 읽으면 안 되고 「모른다」로 읽어야 한다.** 양쪽 다 단일 회차라
> 변동과 회귀를 가를 수 없다. 가르려면 양쪽을 여러 번 재야 한다.

**이번 회차가 −11.326 ms다.** 그리고 이 변경은 **요소 트리를 한 노드도 안 바꾼다**
— 메모리 다섯 값이 그것을 증명한다. **구조가 같은데 시간이 11 ms 줄었다.**

세 회차의 `lynxFcp`를 나란히 놓으면:

| 회차 | commit | `lynxFcp` | `elementNodeCount` |
|---|---|---|---|
| 스크롤 영역 | `77aa4779` | 122.622 ms | 30 |
| 평가 화면 | `53b16c4` | 147.598 ms | 30 |
| 이번 | `4b196a3` | 136.272 ms | 30 |

**요소 수가 셋 다 30인데 시간이 25 ms 폭으로 흔들린다.**

**그래서 앞 회차의 +25 ms는 회귀가 아니라 변동일 가능성이 크다** — 이 저장소의
회차 간 변동 폭이 **최소 25 ms**라는 것이 이 세 점으로 보인다.

**다만 「변동이다」로 단정하지 않는다.** 세 점은 변동 폭의 **하한**을 보일 뿐이고,
같은 커밋을 반복해서 재야 폭을 안다. **앞 회차가 후속으로 적은 「같은 커밋을 여러
번 재는 회차」가 여전히 필요하다** — 이번 기록은 그 필요를 **없애지 않고 강화한다.**

## Trace 후속 확인

- **render** — 세 회차의 `lynxFcp` 산포가 25 ms다. **단계별로 어디가 흔들리는지**를
  가르려면 반복 측정이 먼저다. 지금 데이터로는 `parse`(1.743 → 2.02 → 2.15)만 단조
  증가이고 나머지는 방향이 섞인다.
- **fluency** — 이 회차의 대상이 아니다. 이 변경이 고치는 것은 **정적 레이아웃의
  낭독 순서**이고 스크롤 유창성이 아니다.
- **memory** — `after-initial-load` 하나뿐이라 before/peak/after 대조가 없다.
  **다만 이번 회차는 그것으로 충분하다** — 묻는 것이 「변했나」이고 답이 「안 변했다」다.
- **NativeModule** — 이 변경이 네이티브 모듈을 부르지 않는다.

## 결론과 후속

- **구조가 안 변했다.** 메모리 다섯 값이 바이트 단위로 같다. **CSS 선언 변경이
  요소 트리를 안 건드린다는 것이 실측됐다.**
- **시간은 여전히 판정 불가이고, 이번 회차가 그 이유를 좁혔다** — 구조가 같은데
  ±25 ms가 움직인다.
- **이 변경이 고치는 결함은 이 시나리오가 못 본다.** 최대 배율 + VoiceOver 조작이
  필요하고 **판정자는 실기 아홉**이다.

후속 하나 — **같은 커밋을 여러 번 재는 회차.** 앞 회차가 이미 적었고 이번 회차가
**그 필요를 강화한다.** 세 점이 변동 폭의 하한만 보였다.

## 정제 확인

- `pnpm verify` exit 0 (unit 239 · ui 247 · integration 47).
- 이 기록은 **예산 판정이 아니다.** 이 저장소에 성능 예산이 없다.
- 이 기록은 **수용 기준을 닫지 않는다.** LIB-228의 수용 기준 1·2·3은 실기가 닫고
  **아직 안 돌았다.**
