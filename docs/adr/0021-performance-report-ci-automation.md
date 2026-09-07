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
4. `pnpm verify`를 실행한다. PR base/head 또는 push before/head를 `POLICY_BASE`·
   `POLICY_HEAD` 환경변수로 준다.

**검사 단계는 정확히 하나다.** 성능 보고서 정책은 별도 단계가 아니라 `verify`의
마지막 단계로 들어간다(ADR-0006 D1). **게이트가 단계 목록이 아니라 명령 하나로
정의되면 「CI에만 있고 로컬에 없는 검사」가 정의상 존재할 수 없다** — 검사를 늘릴 때
workflow에 단계를 더하는 것이 아니라 `verify`에 넣게 된다. 정책 검사가 CI에서 두 번
돌지 않으므로 **두 번의 base가 서로 어긋날 위험도 발생하지 못한다.**

보고서가 필요 없는 변경도 workflow 자체는 성공 또는 실패 상태를 남긴다. 필수 상태
검사로 지정했을 때 path filter 때문에 영원히 pending인 PR을 만들지 않기 위해서다.
적용 여부 판단은 workflow YAML이 아니라 D2의 저장소 스크립트가 한다.

### D2. 보고서 의무는 로컬과 CI가 공유하는 저장소 스크립트로 검사한다

명령 인터페이스는 **둘**이고 역할이 다르다. 같은 정책 코드를 부른다.

```sh
pnpm performance:reports:gate                                           # 게이트
pnpm performance:reports:check --base <base> --head <head>              # 감사
```

| 명령 | 답하는 질문 | 범위 |
|---|---|---|
| `performance:reports:gate` | **지금 이 브랜치가 CI를 통과하나** | 스스로 구한다 (아래) |
| `performance:reports:check` | 이 두 commit 사이는 정책을 지켰나 | 사람이 인자로 준다 |

`verify`가 부르는 것은 **게이트**다(ADR-0006 D1). 감사 명령은 남긴다 — 임의의 두
commit을 소급해 볼 수단이 없으면 과거 누락을 확인할 방법이 사라진다.

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

#### 게이트가 범위를 구하는 방법

**환경이 base를 주면 그것을 쓰고, 아니면 `origin/main`과의 merge-base를 쓴다.**

1. `POLICY_BASE`·`POLICY_HEAD`가 **둘 다** 있고 all-zero SHA가 아니면 → **CI 모드.**
   그 값을 그대로 쓴다. (새 브랜치 push의 `before`가 all-zero라서 걸러야 한다.)
2. 아니면 → **로컬 모드.** head는 `HEAD`, base는 `git merge-base origin/main HEAD`.
   실패하면 `git merge-base main HEAD`. **둘 다 실패하면 실패로 끝낸다** — 무엇을
   base로 삼았는지 말할 수 없으면 판정도 할 수 없다. `HEAD~1` 같은 것으로 조용히
   넘어가지 않는다.

**모드와 base·head를 항상 출력한다.** 안 찍으면 초록이 무엇에 대한 초록인지 읽을 수 없다.

**로컬 모드는 작업 트리를 범위에 넣는다.** 커밋된 diff(`base...HEAD`)와
`git status --porcelain --untracked-files=all`의 **합집합**을 정책에 넘긴다. 아직
커밋하지 않은 채 고친 보고서는 `git show`의 옛 내용이 아니라 **디스크에서** 읽는다.
CI 모드는 합치지 않는다 — CI 체크아웃은 항상 깨끗하고, 거기서는 **정확히 CI의 의미**
여야 한다.

**이것이 필요한 이유는 편의가 아니다.** 커밋된 이력만 보면, 런타임 파일을 고쳐 두고
아직 커밋하지 않은 상태에서 게이트가 *"적용 대상 아님"* 으로 **통과한다.** 에이전트
실행자는 작업을 더티로 남기므로 그 상태가 판정 시점의 기본값이다. 합집합이 아니면
게이트는 가장 흔한 상태에서 거짓 초록을 낸다.

**더티 트리를 이유로 실패시키지는 않는다.** 더티 자체를 막으면 실행자는 절대 초록을
못 받고 옛 명령으로 되돌아간다. 합집합은 막지 않으면서 정확하다.

##### 대가와 한계

- **로컬이 CI보다 먼저 빨개진다.** `apps/mobile/src/` 아래를 고치고 아직 보고서를
  안 쓴 상태에서는 로컬 `pnpm verify`가 실패한다. **개발 중 체감이 실제로 달라진다.**
  받아들인 이유: 이것은 틀린 판정이 아니라 **게이트가 일찍 말하는 것**이고, 반대
  방향(늦게 말하는 것)이 이 게이트가 생긴 원인이다. 로컬은 CI 시야의 **상위집합**을
  보며, **부분집합은 거짓 초록을 만들지만 상위집합은 못 만든다.**
- **게이트는 커밋된 이력과 작업 트리만 본다.** 그 밖은 못 본다 — 특히 `origin/main`을
  fetch하지 않았으면 merge-base가 과거로 밀려 **범위가 실제보다 넓어질 수 있다.**
  **넓은 쪽으로만 틀린다**: 없는 보고서를 요구할 수는 있어도 있는 위반을 놓치지는
  않는다. 게이트로서 안전한 방향의 오차다.

##### 버린 base 후보

| 후보 | 왜 버렸나 (틀리는 경우) |
|---|---|
| 로컬 `main` ref 고정 | 로컬 `main`이 낡으면 base가 과거로 밀려 범위가 부풀고, 남의 런타임 변경까지 내 것으로 세어 없는 보고서를 요구한다. `main` 위에서 작업하면 base=head가 되어 **아무것도 안 본다** |
| `HEAD~1` | 커밋이 둘 이상인 브랜치에서 **앞쪽 커밋의 런타임 변경을 통째로 놓친다.** 실제로 일어난 누락의 모양이 이것이다 |
| `--base`를 사람이 매번 준다 | 「이름 하나가 답한다」가 깨진다. 인자를 외워야 하는 게이트는 안 돌린다 |
| `origin/main`의 **끝점**(merge-base 아님) | 내 브랜치가 갈라진 뒤 `origin/main`이 앞서가면 base가 내 조상이 아니게 되어 **남의 변경이 diff에 섞인다** |

채택한 `origin/main`과의 merge-base가 지는 대가는 위 「한계」의 두 번째 항목이다.

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
- **CI 로그에서 정책 실패가 `Verify` 단계 안에 묻힌다**(D1). 단계 이름만 보고 실패
  원인을 읽던 것을 잃는다. 받아들인다 — 명령 출력이 실패 사유를 한국어로 찍고, 애초에
  **단계가 갈려 있던 것이 게이트가 갈린 원인**이었다.
- **로컬 게이트가 CI보다 먼저 빨개진다**(D2). 작업 트리를 범위에 넣기 때문이고,
  커밋 전에 보고서를 요구받는 체감이 는다. 안전한 방향의 오차다.

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
- 기본 브랜치 이름이 `main`이 아니게 되거나 fork에서 작업하게 될 때 → D2의 base 사다리
  (`origin/main` 전제가 깨진다)

## 정정 기록

**2026-09-07 — 검사 단계 둘을 하나로 합치고, 게이트가 자기 범위를 구하게 했다.**

D1의 실행 목록이 `pnpm verify`(4번)와 성능 보고서 정책(5번)을 **별도 단계 둘**로
적었다. 그 형태가 **로컬에 없는 검사**를 만들었다 — 로컬에는 4번을 부르는 이름만 있고
5번까지 함께 부르는 이름이 없었으므로, **「로컬 초록 + CI 실패」가 우연이 아니라
구조적으로 가능**했다. 실제로 그 틈으로 새어 나간 변경이 있었고, 그중 한 건은 번들이
자랐는데 `pnpm verify`가 종료 코드 0이라 아무도 못 봤다.

**어떻게 틀렸나** — 「로컬과 CI가 공유하는 저장소 스크립트로 검사한다」(D2 제목)를
**스크립트 공유**로만 읽고 **호출 지점**은 안 맞췄다. 스크립트가 하나여도 그것을
부르는 자리가 CI에만 있으면 로컬은 그 검사를 돌지 않는다. **공유되어야 하는 것은
스크립트가 아니라 「무엇을 돌면 게이트를 다 돈 것인가」의 정의**다. 그 정의를 명령
하나(`pnpm verify`)로 옮겼다.

**이 틈의 출처가 이 ADR이므로 닫힘도 여기 적는다.** D2가 `--base`/`--head`를 **사람이
주는 인자**로만 설계한 것이 두 번째 원인이다 — 인자를 받아야만 도는 명령은 `verify`
같은 순서기에 이어 붙일 수 없어서, CI가 자기 단계를 따로 두는 것 말고는 방법이
없었다. 그래서 **범위를 스스로 구하는 게이트**를 D2에 더했다. 감사용
`performance:reports:check`는 그대로 남는다.

**제자리에서 고친 근거** (ADR-0010 D10): D1·D2가 짓게 한 파일은
`.github/workflows/verify.yml`과 정책 스크립트인데 **같은 변경에서 함께 고쳤다.**
옛 결정으로 남는 파일이 없으므로 추적할 대상이 없다. D3~D6(native smoke·원시 자료·
branch protection)은 한 글자도 바뀌지 않았다 — 새 번호를 붙이면 그것들이 이유 없이
`대체됨`으로 밀린다.
