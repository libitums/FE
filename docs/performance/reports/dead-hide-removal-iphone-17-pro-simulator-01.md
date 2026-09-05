# 죽은 가림 제거 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 회차 시뮬레이터 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-05T20:21+09:00
- 상태: 측정 — `performance:capture`로 수집했다.
- 기능 PR: LIB-237 — 리뷰가 남긴 작은 둘
- 대상 commit: `a1443b5`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1
- 빌드: **Release**, 내장 `main.lynx.bundle`, 번들 213,627 bytes
- 실행 회차: 01

**번들 동일성 확인**: `.app` 안과 `apps/ios/`가 같다 (`ae18ca32d419eaf7…`).
**설치는 지우고 다시 깔았다** — 앞 회차에서 그 차이가 변수로 드러났다.

## 시나리오

- 전제: 앱을 지우고 다시 깐 뒤 `--performance-capture`로 실행. 글자 크기 기본.
- 단계: 홈 탭이 뜰 때까지 둔다. 조작하지 않는다.
- 관찰 구간: `loadBundle` 시작부터 첫 paint까지와 직후 메모리 snapshot.

**이 변경이 걷은 것은 죽은 선언 다섯과 `null` 정규화 셋이다.** 요소는 하나도 안
사라졌고 보이는 것도 안 바뀐다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 92.942 ms, fcp 93.326 ms
  LoadBundle loadBundle: loadBundle 24.162 ms, parse 1.699 ms,
    loadBackground 5.326 ms, pipeline 92.953 ms, mtsRender 2.252 ms,
    resolve 1.482 ms, layout 11.879 ms,
    paintingUiOperationExecute 5.74 ms, layoutUiOperationExecute 0.55 ms

Memory
  after-initial-load [complete]: totalBytes 534480 bytes,
    elementBytes 31200 bytes, viewBytes 21376 bytes,
    mainThreadRuntimeBytes 481904 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 36768048 bytes, elementNodeCount 30 nodes;
    instances 1/1; collection 1 ms
```

## 비교

- 기준 기록: [문장 순서·단어 선택 도입 — 01](learning-forms-iphone-17-pro-simulator-01.md)
  (`843b87f`, Release, 같은 시뮬레이터·OS·SDK)

| | 기준 | 이번 | 차 |
|---|---|---|---|
| `elementNodeCount` | 30 | **30** | **0** |
| `elementBytes` | 31,200 | **31,200** | **0** |
| `viewBytes` | 21,376 | **21,376** | **0** |
| `mainThreadRuntimeBytes` | 481,968 | 481,904 | **−64** |
| `totalBytes` | 534,544 | 534,480 | **−64** |
| 번들 | 213,653 B | 213,627 B | **−26 B** |
| `lynxFcp` | 145.728 ms | 92.942 ms | −52.786 ms |

## 해석

### −26 바이트가 죽은 선언 다섯의 무게다

`accessibility-elements-hidden={true}` 다섯 개와 그 자리의 JSX 속성 표기가
사라진 만큼이다. **런타임 −64 바이트도 같은 방향이다.**

**요소 트리 셋이 기준과 정확히 같다** — 요소는 하나도 안 사라졌다. **걷은 것은
속성이지 노드가 아니다.**

### 이 수정의 값은 바이트가 아니다

**26 바이트는 이 변경의 이유가 아니다.** 이 변경이 막는 것은 두 가지다 —

- **`announce`가 던지던 경로.** `null` 정규화 전에는 `host.accessibilityAnnounce(...)`
  가 `TypeError`를 냈고, 그 호출이 `AssessmentScreen.tsx:62`·`SentenceOrderScreen.tsx:83`
  의 `useEffect` 안이라 **try/catch 없이 ErrorBoundary까지 올라가 화면이 에러 상태로
  바뀌었다.** 지금은 그 경로가 없다.
- **다음 사람이 죽은 선언을 보고 규약을 유추하는 것.** 다섯 자리가 `ADR-0016 D5`를
  읽고 생겼고 그 규약을 함께 고쳤다.

**둘 다 성능 축이 아니다.** 이 기록이 답하는 것은 **「구조가 안 변했다」** 하나다.

### 이 기록의 한계 — 시간에 대해서는 아무것도 판정할 수 없다

여섯 회차의 `lynxFcp`가 노드 30으로 같은데 **92.9~147.6, 약 55 ms**로 흔들린다.

| 회차 | commit | `lynxFcp` | 설치 |
|---|---|---|---|
| 스크롤 영역 | `77aa4779` | 122.622 ms | 덮어쓰기 |
| 평가 화면 | `53b16c4` | 147.598 ms | 덮어쓰기 |
| 낭독 순서 | `4b196a3` | 136.272 ms | 덮어쓰기 |
| 문장 순서·단어 선택 | `843b87f` | 145.728 ms | 덮어쓰기 |
| 학습형 매핑 | `8841fc9` | 99.759 ms | **지우고 깔기** |
| 이번 | `a1443b5` | 92.942 ms | **지우고 깔기** |

**설치 방식이 갈리는 자리에서 값이 갈린다** — 덮어쓰기 넷이 122.6~147.6이고 지우고
깔기 둘이 92.9~99.8이다. **두 점씩이라 단정할 수 없지만 가설로는 적어 둘 값이 있다.**

**「52 ms 개선」으로 읽으면 안 된다.** 이 변경은 속성 다섯을 걷었을 뿐이고 **초기
화면의 렌더 경로에 아무것도 안 한다.**

**시간 수치를 다음 회차의 기준선으로 쓰지 마라.** 메모리 다섯 값과 번들 크기만
대조에 쓸 수 있다 — 그 둘은 결정적이고 재현된다.

## Trace 후속 확인

- **render** — 여섯 점의 산포가 55 ms다. **설치 방식이 변수라는 가설이 두 점씩으로
  섰다. 같은 커밋을 두 방식으로 각각 재면 갈린다.**
- **fluency** — 대상이 아니다.
- **memory** — 다섯 값 중 셋이 동일하고 둘이 −64다. **구조가 안 바뀐 것이 실측됐다.**
- **NativeModule** — `announce`의 실패 경로가 사라졌지만 **초기 로드에서는 안 불린다**
  (평가·문장 순서 화면 마운트 때 불린다). 이 기록에 그 비용이 없다.

## 결론과 후속

- **번들 −26 바이트, 런타임 −64 바이트.** 죽은 선언 다섯의 무게다.
- **요소 트리는 그대로.** 걷은 것은 속성이지 노드가 아니다.
- **이 수정의 값은 성능이 아니다** — 던지던 경로와 잘못된 규약을 막는다.
- **`lynxFcp`는 판정 불가이고 설치 방식 가설이 새로 생겼다.**

후속 둘:

1. **같은 커밋을 두 설치 방식으로 각각 잰다.** 다섯 회차째 남던 「반복 측정」 후속이
   **가설을 갖게 됐다.**
2. **「직전과 같은 값이면 의심한다」를 절차에 넣는다.** 앞 회차가 그 검사 없이 거짓
   출력을 한 번 받았다.

## 정제 확인

- `pnpm verify` exit 0 (unit 334 · ui 369 · integration 47).
- **예산 판정이 아니다.**
- **수용 기준을 닫지 않는다.**
