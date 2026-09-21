# 진입 흐름 여섯 화면 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 시뮬레이터 실행이며 성능 기준선이나 회귀 통과를 판정하지 않는다.
> ⭐ **이 변경은 초기 load의 첫 화면을 바꾼다 — 여정 맵에서 스플래시로.** 그래서 이 회차의 초기
> load 구간은 **앞선 보고서들과 같은 조건의 기준선이 아니다.** 나란히 두고 증감을 읽으면 안 되는
> 이유와 대신 비교할 수 있는 자리는 「비교」에 적었다. 관찰 구간은 초기 load(스플래시)와 진입
> 흐름을 끝까지 지난 뒤의 **여정 맵 전환**, 그리고 **설정 탭 전환**까지다.

## 실행 조건

- 측정 일시: 2026-09-17T04:36:14+09:00(캡처 시작 · 초기 load) ·
  2026-09-17T04:42:37+09:00(마지막 기록 · 설정 탭 전환)
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 새로 실행해 초기 load의 Rendering entry,
  update pipeline 두 건, Memory snapshot 세 개를 수집했다.
- 기능 PR: 없음 — LIB-261 변경이 아직 PR로 올라가지 않은 시점에 측정했다.
- 대상 commit: `ce8d121b7505491a6d9bcb82e54d8c1f9d6467e1` — 기점 commit이다. 측정한 빌드는 그 위의
  **미커밋 LIB-261 작업 트리**(제품 · 테스트 변경 전부)에서 만들었으므로, 빌드를 식별하는 값은
  아래 번들 SHA-256이다.
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, Xcode 26.6. `pnpm bundle:host`로 만든
  내장 `main.lynx.bundle` 490,126 bytes, SHA-256
  `c3405994fdb337c7a5c2291a3091adf804510e93cd36f829759d1d809b3dfa5d`(설치한 Host.app 안의 사본과
  **바이트 동일 확인**); `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 현재 작업 트리의 Release Host를 부팅된 iPhone 17 Pro 시뮬레이터에 설치한다. **토큰이 없는
  새 설치 상태**(진입 흐름이 서려면 그래야 한다), 기본 글자 크기.
- 단계: `performance:capture`의 `start`로 Host를 성능 캡처 모드로 새로 실행하고, 첫 화면
  (**스플래시**)의 `after-initial-load` memory 기록이 생길 때까지 조작하지 않는다. 이어서 진입
  흐름을 끝까지 지난다 — 온보딩에서 `다음`을 세 번, 로그인에서 **`Google로 계속하기`**, 언어
  선택에서 초기값이 아닌 항목(`English`)과 `다음`, 여정 입장에서 `여정 시작하기`. 그 뒤 바텀
  네비게이션의 `설정` 탭을 한 번 누른다. 각 탭은 시뮬레이터 접근성 트리에서 찾은 요소의 중앙
  좌표를 눌렀다. 끝으로 `report` → `stop`을 실행했다.
- 관찰 구간: 초기 `loadBundle` 시작부터 첫 paint(스플래시)까지와 직후 memory snapshot, 진입 흐름을
  빠져나오며 생긴 update pipeline(timing flag `libitum:navigation:journey`) 한 건과 직후 snapshot,
  설정 탭 전환이 만든 update pipeline(`libitum:navigation:settings`) 한 건과 직후 snapshot.

**⚠ 진입 흐름 안의 전환 다섯은 관찰 구간 밖이다.** 온보딩 · 로그인 · 언어 선택 · 여정 입장으로
가는 전환은 **캡처 기록을 한 줄도 늘리지 않았다** — 이 앱의 timing flag는 **선택된 바텀
네비게이션 항목에만** 붙고 Host는 `libitum:navigation:*` flag가 달린 pipeline 뒤에만 memory를
조회하기 때문이다. 탭 안 `push`가 같은 이유로 안 담겼던 것(알림 · 프로필 · 약관)과 **같은
자리**이고, 진입 구간은 **탭 밖**이라 그 자리가 한 겹 더 넓어졌다. ⭐ **다만 진입 흐름의 마지막
전환은 담겼다** — `여정 시작하기`가 `entry`를 비우고 여정 탭으로 들어가면서
`libitum:navigation:journey`가 붙는다.

**⚠ 코드 검증 화면은 이 회차에서 렌더되지 않았다.** 로그인에서 `Google로 계속하기`를 골라
**코드 검증을 건너뛰는 경로**로 지났기 때문이다(전화번호 경로에서만 서는 화면이다). 그 화면의
렌더 비용과 소프트 키보드가 뜬 상태의 값은 이 회차에 없다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 147.806 ms, fcp 148.247 ms
  LoadBundle loadBundle: loadBundle 45.431 ms, parse 2.093 ms,
    loadBackground 9.174 ms, pipeline 147.818 ms, mtsRender 2.039 ms,
    resolve 2.349 ms, layout 30.737 ms,
    paintingUiOperationExecute 7.043 ms, layoutUiOperationExecute 0.398 ms
  Pipeline updateTriggeredByBts (libitum:navigation:journey): pipeline 12.184 ms,
    mtsRender 0.991 ms, resolve 1.434 ms, layout 3.319 ms,
    paintingUiOperationExecute 2.369 ms, layoutUiOperationExecute 1.716 ms
  Pipeline updateTriggeredByBts (libitum:navigation:settings): pipeline 10.796 ms,
    mtsRender 0.57 ms, resolve 2.602 ms, layout 2.733 ms,
    paintingUiOperationExecute 1.89 ms, layoutUiOperationExecute 1.356 ms

Memory
  after-initial-load [complete]: totalBytes 795072 bytes, elementBytes 9360 bytes,
    viewBytes 6016 bytes, mainThreadRuntimeBytes 779696 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 37554456 bytes,
    elementNodeCount 9 nodes; status completed; instances 1/1; collection 1 ms
  after-navigation-journey-01 [complete]: totalBytes 956656 bytes, elementBytes 73840 bytes,
    viewBytes 49280 bytes, mainThreadRuntimeBytes 833536 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 55380416 bytes,
    elementNodeCount 71 nodes; status completed; instances 1/1; collection 0 ms
  after-navigation-settings-01 [complete]: totalBytes 908000 bytes, elementBytes 47840 bytes,
    viewBytes 33024 bytes, mainThreadRuntimeBytes 827136 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 56494528 bytes,
    elementNodeCount 46 nodes; status completed; instances 1/1; collection 0 ms
  Delta after-initial-load -> after-navigation-settings-01: totalBytes +112928 bytes,
    elementBytes +38480 bytes, viewBytes +27008 bytes, mainThreadRuntimeBytes +47440 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes +18940072 bytes, elementNodeCount +37 nodes
```

## 비교

- 기준 기록: [설정 보고서](settings-iphone-17-pro-simulator-01.md) — 같은 기기 · 같은 OS · 같은
  Lynx SDK다. ⚠ **그러나 초기 load는 같은 조건이 아니다** — 그 회차의 첫 화면은 **여정 맵**이고 이
  회차의 첫 화면은 **스플래시**다. 이 변경이 바꾼 것이 정확히 그것이므로, **두 초기 load의
  증감을 성능 변화로 읽으면 안 된다.** 아래 수치는 「무엇이 달라졌나」를 적는 것이지 개선·회귀가
  아니다.
- **초기 load에서 그리는 것이 줄었다** — 첫 화면이 바뀌었으니 당연한 결과다.
  `elementNodeCount` **71 → 9**, `elementBytes` 73,840 → **9,360**, `viewBytes` 49,280 → **6,016**.
  스플래시는 텍스트 둘과 그것을 담는 상자들뿐이다.
- **상주 코드는 늘었다.** `mainThreadRuntimeBytes` 755,808 → **779,696**(+23,888), 내장 번들
  418,798 → **490,126 bytes**(+71,328). 화면 여섯과 순수 모듈들이 번들에 들어온 만큼이다.
  `totalBytes`는 878,928 → **795,072**로 줄었는데, 이것은 **트리가 작아진 쪽이 코드가 늘어난 쪽보다
  컸기 때문**이지 메모리가 개선된 것이 아니다.
- 시간 값: `pipeline` 135.023 → **147.818 ms**, `fcp` 135.362 → **148.247 ms**,
  `loadBundle` 50.676 → **45.431 ms**, `layout` 30.847 → **30.737 ms**. **첫 화면이 다르고 번들
  크기도 다르므로 이 차이를 회귀로 읽지 않는다.** 게다가 각각 단일 실행이라 분산과 구별되지 않는다.
- ⭐ **같은 조건으로 비교할 수 있는 자리가 하나 생겼다 — 여정 맵 자신이다.**
  이 회차에서 여정 맵은 초기 load가 아니라 `libitum:navigation:journey` 전환으로 선다. 그 직후
  snapshot이 `elementNodeCount` **71** · `elementBytes` **73,840** · `viewBytes` **49,280**으로
  **앞 회차의 초기 load 값과 바이트까지 같다.** ⇒ **여정 맵이 그리는 트리는 한 노드도 바뀌지
  않았고, 바뀐 것은 그것이 첫 화면이 아니게 됐다는 것뿐이다.**
- 설정 탭 전환: 앞 회차 21.399 ms · 이 회차 **10.796 ms**. **출발·도착 화면이 같다**(여정 맵 →
  설정)는 점에서 비교 가능한 자리지만, 이 회차의 설정 전환은 **세션의 두 번째 전환**(앞에 여정
  전환이 있었다)이고 앞 회차는 첫 전환이었다. **단일 실행 둘이라 증감을 판정하지 않는다.**
  전환 뒤 트리는 `elementNodeCount` **46** · `elementBytes` **47,840** · `viewBytes` **33,024**로
  앞 회차와 **바이트까지 같다** — 설정 화면도 이 변경에 안 바뀌었다.
- 이 값들은 각각 단일 실행의 관측값이며 개선 · 회귀나 예산 통과를 판정할 자료가 아니다.

## 해석

초기 load의 `pipeline`은 147.818 ms였고 그 안에서 `loadBundle` 45.431 ms, `layout` 30.737 ms였다.
**이 회차의 초기 load가 그리는 것은 스플래시 하나이고 element node가 9개뿐**인데도 `layout`이 앞
회차(트리가 71 노드)와 거의 같다(30.847 → 30.737 ms). ⇒ **이 구간의 비용은 그리는 트리의 크기가
아니라 번들을 읽고 런타임을 세우는 쪽이 지배한다**는 읽기가 가능하다. 다만 **단일 실행 둘의
비교라 이것을 결론으로 고정하지 않는다** — 같은 조건의 회차를 더 쌓아야 한다.

`mainThreadRuntimeBytes`의 +23,888 bytes는 번들 증가(+71,328 bytes)와 같은 방향이다. **첫 화면에서
그 코드 대부분은 실행되지도 렌더되지도 않는다** — 늘어난 것은 상주 비용이지 초기 렌더 비용이
아니다. 이 회차에서 진입 흐름 전체를 지나 여정 맵에 닿았을 때
`mainThreadRuntimeBytes`가 833,536으로 더 올랐는데, 그 안에는 지나온 화면 다섯의 실행 흔적이
섞여 있어 **어느 화면의 몫인지 이 수치로 가를 수 없다.**

진입 흐름을 빠져나오는 전환(`libitum:navigation:journey`)의 `pipeline`은 12.184 ms였다. 이
update에는 **진입 화면의 언마운트와 여정 맵 전체의 첫 렌더, 그리고 바텀 네비게이션의 등장**이
함께 들어 있다. 전환 뒤 element node는 9개에서 71개로(+62) 늘었다.

말할 수 없는 것: 진입 흐름 **안**의 전환 다섯의 렌더 비용(관찰 구간 밖 — 위 시나리오) ·
**코드 검증 화면**의 렌더 비용과 그 상태의 memory(이 회차가 건너뛴 경로다) · **소프트 키보드가
뜬 상태**의 레이아웃 비용(시뮬레이터에서 재지 않았다) · 반복 실행 분산 · 실제 iPhone에서의 값 ·
큰 글자 배율에서의 레이아웃 비용 · 스플래시 고정 시간이 사용자 체감에 더하는 몫(그 값은 성능이
아니라 계약이 고정한 상수다). 단일 실행이고 초기 load 쪽은 **같은 조건의 앞선 기록이 아예
없으므로**, 이 수치를 일반화하거나 성능 통과 · 개선 · 회귀로 읽지 않는다.

⚠ **접근성 트리로 확인한 것은 「이름이 붙었다」까지다.** 이번 실행에서 온보딩의 진행 묶음이
`3단계 중 1단계`로, 언어 선택의 고른 항목이 `한국어, 선택됨`으로, 여정 맵 도착 뒤 탭 셋이
`여정, 선택됨` · `롤플레이` · `설정`로 트리에 섰다. 그러나 **그것은 VoiceOver 낭독이 아니다** —
실제로 그렇게 들리는지는 실기가 답하고, 그 자리는 [진입 흐름 e2e](../../e2e/entry-flow.md)의
V1~V6이다. **이 회차는 그 문서의 결과 칸을 한 칸도 채우지 않는다.**

## Trace 후속 확인

- render: Trace 미수집. 초기 load의 `layout`(30.737 ms)이 **트리가 9 노드뿐인데도** 앞 회차(71
  노드)와 거의 같은 것이 이 회차에서 가장 눈에 띄는 자리다 — 같은 조건의 회차를 더 쌓은 뒤에도
  그렇다면 `loadBundle`의 resolve → layout을 Trace로 본다.
- fluency: 해당 없음 — 스크롤을 수행하지 않았다. 진입 흐름 여섯은 기본 글자 크기에서 **전부 내용이
  화면에 들어가** 스크롤이 생기지 않는다. 최대 배율에서는 넘치도록 설계됐고, 그 유창성은 다음
  회차나 실기가 잰다.
- memory: snapshot이 셋이다. **진입 흐름 안의 화면별 snapshot이 없어** 각 화면의 peak와 잔류를
  말할 수 없다 — timing flag가 그 전환에 붙지 않기 때문이다(위 시나리오).
- NativeModule: **저장소 모듈이 이 회차에서 처음 실제로 불렸다** — 로그인 수단을 고를 때 토큰을
  쓰고, 다음 실행의 스플래시가 그것을 읽는다. ⚠ **이 회차는 새 설치의 첫 실행이라 「쓰는 쪽」만
  지났다** — 읽어서 분기하는 쪽(재실행)은 이 캡처에 없다. 오디오 재생과 완료 안내 native 호출은
  관찰 구간에서 없었다.

## 결론과 후속

- 결론: LIB-261 작업 트리의 Release Host에서 **첫 화면이 스플래시로 바뀐 뒤의 초기 load**와 진입
  흐름을 끝까지 지나 여정 맵에 닿는 전환, 설정 탭 전환, memory 세 지점을 한 회차 수집했다.
  **초기 load는 앞 회차와 같은 조건이 아니므로 그 구간의 증감을 판정하지 않는다.** 대신 **여정 맵과
  설정 화면의 트리가 앞 회차와 바이트까지 같다는 것**이 확인됐다 — 이 변경은 기존 화면이 그리는
  것을 바꾸지 않았고, 더한 것은 상주 코드(+23,888 bytes runtime · +71,328 bytes 번들)와 **그
  앞에 놓인 새 첫 화면**이다.
- 후속: **첫 화면 = 스플래시 조건의 기준선은 이 회차가 처음이고 아직 하나뿐이다** — 다음 회차가
  쌓이기 전에는 초기 load의 시간 값을 비교 대상으로 쓰지 않는다. 진입 흐름 **안**의 전환 비용을
  재려면 그 전환들에 timing flag가 붙어야 한다(탭 안 `push`가 안 담긴 것과 같은 이유이고 이번이
  **셋째 사례**다 — [성능 캡처 분석](../../performance-analysis.md) 「현재 경계와 다음 단계」).
  코드 검증 화면과 소프트 키보드 상태는 **전화번호 경로로 다시 도는 회차**가 필요하다.
  PR commit이 생기면 그 commit으로 다시 측정할지 정한다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier(`libitum:navigation:journey` · `libitum:navigation:settings`)가
      사용자 · 콘텐츠 식별자가 아닌지 확인했다.
- [x] 단일 측정을 기준선이나 성능 통과로 표현하지 않았다.
