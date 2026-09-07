# 문화 학습 화면 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 회차 시뮬레이터 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-07T12:5?+09:00
- 상태: 측정 — 기준선과 이번을 각각 `performance:capture`로 수집했다.
- 기능 PR: LIB-238 — 문화 학습 화면과 스텝→서사 표
- 대상 commit: `88b9104`
- 비교 기준 commit: `4b6743f` (`main`)
- 기기: iPhone 17 Pro 시뮬레이터 (`3B5DADAD-597A-406C-AC83-26B3D3FADECB`)
- OS: iOS 26.5 (23F77), 호스트 macOS 26.5.1
- Lynx SDK: 4.0.1
- 빌드: **네이티브 재빌드 없음.** 9월 5일 Release 빌드의 `Host.app`에 Lynx 번들만 갈아
  끼웠다. 번들 268,207 bytes
- 실행 회차: 01

**측정 일시의 분 자리를 임의로 채우지 않는다.** 두 캡처가 12시 50분대에 연달아 떴다는
것까지가 캡처 기록에서 확인된 범위이고, **일의 자리는 확인되지 않아 비워 둔다.** 앞
회차에서 이 자리를 임의로 채운 것이 지적됐다 — 확인된 자리까지만 적는다.

**`paintEnd`를 시각으로 환산하지 않는다.** 저장소가 `paintEnd`에 대해 적어 둔 것은
「공식 시작점이 없는 끝점」이라는 것뿐이고
([ADR-0018](../../adr/0018-lynx-performance-analysis-boundary.md) ·
[`docs/performance-analysis.md`](../../performance-analysis.md)), **그 값의 원점이 Unix
epoch라는 진술이 저장소에 없다.** 그래서 아래에서는 두 값이 **서로 다르다**는 사실만
쓰고 벽시계 시각으로 옮기지 않는다.

## ⚠ 절차가 앞 회차들과 다르다 — 네이티브를 다시 빌드하지 않았다

**앞 회차들은 Release로 다시 빌드했다. 이 회차는 아니다.** 9월 5일 Release 빌드의
`Host.app`을 그대로 두고 **그 안의 Lynx 번들만 교체해서** 두 번 쟀다.

이 차이를 두 방향으로 읽어야 한다.

- **통제가 좋다.** 네이티브 호스트가 두 캡처에서 상수이므로 아래 차가 **전부 JS 번들
  몫이다.** 바뀐 변수가 하나로 격리된다.
- **다만 앞 회차들과 절차가 다르다.** 이 기록의 수치를 앞 회차 표에 그대로 이어 붙이면
  「같은 절차의 시계열」로 읽힌다 — **그렇지 않다.**

**이 절차의 회차가 이제 둘이다.**
[학습형 결선 — 01](learning-form-wiring-iphone-17-pro-simulator-01.md)이 첫째이고 이
기록이 둘째다. **둘뿐이므로 아직 「이 절차의 시계열」도 아니다** — 같은 절차끼리 이어
붙일 수 있게 되는 것과, 그 둘로 추세를 말할 수 있는 것은 다른 이야기다.

**번들 동일성 확인**: `.app` 안과 워크트리 `dist/`가 `sha256 f2348ce633b3e672…`로 같다.

**두 캡처 모두 앱을 지우고 다시 깔았다.** `paintEnd`가 서로 다르므로 **둘 다 새
캡처다** — 앞 회차에 값이 통째로 같아 폐기한 적이 있어 이번에도 확인했다
([학습형 매핑 — 01](learning-form-mapping-iphone-17-pro-simulator-01.md)).

## 시나리오

- 전제: 앱을 **지우고 다시 깐 뒤** `--performance-capture`로 실행한다. 글자 크기 기본.
- 단계: 홈 탭이 뜰 때까지 둔다. 조작하지 않는다.
- 관찰 구간: `loadBundle` 시작부터 첫 paint까지와 직후 메모리 snapshot.
- 두 조건(`main` 기준선 · 이번 번들)에서 위 절차를 각각 한 번씩 돈다.

**문화 화면에 들어가지 않는다. 들어갈 수 없다.** 배정표(`learningFormByStep`)의 다섯
값이 전부 `"listening"`이라 **오늘 이 화면에 닿는 경로가 없다**
([`docs/e2e/culture.md`](../../e2e/culture.md)). 이 회차가 재는 것은 **홈 탭까지의 초기
로드**이고, 문화 화면이 모듈 그래프에 들어온 것이 그 구간에 얼마를 더했는가다.

## 분석 결과

### 기준선 — `main` (`4b6743f`)

```text
Rendering
  FCP loadBundle: lynxFcp 90.205 ms, fcp 90.65 ms
  LoadBundle loadBundle: loadBundle 25.257 ms, parse 1.619 ms,
    loadBackground 5.447 ms, pipeline 90.216 ms, mtsRender 2.282 ms,
    resolve 1.384 ms, layout 13.164 ms,
    paintingUiOperationExecute 5.641 ms, layoutUiOperationExecute 0.607 ms;
    paintEnd 1788747270319.485 ms

Memory
  after-initial-load [complete]: totalBytes 582624 bytes,
    elementBytes 31200 bytes, viewBytes 21376 bytes,
    mainThreadRuntimeBytes 530048 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 37374232 bytes, elementNodeCount 30 nodes;
    status completed; instances 1/1; collection 1 ms
```

### 이번 — `LIB-238` (`88b9104`)

```text
Rendering
  FCP loadBundle: lynxFcp 86.392 ms, fcp 86.784 ms
  LoadBundle loadBundle: loadBundle 22.758 ms, parse 1.691 ms,
    loadBackground 6.049 ms, pipeline 86.399 ms, mtsRender 2.394 ms,
    resolve 1.399 ms, layout 10.403 ms,
    paintingUiOperationExecute 5.692 ms, layoutUiOperationExecute 0.591 ms;
    paintEnd 1788747288302.096 ms

Memory
  after-initial-load [complete]: totalBytes 590736 bytes,
    elementBytes 31200 bytes, viewBytes 21376 bytes,
    mainThreadRuntimeBytes 538160 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 37243184 bytes, elementNodeCount 30 nodes;
    status completed; instances 1/1; collection 1 ms
```

## 비교

### 기준선이 어느 트리인가

앞 회차가 **「이 저장소에는 『그 무렵의 번들 크기』가 하나로 존재하지 않는다」**를 적어
뒀다([학습형 결선 — 01](learning-form-wiring-iphone-17-pro-simulator-01.md)). 그래서
이번에도 **어느 commit의 트리에서 잰 값인지**를 먼저 붙인다.

| 번들 크기 | 무엇인가 |
|---|---|
| **258,024 B** | **`main` (`4b6743f`). ★ 이 회차의 비교 기준** |
| 268,207 B | LIB-238 워크트리 (`88b9104`) |

**기준선 258,024 B는 앞 회차가 「LIB-239 워크트리」로 적어 둔 값과 같은 수다.** 그
회차가 병합된 뒤의 `main`에서 이 회차의 기준선을 다시 잰 것과 어긋나지 않는다.
**같은 수라는 것이 확인된 사실이고**, 그 이상(어느 병합이 언제 들어갔는지)은 이 기록이
재지 않았다.

### 차

- 기준 기록: 이 회차 안의 `main` (`4b6743f`) 캡처. 같은 시뮬레이터·OS·SDK·호스트
  바이너리에서 연달아 떴다.

| | 기준 (`main`) | 이번 | 차 |
|---|---|---|---|
| 번들 | 258,024 B | 268,207 B | **+10,183 B** |
| `totalBytes` | 582,624 | 590,736 | **+8,112** |
| `mainThreadRuntimeBytes` | 530,048 | 538,160 | **+8,112** |
| `elementBytes` | 31,200 | 31,200 | **0** |
| `viewBytes` | 21,376 | 21,376 | **0** |
| `elementNodeCount` | 30 | 30 | **0** |
| `lynxFcp` | 90.205 ms | 86.392 ms | −3.813 ms |
| `appBytes` | 37,374,232 | 37,243,184 | −131,048 |

## 해석

### 요소 셋이 전부 0이다 — 그리고 이번엔 그 이유가 하나 더 있다

**`elementBytes` · `viewBytes` · `elementNodeCount` 셋이 기준과 정확히 같다.**

앞 회차와 **모양은 같은데 이유가 하나 더 깊다.**

- 앞 회차의 이유: 화면을 `import`했지만 **홈 탭에서 그려지지 않는다.** 초기 로드
  구간에 요소가 생길 일이 없다.
- **이번 회차가 추가로 아는 것: 문화 화면은 홈 탭이 아니라 어디서도 안 열린다.**
  `onStartStep`이 배정표를 경유하는데 `journey-map.ts`의 `learningFormByStep`이
  **다섯 스텝 전부 `"listening"`** 이라 **`culture` 화면에 닿는 경로가 오늘 0개다.**
  결선(`learningScreenFor`의 `culture` 분기)은 서 있고 **막힌 것은 코드가 아니라
  구성**이다([`docs/e2e/culture.md`](../../e2e/culture.md) ·
  [`docs/screens.md`](../../screens.md)).

즉 이 회차의 0은 **「아직 안 그려졌다」가 아니라 「도달 불가라서 안 그려진다」**이고,
그 도달 불가가 의도된 상태다. 요소 트리가 한 노드도 안 바뀐 것이 실측으로 확인된다.

자란 것은 **번들과 런타임 둘뿐이다** — **+10,183 B**와 **+8,112 B**. 「모듈 그래프에
코드가 들어왔고, 그 코드가 아직 아무 요소도 만들지 않았다」와 자릿수·방향이 맞는다.

`mainThreadRuntimeBytes` 증가분이 `totalBytes` 증가분과 **정확히 같은 +8,112**인 것도
같은 방향이다 — **늘어난 보유가 전부 메인 스레드 런타임 한 곳이고**, element·view 쪽으로는
한 바이트도 안 갔다.

### 번들 +10,183 B의 내역 — 서드파티는 0건이다

늘어난 것은 셋뿐이다.

| 무엇 | 어디 |
|---|---|
| 새 화면 컴포넌트 하나 | `apps/mobile/src/screens/culture/CultureScreen.tsx` |
| CSS 하나 | `apps/mobile/src/screens/culture/culture-screen.css` |
| 스텝→서사 표(서사 다섯) | `apps/mobile/src/screens/culture/culture.ts` |

**`package.json`과 `pnpm-lock.yaml`의 diff가 0줄이다 — 새 서드파티 의존이 0건이다.**
그래서 +10,183 B는 전부 이 저장소가 직접 쓴 코드와 문자열이다.

**서사 다섯이 그 안에 문자열로 실려 있다는 것도 같이 봐야 한다.** 그 다섯 값은
컨텐츠가 아니라 **자리표**이고(보류 표의 「문화 서사 컨텐츠의 출처」 행 —
[`docs/adr/README.md`](../../adr/README.md)), **진짜 서사로 갈아 끼우는 날 이 바이트 수는
다시 움직인다.** 그래서 +10,183 B를 「문화 화면의 최종 비용」으로 읽으면 안 된다.

### 앞 회차와 증가폭의 관계가 뒤집혔다 — 그러나 두 점뿐이다

앞 회차는 번들 +44,191 B에 런타임 +47,856 B로 **런타임이 번들보다 컸다.** 이번은 번들
+10,183 B에 런타임 +8,112 B로 **런타임이 번들보다 작다.**

**이 뒤집힘을 해석하지 않는다.** 조건마다 한 점씩, 회차마다 한 번씩이라 **각 조합에
표본이 하나다.** 두 회차의 방향이 다르다는 것은 관찰이고, 그 차이가 코드의 성질에서
오는지 회차 잡음에서 오는지를 가를 자료가 없다.

### `lynxFcp`와 `appBytes`가 줄었다 — 개선이 아니다

**코드가 늘었는데 `lynxFcp`가 −3.813 ms, `appBytes`가 −131,048로 둘 다 줄었다.**

**이것을 개선으로 적지 않는다.** 코드를 더한 변경이 로드 시간과 프로세스 상주량을
줄인다는 인과가 이 자료에 없다. **회차가 하나뿐이다** — 조건당 캡처 한 번씩이고,
같은 조건을 반복해 재지 않았다. 앞 회차들이 본 `lynxFcp` 산포는 이 크기의 차를 삼킨다.

- `lynxFcp` −3.813 ms는 **단일 회차 잡음이다.** 신호로도 잡음의 반대(회귀 없음의 증거)로도
  쓸 수 없다. `layout`이 13.164 → 10.403 ms로 함께 움직인 것도 같은 한 점 안의 값이다.
- `appBytes` −131,048은 **프로세스 전체 상주량**이라 Lynx 밖의 요인이 섞인다. 위
  +8,112와 부호까지 반대인데, **단일 회차로는 둘이 어떻게 이어지는지 가를 수 없다.**

**두 값이 함께 줄었다는 사실 자체가 이 회차의 잡음 폭을 보여 준다** — 늘어난 코드가
있는데도 이 방향이 나온다면, 이 자료로 ±수 ms·±수십만 바이트를 판정하면 안 된다는
뜻이다.

### 이 기록이 판정하지 않는 것

**예산 판정이 아니다.** 이 저장소에 번들·성능 예산이 아직 없다
([ADR-0018 D5](../../adr/0018-lynx-performance-analysis-boundary.md) ·
[`docs/adr/README.md`](../../adr/README.md)의 보류 표에서 「성능 회귀 예산」 행이 아직
열려 있다). **+10,183 B가 커서 문제인지 작아서 괜찮은지를 가를 근거가 저장소에 없다.**
그래서 이 기록은 **측정과 사유만 적고 판정을 적지 않는다.**

**화면 진입 비용은 이 기록에 없고, 코드로는 열 수 없다.** 앞 회차는 결선이 서면서 진입
측정이 「처음으로 가능해졌다」고 적었지만, **문화는 사정이 다르다** — 진입하려면
배정표의 값이 `culture`를 가리켜야 하고 그것은 **컨텐츠 보류**다(보류 표의 「스텝별
학습형 배정」 행). **코드를 고쳐 여는 것은 이 기록의 자리가 아니다.**

**스크롤 비용도 못 쟀다.** 이 화면의 유일한 흐름 영역이 `scroll-view`인데 화면에
들어가지 못해 조작 구간이 없다.

## Trace 후속 확인

- **render** — `lynxFcp` −3.813 ms. 호스트 바이너리를 고정한 둘째 회차라 조건은
  좋지만 조건당 한 점뿐이고, **부호가 코드 증가와 반대라 단계별 분해로 넘어갈 근거가
  아니다.**
- **fluency** — 이 회차의 대상이 아니다. 문화 화면에 도달할 수 없어 스크롤을 못 쟀다.
- **memory** — `after-initial-load` 하나뿐이다. **요소 셋이 0, 런타임이 +8,112로 갈린
  것이 이 회차의 실측 산출이다.** 화면 진입·이탈의 보유 증가는 이 기록이 답하지 않는다.
- **NativeModule** — 이 변경이 새로 부르는 네이티브 모듈이 없다.

## 결론과 후속

- **번들 +10,183 B, 런타임 +8,112 B.** 비교 기준은 `main`(`4b6743f`)의 258,024 B다.
- **요소 셋(`elementBytes` · `viewBytes` · `elementNodeCount`)이 전부 0이다.** 문화
  화면이 모듈 그래프에는 들어왔고, **배정표 다섯 값이 전부 `"listening"`이라 도달
  불가라서** 한 노드도 안 그려진다.
- **`totalBytes` 증가분과 `mainThreadRuntimeBytes` 증가분이 정확히 같다** — 늘어난 보유가
  전부 메인 스레드 런타임이다.
- **`lynxFcp` −3.813 ms와 `appBytes` −131,048은 개선이 아니라 단일 회차 잡음이다.**
  회차는 **01 하나뿐**이다.
- **네이티브를 다시 빌드하지 않고 번들만 교체했다.** 그래서 위 차가 전부 JS 몫으로
  격리되고, 동시에 **앞 회차들과 절차가 달라 시계열로 이어 붙일 수 없다.** 이 절차의
  회차는 이제 둘이다.
- **새 서드파티 0건.** `package.json`·`pnpm-lock.yaml` diff가 0줄이다.
- **예산 판정을 내리지 않는다.** 가를 근거가 저장소에 없다.

후속 넷:

1. **같은 조건을 여러 번 재는 회차.** 여섯 회차째 같은 후속이 남는다 — 이번에 감소
   방향의 값이 둘 나온 것이 그 필요를 다시 보여 준다.
2. **배정 값이 오는 날 문화 화면에 들어가서 잰다.** 코드가 아니라 컨텐츠가 여는
   측정이고, 그때 서사 다섯이 자리표에서 실제 값으로 바뀌므로 **번들 수치도 함께 다시
   잰다.**
3. **번들 프로브.** 앞 회차가 남긴 「0/2 대조를 숫자로 이어받는다」가 아직 열려 있고,
   문화가 셋째 열로 붙는다.
4. **번들·성능 예산.** 「성능 회귀 예산」 행이 열려 있는 한 +10 kB류의 값은 계속 판정
   없이 쌓인다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] `미측정` 기록을 baseline이나 성능 통과로 표현하지 않았다 — 이 기록은 측정이다.
- [x] 서사 문장을 옮겨 적지 않았다 — 자리표를 컨텐츠로 읽히게 하지 않는다.
- **예산 판정이 아니다.**
- **수용 기준을 닫지 않는다.** 「성능 회귀 예산」 행이 열려 있는 한 이 수치는 판정으로
  올라가지 않는다.
