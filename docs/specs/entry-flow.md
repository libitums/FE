# LIB-261 계약 — 진입 흐름 여섯 화면: 스플래시 · 온보딩 · 로그인 · 코드 검증 · 언어 선택 · 여정 입장

- 기준: 계약 고정 · 구현 기점 `ce8d121`(LIB-259 뒤).
- 요구사항: 탭이 아직 없는 구간을 코드로 세운다 — 화면 여섯 · `entry` 스택 · 임시 토큰 ·
  `@libitums/ui-lynx` 입력 소비 · 측정 이벤트 셋. 화면 명세 쪽 변경(진입 흐름 표 · 구현 순서
  11·12번)은 [화면 명세](../screens.md)가 진다.
- 계약 타입: `apps/mobile/src/lib/entry-flow.ts` · `lib/entry-language.ts` · ~~`lib/auth-token.ts`~~(2026-09-29 삭제),
  화면 폴더의 `*.contract.ts` 여섯, 네비게이션 어휘 `apps/mobile/src/app/navigation.ts`(`Screen`).
- 상태: **고정·구현됨.** unit · ui · integration 계층이 녹색이다. 수동 iOS 흐름은 설계됐고
  **한 번도 실행되지 않았다**(§8).
- 이 문서는 공개 계약의 요약이다. 값의 정본은 코드이고, 수동 절차의 정본은
  [진입 흐름 e2e](../e2e/entry-flow.md)다.

> **개정 (2026-09-29) — 전화번호 로그인이 Supabase SMS OTP로 섰다.** 결정과 근거는
> [ADR-0027](../adr/0027-phone-otp-auth-supabase.md)이 지고, 이 문서는 진입 흐름 계약에서 바뀐
> 자리만 고쳤다. 계약 타입이 하나 늘었다 — `apps/mobile/src/lib/auth-session.contract.ts`(세션 ·
> 전화번호 · 실패 이유 · api-client 결과). 모듈은 `lib/api-client.ts` · `lib/auth-session.ts` ·
> `lib/supabase-config.ts` · `lib/auth-failure.ts`가 새로 섰다. **소셜 셋의 계약은 바뀌지 않았다.**
> 본문에 남은 LIB-261 시점의 서술 중 이 개정과 어긋나는 줄은 이 개정이 이긴다.

> **개정 (2026-09-29, 같은 날 뒤) — 소셜 셋이 Supabase OAuth(PKCE)로 섰다.** 결정과 근거는
> [ADR-0028](../adr/0028-social-oauth-web-authentication.md)(**제안** — 기본값이 사용자 확인 전)이
> 진다. 계약 타입이 하나 늘었다 — `apps/mobile/src/lib/social-sign-in.contract.ts`(제공자 · 콜백 ·
> 인증 창 결과 · 교환 · 흐름 결과). 모듈은 `lib/social-sign-in.ts` · `lib/web-authentication.ts`
> (호스트 `WebAuthenticationModule`의 접점) · `lib/pkce.ts` · `lib/auth-response.ts`(api-client에서
> 옮긴 순수 파서)가 새로 섰고, 로그인 화면이 소셜 버튼 묶음 `LoginSocialMethods`를 뗐다. **바로 위
> 개정의 「소셜 셋의 계약은 바뀌지 않았다」는 이 개정이 뒤집는다.** 어긋나는 줄은 이 개정이 이긴다.
> ⚠ 제공자 · 대시보드 설정이 아직 없어 실서버 소셜 로그인은 한 번도 돌지 않았다.

> **개정 (2026-09-29, 같은 날 셋째) — 사용자 결정: Apple은 네이티브, 임시 토큰은 인정하지 않는다.**
> 결정과 근거는 [ADR-0028](../adr/0028-social-oauth-web-authentication.md) D6 · D7이 진다. 계약 타입이
> 하나 늘었다 — `apps/mobile/src/lib/apple-sign-in.contract.ts`(호스트 `AppleSignInModule`의 요청 ·
> 결과 · nonce 한 쌍). 모듈은 `lib/apple-sign-in.ts`가 새로 섰고, `lib/api-client.ts`에 ID 토큰 교환
> (`grant_type=id_token`)이 더해졌다. **`lib/auth-token.ts`는 지워졌다** — 스플래시 판정은 세션 유무
> 하나이고, 옛 임시 토큰 설치는 온보딩부터 간다. 로그인 화면 · 결선 · 결과 union은 바뀌지 않았다.
> 어긋나는 줄은 이 개정이 이긴다.

> **개정 (2026-09-29, UI 문구표) — 고른 언어가 곧 UI 언어이고 저장된다.** 결정과 근거는
> [ADR-0031](../adr/0031-ui-language-catalog.md)(**제안**)이 진다. 언어 선택의 **확정(`Continue`)** 때
> `onContinueLanguageSelect`가 현재 언어를 `libitum.ui.language`에 쓰고, App이 첫 렌더에
> `useState(loadUiLanguage)`로 읽는다 — 재방문자(스플래시 → 세션 갱신 → 맵)도 그 값을 받는다. **고를 때는
> 쓰지 않는다**(이미 선택된 항목을 다시 누르면 `OptionSelector`가 `onChange`를 내지 않아 기본 선택 영어가
> 저장될 길이 없다). 이벤트는 여전히 0이다. 진입 흐름을 마친 뒤의 저장 키 집합은
> `[libitum.auth.session, libitum.ui.language]`다. 진입 흐름의 **기존 영어 문구는 문구표로 옮기지 않았다**
> (ADR-0031 확인 필요 4). 코드 검증의 `로그인으로`처럼 본문에 남은 한국어 라벨은 당시 값이다. **§0의 3과 §5 중
> 이 개정과 어긋나는 줄은 이 개정이 이긴다.**

## 0. 고정 범위와 불변식

1. 화면 **여섯**이 `entry` 스택에 담긴다. `entry`가 비면 앱 구간이고, 비지 않은 동안
   **바텀 네비게이션을 렌더하지 않는다**([ADR-0007](../adr/0007-app-internals-state-routing-data-errors.md) D3).
2. 진입 구간은 **단방향**이다. 여섯 전부가 **나아가는 수단**을 갖고(스플래시는 고정 시간 뒤
   자동 전이), **뒤로 나가는 수단을 가진 것은 코드 검증 하나**다(§3).
3. 저장소에 들어가는 항목은 **어느 수단이든 `libitum.auth.session` 하나**다(2026-09-29).
   `libitum.auth.token`은 **아무도 쓰지도 읽지도 않는다**(같은 날 셋째 — 옛 설치에 남은 값은 지우지
   않는다). 온보딩 진행은 저장하지 않는다(ADR-0007 D1). ⟨2026-09-29⟩ 고른 언어는 확정 때
   `libitum.ui.language`에 저장한다 — ADR-0007 D1의 예외 둘째([ADR-0031](../adr/0031-ui-language-catalog.md) D4).
4. **네 수단 전부 인증이다**(2026-09-29). 전화번호는 번호 제출 → Supabase OTP 요청 → 6자리 검증,
   Google · Facebook은 인증 창에서 제공자 로그인 → 콜백의 `code` 교환, Apple은 네이티브 시트 →
   ID 토큰 교환(nonce 포함)이 성공해야 세션이 저장되고, **그전에는
   아무것도 저장하지 않는다.**
5. 진입 화면이 소비하는 `@libitums/ui-lynx` 입력은 로그인의 **`TextField`** 와 코드 검증의
   **`CompactNumericInput`**(여섯 칸)이다
   ([ADR-0025](../adr/0025-ui-lynx-package-and-storybook-catalog.md) 「2026-09-16 확장」 절).
6. 이벤트는 셋 — 화면 열람 · 로그인 수단 선택 · 완주. **새 이벤트는 0건**이다. 네트워크는
   `lib/api-client.ts` 한 곳에서만 나가고 sink는 제품 진입점에서 `null`이다(§6). ⟨**2026-09-29** — 제품 진입점이 이제 sink를 PostHog로 잇는다. 키(`PUBLIC_POSTHOG_KEY`)가 있는 빌드에서는 실제로 집계되고, 키가 없으면 여전히 `null`이다([ADR-0029](../adr/0029-product-analytics-posthog.md)). 전송 관찰은 [분석 e2e](../e2e/analytics.md) 한 곳에 모은다⟩
7. 새 `NavAction`이 없다. `Tab` · `Nav` · `NavAction` · `initialNav` · 리듀서는 **한 글자도
   바뀌지 않았고** `Screen`에 멤버 여섯이 늘었다. 그중 `verification-code`만 필드
   `phoneNumber: PhoneNumber`를 갖는다(2026-09-29 — 옵셔널에서 필수로).

## 1. 컴포넌트와 데이터 흐름

```text
App (app/App.tsx)                                  ← 유일한 결선 자리. entry·언어·sink의 주인
├─ (entry가 비지 않은 동안 BottomNavigator를 렌더하지 않는다)
├─ SplashScreen           { onTimeout }
├─ OnboardingScreen       { onComplete }           ← step은 화면 로컬 상태다
├─ LoginScreen            { onSelectSocialMethod, onSubmitPhoneNumber }     ← 요청 상태는 화면 로컬
├─ VerificationCodeScreen { phoneNumber, onVerifyCode, onResendCode, onExit } ← 〃
├─ LanguageSelectScreen   { selected, onSelect, onContinue }
└─ JourneyEntryScreen     { language, onEnter }
```

- **화면은 스택도 `dispatch`도 저장소도 모른다.** 화면이 받는 것은 값과 콜백뿐이고 전이 · 저장 ·
  이벤트는 전부 App이 한다(ADR-0007 D3 · [코드 규약](../conventions/code.md) 「앱 내부」).
- 순수 로직은 `lib/` 셋과 화면 폴더 셋(온보딩 · 코드 검증 · 로그인)이 진다. 화면은 그 결과를 그린다.
- **화면 여섯 사이의 값 import가 0건이다** — 공용 어휘는 전부 `lib/`에 있다.
- ~~진입 흐름은 **데이터 fetch가 0건**이다. `lib/api-client.ts`를 만들지 않는다(ADR-0007 D2).~~
  ⟨2026-09-29⟩ 전화번호 경로가 `lib/api-client.ts`를 통해 Supabase Auth를 부른다. **부르는 것은
  화면이 아니라 결선(`app/entry-wiring.ts`)이다** — 화면은 콜백의 결과(성공 · 실패 이유)만 받아
  요청 중 · 실패를 그린다(ADR-0027 D1).
- ⟨2026-09-29⟩ 소셜 경로는 결선이 `signInWithSocialProvider`(`lib/social-sign-in.ts`) 하나를 부르고,
  그 함수가 호스트 인증 창 · PKCE · 교환(`lib/api-client.ts`)을 끝까지 진다. 결선은 결과가
  `signed-in`일 때만 저장 → 이벤트 → 전이하고, 화면이 받는 결과에는 세션이 실리지 않는다
  (ADR-0028 D1).

## 2. 화면 여섯

| 화면 | 머리 | 액션 행 | 나가는 수단 | 상태 |
|---|---|---|---|---|
| 스플래시 | 없음 | 없음 | 없음 — **자동 전이** | 없음 |
| 온보딩 | 진행 점 | `다음` / 마지막은 `시작하기` | 없음 | `step` — 화면 로컬 |
| 로그인 | 제목 | **없음** — 수단이 넷이라 하나만 고정할 수 없다 | 없음 | 국가 · 전화번호 입력값 · 요청 상태 **하나**(`idle` · `requesting` · `failed`, 뒤의 둘은 어느 수단의 것인지 싣는다) — 화면 로컬 |
| 코드 검증 | 나가기 + 제목 | `확인` | **`로그인으로`** | 여섯 칸의 원값 · 카운트다운 · 요청 상태(`idle` · `verifying` · `resending` · `failed`) — 화면 로컬 |
| 언어 선택 | 제목 | `다음` | 없음 | 고른 언어 — **App** |
| 여정 입장 | 제목 | `여정 시작하기` | 없음 | 없음 |

- **여섯 전부 내용 영역이 `<scroll-view>` 하나다**
  ([ADR-0022](../adr/0022-scroll-regions-and-fixed-affordances.md) D2 표 14~19번). 스플래시는 그
  표에서 **머리도 액션 행도 없는 첫 화면**이다.
- **온보딩은 화면 하나다.** `step`이 0→1→2로 가고 제목·본문·액션 낱말이 그 값에서 파생된다 —
  화면 셋이 아니다. `step`을 `Screen`에 넣지 않았다: **한 번 뒤로 가면 사라질 값을 라우팅 상태에
  남기지 않는다.**
- ~~**코드 검증은 `TextField` 하나다.**~~ ⟨2026-09-21 디자인 반영에서 이미 바뀌었다⟩ 코드 검증은
  **한 자리 칸(`CompactNumericInput size="s"`) 여섯**이다(2026-09-29 — 넷에서 여섯, 칸 크기 `l` →
  `s`로 320pt 폭 한 줄에 선다). 칸 사이 포커스 이동은 화면이 `SelectorQuery`로 네이티브 input의
  `focus`를 부른다 — 옮기지 못해도 입력은 막히지 않는다. 칸마다 접근성 이름은 `Digit N of 6`이다.
- **완성 판정은 「입력이 끝났는가」이지 검증이 아니다.** 옳고 그름은 **서버가 가린다**(2026-09-29) —
  완성된 코드를 `확인`하면 Supabase가 검증하고, 틀리거나 만료되면 오류 문구가 선다. 카운트다운이
  0이어도 입력 · 제출을 막지 않는다.
- **요청이 떠 있는 동안 그 화면의 조작은 전부 무동작이다**(2026-09-29) — 로그인은 `Continue` · 소셜
  셋 · 뒤로가기 · 국가 선택(**어느 수단의 요청이든** — 전화번호 요청 중에도 소셜 요청 중에도 네 수단
  전부), 코드 검증은 `확인` · `Resend` · 나가기 · 칸 입력. 뒤로 나간 뒤 성공
  응답이 와서 엉뚱한 스택 위에 `push`하는 경쟁을 막는다. `Continue`에 `disabled` trait을 붙이지
  않는다 — 상태는 `data-status`로만 낸다(ADR-0016 D10).
- **실패 문구는 `lib/auth-failure.ts`의 표 하나**가 이유 ~~여섯~~ **여덟**(`network` · `unavailable` ·
  `unconfigured` · `rate-limited` · `rejected` · `invalid-code` · 소셜의 `sign-in-incomplete` ·
  `unsupported`)에서 만든다. 두 화면이 같은 표를 쓰고, 로그인의 오류 요소는 수단과 무관하게 하나다.
  `unconfigured` 문구는 수단 중립으로 바뀌었다(ADR-0028 D5).
- **소셜 취소는 실패가 아니다** — 인증 창을 닫으면 `idle`로 돌아가고 문구 · 발화 · 이벤트가 0이다.
  동의 화면에서 거절한 것은 취소가 아니라 `sign-in-incomplete`다. 번호를 고치거나 국가를 바꾸면
  소셜 실패 문구도 사라진다.
- **로그인 수단 넷에 아이콘이 0건이다** — 상표 자산이 없어 낱말만 쓴다. 상표는 원문 표기 그대로다.
- ~~**로그인 화면은 상태를 하나도 들지 않는다 — 의도한 형태다.**~~ ⟨2026-09-29⟩ **이제 번호를
  읽는다** — 보낼 곳(Supabase)이 생겼다. 입력은 `phoneNumberFrom(dialCode, input)`이 보낼 E.164와
  보여 줄 문자열의 한 쌍(`PhoneNumber`)으로 만든다. 숫자만 남기고 맨 앞 `0` 하나(국내 트렁크 접두)를
  떼는데, `0`이 번호의 일부인 국가 코드 넷(`+39` · `+378` · `+225` · `+242`)은 떼지 않는다. 번호는
  **저장하지 않는다** — 코드 검증 화면의 파라미터로만 넘어간다.
- 이 칸이 `availability="enabled"`를 넘기는 것은 **넘기지 않는 것과 완전히 같다** — `TextField`는
  안 주면 같은 값을 채우고(`availability ?? "enabled"`) 그 값을 읽는 분기는 전부 `disabled`·`read-only`만
  본다 ⇒ **동작·속성 델타가 0**이다. 코드 검증 칸은 반대로 `availability`를 넘기지 않고 `bindinput`을
  넘긴다(거기서는 입력값이 **화면 로컬 상태**로 가서 완성 판정을 낸다).
- **위 표의 「상태」 칸은 계약이 아니라 실물을 적는다.**

**접근성** ([ADR-0016](../adr/0016-assistive-technology-semantics.md)).

- 화면 제목은 `accessibility-traits="header"`다. ⚠ **스플래시의 서비스 이름은 제목이 아니다** —
  뒤에 그것이 이름 붙이는 구획이 오지 않는다(D12 G1 거짓). **그래서 진입 상태 여섯 중 스플래시만
  제목 축의 닫힌 집합이 비어 있다.**
- 조작 단위(로그인 수단 · 언어 항목 · 액션 행 · 나가기)는 각각 정지 하나다(D5).
- 언어 항목은 **고른 것만 `, 선택됨`** 접미사를 단다 — D3의 「선택 여부」 축 그대로이고
  **D13의 게이트를 새로 열지 않는다.**
- **전환 통지가 없다.** `announce`를 쓰지 않는다 — 진입 전이는 D8의 후속 축이고, 그 대가를 재는
  자리는 [진입 흐름 e2e](../e2e/entry-flow.md)의 **V4**(스플래시 자동 전이)와 **V6**(탭 바 등장)다.
  둘 다 `docs/adr/README.md` 보류 표 「전환 통지」 행의 사례가 된다.
- 입력 둘의 접근성 이름은 **`TextField`가 만든다**(라벨 + counter 의미 합성). 화면이 덮어쓰지 않는다.
  ⚠ **오류 문구도 그 이름에 합성되고 보이는 `<text>`는 가려진다** — **칸에 포커스해야 들린다**
  ([TextField 계약](text-field.md) 10번).

## 3. 네비게이션

| 사건 | 액션 | `entry` 스택 |
|---|---|---|
| 앱 시작 | — | `[스플래시]` |
| 고정 시간 종료 · **세션 없음**(옛 임시 토큰만 있어도 — 2026-09-29) | `replace` | `[온보딩]` |
| 고정 시간 종료 · **세션 있음**(수단 무관) → 갱신 성공 | (응답까지 스플래시 유지) `enterApp` | `[]` → 여정 맵 |
| 고정 시간 종료 · **세션 있음** → 갱신 실패 | `replace` + `push` | `[온보딩, 로그인]` — 서버가 거절했을 때만 세션을 지운다 |
| 온보딩 완료 | `push` | `[…, 로그인]` |
| 전화번호 `Continue` → **OTP 요청 성공** | `push` | `[…, 코드 검증]` — 실패면 전이 없이 로그인에 오류 |
| 소셜 셋 → **인증 창(Google · Facebook) 또는 Apple 시트 · 교환 성공** | `push` | `[…, 언어 선택]` — **코드 검증을 건너뛴다.** 취소 · 실패면 전이 없이 로그인에 남는다 |
| 코드 `확인`(완성일 때만) → **검증 성공** | `push` | `[…, 언어 선택]` — 실패면 전이 없이 코드 검증에 오류 |
| 코드 `Resend` | — | 전이 없음. 요청이 성공해야 카운트다운 · 입력이 되돌아간다 |
| 코드 `로그인으로` | **`back`** | 한 겹 위 = 로그인 |
| 언어 `다음` | `push` | `[…, 여정 입장]` |
| `여정 시작하기` | `enterApp` | `[]` → 여정 맵 |

- **스플래시만 `replace`다.** 끝난 화면은 스택에 남길 자리가 아니고, 돌아가면 **타이머가 다시
  돈다.** ⚠ 출구를 맞추려고 고른 것이 아니다(ADR-0007 **D6.3**이 그 근거를 금지한다).
- **나가는 수단이 코드 검증 하나뿐인 근거.** 스플래시·온보딩의 뒤에는 **돌아갈 곳이 없고**,
  언어 선택의 앞 화면은 경로에 따라 **둘**(코드 검증 / 로그인)이라 라벨이 하나로 정해지지 않는다 —
  정해지지 않으면 **D6이 금지하는 「스택 모양에 종속된 나가기」**가 된다. 코드 검증만 앞이
  하나(로그인)라 라벨 `로그인으로`가 참이다. 나머지 다섯에서 그 자리를 지는 것은 **나아가는
  수단**이고, 구간이 단방향이라 그것으로 닫힌다.
- ⭐ **액션은 `back`이고 `backToRoot`가 아니다.** D6이 예방 조건으로 적어 둔 자리가 여기서 처음
  실물이 된다 — `backToRoot`의 `entry` 분기는 진입 구간을 **첫 화면(온보딩)으로** 접으므로 라벨이
  거짓이 된다. `back`이 옳은 이유는 「한 겹 위가 마침 로그인이어서」가 **아니라** 계약이 코드
  검증으로 들어오는 전이를 **로그인 하나로 닫았기** 때문이다. 그 불변식이 깨지면 라벨과 액션을
  함께 다시 본다.
- **`backToRoot`의 `entry` 분기와 「진입 구간으로 되돌아가기」는 여전히 열려 있다** — 이 단위가
  닫지 않는다(ADR-0007 D3의 열린 질문).

## 4. 토큰과 세션 — 값과 ⭐ 대가

| | ~~임시 토큰~~ (2026-09-29 폐기 — 아래 ⟨같은 날 셋째⟩) | 세션 (전화번호 · 2026-09-29부터 소셜 셋도) |
|---|---|---|
| 키 | `libitum.auth.token` | `libitum.auth.session` |
| 값 | 고정 리터럴 하나. 시각 · 수단 · 전화번호를 **싣지 않는다** | `{ accessToken, refreshToken, expiresAt }` JSON. 전화번호 · 수단을 **싣지 않는다** |
| 쓰는 시점 | ~~소셜 수단을 고를 때 1회~~ **아무도 쓰지 않는다** | **코드 검증이 성공한 뒤** · **소셜 교환(PKCE 또는 ID 토큰)이 성공한 뒤** 1회 · 갱신이 성공할 때마다(refresh 토큰이 회전한다) |
| 읽는 시점 | ~~스플래시의 고정 시간이 끝난 뒤 1회~~ **아무도 읽지 않는다** | 스플래시의 고정 시간이 끝난 뒤 1회 |
| 지우는 수단 | **없다** — 옛 설치에 값이 남는다 | 갱신을 **서버가 거절**했을 때만 지운다. 그 밖에는 없다 |

- 세션 JSON이 깨져 있으면 없는 것으로 보고 지우지 않는다.
- 이 변경 전에 전화번호로 들어와 임시 토큰만 가진 설치는 **이주하지 않는다** — 임시 토큰 갈래로
  계속 들어간다. 근거와 버린 대안은 [ADR-0027](../adr/0027-phone-otp-auth-supabase.md) D3 · D4.
- ⟨2026-09-29⟩ **이 변경 전에 소셜로 들어와 임시 토큰을 가진 설치도 그대로 인정한다** — 스플래시의
  「임시 토큰만 있음 → 곧장 앱」 갈래가 안 바뀌었다. 로그아웃이 없어 로그인으로 보내면 출구가
  재설치뿐이 되기 때문이다. ⚠ **사용자 확인 필요**([ADR-0028](../adr/0028-social-oauth-web-authentication.md) D6).
- ⟨2026-09-29, 같은 날 셋째 — 사용자 결정⟩ **위 두 줄은 뒤집혔다 — 옛 임시 토큰은 인정하지 않는다.**
  스플래시가 그 키를 읽지 않으므로 옛 설치(전화번호든 소셜이든)는 세션이 없는 설치와 같이
  **온보딩부터** 간다(ADR-0028 D6). 옛 값은 지우지 않는다 — 지우려면 키를 코드에 적어야 한다.
- Apple의 nonce 원본도 verifier와 같이 **저장하지 않는다** — Apple 요청에는 그 해시를, 교환에는 원본을
  싣고 한 호출의 지역 변수로만 산다.
- 소셜의 PKCE verifier는 **저장하지 않는다** — 한 번의 시도를 지는 함수의 지역 변수로만 산다.

- 이 모듈이 [ADR-0012](../adr/0012-native-host-app-minimal.md) D2의 저장소 모듈을 **처음 실제로
  쓰는** 자리다. 그전까지 저장소 모듈은 부르는 코드가 0건이었다.
- **저장 항목이 하나뿐임을 테스트가 키 집합으로 단언한다** — 호출 횟수가 아니라 집합이라 다른
  키를 쓰는 코드가 뒤에 생겨도 잡힌다. ⟨2026-09-29⟩ 그 집합이 **들어온 수단에 맞는 키 하나**가 됐고,
  **코드 화면에 서 있는 동안(OTP 요청은 성공했다) 키가 0개**임도 단언한다.

**⭐ 대가 — 진입 흐름을 다시 보려면 앱 재설치가 유일하다.**

`removeAuthToken`을 만들지 않았다. **쓰는 사람이 없는 문을 열지 않는다**는 판단이고 로그아웃은
범위 밖이다. ⟨2026-09-29⟩ 세션도 같다 — 지우는 것은 서버 거절 때뿐이라 이 대가는 **두 키 모두**에
그대로 걸린다. 그 결과 **한 번 끝까지 지나가면 토큰이 남아, 그 뒤로는 앱을 재시작해도 스플래시 뒤
바로 여정 맵**이다 — 온보딩 · 로그인 · 코드 검증 · 언어 선택을 **다시 볼 수 없다.** 다시 보려면
**기기에서 앱을 삭제하고 다시 설치**하는 것뿐이다.

- **결함이 아니라 이 회차의 대가다.** 숨기지 않고 여기 적는 이유는 **안 적으면 다음 사람이 흐름을
  못 돌기 때문**이다 — 수동 확인자는 T1~T7 회차와 T8·T9 회차를 **서로 다른 설치**에서 준비해야
  한다([진입 흐름 e2e](../e2e/entry-flow.md) 「재설치가 유일한 재진입 수단이다」).
- **이 대가가 사라지는 날은 로그아웃이 화면 목록에 들어오는 날**이고, 그날 `enterApp`의 짝
  (진입 구간으로 되돌아가기)도 함께 정해진다.
- ⚠ **이 대가가 판정 하나를 원리적으로 막는다** — 「고른 언어가 다시 켜면 사라진다」는 이 흐름이
  답하지 못한다(§5).

## 5. 언어 — 세션 상태

> ⟨2026-09-29⟩ **이 절의 「저장하지 않는다」 · 「다시 켜면 사라진다」는 더는 참이 아니다.** 고른 언어는
> UI 언어로 저장되고 부팅 때 읽힌다(위 「개정 (2026-09-29, UI 문구표)」). 상태의 소유자는 여전히 App의
> `useState` 하나이고 `Screen`의 필드가 아니다. 문구표를 읽는 화면이 스물을 넘어 도입 조건이 발동했고
> 판정은 context 하나다(ADR-0031 D5) — 언어 **상태**가 아니라 그 언어의 **표**를 싣는다. 재실행 유지의
> 판정자는 integration `App.ui-language.integration.test.tsx`와 [UI 언어 e2e](../e2e/ui-language.md)다.
> 아래는 LIB-261 당시의 서술이다.

- 고른 언어는 **App의 `useState` 하나**가 소유하고 prop으로 내려간다. **저장하지 않는다** —
  앱을 다시 켜면 초기값으로 돌아간다(ADR-0007 D1). **버그가 아니라 결정이다.**
- `Screen`의 필드로 넣지 않은 근거: **세션 상태이지 화면 파라미터가 아니다.**
- **도입 조건 대조 — 둘 다 미달이다.** 같은 상태를 읽는 화면은 **둘**(언어 선택 · 여정 입장)이고
  prop 깊이는 **1단계**라 ADR-0007 D1의 조건(화면 3 · 깊이 3)에 못 미친다 ⇒ `useState` 유지.
- 여정 입장은 **고른 언어의 라벨을 그대로 한 줄** 보인다 — 새 문장을 짓지 않는다.
- ⚠ **「다시 켜면 사라진다」의 판정자는 `integration` 하나뿐이다.** 실기에서는 재현할 수 없다 —
  토큰이 있으면 언어 선택에 다시 갈 수 없고, 토큰을 지우려면 재설치인데 그러면 **세션 자체가
  새것**이라 「골랐다가 다시 켰다」가 성립하지 않는다(§4의 대가). 확인자가 실기에서 그것을 찾지
  않도록 흐름 문서에도 같은 문장이 있다.
- **언어 코드는 임시가 아니고 라벨만 임시다** — 코드 위에 testid와 이벤트 값이 서 있다
  ([코드 규약](../conventions/code.md) 「임시 입력값의 이음매」).

## 6. 측정 이벤트

| 이름 | 속성 | 발생 시점 | 발생하지 않는 때 |
|---|---|---|---|
| `entry_screen_viewed` | `screen`(**스플래시를 뺀 다섯**) | 그 화면을 여는 전이의 `dispatch` 직전 1회 | **스플래시** · 코드 검증에서 `로그인으로`로 돌아갈 때 · 온보딩 `step` 전환(같은 화면이다) |
| `entry_login_method_selected` | `method`(넷) | ~~소셜: 수단 tap → 토큰 저장·전이 직전 1회.~~ **소셜: 교환이 성공해 세션을 저장한 뒤 · 전이 직전 1회**(2026-09-29). **전화번호: OTP 요청이 성공한 순간 1회**(2026-09-29) | 전화번호를 입력만 할 때 · **OTP 요청이 실패할 때**(실패한 시도를 세지 않는다 — 두 번째에 성공해도 1회다) · 재전송 · **소셜 버튼을 누르기만 했을 때 · 인증 창을 닫았을 때 · 소셜 실패** |
| `entry_completed` | 없음 | **여정 입장**의 진행 tap → `enterApp` 직전 1회 | **토큰 분기로 바로 들어가는 재방문**(완주가 아니다) |

- ⭐ **스플래시가 타입에서 배제돼 있다.** 이 저장소의 이벤트는 **전이를 일으키는 핸들러**가 내는데
  스플래시는 전이 없이 처음부터 서 있어 낼 자리가 셸의 핸들러에 **없다.** 그 수는 「앱 실행 수」와
  같고 이 기능이 만드는 관측이 아니다 — 마운트 effect를 새로 만들지 않았다. 배제는 주석이 아니라
  **타입이 진다.**
- 지표: 화면별 열람 수의 **상대 감소**가 이탈 지점이고, 수단별 선택 수와 완주 수가 나머지 둘이다.
- payload에 **전화번호 · 코드 · 토큰 값 · 고른 언어 · 시각 · 식별자를 싣지 않는다** — 타입이 초과
  속성으로 막는다. 전화번호는 어디에도 저장·전송되지 않는다.
- sink는 App의 optional prop이고 제품 진입점이 **`null`을 명시한다.** ⇒ **이 변경이 병합돼도 실제
  집계는 0건**이고, 그래서 이벤트는 **e2e 항목이 아니다** — 기기에서 관측할 수 없고 `integration`이
  진다. ⟨**2026-09-29** — 제품 진입점이 이제 sink를 PostHog로 잇는다. 키(`PUBLIC_POSTHOG_KEY`)가 있는 빌드에서는 실제로 집계되고, 키가 없으면 여전히 `null`이다([ADR-0029](../adr/0029-product-analytics-posthog.md)). 전송 관찰은 [분석 e2e](../e2e/analytics.md) 한 곳에 모은다⟩

## 7. `data-testid`

| 화면 | 이름 형태 |
|---|---|
| 스플래시 | `splash-screen-scroll` · `splash-screen-service-name` · `splash-screen-tagline` |
| 온보딩 | `onboarding-screen` · `-scroll` · `-title` · `-body` · `-next` · `-progress` · `-progress-dot-<step>` |
| 로그인 | `login-screen-scroll` · `-title` · `-header` · `-country` · `-phone-field` · `-legal` · `login-screen-method-<수단>` · **`login-screen-error`**(`failed`에서만) |
| 코드 검증 | `verification-code-screen-scroll` · `-title` · `-exit` · `-description` · `-phone` · `-timer` · `-resend` · `-input` · `-submit` · **`verification-code-screen-error`**(`failed`에서만) |
| 언어 선택 | `language-select-screen-scroll` · `-title` · `-next` · `language-select-option[-label|-mark]-<언어>` |
| 여정 입장 | `journey-entry-screen-scroll` · `-title` · `-language` · `-start` |

- 코드·인덱스가 붙는 이름은 **어휘가 개수를 정한다**(수단 · 언어 · 스텝) — 여기서 세지 않는다.
- ⟨2026-09-29⟩ 요청 상태는 testid가 아니라 **`data-status`** 로 낸다 — `login-screen-method-phone`
  (`idle` · `requesting` · `failed`, 그리고 번호 완성 여부 `data-complete`)과
  `verification-code-screen-submit`(`idle` · `verifying` · `resending` · `failed`). 정본은 두 화면의
  `*.contract.ts`다.
- ⟨2026-09-29, 같은 날 뒤⟩ 소셜 요소 셋(`login-screen-method-apple` · `-google` · `-facebook`)도
  `data-status`를 낸다 — **그 수단의 요청이면** `requesting` · `failed`, 아니면 `idle`이다(상태가
  하나라 두 요소가 동시에 `requesting`이 되지 않는다). `login-screen-error`는 소셜 실패에도 선다.
  **testid의 신규 · 삭제는 0건이다.**
- 클래스와 `data-testid`가 같은 문자열인 것은 `-scroll` 여섯뿐이다(ADR-0022 D2).

## 8. 테스트 계층

경로는 `apps/mobile/src/` 기준이다.

| 계층 | 파일 |
|---|---|
| unit | `lib/entry-flow` · `lib/entry-language` · `lib/auth-session` · `lib/api-client` · `lib/supabase-config` · `lib/auth-failure` · `lib/pkce` · `lib/web-authentication` · `lib/apple-sign-in` · `lib/social-sign-in` · `screens/onboarding/onboarding` · `screens/login/login` · `screens/verification-code/verification-code`의 `.unit.test.ts` · `app/navigation.unit.test.ts` |
| unit (호스트 네이티브) | `apps/ios/HostTests/WebAuthenticationModuleTests.swift` — 완료 페이로드 · 인자 판정 · 난수 모양. `apps/ios/HostTests/AppleSignInModuleTests.swift` — nonce 인자 판정 · 페이로드 조립(2026-09-29). **`pnpm verify` 밖**이고 명령은 [작업 흐름](../conventions/workflow.md) 「호스트 네이티브 테스트」 |
| ui | 화면마다 하나 — `<화면>.ui.test.tsx` |
| integration | `app/App.entry.integration.test.tsx`(흐름 전체 · 토큰 분기 · 바텀 네비 등장 · 이벤트 · **2026-09-29부터 서버 연동** — OTP 요청 · 검증 · 재전송 · 세션 갱신의 성공과 실패, 그리고 **소셜의 인증 창 · 교환**과 **Apple 시트 · ID 토큰 교환**의 성공 · 취소 · 실패 · 모듈 없음) · `app/App.heading-trait.integration.test.tsx`(제목 축에 진입 상태 전부) |
| e2e (수동) | [진입 흐름 e2e](../e2e/entry-flow.md) — T1–T9 · D1 · **E1–E7** · **S1–S8**(소셜 — 대부분 제공자 설정 전까지 막힘) · **A1–A7**(Apple 네이티브 — 서명 · Apple 설정 필요) · **L1**(옛 임시 토큰 설치) · K1–K5 · V1–V6. 실행 기록은 그 문서가 진다 |

- **진입 흐름 전체는 한 트리에서만 관찰된다** — 스플래시 분기 · 전이 · 토큰 저장과 재실행 · 바텀
  네비 등장 · 언어의 세션 수명 · 이벤트 순서. 화면을 고립 렌더하는 계층이 원리적으로 만들 수 없어
  `integration`이 그 자리를 진다.
- ⟨2026-09-29⟩ **서버는 `vi.stubGlobal("fetch")`로, 접속 값은 `vi.stubEnv`로 대역한다** — msw를 쓰지
  않는다([ADR-0027](../adr/0027-phone-otp-auth-supabase.md) D5). 세션 없는 두 갈래가 동기로 남아 기존
  파일들의 「임시 토큰 + 시간 경과 → 곧장 앱」 헬퍼는 그대로 돈다.
- ⟨2026-09-29, 같은 날 뒤⟩ **호스트 인증 창은 `NativeModules`의 `WebAuthenticationModule` 대역으로**
  선다 — 저장소 대역과 같은 전역 경계다. 기존 파일들의 부팅 헬퍼가 임시 토큰을 심는 것은 그대로다 —
  임시 토큰 갈래가 안 바뀌었기 때문이다([ADR-0028](../adr/0028-social-oauth-web-authentication.md) D6).
- ⟨2026-09-29, 같은 날 셋째⟩ **위 두 줄의 부팅 헬퍼는 공용 `renderSignedInApp`으로 바뀌었다**
  (`app/test-helpers/signed-in-app.ts`). 임시 토큰 갈래가 사라져, 파일 열둘이 각자 두던 동기
  `renderApp`(임시 토큰 심기)을 지우고 **세션 저장 + 갱신 응답 대역 + 스플래시 전진 + 미세 작업
  흘림**을 한 번에 하는 비동기 헬퍼를 부른다. **단언은 한 줄도 안 바뀌었다.** Apple 시트는
  `NativeModules`의 `AppleSignInModule` 대역으로 선다.
- **기존 integration 아홉 파일의 단언은 한 줄도 바뀌지 않았다.** 첫 화면이 여정 맵에서 스플래시로
  바뀌었으므로 각 파일이 **토큰이 있는 상태를 세우고 고정 시간을 전진시키는 지역 헬퍼**를 통해
  렌더한다 — 도달 경로가 한 겹 는 것을 헬퍼가 흡수한다.
- **K · V는 실기가 답한다.** 시뮬레이터에는 실물 키보드의 가림 · 완료 키 동작이 없고 VoiceOver도
  없다. **K · V가 돌지 않으면 그 계층에 참인 값이 없다** — T · D만 돈 결과로 통과를 주장하지 않는다.

## 9. 성능 기록

[ADR-0021](../adr/0021-performance-report-ci-automation.md)이 요구하는 기록은
[`entry-flow-iphone-17-pro-simulator-01`](../performance/reports/entry-flow-iphone-17-pro-simulator-01.md)이다.
⭐ **이 변경은 초기 load의 첫 화면을 바꾼다**(여정 맵 → 스플래시). 그래서 **앞선 보고서들과 같은
조건의 기준선이 아니다** — 그 사실과 관찰 구간의 한계는 그 보고서에 있다.

## 비고

- **임시 값 — 확인 권장.** 온보딩 문구 여섯 · 언어 라벨 넷 · 스플래시 보조 문구 · 코드 안내문 ·
  여정 입장 본문 · 토큰 값이 자리표다. 바뀌어도 **형태 · 화면 · 결선 · testid · 이벤트는 안
  바뀐다.** 임시가 **아닌** 것은 화면 제목 · 액션 라벨 · 나가기 라벨 · 수단 라벨 · 표식 낱말 ·
  서비스 이름이다.
- **실기가 답할 것.** 소프트 키보드의 종류(K1) · **고정 액션 행이 키보드에 덮이는가**(K3) ·
  **키보드를 내리는 수단이 하나라도 있는가**(K4) · 입력 칸 위에서 VoiceOver가 무엇을 읽는가(V1) ·
  코드 검증 머리의 최대 배율 낭독 순서(V3).
- **차단 후보 둘이 열려 있다** — K3이 「덮인다」로, K4가 「없음」으로 답하면 **코드 검증에서 진행
  자체가 막힌다.** 처방은 이 화면들의 CSS가 아니라 `@libitums/ui-lynx`의 프롭 개방이라 **이 단위의
  범위 밖**이고, 그 자리는 [ADR 보류 표](../adr/README.md)의 「소프트 키보드가 화면을 가리는 축」
  행이다.
