# 여정 맵 유닛 탭 — 자리 재기 · 가운데 스크롤 · 말풍선 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 시뮬레이터 세 회차 기록이고 예산 판정이 아니다. 이 변경이 실제로 바꾼
> 구간(유닛 탭 뒤)은 수집기가 잡지 못해 **미측정**으로 남는다.

## 실행 조건

- 측정 일시: 2026-09-28T01:56:31Z (1회차) · 01:56:47Z (2회차) · 01:57:03Z (3회차)
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 실행해 Rendering entry와 Memory
  snapshot을 세 회차 수집하고 기존 분석기로 검증했다.
- 기능 PR: [#120 — 유닛을 실제로 재서 말풍선을 붙이고 스크롤 가운데로 옮긴다](https://github.com/libitums/FE/pull/120)
- 대상 commit: `eb970ae170adbe31d842f1263347153b381f107e`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator, 내장 `main.lynx.bundle`(816,796 bytes, SHA-256
  `b350d5ee6e19b1bbac5af98b55a72de40a5360f0cf260c9a9529f87d2df8afa2`);
  `performance:capture:smoke`로 build · install · 수집 연결을 먼저 검증하고
  `--performance-capture`로 실행
- 실행 회차: 01 (Host를 껐다 켜는 것으로 회차를 가른 3회)

## 시나리오

- 전제: 저장된 로그인 토큰이 있어 Host가 곧장 여정 맵으로 뜬다. 스텝 둘이 끝나 있고
  현재 스텝은 「주문하기」다. 시스템 글자 크기는 기본이다.
- 단계: `performance:capture -- start`로 Host를 띄우고 6초 둔다. 바텀 내비게이터에서
  롤플레이 탭 → 여정 탭을 2초 간격으로 누른다. 2초 뒤 현재 유닛 「주문하기」를 유닛의
  **위쪽 끝**(중심에서 40pt 위)에서 누르고 3초 둔다. `report`로 보고하고 `stop`으로
  종료한다. 같은 절차를 두 번 더 반복한다. 탭은 `idb ui tap`으로 같은 좌표에 넣었다.
- 관찰 구간: `libitum:navigation:journey` · `libitum:navigation:roleplay` timing flag가
  붙은 update pipeline과, 그 직후의 전역 메모리 snapshot.

## 이 변경이 무엇을 건드렸나

- 유닛을 누르면 요소 셋(유닛 상자 · 스크롤 상자 · 화면 상자)에 `boundingClientRect`
  질의를 보낸다. 탭 한 번에 질의 셋이고, 답이 오면 `scrollTo` 한 번을 부른다.
- 말풍선이 열린 동안 스크롤 이벤트마다 화면이 다시 그려진다 — 이 부분은 바뀌지 않았다.
  바뀐 것은 스크롤이 **실제로 일어난다**는 점이다. 이전에는 `scrollIntoView`가 클래스
  선택자로 불려 무시됐으므로, 말풍선이 열린 채 스크롤 애니메이션이 도는 구간 자체가
  없었다.
- 맵을 처음 그리는 경로에는 `id` 속성 둘(화면 상자 · 스크롤 상자)과 스텝 상자마다
  `id` 하나가 더해졌다. 노드는 늘지 않았다.

## 분석 결과

여정 맵에 닿는 update pipeline(`libitum:navigation:journey`)이다.

| 회차  | pipeline  | layout    | paintingUiOperationExecute |
| ----- | --------- | --------- | -------------------------- |
| 1회차 | 40.073 ms | 19.402 ms | 7.987 ms                   |
| 2회차 | 36.799 ms | 19.133 ms | 6.416 ms                   |
| 3회차 | 38.058 ms | 19.388 ms | 7.278 ms                   |

같은 회차들의 나머지 값이다.

```text
Rendering
  FCP loadBundle: lynxFcp 60.899 / 67.304 / 59.743 ms
  Pipeline (libitum:navigation:roleplay): pipeline 17.096 / 12.241 / 10.742 ms

Memory
  after-navigation-journey-01 [complete]: totalBytes 1662544 bytes,
    elementBytes 156000 bytes, viewBytes 99840 bytes,
    mainThreadRuntimeBytes 1406704 bytes, elementNodeCount 150 nodes (세 회차 같음)
```

**유닛 탭 뒤의 구간은 수집되지 않았다.** 질의 셋 · `scrollTo` · 말풍선이 스크롤을
따라가는 다시 그리기에는 timing flag가 없어 pipeline entry가 생기지 않고, 메모리
snapshot도 탭 전환에만 걸려 있다. 그 값을 추정하거나 `0`으로 쓰지 않는다.

수치와 별개로, 같은 빌드에서 동작을 눈과 접근성 트리로 확인했다.

- 「주문하기」를 위쪽 끝에서 눌렀을 때와 아래쪽 끝에서 눌렀을 때 말풍선 제목의 세로
  자리가 같다(554pt). 탭 좌표가 아니라 잰 유닛 자리에서 나온다.
- 탭 뒤 유닛 중심이 618pt에서 462pt로 옮겨 가고, 말풍선이 유닛 아래 모서리 바로 밑에
  선다. 말풍선 아래 끝(750pt)은 바텀 내비게이터(814pt) 위에 있다.
- 맨 위 유닛 「첫 인사」는 더 내릴 스크롤이 없어 제자리(중심 330pt)에 있고, 말풍선은
  그 유닛 아래에 선다.

## 비교

- 기준 기록: [`journey-map-top-bar-and-episode-header-iphone-17-pro-simulator-01.md`](journey-map-top-bar-and-episode-header-iphone-17-pro-simulator-01.md)
  — 같은 기기 · OS · Lynx SDK, 같은 탭 왕복 절차. 그 기록의 pipeline은 44.183 · 39.685 ·
  41.349 ms, layout은 29.211 · 21.236 · 21.077 ms, `elementNodeCount`는 151이다.
- 차이: pipeline은 세 회차 모두 기준 기록의 범위보다 1.6~4.1 ms 낮게 관측됐다. 예산
  판정이 아니고, 아래 이유로 이 차이를 변경의 효과로 읽지 않는다.

## 해석

**이 기록은 이 변경의 비용을 말하지 못한다.** 한계가 셋이다.

첫째, **잰 구간과 바뀐 구간이 다르다.** 수집된 pipeline은 맵을 처음 그리는 구간이고,
이 변경이 더한 일(질의 · 스크롤 · 따라가는 다시 그리기)은 유닛을 누른 뒤에 일어난다.
위 표는 「맵을 그리는 경로가 눈에 띄게 달라지지 않았다」까지만 가리키고, 탭 뒤의 비용은
미측정이다.

둘째, **timing flag는 같은 이름의 첫 등장만 잰다.** Host가 여정 맵으로 곧장 뜨므로
`libitum:navigation:journey`는 롤플레이 탭을 누르기 **전**, 첫 착지에서 이미 기록됐다.
탭을 오간 뒤의 재진입은 기록되지 않았다. 기준 기록은 같은 절차를 「재진입」으로 적었지만
같은 이유로 첫 착지였을 가능성이 있고, 이 기록만으로는 그것을 확정할 수 없다.

셋째, **전환 pipeline의 흔들림 폭을 아직 모른다.** 세 회차 폭이 36.8~40.1 ms이고 기준
기록과의 차이(1.6~4.1 ms)가 그 폭과 같은 크기다. 단일 기기 · 세 회차로는 이 차이가
변경 때문인지 회차 잡음인지 판정할 수 없다. 노드 수가 151에서 150으로 하나 준 것도 이
변경이 노드를 빼지 않았으므로 다른 변경이나 상태 차이에서 왔을 것이고, 어느 쪽인지는
자료가 없다.

병목 후보로 눈여겨볼 자리는 말풍선이 열린 채 도는 스크롤 애니메이션이다. 스크롤
이벤트마다 background thread에서 상태가 바뀌고 말풍선의 `top`이 다시 계산된다. 이전에는
스크롤이 일어나지 않아 이 경로가 사실상 돌지 않았다. 시뮬레이터에서 눈으로는 끊김이
보이지 않았지만, 그것은 측정이 아니다.

## Trace 후속 확인

- render: 맵 첫 착지의 mtsRender → resolve → layout → UI operation → paint는 기록했다.
  유닛 탭 뒤의 update는 미수집이고 Trace도 수집하지 않았다.
- fluency: 미측정 — 가운데 스크롤 애니메이션과 그동안의 말풍선 이동이 이 변경의 핵심
  구간인데, 프레임 단위 기록이 없다. 실기 Trace가 필요하다.
- memory: 탭 전환 직후 snapshot만 있다. 말풍선을 열고 닫은 뒤의 잔류는 재지 않았다.
- NativeModule: 해당 없음 — 이 변경은 NativeModule을 부르지 않는다. `boundingClientRect` ·
  `scrollTo`는 요소 UI 메서드다.

## 결론과 후속

- 결론: 맵을 그리는 pipeline은 36.8~40.1 ms로 관측됐고 기준 기록과 같은 크기의 범위에
  있다. 유닛 탭 뒤의 비용은 수집 수단이 없어 재지 못했다.
- 후속: 말풍선이 열리는 update에 timing flag를 붙이면 탭 → 말풍선 구간을 같은 도구로
  잴 수 있다. 스크롤 애니메이션의 유창성은 실기 Trace로 확인한다. 둘 다 아직 이슈가
  없다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier(`libitum:navigation:journey` · `libitum:navigation:roleplay`)가
      사용자 · 콘텐츠 식별자가 아닌지 확인했다 — 탭 이름뿐이다.
- [x] `미측정` 구간을 baseline이나 성능 통과로 표현하지 않았다.
