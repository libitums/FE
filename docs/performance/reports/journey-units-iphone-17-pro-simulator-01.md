# 여정 유닛이 코드에 선다 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 회차 시뮬레이터 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-08T01:4x+09:00
- 상태: 측정 — 기준선과 이번을 각각 한 번씩 수집했다.
- 기능 PR: 없음 — 아직 만들지 않았다. 브랜치 `LIB-249/merge-rehearsal`에만 있다.
- 대상 commit: `0218bed4f25f07bfe927738f952c49ac410ed5cd`
- 비교 기준 commit: `d8baa537ed1f54446da1715de58f3db8463fd319` (`main`)
- 기기: iPhone 17 Pro 시뮬레이터 (`3B5DADAD-597A-406C-AC83-26B3D3FADECB`)
- OS: iOS 26.5 (23F77), 호스트 macOS 26.5.1
- Lynx SDK: 4.0.1
- 빌드: **네이티브 재빌드 없음.** Release `Host.app`에 Lynx 번들만 갈아 끼웠다. 번들
  289,225 bytes
- 실행 회차: 01

**측정 일시의 분 자리(`4x`)는 캡처 기록에 남은 그대로다.** 두 캡처가 01시 4분대에
연달아 떴다는 것까지가 확인된 범위이고, **일의 자리는 확인되지 않아 비워 둔다.**
**정밀도가 거기까지다.** 앞 회차들이 같은 자리를 같은 방식으로 비워 뒀다
([판정 낱말에 testid가 붙는다 — 01](verdict-label-testid-iphone-17-pro-simulator-01.md) ·
[문항 종료 전이 발화 — 01](complete-transition-announce-iphone-17-pro-simulator-01.md) ·
[제목 특성이 붙는다 — 01](heading-trait-axis-iphone-17-pro-simulator-01.md) ·
[나가기가 맵에 닿는다 — 01](exit-reaches-map-iphone-17-pro-simulator-01.md)).

**기기 모델명은 UDID로 확인했다.** 위 UDID를 이름으로 부르는 앞 회차 기록들이 이
저장소에 있어 그 이름을 그대로 쓴다 — 새로 지어내지 않았다.

**`paintEnd`를 시각으로 환산하지 않는다.** 근거는 앞 회차가 적은 것과 같고 여기 다시
적지 않는다([문화 퀴즈 화면 — 01](culture-quiz-screen-iphone-17-pro-simulator-01.md)).

## 절차 — 네이티브를 다시 빌드하지 않았다

Release `Host.app`을 그대로 두고 **그 안의 Lynx 번들만 교체해서** 두 번 쟀다. 두 조건
모두 **앱을 지우고 다시 깔고** 잰다. 이 절차를 어떻게 읽어야 하는지는 아래
[해석](#네이티브를-다시-빌드하지-않은-것의-양면)에 적는다.

**번들 동일성 확인**: `.app` 안과 워크트리 `dist/`가 `sha256 42b8173cbf8e6979…`로 같다.
**해시는 캡처 기록에 남은 자리까지만 옮겨 적었다** — 뒤가 잘려 있고 채우지 않는다.

**기준선 번들이 289,051 B로 나왔다.** 이 값은 앞 회차가 「이번」으로 적은 크기와 같다
([판정 낱말에 testid가 붙는다 — 01](verdict-label-testid-iphone-17-pro-simulator-01.md)의
289,051 B). 그 변경이 `main`에 들어간 뒤의 크기와 맞아떨어지는 자리라, **기준선이 낡은
`dist/`의 산출이 아니라는 것이 이 대조로 확인된다.** 앞 회차들이 반복해 넘어진 자리가
여기다(같은 기록의 ⚠ 절).

**두 캡처가 서로 다른 캡처다.** `paintEnd` 대조는 이번에 하지 못했다 — **기준선 쪽
`paintEnd`가 이 기록에 옮겨 적을 형태로 남아 있지 않다.** 대신 `totalBytes`(610,000 대
610,512) · `mainThreadRuntimeBytes`(557,424 대 557,936) · `appBytes`(37,390,616 대
37,701,936) · `lynxFcp`가 모두 갈려 있어 **한 캡처를 두 번 옮겨 적은 것이 아니라는
것까지는 확인된다.** 앞 회차에 값이 통째로 같아 폐기한 적이 있어 이번에도 확인했다
([학습형 매핑 — 01](learning-form-mapping-iphone-17-pro-simulator-01.md)).

## 대상 변경

`apps/mobile/src/screens/journey-map/journey-map.ts`에 **유닛 층이 하나 섰다.**
좌표가 아니라 심볼 이름으로 가리킨다.

- `JourneyUnit` 판별 union(`standard` · `special`)과 `journeyUnits` 목록이 새로 섰다.
- `standardUnitSteps`가 새로 섰다 — 유닛 목록에서 일반 유닛의 스텝만 목록 순서대로 이어
  낸다. 특별 유닛의 기여는 0이다.
- `journeySteps`가 **리터럴 배열에서 파생값으로 바뀌었다** — 이제
  `standardUnitSteps(journeyUnits)`다. **타입도 값도 순서도 파생 전과 문자 그대로
  같다**(오늘 `journeyUnits`의 특별 유닛 항목이 0건이기 때문이다).
- **새 화면 0건 · 새 요소 0건 · 새 속성 0건 · CSS 델타 0건.** 그릴 것에 손대지 않았다.
- `App.tsx`와 `learningFormByStep`에 붙은 것은 **주석뿐**이다. 배정과 표의 값이 안 바뀌었다.
- 근거는 `LIB-249` 계약 §1.1·§1.2와
  [ADR-0024](../../adr/0024-journey-units-and-special-unit-placement.md)다.

**이 회차가 재는 구간은 홈 탭까지의 초기 로드이고, 그 구간에서 여정 맵은 서지 않는다.**
그래서 이 기록이 답하는 물음은 **「맵이 읽는 값을 리터럴에서 파생으로 바꾼 것이 초기
로드에 얼마를 더했는가」**다. 값 자체가 같으므로 물음은 **모듈 층의 보유**로 좁혀진다.

## 시나리오

- 전제: 앱을 **지우고 다시 깐 뒤** `--performance-capture`로 실행한다. 글자 크기 기본.
- 단계: 홈 탭이 뜰 때까지 둔다. 조작하지 않는다.
- 관찰 구간: `loadBundle` 시작부터 첫 paint까지와 직후 메모리 snapshot.
- 두 조건(`main` 기준선 · 이번 번들)에서 위 절차를 각각 한 번씩 돈다.

## 분석 결과

### 기준선 — `main` (`d8baa53`, 번들 289,051 B)

```text
Rendering
  FCP loadBundle: lynxFcp 127.904 ms, fcp 128.289 ms

Memory
  after-initial-load [complete]: totalBytes 610000 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 557424 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 37390616 bytes,
    elementNodeCount 30 nodes
```

**기준선의 `LoadBundle` 단계 분해는 이 기록에 없다.** 옮겨 적을 형태로 남아 있지 않아
비워 둔다 — **추정하거나 `0`으로 쓰지 않는다.** 그래서 앞 회차들이 쓴 「같은 캡처 안에서
`loadBundle`·`layout`과 부호가 갈린다」는 대조를 **이번엔 할 수 없다.** 아래
[`lynxFcp` 절](#lynxfcp-차-36788-ms를-개선으로-읽지-않는다)이 다른 근거를 쓴다.

### 이번 — `LIB-249` (`0218bed`, 번들 289,225 B)

```text
Rendering
  FCP loadBundle: lynxFcp 91.116 ms, fcp 91.523 ms
  LoadBundle loadBundle: loadBundle 25.53 ms, parse 2.811 ms, loadBackground 7.327 ms,
    pipeline 91.126 ms, mtsRender 2.482 ms, resolve 1.597 ms, layout 11.025 ms,
    paintingUiOperationExecute 6.234 ms, layoutUiOperationExecute 0.723 ms;
    paintEnd 1788830979715.761 ms

Memory
  after-initial-load [complete]: totalBytes 610512 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 557936 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 37701936 bytes,
    elementNodeCount 30 nodes
```

## 비교

- 기준 기록: 이 회차 안의 `main` (`d8baa53`) 캡처. 같은 시뮬레이터·OS·SDK·호스트
  바이너리에서 연달아 떴다.

| | 기준(`main`) | 이번 | 차 |
|---|---|---|---|
| 번들 | 289,051 B | 289,225 B | **+174 B** |
| `totalBytes` | 610,000 | 610,512 | **+512** |
| `mainThreadRuntimeBytes` | 557,424 | 557,936 | **+512** |
| `elementBytes` · `viewBytes` · `elementNodeCount` | 31,200 · 21,376 · 30 | 31,200 · 21,376 · 30 | **전부 0** |
| `backgroundThreadRuntimeBytes` | 0 | 0 | **0** |
| `lynxFcp` | 127.904 ms | 91.116 ms | −36.788 ms |
| `appBytes` | 37,390,616 | 37,701,936 | **차를 적지 않는다**(아래 해석) |

## 해석

### 늘어난 보유가 또 전부 런타임 한 곳이다 — 여섯 회차 연속

**`totalBytes` 증가분과 `mainThreadRuntimeBytes` 증가분이 정확히 같은 +512다.**
**element·view 쪽으로는 한 바이트도 안 갔다.**

**보유가 늘어난 앞 회차들에서도 이 둘이 같은 값으로 움직였다.** 각 회차 기록의 비교
표에서 직접 확인해 인용했다.

| 회차 | `totalBytes` = `mainThreadRuntimeBytes` 증가분 |
|---|---|
| [학습형 결선 — 01](learning-form-wiring-iphone-17-pro-simulator-01.md) | +47,856 |
| [문화 학습 화면 — 01](culture-screen-iphone-17-pro-simulator-01.md) | +8,112 |
| [문화 퀴즈 화면 — 01](culture-quiz-screen-iphone-17-pro-simulator-01.md) | +18,000 |
| [나가기가 맵에 닿는다 — 01](exit-reaches-map-iphone-17-pro-simulator-01.md) | +176 |
| [문항 종료 전이 발화 — 01](complete-transition-announce-iphone-17-pro-simulator-01.md) | +1,088 |
| **이번** (`LIB-249`) | **+512** |

**여섯 회차 연속으로 늘어난 보유가 메인 스레드 런타임 한 곳에 전부 앉는다.**

「모듈 그래프에 코드가 조금 들어왔고, 그 코드가 아무 요소도 만들지 않았다」와 자릿수·
방향이 맞는다 — 번들 **+174 B**에 런타임 **+512**다.

**⚠ 연속을 「매번 늘었다」로 읽으면 안 된다.** 사이에 보유가 **0**으로 나온 회차들이
있고([제목 특성이 붙는다 — 01](heading-trait-axis-iphone-17-pro-simulator-01.md) ·
[판정 낱말에 testid가 붙는다 — 01](verdict-label-testid-iphone-17-pro-simulator-01.md)),
그 회차들은 이 표에 들어오지 않는다. 이 표가 말하는 것은 **「보유가 늘었을 때 그 보유가
어디에 앉느냐」**뿐이다.

### 요소 셋이 또 0이다 — ⚠ 이번엔 이유가 앞 회차들과 또 다르다

**`elementBytes` · `viewBytes` · `elementNodeCount` 셋이 기준과 정확히 같다.**

**⚠ 같은 숫자가 같은 이유로 나온 것이 아니다.** 앞 회차들이 이미 이유가 갈렸고, **이번은
그 갈린 이유들과 또 다르다.** 각 회차의 문면을 열어 확인해 옮긴다.

| 회차 | 요소 셋이 0인 이유 |
|---|---|
| [학습형 결선 — 01](learning-form-wiring-iphone-17-pro-simulator-01.md) (`LIB-239`) | **새 화면 둘이 모듈 그래프에 들어왔지만 홈 탭에서 그려지지 않는다.** 「코드는 들어왔고 실행은 안 됐다」 |
| [문화 학습 화면 — 01](culture-screen-iphone-17-pro-simulator-01.md) (`LIB-238`) · [문화 퀴즈 화면 — 01](culture-quiz-screen-iphone-17-pro-simulator-01.md) (`LIB-244`) | **새 화면이 섰는데 도달 불가라 안 그려졌다.** 배정 때문에 닿는 경로가 0개였다 |
| [나가기가 맵에 닿는다 — 01](exit-reaches-map-iphone-17-pro-simulator-01.md) (`LIB-245`) | **화면이 아예 안 늘었다.** 바뀐 것은 항해 전이 하나이고 그 전이는 초기 로드에 안 밟힌다 |
| [제목 특성이 붙는다 — 01](heading-trait-axis-iphone-17-pro-simulator-01.md) (`LIB-243`) · [판정 낱말에 testid가 붙는다 — 01](verdict-label-testid-iphone-17-pro-simulator-01.md) (`LIB-251`) | **속성 하나라 런타임 보유까지 0이었다.** 요소 셋만 0인 것이 아니라 `totalBytes`도 안 움직였다 |
| [문항 종료 전이 발화 — 01](complete-transition-announce-iphone-17-pro-simulator-01.md) (`LIB-247`) | **홈 탭 초기 로드에 완료 상태가 없다.** 코드가 들어왔고 그 코드가 도는 전이가 이 구간에 없다 |
| **이번** (`LIB-249`) | **그리는 값이 문자 그대로 같다.** 화면도 요소도 속성도 안 늘었고, `journeySteps`가 리터럴에서 파생으로 바뀌었을 뿐 **타입도 값도 순서도 같다.** 특별 유닛 항목이 오늘 0건이라 `standardUnitSteps`가 내는 것이 파생 전 리터럴과 같다 |

**이번 이유가 앞 회차들과 어디서 갈리는지가 이 기록의 값이다.**

- **`LIB-239`·`LIB-238`·`LIB-244`와 다르다** — 저 회차들은 **새 화면이 들어왔고 그것이
  안 그려진 것**이다. 이번엔 **들어온 화면이 없다.**
- **`LIB-245`와 다르다** — 저 회차는 **바뀐 전이가 초기 로드에 안 밟힌 것**이다. 이번엔
  전이를 건드리지 않았다.
- **`LIB-247`과 다르다 — 여기가 가장 크게 갈리는 자리다.** 저 회차의 0은 **「코드가
  실행되지 않았다」**였다. **이번은 실행됐다.** `journeySteps`가 모듈 층 상수라
  `standardUnitSteps(journeyUnits)`는 **번들이 로드될 때 돈다** — 초기 로드 안이다.
  **돌았는데 결과가 파생 전과 같아서 요소 셋이 0인 것**이고, 이것은 「안 돌아서 0」과
  다른 사건이다.
- **`LIB-243`·`LIB-251`과 다르다** — 저 회차들은 **런타임 보유까지 0**이었다. 속성 하나는
  보유를 안 만들었다. **이번은 보유가 +512만큼 늘었다** — `journeyUnits` 목록과
  `JourneyUnit`을 다루는 함수가 모듈 그래프에 남는다. **값이 같아도 그 값을 만드는 층이
  새로 있고, 그 층이 보유를 진다.**

**그래서 「또 0이 나왔다」로 묶어 읽으면 안 된다.** 이번의 0은
**「실행된 코드가 파생 전과 같은 값을 냈다」**이고, **특별 유닛 항목이 목록에 들어오는
날의 요소 셋은 이 기록이 답하지 않는다.** 그 항목은 오늘 0건이고, 그 유닛으로 가는
화면은 아직 서지 않았다.

### `lynxFcp` 차 −36.788 ms를 개선으로 읽지 않는다

**⚠ 개선이 아니다. 이 차를 개선으로 적으면 거짓이다.** 이번 변경은 모듈 층에 코드를
**더했고**, 번들이 +174 B, 보유가 +512 늘었다. **코드가 늘었는데 파이프가 37 ms
빨라졌다는 인과를 이 기록이 제시하지 못한다.**

**튄 쪽은 기준선이다.** 이번 값 91.116 ms는 같은 절차의 다른 회차들이 본 범위 안이고,
기준선 127.904 ms가 그 범위에서 **30 ms 넘게 벗어나 있다.** 각 회차 기록에서 확인해
옮긴다.

| 회차 | 기준선 `lynxFcp` | 이번 `lynxFcp` |
|---|---|---|
| [학습형 결선 — 01](learning-form-wiring-iphone-17-pro-simulator-01.md) | 85.329 ms | 87.871 ms |
| [문화 학습 화면 — 01](culture-screen-iphone-17-pro-simulator-01.md) | 90.205 ms | 86.392 ms |
| [문화 퀴즈 화면 — 01](culture-quiz-screen-iphone-17-pro-simulator-01.md) | 86.719 ms | 89.935 ms |
| [나가기가 맵에 닿는다 — 01](exit-reaches-map-iphone-17-pro-simulator-01.md) | 86.339 ms | 88.722 ms |
| [제목 특성이 붙는다 — 01](heading-trait-axis-iphone-17-pro-simulator-01.md) | 90.693 ms | 88.609 ms |
| [문항 종료 전이 발화 — 01](complete-transition-announce-iphone-17-pro-simulator-01.md) | 96.996 ms | 91.354 ms |
| [판정 낱말에 testid가 붙는다 — 01](verdict-label-testid-iphone-17-pro-simulator-01.md) | 89.247 ms | 90.482 ms |
| **이번** (`LIB-249`) | **127.904 ms** | **91.116 ms** |

**이 표에서 이번 91.116 ms는 눈에 띄지 않는다. 눈에 띄는 것은 기준선 127.904 ms다.**
**그러니 이 회차가 실제로 잰 것은 「이번이 빨라졌다」가 아니라 「기준선 캡처 하나가
30 ms 넘게 튈 수 있다」다.** 그것이 이 숫자의 값이다.

**이 축은 회차 하나로 판정을 못 진다.** 회차가 01 하나뿐이고 같은 조건을 반복해 재지
않았다. **단일 회차라 이 차가 신호인지 잡음인지 판정할 수 없다** — 그것이 이 기록의
한계다. 조건당 캡처가 한 번씩이라, 이번 −36.788 ms는
**변경의 몫과 캡처의 흔들림을 가르지 못한다.** 그리고 그 흔들림의 크기가
**이 회차가 재는 차보다 크다** — 잡음이 신호를 삼키는 자리를 이번 캡처가 직접 보여줬다.
같은 방향의 관측이 이 저장소에 이미 있다
([걷어낸 죽은 숨김 — 01](dead-hide-removal-iphone-17-pro-simulator-01.md)이 같은 노드
수에서 약 55 ms 산포를 적었다).

**이번엔 기준선의 단계 분해가 없어 대조가 더 좁다.** 앞 회차들은 같은 캡처 안에서
`loadBundle`·`layout`의 부호가 갈리는 것을 보고 잡음이라 했는데, **이번엔 기준선 쪽
분해가 없어 그 대조를 못 했다.** 그만큼 이 차에 대해 말할 수 있는 것이 더 적다.

**`appBytes`도 같은 이유로 차를 적지 않는다.** **프로세스 전체 상주량이라 Lynx 밖의
요인이 섞인다** — 앞 회차들이 런타임 보유가 0으로 안 움직인 캡처에서도 이 값이
십수만 바이트씩 흔들리는 것을 기록했다
([판정 낱말에 testid가 붙는다 — 01](verdict-label-testid-iphone-17-pro-simulator-01.md)의
−196,584 · [나가기가 맵에 닿는다 — 01](exit-reaches-map-iphone-17-pro-simulator-01.md)의
−147,456). **차를 적으면 그 자릿수가 이번 변경의 몫으로 읽힌다.** 그래서 위 비교 표는
두 raw 값만 두고 차를 비워 뒀다.

### 네이티브를 다시 빌드하지 않은 것의 양면

**둘 다 적는다. 한쪽만 적으면 다음 사람이 반대쪽으로 넘어진다.**

- **통제가 좋다.** 네이티브 호스트가 두 캡처에서 **상수**이므로 위 차가 **전부 JS 번들
  몫으로 격리된다.** 바뀐 변수가 하나다.
- **다만 네이티브를 다시 빌드한 회차들과 절차가 다르다.** 이 기록의 수치를 그 표에
  그대로 이어 붙이면 「같은 절차의 시계열」로 읽힌다 — **그렇지 않다. 이어 붙일 수 없다.**

**이 절차의 회차는 이제 여덟이다.** 여덟이 됐다는 것은 **같은 절차끼리 이어 붙일 수
있다는 뜻이고, 그 여덟으로 추세를 말할 수 있다는 뜻이 아니다** — 조건당 캡처가 여전히
한 번씩이다. **이번 기준선의 튐이 그것을 다시 보여준다.**

### 이 기록이 판정하지 않는 것

**예산 판정이 아니다.** 이 저장소에 번들·성능 예산이 아직 없다
([ADR-0018 D5](../../adr/0018-lynx-performance-analysis-boundary.md) ·
[`docs/adr/README.md`](../../adr/README.md)의 보류 표에서 「성능 회귀 예산」 행이 아직
열려 있다). **+174 B가 커서 문제인지 작아서 괜찮은지를 가를 근거가 저장소에 없다.**
그래서 이 기록은 **측정과 대비만 적고 판정을 적지 않는다.**

**특별 유닛이 목록에 들어온 뒤의 수치는 이 기록에 없다.** 오늘 `journeyUnits`의 특별
유닛 항목은 0건이고, 그 항목이 지는 필드와 맵의 노드 컴포넌트는 아직 서지 않았다
([ADR-0024](../../adr/0024-journey-units-and-special-unit-placement.md)). **그날의 요소
셋과 보유는 다시 재야 한다.**

**맵이 실제로 그려질 때의 보유도 이 기록에 없다.** 이 회차가 잰 것은 **여정 맵이 서지
않는 구간**이다.

## Trace 후속 확인

- **render** — `lynxFcp` −36.788 ms. 호스트 바이너리를 고정한 여덟째 회차라 조건은
  좋지만 **기준선 쪽이 같은 절차의 다른 회차 범위에서 30 ms 넘게 벗어났고, 기준선의
  단계 분해도 없다.** 단계별 분해로 넘어갈 근거가 아니다.
- **fluency** — 이 회차의 대상이 아니다. 조작 구간 없이 초기 로드만 쟀다.
- **memory** — `after-initial-load` 하나뿐이다. **요소 셋이 0, 런타임이 +512로 갈린
  형태다.** 특별 유닛 항목이 들어온 뒤의 보유는 이 기록이 답하지 않는다.
- **NativeModule** — 이 변경이 새로 부르는 네이티브 모듈이 없다.

## 결론과 후속

- **결론: 여정을 유닛 층(`JourneyUnit` · `journeyUnits` · `standardUnitSteps`)으로 세우고
  `journeySteps`를 그 파생값으로 바꾼 변경은 초기 로드 구간에서 번들 +174 B, 런타임
  +512로 나타나고 요소 트리를 한 바이트·한 노드도 안 바꿨다.** 비교 기준은
  `main`(`d8baa53`)의 289,051 B다.
- **`totalBytes` 증가분과 `mainThreadRuntimeBytes` 증가분이 정확히 같다** — 늘어난
  보유가 **전부 메인 스레드 런타임 한 곳**이고 element·view로는 한 바이트도 안 갔다.
  **여섯 회차 연속 같은 모양이다.**
- **⚠ 요소 셋의 0은 앞 회차들의 0과 또 다른 이유다.** 앞 회차들은 「새 화면이 안
  그려졌다」·「전이가 안 밟혔다」·「코드가 실행되지 않았다」·「속성이라 보유를 안
  만들었다」였다. **이번은 코드가 실행됐고, 그 결과가 파생 전과 문자 그대로 같다.**
- **⚠ `lynxFcp` −36.788 ms를 개선으로 읽지 않는다.** **튄 쪽은 기준선(127.904 ms)이고**
  이번 값(91.116 ms)이 같은 절차의 다른 회차 범위 안이다. **코드가 늘었는데 37 ms
  빨라졌다는 인과가 없다.** 이 숫자가 실제로 보여주는 것은 **캡처 하나가 30 ms 넘게
  튄다는 것**이고, **그 흔들림이 이 회차가 재는 차보다 크다.** 이 축은 회차 하나로
  판정을 못 진다.
- **`appBytes`는 차를 적지 않았다.** 프로세스 전체 상주량이라 Lynx 밖의 요인이 섞이고,
  앞 회차들이 십수만 바이트 흔들림을 이미 기록했다.
- **네이티브를 다시 빌드하지 않고 번들만 교체했다.** 그래서 위 차가 전부 JS 몫으로
  격리되고, 동시에 **네이티브를 다시 빌드한 회차 표에는 이어 붙일 수 없다.** 이 절차의
  회차는 이제 여덟이다.
- **예산 판정을 내리지 않는다.** 가를 근거가 저장소에 없다.

후속 셋:

1. **같은 조건을 여러 번 재는 회차.** 같은 후속이 또 남고, **이번엔 그것이 가장 크게
   아쉬웠다** — 기준선 한 점이 튀는 바람에 시간 축에서 말할 수 있는 것이 거의 없었다.
2. **기준선 캡처를 버릴 기준.** 이번 기준선은 같은 절차의 다른 회차 범위 밖인데도
   **버릴 규칙이 없어 그대로 실었다.** 규칙이 없는 한 이런 캡처가 계속 표에 들어온다.
3. **번들·성능 예산.** [`docs/adr/README.md`](../../adr/README.md) 보류 표의 「성능 회귀
   예산」 행이 열려 있는 한 이런 값은 계속 판정 없이 쌓인다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다 — **워크트리 경로를 본문에 적지 않았다.**
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] `미측정` 기록을 baseline이나 성능 통과로 표현하지 않았다 — 이 기록은 측정이다.
- **예산 판정이 아니다.** 확인되지 않은 자리(측정 일시의 분, 잘린 sha256 뒷부분, 기준선의
  `LoadBundle` 단계 분해와 `paintEnd`)를 채우지 않았다.
