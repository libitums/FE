# 문장 순서·단어 선택 도입 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 회차 시뮬레이터 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-05T03:45+09:00
- 상태: 측정 — iOS native lifecycle PerformanceEntry와 global memory query를 로컬
  `performance:capture`로 수집했다.
- 기능 PR: LIB-229 — 기본 학습형 나머지 2종
- 대상 commit: `843b87f`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1
- 빌드: **Release**, 내장 `main.lynx.bundle`, 번들 213,653 bytes (213.7 kB)
- 실행 회차: 01

**번들 동일성 확인**: `apps/ios/main.lynx.bundle`과 `.app` 안이 같다
(`1c6936779354e67b…`).

## 시나리오

- 전제: 앱을 종료한 상태에서 `--performance-capture`로 재실행한다. 시스템 글자 크기는
  기본(`large`)이다.
- 단계: 홈 탭이 초기 화면으로 뜰 때까지 둔다. 사용자 조작을 하지 않는다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 메모리 snapshot.

## ⚠ 이 회차가 새 화면을 재지 않는다 — 번들에 없기 때문이다

**이 변경이 만든 화면 둘이 번들에 통째로 없다.** 확인했다:

```
App.tsx·navigation.ts가 SentenceOrderScreen·WordChoiceScreen을 부르는 자리   0건
번들에서 "SentenceOrderScreen" · "WordChoiceScreen"                          0건
번들에서 화면 제목 문자열 "문장 순서" · "단어 선택"                            0건
```

**아무도 import하지 않아 번들러가 통째로 걷어냈다.** 셸 결선(W9)이
**「어느 스텝이 어느 학습형인가」가 데이터에 없어서** 막혀 있고(LIB-229 §8.2 보류 1 ·
LIB-236), 그래서 새 코드가 도달 불가능하다.

**그러므로 아래 수치는 「새 화면의 비용」이 아니다.** 이 회차가 답하는 것은
**「닿지 않는 코드가 번들과 초기 로드에 얼마나 드는가」**이고 답은 **0**이다.

**새 화면의 비용은 LIB-236이 배선을 놓은 뒤에 잰다.** 그 회차가 이 기록의 짝이다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 145.728 ms, fcp 146.214 ms
  LoadBundle loadBundle: loadBundle 41.366 ms, parse 1.628 ms,
    loadBackground 6.891 ms, pipeline 145.738 ms, mtsRender 2.617 ms,
    resolve 1.229 ms, layout 28.083 ms,
    paintingUiOperationExecute 6.395 ms, layoutUiOperationExecute 0.849 ms

Memory
  after-initial-load [complete]: totalBytes 534544 bytes,
    elementBytes 31200 bytes, viewBytes 21376 bytes,
    mainThreadRuntimeBytes 481968 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 36636976 bytes, elementNodeCount 30 nodes;
    instances 1/1; collection 1 ms
```

## 비교

- 기준 기록: [낭독 순서 교정 — 01](traversal-order-iphone-17-pro-simulator-01.md)
  (`4b196a3`, **Release**, 같은 시뮬레이터·OS·SDK)

| | 기준 | 이번 | 차 |
|---|---|---|---|
| `elementNodeCount` | 30 | **30** | **0** |
| `elementBytes` | 31,200 | **31,200** | **0** |
| `viewBytes` | 21,376 | **21,376** | **0** |
| `mainThreadRuntimeBytes` | 482,256 | 481,968 | **−288** |
| `totalBytes` | 534,832 | 534,544 | **−288** |
| 번들 | 213,858 B | 213,653 B | **−205 B** |
| `lynxFcp` | 136.272 ms | 145.728 ms | +9.456 ms |

## 해석

### 화면 둘을 더했는데 번들이 **줄었다**

**−205 바이트다.** 새 코드가 번들에 0바이트를 더하고(도달 불가), **판정 어휘 승격이
중복을 걷어냈다.**

`ListeningAnswerResult`가 `lib/answer-result.ts`의 `AnswerResult`로 올라가면서
**「정답」/「오답」 표 넷이 하나가 됐다** — `listening.ts` · `ListeningChoice.tsx` ·
`assessment.ts` · `AssessmentItem.tsx`. 그 넷 중 셋이 사라진 것이 번들에서
보인다.

**리팩터가 번들을 줄이는 것이 실측으로 확인된 첫 자리다.**

`mainThreadRuntimeBytes` **−288**도 같은 방향이다 — 런타임에 올라가는 객체가
그만큼 줄었다.

### 요소 트리는 그대로다

`elementNodeCount` · `elementBytes` · `viewBytes` 셋이 **기준과 정확히 같다.**
초기 화면(홈)의 구조가 안 바뀌었다는 뜻이고, 새 화면이 도달 불가능하니 당연하다.

### 시간은 여전히 판정 불가다

`lynxFcp`가 **+9.456 ms**인데, **번들이 줄고 트리가 같은 변경**에서 시간이 늘었다.
설명이 안 된다.

네 회차를 나란히 놓으면:

| 회차 | commit | `lynxFcp` | `elementNodeCount` | 번들 |
|---|---|---|---|---|
| 스크롤 영역 | `77aa4779` | 122.622 ms | 30 | 201.6 kB |
| 평가 화면 | `53b16c4` | 147.598 ms | 30 | 213.7 kB |
| 낭독 순서 | `4b196a3` | 136.272 ms | 30 | 213.9 kB |
| 이번 | `843b87f` | 145.728 ms | 30 | 213.7 kB |

**요소 수가 넷 다 30이고 번들이 12 kB 안에 있는데 `lynxFcp`가 122.6~147.6으로
25 ms 폭으로 흔들린다.**

앞 회차가 세 점으로 *"변동 폭의 하한이 25 ms"* 를 보였고 **넷째 점이 그 안에
들어온다.** 방향도 다시 뒤집혔다(−11.3 → +9.5).

**「회귀」로 읽을 근거가 넷 중 어디에도 없다.** 여전히 같은 커밋을 반복해서 재는
회차가 필요하고, **이번 기록도 그 필요를 없애지 못한다.**

## Trace 후속 확인

- **render** — 네 점의 `lynxFcp` 산포가 25 ms다. 단계별 분해는 반복 측정 뒤다.
- **fluency** — 이 회차의 대상이 아니다. **새 화면의 스크롤은 도달 경로가 없어
  못 쟀다.**
- **memory** — `after-initial-load` 하나뿐이다. **새 화면 진입·이탈의 보유 증가는
  이 기록이 답하지 않는다** — 진입 자체가 불가능하다.
- **NativeModule** — 이 변경이 새로 부르는 네이티브 모듈이 없다.

## 결론과 후속

- **새 화면을 재지 않았다. 번들에 없다.** 그 사실 자체가 이 기록의 주된 산출이다.
- **판정 어휘 승격이 번들을 205바이트, 런타임을 288바이트 줄였다.** 리팩터의
  이득이 실측으로 보인 첫 자리다.
- **요소 트리는 그대로다.**
- **시간은 판정 불가이고 넷째 점도 25 ms 밴드 안이다.**

후속 둘:

1. **LIB-236이 배선을 놓은 뒤 다시 잰다.** 그때가 새 화면의 비용을 처음 재는 회차다.
2. **같은 커밋을 여러 번 재는 회차.** 세 회차째 같은 후속이 남는다.

## 정제 확인

- `pnpm verify` exit 0 (unit 322 · ui 368 · integration 47).
- 이 기록은 **예산 판정이 아니다.**
- 이 기록은 **수용 기준을 닫지 않는다.**
