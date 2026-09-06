# 학습형 결선 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 회차 시뮬레이터 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-07T03:0x+09:00
- 상태: 측정 — 기준선과 이번을 각각 `performance:capture`로 수집했다.
- 기능 PR: LIB-239 — `onStartStep`이 배정표를 거쳐 학습 화면을 연다
- 대상 commit: `eb0ebef860c1eccb7150e846db21e46e4449fffc`
- 비교 기준 commit: `8c03257dd42d43efd5d2c3c2cc6cc08526a0cf97` (`main`)
- 기기: iPhone 17 Pro 시뮬레이터 (`3B5DADAD-597A-406C-AC83-26B3D3FADECB`)
- OS: iOS 26.5 (23F77), 호스트 macOS 26.5.1
- Lynx SDK: 4.0.1
- 빌드: **네이티브 재빌드 없음.** 9월 5일 Release 빌드의 `Host.app`에 Lynx 번들만 갈아
  끼웠다. 번들 258,024 bytes
- 실행 회차: 01

**측정 일시의 분 자리(`0x`)는 캡처 기록에 남은 그대로다.** 두 캡처가 03시 0분대에
연달아 떴다는 것까지가 확인된 범위이고, 분 단위를 임의로 채우지 않는다.

## ⚠ 절차가 앞 회차들과 다르다 — 네이티브를 다시 빌드하지 않았다

**앞 회차들은 Release로 다시 빌드했다. 이 회차는 아니다.** 9월 5일 Release 빌드의
`Host.app`을 그대로 두고 **그 안의 Lynx 번들만 교체해서** 두 번 쟀다.

이 차이를 두 방향으로 읽어야 한다.

- **이번엔 통제가 오히려 좋다.** 네이티브 호스트가 두 캡처에서 상수이므로 아래 차가
  **전부 JS 번들 몫이다.** 바뀐 변수가 하나로 격리된다.
- **다만 앞 회차들과 절차가 다르다.** 이 기록의 수치를 앞 회차 표에 그대로 이어
  붙이면 「같은 절차의 시계열」로 읽힌다 — **그렇지 않다.**

**번들 동일성 확인**: `.app` 안과 워크트리 `dist/`가 `sha256 51d4bfe6eea4858b…`로 같다.

**두 캡처 모두 앱을 지우고 다시 깔았다.** `paintEnd`가 서로 다르므로 **둘 다 새
캡처다** — 앞 회차에 값이 통째로 같아 폐기한 적이 있어 이번에도 확인했다
([학습형 매핑 — 01](learning-form-mapping-iphone-17-pro-simulator-01.md)).

## 시나리오

- 전제: 앱을 **지우고 다시 깐 뒤** `--performance-capture`로 실행한다. 글자 크기 기본.
- 단계: 홈 탭이 뜰 때까지 둔다. 조작하지 않는다.
- 관찰 구간: `loadBundle` 시작부터 첫 paint까지와 직후 메모리 snapshot.
- 두 조건(`main` 기준선 · 이번 번들)에서 위 절차를 각각 한 번씩 돈다.

**두 학습 화면에 들어가지 않는다.** 이 회차가 재는 것은 **홈 탭까지의 초기 로드**이고,
결선이 그 구간에 얼마를 더했는가다. 화면 진입 비용은 이 기록이 답하지 않는다.

## 분석 결과

### 기준선 — `main` (`8c03257`)

```text
Rendering
  FCP loadBundle: lynxFcp 85.329 ms, fcp 85.721 ms
  LoadBundle loadBundle: loadBundle 22.04 ms, parse 1.595 ms,
    loadBackground 5.692 ms, pipeline 85.338 ms, mtsRender 2.252 ms,
    resolve 1.4 ms, layout 10.026 ms,
    paintingUiOperationExecute 5.552 ms, layoutUiOperationExecute 0.598 ms;
    paintEnd 1788718735522.751 ms

Memory
  after-initial-load [complete]: totalBytes 534768 bytes,
    elementBytes 31200 bytes, viewBytes 21376 bytes,
    mainThreadRuntimeBytes 482192 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 36669744 bytes, elementNodeCount 30 nodes;
    status completed; instances 1/1; collection 1 ms
```

### 이번 — `LIB-239` (`eb0ebef`)

```text
Rendering
  FCP loadBundle: lynxFcp 87.871 ms, fcp 88.199 ms
  LoadBundle loadBundle: loadBundle 22.557 ms, parse 1.551 ms,
    loadBackground 5.18 ms, pipeline 87.885 ms, mtsRender 2.29 ms,
    resolve 1.326 ms, layout 10.763 ms,
    paintingUiOperationExecute 5.458 ms, layoutUiOperationExecute 0.588 ms;
    paintEnd 1788718692324.267 ms

Memory
  after-initial-load [complete]: totalBytes 582624 bytes,
    elementBytes 31200 bytes, viewBytes 21376 bytes,
    mainThreadRuntimeBytes 530048 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 37357872 bytes, elementNodeCount 30 nodes;
    status completed; instances 1/1; collection 1 ms
```

## 비교

### ⚠ 기준선이 셋이다 — 비교 기준은 `main`이다

| 번들 크기 | 무엇인가 |
|---|---|
| 213,627 B | LIB-237 브랜치. **`#47` 병합 전**이다 |
| **213,833 B** | **`main` (`8c03257`) — `#47` + `#48` 병합 후. ★ 이 회차의 비교 기준** |
| 258,024 B | LIB-239 워크트리 (`eb0ebef`) |

**셋이 다 실재하는 값이고 셋 다 서로 다른 트리에서 나왔다.** 어느 하나가 오측이 아니다.

**`213,627`을 기준으로 쓰면 안 된다.** 이 브랜치는 `main`에서 갈라져 나왔고
`main`에는 이미 `#47`(스텝→학습형 배정표)과 `#48`(죽은 가림 제거)이 들어 있다.
`213,627`과 비교하면 **`#47`이 더한 몫까지 이 PR 몫으로 잡힌다.**

**앞 회차 기록들이 또 다른 번들 크기를 적어 뒀다는 것도 같이 봐야 한다** —
[문장 순서·단어 선택 도입 — 01](learning-forms-iphone-17-pro-simulator-01.md)이
213,653 B, [학습형 매핑 — 01](learning-form-mapping-iphone-17-pro-simulator-01.md)이
213,839 B다. **이 저장소에는 「그 무렵의 번들 크기」가 하나로 존재하지 않는다.**
그래서 회차마다 **어느 commit의 트리에서 잰 값인지**를 붙이지 않으면 비교가 성립하지
않는다.

### 차

- 기준 기록: 이 회차 안의 `main` (`8c03257`) 캡처. 같은 시뮬레이터·OS·SDK·호스트
  바이너리에서 연달아 떴다.

| | 기준 (`main`) | 이번 | 차 |
|---|---|---|---|
| 번들 | 213,833 B | 258,024 B | **+44,191 B** |
| `totalBytes` | 534,768 | 582,624 | **+47,856** |
| `mainThreadRuntimeBytes` | 482,192 | 530,048 | **+47,856** |
| `elementBytes` | 31,200 | 31,200 | **0** |
| `viewBytes` | 21,376 | 21,376 | **0** |
| `elementNodeCount` | 30 | 30 | **0** |
| `lynxFcp` | 85.329 ms | 87.871 ms | +2.542 ms |
| `appBytes` | 36,669,744 | 37,357,872 | +688,128 |

## 해석

### 요소 셋이 전부 0이다 — 코드는 들어왔고 실행은 안 됐다

**`elementBytes` · `viewBytes` · `elementNodeCount` 셋이 기준과 정확히 같다.**

두 화면을 `import`했지만 **홈 탭에서 그려지지 않으므로 요소 트리가 자라지 않는다.**
초기 화면의 구조가 한 노드도 안 바뀌었다는 것이 실측으로 확인된다.

자란 것은 **번들과 런타임 둘뿐이고, 그 둘이 거의 같은 크기다** — **+44,191 B**와
**+47,856 B**. 「모듈 그래프에 코드가 들어왔고, 그 코드가 아직 아무 요소도 만들지
않았다」와 자릿수·방향이 맞는다.

`mainThreadRuntimeBytes` 증가분이 `totalBytes` 증가분과 **정확히 같은 47,856**인 것도
같은 방향이다 — 늘어난 보유가 전부 메인 스레드 런타임 한 곳이고, element·view 쪽으로는
한 바이트도 안 갔다.

### 증가의 원인은 import 두 줄이다

`apps/mobile/src/app/App.tsx`에 `SentenceOrderScreen` · `WordChoiceScreen` import 두
줄이 생겨 **두 화면이 모듈 그래프에 들어왔다.** 그 전에는 `App.tsx`가 둘을 import하지
않아 그래프 밖이었고, 번들러가 통째로 걷어내고 있었다.

`onStartStep`이 리터럴 대신 `learningScreenFor(learningFormForStep(id), id)`를 부르면서
**두 화면이 도달 가능해졌고, 도달 가능해진 값이 곧 번들에 실린 값이다.**

### 앞 회차 둘의 프로브가 양성으로 뒤집힌다

[문장 순서·단어 선택 도입 — 01](learning-forms-iphone-17-pro-simulator-01.md)과
[학습형 매핑 — 01](learning-form-mapping-iphone-17-pro-simulator-01.md)이 각각
**"두 화면은 번들에 없다"** 를 프로브 결과로 적어 뒀다. 두 기록 다 **0건**이었고, 그
0을 만든 이유를 *"아무도 import하지 않기 때문"* 이라고 적었다.

**그 이유가 이번에 사라졌다.** `App.tsx`가 둘을 import한다. 즉 두 기록의 프로브는
**이 commit에서 양성으로 뒤집히는 것이 맞다.**

**다만 이 회차는 그 프로브를 다시 돌리지 않았다.** 여기 있는 근거는 import 두 줄과
+44,191 B이고, **바이트 카운트 프로브의 실제 재집계는 하지 않았다.** 앞 두 기록이 세운
0/2 대조를 **숫자로 이어받는 것은 후속 회차의 자리다** — 그때 양성 대조(`단계`·`듣기`)와
함께 `문장 순서`·`단어 선택`이 몇 건으로 올라오는지가 이 해석의 직접 증거가 된다.

### 이 기록이 판정하지 않는 것

**예산 판정이 아니다.** 이 저장소에 번들·성능 예산이 아직 없다
([ADR-0018 D5](../../adr/0018-lynx-performance-analysis-boundary.md) ·
[`docs/adr/README.md`](../../adr/README.md)의 보류 표에서 「성능 회귀 예산」 행이 아직
열려 있다). **+44 kB가 커서 문제인지 작아서 괜찮은지를 가를 근거가 저장소에 없다.**
그래서 이 기록은 **측정과 사유만 적고 판정을 적지 않는다.**

**시간은 여전히 판정할 수 없다.** `lynxFcp` +2.542 ms는 앞 회차들이 본 산포(약
48 ms 폭) 안에서 구별되지 않는 크기다. 이번엔 호스트 바이너리가 상수라 조건이 앞보다
낫지만 **여전히 한 조건에 한 점씩, 단일 회차다.** 같은 조건을 반복해 재기 전에는
+2.542 ms를 신호로도 잡음으로도 부를 수 없다.

**`appBytes` +688,128도 마찬가지다.** 프로세스 전체 상주량이라 Lynx 밖의 요인이 섞이고,
단일 회차로는 위 +47,856과 어떻게 이어지는지 가를 수 없다.

**화면 진입 비용은 이 기록에 없다.** 두 화면에 들어가지 않았다. 결선이 섰으므로 **이제
그 측정이 처음으로 가능해졌고**, 그것이 다음 회차의 대상이다.

## Trace 후속 확인

- **render** — `lynxFcp` +2.542 ms. 호스트 바이너리를 고정한 첫 회차라 조건은 좋아졌지만
  조건당 한 점뿐이라 단계별 분해로 넘어갈 근거가 아직 없다.
- **fluency** — 이 회차의 대상이 아니다. 두 화면의 스크롤·조작은 진입하지 않아 못 쟀다.
- **memory** — `after-initial-load` 하나뿐이다. **요소 셋이 0, 런타임이 +47,856으로
  갈린 것이 이 회차의 실측 산출이다.** 화면 진입·이탈의 보유 증가는 이 기록이 답하지
  않는다.
- **NativeModule** — 이 변경이 새로 부르는 네이티브 모듈이 없다.

## 결론과 후속

- **번들 +44,191 B, 런타임 +47,856 B.** 비교 기준은 `main`(`8c03257`)의 213,833 B다.
- **요소 셋(`elementBytes` · `viewBytes` · `elementNodeCount`)이 전부 0이다.** 두 화면이
  모듈 그래프에는 들어왔고 홈 탭에서는 그려지지 않는다.
- **네이티브를 다시 빌드하지 않고 번들만 교체했다.** 그래서 위 차가 전부 JS 몫으로
  격리되고, 동시에 **앞 회차들과 절차가 달라 시계열로 이어 붙일 수 없다.**
- **예산 판정을 내리지 않는다.** 가를 근거가 저장소에 없다.

후속 넷:

1. **두 화면에 실제로 들어가서 잰다.** 결선이 서서 처음으로 가능해진 측정이다.
2. **번들 프로브를 다시 돌린다.** 앞 두 기록의 0/2 대조를 숫자로 이어받는다.
3. **같은 조건을 여러 번 재는 회차.** 다섯 회차째 같은 후속이 남는다 — 호스트를 고정한
   이번 절차가 그 반복에 더 맞는 형태다.
4. **번들·성능 예산.** 「성능 회귀 예산」 행이 열려 있는 한 +44 kB류의 값은 계속
   판정 없이 쌓인다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] `미측정` 기록을 baseline이나 성능 통과로 표현하지 않았다 — 이 기록은 측정이다.
- `pnpm verify` exit 0 (unit 365 · ui 372 · integration 54 · report-policy 22).
- **예산 판정이 아니다.**
- **수용 기준을 닫지 않는다.** 「성능 회귀 예산」 행이 열려 있는 한 이 수치는 판정으로
  올라가지 않는다.
