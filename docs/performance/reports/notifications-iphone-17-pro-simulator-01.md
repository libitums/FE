# 알림 화면 진입 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 단일 시뮬레이터 실행이며 성능 기준선이나 회귀 통과를 판정하지 않는다.
> **첫 화면이 홈에서 여정 맵으로 바뀌어 앞선 보고서들(첫 화면 = 홈)과 같은 조건의 기준선이
> 아니다.** 관찰 구간은 초기 load와 롤플레이 알림이 만든 롤플레이 탭 전환까지다 — 알림 화면
> push는 수행했지만 캡처에 담기지 않았다(「시나리오」).

## 실행 조건

- 측정 일시: 2026-09-15T23:23:42+09:00(초기 load) · 2026-09-15T23:34:29+09:00(롤플레이 알림 → 탭 전환)
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 새로 실행해 초기 load의 Rendering
  entry, 롤플레이 탭 전환 update pipeline 한 건, Memory snapshot 두 개를 수집했다.
- 기능 PR: 없음 — LIB-257 변경이 아직 PR로 올라가지 않은 시점에 측정했다.
- 대상 commit: `7b6dda17bc389dab297932699896f3410d4fb5b2` — 기점 commit이다. 측정한 빌드는 그
  위의 **미커밋 LIB-257 작업 트리**(제품 · 테스트 변경 전부)에서 만들었으므로, 빌드를 식별하는
  값은 아래 번들 SHA-256이다.
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, Xcode 26.6. `pnpm bundle:host`로 만든
  내장 `main.lynx.bundle` 386,557 bytes, SHA-256
  `8f227301c5d7eb0da503f6587c1c09f0c7f53a30ba6388d6af130c89db97fc89`(설치한 Host.app 안의 사본과
  같다); `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 현재 작업 트리의 Release Host를 부팅된 iPhone 17 Pro 시뮬레이터에 설치한다. 완료 기록이
  없는 새 앱 세션, 기본 글자 크기.
- 단계: `performance:capture`의 `start`로 Host를 성능 캡처 모드로 새로 실행하고, 첫 화면(여정 맵)의
  `after-initial-load` memory 기록이 생길 때까지 조작하지 않는다. 이어서 여정 맵 머리의 `알림`
  버튼을 한 번 누르고 기록 파일이 4초 동안 늘지 않을 때까지 기다린다. 알림 화면의 넷째 항목
  `배운 대화를 롤플레이로 연습해 보세요, 롤플레이 목록 보기`를 한 번 누르고
  `after-navigation-roleplay-01` 기록이 생긴 뒤 기록 파일이 3초 동안 늘지 않을 때까지 기다린다. 각
  탭은 시뮬레이터 접근성 트리에서 찾은 요소의 중앙 좌표를 눌렀다(idb). 그 뒤 `report` → `stop`을
  실행했다.
- 관찰 구간: 초기 `loadBundle` 시작부터 첫 paint까지와 직후 memory snapshot, 그리고 롤플레이
  알림이 만든 롤플레이 탭 전환 update pipeline(timing flag `libitum:navigation:roleplay`) 한 건과
  직후 memory snapshot.

**알림 화면 push는 관찰 구간 밖이다.** 알림 버튼을 누른 뒤의 화면 전환은 접근성 트리로 확인했다
(`맵으로` · 제목 `알림` · 항목 넷, 선택 탭 `여정` 유지). 그러나 그 사이 캡처 기록은 한 줄도 늘지
않았다. 이 앱의 timing flag는 선택된 바텀 네비게이션 항목에만 붙고 Host는 `libitum:navigation:*`
flag가 달린 pipeline 뒤에만 memory를 조회하므로, 여정 탭 안의 `push`는 새 pipeline entry를 만들지
않았다. 롤플레이 알림은 활성 탭을 바꾸므로(`switchTab` → `backToRoot`) 선택 탭의 flag가
`roleplay`로 옮겨 가 기록됐다. 두 동작은 update pipeline **한 건**으로 기록됐다.

**초기 load의 timing flag.** 첫 화면의 선택 탭이 `여정`이라 초기 `loadBundle` pipeline에
`libitum:navigation:journey` flag가 붙어 있었다. 그러나 Host가 남긴 memory 라벨은
`after-initial-load` 하나였고 `after-navigation-journey-01`은 생기지 않았다 — 초기 load는
navigation 라벨이 아니라 초기 load 라벨로 기록된다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 134.874 ms, fcp 135.186 ms
  LoadBundle loadBundle: loadBundle 48.306 ms, parse 1.785 ms,
    loadBackground 5.956 ms, pipeline 134.884 ms, mtsRender 2.734 ms,
    resolve 1.849 ms, layout 33.594 ms,
    paintingUiOperationExecute 7.032 ms, layoutUiOperationExecute 0.715 ms
  Pipeline updateTriggeredByBts (libitum:navigation:roleplay): pipeline 13.348 ms,
    mtsRender 0.771 ms, resolve 2.47 ms, layout 2.699 ms,
    paintingUiOperationExecute 2.698 ms, layoutUiOperationExecute 2.157 ms

Memory
  after-initial-load [complete]: totalBytes 835232 bytes, elementBytes 73840 bytes,
    viewBytes 49280 bytes, mainThreadRuntimeBytes 712112 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 39913800 bytes,
    elementNodeCount 71 nodes; status completed; instances 1/1; collection 2 ms
  after-navigation-roleplay-01 [complete]: totalBytes 782080 bytes, elementBytes 46800 bytes,
    viewBytes 29312 bytes, mainThreadRuntimeBytes 705968 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 56838640 bytes,
    elementNodeCount 45 nodes; status completed; instances 1/1; collection 1 ms
  Delta after-initial-load -> after-navigation-roleplay-01: totalBytes -53152 bytes,
    elementBytes -27040 bytes, viewBytes -19968 bytes, mainThreadRuntimeBytes -6144 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes +16924840 bytes, elementNodeCount -26 nodes
```

## 비교

- 기준 기록: 없음 — 같은 조건(첫 화면 = 여정 맵)의 앞선 기록이 없다.
  [롤플레이 목록 보고서](roleplay-list-iphone-17-pro-simulator-01.md)가 같은 기기 · OS의 초기
  load와 롤플레이 탭 전환을 담지만, 첫 화면이 홈이고 전환의 출발 화면도 홈이다.
- 차이: 계산하지 않음. 첫 화면이 바뀌어 초기 load가 그리는 트리 자체가 다르고(초기 element node가
  이 기록 71개, 앞 기록 30개), 롤플레이 탭 전환도 출발 화면(이 기록은 알림 화면, 앞 기록은 홈)이
  달라 같은 update가 아니다. 이번 값은 단일 실행의 관측값이며 개선 · 회귀나 예산 통과를 판정할
  비교 자료가 아니다.

## 해석

초기 load의 `pipeline`은 134.884 ms였고, 그 안에서 `loadBundle`은 48.306 ms, `layout`은
33.594 ms였다. 첫 화면이 이제 여정 맵이라 초기 load가 여정 맵 전체(머리의 제목 · 알림 버튼,
맵 항목 여덟, 흐르는 영역)와 탭 셋을 한 번에 그린다 — 초기 element node가 71개다. **이 초기
load는 앞선 보고서들(첫 화면 = 홈)과 같은 조건의 기준선이 아니다.** 이 변경은 초기 load 구간
자체를 바꿨으므로 앞 기록과 수치를 나란히 두고 증감을 읽지 않는다.

롤플레이 알림이 만든 탭 전환 update의 `pipeline`은 13.348 ms였다. 이 update에는 알림 화면의
언마운트, 롤플레이 목록 화면의 렌더, 바텀 네비게이션 선택 상태 변경이 함께 들어 있다 — 이 세션의
롤플레이 스택은 이미 루트였으므로 `backToRoot`가 바꾼 화면은 없다. 전환 직후 element node는 71개에서
45개로(−26) 줄었다. 비교 지점이 알림 화면이 아니라 초기 여정 맵이기 때문이다 — 여정 맵(항목
여덟)에서 롤플레이 목록(항목 셋)으로의 순감이고, 사이의 알림 화면 상태에는 snapshot이 없다.
`appBytes`의 +16,924,840 bytes는 앱 프로세스 전체 값이라 Lynx 밖의 변화가 섞인다 — 이번 실행은
조작 전마다 시뮬레이터 접근성 트리를 조회했고, 그 조회가 앱 프로세스 메모리에 준 영향을 분리할 수
없다.

말할 수 없는 것: 알림 화면 push의 렌더 비용과 그 상태의 memory(관찰 구간 밖), 특별 유닛 알림
(`push`)의 비용, 알림 목록 스크롤 유창성, 반복 실행 분산, 실제 iPhone에서의 값, 큰 글자 배율에서의
레이아웃 비용. 단일 실행이고 승인된 성능 예산과 동일 조건의 비교 기록이 없으므로, 이 수치를
일반화하거나 성능 통과 · 개선 · 회귀로 읽지 않는다.

## Trace 후속 확인

- render: Trace 미수집. 초기 load의 `layout`(33.594 ms)은 앞 조건(첫 화면 = 홈)과 다른 트리를 그린
  값이다 — 같은 조건의 회차를 쌓은 뒤에도 그 구간이 크면 loadBundle의 resolve → layout을 Trace로
  본다.
- fluency: 해당 없음 — 스크롤을 수행하지 않았다(기본 글자 크기에서 알림 항목 넷이 한 화면에
  들어온다).
- memory: snapshot이 둘뿐이다. 알림 화면 상태의 snapshot이 없어 peak와 잔류를 말할 수 없다.
- NativeModule: 해당 없음 — 관찰 구간에서 오디오 재생이나 완료 안내 native 호출이 없었다.

## 결론과 후속

- 결론: LIB-257 작업 트리의 Release Host에서 초기 load(첫 화면 여정 맵)와 롤플레이 알림이 만든
  롤플레이 탭 전환 update 한 건, memory 두 지점을 한 회차 수집했다. 알림 화면 push는 수행했지만
  캡처가 담지 않았고, 첫 화면이 바뀌어 앞 기록과 같은 조건의 기준선이 아니므로 이 값만으로 성능
  변화 방향을 판정하지 않는다.
- 후속: 알림 화면 push처럼 탭 안 전환의 비용을 재려면 그 전환에 timing flag가 붙어야 한다(반복
  전환에는 실행별 고유 identifier도 필요하다 — [성능 캡처 분석](../../performance-analysis.md)
  「현재 경계와 다음 단계」). 첫 화면 = 여정 맵 조건의 기준선은 이 회차부터 쌓는다 — 같은 조건으로
  회차를 올린다. PR commit이 생기면 그 commit으로 다시 측정할지 정한다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier(`libitum:navigation:journey` · `libitum:navigation:roleplay`)가 사용자 ·
      콘텐츠 식별자가 아닌지 확인했다.
- [x] 단일 측정을 기준선이나 성능 통과로 표현하지 않았다.
