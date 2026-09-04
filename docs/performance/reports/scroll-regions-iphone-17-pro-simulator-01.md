# 화면 스크롤 영역 도입 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 회차 시뮬레이터 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-04T12:52+09:00
- 상태: 측정 — iOS native lifecycle PerformanceEntry와 global memory query를 로컬
  `performance:capture`로 수집하고 기존 분석기로 검증했다.
- 기능 PR: [#40 — 스크롤이 한 곳도 없었다](https://github.com/libitums/FE/pull/40)
- 대상 commit: `77aa4779`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: **Release**, 내장 `main.lynx`, 번들 201.6 kB
- 실행 회차: 01

## 시나리오

- 전제: 앱을 종료한 상태에서 `--performance-capture`로 재실행한다. 시스템 글자 크기는
  기본(`large`)이다.
- 단계: 홈 탭이 초기 화면으로 뜰 때까지 둔다. 사용자 조작을 하지 않는다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 메모리 snapshot.
- **이 시나리오가 이 변경을 대표하는 이유**: 이번 변경은 화면 다섯 전부의 최상위 구조에
  `scroll-view` 한 겹을 넣는다. 초기 로드가 그 겹을 처음 통과하는 구간이다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 122.622 ms, fcp 123.045 ms
  LoadBundle loadBundle: loadBundle 36.203 ms, parse 1.743 ms,
    loadBackground 7.821 ms, pipeline 122.631 ms, mtsRender 1.912 ms,
    resolve 1.761 ms, layout 22.679 ms,
    paintingUiOperationExecute 6.152 ms, layoutUiOperationExecute 1.362 ms

Memory
  after-initial-load [complete]: totalBytes 521488 bytes,
    elementBytes 31200 bytes, viewBytes 21376 bytes,
    mainThreadRuntimeBytes 468912 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 35473712 bytes, elementNodeCount 30 nodes;
    instances 1/1; collection 1 ms
```

## 비교

- 기준 기록: [앱 초기 로드 — 01](app-launch-iphone-17-pro-simulator-01.md)
  (`7e86d1bc`, **Debug** 빌드)
- 차이:

| | 기준 (Debug) | 이번 (Release) | 차 |
|---|---|---|---|
| `lynxFcp` | 101.963 ms | 122.622 ms | +20.7 ms |
| `loadBundle` | 31.081 ms | 36.203 ms | +5.1 ms |
| `layout` | 15.455 ms | 22.679 ms | +7.2 ms |
| `totalBytes` | 463,376 | 521,488 | +58,112 |
| `elementNodeCount` | 29 | 30 | **+1** |

**이 표를 회귀로 읽으면 안 된다.** 두 기록의 **빌드 구성이 다르다** — 기준은 Debug이고
이번은 Release다. 시간 수치는 **비교 대상이 아니다.** 같은 조건의 기준이 아직 없다.

## 해석

**구조적으로 설명되는 것은 `elementNodeCount` **+1** 하나다.** 홈 화면에 `<scroll-view>`
한 겹이 들어갔고 초기 화면은 홈 하나뿐이다 — **화면 다섯에 넣었지만 한 번에 하나만
렌더된다.** 수치가 예상과 맞는다.

`elementBytes`도 30,160 → 31,200으로 **+1,040 bytes** 늘었다. 노드 하나가 는 것과 같은
방향이다.

**말할 수 없는 것 넷.**

- **시간 회귀 여부.** Debug ↔ Release 비교라 성립하지 않는다. `layout`이 +7.2 ms인 것이
  스크롤 겹 때문인지 빌드 구성 때문인지 **이 기록으로는 갈리지 않는다.**
- **`totalBytes` +58 KB의 출처.** 대부분이 `mainThreadRuntimeBytes`(+55,792)인데 그것은
  런타임 전역 값이라 이 변경이 소유한 메모리가 아니다.
- **스크롤 자체의 비용.** 이 시나리오는 **초기 로드만** 본다. 실제 스크롤 중의 프레임과
  `contentSize` 재계산은 관찰 구간 밖이다.
- **분산.** 단일 회차다. 같은 조건을 세 번 이상 재기 전에는 이 값이 대표값인지 모른다.

## Trace 후속 확인

- render: 해당 없음 — Trace를 수집하지 않았다. `layout` 차이의 원인을 가르려면 같은
  빌드 구성의 기준이 먼저 필요하다.
- fluency: **해당 없음이지만 가장 값이 클 자리다.** 이번 변경이 만든 것이 스크롤이고,
  스크롤 중 프레임은 **실기에서만** 의미가 있다. 시뮬레이터 단일 회차로 대체하지 않는다.
- memory: 해당 없음 — before/peak/after 세 지점을 잡지 않았다. 이 기록은 after 하나다.
- NativeModule: 해당 없음 — 이 시나리오에서 NativeModule 호출이 없다. 오디오는 듣기
  화면에서만 불린다.

## 결론과 후속

- 결론: **화면 다섯에 `scroll-view` 한 겹을 넣은 뒤 초기 로드에서 element 노드가
  하나 늘었고(29 → 30), 그것이 이 변경으로 설명되는 유일한 수치다.** 시간과 메모리
  차이는 빌드 구성이 달라 비교 대상이 아니다.
- 후속:
  - **같은 조건(Release)의 초기 로드 기준을 하나 만든다.** 지금은 Debug 기준밖에 없어
    다음 변경도 같은 자리에서 막힌다.
  - **스크롤 중 fluency는 실기에서 잰다.** `docs/e2e/`의 스크롤 항목들과 같은 회차에
    묶는 것이 싸다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] `미측정` 기록을 baseline이나 성능 통과로 표현하지 않았다.
