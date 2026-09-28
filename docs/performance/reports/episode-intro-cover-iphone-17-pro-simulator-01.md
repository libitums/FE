# 에피소드 서사 표지 — 첫 유닛 진입 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 시뮬레이터 세 회차 기록이고 예산 판정이 아니다. 표지가 서는 구간
> 자체는 수집기가 잡지 못해 **미측정**으로 남는다.

## 실행 조건

- 측정 일시: 2026-09-28T06:02:15Z (1회차) · 06:02:27Z (2회차) · 06:02:39Z (3회차)
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 실행해 Rendering entry와 Memory
  snapshot을 세 회차 수집하고 기존 분석기로 검증했다.
- 기능 PR: 에피소드의 유닛을 처음 열 때 서사 표지를 끼우는 변경(이 보고서와 같은 PR,
  Figma 80-7869)
- 대상 commit: `1fbab03cc85b0f7a2bf67b50fc88e7df881d7d81` 위의 작업 트리
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator, 내장 `main.lynx.bundle`(905,788 bytes, SHA-256
  `4a89a26b5e7100b125d7ff2b30b845e6639f49cb54c8efdc109eed324fc5e067`);
  `performance:capture:smoke`로 build · 수집 연결을 먼저 검증하고
  `--performance-capture`로 실행
- 실행 회차: 01 (Host를 껐다 켜는 것으로 회차를 가른 3회)

## 시나리오

- 전제: 저장된 로그인 토큰이 있어 Host가 곧장 여정 맵으로 뜬다. 여정 진행은 제품의
  씨앗(스텝 둘 완료)이고, 표지를 본 에피소드가 없다(표지를 본 기록은 영속하지 않아 Host를
  다시 켤 때마다 비어 있다). 시스템 글자 크기는 기본이다.
- 단계: Host를 `--performance-capture`로 띄우고 6초 둔다. 현재 유닛 「주문하기」를 눌러
  말풍선을 열고 `시작`을 누른다. 2초 두고 표지가 선 것을 접근성 트리로 확인한다. 캡처
  파일을 분석기로 읽고 Host를 종료한다. 같은 절차를 두 번 더 반복한다. 조작은 `idb`로
  넣었다.
- 관찰 구간: `libitum:navigation:journey` timing flag가 붙은 update pipeline과 그 직후의
  전역 메모리 snapshot.

다른 작업이 기본 시뮬레이터를 쓰고 있어 같은 기종 · 같은 런타임의 시뮬레이터를 따로
만들어 쟀다. 그래서 `performance:capture` 명령(`booted`를 고른다) 대신 같은 실행 인자로
`simctl launch`를 직접 부르고, 캡처 파일을 `performance:report`의 분석기로 읽었다.

## 이 변경이 무엇을 건드렸나

- 여정의 유닛 시작 넷(스텝 · 메신저 · 전화 · 비주얼 노벨)이 표지 판정을 지난다. 판정은
  맵의 구획을 한 번 훑어 목적지 유닛의 에피소드를 찾는 것이다(오늘 1 × 8).
- 표지를 아직 보지 않은 에피소드면 유닛 대신 표지 화면이 쌓인다. 표지는 면 · 명암 두 겹 ·
  뒤로 버튼 · 두 줄 · 버튼 둘이고, 그림은 없다.
- 여정 맵을 그리는 경로는 바뀌지 않았다.
- 측정 뒤 같은 PR에서 두 가지가 더해졌다 — 표지가 가장자리(상태바 · 홈 인디케이터 뒤)까지
  배경을 까는 것과, `Skip`을 누르면 뜨는 확인 모달(ui-lynx `Dialog`)이다. 둘 다 표지 안의
  변경이라 위 관찰 구간(여정 맵)에 닿지 않지만, **이 기록의 번들에는 들어 있지 않다.**

## 분석 결과

여정 맵에 닿는 update pipeline(`libitum:navigation:journey`)이다.

| 회차  | pipeline  | layout    | paintingUiOperationExecute |
| ----- | --------- | --------- | -------------------------- |
| 1회차 | 30.623 ms | 15.598 ms | 6.566 ms                   |
| 2회차 | 29.987 ms | 13.626 ms | 6.039 ms                   |
| 3회차 | 34.491 ms | 14.702 ms | 6.333 ms                   |

같은 회차들의 나머지 값이다.

```text
Rendering
  FCP loadBundle: lynxFcp 101.402 / 67.959 / 62.083 ms

Memory
  after-navigation-journey-01 [complete]: totalBytes 1754128 bytes,
    elementBytes 157040 bytes, viewBytes 99840 bytes,
    mainThreadRuntimeBytes 1497248 bytes, elementNodeCount 151 nodes (세 회차 같음)
```

**표지가 서는 구간은 수집되지 않았다.** 표지로 가는 전이에는 timing flag가 없어 pipeline
entry가 생기지 않고, 메모리 snapshot도 탭 전환에만 걸려 있다. 그 값을 추정하거나 `0`으로
쓰지 않는다.

수치와 별개로, 같은 빌드에서 동작을 눈과 접근성 트리로 확인했다.

- 세 회차 모두 `시작`을 누른 뒤 유닛이 아니라 표지가 섰다. 접근성 트리는 `맵으로, 버튼` →
  `Episode 0. Tutorial., 머리말` → `Skip` → `Next` 순이다.
- `Next`를 누르면 표지가 걷히고 학습 화면이 열린다.

## 비교

- 기준 기록: [`notifications-design-swipe-delete-iphone-17-pro-simulator-01.md`](notifications-design-swipe-delete-iphone-17-pro-simulator-01.md)
  — 같은 기종 · OS · Lynx SDK에서 같은 여정 맵 첫 착지를 쟀다. pipeline 30.379 · 27.566 ·
  28.971 ms, `elementNodeCount` 150.
- 차이: pipeline은 같은 크기의 범위에 있고, 노드는 151로 하나 많다. 예산 판정이 아니다.

## 해석

**이 기록은 이 변경의 비용을 말하지 못한다.** 한계가 셋이다.

첫째, **잰 구간과 바뀐 구간이 다르다.** 수집된 pipeline은 여정 맵을 그리는 구간이고, 이
변경이 더한 것은 유닛을 누른 뒤의 판정과 표지 화면이다. 위 표는 「맵을 그리는 경로가
눈에 띄게 달라지지 않았다」까지만 가리킨다.

둘째, **노드 하나의 차이를 가리지 못한다.** 이 변경은 맵에 노드를 더하지 않는다. 기준
기록과 이 기록 사이에 main에 다른 변경이 들어왔고, 차이는 그쪽에서 왔을 가능성이 있다.

셋째, **1회차의 FCP가 튄다(101.4 ms).** 새로 만든 시뮬레이터의 첫 실행이라 캐시가 비어
있었을 것으로 읽지만, 세 회차로는 판정할 수 없다. 2 · 3회차는 62~68 ms다.

표지는 그림이 없는 가벼운 화면이라 그 자체로 병목 후보가 되기 어렵다. 눈여겨볼 자리는
그림이 들어오는 날이다 — 화면 전체를 덮는 그림 한 장의 decode가 유닛을 누른 직후에
일어난다.

## Trace 후속 확인

- render: 여정 맵 첫 착지의 mtsRender → resolve → layout → UI operation → paint는
  기록했다. 표지로 가는 update는 미수집이고 Trace도 수집하지 않았다.
- fluency: 해당 없음 — 이 변경에 스크롤이나 애니메이션 구간이 없다.
- memory: 탭 전환 직후 snapshot만 있다. 표지를 띄운 뒤의 값은 재지 않았다.
- NativeModule: 해당 없음 — 이 변경은 NativeModule을 부르지 않는다.

## 결론과 후속

- 결론: 여정 맵을 그리는 pipeline은 30.0~34.5 ms로 관측됐고 기준 기록과 같은 크기의
  범위에 있다. 표지가 서는 구간의 비용은 수집 수단이 없어 재지 못했다.
- 후속: 표지에 그림이 들어오는 변경에서 표지 전이에 timing flag를 붙이고 다시 잰다.
  아직 이슈가 없다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier(`libitum:navigation:journey`)가 사용자 · 콘텐츠 식별자가
      아닌지 확인했다 — 탭 이름뿐이다.
- [x] `미측정` 구간을 baseline이나 성능 통과로 표현하지 않았다.
