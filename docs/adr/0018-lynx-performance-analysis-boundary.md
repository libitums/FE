# ADR-0018 — Lynx 성능 분석과 런타임 수집의 경계

- 상태: 채택 — D1의 2단계 수집 시점·구현 결정은 ADR-0019가 이어받음
- 날짜: 2026-09-03
- 다루는 축: 성능 관측·오프라인 분석·런타임 수집 경계
- 관련: **ADR-0003**(앱 소유 코드와 공유 패키지 승격), **ADR-0006**(명령·테스트 계층),
  **ADR-0012**(iOS 자체 호스트와 Lynx 4.0.1)

**왜 0018인가.** 병렬 진행 중인 Screen 2의 호스트 네이티브 능력 결정이 0017을 먼저
사용하고 있다. 번호는 재사용하지 않는다는 `docs/adr/README.md` 규칙과 두 작업의 충돌을
피하기 위해 이 결정은 0018을 쓴다.

## 맥락

Lynx 성능 문제는 한 종류의 숫자로 설명되지 않는다. 공식 문서가 제공하는 관측면도 셋이다.

1. **PerformanceEntry** — 초기화·metric·pipeline·resource 이벤트가 렌더 단계 시간을
   제공한다. FCP는 `MetricFcpEntry`뿐 아니라 `LoadBundleEntry`에도 있고, timing flag는
   이름과 identifier를 가진 pipeline을 만든다.
2. **Global Memory Usage Query** — 요청한 시점의 element·view·main-thread runtime·
   background-thread runtime·app 메모리를 비동기로 모은다. timeout 결과도 먼저 끝난
   instance의 partial 값을 포함하며 background runtime 합계는 공유 그룹을 중복 제거한다.
3. **Trace** — 렌더 단계, 긴 프레임, NativeModule 호출 단계를 시간축에서 조사한다.
   캡처와 원인 분석은 PerformanceEntry나 메모리 snapshot의 대체물이 아니다.

근거 문서:

- Performance API: https://lynxjs.org/guide/performance/monitor-performance/performance-api
- Timing Flag: https://lynxjs.org/guide/performance/monitor-performance/timing-flag
- Global Memory Usage Query:
  https://lynxjs.org/guide/performance/monitor-performance/global-memory-usage-query.html
- Render Process:
  https://lynxjs.org/guide/performance/analysis-performance/analysis-render-process.html
- Fluency: https://lynxjs.org/guide/performance/analysis-performance/analysis-fluency.html
- Memory: https://lynxjs.org/guide/performance/analysis-performance/analysis-memory.html
- NativeModule:
  https://lynxjs.org/guide/performance/analysis-performance/analysis-native-module.html

이 저장소에는 이 데이터를 일관되게 보존·검증·요약하는 자리가 없었다. 화면 안에 임시
로그를 넣으면 측정 코드가 제품 코드와 함께 움직이고, 다른 사람이 같은 캡처를 다시
해석할 때 계산 규칙이 남지 않는다.

동시에 Screen 2가 `apps/mobile/src/`와 `apps/ios/`를 바꾸는 중이다. 수집기를 지금 연결하면
화면·내비게이션·호스트 lifecycle이라는 같은 변경면을 두 작업이 공유한다. 분석 규칙은
그 연결 없이도 JSON/NDJSON fixture로 먼저 고정할 수 있다.

## 결정

### D1. 분석과 수집을 두 change로 나눈다

**1단계는 오프라인 분석기다.** 저장된 JSON 또는 NDJSON을 읽어 입력을 검증하고 평문
보고서를 만든다. 앱 화면, 번들 진입점, iOS 호스트, 실시간 observer를 건드리지 않는다.

**2단계는 런타임 수집기다.** 구체적인 iOS 연결은
[ADR-0019](0019-lynx-ios-performance-collection.md)가 이어받았다. 이 ADR을 쓸 당시에는
Screen 2 변경이 합쳐진 뒤 별도 change로 아래를 검토하기로 했다.

- ReactLynx `PerformanceObserver`를 이벤트보다 먼저 등록하는 위치
- iOS `LynxViewClient`의 performance event 전달
- `LynxMemoryUsageQuery`의 before/peak/after 호출과 timeout callback
- 실제 화면의 고유 `__lynx_timing_flag`
- 캡처를 D2의 envelope로 직렬화하는 경계

2단계가 1단계의 입력 계약을 바꿔야 하면 이 ADR을 조용히 우회하지 않고 재검토한다.

### D2. 캡처 경계는 JSON/NDJSON envelope다

레코드는 `source: "performance" | "memory"`로 구분한다.

- performance 레코드는 공식 PerformanceEntry 객체를 `entry`에 보존한다.
- memory 레코드는 비교 시점을 나타내는 `label`과 query 결과인 `result`를 가진다.
- `capturedAt`은 선택 사항이다. 보고서 계산은 벽시계 시각에 의존하지 않는다.

JSON 배열과 한 줄에 레코드 하나인 NDJSON은 같은 의미를 가진다. NDJSON은 긴 실행을
한 번에 메모리에 쌓지 않고 append할 수 있는 이음매지만, **1단계 CLI는 파일 자체를
수집하거나 append하지 않는다.**

잘못된 값은 0이나 `n/a`로 고치지 않는다. record 번호와 필드 경로를 가진 오류로 중단한다.
수집이 정상적으로 partial을 반환한 경우만 D4에 따라 유효한 나머지 값을 보존한다.

### D3. 공식 시작·종료 쌍만 duration으로 계산한다

분석 대상은 다음이다.

- FCP: `lynxFcp.duration`, 존재하면 `fcp.duration`·`totalFcp.duration`
- LoadBundle: loadBundle·pipeline·parse·loadBackground·MTS render·resolve·layout·
  painting UI operation·layout UI operation
- pipeline: pipeline·MTS render·resolve·layout·painting UI operation·layout UI operation
- timing flag: `name`과 `identifier`

시작과 종료 중 하나만 있거나 종료가 시작보다 이르면 입력 오류다. `paintEnd`는 공식
시작점이 없는 끝점이므로 임의의 paint duration을 만들지 않는다.

`MetricFcpEntry`만을 FCP의 유일한 출처로 만들지 않는다. 설치된 타입은 LoadBundle과
ReloadBundle이 그 필드를 포함한다는 이유로 독립 MetricFcpEntry를 deprecated로 표시한다.
호환을 위해 standalone metric과 LoadBundle의 FCP를 둘 다 읽는다.

ActualFMP도 핵심 보고 기준으로 만들지 않는다. 현재 Performance API에서 deprecated이고
pipeline이 해당 데이터를 포함하므로, 새 계약을 폐기 예정 entry에 세우지 않는다.

### D4. 메모리는 능동적인 시점 snapshot이며 partial을 버리지 않는다

메모리 query는 고빈도 telemetry가 아니다. 대표 시나리오의 **before → peak → after**처럼
원인이 궁금한 시점에 한 번씩 호출한다.

다음 중 하나면 snapshot을 `partial`로 표시한다.

- `collectionStatus`가 timeout이다.
- `completedInstanceCount < expectedInstanceCount`다.
- 보고 범주가 누락됐다.

partial snapshot의 존재하는 범주는 그대로 보고하고 누락 범주는 0으로 채우지 않는다.
첫 snapshot과 마지막 snapshot 양쪽에 있는 범주만 delta를 계산한다.

background-thread runtime 값은 전역 수집기가 공유 runtime group을 중복 제거한 값일 수
있다. 이를 특정 LynxView 하나가 전부 소유한 메모리라고 표현하지 않는다.

### D5. Trace는 후속 조사 체크리스트이며 자동 판정기가 아니다

1단계는 Trace 파일을 파싱하지 않는다. 대신 보고서 끝에 조사 순서를 남긴다.

- render: 초기 LoadBundle과 update의 diff/pack/parse/patch를 구분한다.
- fluency: 실제 iOS 스크롤 구간과 UI·resource·bridge 활동의 시간 상관을 본다.
- memory: snapshot 잔류를 본 뒤 Xcode Leaks/Allocations로 이어 간다.
- NativeModule: parameter conversion→platform implementation→background callback wait→
  result conversion→callback execution을 구분한다.

공식 fluency 문서의 프레임 색상 기준은 Android Trace 설명이다. 그 수치를 iOS 자동
pass/fail 기준으로 옮기지 않는다. 성능 예산은 실제 기기·시나리오·baseline을 정한 뒤
별도 결정한다.

### D6. 분석기는 앱이 소유하되 런타임에서 import하지 않는다

경로는 `apps/mobile/devtools/lynx-performance/`다.

- 앱 하나의 캡처 계약이므로 두 번째 소비자가 없는 상태에서 `packages/`로 올리지 않는다.
- 루트 `tooling/` workspace도 만들지 않는다(ADR-0003의 승격 조건).
- `apps/mobile/src/`에서 devtools 파일을 import하지 않는다.
- Node 표준 라이브러리와 현재 Vitest만 쓰며 새 의존성을 추가하지 않는다.

실행 명령은 앱 package가 소유한다.

```sh
pnpm --filter @libitums/mobile performance:report -- ./capture.json
```

### D7. CLI 출력은 로컬 평문이고 공유 기록은 수동으로 정제한다

원본 캡처, URL, NativeModule 파라미터를 네트워크로 전송하지 않는다. ANSI 색이나 터미널
폭에 의미를 싣지 않고 stdout 보고서와 stderr 오류, 종료 코드만 제공한다.

팀이 비교할 **분석 기록**은 `docs/performance/reports/`에 Markdown으로 남긴다. 파일 하나는
기기·시나리오·실행 회차 하나다. CLI가 이 경로에 직접 쓰거나 자동으로 커밋하지 않는다.
사람이 다음을 확인하고 정제한 뒤 기록한다.

- 날짜, 대상 commit, 기기, OS, Lynx SDK, 재현 가능한 시나리오와 실행 회차
- 필요한 보고서 구간과 해석, 비교 기준, 결론과 후속 작업
- timing flag identifier·로컬 경로·URL·NativeModule 파라미터·사용자 콘텐츠 제거 여부

원본 JSON/NDJSON 캡처와 검토 전 stdout은 커밋하지 않는다. 저장소의 Markdown은 원본
증거가 아니라 재현 조건과 결론을 공유하는 기록이다. 파일명과 양식은
`docs/performance/reports/README.md`가 정한다.

자동 업로드·원격 원본 저장·팀 대시보드가 요구되면 전송 대상의 민감정보, 보존 기간,
sampling, 실패 정책을 먼저 결정해야 한다. 지금 CLI와 공유 기록 폴더를 telemetry SDK의
출발점으로 읽지 않는다.

### D8. 1단계의 자동 검증은 unit과 integration이다

- unit: 파싱, 필드 검증, duration, 메모리 partial/delta, 결정적 출력
- integration: 파일 입력, stdout/stderr, 종료 코드
- UI: 사용자 화면과 render tree가 없어 해당 없음
- e2e: 브라우저·LynxView·실기 수집 흐름이 없어 해당 없음

2단계에서 실제 수집기를 붙이면 UI/실기 판정의 적용 여부를 새로 정한다. 1단계의
`not-applicable`을 그대로 물려받지 않는다.

### D9. 사용자 대면 기능 change는 분석 기록을 같은 PR에 남긴다

`apps/mobile/src/` 또는 사용자가 관찰하는 `apps/ios/` 동작을 바꾸는 change는 영향받는
시나리오의 분석 기록을 `docs/performance/reports/`에 하나 이상 추가하거나 갱신한다.
화면 뼈대도 첫 기능 경계이므로 예외가 아니다. 문서·테스트·devtools만 바꾸고 앱 런타임과
번들에 영향을 주지 않는 change에는 적용하지 않는다.

2단계 수집기가 아직 없어서 PerformanceEntry·메모리·Trace를 얻을 수 없다면 보고서를
생략하지 않는다. 대신 `미측정` 상태, 수집하지 못한 이유, 당시 남아 있는 검증, 다시
측정할 조건을 기록한다. **미측정 기록은 baseline이 아니며 성능이 유지됐다는 증거도 아니다.**

2단계 수집기가 연결된 뒤에는 change가 영향을 주는 시나리오의 측정을 `미측정`으로
대체하지 않는다. 기기나 환경이 없어 실행할 수 없다면 통과로 꾸미지 않고 PR의 차단
사유로 남긴다.

이 규칙이 생기기 전에 병합된 기능 둘은 다음처럼 소급 기록한다.

- 뼈대·바텀 네비게이션(#32, `c23ec01`) — 당시 성능 캡처 없음
- 여정 맵·스텝 시트(#34, `7be8654`) — 당시 성능 캡처 없음

둘 다 당시 PR과 실기 검증에서 확인 가능한 사실만 옮기고 성능 수치를 추정하지 않는다.

## 버린 대안

- **화면 위 성능 overlay를 만든다** — 제품 화면과 측정 코드가 같은 렌더 경로를 쓰고
  Screen 2 작업면과 충돌한다. 측정하려는 화면 자체의 비용도 바꾼다.
- **1단계에서 iOS 수집까지 연결한다** — 분석 규칙과 lifecycle 연결 실패가 한 change에
  섞인다. 현재 병렬 작업의 `apps/mobile/src/`·`apps/ios/`와도 겹친다.
- **Xcode Instruments와 Trace 문서만 남긴다** — 원인 조사에는 필요하지만 같은 숫자를
  다시 계산하고 입력 오류를 찾는 반복 가능한 계약이 남지 않는다.
- **처음부터 공유 package나 루트 tooling workspace로 만든다** — 소비자가 앱 하나뿐이다.
  승격 조건보다 구조가 먼저 생긴다.
- **Android 프레임 색상 기준으로 iOS 회귀를 판정한다** — 공식 문서가 설명한 플랫폼과
  판정 환경이 다르다. baseline 없는 숫자는 근거가 아니라 추정이다.
- **timeout 메모리 결과를 전부 실패로 버린다** — 공식 query가 partial instance 목록을
  반환하는 이유를 없애고, 가장 필요한 느린 상황에서 얻은 값까지 잃는다.

## 대가

- **1단계만으로는 실제 앱 데이터를 얻을 수 없다.** 호출자가 envelope 파일을 준비해야
  하며 자동 수집은 2단계까지 없다.
- **성능 회귀를 자동 차단하지 않는다.** 보고서는 측정값을 내지만 예산이 없어 green/red를
  정하지 않는다.
- **입력 wrapper를 소유한다.** Lynx SDK 필드가 바뀌면 validator와 fixture, 문서를 함께
  고쳐야 한다.
- **Trace 원인 판정은 사람에게 남는다.** 체크리스트는 조사 누락을 줄이지만 Trace를
  해석하거나 병목을 자동 분류하지 않는다.
- **CLI는 평문 보고서만 만든다.** 공유 Markdown은 사람이 실행 조건과 해석을 덧붙여야
  하며 시계열 그래프나 비교 대시보드는 제공하지 않는다.

## 재검토 조건

- Screen 2가 main에 합쳐지고 실제 iOS/ReactLynx 수집기를 붙이는 2단계를 시작할 때 → D1·D2·D8
- 같은 capture envelope를 쓰는 두 번째 앱이나 자동화 소비자가 생길 때 → D6의 package 승격
- 대표 기기·시나리오별 baseline이 3회 이상 쌓이고 회귀 허용폭 요구가 생길 때 → D5의 성능 예산
- 원본 캡처를 원격 저장하거나 분석 기록을 자동 업로드해야 할 때 → D7의 privacy·보존·sampling
- Lynx SDK를 4.0.1에서 올려 PerformanceEntry 또는 memory result 필드가 바뀔 때 → D2~D4
- Trace 포맷을 읽는 두 번째 반복 작업이 생길 때 → D5의 자동 파싱
