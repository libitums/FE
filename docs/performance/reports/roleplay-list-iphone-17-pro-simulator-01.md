# 롤플레이 목록 진입 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 시뮬레이터 실행이며 성능 기준선이나 회귀 통과를 판정하지 않는다.
> 관찰 구간은 초기 load와 롤플레이 탭 전환까지다 — 메신저 항목 열기와 `목록으로` 복귀는
> 수행했지만 캡처에 담기지 않았다(「시나리오」).

## 실행 조건

- 측정 일시: 2026-09-15T12:27:04+09:00(초기 load) · 2026-09-15T12:28:43+09:00(롤플레이 탭 전환)
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 새로 실행해 초기 load의 Rendering
  entry, 롤플레이 탭 전환 update pipeline 한 건, Memory snapshot 두 개를 수집했다.
- 기능 PR: 없음 — LIB-255 변경이 아직 PR로 올라가지 않은 시점에 측정했다.
- 대상 commit: `ecab84077cfaee02849af50074236d80912c80a2` — 기점 commit이다. 측정한 빌드는 그
  위의 **미커밋 LIB-255 작업 트리**(r1 이전 — 「결론과 후속」)에서 만들었으므로, 빌드를 식별하는
  값은 아래 번들 SHA-256이다.
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, Xcode 26.6. `pnpm bundle:host`로 만든
  내장 `main.lynx.bundle` 375,101 bytes, SHA-256
  `01c4e493c2b94dadf879537b11ae5097e0e687e437e1427a3dddce1d765cdccb`(설치한 Host.app 안의 사본과
  같다); `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 현재 작업 트리의 Release Host를 부팅된 iPhone 17 Pro 시뮬레이터에 설치한다. 완료 기록이
  없는 새 앱 세션, 기본 글자 크기.
- 단계: `performance:capture`의 `start`로 Host를 성능 캡처 모드로 새로 실행하고, 홈 화면의
  `after-initial-load` memory 기록이 생길 때까지 조작하지 않는다. 이어서 바텀 네비게이션의
  `롤플레이` 탭을 한 번 누르고 `after-navigation-roleplay-01` 기록이 생길 때까지 기다린다. 목록의
  `약속 확인 메시지, 메신저` 항목을 한 번 누르고, 메신저 화면의 `목록으로`를 한 번 누른다. 각
  탭은 시뮬레이터 접근성 트리에서 찾은 요소의 중앙 좌표를 눌렀다(idb). 기록 파일이 3초 동안 늘지
  않은 뒤 `report` → `stop`을 실행했다.
- 관찰 구간: 초기 `loadBundle` 시작부터 첫 paint까지와 직후 memory snapshot, 그리고 롤플레이 탭
  전환 update pipeline(timing flag `libitum:navigation:roleplay`) 한 건과 직후 memory snapshot.

**메신저 항목 열기와 `목록으로` 복귀는 관찰 구간 밖이다.** 두 조작은 수행했고 화면 전환은
접근성 트리로 확인했다(메신저 화면의 `목록으로` → 목록의 세 항목). 그러나 그 사이 캡처 기록은
한 줄도 늘지 않았다. Host는 받은 PerformanceEntry를 그대로 쓰고 memory는 초기 load와
`libitum:navigation:*` timing flag가 달린 pipeline 뒤에만 조회한다. 이 앱의 timing flag는 선택된
바텀 네비게이션 항목에만 붙으므로, 같은 탭 안의 `push`와 `backToRoot`는 새 pipeline entry를
만들지 않았다. 따라서 메신저 화면 렌더와 목록 복귀의 비용은 이 기록에 없다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 108.024 ms, fcp 108.348 ms
  LoadBundle loadBundle: loadBundle 29.994 ms, parse 2.591 ms,
    loadBackground 8.128 ms, pipeline 108.034 ms, mtsRender 3.341 ms,
    resolve 1.645 ms, layout 15.701 ms,
    paintingUiOperationExecute 5.445 ms, layoutUiOperationExecute 0.551 ms
  Pipeline updateTriggeredByBts (libitum:navigation:roleplay): pipeline 18.151 ms,
    mtsRender 0.272 ms, resolve 0.564 ms, layout 11.323 ms,
    paintingUiOperationExecute 2.633 ms, layoutUiOperationExecute 1.446 ms

Memory
  after-initial-load [complete]: totalBytes 718848 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 666272 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 37030192 bytes,
    elementNodeCount 30 nodes; status completed; instances 1/1; collection 1 ms
  after-navigation-roleplay-01 [complete]: totalBytes 769200 bytes, elementBytes 52000 bytes,
    viewBytes 35840 bytes, mainThreadRuntimeBytes 681360 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 54757824 bytes,
    elementNodeCount 50 nodes; status completed; instances 1/1; collection 5 ms
  Delta after-initial-load -> after-navigation-roleplay-01: totalBytes +50352 bytes,
    elementBytes +20800 bytes, viewBytes +14464 bytes, mainThreadRuntimeBytes +15088 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes +17727632 bytes, elementNodeCount +20 nodes
```

## 비교

- 기준 기록: 없음 — LIB-255 이전의 롤플레이 탭(빈 목록 셸) 전환을 같은 조건에서 잰 기록이 없다.
  [서비스 표시명 보고서](service-display-name-app-launch-iphone-17-pro-simulator-01.md)가 같은
  기기·OS의 초기 load를 담지만 다른 commit의 단일 실행이다.
- 차이: 계산하지 않음. 이번 값은 단일 실행의 관측값이며 개선·회귀나 예산 통과를 판정할 비교
  자료가 아니다.

## 해석

초기 load의 `pipeline`은 108.034 ms였고, 그 안에서 `loadBundle`은 29.994 ms, `layout`은
15.701 ms였다. 롤플레이 탭 전환 update의 `pipeline`은 18.151 ms였고 그중 `layout`이 11.323 ms로
가장 컸다. 전환 직후 element node는 30개에서 50개로(+20), `elementBytes`는 +20,800 bytes,
`viewBytes`는 +14,464 bytes 늘었다.

이 update에는 롤플레이 목록 화면의 첫 렌더(제목 · 흐르는 영역 · 목록 상자 · 항목 셋)와 바텀
네비게이션 선택 상태 변경이 함께 들어 있다. 그래서 **목록 항목 렌더만의 비용으로 나눌 수
없고**, +20 node도 탭 전환 전후의 순증일 뿐 어느 요소가 늘었는지를 이 query는 가르지 않는다.
`appBytes`의 +17,727,632 bytes는 앱 프로세스 전체 값이라 Lynx 밖의 변화가 섞인다 — 이번 실행은
탭 좌표를 얻으려고 조작 전에 시뮬레이터 접근성 트리를 조회했고, 그 조회가 앱 프로세스 메모리에
준 영향을 분리할 수 없다.

말할 수 없는 것: 메신저 화면 렌더와 `목록으로` 복귀 비용(관찰 구간 밖), 목록 스크롤 유창성,
반복 실행 분산, 실제 iPhone에서의 값, 큰 글자 배율에서의 레이아웃 비용. 단일 실행이고 승인된
성능 예산과 동일 조건의 비교 기록이 없으므로, 이 수치를 일반화하거나 성능 통과·개선·회귀로
읽지 않는다.

## Trace 후속 확인

- render: Trace 미수집. 반복 회차에서도 탭 전환 update의 대부분이 `layout`이면 그 update의
  resolve → layout 구간을 Trace로 본다.
- fluency: 해당 없음 — 목록 스크롤을 수행하지 않았다(기본 글자 크기에서 항목 셋이 한 화면에
  들어온다).
- memory: snapshot이 둘뿐이다. 메신저 진입 뒤와 목록 복귀 뒤의 snapshot이 없어 peak와 잔류를
  말할 수 없다.
- NativeModule: 해당 없음 — 관찰 구간에서 오디오 재생이나 완료 안내 native 호출이 없었다.

## 결론과 후속

- 결론: LIB-255 작업 트리의 Release Host에서 초기 load와 롤플레이 탭 전환(목록 첫 렌더 포함)
  update 한 건, memory 두 지점을 한 회차 수집했다. 메신저 항목 열기와 `목록으로` 복귀는
  수행했지만 캡처가 담지 않았고, 이 값만으로 성능 변화 방향을 판정하지 않는다.
- 측정 빌드와 병합 대상의 차이: 이 번들은 2026-09-15 후속 결정(r1 — 롤플레이 항목 글 묶음의 가림
  제거, 비주얼 노벨 머리 재배치)을 반영하기 **전** 작업 트리의 것이다. r1 변경 중 관찰 구간(초기
  load · 롤플레이 탭 전환)에 드는 것은 롤플레이 항목 글 묶음의 속성 한 줄 제거뿐이고, 항목 CSS의
  주석 정정은 렌더에 닿지 않는다. 비주얼 노벨 머리는 관찰 구간 밖이다 — 특별 유닛 화면 `push`가
  캡처에 담기지 않는 것과 같은 한계다(「시나리오」). 다시 측정하지 않았다. ADR-0021 D2 게이트는 같은
  변경에 보고서가 있는지를 보고, 이 보고서는 측정한 빌드를 위 번들 SHA-256으로 식별한다.
- 후속: 특별 유닛 화면 `push`와 `backToRoot`의 비용을 재려면 그 전환에 timing flag가 붙어야 한다
  (반복 전환에는 실행별 고유 identifier도 필요하다 — [성능 캡처 분석](../../performance-analysis.md)
  「현재 경계와 다음 단계」). PR commit이 생기면 그 commit으로 다시 측정할지 정하고, 성능 예산이
  정해지면 같은 조건에서 `main`과 후보를 교차 반복한다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier(`libitum:navigation:roleplay`)가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] 단일 측정을 기준선이나 성능 통과로 표현하지 않았다.
