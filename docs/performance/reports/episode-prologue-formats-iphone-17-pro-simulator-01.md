# 에피소드 서사 형식(통화 · 메신저 · 비주얼 노벨) — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 시뮬레이터 세 회차 기록이고 예산 판정이 아니다. 서사 화면 자체의 구간은
> 수집기가 잡지 못해 **미측정**으로 남는다.

## 실행 조건

- 측정 일시: 2026-09-28T08:29:40Z (1회차) · 08:30:05Z (2회차) · 08:30:31Z (3회차)
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 실행해 Rendering entry와 Memory
  snapshot을 세 회차 수집하고 기존 분석기로 검증했다.
- 기능 PR: 에피소드마다 서사 형식 하나(통화 · 메신저 · 비주얼 노벨)를 고르게 하고 메신저 서사
  화면(Figma 79-6762)을 더한 변경(이 보고서와 같은 PR)
- 대상 commit: `087e33013b9de08b695c04bc241dd4be1a075ab9` 위의 작업 트리
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator, 내장 `main.lynx.bundle`(1,019,005 bytes, SHA-256
  `944c1ba7acd1fc202ec1d670f8feb23f3cb3696bfd9cf7be799484375675ab99`);
  `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 저장된 로그인 토큰이 있어 Host가 곧장 여정 맵으로 뜬다. 여정 진행은 제품의
  씨앗이고, 표지를 본 에피소드가 없다. 시스템 글자 크기는 기본이다.
- 단계: Host를 `--performance-capture`로 띄우고 10초 둔다. 「주문하기」 → `시작` → 표지의
  `Next` → 비주얼 노벨의 `다음 대사` 세 번 → 학습 완료의 `Check`를 1.5초 간격으로 누른다.
  2초 두고 여정 맵으로 돌아온 것을 접근성 트리로 확인한 뒤 캡처 파일을 분석기로 읽는다.
  조작은 `idb`로 접근성 이름을 찾아 넣었다. **일곱 조작이 모두 닿고 맵으로 돌아온 회차만
  센다** — 세 회차가 모두 그렇다.
- 관찰 구간: `libitum:navigation:journey` timing flag가 붙은 update pipeline과 그 직후의
  전역 메모리 snapshot.

제품 경로에서 서사를 가진 에피소드는 튜토리얼(비주얼 노벨) 하나다. 통화 · 메신저 서사는
아직 배정된 에피소드가 없어 이 측정에 들어가지 않았다.

다른 작업이 기본 시뮬레이터를 쓰고 있어 같은 기종 · 같은 런타임의 시뮬레이터를 따로
만들어 쟀다. 그래서 `performance:capture` 명령(`booted`를 고른다) 대신 같은 실행 인자로
`simctl launch`를 직접 부르고, 캡처 파일을 `performance:report`의 분석기로 읽었다.

## 이 변경이 무엇을 건드렸나

- 표지의 `Next` 뒤에 비주얼 노벨 → 통화를 잇던 사슬(#134)을, 에피소드마다 형식 하나를 고르는
  표(`app/episode-prologues.ts`)로 바꿨다. 튜토리얼은 비주얼 노벨이다.
- 메신저 서사 화면이 새로 들어왔다 — 말풍선 목록(`ChatBubble`), 1.5초마다 도착하는 상대
  메시지, 답이 채워진 입력창과 보내기, 끝나면 fog 위의 `Continue`.
- 여정 맵을 그리는 경로는 바뀌지 않았다.

## 분석 결과

여정 맵에 닿는 update pipeline(`libitum:navigation:journey`)이다.

| 회차  | pipeline  | layout    | paintingUiOperationExecute |
| ----- | --------- | --------- | -------------------------- |
| 1회차 | 29.392 ms | 13.003 ms | 5.870 ms                   |
| 2회차 | 34.771 ms | 17.286 ms | 6.619 ms                   |
| 3회차 | 36.694 ms | 18.473 ms | 6.235 ms                   |

같은 회차들의 나머지 값이다.

```text
Rendering
  FCP loadBundle: lynxFcp 75.916 / 76.605 / 66.158 ms

Memory
  after-navigation-journey-01 [complete]: totalBytes 1886496 bytes,
    elementBytes 157040 bytes, viewBytes 99840 bytes,
    mainThreadRuntimeBytes 1629616 bytes, elementNodeCount 151 nodes (세 회차 같음)
```

번들 크기다. main은 같은 명령(`pnpm --filter @libitums/mobile build`)으로 다시 빌드했다.

| 번들                   | 크기            |
| ---------------------- | --------------- |
| main (`087e330`, #134) | 1,005,237 bytes |
| 이 작업 트리           | 1,019,005 bytes |
| 차                     | +13,768 bytes   |

상한(1,055,000 bytes) 안이라 조정하지 않았다.

**서사 화면들의 구간은 수집되지 않았다.** 그 전이에는 timing flag가 없어 pipeline entry가
생기지 않는다. 그 값을 추정하거나 `0`으로 쓰지 않는다.

## 비교

- 기준 기록: [`episode-prologue-call-iphone-17-pro-simulator-02.md`](episode-prologue-call-iphone-17-pro-simulator-02.md)
  — 같은 기기 · 같은 방식의 여정 맵 첫 착지. pipeline 26.0~36.7 ms, 노드 151.
- 차이: 이번 pipeline 29.4~36.7 ms는 그 범위 안에 있고 노드 수도 같다.
  `mainThreadRuntimeBytes`는 1,559,440 → 1,629,616 bytes(+70,176)로 늘었다. 기준 기록은
  비주얼 노벨(#134)이 들어오기 전 빌드라, 이 차이에는 #134와 이 변경이 함께 들어 있다. 둘을 나눠
  재지 않았다. 예산 판정이 아니다.

## 해석

- 여정 맵 첫 착지는 기준 기록과 같은 범위다. 이 변경이 맵의 경로를 건드리지 않았다는 것과
  맞는다.
- 메인 스레드 런타임 메모리의 증가는 번들이 커진 만큼 로드된 코드가 늘었다는 것으로 읽는다.
  다만 #134와 이 변경의 몫을 가르지 못해, 어느 쪽이 얼마인지는 이 자료로 말할 수 없다.
- **이 기록이 말하지 못하는 것**: 메신저 서사 화면은 제품 경로에 없어 재지 않았다. 말풍선이
  쌓일수록 늘어나는 목록의 비용도 재지 않았다. 단일 기기 시뮬레이터 기록이다.

## Trace 후속 확인

- render: 여정 맵 첫 착지의 mtsRender → resolve → layout → UI operation → paint는
  기록했다. 서사 화면으로 가는 update는 미수집이고 Trace도 수집하지 않았다.
- fluency: 미측정 — 메신저의 메시지 도착과 비주얼 노벨의 장면 전환을 프레임 단위로 재지
  않았다.
- memory: 탭 전환 직후 snapshot만 있다. 서사 화면 뒤의 값은 재지 않았다.
- NativeModule: 해당 없음 — 이 변경은 NativeModule을 부르지 않는다.

## 결론과 후속

- 결론: 표지 → 비주얼 노벨 → 학습 완료 → 맵의 흐름이 세 회차 모두 끝까지 갔고, 여정 맵 첫
  착지는 기준 기록과 같은 범위다. 번들은 +13,768 bytes로 상한 안이다.
- 후속: 메신저 · 통화 서사를 제품 에피소드에 배정하는 변경에서 그 화면에 timing flag를 붙여
  다시 잰다. 아직 이슈가 없다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier(`libitum:navigation:journey`)가 사용자 · 콘텐츠 식별자가
      아닌지 확인했다 — 탭 이름뿐이다.
- [x] `미측정` 구간을 baseline이나 성능 통과로 표현하지 않았다.
