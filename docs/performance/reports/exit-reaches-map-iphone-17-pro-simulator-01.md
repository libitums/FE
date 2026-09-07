# 나가기가 맵에 닿는다 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 회차 시뮬레이터 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-07T20:2x+09:00
- 상태: 측정 — 기준선과 이번을 각각 한 번씩 수집했다.
- 기능 PR: 없음 — 아직 만들지 않았다
- 대상 commit: `a0fb0b45f3eff17419eb79bdfcdc77761cc27f98`
- 비교 기준 commit: `7b4844b` (`main`)
- 기기: iPhone 17 Pro 시뮬레이터 (`3B5DADAD-597A-406C-AC83-26B3D3FADECB`)
- OS: iOS 26.5 (23F77), 호스트 macOS 26.5.1
- Lynx SDK: 4.0.1
- 빌드: **네이티브 재빌드 없음.** Release `Host.app`에 Lynx 번들만 갈아 끼웠다. 번들
  288,236 bytes
- 실행 회차: 01

**측정 일시의 분 자리(`2x`)는 캡처 기록에 남은 그대로다.** 두 캡처가 20시 20분대에
연달아 떴다는 것까지가 확인된 범위이고, **일의 자리는 확인되지 않아 비워 둔다.** 앞
회차 셋이 같은 자리를 같은 방식으로 비워 뒀다
([학습형 결선 — 01](learning-form-wiring-iphone-17-pro-simulator-01.md) ·
[문화 학습 화면 — 01](culture-screen-iphone-17-pro-simulator-01.md) ·
[문화 퀴즈 화면 — 01](culture-quiz-screen-iphone-17-pro-simulator-01.md)).

**`paintEnd`를 시각으로 환산하지 않는다.** 근거는 앞 회차가 적은 것과 같고 여기 다시
적지 않는다([문화 퀴즈 화면 — 01](culture-quiz-screen-iphone-17-pro-simulator-01.md)).
아래에서는 두 값이 **서로 다르다**는 사실만 쓴다.

## 절차 — 네이티브를 다시 빌드하지 않았다

Release `Host.app`을 그대로 두고 **그 안의 Lynx 번들만 교체해서** 두 번 쟀다. 이 절차를
어떻게 읽어야 하는지는 아래 [해석](#네이티브를-다시-빌드하지-않은-것의-양면)에 적는다.

**번들 동일성 확인**: `.app` 안과 워크트리 `dist/`가 `sha256 cdde8f0d60883bbc…`로 같다.
**해시는 캡처 기록에 남은 자리까지만 옮겨 적었다** — 뒤가 잘려 있고 채우지 않는다.

**두 캡처 모두 앱을 지우고 다시 깔았다.** `paintEnd`가 서로 다르므로 **둘 다 새
캡처다** — 앞 회차에 값이 통째로 같아 폐기한 적이 있어 이번에도 확인했다
([학습형 매핑 — 01](learning-form-mapping-iphone-17-pro-simulator-01.md)).

## 시나리오

- 전제: 앱을 **지우고 다시 깐 뒤** `--performance-capture`로 실행한다. 글자 크기 기본.
- 단계: 홈 탭이 뜰 때까지 둔다. 조작하지 않는다.
- 관찰 구간: `loadBundle` 시작부터 첫 paint까지와 직후 메모리 snapshot.
- 두 조건(`main` 기준선 · 이번 번들)에서 위 절차를 각각 한 번씩 돈다.

**이번 변경은 화면을 하나도 더하지 않았다.** 바뀐 것은 **나가는 수단의 목적지 하나**다 —
나가기가 한 겹 위가 아니라 **활성 스택의 루트**로 접힌다
([ADR-0007 D6](../../adr/0007-app-internals-state-routing-data-errors.md)). 그래서 이
회차가 재는 것은 **홈 탭까지의 초기 로드**이고, 그 전이 하나가 바뀐 것이 그 구간에
얼마를 더했는가다.

**바뀐 전이를 실기로 밟지 못한다.** 오늘 깊이 2에 서는 화면은 문화 퀴즈 하나뿐인데 그
화면에 닿는 길이 배정 때문에 0개다
([`docs/e2e/culture-quiz.md`](../../e2e/culture-quiz.md)). **그 사실이 아래 후속의
근거이고, 이 회차가 조작 구간을 못 가진 이유다.**

## 분석 결과

### 기준선 — `main` (`7b4844b`, 번들 287,842 B)

```text
Rendering
  FCP loadBundle: lynxFcp 86.339 ms, fcp 86.657 ms
  LoadBundle loadBundle: loadBundle 22.818 ms, parse 1.498 ms, loadBackground 5.703 ms,
    pipeline 86.347 ms, mtsRender 2.341 ms, resolve 1.343 ms, layout 11.173 ms,
    paintingUiOperationExecute 5.329 ms, layoutUiOperationExecute 0.567 ms;
    paintEnd 1788772828432.115 ms

Memory
  after-initial-load [complete]: totalBytes 608736 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 556160 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 37439792 bytes,
    elementNodeCount 30 nodes; status completed; instances 1/1; collection 1 ms
```

### 이번 — `LIB-245` (`a0fb0b4`, 번들 288,236 B)

```text
Rendering
  FCP loadBundle: lynxFcp 88.722 ms, fcp 89.145 ms
  LoadBundle loadBundle: loadBundle 23.144 ms, parse 1.834 ms, loadBackground 5.94 ms,
    pipeline 88.733 ms, mtsRender 2.505 ms, resolve 1.517 ms, layout 10.017 ms,
    paintingUiOperationExecute 6.042 ms, layoutUiOperationExecute 0.608 ms;
    paintEnd 1788772846942.312 ms

Memory
  after-initial-load [complete]: totalBytes 608912 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 556336 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 37292336 bytes,
    elementNodeCount 30 nodes; status completed; instances 1/1; collection 1 ms
```

## 비교

- 기준 기록: 이 회차 안의 `main` (`7b4844b`) 캡처. 같은 시뮬레이터·OS·SDK·호스트
  바이너리에서 연달아 떴다.

| | 기준 (`main`) | 이번 | 차 |
|---|---|---|---|
| 번들 | 287,842 B | 288,236 B | **+394 B** |
| `totalBytes` | 608,736 | 608,912 | **+176** |
| `mainThreadRuntimeBytes` | 556,160 | 556,336 | **+176** |
| `elementBytes` | 31,200 | 31,200 | **0** |
| `viewBytes` | 21,376 | 21,376 | **0** |
| `elementNodeCount` | 30 | 30 | **0** |
| `lynxFcp` | 86.339 ms | 88.722 ms | +2.383 ms |
| `appBytes` | 37,439,792 | 37,292,336 | −147,456 |

## 해석

### 늘어난 보유가 또 전부 런타임 한 곳이다 — 네 회차 연속

**`totalBytes` 증가분과 `mainThreadRuntimeBytes` 증가분이 정확히 같은 +176이다.**
**element·view 쪽으로는 한 바이트도 안 갔다.**

**앞 회차 셋에서도 이 둘이 같은 값으로 움직였다** — 학습형 결선 회차가 둘 다 +47,856,
문화 학습 회차가 둘 다 +8,112, 문화 퀴즈 회차가 둘 다 +18,000이다
([학습형 결선 — 01](learning-form-wiring-iphone-17-pro-simulator-01.md) ·
[문화 학습 화면 — 01](culture-screen-iphone-17-pro-simulator-01.md) ·
[문화 퀴즈 화면 — 01](culture-quiz-screen-iphone-17-pro-simulator-01.md)). **네 회차
연속으로 늘어난 보유가 메인 스레드 런타임 한 곳에 전부 앉는다.**

「모듈 그래프에 코드가 조금 들어왔고, 그 코드가 아무 요소도 만들지 않았다」와 자릿수·
방향이 맞는다 — 번들 **+394 B**에 런타임 **+176**이다.

### 요소 셋이 네 회차 연속 0이다 — ⚠ 이번엔 이유가 다르다

**`elementBytes` · `viewBytes` · `elementNodeCount` 셋이 기준과 정확히 같다.** 앞 회차
셋에 이어 **네 회차 연속 0이다.**

**⚠ 같은 숫자가 같은 이유로 나온 것이 아니다.** 이 구분이 이번 기록의 값이다.

| 회차 | 요소 셋이 0인 이유 |
|---|---|
| 앞의 셋 | **새 화면이 섰는데 도달 불가라 안 그려졌다.** 화면은 늘었고 모듈 그래프에도 들어왔지만 배정 때문에 닿는 경로가 0개였다 |
| **이번** | **화면이 아예 안 늘었다.** 그릴 새 화면 자체가 없다 — 바뀐 것은 **항해 전이 하나**(나가기의 목적지)이고, 그 전이는 초기 로드 구간에서 한 번도 밟히지 않는다 |

**이 구분을 안 적으면 다음 사람이 네 회차를 같은 사건의 반복으로 읽는다.** 앞의 셋은
「도달 불가라서 안 그려진다」였고 **이번은 「그릴 것이 새로 없다」**다. 앞의 셋은 배정이
오면 숫자가 움직이지만, 이번 변경은 **배정이 와도 이 구간의 요소 셋을 안 움직인다** —
바뀐 전이가 초기 로드에 들어 있지 않기 때문이다.

### `lynxFcp` +2.383 ms와 `appBytes` −147,456은 잡음이다

**개선으로도 회귀로도 읽지 않는다.**

**회차가 01 하나뿐이다.** 조건당 캡처 한 번씩이고 같은 조건을 반복해 재지 않았다.
**단일 회차라 이 차가 신호인지 잡음인지 판정할 수 없다** — 그것이 이 기록의 한계다.

**앞 회차에 코드가 늘었는데 값이 줄어든 자리가 둘 있다.** 문화 학습 회차의 `lynxFcp`
**−3.813 ms**와 `appBytes` **−131,048**이다
([문화 학습 화면 — 01](culture-screen-iphone-17-pro-simulator-01.md)). **코드 증가와
부호가 반대로 나온 적이 이미 있으므로**, 이번 `lynxFcp` +2.383 ms를 저하로 읽을 수 없고
`appBytes` −147,456을 개선으로 읽을 수도 없다. **`appBytes`는 프로세스 전체 상주량이라
Lynx 밖의 요인이 섞인다** — 이 크기로는 아무것도 가르지 못한다.

### 네이티브를 다시 빌드하지 않은 것의 양면

**둘 다 적는다. 한쪽만 적으면 다음 사람이 반대쪽으로 넘어진다.**

- **통제가 좋다.** 네이티브 호스트가 두 캡처에서 **상수**이므로 위 차가 **전부 JS 번들
  몫으로 격리된다.** 바뀐 변수가 하나다.
- **다만 네이티브를 다시 빌드한 앞 회차들과 절차가 다르다.** 이 기록의 수치를 그 표에
  그대로 이어 붙이면 「같은 절차의 시계열」로 읽힌다 — **그렇지 않다. 이어 붙일 수 없다.**

**이 절차의 회차는 이제 넷이다.** 넷이 됐다는 것은 **같은 절차끼리 이어 붙일 수 있다는
뜻이고, 그 넷으로 추세를 말할 수 있다는 뜻이 아니다** — 조건당 캡처가 여전히 한 번씩이다.

### 이 기록이 판정하지 않는 것

**예산 판정이 아니다.** 이 저장소에 번들·성능 예산이 아직 없다
([ADR-0018 D5](../../adr/0018-lynx-performance-analysis-boundary.md) ·
[`docs/adr/README.md`](../../adr/README.md)의 보류 표에서 「성능 회귀 예산」 행이 아직
열려 있다). **+394 B가 커서 문제인지 작아서 괜찮은지를 가를 근거가 저장소에 없다.**
그래서 이 기록은 **측정과 사유만 적고 판정을 적지 않는다.**

**바뀐 전이의 비용은 이 기록에 없다.** 이 회차가 잰 것은 **그 전이를 한 번도 밟지 않는
구간**이다. 나가기가 활성 스택의 루트로 접힐 때 무엇이 해제되고 무엇이 남는지는 **이
기록이 답하지 않는다** — 밟으려면 깊이 2 화면에 들어가야 하고, 오늘 그 화면에 닿는 길이
0개다.

## Trace 후속 확인

- **render** — `lynxFcp` +2.383 ms. 호스트 바이너리를 고정한 넷째 회차라 조건은 좋지만
  조건당 한 점뿐이고, **앞 회차에서 부호가 갈린 폭 안이라 단계별 분해로 넘어갈 근거가
  아니다.**
- **fluency** — 이 회차의 대상이 아니다. 바뀐 전이를 밟을 수 없어 조작을 못 쟀다.
- **memory** — `after-initial-load` 하나뿐이다. **요소 셋이 0, 런타임이 +176으로 갈린
  것이 이 회차의 실측 산출이다.** 화면 진입·이탈의 보유 증가는 이 기록이 답하지 않는다.
- **NativeModule** — 이 변경이 새로 부르는 네이티브 모듈이 없다.

## 결론과 후속

- **결론: 나가기의 목적지를 활성 스택 루트로 옮긴 변경은 초기 로드 구간에서 번들
  +394 B, 런타임 +176으로 나타나고 요소 트리를 한 노드도 안 바꿨다.** 비교 기준은
  `main`(`7b4844b`)의 287,842 B다.
- **`totalBytes` 증가분과 `mainThreadRuntimeBytes` 증가분이 정확히 같다** — 늘어난
  보유가 **전부 메인 스레드 런타임 한 곳**이고 element·view로는 한 바이트도 안 갔다.
  **네 회차 연속 같은 모양이다.**
- **요소 셋이 네 회차 연속 0이지만 이번은 이유가 다르다.** 앞의 셋은 「도달 불가라서
  안 그려진다」였고, **이번은 화면이 아예 안 늘었다.**
- **`lynxFcp` +2.383 ms와 `appBytes` −147,456은 잡음이다.** 회차는 **01 하나뿐**이고
  앞 회차에 코드가 늘었는데도 부호가 반대로 나온 자리가 둘 있다.
- **네이티브를 다시 빌드하지 않고 번들만 교체했다.** 그래서 위 차가 전부 JS 몫으로
  격리되고, 동시에 **네이티브를 다시 빌드한 앞 회차 표에는 이어 붙일 수 없다.** 이
  절차의 회차는 이제 넷이다.
- **예산 판정을 내리지 않는다.** 가를 근거가 저장소에 없다.

후속 넷:

1. **같은 조건을 여러 번 재는 회차.** 같은 후속이 또 남는다 — 앞 회차가 이미 일곱
   회차째로 셌고, 이번에도 조건당 캡처가 한 번씩이라 `lynxFcp` 차를 가릴 수 없었다.
2. **바뀐 전이를 실제로 밟는 회차.** 나가기가 루트로 접힐 때의 해제·보유는 **깊이 2
   화면에 들어가야 재진다.**
3. **⚠ 그 흐름이 오늘 실기로 못 돈다.** 깊이 2에 서는 화면은 문화 퀴즈 하나뿐이고 그
   화면에 닿는 길이 배정 때문에 0개다 — **되돌리는 조건은 배정이 문화 학습을 가리키는
   날**이고, 갈 곳은 [`docs/adr/README.md`](../../adr/README.md) 보류 표의 「스텝별
   학습형 배정」 행이다. 수동 채널의 판정과 순서는
   [`docs/e2e/culture-quiz.md`](../../e2e/culture-quiz.md)가 진다.
4. **번들·성능 예산.** 「성능 회귀 예산」 행이 열려 있는 한 이런 값은 계속 판정 없이
   쌓인다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다 — **워크트리 경로를 본문에 적지 않았다.**
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] `미측정` 기록을 baseline이나 성능 통과로 표현하지 않았다 — 이 기록은 측정이다.
- **예산 판정이 아니다.** 확인되지 않은 자리(측정 일시의 분, 잘린 sha256 뒷부분)를
  채우지 않았다.
