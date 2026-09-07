# 판정 낱말에 testid가 붙는다 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 회차 시뮬레이터 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-08T01:0x+09:00
- 상태: 측정 — 기준선과 이번을 각각 한 번씩 수집했다.
- 기능 PR: 없음 — 아직 만들지 않았다. 브랜치 `LIB-251/verdict-two-channels`에만 있다.
- 대상 commit: `4deae1da81171b77078501a69cee8efb5b78f6ca`
- 비교 기준 commit: `5ae6d8ef33f423f407f6062961d02667e9ec768c` (`main`)
- 기기: iPhone 17 Pro 시뮬레이터 (`3B5DADAD-597A-406C-AC83-26B3D3FADECB`)
- OS: iOS 26.5 (23F77), 호스트 macOS 26.5.1
- Lynx SDK: 4.0.1
- 빌드: **네이티브 재빌드 없음.** Release `Host.app`에 Lynx 번들만 갈아 끼웠다. 번들
  289,051 bytes
- 실행 회차: 01

**측정 일시의 분 자리(`0x`)는 캡처 기록에 남은 그대로다.** 두 캡처가 01시 0분대에
연달아 떴다는 것까지가 확인된 범위이고, **일의 자리는 확인되지 않아 비워 둔다.**
**정밀도가 거기까지다.** 앞 회차들이 같은 자리를 같은 방식으로 비워 뒀다
([문항 종료 전이 발화 — 01](complete-transition-announce-iphone-17-pro-simulator-01.md) ·
[제목 특성이 붙는다 — 01](heading-trait-axis-iphone-17-pro-simulator-01.md) ·
[나가기가 맵에 닿는다 — 01](exit-reaches-map-iphone-17-pro-simulator-01.md) ·
[학습형 결선 — 01](learning-form-wiring-iphone-17-pro-simulator-01.md) ·
[문화 학습 화면 — 01](culture-screen-iphone-17-pro-simulator-01.md) ·
[문화 퀴즈 화면 — 01](culture-quiz-screen-iphone-17-pro-simulator-01.md)).

**기기 모델명은 UDID로 확인했다.** 위 UDID를 이름으로 부르는 앞 회차 기록들이 이
저장소에 있어 그 이름을 그대로 쓴다 — 새로 지어내지 않았다.

**`paintEnd`를 시각으로 환산하지 않는다.** 근거는 앞 회차가 적은 것과 같고 여기 다시
적지 않는다([문화 퀴즈 화면 — 01](culture-quiz-screen-iphone-17-pro-simulator-01.md)).
아래에서는 두 값이 **서로 다르다**는 사실만 쓴다.

## 절차 — 네이티브를 다시 빌드하지 않았다

Release `Host.app`을 그대로 두고 **그 안의 Lynx 번들만 교체해서** 두 번 쟀다. 이 절차를
어떻게 읽어야 하는지는 아래 [해석](#네이티브를-다시-빌드하지-않은-것의-양면)에 적는다.

**번들 동일성 확인**: `.app` 안과 워크트리 `dist/`가 `sha256 9dfe1921eb547165…`로 같다.
**해시는 캡처 기록에 남은 자리까지만 옮겨 적었다** — 뒤가 잘려 있고 채우지 않는다.

**`paintEnd`가 서로 다르므로 둘 다 새 캡처다** — 앞 회차에 값이 통째로 같아 폐기한 적이
있어 이번에도 확인했다
([학습형 매핑 — 01](learning-form-mapping-iphone-17-pro-simulator-01.md)).

## ⚠ `main`의 `dist/`가 또 낡아 있어 다시 빌드했다

**기준선을 재기 전에 `main`의 `dist/`를 다시 빌드했다.** 체크아웃에 남아 있던 번들이
`5ae6d8e`의 산출이 아니어서, 그대로 쟀으면 기준선이 **다른 commit의 값**이 될 뻔했다.
다시 빌드해 `289,032`를 확인한 뒤 기준선을 수집했다.

**이 세션에서 세 번째다.** 같은 사고가
[문항 종료 전이 발화 — 01](complete-transition-announce-iphone-17-pro-simulator-01.md)에
한 번 기록돼 있고(그 회차는 기준선 첫 캡처를 통째로 버렸다), 그 뒤로도 반복됐다.
**`dist/`는 commit이 아니라 마지막 빌드를 가리킨다** — 브랜치를 옮겨도 따라오지 않는다.
**기준선을 잴 때마다 다시 빌드하고 번들 크기를 눈으로 확인하는 것이 이 절차의 일부다.**
그렇게 하지 않으면 **두 캡처의 차가 이번 변경의 몫이 아니게 되고, 그런데도 숫자는
그럴듯하게 나온다.**

## 대상 변경

`apps/mobile/src/screens/assessment/AssessmentScreen.tsx`의 판정 낱말
(`.assessment-screen-verdict-label`) `<text>`에 **`data-testid` 한 속성**이 붙었다.
좌표가 아니라 클래스명으로 가리킨다.

- **CSS 델타 0건.** `assessment-screen.css`는 이 변경에서 한 줄도 안 바뀌었다.
- **요소 추가·삭제·이동 0건.** 트리의 모양이 그대로다.
- **접근성 속성 추가 0건.** `accessibility-*`를 이 블록에 더하지 않았다.
- **낭독되는 문자열 델타 0건.** `assessment.ts`의 `assessmentVerdictLabel`도
  `assessmentAnnouncement`도 안 바뀌었다.
- 근거는 [ADR-0016 D11-1](../../adr/0016-assistive-technology-semantics.md)이 닫은
  방향 결정(발화와 순회가 다른 문자열을 내는 것을 **그대로 둔다**)이다. 그 결정이
  제품 코드에 남긴 몫이 **이 속성 하나**다.

**이 회차가 재는 구간은 홈 탭까지의 초기 로드이고, 그 구간에서 평가 화면은 서지
않는다.** 그래서 이 기록이 답하는 물음은 **「안 그려지는 화면의 잎 노드에 붙은
테스트 전용 속성 하나가 초기 로드에 얼마를 더했는가」**다.

## 시나리오

- 전제: 앱을 **지우고 다시 깐 뒤** `--performance-capture`로 실행한다. 글자 크기 기본.
- 단계: 홈 탭이 뜰 때까지 둔다. 조작하지 않는다.
- 관찰 구간: `loadBundle` 시작부터 첫 paint까지와 직후 메모리 snapshot.
- 두 조건(`main` 기준선 · 이번 번들)에서 위 절차를 각각 한 번씩 돈다.

## 분석 결과

### 기준선 — `main` (`5ae6d8e`, 번들 289,032 B)

```text
Rendering
  FCP loadBundle: lynxFcp 89.247 ms, fcp 89.584 ms
  LoadBundle loadBundle: loadBundle 25.881 ms, parse 1.545 ms, loadBackground 5.374 ms,
    pipeline 89.254 ms, mtsRender 2.326 ms, resolve 1.504 ms, layout 13.453 ms,
    paintingUiOperationExecute 5.887 ms, layoutUiOperationExecute 0.596 ms;
    paintEnd 1788803269590.998 ms

Memory
  after-initial-load [complete]: totalBytes 610000 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 557424 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 37685552 bytes,
    elementNodeCount 30 nodes; status completed; instances 1/1; collection 0 ms
```

### 이번 — `LIB-251` (`4deae1d`, 번들 289,051 B)

```text
Rendering
  FCP loadBundle: lynxFcp 90.482 ms, fcp 90.869 ms
  LoadBundle loadBundle: loadBundle 23.012 ms, parse 1.784 ms, loadBackground 5.974 ms,
    pipeline 90.489 ms, mtsRender 2.428 ms, resolve 1.648 ms, layout 10.153 ms,
    paintingUiOperationExecute 5.744 ms, layoutUiOperationExecute 0.635 ms;
    paintEnd 1788803289914.437 ms

Memory
  after-initial-load [complete]: totalBytes 610000 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 557424 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 37488968 bytes,
    elementNodeCount 30 nodes; status completed; instances 1/1; collection 1 ms
```

## 비교

- 기준 기록: 이 회차 안의 `main` (`5ae6d8e`) 캡처. 같은 시뮬레이터·OS·SDK·호스트
  바이너리에서 연달아 떴다. **재빌드한 `dist/`로 쟀다**(위 ⚠ 절).

| | 기준(`main`) | 이번 | 차 |
|---|---|---|---|
| 번들 | 289,032 B | 289,051 B | **+19 B** |
| `totalBytes` | 610,000 | 610,000 | **0** |
| `mainThreadRuntimeBytes` | 557,424 | 557,424 | **0** |
| `elementBytes` · `viewBytes` · `elementNodeCount` | | | **0** |
| `lynxFcp` | 89.247 ms | 90.482 ms | +1.235 ms |
| `appBytes` | 37,685,552 | 37,488,968 | −196,584 |

## 해석

### ⭐ `LIB-243`과 **바이트까지 같은 형태**다 — 그런데 속성의 성격이 다르다

**두 회차의 대비가 이 기록의 값이다.**

| | [제목 특성이 붙는다 — 01](heading-trait-axis-iphone-17-pro-simulator-01.md) (`LIB-243`) | **이번** (`LIB-251`) |
|---|---|---|
| 붙은 것 | `accessibility-traits="header"` 한 속성 | `data-testid` 한 속성 |
| 번들 차 | **+19 B** | **+19 B** |
| `totalBytes` · `mainThreadRuntimeBytes` 차 | **0 · 0** | **0 · 0** |
| 요소 셋 | **0** | **0** |

**숫자가 같은 자리에서 같은 결론이 한 번 더 선다** — **속성 하나는 런타임 보유를 만들지
않는다.** 번들이 자란 만큼 런타임도 자란 회차들(+18,000 · +8,112 · +47,856 · +176 ·
+1,088, **각 회차 기록에서 확인**)과 갈리는 자리가 여기다. 그 회차들은 **모듈 그래프에
코드가 들어왔고 들어온 것이 남았다.** 속성 하나는 그렇지 않다.

**⚠ 그런데 「같은 종류의 변경이 또 왔다」로 읽으면 안 된다. 성격이 다르다.**

| | `LIB-243`의 `accessibility-traits` | **이번의 `data-testid`** |
|---|---|---|
| 어디까지 도달하나 | **접근성 층까지 도달한다.** 실기에서 낭독이 갈린다 | **테스트 전용이다.** 낭독에 도달하지 않는다 |
| 사용자 관찰 가능 동작 | **바뀐다** — 그 회차가 연 물음이 그것이었다 | **안 바뀐다** |
| 수동 채널이 봐야 하나 | **본다** ([`docs/e2e/culture.md`](../../e2e/culture.md)) | **볼 것이 없다.** 이미 본 것이 그대로다 |

**이번 회차가 소스로 확인한 것**: `data-*` 속성은 ReactLynx의 `spread.js`가
`__SetDataset`으로 몰고, 네이티브 쪽 `LynxUI.m`의 `setDataset`은 **대입 한 줄**이라
`isAccessibilityElement`에도 `accessibilityLabel`에도 닿지 않는다. **그래서 이 속성은
접근성 층에 도달할 경로 자체가 없다.**

**크기가 같다고 같은 종류로 읽히면 안 된다** — 그것이 이 기록이 남기는 사실이다.
**메모리는 두 속성을 구별하지 못한다.** 구별은 **어느 층에 도달하느냐**가 하고, 그것은
이 기록이 재는 축이 아니다.

### `lynxFcp` +1.235 ms는 잡음이다

**회귀로 읽지 않는다.**

**회차가 01 하나뿐이다.** 조건당 캡처 한 번씩이고 같은 조건을 반복해 재지 않았다.
**단일 회차라 이 차가 신호인지 잡음인지 판정할 수 없다** — 그것이 이 기록의 한계다.

**같은 캡처 안에서 부호가 갈린다.** `lynxFcp`와 `pipeline`은 늘었는데 `loadBundle`이
25.881 → 23.012 ms로, `layout`이 13.453 → 10.153 ms로 **줄었다.** **한 캡처 안에서
방향이 엇갈리는 폭**이라 어느 쪽도 신호로 읽을 수 없다.

**부호가 코드 증가와 반대로 나온 자리가 앞 회차들에 이미 있다.** `LIB-243`의 `lynxFcp`
−2.084 ms, `LIB-247`의 −5.642 ms다. **코드가 늘었는데 값이 줄어든 적이 있으므로**,
그 역인 이번 +1.235 ms도 같은 폭의 흔들림으로 본다. **`data-testid` 한 속성이 파이프
전체를 1 ms 늦춘다는 기전을 이 기록이 제시하지 못한다.**

**`appBytes` −196,584도 마찬가지다.** **프로세스 전체 상주량이라 Lynx 밖의 요인이
섞인다** — 런타임 보유가 0으로 안 움직인 회차에서 이 값만 20만 바이트 가까이 흔들린
것이 **그 자체로 이 지표의 잡음 폭을 보여준다.**

### 네이티브를 다시 빌드하지 않은 것의 양면

**둘 다 적는다. 한쪽만 적으면 다음 사람이 반대쪽으로 넘어진다.**

- **통제가 좋다.** 네이티브 호스트가 두 캡처에서 **상수**이므로 위 차가 **전부 JS 번들
  몫으로 격리된다.** 바뀐 변수가 하나다.
- **다만 네이티브를 다시 빌드한 회차들과 절차가 다르다.** 이 기록의 수치를 그 표에
  그대로 이어 붙이면 「같은 절차의 시계열」로 읽힌다 — **그렇지 않다. 이어 붙일 수 없다.**

**이 절차의 회차는 이제 일곱이다.** 일곱이 됐다는 것은 **같은 절차끼리 이어 붙일 수
있다는 뜻이고, 그 일곱으로 추세를 말할 수 있다는 뜻이 아니다** — 조건당 캡처가 여전히
한 번씩이다.

### 이 기록이 판정하지 않는 것

**예산 판정이 아니다.** 이 저장소에 번들·성능 예산이 아직 없다
([ADR-0018 D5](../../adr/0018-lynx-performance-analysis-boundary.md) ·
[`docs/adr/README.md`](../../adr/README.md)의 보류 표에서 「성능 회귀 예산」 행이 아직
열려 있다). **+19 B가 커서 문제인지 작아서 괜찮은지를 가를 근거가 저장소에 없다.**
그래서 이 기록은 **측정과 대비만 적고 판정을 적지 않는다.**

**평가 화면이 실제로 그려질 때의 보유는 이 기록에 없다.** 이 회차가 잰 것은 **그 화면이
서지 않는 구간**이다.

**두 채널이 무엇으로 들리는지도 이 기록에 없다.** 발화(`평가 결과, 통과`)와
순회(`통과`)가 갈리는 사실은 **성능 기록이 답할 물음이 아니다** — 수동 채널
([`docs/e2e/assessment.md`](../../e2e/assessment.md))가 지고, 그 문자열은 이번에 한 글자도
안 바뀌었다.

## Trace 후속 확인

- **render** — `lynxFcp` +1.235 ms. 호스트 바이너리를 고정한 일곱째 회차라 조건은 좋지만
  조건당 한 점뿐이고, **같은 캡처 안에서 `loadBundle`·`layout`과 부호가 갈려 단계별
  분해로 넘어갈 근거가 아니다.**
- **fluency** — 이 회차의 대상이 아니다. 조작 구간 없이 초기 로드만 쟀다.
- **memory** — `after-initial-load` 하나뿐이다. **요소 셋과 런타임 보유가 함께 0으로
  나왔고, 그 형태가 `LIB-243`과 바이트까지 같다.** 평가 화면에 실제로 들어갔을 때의
  보유는 이 기록이 답하지 않는다.
- **NativeModule** — 이 변경이 새로 부르는 네이티브 모듈이 없다.

## 결론과 후속

- **결론: 판정 낱말 노드(`.assessment-screen-verdict-label`)에 `data-testid` 한 속성을
  붙인 변경은 초기 로드 구간에서
  번들 +19 B로만 나타나고 런타임 보유와 요소 트리를 한 바이트·한 노드도 안 바꿨다.**
  비교 기준은 `main`(`5ae6d8e`)의 289,032 B다.
- **⚠ `LIB-243`과 바이트까지 같은 형태인데 속성의 성격이 다르다.** 그쪽은
  `accessibility-traits`라 **접근성 층에 도달**하고, 이번은 `data-testid`라 **테스트
  전용**이다. **메모리 수치가 같다고 같은 종류의 변경으로 읽으면 안 된다.**
- **`lynxFcp` +1.235 ms는 잡음이다.** 회차는 **01 하나뿐**이고, 같은 캡처 안에서
  `loadBundle` 25.881 → 23.012 ms와 `layout` 13.453 → 10.153 ms가 반대 방향으로 움직였다.
  **회귀가 아니다.**
- **⚠ `main`의 `dist/`가 낡아 다시 빌드하고 기준선을 쟀다. 이 세션에서 세 번째다.**
  재빌드 없이 쟀으면 기준선이 다른 commit의 번들이 됐다.
- **네이티브를 다시 빌드하지 않고 번들만 교체했다.** 그래서 위 차가 전부 JS 몫으로
  격리되고, 동시에 **네이티브를 다시 빌드한 회차 표에는 이어 붙일 수 없다.** 이 절차의
  회차는 이제 일곱이다.
- **예산 판정을 내리지 않는다.** 가를 근거가 저장소에 없다.

후속 셋:

1. **같은 조건을 여러 번 재는 회차.** 같은 후속이 또 남는다 — 조건당 캡처가 한 번씩이라
   `lynxFcp` 차도 `appBytes` 흔들림도 가릴 수 없었다.
2. **`dist/` 최신성을 절차가 스스로 확인하는 방법.** 기준선을 재기 전 재빌드를 사람이
   기억하는 한 이 사고는 반복된다 — 이 세션에서만 세 번 났다.
3. **번들·성능 예산.** [`docs/adr/README.md`](../../adr/README.md) 보류 표의 「성능 회귀
   예산」 행이 열려 있는 한 이런 값은 계속 판정 없이 쌓인다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다 — **워크트리 경로를 본문에 적지 않았다.**
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] `미측정` 기록을 baseline이나 성능 통과로 표현하지 않았다 — 이 기록은 측정이다.
- **예산 판정이 아니다.** 확인되지 않은 자리(측정 일시의 분, 잘린 sha256 뒷부분)를
  채우지 않았다.
