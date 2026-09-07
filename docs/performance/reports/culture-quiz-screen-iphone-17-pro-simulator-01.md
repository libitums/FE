# 문화 퀴즈 화면 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 회차 시뮬레이터 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-07T13:2x+09:00
- 상태: 측정 — 기준선과 이번을 각각 `performance:capture`로 수집했다.
- 기능 PR: LIB-244 — 문화 퀴즈 화면과 문화 학습의 액션 행
- 대상 commit: `2894914`
- 비교 기준 commit: `6c27a34` (`main`)
- 기기: iPhone 17 Pro 시뮬레이터 (`3B5DADAD-597A-406C-AC83-26B3D3FADECB`)
- OS: iOS 26.5 (23F77), 호스트 macOS 26.5.1
- Lynx SDK: 4.0.1
- 빌드: **네이티브 재빌드 없음.** 9월 5일 Release 빌드의 `Host.app`에 Lynx 번들만 갈아
  끼웠다. 번들 287,842 bytes
- 실행 회차: 01

**측정 일시의 분 자리(`2x`)는 캡처 기록에 남은 그대로다.** 두 캡처가 13시 20분대에
연달아 떴다는 것까지가 확인된 범위이고, **일의 자리는 확인되지 않아 비워 둔다.** 앞
회차 둘이 같은 자리를 같은 방식으로 비워 뒀다
([학습형 결선 — 01](learning-form-wiring-iphone-17-pro-simulator-01.md) ·
[문화 학습 화면 — 01](culture-screen-iphone-17-pro-simulator-01.md)).

**`paintEnd`를 시각으로 환산하지 않는다.** 저장소가 `paintEnd`에 대해 적어 둔 것은
「공식 시작점이 없는 끝점」이라는 것뿐이고
([ADR-0018](../../adr/0018-lynx-performance-analysis-boundary.md) ·
[`docs/performance-analysis.md`](../../performance-analysis.md)), **그 값의 원점이 Unix
epoch라는 진술이 저장소에 없다.** 아래에서는 두 값이 **서로 다르다**는 사실만 쓰고
벽시계 시각으로 옮기지 않는다.

## ⚠ 절차가 앞 회차들과 다르다 — 네이티브를 다시 빌드하지 않았다

**9월 5일 Release 빌드의 `Host.app`을 그대로 두고 그 안의 Lynx 번들만 교체해서** 두 번
쟀다. 이 차이를 두 방향으로 읽어야 한다.

- **통제가 좋다.** 네이티브 호스트가 두 캡처에서 상수이므로 아래 차가 **전부 JS 번들
  몫이다.** 바뀐 변수가 하나로 격리된다.
- **다만 네이티브를 다시 빌드한 앞 회차들과 절차가 다르다.** 이 기록의 수치를 그 표에
  그대로 이어 붙이면 「같은 절차의 시계열」로 읽힌다 — **그렇지 않다.**

**이 절차의 회차가 이제 셋이다.**
[학습형 결선 — 01](learning-form-wiring-iphone-17-pro-simulator-01.md)이 첫째,
[문화 학습 화면 — 01](culture-screen-iphone-17-pro-simulator-01.md)이 둘째,
이 기록이 셋째다. **셋이 됐다는 것은 같은 절차끼리 이어 붙일 수 있다는 뜻이고, 그
셋으로 추세를 말할 수 있다는 뜻이 아니다** — 조건당 캡처가 여전히 한 번씩이다.

**번들 동일성 확인**: `.app` 안과 워크트리 `dist/`가 `sha256 c1258f8a0f912721…`로 같다.

**두 캡처 모두 앱을 지우고 다시 깔았다.** `paintEnd`가 서로 다르므로 **둘 다 새
캡처다** — 앞 회차에 값이 통째로 같아 폐기한 적이 있어 이번에도 확인했다
([학습형 매핑 — 01](learning-form-mapping-iphone-17-pro-simulator-01.md)).

## 시나리오

- 전제: 앱을 **지우고 다시 깐 뒤** `--performance-capture`로 실행한다. 글자 크기 기본.
- 단계: 홈 탭이 뜰 때까지 둔다. 조작하지 않는다.
- 관찰 구간: `loadBundle` 시작부터 첫 paint까지와 직후 메모리 snapshot.
- 두 조건(`main` 기준선 · 이번 번들)에서 위 절차를 각각 한 번씩 돈다.

**문화 퀴즈 화면에 들어가지 않는다. 들어갈 수 없다.** 이 화면에 닿는 길은 **문화
학습의 액션 행 하나**뿐인데(계약 D6 · [`docs/e2e/culture-quiz.md`](../../e2e/culture-quiz.md)),
그 문화 학습이 배정표(`learningFormByStep`)의 다섯 값이 전부 `"listening"`이라 오늘
안 열린다. **문화 학습이 안 열리면 문화 퀴즈도 안 열린다.** 이 회차가 재는 것은
**홈 탭까지의 초기 로드**이고, 문화 퀴즈가 모듈 그래프에 들어온 것이 그 구간에 얼마를
더했는가다.

## 분석 결과

### 기준선 — `main` (`6c27a34`)

```text
Rendering
  FCP loadBundle: lynxFcp 86.719 ms, fcp 87.066 ms
  LoadBundle loadBundle: loadBundle 23.037 ms, parse 1.587 ms,
    loadBackground 5.235 ms, pipeline 86.727 ms, mtsRender 2.191 ms,
    resolve 1.222 ms, layout 11.212 ms,
    paintingUiOperationExecute 5.662 ms, layoutUiOperationExecute 0.592 ms;
    paintEnd 1788762443591.059 ms

Memory
  after-initial-load [complete]: totalBytes 590736 bytes,
    elementBytes 31200 bytes, viewBytes 21376 bytes,
    mainThreadRuntimeBytes 538160 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 37374232 bytes, elementNodeCount 30 nodes;
    status completed; instances 1/1; collection 0 ms
```

### 이번 — `LIB-244` (`2894914`)

```text
Rendering
  FCP loadBundle: lynxFcp 89.935 ms, fcp 90.241 ms
  LoadBundle loadBundle: loadBundle 21.238 ms, parse 1.691 ms,
    loadBackground 5.251 ms, pipeline 89.945 ms, mtsRender 2.29 ms,
    resolve 1.359 ms, layout 9.778 ms,
    paintingUiOperationExecute 5.071 ms, layoutUiOperationExecute 0.524 ms;
    paintEnd 1788762461658.613 ms

Memory
  after-initial-load [complete]: totalBytes 608736 bytes,
    elementBytes 31200 bytes, viewBytes 21376 bytes,
    mainThreadRuntimeBytes 556160 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 37374256 bytes, elementNodeCount 30 nodes;
    status completed; instances 1/1; collection 1 ms
```

## 비교

### 기준선이 어느 트리인가

| 번들 크기 | 무엇인가 |
|---|---|
| **268,207 B** | **`main` (`6c27a34`). ★ 이 회차의 비교 기준** |
| 287,842 B | LIB-244 워크트리 (`2894914`) |

**기준선 268,207 B는 앞 회차가 「LIB-238 워크트리」로 적어 둔 값과 같은 수다.** 그
회차가 병합된 뒤의 `main`에서 이 회차의 기준선을 다시 잰 것과 어긋나지 않는다.
**같은 수라는 것이 확인된 사실이고**, 그 이상은 이 기록이 재지 않았다.

### 차

- 기준 기록: 이 회차 안의 `main` (`6c27a34`) 캡처. 같은 시뮬레이터·OS·SDK·호스트
  바이너리에서 연달아 떴다.

| | 기준 (`main`) | 이번 | 차 |
|---|---|---|---|
| 번들 | 268,207 B | 287,842 B | **+19,635 B** |
| `totalBytes` | 590,736 | 608,736 | **+18,000** |
| `mainThreadRuntimeBytes` | 538,160 | 556,160 | **+18,000** |
| `elementBytes` | 31,200 | 31,200 | **0** |
| `viewBytes` | 21,376 | 21,376 | **0** |
| `elementNodeCount` | 30 | 30 | **0** |
| `lynxFcp` | 86.719 ms | 89.935 ms | +3.216 ms |
| `appBytes` | 37,374,232 | 37,374,256 | +24 |

## 해석

### 늘어난 보유가 전부 런타임 한 곳이다

**`totalBytes` 증가분과 `mainThreadRuntimeBytes` 증가분이 정확히 같은 +18,000이다.**
**element·view 쪽으로는 한 바이트도 안 갔다.**

**앞 회차 둘에서도 이 둘이 같은 값으로 움직였다** — 문화 학습 회차가 둘 다 +8,112,
학습형 결선 회차가 둘 다 +47,856이다
([문화 학습 화면 — 01](culture-screen-iphone-17-pro-simulator-01.md) ·
[학습형 결선 — 01](learning-form-wiring-iphone-17-pro-simulator-01.md)). **세 회차
연속으로 늘어난 보유가 메인 스레드 런타임 한 곳에 전부 앉는다.**

「모듈 그래프에 코드가 들어왔고, 그 코드가 아직 아무 요소도 만들지 않았다」와 자릿수·
방향이 맞는다 — 번들 **+19,635 B**에 런타임 **+18,000**이다.

### 요소 셋이 세 회차 연속 0이다 — 「도달 불가라서 안 그려진다」이다

**`elementBytes` · `viewBytes` · `elementNodeCount` 셋이 기준과 정확히 같다.** 학습형
결선 회차·문화 학습 회차에 이어 **세 회차 연속 0이다.**

**이 0을 「아직 안 그려졌다」로 읽으면 안 된다. 「도달 불가라서 안 그려진다」이다.**

- 문화 퀴즈에 들어오는 전이는 **문화 학습의 액션 행 하나**뿐이다(계약 D6). 스텝에
  직접 배정되지 않는다.
- 그 문화 학습이 `learningFormByStep`의 **다섯 스텝 전부 `"listening"`** 이라 오늘 안
  열린다([`docs/e2e/culture.md`](../../e2e/culture.md)).
- 그래서 **문화 퀴즈에 닿는 경로가 오늘 0개다.** 화면도 액션 행도 서 있고 **막힌 것은
  코드가 아니라 구성이다**([`docs/e2e/culture-quiz.md`](../../e2e/culture-quiz.md) ·
  [`docs/screens.md`](../../screens.md)).

그 도달 불가가 의도된 상태다. 요소 트리가 한 노드도 안 바뀐 것이 실측으로 확인된다.

### `lynxFcp` +3.216 ms — 성능 저하로 단정하지 않는다

**회차가 01 하나뿐이다.** 조건당 캡처 한 번씩이고 같은 조건을 반복해 재지 않았다.
**단일 회차라 이 차가 신호인지 잡음인지 판정할 수 없다** — 그것이 이 기록의 한계다.

**직전 두 회차가 그 이유를 그대로 보여 준다.**

- 학습형 결선 회차: 코드가 늘고 `lynxFcp`가 **+2.542 ms**.
- 문화 학습 회차: 코드가 늘었는데 `lynxFcp`가 **−3.813 ms**. **부호가 코드 증가와
  반대로 나왔다.**

**같은 방향으로 코드가 는 세 회차에서 부호가 갈렸다.** 그러면 ±수 ms는 이 절차의 산포
안이고, **이번 +3.216 ms도 그 안이다.**

같은 캡처 안에서 **`loadBundle`이 23.037 → 21.238 ms로, `layout`이 11.212 → 9.778 ms로
줄었다.** `lynxFcp`가 는 회차에서 그 하위 구간 둘이 함께 줄었다는 것도 **한 점 안의
값이라 해석하지 않는다** — 다만 이 회차의 잡음 폭이 이 자릿수라는 것은 보여 준다.

`appBytes` +24는 프로세스 전체 상주량의 차이고, **이 크기로는 아무것도 가르지 못한다.**

### 이 기록이 판정하지 않는 것

**예산 판정이 아니다.** 이 저장소에 번들·성능 예산이 아직 없다
([ADR-0018 D5](../../adr/0018-lynx-performance-analysis-boundary.md) ·
[`docs/adr/README.md`](../../adr/README.md)의 보류 표에서 「성능 회귀 예산」 행이 아직
열려 있다). **+19,635 B가 커서 문제인지 작아서 괜찮은지를 가를 근거가 저장소에 없다.**
그래서 이 기록은 **측정과 사유만 적고 판정을 적지 않는다.**

**이 수치가 「문화 퀴즈의 비용」도 아니다.** `culture-quiz.ts`의 스텝→문항 표는 **다섯
키가 전부 빈 배열이다.** 문항 컨텐츠는 보류 표의 「문화 서사 컨텐츠의 출처」 행에 딸려
있고([`docs/adr/README.md`](../../adr/README.md)), **진짜 문항이 오는 날 이 바이트
수는 다시 움직인다.** 오늘의 +19,635 B는 **문항 0개짜리 트리에서 잰 값이다.**

**화면 진입 비용은 이 기록에 없고, 코드로는 열 수 없다.** 진입하려면 배정표의 값이
`culture`를 가리켜야 하고 그것은 **컨텐츠 보류**다(보류 표의 「스텝별 학습형 배정」
행). **코드를 고쳐 여는 것은 이 기록의 자리가 아니다.**

**선택·판정의 상호작용 비용도 못 쟀다.** 화면에 들어가지 못해 조작 구간이 없다.

## Trace 후속 확인

- **render** — `lynxFcp` +3.216 ms. 호스트 바이너리를 고정한 셋째 회차라 조건은 좋지만
  조건당 한 점뿐이고, **앞 두 회차에서 부호가 갈린 폭 안이라 단계별 분해로 넘어갈
  근거가 아니다.**
- **fluency** — 이 회차의 대상이 아니다. 문화 퀴즈에 도달할 수 없어 조작을 못 쟀다.
- **memory** — `after-initial-load` 하나뿐이다. **요소 셋이 0, 런타임이 +18,000으로
  갈린 것이 이 회차의 실측 산출이다.** 화면 진입·이탈의 보유 증가는 이 기록이 답하지
  않는다.
- **NativeModule** — 이 변경이 새로 부르는 네이티브 모듈이 없다.

## 결론과 후속

- **번들 +19,635 B, 런타임 +18,000.** 비교 기준은 `main`(`6c27a34`)의 268,207 B다.
- **`totalBytes` 증가분과 `mainThreadRuntimeBytes` 증가분이 정확히 같다** — 늘어난
  보유가 **전부 메인 스레드 런타임 한 곳**이고 element·view로는 한 바이트도 안 갔다.
  **세 회차 연속 같은 모양이다.**
- **요소 셋(`elementBytes` · `viewBytes` · `elementNodeCount`)이 세 회차 연속 0이다.**
  문화 퀴즈가 모듈 그래프에는 들어왔고, **들어오는 전이가 문화 학습의 액션 행 하나뿐인데
  그 문화 학습이 배정 때문에 안 열려 도달 불가라서** 한 노드도 안 그려진다.
- **`lynxFcp` +3.216 ms를 성능 저하로 단정하지 않는다.** 회차는 **01 하나뿐**이고,
  직전 두 회차에서 코드가 늘었는데도 부호가 갈렸다.
- **새 서드파티 0건.** `package.json`·`pnpm-lock.yaml` diff가 0줄이다.
- **네이티브를 다시 빌드하지 않고 번들만 교체했다.** 그래서 위 차가 전부 JS 몫으로
  격리되고, 동시에 **네이티브를 다시 빌드한 앞 회차 표에는 이어 붙일 수 없다.** 이
  절차의 회차는 이제 셋이다.
- **예산 판정을 내리지 않는다.** 가를 근거가 저장소에 없고, **문항 표 다섯 키가 전부 빈
  배열이라 진짜 값이 오는 날 이 바이트 수가 다시 움직인다.**

후속 넷:

1. **같은 조건을 여러 번 재는 회차.** 일곱 회차째 같은 후속이 남는다 — 이번에 `lynxFcp`
   부호가 앞 회차와 또 갈린 것이 그 필요를 다시 보여 준다.
2. **문항 값이 오는 날 다시 잰다.** 표 다섯 값이 채워지면 번들도 런타임도 움직이므로
   **그때의 수치가 이 화면의 값이고 오늘 것은 그 전 단계다.**
3. **배정 값이 오는 날 문화 학습을 지나 문화 퀴즈에 들어가서 잰다.** 코드가 아니라
   컨텐츠가 여는 측정이다.
4. **번들·성능 예산.** 「성능 회귀 예산」 행이 열려 있는 한 +19 kB류의 값은 계속 판정
   없이 쌓인다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] `미측정` 기록을 baseline이나 성능 통과로 표현하지 않았다 — 이 기록은 측정이다.
- [x] 문항·보기 문자열을 옮겨 적지 않았다 — 빈 표를 컨텐츠로 읽히게 하지 않는다.
- **예산 판정이 아니다.**
- **수용 기준을 닫지 않는다.** 「성능 회귀 예산」 행이 열려 있는 한 이 수치는 판정으로
  올라가지 않는다.
