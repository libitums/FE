# ADR-0019 — Lynx iOS 성능 수집 연결

- 상태: 채택
- 날짜: 2026-09-03
- 다루는 축: 성능 관측·오프라인 분석·런타임 수집 경계
- 관련: **ADR-0012**(최소 iOS 호스트), **ADR-0018**(분석 계약과 기록 규칙),
  **ADR-0020**(성능 보고서 CI와 iOS smoke)

## 맥락

ADR-0018은 저장된 PerformanceEntry와 전역 메모리 snapshot을 검증하는 1단계 분석 계약을
먼저 고정하고, 런타임 수집은 2단계로 분리했다. 1단계만으로는 실제 앱 값을 만들 수 없어
기능 보고서가 계속 `미측정`에 머문다. 이제 다음 조건을 만족하는 수집 이음매가 필요하다.

- 제품 화면 위에 overlay나 개발 UI를 만들지 않는다.
- 병렬 Screen 2 작업의 화면·내비게이션·호스트 view 파일을 수정하지 않는다.
- 초기 이벤트를 놓치지 않고 iOS 공식 Performance API 값을 원형에 가깝게 보존한다.
- 메모리 query는 필요한 시점에만 호출하고 reporter callback에서 UIKit을 만지지 않는다.
- 원시 캡처는 로컬에만 두고, 검토한 수치만 ADR-0018의 보고서 위치에 기록한다.

설치된 Lynx 4.0.1의 `LynxViewLifecycleV2`는 `onPerformanceEvent:`를 제공하며,
`LynxEnv.lifecycleDispatcher`에 lifecycle client를 전역 등록할 수 있다.
`LynxMemoryUsageQuery`는 비동기 전역 snapshot과 timeout 결과를 reporter thread에서 돌려준다.
웹 PerformanceObserver를 동시에 붙이면 같은 pipeline을 두 번 기록할 수 있다.

## 결정

### D1. 수집은 opt-in iOS 호스트 능력이다

앱이 `--performance-capture` 실행 인자를 받은 경우에만 수집기를 만든다. 평소 개발 실행과
제품 화면에는 파일 I/O나 memory query가 추가되지 않는다. 수집기는 LynxView가 생성되기
전에 `LynxEnv.lifecycleDispatcher`에 등록해 최초 `loadBundle`을 놓치지 않는다.

ReactLynx `PerformanceObserver`는 이번 단계에 함께 등록하지 않는다. native lifecycle
callback 하나를 수집의 단일 출처로 삼아 중복 레코드와 초기 등록 순서 경쟁을 피한다.

### D2. reporter callback은 UI 작업 없이 직렬 NDJSON로 보존한다

Performance callback과 memory callback에서 UIKit이나 LynxView를 변경하지 않는다. callback
결과는 전용 serial queue에서 ADR-0018 D2의 envelope로 직렬화한다.

```text
Library/Caches/LynxPerformance/capture.ndjson
```

캡처 시작마다 파일을 비우며, JSON key를 정렬해 한 줄에 레코드 하나를 append한다.
`Library/Caches`는 재현 세션의 임시 저장소일 뿐 보존소가 아니다. 앱 재설치·OS 정리·다음
캡처 시작으로 사라질 수 있다.

### D3. 초기 로드와 탭 렌더를 명시적인 측정 시점으로 삼는다

최초 `loadBundle` 또는 FCP entry에서 `after-initial-load` 전역 메모리 snapshot을 한 번만
요청한다. 초기 트리에 포함된 timing flag는 사용자 탭 전환이 아니므로 같은 entry에서
내비게이션 snapshot을 중복 생성하지 않는다.

바텀 네비게이션의 선택된 탭에는 다음 제품 비식별 timing flag를 넣는다.

```text
libitum:navigation:<tab>
```

초기 로드 뒤 해당 identifier의 pipeline이 오면 탭별 순번을 붙여 메모리를 요청한다.
Lynx timing flag는 같은 값의 첫 등장만 측정하므로 반복 전환을 회차별로 재려면 향후
identifier에 고유 실행 ID를 공급하도록 이 결정을 재검토해야 한다.

### D4. 메모리 query timeout은 5초이며 partial 결과를 버리지 않는다

시뮬레이터·개발 빌드에서 기본 2초보다 느린 instance도 관찰할 수 있도록 timeout을 5초로
고정한다. 결과에는 collection status·소요/timeout·expected/completed instance 수와
공식 메모리 범주를 보존한다. timeout 또는 불완전 instance도 ADR-0018 D4에 따라 분석기가
`partial`로 표시하며, 수집기가 누락값을 0으로 만들지 않는다.

### D5. 수동 조작 CLI와 재사용 smoke 오케스트레이션을 분리한다

설치·부팅이 끝난 Simulator를 세부 조작하는 명령은 다음 네 개다.

```sh
pnpm --filter @libitums/mobile performance:capture -- start
pnpm --filter @libitums/mobile performance:capture -- path
pnpm --filter @libitums/mobile performance:capture -- report
pnpm --filter @libitums/mobile performance:capture -- stop
```

- `start`: 설치된 `com.libitum.host`를 종료한 뒤 opt-in 플래그로 재실행한다. Debug 개발
  서버 상태가 결과를 바꾸지 않도록 내장 `main.lynx` URL도 명시한다.
- `path`: booted simulator의 data container를 조회해 원시 파일 위치를 출력한다.
- `report`: 원시 NDJSON을 ADR-0018의 기존 분석기로 검증·요약한다.
- `stop`: Host를 종료한다.

CLI는 앱 설치·시뮬레이터 부팅·Lynx 번들 복사를 대신하지 않는다. 이 준비 단계가 실패했을
때 조용히 다른 기기나 dev server로 대체하지 않는다.

로컬과 CI에서 전체 연결을 한 번에 확인할 때는 별도의 저장소 소유 명령을 쓴다.

```sh
pnpm --filter @libitums/mobile performance:capture:smoke
pnpm --filter @libitums/mobile performance:capture:smoke -- --udid <Simulator-UDID>
```

smoke는 bundle 생성, CocoaPods 잠금 설치, Release Simulator build, boot/install, opt-in
capture, 기존 분석기 검증과 cleanup을 조정한다. UDID가 없으면 iPhone 17 Pro/iOS 26.5
Simulator를 만들고 끝에 삭제한다. UDID를 받으면 그 기기만 사용하고 삭제하지 않는다.
Rendering entry와 Memory snapshot이 모두 있어야 성공하지만 성능 수치에는 threshold를
적용하지 않는다. 구체적인 CI trigger와 비차단 경계는 ADR-0020 D3·D4가 정한다.

### D6. 원시는 커밋하지 않고 정제된 측정 보고서만 공유한다

NDJSON에는 로컬 시간과 runtime metadata가 포함될 수 있으므로 저장소와 PR에 올리지 않는다.
측정자는 `report` 출력을 검토하고 필요한 수치, 정확한 commit, 기기·OS·빌드 조건,
시나리오와 한계를 `docs/performance/reports/`에 수동 기록한다. 날짜는 파일명이나 제목이
아니라 보고서 본문의 `측정 일시`에만 쓴다.

### D7. 자동 검증과 실제 검증을 분리한다

- unit: 명령 파싱, container 하위 경로, 실제 iOS `pipeline/loadBundle` 입력 계약, smoke
  인자와 Rendering/Memory 성공 조건
- UI: 선택 탭의 timing flag와 비선택 탭의 부재
- integration: simctl 호출 순서, 내장 번들 실행 인자, 실제 분석기 연결, smoke 단계·실패
  전파·성공/실패 cleanup
- native build: 설치된 Lynx 4.0.1 헤더에 대한 iOS Simulator 컴파일
- runtime: 로컬 smoke 또는 관련 PR·수동·정기 macOS workflow에서 opt-in 실행 후
  Rendering/Memory 증거 검증

macOS workflow는 초기에는 비차단이며 원시 캡처를 artifact나 로그로 게시하지 않는다.
시뮬레이터 측정은 실기 baseline이나 성능 예산을 대신하지 않는다. 같은 조건의 반복값이
세 번 이상 쌓이고 허용폭 요구가 생기기 전에는 수치 pass/fail을 만들지 않는다.

## 버린 대안

- **화면 위 분석 UI를 추가한다** — 측정 대상 렌더 비용을 바꾸고 Screen 2 작업면과 겹친다.
- **ReactLynx observer와 native callback을 둘 다 쓴다** — 같은 event의 중복 제거 계약이
  추가되고 초기 등록 위치가 화면 코드로 번진다.
- **항상 캡처한다** — 평소 앱 실행에도 파일 쓰기와 memory query 비용을 넣는다.
- **Documents에 원시 파일을 영구 보존한다** — 임시 진단 자료를 사용자 데이터처럼 남긴다.
- **CLI가 보고서 Markdown을 자동 커밋한다** — 민감 필드 정제와 수치 해석 검토를 건너뛴다.
- **초기 timing flag를 탭 전환 snapshot으로 센다** — 사용자 조작이 없는데 동일한 메모리를
  전후 값처럼 기록한다.

## 대가

- iOS 시뮬레이터 전용 연결이며 Android와 실제 기기 자동 수집을 제공하지 않는다.
- 세부 `performance:capture` CLI에서는 앱 설치와 내장 번들 갱신이 여전히 준비 절차에
  남는다. 전체 연결 검증은 smoke 명령이 대신한다.
- 앱 시작 직후의 선택 탭 timing flag는 loadBundle identifier에 포함될 수 있지만,
  수집기는 이를 사용자 전환 메모리 snapshot으로 세지 않는다.
- 원시 자료를 보존하지 않으므로 보고서에 옮기지 않은 필드는 세션 종료 뒤 잃을 수 있다.
- timing flag 반복 측정에는 고유 identifier 정책이 추가로 필요하다.

## 재검토 조건

- Android 호스트 또는 두 번째 수집 플랫폼을 지원할 때 → D1·D5
- macOS smoke를 required check로 승격하거나 실기 자동 측정이 PR merge gate가 될 때 →
  D5·D7과 ADR-0020 D4의 기기 선택·설치·반복 정책
- 동일한 timing flag를 한 실행에서 두 번 이상 비교해야 할 때 → D3의 고유 identifier
- 원시 캡처를 원격 저장하거나 자동 업로드할 때 → D2·D6의 privacy·보존·sampling
- 같은 시나리오·기기·빌드 baseline이 3회 이상 쌓이고 허용폭 요구가 생길 때 → 성능 예산
- Lynx SDK를 4.0.1에서 올려 lifecycle 또는 memory API가 바뀔 때 → D1~D4
