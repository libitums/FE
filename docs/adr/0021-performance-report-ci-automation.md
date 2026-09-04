# ADR-0021 — 성능 보고서 CI와 iOS smoke 자동화

- 상태: 채택
- 날짜: 2026-09-04
- 다루는 축: CI, 성능 보고서 정책, iOS 성능 수집 smoke, 머지 게이트
- 관련: **ADR-0009**(CI 도입 시점과 머지 규약), **ADR-0018**(분석·기록 경계),
  **ADR-0019**(iOS 런타임 수집)

## 맥락

ADR-0009 D3은 CI 도입을 두 번째 커미터 참여 또는 프로토타입 시연 직후로 미뤘다.
시연일인 2026-08-31이 지났고 저장소는 계속 사용 중이다. 그 사이 기능이 추가될 때마다
성능 보고서를 남겨야 한다는 규칙이 생겼지만, 사람의 기억에만 맡겨 과거 기록 누락이
발견됐다. 코드 검증과 보고서 기록 의무를 같은 PR에서 반복 가능하게 확인할 때다.

iOS 성능 수집은 `apps/ios`의 실제 Lynx 4.0.1 runtime이 있어야 끝까지 검증된다. Linux는
정적 검증과 보고서 정책에 적합하지만 iOS Simulator를 실행할 수 없다. 반대로 macOS
runner는 비용이 크고 native toolchain·Simulator 상태에 따라 간헐 실패할 수 있어 모든
PR의 필수 검사로 바로 쓰기에는 근거가 부족하다.

GitHub Actions 자체와 private package 읽기는 사용할 수 있다. 그러나 private 저장소의
`main` branch protection API는 현재 플랜에서 HTTP 403을 반환한다. 따라서 검사를 만드는
것과 머지를 검사 성공에 묶는 것은 별개의 결정이어야 한다.

## 결정

### D1. Linux Verify는 모든 PR과 `main` push에서 항상 시작한다

`.github/workflows/verify.yml`은 workflow-level path filter 없이 다음을 실행한다.

1. 전체 Git 이력을 checkout한다.
2. `.nvmrc`의 Node와 저장소가 고정한 pnpm을 사용한다.
3. `GITHUB_TOKEN`의 `packages: read` 권한으로 private package를 frozen install한다.
4. `pnpm verify`를 실행한다.
5. PR base/head 또는 push before/head를 인자로 성능 보고서 정책을 실행한다.

보고서가 필요 없는 변경도 workflow 자체는 성공 또는 실패 상태를 남긴다. 필수 상태
검사로 지정했을 때 path filter 때문에 영원히 pending인 PR을 만들지 않기 위해서다.
적용 여부 판단은 workflow YAML이 아니라 D2의 저장소 스크립트가 한다.

### D2. 보고서 의무는 로컬과 CI가 공유하는 저장소 스크립트로 검사한다

명령 인터페이스는 다음과 같다.

```sh
pnpm performance:reports:check --base <base-commit> --head <head-commit>
```

스크립트는 두 commit의 Git diff를 읽는다. 테스트 파일을 제외한 `apps/mobile/src/**` 또는
`apps/ios/**` 변경이 있으면 `docs/performance/reports/`의 README가 아닌 Markdown 보고서가
같이 바뀌어야 한다. 변경된 보고서는 다음 계약을 통과해야 한다.

- 파일명과 첫 H1 제목에는 날짜를 넣지 않는다. 날짜는 본문 메타데이터에만 둔다.
- 상태, 대상 commit, 기기, OS, Lynx SDK, 빌드와 실행 조건·시나리오·분석 결과·해석 또는
  제한 사항·결론과 후속을 기록한다.
- 보고서 디렉터리에 원본 JSON/NDJSON을 추적하지 않고 Markdown에 로컬 절대 경로를 넣지
  않는다.
- `미측정` 기록을 baseline이나 성능 통과로 표현하지 않는다.

적용 대상 런타임 변경이 없으면 성공과 함께 비적용 사유를 출력한다. 정책은 보고서가
필요한지와 기록 형식만 판단하고 성능 수치의 좋고 나쁨은 판단하지 않는다.

### D3. native 수집은 로컬과 CI가 공유하는 smoke 명령 하나로 재현한다

```sh
pnpm --filter @libitums/mobile performance:capture:smoke
pnpm --filter @libitums/mobile performance:capture:smoke -- --udid <Simulator-UDID>
```

인자가 없으면 iPhone 17 Pro/iOS 26.5 Simulator를 만들고, `--udid`가 있으면 그 정확한
Simulator만 사용한다. 명령은 Host bundle 생성, 잠금된 CocoaPods 설치, Release Simulator
build, boot, install, opt-in capture 실행과 기존 분석기 검증을 순서대로 수행한다. 캡처에서
Rendering entry와 Memory snapshot이 모두 확인돼야 성공한다.

DerivedData는 임시 디렉터리에 두고 성공·실패 모두 삭제한다. 명령이 만든 Simulator는
종료·삭제하지만 호출자가 준 Simulator는 삭제하지 않는다. Host는 실행을 시도한 경우
종료한다. 원시 레코드나 Simulator sandbox 절대 경로는 출력하지 않는다.

### D4. macOS smoke는 수동·평일 정기 관측으로만 실행한다

`.github/workflows/performance-smoke.yml`은 다음 경우에만 `macos-26` arm64, Xcode 26.5,
iOS 26.5 환경에서 D3을 실행한다.

- 수동 `workflow_dispatch`
- 평일 UTC 18:00 정기 실행

관련 경로가 바뀐 PR도 macOS smoke를 자동 시작하지 않는다. job에 `continue-on-error: true`를
두어 초기 관측 기간의 실패를 허용한다. raw capture artifact 업로드나 Markdown 작성·커밋
단계는 두지 않는다.

2026-09-04 PR #37의 macOS smoke가 성공해 수집 연결은 확인했지만 전체 실행은 32분 41초,
그중 Release `xcodebuild`는 약 27분 43초가 걸렸다. 이 비용은 관련 PR마다 자동 실행하기에는
크므로 수동·평일 정기 관측으로 한정한다. 빌드 시간과 runner 비용 최적화는 별도
[#39](https://github.com/libitums/FE/issues/39)로 분리하고, 이 결정 변경에는 최적화 구현을
포함하지 않는다.

### D5. 원시 자료 비게시와 숫자 gate 보류를 자동화보다 우선한다

원시 JSON/NDJSON은 Simulator cache 또는 로컬 임시 공간에만 둔다. CI 로그와 artifact에
게시하지 않는다. 정제된 보고서는 사람이 로컬 분석 결과를 검토하고 작성하며 CI가
자동 커밋하지 않는다.

같은 시나리오·기기·빌드의 baseline이 세 번 이상 쌓이고 허용폭 요구가 생기기 전에는
수치 threshold를 추가하지 않는다. 현재 smoke의 pass/fail은 수집·파싱 경로가 동작하고
Rendering/Memory 증거가 존재하는지만 뜻한다.

### D6. PR에는 Linux CI 상태를 제공하지만 branch protection 강제는 계속 보류한다

Linux Verify는 PR에서 보이지만 현재 플랜의 branch protection API 403 때문에 `main`의
required check로 강제할 수 없다. macOS smoke는 수동·평일 정기 관측 전용이라 PR마다 상태를
만들지 않는다. ADR-0009 D4의 PR 규약과 D5의 squash 설정은 유지한다. CI가 생겼다는 사실을
머지 게이트가 생겼다는 뜻으로 기록하지 않는다.

## 버린 대안

- **보고서 확인을 PR 템플릿 체크박스로만 둔다** — 누락과 잘못된 `미측정` 판정을 기계적으로
  잡지 못하고, 이미 누락된 기록이 생겼다.
- **workflow YAML에 정책과 native shell을 직접 쓴다** — 로컬에서 같은 조건을 재현할 수
  없고 CI 변경마다 두 구현이 갈린다.
- **macOS smoke를 모든 PR의 필수 검사로 둔다** — 관련 없는 변경에도 고비용 runner를 쓰고
  초기 간헐 실패율을 모르는 상태에서 머지를 막는다.
- **raw capture를 artifact로 올린다** — 디버깅에는 편하지만 runtime metadata와 로컬 정보의
  보존·접근·삭제 정책이 정해지지 않았다.
- **Markdown 보고서를 CI가 생성해 커밋한다** — 민감 필드 정제와 수치 해석을 사람 검토 없이
  저장소 기록으로 만든다.
- **첫 수집값에 숫자 threshold를 건다** — 대표 baseline과 허용폭이 없어 실패가 회귀인지
  환경 편차인지 판정할 수 없다.

## 대가

- branch protection이 없어 Linux Verify 실패를 무시하고 머지할 수 있다.
- macOS smoke는 관련 PR에서 자동 실행되지 않으므로 native 회귀가 PR마다 즉시 드러나거나
  머지를 막지는 않는다.
- 관련 앱 변경에는 보고서 작성 비용이 매번 들고, 정책의 경로 분류가 새 구조를 자동으로
  알지는 못한다.
- Simulator smoke는 실기 성능과 제품 성능 예산을 대표하지 않는다.
- raw artifact를 남기지 않아 실패 후 runner에서 원본을 다시 열 수 없고 로컬 재현이 필요하다.

## 재검토 조건

- private 저장소에서 branch protection API를 사용할 수 있게 될 때 → D6의 required check
- 별도 최적화 [#39](https://github.com/libitums/FE/issues/39)에서 실행 시간과 비용을 줄인 뒤
  macOS smoke 20회에서 간헐 실패율이 2% 이하이고 평균 실행 시간이 예산 안에 들 때 → D4의
  PR 자동 trigger 복원과 필수 검사 승격 여부
- 같은 시나리오·기기·빌드 baseline이 3회 이상이고 회귀 허용폭 요구가 생길 때 → D5의 숫자
  성능 gate
- raw capture의 원격 보존 요구가 생길 때 → D3·D5의 접근 권한·보존 기간·정제·삭제 정책
- Android 또는 실제 iOS 기기를 CI 판정 환경에 넣을 때 → D3·D4의 device orchestration
- 런타임 경로가 `apps/mobile/src`·`apps/ios` 밖으로 늘어날 때 → D2의 적용 경로
