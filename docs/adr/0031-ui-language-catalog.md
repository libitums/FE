# ADR-0031 — UI 언어와 문구표 (구조 · 영어 대체 · 저장 · 전달 · 회귀 방지)

- 상태: **제안** — 구현과 `pnpm verify` 안의 계층은 끝났다. 구조(U1~U4)는 사용자 결정이다. ⚠ **루트 기본값
  D1~D6은 사용자 확인 전이고, 그중 D4는 요구사항과 다르게 바꿨다.** 그 목록이 아래 「확인 필요」 절이고,
  확인되기 전까지 `채택`으로 올리지 않는다.
- 날짜: 2026-09-29
- 다루는 축: **UI 언어** (새 축 — 어느 ADR의 `다루는 축`도 UI 문구의 출처와 언어를 덮지 않는다)
- 적용 기록(결정을 바꾸지 않는다):
  [ADR-0007](0007-app-internals-state-routing-data-errors.md) D1 — 저장 예외 둘째(`libitum.ui.language`)와
  **도입 조건 발동 · 판정**(context 하나). D6 — 나가는 라벨 낱말이 문구표 키가 됐다.
  [ADR-0016](0016-assistive-technology-semantics.md) D3 · D13 — 접미 낱말이 UI 언어를 따른다.
  [ADR-0003](0003-workspace-and-directory-structure.md) — `lib/answer-result.ts`가 라벨 함수를 잃었다.

**왜 새 번호인가** — 없던 축을 처음 정한다(ADR-0010 D10). 이 회차의 계약은 `.agent-harness/`(추적 제외)에
있어 저장소에 남지 않는다 — 근거가 남을 자리가 여기다.

## 맥락

이 앱은 한국어를 **배우는** 앱이다. 학습 콘텐츠(대사 · 예문 · 보기 칩 · 받아쓰기 대상)는 한국어가 맞지만,
안내 · 버튼 · 판정 · 접근성 이름은 사용자가 진입 흐름에서 고른 **UI 언어**여야 한다. 이 변경 전에는:

- i18n 장치가 0이었다. 주석을 뺀 한글 리터럴이 118 파일 · 601개였고, 그중 UI 문구가 약 190개(고유)였다.
  일부는 계약의 **타입 리터럴**로 굳어 있었다(`PhoneCallStatusLabel` · `SettingsNavLabel` ·
  `SpecialUnitExitLabel` 등).
- 고른 언어는 App의 `useState`에만 있고 저장되지 않았다. 진입 흐름을 건너뛰는 재방문자는 늘 기본값이었다.
- 고를 수 있는 언어는 `EntryLanguage`(`en` · `vi` · `es` · `ja`) 중 `en` 하나뿐이다(`isEntryLanguageAvailable`).
- ui-lynx 기본 문구 30개(15 파일)가 한국어였고, 그중 일부(`, 로딩 중` · `, 선택됨` · 켜짐/꺼짐 등)는 앱이
  바꿔 넘길 prop이 없다.
- 이벤트 payload에 문구 필드가 0이다 — 문구를 영어로 바꿔도 payload가 안 바뀐다.

## 사용자 결정 (2026-09-29, 다시 묻지 않는다)

| # | 물음 | 결정 |
|---|---|---|
| U1 | 구조 | **언어별 문구표 + 영어만 채움.** 고른 언어를 저장해 재실행에도 유지한다. 베트남어 · 스페인어 · 일본어는 열 때 번역만 더한다 |
| U2 | 이야기 속 이름 · 유닛/에피소드 제목 | **영어.** 이름은 로마자(지민 → `Jimin`, 이유나 → `Yuna`), 제목은 영어(약속 확인 메시지 → `Appointment message`) |
| U3 | 학습 경계가 모호한 것 | 듣기 보기(한국어 문장의 **뜻 풀이**)와 문화 노트는 **영어**. 설명 안에 「」로 인용한 한국어는 유지 |
| U4 | 약관 · 개발용 탐침 | 약관 본문(제목 4 · 문단 8)은 **영어 초안**(「법무 검토 필요」 표시). 탐침 화면(말하기 · 손글씨)과 playground는 **한국어 유지** — 사용자 도달 경로가 없다(탐침 `Nav`를 `push`하는 자리 0, playground는 `dev` 빌드에만 진입점) |

## 결정

### D1. 문구표 — `lib/`의 평면 파일, 구획 스물다섯, 모양은 타입이 진다

| 파일 | 무엇 |
|---|---|
| `lib/ui-copy.contract.ts` | `UiLanguage`(= `EntryLanguage` 별칭) · `UiCopy` · `UiCopyOverrides` · `UiCopyCatalog` · `UiLanguageStorageKey` · 함수 모양 |
| `lib/ui-copy-sections.contract.ts` | `UiCopy`의 구획 타입 스물다섯(`CommonCopy` · `ShellCopy` · 화면별) |
| `lib/ui-copy-en.ts` + `ui-copy-en-{shell,learning,story,account}.ts` | 영어 값 `uiCopyEn: UiCopy`. 300줄 상한 때문에 구획 파일로 나눈다. 영어 복수형 도우미는 `ui-copy-en-plural.ts`(영어 전용) |
| `lib/ui-copy.ts` | `uiCopyCatalog` · `uiCopyWithOverrides` · `uiCopyFor` · `UiCopyContext` · `useUiCopy` |
| `lib/ui-language.ts` | 저장 키 · `uiLanguageFrom` · `loadUiLanguage` · `saveUiLanguage` |
| `lib/ui-copy.test-support.ts` | 테스트 전용 `markedUiCopy`(모든 잎을 `⟦경로⟧`로 바꾼 표 — 「하드코딩 영어」와 「표에서 읽은 영어」를 가른다) |

- **고정 문구는 `string`, 수 · 이름 · 순번이 끼는 문구는 함수**(`(count) => string`)다. 문장을 조각으로 이어
  붙이지 않는다. **복수형은 언어 표가 함수 안에서** 정한다 — Lynx 엔진의 `Intl`에 기대지 않는다.
- 키 union은 `lib/` 밖 소유 union을 import하지 않고 같은 멤버를 적는다(`lib/`는 `screens/` · `app/`을 import하지
  않는다, ADR-0003). 소유 쪽 union이 늘면 소비자의 색인 자리에서 `tsc` 오류다.
- 런타임 스키마 없음 — 문구표는 번들 상수다. 밖에서 들어오는 값은 저장된 언어 코드 하나이고 `uiLanguageFrom`이 좁힌다.

### D2. 영어 밖 언어 · 빠진 키 — 영어 위에 덮어쓰고, 던지지 않는다

- 영어 표는 `UiCopy`(전 키 필수). 영어 밖은 `UiCopyOverrides`(깊은 부분 — **함수는 쪼개지 않고 통째 교체**).
  `UiCopyCatalog`가 **언어 키 넷을 전부 요구**한다 — 언어 키 누락은 `tsc` 오류다.
- `uiCopyFor(language)` = 영어 위에 덮어쓰기를 깊이 병합한 완전한 표. **같은 언어면 같은 객체**를 돌려준다
  (Provider 값이 렌더마다 바뀌어 전 트리를 다시 그리지 않게). `vi` · `es` · `ja`는 지금 `{}`이라 영어와 값이 같다.
- `UiCopyOverrides`의 깊은 옵셔널은 ADR-0007 D5(임시 입력값에 옵셔널 금지)에 걸리지 않는다 — 소비자는 늘 병합된
  완전한 표를 받고 옵셔널을 가르지 않는다.

### D3. 문구표에 두는 것 vs 데이터 곁에 영어로 두는 것

**판별 한 줄: 콘텐츠 항목(유닛 · 스텝 · 문항 · 알림 · 약관 절)의 id가 늘면 같이 느는 텍스트는 문구표가 아니라
그 데이터 곁의 영어 리터럴이다.** 화면 종류마다 한 번 서는 텍스트는 문구표다.

| 무엇 | 자리 |
|---|---|
| 문구표 | 탭 이름 · 나가기 라벨 · 판정 · 안내문 · 버튼 · 대화상자 · 접근성 이름과 접미 · 화면 제목 · 수 표기 |
| 데이터 곁 영어(U2 · U3 · U4) | 이름 로마자 · 에피소드/유닛/스텝 제목과 설명 · 뜻 풀이 보기 · 문화 노트 · 약관 · 알림 메시지 · 플러스 항목 · 프로필 자리표 값 |
| 한국어 그대로(학습 콘텐츠) | 듣기 `prompt` · 낱말 고르기 · 문장 순서 · 말하기 · 쓰기 · 최종 테스트 문항 · 서사 · 메신저 `text`/`choices` · 전화 · 비주얼 노벨 대사 · 온보딩 카드 대사 · 메신저 한글 자판 자모 |

메신저 `translation` · `Episode 0.` · `Tutorial.`이 이미 이 방식으로 데이터 곁에 영어로 살고 있었다.
「나」 화자는 둘로 갈린다 — 화면이 스스로 짓는 것은 문구표 `common.me`, 최종 테스트 데이터의 필드는 콘텐츠 `"Me"`.
던지는 개발자 메시지(`throw new Error`)는 한국어 그대로다.

### D4. 저장 — `libitum.ui.language`, **확정(`Continue`) 때 저장**, 부팅 때 읽는다

| 항목 | 값 |
|---|---|
| 키 | `libitum.ui.language` |
| 값 | `"en"` \| `"vi"` \| `"es"` \| `"ja"` |
| 읽는 때 | App 첫 렌더(`useState(loadUiLanguage)`) — 스플래시가 서기 전. 세션 갱신으로 진입 흐름을 건너뛰는 재방문자도 같은 값을 받는다 |
| 쓰는 때 | 언어 선택 화면의 **`Continue`(확정)** — `onContinueLanguageSelect`가 현재 언어로 `saveUiLanguage`. 이벤트 0 |
| 지우는 때 | 없음(로그아웃이 없다 — ADR-0007 D3의 열린 질문). ⟨2026-09-30⟩ 로그아웃 · 계정 삭제가 생긴 뒤에도 **없음** — 아래 재검토 조건의 판정 |
| 이상한 값 | `uiLanguageFrom`이 `en`으로 읽는다(대소문자 · 공백 보정 없음, `"ko"` 포함). 지우지 않는다. **고를 수 있는지는 보지 않는다** — 저장된 `vi`는 `vi`로 읽고 표가 영어로 채운다 |

**「고를 때마다」가 아니라 「확정 때」인 이유** — 계약은 처음에 탭마다 저장으로 적었다. ui-lynx `OptionSelector`는
이미 선택된 항목을 다시 누르면 `onChange`를 내지 않는다(`isSameOptionSelection`). 고를 수 있는 언어가 기본
선택(영어) 하나뿐이라 「고를 때마다」로는 영어가 **한 번도 저장되지 않는다.** 확정 때 저장하면 `Continue`만 누른
경로도 저장해, 진입 흐름을 마친 뒤의 저장 키 집합은 늘 `[libitum.auth.session, libitum.ui.language]`다.

ADR-0007 D1의 「넣는 것은 로그인 토큰뿐」에 대한 **둘째 예외**다 — 서버 응답도 화면 상태도 아닌 **사용자 설정
하나**이고 무효화가 필요 없다(바뀌면 덮어쓴다). 예외 목록은 ADR-0007 D1이 진다.

### D5. 전달 — React context 하나 (ADR-0007 D1 도입 조건의 판정)

문구표를 읽는 화면이 스물을 넘어 **ADR-0007 D1의 도입 조건**(「화면 3개 이상이 같은 상태를 읽는다」)이 발동했다.
D1은 「zustand를 먼저 검토」다. 검토 결과 **내장 context 하나**다.

| 대안 | 판정 | 근거 |
|---|---|---|
| props | 버림 | 화면 · 공용 컴포넌트 약 60곳에 prop이 늘고 `App → renderScreen → 화면 → 자식 → 공용 컴포넌트`로 깊이가 3을 넘는다. `App.tsx`는 이미 300줄 상한이다 |
| zustand | 버림 | D1이 zustand를 앞세운 이유(재렌더 범위를 좁힌다 · provider 트리를 늘리지 않는다)가 여기서 이득이 없다 — 값이 한 세션에 많아야 한 번 바뀌고, 그때 전체가 다시 그려지는 것이 맞는 동작이다. 런타임 의존과 번들이 는다(ADR-0013) |
| **context 하나** | **채택** | 쓰는 자리가 App 하나, 나머지는 읽기뿐인 **설정값**(테마와 같은 모양)이다. 이 context에는 상태를 하나도 더 싣지 않아 「Context로 전역 통일」(ADR-0007 버린 대안)이 걱정한 재렌더 확산이 생기지 않는다 |

- App이 `<UiCopyContext.Provider value={uiCopyFor(entryLanguage)}>`로 `ErrorBoundary`까지 감싼다. 상태 이름은
  `entryLanguage` 그대로다 — 그 상태가 곧 UI 언어다(`UiLanguage = EntryLanguage`).
- 컴포넌트는 `useUiCopy()`로 읽는다. `UiCopyContext`의 기본값이 영어 표라 Provider 없이 그린 컴포넌트도 영어를 받는다.
- **순수 함수는 context를 읽지 않고 `copy: UiCopy`를 끝 인자로 받는다.** 리듀서 · 세션 전이처럼 상태를 계산하는
  함수는 `copy`를 받지 않고 문구 대신 **키**를 낸다(`announcement: "story-complete"`).
- 결선은 문구를 모른다 — 나가기는 라벨이 아니라 출처(`exitTo: SpecialUnitEntrySource`)를 넘기고 화면이
  `specialUnitExitLabel(exitTo, copy)`로 그린다. 비주얼 노벨 완료 낭독도 결선이 아니라 화면이
  `copy.visualNovel.storyComplete`로 낸다 — 결선은 저장소에서 언어를 다시 읽지 않는다.

### D6. ui-lynx — 기본 문구는 영어, 주입 경로는 다른 언어를 열 때 (요구사항 D4를 바꿨다)

패키지의 한국어 기본 문구 30개를 **영어로만 바꾼다.** 앱이 그 문구를 바꿔 넘기는 **주입 경로는 이번에 만들지 않는다.**

1. 고를 수 있는 언어가 영어뿐이라 주입 경로가 넘길 값은 언제나 영어 기본값과 같다 — 관찰할 수 있는 차이가 0이다.
2. 주입 경로의 모양(패키지 문구 타입 + provider + hook)은 ui-lynx에 컴포넌트가 아닌 스물다섯째 canonical
   디렉터리를 요구한다 — export subpath · pack 검사 · 멤버십 테스트가 따라오는, 소비자 없는 확장이다.
3. 요구사항 D4의 앞절(영어화)은 지킨다 — 패키지 문구가 늘 영어인 것은 「없는 언어는 영어로 대체」와 결과가 같다.

공개 export 집합 · 이름 · 타입은 불변이다. **값이 바뀐 공개 export 둘**: `statusIndicatorNames` ·
`chatBubbleDeliveryLabels`. 스토리 args에 한국어를 **명시로** 넘기는 자리는 카탈로그 표본이라 그대로 둔다.

### D7. 회귀 방지 — `lint:ui-copy`

루트 `devtools/ui-copy-literals/`(`scan.mjs` · `policy.mjs` · `check.mjs` + `node --test`)가 `apps/mobile/src`와
`packages/ui-lynx/src`의 `*.ts`/`*.tsx`를 TypeScript AST로 훑어 **주석 밖 한글 리터럴**(문자열 · 템플릿 · JSX 텍스트)을
찾는다. 위반은 `파일:줄 선언 "문구"`로 찍고 종료 코드 1.

- 연결: `pnpm lint`의 잎 `lint:ui-copy`, 순수 부분은 `pnpm test`의 잎 `test:ui-copy-literals`. 둘 다 `verify`의
  기존 잎 안이라 CI 워크플로 diff 0.
- **허용**(`policy.mjs`의 `uiCopyLiteralPolicy`가 정본):
  1. 경로 여섯 — 테스트 · `*.test-support.ts` · `app/test-helpers/**` · `playground/**` · 탐침 둘.
  2. `new Error(…)`의 인자.
  3. 한글이 전부 「…」 안에 있는 리터럴(문화 노트 인용).
  4. **학습 콘텐츠 선언 25**(파일 + 최상위 선언 이름) — 문항 표 · 대사 · 턴/비트 타입 · 온보딩 대사 상수 ·
     메신저 한글 자판 자모 표 일곱. 그 선언 안의 한글은 학습 콘텐츠뿐이어야 한다.
  5. 전환 목록 `pendingMigration` — **지금 0**. 목록의 파일에 위반이 0이면 실패하는 규칙(줄어들기만 한다)이 붙어 있다.
- **잡지 못하는 것**: 하드코딩된 **영어**. 그것은 ui 테스트가 `markedUiCopy`를 주입해 화면마다 잡는다.

## 버린 대안

- **문구표를 ui-lynx가 import** — ADR-0004의 의존 방향(패키지 → 앱 금지)을 뒤집는다.
- **언어 어휘를 둘 두기**(`UiLanguage` ↔ `EntryLanguage` 대응표) — 고른 것이 곧 UI 언어라 대응표가 할 일이 없다.
- **콘텐츠 영어(U2 · U3 · U4)도 문구표에** — 항목 id가 늘 때마다 문구표 타입이 함께 자라 콘텐츠와 표가 두 곳에서
  갈린다. 판별은 D3.
- **기존 영어 약 30개를 이번에 문구표로** — 수용 기준은 한국어만 묻는다. 진입 흐름은 직전 회차(소셜 로그인)가 막
  바꾼 자리라 섞지 않았다.
- **i18n 라이브러리**(i18next 등) — 언어 하나 · 복수형 규칙 하나에 런타임 의존과 번들을 들일 근거가 없다.
  문구의 모양을 `tsc`가 지는 것이 이 저장소의 방식이다.

## 대가

- 문구를 고르는 비용이 화면마다 한 줄(`const copy = useUiCopy()`)과 순수 함수의 끝 인자 하나로 늘었다.
- 한국어를 단언하던 테스트 약 160 파일의 단언이 영어로 옮겨 갔다. 문구를 바꾸면 테스트도 바뀐다.
- 문구표 밖 영어 약 30개(진입 흐름 · 최종 테스트 패널 · 학습 완료 제목 · 젬 구매 · 지표 모달)가 남아, 영어 밖
  언어를 열면 그 자리는 영어로 남는다. 대소문자 어긋남 3건도 그대로다.
- 메인 스레드의 첫 렌더는 저장소를 못 읽을 수 있다(`NativeModules` 부재 → `en`). 저장될 수 있는 값이 `en`뿐인
  동안은 두 스레드의 첫 트리가 같다.
- 영어 문구는 언어 검수를 받지 않았다(design 가이드 — sentence case · 마침표 · 복수형 · 접미 소문자 — 는 따랐다).

## 확인 필요

⚠ 확인되기 전까지 이 ADR은 `제안`이다.

1. ⚠ **[사용자] 루트 기본값 D1~D6** — 요구사항이 「사용자 확인 필요 — 막지 않음」으로 둔 것.
2. ⚠ **[사용자] ui-lynx 주입 경로 유예**(D6) — 요구사항 D4의 뒷절(「앱이 필요하면 넘길 수 있게」)을 다른 언어를
   여는 변경으로 미뤘다.
3. ⚠ **[사용자] U2~U4 콘텐츠는 UI 언어를 따르지 않는 고정 영어다**(D3). 베트남어 등을 열 때 이것도 번역한다면
   U1의 「번역만 더한다」가 콘텐츠 데이터에도 언어 칸을 요구한다.
4. ⚠ **[사용자] 기존 영어 약 30개가 문구표 밖이다** — 다른 언어를 열기 전에 옮겨야 한다.
5. ⚠ **[사용자] 약관 영어 초안의 법무 검토**(U4). `terms-sections.ts` 머리 주석에 「영어 초안 — 법무 검토 전」이
   있다. 그리고 한국어 원문의 **「수집한 정보는 콘텐츠를 보여 주는 데만 사용한다」 취지가 영어 초안에도 남아**
   (`We use the information we collect only to show you content that suits you.`) PostHog 분석 전송과의 충돌
   ([ADR-0029](0029-product-analytics-posthog.md) 「사용자 확인 필요」 4)이 그대로다. 문구를 고칠지는 이 ADR이 정하지 않는다.
6. ⚠ **영어 문구의 언어 검수가 없다.** 전화 상태 `Speaking…`은 design의 두 후보 중 짧은 쪽을 골랐다.

## 재검토 조건

- **영어 밖 언어를 처음 여는 변경**(`isEntryLanguageAvailable`이 둘째 언어에 참) → 그 변경이 **먼저 ui-lynx 문구
  주입을 세운다**(D6) — 아니면 그 언어의 화면이 영어 접미(`, selected` · `, loading`)를 섞는다. 권고 모양: 패키지에
  `UiLynxStrings` 타입과 provider 하나, 계약 함수는 문구를 인자로 받고, 앱의 `UiCopy`에 `uiLynx` 구획을 더한다.
  같은 변경이 확인 필요 3 · 4와 메인 스레드 첫 렌더(대가 넷째)를 다시 본다.
- **UI 언어를 바꾸는 둘째 자리**(설정 화면의 언어 변경 등)가 생기는 시점 → D4의 「쓰는 때」와 D5의 「쓰는 자리가
  App 하나」를 다시 본다.
- **context에 문구표 말고 다른 값을 싣고 싶어지는 시점** → D5의 채택 근거(상태를 하나도 더 싣지 않는다)가 깨진다.
  ADR-0007 D1의 zustand 검토부터 다시 한다.
- **로그아웃이 생기는 시점** → 언어 키를 지울지 정한다(지금은 지우는 때가 없다).
  ⭐ **2026-09-30에 발동했고 판정은 「지우지 않는다」다.** 고른 UI 언어는 계정이 아니라 **기기의 설정**이고, 로그아웃 ·
  삭제 뒤 새 App 세션이 첫 렌더에 같은 값을 다시 읽어 온보딩 · 로그인이 같은 언어로 선다. 대가는 같은 기기의 다음
  사람이 앞사람의 언어를 받는 것이다 — 진입 흐름의 언어 선택에서 바꿀 수 있다. [ADR-0032](0032-account-sign-out-and-deletion.md) D6
- **허용 선언이 콘텐츠가 아닌 한글을 품은 채 발견되는 시점** → D7 규칙 4의 단위(최상위 선언)를 좁힌다.

## 부록 — 옛 한국어 라벨 → 영어 (문서가 인용하던 것)

이 변경 전에 쓰인 문서 · 실행 기록은 한국어 라벨을 인용한다. 날짜가 박힌 기록은 고치지 않고 이 표로 읽는다.
값의 정본은 `apps/mobile/src/lib/ui-copy-en-*.ts`(앱)와 각 `*.contract.ts`(ui-lynx)다.

| 옛 라벨 | 영어 | 옛 라벨 | 영어 |
|---|---|---|---|
| 맵으로 · 목록으로 · 설정으로 | `Back to map` · `Back to list` · `Back to settings` | 여정 · 롤플레이 · 설정(탭) | `Journey` · `Roleplay` · `Settings` |
| 정답 · 오답 | `Correct` · `Incorrect` | 채점 결과, 정답 | `Result, correct` |
| 결과 보기 · 문항을 모두 마쳤어요 | `See results` · `All questions done` | 다음 · 다음으로 · 확인 | `Next` · `Continue` · `Check`(대화상자 `OK`) |
| 닫기 · 건너뛰기 · 보내기 · 삭제 | `Close` · `Skip` · `Send` · `Delete` | ◯, 선택됨 · ◯, 잠김 | `◯, selected` · `◯, locked` |
| N단계 · 활동 | `Step N · …` | 연속 학습 N일 · 젬 N개 | `N-day streak` · `N gems` |
| 완료됨 · 현재 스텝 · 잠김(스텝) | `completed` · `current step` · `locked` | 시작 · N/M 활동 | `Start` · `N/M activities` |
| 학습 나가기 · 학습을 그만둘까요? | `Leave lesson` · `Leave this lesson?` | 그만두기 · 계속하기 | `Leave` · `Keep going` |
| 문화 · 퀴즈 풀기 · 문화 퀴즈 | `Culture` · `Take the quiz` · `Culture quiz` | 문항 N / M | `Question N / M` |
| 평가 · 통과 · 미통과 | `Assessment` · `Passed` · `Not passed` | 학습 완료 · 학습 미통과 | `Lesson complete` · `Lesson not passed` |
| 통화 준비 · 상대방이 말하는 중 | `Ready to call` · `Speaking…` | 답장할 차례 · 통화 완료 | `Your turn to reply` · `Call ended` |
| 통화 시작 · 듣기 · 다시 듣기 | `Start call` · `Listen` · `Listen again` | 이야기 완료 · 장면 N / 3 | `Story complete` · `Scene N / 3` |
| 메신저 · 전화 · 비주얼 노벨(형태) | `Messenger` · `Phone call` · `Visual novel` | 전체 보기 · 플러스 · 플러스 전용 | `View all` · `Plus` · `Plus only` |
| 메신저 열기 · 전화 열기 | `Open messenger` · `Open call` | 비주얼 노벨 열기 · 롤플레이 목록 보기 | `Open visual novel` · `See roleplay list` |
| 알림 · 아직 알림이 없어요 | `Notifications` · `No notifications yet` | 계정 · 학습(설정 묶음) | `Account` · `Learning` |
| 사용자 프로필 · 개인정보 보호 및 약관 | `User profile` · `Privacy and terms` | 자동 재생 · 대본 표시 · 켜짐 · 꺼짐 | `Auto-play` · `Show transcript` · `on` · `off` |
| 이름 · 학습 언어 · 학습 목표 | `Name` · `Learning language` · `Learning goal` | 결제 준비 중 · 결제 수단 | `Payment coming soon` · `Payment method` |
| 문제가 생겼어요 · 다시 시도 | `Something went wrong` · `Try again` | 입력해주세요. | `Type your answer.` |
| 지민 · 이유나 · 나(데이터) | `Jimin` · `Yuna` · `Me` | 에피소드 표지 · 최종 테스트 | `Episode intro` · `Final test` |
| 약속 확인 메시지 · 약속 확인 전화 | `Appointment message` · `Appointment call` | 카페에 도착한 지민 | `Jimin arrives at the café` |
| 첫 인사 · 이름 묻기 · 주문하기 | `First greetings` · `Asking names` · `Ordering` | 약속 잡기 · 길 묻기 | `Making plans` · `Asking for directions` |
| (ui-lynx) , 로딩 중 · , 선택됨 | `, loading` · `, selected` | (ui-lynx) 완료 · 진행 중 · 다시 시도 · 잠김 | `Completed` · `In progress` · `Try again` · `Locked` |
| (ui-lynx) 잠김 · 현재 항목 · 완료됨 · 이야기 연결 | `locked` · `current` · `completed` · `story` | (ui-lynx) N단계 중 M단계 | `Step M of N` |
