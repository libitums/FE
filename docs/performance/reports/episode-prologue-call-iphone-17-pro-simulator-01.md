# 에피소드 서사 통화 — 표지 · 통화 · 학습 완료 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 시뮬레이터 세 회차 기록이고 예산 판정이 아니다. 서사 통화와 학습 완료
> 화면의 구간 자체는 수집기가 잡지 못해 **미측정**으로 남는다.

## 실행 조건

- 측정 일시: 2026-09-28T07:45:48Z (1회차) · 07:46:24Z (2회차) · 07:46:57Z (3회차)
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 실행해 Rendering entry와 Memory
  snapshot을 세 회차 수집하고 기존 분석기로 검증했다.
- 기능 PR: 서사 표지의 `Next` 뒤에 서사 통화와 학습 완료 화면을 잇는 변경(이 보고서와 같은
  PR, Figma 80-7797)
- 대상 commit: `cd83b93be8b4e38f6d9e6cfe5a5274040dcaa4fb`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator, 내장 `main.lynx.bundle`(962,944 bytes, SHA-256
  `97aaf275da1fa4853530303b2090ee4b1c70cb83021c16f678862e09b8cfc911`);
  `performance:capture:smoke`로 build · 수집 연결을 먼저 검증하고
  `--performance-capture`로 실행
- 실행 회차: 01 (Host를 껐다 켜는 것으로 회차를 가른 3회)

## 시나리오

- 전제: 저장된 로그인 토큰이 있어 Host가 곧장 여정 맵으로 뜬다. 여정 진행은 제품의
  씨앗이고, 표지를 본 에피소드가 없다. 시스템 글자 크기는 기본이다.
- 단계: Host를 `--performance-capture`로 띄우고 10초 둔다. 「주문하기」 → `시작` → 표지의
  `Next` → 통화의 `통화 종료` → `Continue` → 학습 완료의 `Check`를 1.5초 간격으로 누른다.
  2초 두고 여정 맵으로 돌아온 것을 접근성 트리로 확인한 뒤 캡처 파일을 분석기로 읽는다.
  조작은 `idb`로 접근성 이름을 찾아 넣었다. **여섯 조작이 모두 닿고 맵으로 돌아온 회차만
  센다** — 세 회차가 모두 그렇다.
- 관찰 구간: `libitum:navigation:journey` timing flag가 붙은 update pipeline과 그 직후의
  전역 메모리 snapshot.

다른 작업이 기본 시뮬레이터를 쓰고 있어 같은 기종 · 같은 런타임의 시뮬레이터를 따로
만들어 쟀다. 그래서 `performance:capture` 명령(`booted`를 고른다) 대신 같은 실행 인자로
`simctl launch`를 직접 부르고, 캡처 파일을 `performance:report`의 분석기로 읽었다.

**측정 환경이 불안정했다.** 이 시뮬레이터가 측정 도중 외부 원인으로 여러 번 꺼졌다(이
측정의 스크립트는 기기를 끄지 않는다). 앞선 시도의 회차들은 조작이 끝까지 가지 못해
버렸고, 꺼지면 다시 켜서 끝까지 간 회차만 모았다. 위 1회차는 다시 켠 직후의 첫 실행이다.

## 이 변경이 무엇을 건드렸나

- 표지의 `Next`가 서사 통화로 간다(그 에피소드에 통화가 있을 때). 통화는 1초 시계와 3초마다
  넘어가는 대사, 음소거 · 종료 · 소리 크기 버튼이다.
- 통화가 끝나면 버튼 줄이 걷히고 하단 fog 위에 `Continue`가 선다. `Continue`는 학습 완료
  화면(기존 컴포넌트)을 띄우고, 그 `Check`는 서사를 본 것으로 적고 여정 맵으로 돌아간다.
- 여정 맵을 그리는 경로는 바뀌지 않았다.

## 분석 결과

여정 맵에 닿는 update pipeline(`libitum:navigation:journey`)이다.

| 회차  | pipeline  | layout    | paintingUiOperationExecute |
| ----- | --------- | --------- | -------------------------- |
| 1회차 | 43.615 ms | 17.990 ms | 14.026 ms                  |
| 2회차 | 36.268 ms | 17.621 ms | 8.232 ms                   |
| 3회차 | 49.222 ms | 15.381 ms | 5.701 ms                   |

같은 회차들의 나머지 값이다.

```text
Rendering
  FCP loadBundle: lynxFcp 91.064 / 82.577 / 74.286 ms

Memory
  after-navigation-journey-01 [complete]: totalBytes 1816320 bytes,
    elementBytes 157040 bytes, viewBytes 99840 bytes,
    mainThreadRuntimeBytes 1559440 bytes, elementNodeCount 151 nodes (세 회차 같음)
```

**서사 통화 · 학습 완료 화면의 구간은 수집되지 않았다.** 그 전이에는 timing flag가 없어
pipeline entry가 생기지 않는다. 그 값을 추정하거나 `0`으로 쓰지 않는다.

## 비교

- 기준 기록: [`episode-intro-cover-iphone-17-pro-simulator-01.md`](episode-intro-cover-iphone-17-pro-simulator-01.md)
  — 같은 기종 · OS · Lynx SDK에서 같은 여정 맵 첫 착지를 쟀다. pipeline 30.623 · 29.987 ·
  34.491 ms, `elementNodeCount` 151.
- 차이: 노드 수는 같다. pipeline은 36.3~49.2 ms로 기준(30.0~34.5 ms)보다 높게 관측됐고,
  세 값의 폭(12.9 ms)이 기준과의 차이보다 크다. 예산 판정이 아니다.

## 해석

**이 기록은 이 변경의 비용을 말하지 못한다.** 한계가 넷이다.

첫째, **잰 구간과 바뀐 구간이 다르다.** 수집된 pipeline은 여정 맵 첫 착지이고, 이 변경이
더한 것은 표지 뒤의 화면들이다. 여정 맵을 그리는 코드는 바뀌지 않았다.

둘째, **기준보다 높은 값을 변경의 효과로 읽지 않는다.** 노드 수가 같고 맵의 코드가 바뀌지
않았다. 높은 몫은 layout이 아니라 UI operation 쪽에 흩어져 있고(1회차 painting 14.0 ms),
세 값의 폭이 기준과의 차이보다 크다. 측정 도중 기기가 여러 번 꺼질 만큼 환경이
불안정했다는 것이 더 가까운 설명이지만, 그것도 이 자료로 판정할 수는 없다.

셋째, **단일 기기 · 세 회차다.** 흔들림 폭을 말하기에는 회차가 적다.

눈여겨볼 자리는 통화 화면의 1초 시계다 — 통화가 이어지는 동안 1초마다 화면 전체가 다시
그려진다. 대사가 네 줄이라 12초 남짓이지만, 대사가 길어지면 그만큼 다시 그리기가
이어진다.

## Trace 후속 확인

- render: 여정 맵 첫 착지의 mtsRender → resolve → layout → UI operation → paint는
  기록했다. 서사 통화 · 학습 완료로 가는 update는 미수집이고 Trace도 수집하지 않았다.
- fluency: 미측정 — 통화 중 1초마다의 다시 그리기를 프레임 단위로 재지 않았다.
- memory: 탭 전환 직후 snapshot만 있다. 통화 뒤와 학습 완료 뒤의 값은 재지 않았다.
- NativeModule: 해당 없음 — 이 변경은 NativeModule을 부르지 않는다. 통화 음성이 아직 없다.

## 결론과 후속

- 결론: 표지 → 통화 → 학습 완료 → 맵의 흐름이 세 회차 모두 끝까지 갔고, 여정 맵 첫 착지의
  노드 수는 기준 기록과 같다. 서사 통화와 학습 완료 화면의 비용은 수집 수단이 없어 재지
  못했다.
- 후속: 통화 음성이 들어오는 변경에서 통화 화면에 timing flag를 붙이고, 안정된 기기로 다시
  잰다. 아직 이슈가 없다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier(`libitum:navigation:journey`)가 사용자 · 콘텐츠 식별자가
      아닌지 확인했다 — 탭 이름뿐이다.
- [x] `미측정` 구간을 baseline이나 성능 통과로 표현하지 않았다.
