# 에피소드 서사 메신저 — 서사 형식 분기 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 시뮬레이터 세 회차 기록이고 예산 판정이 아니다. 서사 메신저 화면 자체는
> 제품 경로에 없어(튜토리얼의 서사는 통화다) **미측정**으로 남는다.

## 실행 조건

- 측정 일시: 2026-09-28T08:12:09Z (1회차) · 08:12:42Z (2회차) · 08:13:15Z (3회차)
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 실행해 Rendering entry와 Memory
  snapshot을 세 회차 수집하고 기존 분석기로 검증했다.
- 기능 PR: 에피소드의 서사 전개를 통화 · 메신저 중 하나로 고르게 하고 서사 메신저 화면을
  더하는 변경(이 보고서와 같은 PR, Figma 79-6762)
- 대상 commit: `86cabd7a83da441281c9c29ab2ad0e83a59da4bb` 위의 작업 트리
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator, 내장 `main.lynx.bundle`(977,874 bytes, SHA-256
  `32c13e811afed29071762585f52e562ef7c644e20f40269b320ef1db872d7fc5`);
  `performance:capture:smoke`로 build · 수집 연결을 먼저 검증하고
  `--performance-capture`로 실행
- 실행 회차: 01 (Host를 껐다 켜는 것으로 회차를 가른 3회)

## 시나리오

- 전제: 저장된 로그인 토큰이 있어 Host가 곧장 여정 맵으로 뜬다. 여정 진행은 제품의
  씨앗이고, 표지를 본 에피소드가 없다. 시스템 글자 크기는 기본이다.
- 단계: Host를 `--performance-capture`로 띄우고 10초 둔다. 「주문하기」 → `시작` → 표지의
  `Next` → 통화의 `통화 종료` → `Continue` → 학습 완료의 `Check`를 1.5초 간격으로 누른다.
  2초 두고 여정 맵으로 돌아온 것을 접근성 트리로 확인한 뒤 캡처 파일을 분석기로 읽는다.
  조작은 `idb`로 접근성 이름을 찾아 넣었다. 여섯 조작이 모두 닿고 맵으로 돌아온 회차만
  센다 — 세 회차가 모두 그렇다.
- 관찰 구간: `libitum:navigation:journey` timing flag가 붙은 update pipeline과 그 직후의
  전역 메모리 snapshot.

다른 작업이 기본 시뮬레이터를 쓰고 있어 같은 기종 · 같은 런타임의 시뮬레이터를 따로
만들어 쟀다. 그래서 `performance:capture` 명령(`booted`를 고른다) 대신 같은 실행 인자로
`simctl launch`를 직접 부르고, 캡처 파일을 `performance:report`의 분석기로 읽었다.

**제품 경로는 통화다.** 오늘 에피소드는 튜토리얼 하나이고 그 서사가 통화라, 서사 메신저
화면은 제품에서 닿는 길이 없다. 이 시나리오가 지나는 것은 이 변경이 바꾼 분기(서사 형식을
보고 통화 화면을 고르는 자리)이고, 메신저 화면 자체는 지나지 않는다.

## 이 변경이 무엇을 건드렸나

- 서사 전개가 에피소드마다 형식(통화 · 메신저)을 하나 고르는 모양이 됐다. 표지의 `Next`와
  서사 route가 그 형식을 보고 화면을 고른다.
- 서사 메신저 화면이 더해졌다. 상대 메시지는 1.5초마다 저절로 오고, 내 차례에는 보낼
  말이 입력창에 채워져 보내기를 기다린다. 끝나면 하단 fog 위에 `Continue`가 선다.
- 메시지 말풍선은 ui-lynx `ChatBubble`을 쓴다(온보딩이 이미 쓰는 컴포넌트).
- 여정 맵을 그리는 경로는 바뀌지 않았다.

## 분석 결과

여정 맵에 닿는 update pipeline(`libitum:navigation:journey`)이다.

| 회차  | pipeline  | layout    | paintingUiOperationExecute |
| ----- | --------- | --------- | -------------------------- |
| 1회차 | 41.022 ms | 19.907 ms | 6.848 ms                   |
| 2회차 | 40.503 ms | 20.158 ms | 6.850 ms                   |
| 3회차 | 33.602 ms | 19.165 ms | 4.872 ms                   |

같은 회차들의 나머지 값이다.

```text
Rendering
  FCP loadBundle: lynxFcp 62.115 / 72.041 / 68.488 ms

Memory
  after-navigation-journey-01 [complete]: totalBytes 1828912 bytes,
    elementBytes 157040 bytes, viewBytes 99840 bytes,
    mainThreadRuntimeBytes 1572032 bytes, elementNodeCount 151 nodes (세 회차 같음)
```

**서사 메신저 화면의 구간은 수집되지 않았다.** 제품 경로에 없고, 서사 전이에는 timing
flag도 없다. 그 값을 추정하거나 `0`으로 쓰지 않는다.

수치와 별개로, 서사를 메신저로 바꾼 임시 번들(커밋하지 않았다)에서 동작을 눈과 접근성
트리로 확인했다. 상대 메시지가 저절로 오고, 내 차례에 입력창에 보낼 말이 채워지며, 보내기로
넘어가고, 끝나면 `Continue`가 선다.

## 비교

- 기준 기록: [`episode-prologue-call-iphone-17-pro-simulator-02.md`](episode-prologue-call-iphone-17-pro-simulator-02.md)
  — 같은 기기 · 같은 절차, 서사 형식 분기가 없던 빌드. pipeline 25.986 · 36.733 · 29.130 ms,
  `elementNodeCount` 151.
- 차이: 노드 수는 같다. pipeline은 33.6~41.0 ms로 기준 범위(26.0~36.7 ms)와 일부 겹치고 위로
  치우쳤다. 같은 빌드를 두 번 잰 기준 기록(01과 02)에서 이 시뮬레이터의 흔들림이 10 ms
  이상이었으므로, 이 차이를 변경의 효과로 읽지 않는다. 예산 판정이 아니다.

## 해석

**이 기록은 이 변경의 비용을 말하지 못한다.** 한계가 셋이다.

첫째, **잰 구간과 바뀐 구간이 다르다.** 수집된 pipeline은 여정 맵 첫 착지이고, 이 변경이
더한 것은 표지 뒤의 분기와 제품에서 닿지 않는 메신저 화면이다. 여정 맵을 그리는 코드는
바뀌지 않았다.

둘째, **흔들림 폭이 차이보다 크다.** 위 비교 그대로다.

셋째, **단일 기기 · 세 회차다.**

눈여겨볼 자리는 메신저가 제품 경로에 들어오는 날이다 — 메시지가 늘면 스크롤 안의 말풍선이
늘고, 상대 메시지가 올 때마다 목록 전체가 다시 그려진다.

## Trace 후속 확인

- render: 여정 맵 첫 착지의 mtsRender → resolve → layout → UI operation → paint는
  기록했다. 서사 화면으로 가는 update는 미수집이고 Trace도 수집하지 않았다.
- fluency: 미측정 — 메신저 화면은 제품 경로에 없다.
- memory: 탭 전환 직후 snapshot만 있다.
- NativeModule: 해당 없음 — 이 변경은 NativeModule을 부르지 않는다.

## 결론과 후속

- 결론: 서사 형식 분기를 지나는 제품 경로(표지 → 통화 → 학습 완료 → 맵)가 세 회차 모두
  끝까지 갔고, 여정 맵 첫 착지의 노드 수는 기준과 같다. 서사 메신저 화면의 비용은 제품
  경로에 없어 재지 못했다.
- 후속: 메신저 서사를 쓰는 에피소드가 들어오는 변경에서 그 화면을 시나리오로 잰다. 아직
  이슈가 없다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier(`libitum:navigation:journey`)가 사용자 · 콘텐츠 식별자가
      아닌지 확인했다 — 탭 이름뿐이다.
- [x] `미측정` 구간을 baseline이나 성능 통과로 표현하지 않았다.
