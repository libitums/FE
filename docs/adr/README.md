# 결정 기록 (ADR)

이 저장소는 결정을 여기에 남긴다. 코드보다 먼저 읽는 곳이다.

## 왜 남기는가

이 저장소의 결정 상당수는 "지금은 넣지 않는다"이다. 근거를 남기지 않으면 반년 뒤에
그것이 **판단**이었는지 **누락**이었는지 구분할 수 없다. 구분되지 않으면 되돌릴
기준이 없다.

## 형식

FE에 기존 ADR 관행이 없어 형식을 여기서 정한다.

- 파일명: `NNNN-english-kebab-case.md`. 번호는 4자리, 한 번 붙이면 재사용하지 않는다.
- 본문 언어는 한국어, **파일명은 영문 kebab-case**로 고정한다. 경로가 도구·URL·
  에이전트 프롬프트를 오가기 때문이다. (`docs/conventions/`도 같은 규칙 — ADR-0010)
- 이슈는 **`[Frontend]`로 만든 것만** 링크·언급한다. 나머지는 이슈 번호 없이
  사실만 적는다 — 바뀌면 참조가 조용히 낡기 때문이다 (ADR-0010 D9).
- **새 번호는 추적할 것이 있을 때만 붙인다** (ADR-0010 D10).
  - 이미 무언가가 그 위에 지어진 결정이 바뀌면 → 새 번호, 옛 것은 `대체됨`
  - 결정 여러 개가 한꺼번에 바뀌면 → 새 번호로 묶는다 (실체화 여부와 무관)
  - **아직 실체화되지 않은** 결정이 바뀌면 → 제자리 + `정정 기록`
  - **결정이 딛고 선 사실**이 틀렸으면 → 제자리 + `정정 기록`
  - **없던 축을 처음 정하면** → 기존 ADR의 `다루는 축`이 덮으면 제자리, 아니면 새 번호
  - **실체화가 결정을 만족하지 않으면** → ADR이 아니라 파일을 고친다. 문구가 그것을
    허용했다면 문구를 조이고 `정정 기록`

> **이 규칙의 빈틈 둘**이 ADR-0013의 *"D10에서 발견한 빈틈"* 절에 적혀 있다 —
> **없던 축을 처음 정하는 경우**와 **실체화가 결정을 만족하지 않는 경우**다. 네 줄이
> 모두 "무엇이 바뀌었나"를 묻기 때문에 둘 다 해당하는 줄이 없다. **규칙은 아직 고치지
> 않았다** — 제안만 있다.

각 파일은 아래 절을 갖는다.

| 절 | 담는 것 |
|---|---|
| 상태 | `제안` · `채택` · `대체됨` |
| 날짜 | 채택일 |
| 다루는 축 | 이 ADR이 처리하는 설계 축. 추적표와 대조된다 |
| 맥락 | 이 저장소의 제약. 일반론이 아니라 이 프로젝트의 사실 |
| 결정 | 무엇으로 정했나 |
| 버린 대안 | 검토한 것과 버린 이유. 검토하지 않았으면 적지 않는다 |
| 대가 | 이 선택으로 포기하는 것 |
| 정정 기록 | 사실 오류나 **결정 문구의 허점**을 제자리에서 고쳤을 때만 붙인다. 날짜와 **어떻게 틀렸는지** |
| 재검토 조건 | 언제 다시 보나. **수치나 사건으로 적는다** |

`재검토 조건`이 필수인 이유: "지금은 안 넣는다"류 결정은 다시 볼 시점이 적혀
있지 않으면 영원히 다시 보지 않는다.

## 축 추적표

설계 조사에서 **정해진 것이 없다**고 판정된 축 전부와 **확인 못 함** 축이 아래에 있다.
조용히 빠진 축이 없는지 이 표로 확인한다.

| 축 | 처리 | ADR |
|---|---|---|
| 저장소 목표·제외 범위 | 결정 | [0001](0001-repository-goal-and-scope.md) |
| 앱 로스터 | 결정 | [0012](0012-native-host-app-minimal.md) — 0002 D1~D3 부분 대체 |
| 호스트 경계·영속 저장소 | 결정 (최소 범위) + 보류 (두 번째 플랫폼) | [0012](0012-native-host-app-minimal.md) |
| workspace 구성 (패키지 매니저·workspace 선언·태스크 러너) | 결정 | [0003](0003-workspace-and-directory-structure.md) |
| 폴더 구조 | 결정 | [0003](0003-workspace-and-directory-structure.md) |
| 네이밍 | 결정 | [0003](0003-workspace-and-directory-structure.md), [0004](0004-package-boundaries-and-dependency-direction.md) |
| package 경계와 책임 | 결정 | [0004](0004-package-boundaries-and-dependency-direction.md) |
| 의존 방향 | 결정 | [0004](0004-package-boundaries-and-dependency-direction.md) |
| 런타임·패키지매니저 버전 정책 | 결정 (형태) | [0005](0005-runtime-and-package-manager-versions.md) — 확정 값은 [0013](0013-dependencies-and-version-notation.md) D4 |
| 의존 패키지 목록 | 결정 + 보류 (`@libitum/*`) | [0013](0013-dependencies-and-version-notation.md) |
| npm 의존의 버전 표기 | 결정 (전부 정확 버전) | [0013](0013-dependencies-and-version-notation.md) |
| `dependencies`/`devDependencies` 경계 | 결정 | [0013](0013-dependencies-and-version-notation.md) |
| 명령 인터페이스 | 결정 | [0006](0006-command-interface-and-test-layers.md) |
| 린터·포매터 | 결정 (`oxlint` · `oxfmt`) | [0006](0006-command-interface-and-test-layers.md) |
| 테스트 계층 | 결정 (3계층) + 보류 (`e2e`) | [0006](0006-command-interface-and-test-layers.md) |
| 상태 관리 | 결정 | [0007](0007-app-internals-state-routing-data-errors.md) |
| 데이터 페칭 | 결정 | [0007](0007-app-internals-state-routing-data-errors.md) |
| 라우팅 | 결정 | [0007](0007-app-internals-state-routing-data-errors.md) |
| 에러 경계 | 결정 | [0007](0007-app-internals-state-routing-data-errors.md) |
| 디자인 토큰 | 결정 | [0011](0011-design-system-consumption.md) — 0008 대체 |
| 컴포넌트 프리미티브 | 결정 | [0011](0011-design-system-consumption.md) — 0008 대체 |
| 아이콘 | 결정 (소비 경로) + 보류 (형태) | [0011](0011-design-system-consumption.md) |
| private registry 인증 | 결정 | [0011](0011-design-system-consumption.md) |
| 형상 관리 위생 (.gitignore) | 결정 | [0009](0009-vcs-hygiene-ci-and-merge-gate.md) |
| CI | 결정 (시점 유예) | [0009](0009-vcs-hygiene-ci-and-merge-gate.md) |
| 머지 방식 | 결정 (squash 고정) | [0009](0009-vcs-hygiene-ci-and-merge-gate.md) |
| 브랜치 보호·머지 게이트 | 결정 (규약) + 보류 (강제) | [0009](0009-vcs-hygiene-ci-and-merge-gate.md) |
| 규약 문서 | 결정 | [0010](0010-convention-docs-and-design-done-criteria.md) |
| 설계 완료 조건 | 결정 | [0010](0010-convention-docs-and-design-done-criteria.md) |

## 보류 표

정하지 못한 것을 여기 모은다. ADR 본문에 흩어두면 다시 보지 않는다.

| 축 | 왜 못 정하나 | 막고 있는 것 | **누가** | 푸는 시점 |
|---|---|---|---|---|
| `integration`의 **서버 연동 케이스** | 무엇을 목킹할지 정할 수 없다 | API 명세가 없고 백-프론트 연동이 미착수다. 계층 자체는 첫 단계에 포함된다 | **밖** | API 명세 도착 후 |
| 브랜치 보호 강제 | 정책은 정했으나 GitHub 규칙으로 강제할 수 없다 | private 저장소 브랜치 보호 API가 현 플랜에서 403. 필수 상태 검사로 걸 CI도 아직 없다 | **밖** | CI 도입 시 (ADR-0009) |
| `e2e` 테스트 계층 | 도구는 있으나 환경이 없다 | `@lynx-js/kitten-lynx-test-infra`(vitest)가 Explorer(Android)를 구동한다. 개발도 시연도 iOS이므로(ADR-0012) **Android는 오직 e2e만을 위해 세우는 환경**이 됐다 | **밖** (환경) | Android 에뮬레이터를 루프에 둘 수 있을 때 |
| `@libitum/*` 버전 범위 | SemVer·changelog 정책이 아직 없다 | LIB-128 미확정 (ADR-0011). **그때까지 첫 설치는 정확 버전으로 적어둔다** — `pnpm add`의 기본값(caret)이 조용히 규칙이 되는 것을 막는 잠정 조치다. **ADR-0013 D1과 근거가 다르므로 섞어 읽지 않는다**(0013 D7) | **본인** — 다른 저장소의 내 대기열이다 | LIB-128 확정 후 |
| `@libitum/design-tokens`·`@libitum/icons` **설치 시점** | 배포됐는지 확인할 수단이 없다 | 비공개 레지스트리는 인증 없이 **없는 것과 못 보는 것이 똑같이 404**다. 그때까지 `apps/mobile/src`의 `var(--*)`는 전부 무효이고 **앱은 스타일 없이 뜬다** (ADR-0013 D7) | **본인** — 다른 저장소의 내 대기열이다 | 배포 확인 후 첫 설치 |
| 아이콘 소비 형태 | 개별 export 생성기가 아직 없다 | LIB-125 미착수 (ADR-0011) | **본인** — 다른 저장소의 내 대기열이다 | 아이콘을 쓰는 화면이 나올 때 |
| 번들 내장 vs URL 로드 | 편의의 문제로 남았다 | 시연이 iOS 시뮬레이터라 **네트워크 위험은 사라졌다**(같은 머신). 개발은 dev 서버 URL로 진행한다 (ADR-0012) | **본인** | 시연 직전 |
| 배포·릴리스 경계 | 시연까지는 배포가 필요 없다 | 자체 호스트를 만들되 **스토어 배포·서명은 하지 않는다**(ADR-0012 D2). 시연은 시뮬레이터에서 직접 실행한다 | — 요구 없음 | 스토어 배포가 요구될 때 |
| `tooling/*` 워크스페이스 글롭 | 넣을 패키지가 없다 | 두 번째 패키지가 생겨야 공유 설정이 의미를 갖는다 | — 요구 없음 | ADR-0003 재검토 조건 |

**`누가` 열이 있는 이유**: 1인 팀이라 *"LIB-128 확정 후"* 같은 문구가 **외부 대기처럼 읽히지만 실제로는 본인 대기열**이다. 둘을 구분하지 않으면 실체화 직전에 "이건 왜 아직 안 됐지"에서 시간이 간다. **밖**은 기다리는 것이고, **본인**은 순서를 정하는 것이다.

**해소됨** — `두 번째 플랫폼(Android) 호스트`: 시연을 **iOS 시뮬레이터**로 하기로 정했다. Android 호스트는 만들지 않는다 (ADR-0012 D1).

## 실체화 전에 확인할 것

아래는 **결정이 아니라 가정**이다. ReactLynx는 DOM이 아니어서 웹 React의 상식이
그대로 통하지 않는다. 골격을 실체화할 때 각 항목을 확인하고,
어긋나면 해당 ADR을 **ADR-0010 D10에 따라** 갱신한다. 확인 없이 넘어가지 않는다.

**가정으로 올리기 전에 공식 문서를 먼저 본다.** 공식 문서가 다루는 항목은 가정이
아니다 — ADR-0007이 이 순서를 건너뛰어 근거 여섯 줄을 잘못 썼다.

| 가정 | 어긋나면 영향받는 ADR |
|---|---|
| ReactLynx가 React 에러 경계(`componentDidCatch`)를 표준대로 지원한다 | 0007 |
| **ADR-0013 D5의 목록이 peer 충돌 없이 한 번에 풀린다.** 레지스트리 **조회**로만 정한 값이고 `pnpm install`을 돌리지 않았다 — 이름·버전·peer 범위·`engines`는 확인됐지만 전이 의존 해석은 확인되지 않았다 | 0013 |
| **`vitest 3.2.7` + `jsdom 27.4.0`에서 `vitestTestingLibraryPlugin()`이 실제로 돈다.** 공식 Lynx 템플릿이 쓰는 조합이지만 이 저장소에서 돌려본 적은 없다. 이 플러그인은 vitest **내부 API**(`builtinEnvironments.jsdom.setup` · `transformMode`)에 붙어 있다 | 0013, 0006 |

**해소됨** — `Lynx 런타임에서 fetch를 쓸 수 있다`: 쓸 수 있다. 다만 웹 `fetch`와
차이가 있어, 가정이 아니라 **제약**으로 ADR-0007 D2에 옮겼다.

**해소됨** — `rspeedy가 Node 22 LTS를 지원한다`: 지원한다. 공식 템플릿의 `engines`가
`^20.19.0 || >=22.12.0`이다. 하한이 **22.12**라서 ADR-0005의 범위를 `>=22.12 <23`으로 좁혔다.

**해소됨** — `Android 하드웨어 뒤로가기를 Explorer가 앱에 전달한다`: 가정이 아니다.
판정 환경이 iOS이고(ADR-0012 D1) iOS에는 하드웨어 백 버튼이 없다. ADR-0007 D3에서
**확정된 제약**(모든 화면에 화면 내 back 수단)으로 바뀌었다. Android 지원이 요구되면
그때 다시 가정으로 올린다.

**해소됨** — `디자인 토큰 값`: 보류가 아니다. 값이 design-system 저장소의
`foundations/*.json`에 확정돼 있고, FE는 패키지로 소비한다 (ADR-0011).

**해소됨** — `Lynx CSS가 커스텀 프로퍼티(--var)를 지원한다`: 지원한다. `:root` 스코프·상속·
`var(--x, fallback)`·중첩 참조·`calc()`·런타임 `setProperty()`까지 웹 표준과 거의 같다.
**단 Lynx 3.9 이상**이라, 가정이 아니라 **런타임 하한**으로 ADR-0005 D3에 옮겼다.

**새로 올라간 가정** — `Explorer의 Lynx 런타임이 3.9 이상이다`: 잠글 수단이 없어
확인 절차로만 다룬다(ADR-0005 D3). 어긋나면 ADR-0011 D1이 성립하지 않는다.
**자체 호스트의 Lynx SDK는 잠근다**(ADR-0012 D4) — 가정이 아니다.
