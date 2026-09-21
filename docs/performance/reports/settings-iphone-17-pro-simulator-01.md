# 설정 탭 진입 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 시뮬레이터 실행이며 성능 기준선이나 회귀 통과를 판정하지 않는다.
> **초기 load 구간은 이 변경이 바꾸지 않는다** — 첫 화면이 여전히 여정 맵이라
> [알림 보고서](notifications-iphone-17-pro-simulator-01.md)와 **같은 조건**이고, 그래서
> 이 회차는 그 기록과 나란히 읽을 수 있다. 관찰 구간은 초기 load와 **설정 탭 전환**까지다 —
> 프로필 · 약관 화면 진입은 수행했지만 캡처에 담기지 않았다(「시나리오」).

## 실행 조건

- 측정 일시: 2026-09-16T14:26:32+09:00(초기 load) · 2026-09-16T14:27:23+09:00(설정 탭 전환)
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 새로 실행해 초기 load의 Rendering
  entry, 설정 탭 전환 update pipeline 한 건, Memory snapshot 두 개를 수집했다.
- 기능 PR: 없음 — LIB-259 변경이 아직 PR로 올라가지 않은 시점에 측정했다.
- 대상 commit: `33f71d84fca8f07173d51e3bf9e0d202e5de9697` — 기점 commit이다. 측정한 빌드는 그
  위의 **미커밋 LIB-259 작업 트리**(제품 · 테스트 변경 전부)에서 만들었으므로, 빌드를 식별하는
  값은 아래 번들 SHA-256이다.
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, Xcode 26.6. `pnpm bundle:host`로 만든
  내장 `main.lynx.bundle` 418,798 bytes, SHA-256
  `fa90f56b6532d993a6166f2114f695c780ccc09f1bb46620143a8870d0073e28`(설치한 Host.app 안의 사본과
  같다); `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 현재 작업 트리의 Release Host를 부팅된 iPhone 17 Pro 시뮬레이터에 설치한다. 완료 기록이
  없는 새 앱 세션, 기본 글자 크기.
- 단계: `performance:capture`의 `start`로 Host를 성능 캡처 모드로 새로 실행하고, 첫 화면(여정 맵)의
  `after-initial-load` memory 기록이 생길 때까지 조작하지 않는다. 이어서 바텀 네비게이션의 `설정`
  탭을 한 번 누르고 `after-navigation-settings-01` 기록이 생긴 뒤 기록 파일이 3초 동안 늘지 않을
  때까지 기다린다. 그 뒤 `사용자 프로필`을 누르고, `설정으로`로 돌아온 다음
  `개인정보 보호 및 약관`을 누른다. 각 탭은 시뮬레이터 접근성 트리에서 찾은 요소의 중앙 좌표를
  눌렀다(idb). 끝으로 `report` → `stop`을 실행했다.
- 관찰 구간: 초기 `loadBundle` 시작부터 첫 paint까지와 직후 memory snapshot, 그리고 설정 탭
  전환이 만든 update pipeline(timing flag `libitum:navigation:settings`) 한 건과 직후 memory
  snapshot.

**프로필 · 약관 진입은 관찰 구간 밖이다.** 두 화면 전환은 접근성 트리로 확인했다(프로필은
`설정으로` · 제목 `사용자 프로필` · 항목 셋의 이름과 값, 약관은 `설정으로` · 제목 · 절 제목 넷 ·
문단 여덟). 그러나 그 사이 캡처 기록은 한 줄도 늘지 않았다 — 이 앱의 timing flag는 선택된 바텀
네비게이션 항목에만 붙고 Host는 `libitum:navigation:*` flag가 달린 pipeline 뒤에만 memory를
조회하므로, **설정 탭 안의 `push`는 새 pipeline entry를 만들지 않는다.** 알림 화면 push가 같은
이유로 담기지 않았던 것과 **같은 자리**이고, 이번에 그것이 둘째 사례로 재현됐다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 135.014 ms, fcp 135.362 ms
  LoadBundle loadBundle: loadBundle 50.676 ms, parse 2.961 ms,
    loadBackground 9.689 ms, pipeline 135.023 ms, mtsRender 4.391 ms,
    resolve 3.078 ms, layout 30.847 ms,
    paintingUiOperationExecute 7.649 ms, layoutUiOperationExecute 0.895 ms
  Pipeline updateTriggeredByBts (libitum:navigation:settings): pipeline 21.399 ms,
    mtsRender 0.333 ms, resolve 1.887 ms, layout 13.657 ms,
    paintingUiOperationExecute 2.293 ms, layoutUiOperationExecute 1.27 ms

Memory
  after-initial-load [complete]: totalBytes 878928 bytes, elementBytes 73840 bytes,
    viewBytes 49280 bytes, mainThreadRuntimeBytes 755808 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 40192304 bytes,
    elementNodeCount 71 nodes; status completed; instances 1/1; collection 2 ms
  after-navigation-settings-01 [complete]: totalBytes 835152 bytes, elementBytes 47840 bytes,
    viewBytes 33024 bytes, mainThreadRuntimeBytes 754288 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 55970240 bytes,
    elementNodeCount 46 nodes; status completed; instances 1/1; collection 9 ms
  Delta after-initial-load -> after-navigation-settings-01: totalBytes -43776 bytes,
    elementBytes -26000 bytes, viewBytes -16256 bytes, mainThreadRuntimeBytes -1520 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes +15777936 bytes, elementNodeCount -25 nodes
```

## 비교

- 기준 기록: [알림 보고서](notifications-iphone-17-pro-simulator-01.md) — 같은 기기 · 같은 OS ·
  같은 Lynx SDK이고 **첫 화면이 여정 맵으로 같다.** 이 변경은 초기 load가 그리는 트리를 건드리지
  않으므로(설정 탭은 눌러야 열린다) 초기 load 구간이 **같은 조건**이다.
- 차이(초기 load): `pipeline` 134.884 ms → **135.023 ms**(+0.139 ms), `layout` 33.594 ms →
  **30.847 ms**(−2.747 ms), `loadBundle` 48.306 ms → **50.676 ms**(+2.370 ms).
  **elementNodeCount는 71로 같고 `elementBytes`(73,840) · `viewBytes`(49,280)도 바이트까지
  같다** — 첫 화면의 요소 트리가 한 노드도 안 바뀌었다는 뜻이다.
  `mainThreadRuntimeBytes`는 712,112 → **755,808**(+43,696 bytes)이고 내장 번들은 386,557 →
  **418,798 bytes**(+32,241)다.
- 차이(탭 전환): 이 회차의 설정 탭 전환 `pipeline` 21.399 ms는 앞 기록의 롤플레이 탭 전환
  13.348 ms와 **같은 것을 재는 값이 아니다** — 출발 화면과 도착 화면이 둘 다 다르다(이 회차는
  여정 맵 → 설정, 앞 기록은 알림 → 롤플레이 목록). **증감을 계산하지 않는다.**
- 이 값들은 각각 단일 실행의 관측값이며 개선 · 회귀나 예산 통과를 판정할 자료가 아니다.

## 해석

초기 load의 `pipeline`은 135.023 ms였고 그 안에서 `loadBundle` 50.676 ms, `layout` 30.847 ms였다.
**요소 트리가 앞 회차와 바이트까지 같으므로 이 구간에서 이 변경이 더한 것은 그리는 일이 아니라
번들에 든 코드다** — `mainThreadRuntimeBytes`의 +43,696 bytes가 번들 증가(+32,241 bytes)와 같은
방향이고, 새로 들어온 것은 설정 · 프로필 · 약관 화면과 세션 옵션 모듈이다. **첫 화면에서는 그
코드가 실행되지도 렌더되지도 않는다** — 늘어난 것은 상주 메모리이지 초기 렌더 비용이 아니다.
다만 `pipeline`의 +0.139 ms와 `layout`의 −2.747 ms는 **단일 실행 두 개의 차이라 분산과 구별되지
않는다.** 방향을 읽지 않는다.

설정 탭 전환 update의 `pipeline`은 21.399 ms였고 그 안에서 `layout`이 13.657 ms로 가장 컸다.
이 update에는 여정 맵의 언마운트와 **설정 화면 전체**(제목 · 이동 항목 둘 · 토글 둘)의 첫 렌더가
함께 들어 있다. 전환 뒤 element node는 71개에서 46개로(−25) 줄었다 — 여정 맵(맵 항목 여덟)에서
설정(행 넷)으로의 순감이다. **이 회차 전까지 설정 화면은 제목 하나뿐이었으므로 이 수치는 「설정
탭이 채워진 뒤」의 첫 기록이고, 같은 조건의 앞선 기록이 없다.**

`appBytes`의 +15,777,936 bytes는 앱 프로세스 전체 값이라 Lynx 밖의 변화가 섞인다 — 이번 실행은
조작 전마다 시뮬레이터 접근성 트리를 조회했고, 그 조회가 앱 프로세스 메모리에 준 영향을 분리할
수 없다.

말할 수 없는 것: 프로필 · 약관 push의 렌더 비용과 그 상태의 memory(관찰 구간 밖), 토글을 눌러
값이 바뀔 때의 비용, 약관 본문 스크롤의 유창성, 반복 실행 분산, 실제 iPhone에서의 값, 큰 글자
배율에서의 레이아웃 비용. 단일 실행이고 승인된 성능 예산과 동일 조건의 비교 기록이 탭 전환 쪽에는
없으므로, 이 수치를 일반화하거나 성능 통과 · 개선 · 회귀로 읽지 않는다.

⚠ **접근성 트리로 확인한 것은 「이름이 붙었다」까지다.** 이번 실행에서 설정 화면의 두 토글이
`자동 재생, 켜짐` · `대본 표시, 켜짐`으로, 약관의 절 제목 넷이 각각 제목으로 트리에 섰다. 그러나
**그것은 VoiceOver 낭독이 아니다** — 실제로 그렇게 들리는지는 실기가 답하고, 그 자리는
`docs/e2e/settings.md`의 V1~V4다.

## Trace 후속 확인

- render: Trace 미수집. 초기 load의 `layout`(30.847 ms)은 앞 회차와 같은 조건의 값이라 나란히 둘 수
  있지만 두 회차뿐이다 — 같은 조건의 회차를 더 쌓은 뒤에도 그 구간이 크면 loadBundle의
  resolve → layout을 Trace로 본다.
- fluency: 해당 없음 — 스크롤을 수행하지 않았다. **약관 본문은 기본 글자 크기에서 이미 한 화면을
  넘지만**(접근성 트리에서 마지막 문단이 화면 높이 밖에 있었다) 이번 회차는 스크롤 조작을 하지
  않았고, 유창성은 다음 회차나 실기가 잰다.
- memory: snapshot이 둘뿐이다. 프로필 · 약관 상태의 snapshot이 없어 peak와 잔류를 말할 수 없다.
- NativeModule: 해당 없음 — 관찰 구간에서 오디오 재생이나 완료 안내 native 호출이 없었다.
  **자동 재생 토글이 무엇을 바꾸는지는 이 구간에 나타나지 않는다** — 듣기 화면에 들어가야
  `AudioPlaybackModule`이 불린다.

## 결론과 후속

- 결론: LIB-259 작업 트리의 Release Host에서 초기 load(첫 화면 여정 맵)와 설정 탭 전환 update
  한 건, memory 두 지점을 한 회차 수집했다. 초기 load는 앞 회차와 **같은 조건**이고 요소 트리가
  바이트까지 같아, 이 변경이 그 구간에 더한 것은 상주 코드(+43,696 bytes runtime · +32,241 bytes
  번들)로 보인다. 설정 탭 전환은 「설정 화면이 채워진 뒤」의 첫 기록이다. 프로필 · 약관 push는
  수행했지만 캡처가 담지 않았고, 단일 실행이므로 이 값만으로 성능 변화 방향을 판정하지 않는다.
- 후속: 탭 안 `push`(프로필 · 약관)의 비용을 재려면 그 전환에 timing flag가 붙어야 한다 —
  알림 화면 push가 같은 이유로 안 담겼고 이번이 **둘째 사례**다(반복 전환에는 실행별 고유
  identifier도 필요하다 — [성능 캡처 분석](../../performance-analysis.md) 「현재 경계와 다음 단계」).
  첫 화면 = 여정 맵 조건의 기준선은 이 회차로 둘이 됐다. PR commit이 생기면 그 commit으로 다시
  측정할지 정한다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier(`libitum:navigation:settings`)가 사용자 · 콘텐츠 식별자가 아닌지
      확인했다.
- [x] 단일 측정을 기준선이나 성능 통과로 표현하지 않았다.
