# 제목 특성이 붙는다 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 회차 시뮬레이터 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-07T22:5x+09:00
- 상태: 측정 — 기준선과 이번을 각각 한 번씩 수집했다.
- 기능 PR: 없음 — 아직 만들지 않았다
- 대상 commit: `d839775ba6997bcf628c1ed6169488ca2ab236af`
- 비교 기준 commit: `54688e2` (`main`)
- 기기: iPhone 17 Pro 시뮬레이터 (`3B5DADAD-597A-406C-AC83-26B3D3FADECB`)
- OS: iOS 26.5 (23F77), 호스트 macOS 26.5.1
- Lynx SDK: 4.0.1
- 빌드: **네이티브 재빌드 없음.** Release `Host.app`에 Lynx 번들만 갈아 끼웠다. 번들
  288,255 bytes
- 실행 회차: 01

**측정 일시의 분 자리(`5x`)는 캡처 기록에 남은 그대로다.** 두 캡처가 22시 50분대에
연달아 떴다는 것까지가 확인된 범위이고, **일의 자리는 확인되지 않아 비워 둔다.** 앞
회차들이 같은 자리를 같은 방식으로 비워 뒀다
([나가기가 맵에 닿는다 — 01](exit-reaches-map-iphone-17-pro-simulator-01.md) ·
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

**번들 동일성 확인**: `.app` 안과 워크트리 `dist/`가 `sha256 5ff641080c6e9e6b…`로 같다.
**해시는 캡처 기록에 남은 자리까지만 옮겨 적었다** — 뒤가 잘려 있고 채우지 않는다.

**`paintEnd`가 서로 다르므로 둘 다 새 캡처다** — 앞 회차에 값이 통째로 같아 폐기한 적이
있어 이번에도 확인했다
([학습형 매핑 — 01](learning-form-mapping-iphone-17-pro-simulator-01.md)).

## 대상 변경

`apps/mobile/src/screens/culture/CultureScreen.tsx`의 서사 제목
(`culture-screen-narrative-title`) `<text>`에 **`accessibility-traits="header"` 한
속성**이 붙었다. 좌표가 아니라 클래스명으로 가리킨다.

- **CSS 델타 0건.** 스타일시트는 이 변경에서 한 줄도 안 바뀌었다.
- **요소 추가·삭제·이동 0건.** 트리의 모양이 그대로다 — 있는 노드의 **역할만** 갈렸다.
- 근거는 [ADR-0016 D12](../../adr/0016-assistive-technology-semantics.md)다. 절 제목이
  이 축에 들어오고, **게이트를 통과한 자리만** 들어온다. 오늘 통과하는 자리가
  `culture-screen-narrative-title`이다.

**이 회차가 재는 구간은 홈 탭까지의 초기 로드이고, 그 구간에서 이 속성은 실행되지
않는다.** 문화 학습 화면은 초기 로드에 서지 않는다. 그래서 이 기록이 답하는 물음은
**「안 그려지는 화면에 붙은 속성 하나가 초기 로드에 얼마를 더했는가」**다.

## 시나리오

- 전제: 앱을 **지우고 다시 깐 뒤** `--performance-capture`로 실행한다. 글자 크기 기본.
- 단계: 홈 탭이 뜰 때까지 둔다. 조작하지 않는다.
- 관찰 구간: `loadBundle` 시작부터 첫 paint까지와 직후 메모리 snapshot.
- 두 조건(`main` 기준선 · 이번 번들)에서 위 절차를 각각 한 번씩 돈다.

## 분석 결과

### 기준선 — `main` (`54688e2`, 번들 288,236 B)

```text
Rendering
  FCP loadBundle: lynxFcp 90.693 ms, fcp 91.002 ms
  LoadBundle loadBundle: loadBundle 23.01 ms, parse 1.593 ms, loadBackground 5.07 ms,
    pipeline 90.702 ms, mtsRender 2.259 ms, resolve 1.411 ms, layout 10.902 ms,
    paintingUiOperationExecute 5.69 ms, layoutUiOperationExecute 0.596 ms;
    paintEnd 1788780856231.341 ms

Memory
  after-initial-load [complete]: totalBytes 608912 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 556336 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 37275952 bytes,
    elementNodeCount 30 nodes; status completed; instances 1/1; collection 0 ms
```

### 이번 — `LIB-243` (`d839775`, 번들 288,255 B)

```text
Rendering
  FCP loadBundle: lynxFcp 88.609 ms, fcp 89.358 ms
  LoadBundle loadBundle: loadBundle 25.785 ms, parse 3.637 ms, loadBackground 5.636 ms,
    pipeline 88.619 ms, mtsRender 2.532 ms, resolve 1.615 ms, layout 10.946 ms,
    paintingUiOperationExecute 5.856 ms, layoutUiOperationExecute 0.619 ms;
    paintEnd 1788780874997.083 ms

Memory
  after-initial-load [complete]: totalBytes 608912 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 556336 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 37226800 bytes,
    elementNodeCount 30 nodes; status completed; instances 1/1; collection 1 ms
```

## 비교

- 기준 기록: 이 회차 안의 `main` (`54688e2`) 캡처. 같은 시뮬레이터·OS·SDK·호스트
  바이너리에서 연달아 떴다.

| | 기준(`main`) | 이번 | 차 |
|---|---|---|---|
| 번들 | 288,236 B | 288,255 B | **+19 B** |
| `totalBytes` | 608,912 | 608,912 | **0** |
| `mainThreadRuntimeBytes` | 556,336 | 556,336 | **0** |
| `elementBytes` · `viewBytes` · `elementNodeCount` | | | **0** |
| `lynxFcp` | 90.693 ms | 88.609 ms | −2.084 ms |

## 해석

### ⭐ 이번 회차의 0은 앞 회차들의 0과 다른 종류다

**앞 네 회차는 번들이 자라면 런타임도 함께 자랐다.** 요소 셋이 0이어도
`mainThreadRuntimeBytes`는 매번 움직였고, 그 증가분이 `totalBytes` 증가분과 정확히
같았다.

| 회차 | `totalBytes` = `mainThreadRuntimeBytes` 증가분 |
|---|---|
| [문화 퀴즈 화면 — 01](culture-quiz-screen-iphone-17-pro-simulator-01.md) | +18,000 |
| [문화 학습 화면 — 01](culture-screen-iphone-17-pro-simulator-01.md) | +8,112 |
| [학습형 결선 — 01](learning-form-wiring-iphone-17-pro-simulator-01.md) | +47,856 |
| [나가기가 맵에 닿는다 — 01](exit-reaches-map-iphone-17-pro-simulator-01.md) | +176 |

**위 네 수치의 출처는 이 저장소의 해당 회차 기록이다.** 요청자가 제시한 값을 그대로
쓰지 않고 각 파일의 비교 표에서 직접 확인해 인용했다 — 네 값이 전부 일치했다.

**이번엔 번들만 19 B 늘고 런타임이 한 바이트도 안 움직였다.** `totalBytes`도
`mainThreadRuntimeBytes`도 기준과 **완전히 같은 값**이다.

**그래서 「또 0이 나왔다」로 묶어 읽으면 안 된다.**

| | 앞 네 회차의 0 | **이번의 0** |
|---|---|---|
| 0인 것 | **요소 셋**(`elementBytes` · `viewBytes` · `elementNodeCount`)만 | **요소 셋에 더해 런타임 보유까지** |
| 런타임 | 번들이 자란 만큼 **같이 자랐다** | **한 바이트도 안 움직였다** |
| 왜 | 모듈 그래프에 코드가 들어왔고 그 코드가 요소를 안 만들었다 — **들어온 것은 남았다** | 홈 탭에서 그 속성이 **실행되지 않고**, **속성 하나는 런타임 보유를 안 만든다** |

**이 구분을 안 적으면 다음 사람이 다섯 회차를 같은 사건의 반복으로 읽는다.** 앞의 넷은
「보유가 늘되 전부 런타임 한 곳에 앉았다」였고, **이번은 「보유가 늘지 않았다」**다.
번들 **+19 B**가 런타임 보유로 **하나도 번역되지 않은 것**이 이 회차의 실측 산출이다.

**속성 하나가 붙는 일과 화면·모듈이 하나 서는 일이 메모리에서 같은 종류가 아니다** —
그것이 이 기록이 남기는 사실이다. 다만 **왜 정확히 0인가**(할당 단위에 못 미쳐 묻힌
것인지, 실제로 보유가 0인지)는 **이 기록이 답하지 않는다.** 조건당 캡처가 한 번씩이라
가를 근거가 없다.

### `lynxFcp` −2.084 ms는 잡음이다

**개선으로 읽지 않는다.**

**회차가 01 하나뿐이다.** 조건당 캡처 한 번씩이고 같은 조건을 반복해 재지 않았다.
**단일 회차라 이 차가 신호인지 잡음인지 판정할 수 없다** — 그것이 이 기록의 한계다.

**같은 캡처 안에서 부호가 갈린다.** `parse`가 1.593 → 3.637 ms로 튀었고 `loadBundle`도
23.01 → 25.785 ms로 늘었는데, `lynxFcp`와 `pipeline`은 줄었다. **한 캡처 안에서 방향이
엇갈리는 폭**이라 어느 쪽도 신호로 읽을 수 없다. **`parse`의 튐도 같은 잡음이다** —
번들이 19 B 자란 것으로 2 ms대의 파싱 증가를 설명할 수 없다.

**앞 회차에도 코드가 늘었는데 값이 줄어든 자리가 있다.** 문화 학습 회차의 `lynxFcp`
**−3.813 ms**다([문화 학습 화면 — 01](culture-screen-iphone-17-pro-simulator-01.md)).
**코드 증가와 부호가 반대로 나온 적이 이미 있으므로** 이번 −2.084 ms를 개선으로 읽을 수
없다.

**`appBytes`도 마찬가지다.** 37,275,952 → 37,226,800으로 줄었지만(차 −49,152)
**프로세스 전체 상주량이라 Lynx 밖의 요인이 섞인다** — 이 크기로는 아무것도 가르지
못한다.

### 네이티브를 다시 빌드하지 않은 것의 양면

**둘 다 적는다. 한쪽만 적으면 다음 사람이 반대쪽으로 넘어진다.**

- **통제가 좋다.** 네이티브 호스트가 두 캡처에서 **상수**이므로 위 차가 **전부 JS 번들
  몫으로 격리된다.** 바뀐 변수가 하나다.
- **다만 네이티브를 다시 빌드한 회차들과 절차가 다르다.** 이 기록의 수치를 그 표에
  그대로 이어 붙이면 「같은 절차의 시계열」로 읽힌다 — **그렇지 않다. 이어 붙일 수 없다.**

**이 절차의 회차는 이제 다섯이다.** 다섯이 됐다는 것은 **같은 절차끼리 이어 붙일 수
있다는 뜻이고, 그 다섯으로 추세를 말할 수 있다는 뜻이 아니다** — 조건당 캡처가 여전히
한 번씩이다.

### 이 기록이 판정하지 않는 것

**예산 판정이 아니다.** 이 저장소에 번들·성능 예산이 아직 없다
([ADR-0018 D5](../../adr/0018-lynx-performance-analysis-boundary.md) ·
[`docs/adr/README.md`](../../adr/README.md)의 보류 표에서 「성능 회귀 예산」 행이 아직
열려 있다). **+19 B가 커서 문제인지 작아서 괜찮은지를 가를 근거가 저장소에 없다.**
그래서 이 기록은 **측정과 사유만 적고 판정을 적지 않는다.**

**붙은 속성이 실제로 무엇으로 들리는지는 이 기록에 없다.** 이 회차가 잰 것은 **그 속성이
한 번도 실행되지 않는 구간**이다. 서사 제목이 「머리말」로 낭독되는지, 로터 순회에
잡히는지는 **성능 기록이 답할 물음이 아니다** — 수동 채널
([`docs/e2e/culture.md`](../../e2e/culture.md))가 진다.

## Trace 후속 확인

- **render** — `lynxFcp` −2.084 ms. 호스트 바이너리를 고정한 다섯째 회차라 조건은 좋지만
  조건당 한 점뿐이고, **같은 캡처 안에서 `parse`와 부호가 갈려 단계별 분해로 넘어갈
  근거가 아니다.**
- **fluency** — 이 회차의 대상이 아니다. 조작 구간 없이 초기 로드만 쟀다.
- **memory** — `after-initial-load` 하나뿐이다. **요소 셋과 런타임 보유가 함께 0으로
  나온 것이 이 회차의 실측 산출이다.** 문화 학습 화면에 실제로 들어갔을 때의 보유는 이
  기록이 답하지 않는다.
- **NativeModule** — 이 변경이 새로 부르는 네이티브 모듈이 없다.

## 결론과 후속

- **결론: 서사 제목에 `accessibility-traits="header"` 한 속성을 붙인 변경은 초기 로드
  구간에서 번들 +19 B로만 나타나고 런타임 보유와 요소 트리를 한 바이트·한 노드도 안
  바꿨다.** 비교 기준은 `main`(`54688e2`)의 288,236 B다.
- **⚠ 이번의 0은 앞 회차들의 0과 다른 종류다.** 앞 넷은 번들이 자라면 런타임도 같이
  자랐고(+18,000 · +8,112 · +47,856 · +176, **각 회차 기록에서 확인**), **이번은 번들만
  자라고 런타임이 안 움직였다.** 홈 탭에서 그 속성이 실행되지 않고, **속성 하나는 런타임
  보유를 안 만든다.**
- **`lynxFcp` −2.084 ms는 잡음이다.** 회차는 **01 하나뿐**이고, 같은 캡처 안에서 `parse`
  1.593 → 3.637 ms가 반대 방향으로 튀었다. **개선이 아니다.**
- **네이티브를 다시 빌드하지 않고 번들만 교체했다.** 그래서 위 차가 전부 JS 몫으로
  격리되고, 동시에 **네이티브를 다시 빌드한 회차 표에는 이어 붙일 수 없다.** 이 절차의
  회차는 이제 다섯이다.
- **예산 판정을 내리지 않는다.** 가를 근거가 저장소에 없다.

후속 셋:

1. **같은 조건을 여러 번 재는 회차.** 같은 후속이 또 남는다 — 조건당 캡처가 한 번씩이라
   `lynxFcp` 차도 `parse` 튐도 가릴 수 없었다.
2. **문화 학습 화면에 실제로 들어가는 회차.** 붙은 속성이 그려질 때의 보유·낭독은
   **그 화면에 들어가야 재진다.** 이 회차는 그 구간을 갖지 않았다.
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
