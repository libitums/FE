# 학습형 매핑 (결선 없음) — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 회차 시뮬레이터 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-05T20:12+09:00
- 상태: 측정 — `performance:capture`로 수집했다.
- 기능 PR: LIB-236 — 어느 스텝이 어느 학습형인지가 데이터에 없다
- 대상 commit: `8841fc9`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1
- 빌드: **Release**, 내장 `main.lynx.bundle`, 번들 213,839 bytes
- 실행 회차: 01

**번들 동일성 확인**: `.app` 안과 `apps/ios/`가 같다 (`3258c9ad661fa662…`).

## ⚠ 첫 측정을 버렸다 — 프로토콜이 통제되지 않았다

**한 번 재고 버렸다.** 그 출력이 **직전 회차(LIB-229)와 `paintEnd` 타임스탬프까지 글자 하나 안 틀리고 같았다** — `1788579610999.625 ms`. 절대 시각이 반복될 수 없으므로 **새 측정이 아니었다.**

캡처 파일을 열어 보니 **0바이트**였다. 무엇이 그 출력을 냈는지 끝까지 못 갈랐다.

**앱을 지우고 다시 깔고 다시 쟀다.** 이번 `paintEnd`는 `1788606603595.101`로 다르다 — **그것이 이 기록이 새 측정이라는 유일한 근거다.**

**교훈을 적는다** — 이 저장소의 성능 기록에 **「직전과 같은 값이 나오면 의심한다」는 절차가 없었다.** `paintEnd`가 그 검사에 쓸 수 있는 유일한 단조 증가 값이다.

## 시나리오

- 전제: 앱을 **지우고 다시 깐 뒤** `--performance-capture`로 실행한다. 글자 크기 기본.
- 단계: 홈 탭이 뜰 때까지 둔다. 조작하지 않는다.
- 관찰 구간: `loadBundle` 시작부터 첫 paint까지와 직후 메모리 snapshot.

**이 변경은 결선을 포함하지 않는다.** `App.tsx:63`이 여전히 `{ name: "listening", stepId: id }` 리터럴을 민다. **두 화면은 번들에 없고 여정 맵에서도 안 열린다.**

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 99.759 ms, fcp 100.115 ms
  LoadBundle loadBundle: loadBundle 27.582 ms, parse 2.966 ms,
    loadBackground 6.287 ms, pipeline 99.772 ms, mtsRender 2.843 ms,
    resolve 1.945 ms, layout 12.258 ms,
    paintingUiOperationExecute 6.331 ms, layoutUiOperationExecute 0.625 ms

Memory
  after-initial-load [complete]: totalBytes 534832 bytes,
    elementBytes 31200 bytes, viewBytes 21376 bytes,
    mainThreadRuntimeBytes 482256 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 37079320 bytes, elementNodeCount 30 nodes;
    instances 1/1; collection 3 ms
```

## 번들 프로브 — 양성 대조로 검증했다

**두 화면이 번들에 있는지를 문자열로 셌다. 프로브 자체를 먼저 검증했다:**

```
단계           2   ← 양성 대조. 프로브가 작동한다
듣기           2   ← 양성 대조
\xb7 (구분자)   2   ← 가운뎃점이 이스케이프된다
문장 순서       0
단어 선택       0
```

**두 화면 모듈이 통째로 tree-shake돼 있다.** 아무도 import하지 않기 때문이다 — `App.tsx`의 두 `case`가 `throw`뿐이라 컴포넌트를 안 부른다.

**⚠ 프로브를 `grep`으로 짜면 거짓 0이 나온다.** 이 번들은 `file`이 `data`로 판정하는 바이너리라 **`grep`이 매치를 침묵시킨다** — 양성 대조까지 0으로 나온다. **바이트 카운트(Python)로 세야 한다.** 식별자(`SentenceOrderScreen`)로 세는 것도 안 된다 — minify된다.

## 비교

- 기준 기록: [문장 순서·단어 선택 도입 — 01](learning-forms-iphone-17-pro-simulator-01.md)
  (`843b87f`, Release, 같은 시뮬레이터·OS·SDK)

| | 기준 | 이번 | 차 |
|---|---|---|---|
| `elementNodeCount` | 30 | **30** | **0** |
| `elementBytes` | 31,200 | **31,200** | **0** |
| `viewBytes` | 21,376 | **21,376** | **0** |
| `mainThreadRuntimeBytes` | 481,968 | 482,256 | +288 |
| `totalBytes` | 534,544 | 534,832 | +288 |
| 번들 | 213,653 B | 213,839 B | **+186 B** |
| `lynxFcp` | 145.728 ms | **99.759 ms** | **−45.969 ms** |

## 해석

### 번들 +186 바이트가 이 변경의 런타임 전부다

**`lib/learning-form.ts`는 타입 하나짜리라 런타임에 0바이트다.** `Screen` union 멤버 둘도 타입이다.

**실제로 실린 것은 둘뿐이다** — `learningFormByStep` Record(다섯 항목)와 `learningScreenFor`의 `switch`. `mainThreadRuntimeBytes` +288이 그것과 자릿수가 맞는다.

**요소 트리는 그대로다.** 초기 화면(홈)이 안 바뀌었고 새 화면은 도달 불가라 렌더되지 않는다.

### ⛔ `lynxFcp` 밴드가 앞 회차들이 본 것보다 넓다

다섯 회차를 나란히 놓으면:

| 회차 | commit | `lynxFcp` | `elementNodeCount` |
|---|---|---|---|
| 스크롤 영역 | `77aa4779` | 122.622 ms | 30 |
| 평가 화면 | `53b16c4` | 147.598 ms | 30 |
| 낭독 순서 | `4b196a3` | 136.272 ms | 30 |
| 문장 순서·단어 선택 | `843b87f` | 145.728 ms | 30 |
| **이번** | `8841fc9` | **99.759 ms** | 30 |

**요소 수가 다섯 다 30인데 `lynxFcp`가 99.8~147.6으로 흔들린다 — 폭이 약 48 ms다.**

**앞 회차가 세 점으로 「하한 25 ms」를 보였는데 그 두 배다.**

**그리고 이번 회차만 조건이 다르다 — 앱을 지우고 다시 깔았다.** 앞 넷은 덮어쓰기 설치였다. **그 차이가 45 ms를 설명하는지 이 기록은 답하지 않는다** — 한 점으로는 못 가른다.

**「45 ms 개선」으로 읽으면 안 된다.** 이 변경은 초기 화면에 아무것도 안 더한다. **읽을 수 있는 것은 「측정 프로토콜이 통제되지 않았다」 하나다.**

## Trace 후속 확인

- **render** — 다섯 점의 산포가 48 ms다. **설치 방식이 변수인지부터 갈라야 한다.**
- **fluency** — 대상이 아니다.
- **memory** — 다섯 값 중 셋이 기준과 동일하고 둘이 +288이다. **구조가 안 바뀐 것이 실측됐다.**
- **NativeModule** — 이 변경이 새로 부르는 모듈이 없다.

## 결론과 후속

- **번들 +186 바이트, 런타임 +288 바이트.** 타입은 0바이트다.
- **요소 트리는 그대로.** 새 화면은 번들에 없고 도달도 불가하다.
- **`lynxFcp`는 여전히 판정 불가이고 밴드가 더 넓어졌다.**

후속 셋:

1. **같은 커밋을 여러 번 재는 회차.** 네 회차째 같은 후속이 남는다 — 그리고 **이번에 밴드가 두 배로 넓어져 더 급해졌다.**
2. **설치 방식을 통제한다.** 지우고 깔기 vs 덮어쓰기가 변수인지 가른다.
3. **「직전과 같은 값이면 의심한다」를 절차에 넣는다.** `paintEnd`가 그 검사에 쓸 유일한 값이다.

## 정제 확인

- `pnpm verify` exit 0 (unit 344 · ui 371 · integration 47).
- **예산 판정이 아니다.**
- **수용 기준을 닫지 않는다.** LIB-236의 AC4는 결선이 없어 열린 채다.
