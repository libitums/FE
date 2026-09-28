# ADR-0028 — 소셜 로그인 셋을 Supabase OAuth(PKCE)로 연다 (웹 인증 창 호스트 모듈 · 난수와 해시의 자리 · 콜백 스킴 · 임시 토큰의 처분)

- 상태: **제안** — 구현과 `pnpm verify` 안의 계층은 끝났다. ⚠ **결정의 기본값 여럿이 사용자가
  자리에 없는 동안 고른 것이다.** 그 목록이 아래 「사용자 확인 필요」 절이고, 확인되기 전까지
  이 ADR은 `채택`으로 올리지 않는다.
- 날짜: 2026-09-29
- 다루는 축: 인증 (소셜 제공자 · OAuth 흐름) · 호스트 네이티브 능력 (웹 인증 창)
- 부분 대체:
  - **[ADR-0027](0027-phone-otp-auth-supabase.md) D3의 한 문장** — *"기존 `libitum.auth.token`은
    소셜 셋 전용으로 그대로 둔다"*. 이제 **아무도 새로 쓰지 않고, 이미 있으면 읽기만 한다**(D6).
    같은 D3의 나머지(세션 키 · 값 모양 · 저장 시점 · 깨진 JSON · 평문)와 D1 · D2 · D4~D6은
    **그대로 산다.**
  - **[ADR-0026](0026-permission-entry-conditions-and-denial-handling.md) D4의 「열리는 것은 이 앱의
    설정 페이지 하나」** — 나가는 목적지가 **둘**이 된다. 둘째는 **웹 인증 창 하나**이고 목적지는
    authorize 주소다(D4). 같은 D4의 「여전히 막히는 것」 여섯은 **그대로 산다** — 인증 창은 임의
    URL을 여는 일반 수단도, 웹뷰도 아니다.
- 적용 기록(결정을 바꾸지 않는다):
  [ADR-0017](0017-host-native-capabilities-and-audio.md) D1의 입장 조건 셋을 **일곱째 모듈**이
  통과했고 D2의 첫째 트리거가 다시 발동했다(D2).
  [ADR-0001](0001-repository-goal-and-scope.md) D3의 「인증 인프라」 제외가 **네 수단 전부에서**
  풀렸다. [ADR-0012](0012-native-host-app-minimal.md) D2의 `딥링크`(들어오는 쪽) 금지는 **그대로
  지켰다** — URL scheme을 등록하지 않는다(D4).

**왜 새 번호인가** — 결정 여러 개가 한꺼번에 바뀐다(ADR-0010 D10). ADR-0027 D3의 저장 규칙과
ADR-0026 D4의 나가는 목적지 목록은 둘 다 **실체화돼 있고 그 위에 지어진 것이 있다**(스플래시의
세 갈래 · integration 파수꾼 · 설정 열기). 그리고 이 회차의 계약은 `.agent-harness/`(추적 제외)에
있어 **저장소에 남지 않는다** — 근거가 남을 자리가 여기다(ADR-0027이 같은 이유를 적었다).

## 맥락

[ADR-0027](0027-phone-otp-auth-supabase.md)이 전화번호 수단 하나를 Supabase SMS OTP로 열면서
소셜 셋(apple · google · facebook)을 **임시 토큰 그대로** 두었다. 수단을 고르는 순간 고정 리터럴
하나가 `libitum.auth.token`에 저장되고 곧장 언어 선택으로 가는 경로다. ADR-0027의 재검토 조건
첫 줄이 *"소셜 로그인 중 하나라도 진짜 인증이 요구되는 시점 → D3 … ADR-0017 D1의 조건도 함께
걸린다"* 였고, **이 회차가 그 시점이다.**

2026-09-29 기본값 다섯이 이 회차의 범위를 정했다. ⚠ **사용자가 자리에 없는 동안 고른 것이고
전부 「사용자 확인 필요」다.**

| # | 기본값 |
|---|---|
| 1 | 대상 제공자는 **셋 모두** — Apple · Google · Facebook. 화면에 이미 셋이 있다 |
| 2 | 인증 창은 iOS 호스트의 **`ASWebAuthenticationSession` 네이티브 모듈** |
| 3 | 리다이렉트는 앱 전용 **URL 스킴**(`duru://auth-callback`). Universal Link는 도메인이 없어 범위 밖 |
| 4 | 흐름은 **PKCE** — 공개 클라이언트라 implicit 대신 |
| 5 | 세션은 전화번호와 **같은 저장 · 갱신 경로**(`libitum.auth.session`, 스플래시 refresh). 소셜은 임시 토큰을 새로 쓰지 않는다 |

이 저장소의 사실(2026-09-29 실측).

1. **`@lynx-js/types@4.1.0` 전체에 `crypto` · `getRandomValues` · `TextEncoder` · `btoa` ·
   `openURL` 선언이 0건이다.** tsconfig의 `lib`은 `ES2022`뿐이다. ADR-0017 D1 넷째 사례 기록도
   같은 패키지에서 `btoa`/`atob` · `Blob` · `URL.createObjectURL` 0건을 적었다.
2. **설치된 Pod 트리 전체에 `ASWebAuthenticationSession` · `SFSafariViewController` ·
   `SFAuthenticationSession` · `openURL`이 0건이다.**
3. 호스트의 Deployment Target은 **17.4**다 — `ASWebAuthenticationSession`의 `.customScheme` 콜백을
   분기 없이 쓸 수 있다.
4. `apps/ios/Host/Info.plist`에 `CFBundleURLTypes`가 **없다.** 앱이 받는 URL scheme이 0개다.
5. 호스트 모듈이 **여섯** 등록돼 있었다(`apps/ios/Host/ViewController.swift`).
6. `lib/api-client.ts` 298줄 · `LoginScreen.tsx` 299줄 · `render-screen.tsx` 300줄 — oxlint
   `max-lines` 300이 오류다.
7. [e2e 공통 전제](../e2e/README.md)가 *"다른 흐름의 전제로 쓸 설치는 소셜 수단으로 들어오는 편이
   안정적"* 이라고 적고 있었다 — 소셜이 서버 없이 지나가는 유일한 경로였기 때문이다.

## 결정

### D1. 흐름은 PKCE이고, 한 번의 시도를 **함수 하나**가 끝까지 진다

`lib/social-sign-in.ts`의 `signInWithSocialProvider(provider)`가 설정 확인 → 난수 → PKCE →
authorize 주소 → 인증 창 → 콜백 파싱 → 교환을 **한 함수로** 진다. 결선(`app/entry-wiring.ts`)은
전화번호와 같은 「결과 → 저장 → 이벤트 → 전이」만 한다.

```text
① 설정이 없다                          → failed/unconfigured   (호스트 호출 0 · 요청 0)
② 호스트 난수 32바이트를 못 받는다      → failed/unsupported    (요청 0)
③ verifier · challenge를 만들고 authorize 주소를 짓는다
④ 인증 창을 못 연다                     → failed/unsupported
⑤ 사용자가 닫는다                       → cancelled             (요청 0)
   창이 실패 · 이미 떠 있음 · 인자 오류 · 모양 오류 → failed/unsupported
⑥ 콜백이 오류를 싣거나 code가 없다     → failed/sign-in-incomplete (요청 0)
⑦ code를 교환한다                       → signed-in(session) 또는 failed(교환 실패 이유)
```

- **Supabase Auth REST를 직접 부른다** — authorize는 창이 여는 GET 주소이고
  (`/auth/v1/authorize?provider=…&redirect_to=…&code_challenge=…&code_challenge_method=s256`,
  `apikey`를 싣지 않는다), 교환은 `POST /auth/v1/token?grant_type=pkce` 하나다. 교환도
  `lib/api-client.ts`가 부르고 **네트워크는 여전히 그 파일 밖에서 나가지 않는다**(ADR-0027 D1).
- **verifier는 그 호출의 지역 변수로만 산다.** 저장하지 않고 반환값에 싣지 않고 화면에 내리지
  않는다 — 화면에 내리면 화면이 PKCE를 알게 된다.
- **함수는 어떤 경우에도 거부(reject)하지 않는다.** 결과는 성공 · 취소 · 실패 이유 하나다.
- **인증 창에는 제한 시간이 없다** — 사람이 로그인하는 동안 기다린다. 교환만 기존 요청 제한
  (10초)을 탄다.
- **콜백 파서는 `URL` 생성자를 쓰지 않는다**(Lynx가 보장하지 않는다, ADR-0027 D1). 쿼리와
  프래그먼트를 **둘 다** 읽고 `error`가 `code`보다 앞선다. 동의 화면에서 거절한 것(`access_denied`)도
  `sign-in-incomplete`다 — 취소로 접지 않는다.
- **api-client의 순수 응답 파서를 `lib/auth-response.ts`로 옮겼다.** 교환을 더하면 300줄을 넘기
  때문이다(맥락 6). api-client가 다시 내보내므로 기존 import는 안 바뀌었고, 옮긴 파일은 네트워크를
  부르지 않는다.

⚠ **확인하지 못한 것** — GoTrue PKCE의 세부(`code_challenge_method=s256` 소문자 수용 · 콜백
오류가 쿼리인지 프래그먼트인지 · 허용 목록 밖 `redirect_to`의 처리)는 **공개 문서와 supabase-js의
동작에 기댄 것이고 이 저장소에서 한 번도 돈 적이 없다.** 파서가 두 자리를 다 읽는 것이 그 대비다.
실서버 확인은 아래 「제공자 · 대시보드 설정」이 풀려야 된다.

### D2. 호스트 모듈 `WebAuthenticationModule` — 메서드는 **둘**

| 메서드 | 모양 | 규칙 |
|---|---|---|
| `start(args, callback)` | `{ url, callbackScheme }` → 콜백 **정확히 한 번** | `url`이 `https`가 아니거나 스킴이 `^[a-z][a-z0-9+.-]*$`가 아니면 `invalid-arguments`. 이미 세션이 떠 있으면 `already-active`. 아니면 `ASWebAuthenticationSession`(`.customScheme`)을 열고 끝나면 `completed`(+ `callbackUrl`) · `cancelled` · `failed` |
| `randomBytes(count)` | 동기 → 소문자 16진 문자열 | `SecRandomCopyBytes`. `1...64` 밖이거나 실패하면 빈 문자열 |

- **페이로드 키는 `status`와 `callbackUrl` 둘뿐이다.** JS 접점(`lib/web-authentication.ts`)이
  `unknown`으로 받아 좁히고, 모듈이 없거나 던지면 `unavailable`/`null`로 끝난다 — 화면은 던지지
  않는다.
- **`prefersEphemeralWebBrowserSession = false`를 호스트에 고정한다** — 인자로 열지 않는다.
  Safari 쿠키를 공유해 이미 제공자에 로그인한 사용자는 비밀번호 없이 지난다. 대가는 시스템 확인
  알림(*"…을(를) 사용하여 로그인하려고 합니다"*) 한 번이고, 거기서 취소하면 `cancelled`다.
- **호스트는 authorize 주소의 도메인을 모른다** — `https`만 본다. 접속 값은 여전히 JS 한 자리
  (ADR-0027 D2)이고 호스트에 적지 않는다.
- **Info.plist · 엔타이틀먼트 · Podfile 변경이 0이다.** `AuthenticationServices`는 시스템
  프레임워크다.
- 검증: 순수 부분(완료 페이로드 · 인자 판정 · 난수 모양)은 **`HostTests`**(`pnpm verify` 밖, 명령은
  [작업 흐름](../conventions/workflow.md) 「호스트 네이티브 테스트」), 창 표시와 실제 콜백은
  **수동 e2e**다 — 창은 XCTest에서 사람 없이 닫을 수 없다.

**ADR-0017 D1의 입장 조건 셋 — 일곱째 사례.**

1. **화면 목록이 요구한다** — 로그인 화면([화면 명세](../screens.md) 구현 순서 12번)의 소셜 버튼 셋이다. 진짜 인증으로 가는
   순간 창 없이는 그 셋이 **누를 수는 있는데 들어갈 수는 없는** 버튼이 된다. 이번에는 탐침이 아니라
   **제품 화면**이다.
2. **훑은 자리.** 타입(맥락 1 — `crypto` · `openURL` 계열 0건) · 설치된 Pod(맥락 2 — 시스템 브라우저
   세션 · Safari 뷰 · URL 열기 심볼 0건) · 호스트 모듈 표(어느 행도 외부 페이지를 열지 않는다) ·
   JS 런타임 전역(ADR-0017 D1 넷째 · 다섯째 사례가 적은 목록에 브라우저 · 난수 수단이 없다).
   ⭐ **「대체 경로 0개」를 무조건으로 적지 않는다** — XElement Pod이 **`webview` 태그를
   등록한다.** 찾았는데 쓰지 않았다: ① ADR-0026 D4가 「웹뷰로 외부 페이지 띄우기」를 막고 있고
   이 ADR은 그 줄을 풀지 않는다 ② 앱이 페이지를 소유하므로 사용자 자격(비밀번호)이 앱 안의 뷰를
   지난다 ③ Safari 쿠키를 공유하지 못한다 ④ 제공자가 임베디드 웹뷰의 OAuth를 막는다는 것이 공개
   정책이다(이 저장소에서 확인하지는 않았다).
3. **`docs/e2e/`에 항목으로 적을 수 있다** — [진입 흐름 e2e](../e2e/entry-flow.md)의 **S1–S8**이
   창이 앱 위에 뜨는가 · 로그인 뒤 저절로 닫히고 언어 선택이 서는가 · 취소가 조용한가 · 재실행에서
   갱신되는가를 사람이 눈으로 판정한다.

**ADR-0017 D2의 트리거.** 첫째(모듈 수)가 **다시 발동했다** — 넷째 · 다섯째에 이어 일곱째다.
재검토의 결론은 앞의 두 번과 같이 **D1의 조건 셋을 다시 통과시키는 것**이었고 트리거 문면은
고치지 않는다(ADR-0017 D2의 판정 그대로). 둘째(한 모듈의 메서드가 다섯을 넘는 시점)에는 닿지
않는다 — 메서드가 둘이다. **난수를 같은 모듈에 둔 것이 그 선택이다** — 난수의 유일한 소비자가 이
흐름이고, 모듈을 따로 두면 모듈 수가 하나 더 는다.

### D3. 난수는 호스트, SHA-256은 JS다

- **난수(verifier의 원천)는 호스트 `randomBytes`다.** Lynx 타입에 `crypto`가 없고(맥락 1),
  `Math.random`은 암호학적 난수가 아니라 verifier로 쓸 수 없다.
- **SHA-256과 base64url은 `lib/pkce.ts`의 순수 구현이다.** 호스트에 위임하지 않는다 — RFC 7636
  부록 B의 벡터(바이트 → verifier → challenge)를 **`pnpm verify` 안의 `unit`이 그대로 잰다.**
  위임하면 검증이 `verify` 밖의 `HostTests`로 가고 호스트 메서드가 하나 는다.
- verifier는 32바이트의 base64url(43자)이라 `TextEncoder` 없이 `charCodeAt`으로 바이트가 된다.

### D4. 콜백 스킴은 `duru://auth-callback`이고 **등록하지 않는다**

- `ASWebAuthenticationSession`은 **자기 창 안에서** 지정한 스킴으로의 이동을 가로채 완료
  핸들러로 넘긴다. 그래서 `CFBundleURLTypes` 등록이 필요 없고, **등록하면 ADR-0012 D2 ·
  ADR-0026 D4가 막은 「들어오는 입구」가 생긴다.** `SceneDelegate`에 `openURLContexts`를 더하지
  않았다.
- 스킴 이름은 서비스 표시 이름(`Duru`, [ADR-0025](0025-duru-service-display-name.md))을 따랐다.
  번들 ID는 `com.libitum.host` 그대로다.

**ADR-0026 D4의 표로 인증 창을 읽는다** — 그 ADR의 재검토 조건이 *"다른 목적지가 요구되면 표의
어느 열에서 딥링크와 갈리는지를 적지 못하면 열지 않는다"* 였다.

| | 딥링크 (**여전히 금지**) | 인증 창 (**이 ADR이 여는 것**) |
|---|---|---|
| 방향 | 들어온다 | **나간다** — 우리가 목적지 하나를 연다. 돌아오는 주소는 **창이 스스로 받아** 연 함수의 콜백으로만 넘긴다 |
| 등록이 필요한가 | 그렇다 | **아니다** — 스킴을 등록하지 않는다 |
| 진입점이 는가 | 는다 | **늘지 않는다** — 콜백은 라우팅이 아니라 `start`를 부른 한 호출로 돌아온다. 밖에서 같은 주소를 열어도 앱에 닿지 않는다 |
| 누가 시작하나 | 밖 | **사용자가 로그인 화면에서 누른다** |
| 목적지 | 임의 | **하나** — Supabase authorize 주소(`https`만). 거기서 제공자 페이지로 가는 것은 창 안의 일이다 |

⚠ **어긋남을 적는다** — 요구사항은 *"Info.plist URL 스킴 등록"* 을 범위에 넣었는데 이 결정은
등록하지 않는다. 실기에서 콜백이 가로채지지 않으면 `CFBundleURLTypes`를 더한다 — 그때도 JS 계약과
모듈 시그니처는 안 바뀌고, 바뀌는 것은 **들어오는 쪽이 한 칸 열린다는 이 절의 판정**이다
(「재검토 조건」).

### D5. 세션 · 실패 어휘 · 이벤트를 두 수단이 공유한다

- **세션은 전화번호와 같은 키 `libitum.auth.session`, 같은 갱신이다**(ADR-0027 D3 · D4). 교환에
  성공한 뒤에만 저장한다 — 임시 토큰 시절의 「고르는 순간 저장」이 사라져 **두 수단의 저장 규칙이
  하나가 됐다.** 재실행하면 소셜로 받은 세션도 스플래시의 갱신 갈래를 탄다.
- **실패 이유가 여섯에서 여덟이 됐다** — `sign-in-incomplete`(콜백 오류 · `code` 없음 · 교환 4xx)와
  `unsupported`(이 환경에서 쓸 수 없음: 모듈 · 난수 · 창). 전화번호 실패 셋은 `Exclude`에서
  **`Extract`(명시 목록)** 로 바꿨다 — 새 이유가 전화번호 갈래에 조용히 섞이지 않게 한다.
- **문구 표는 여전히 하나다**(`lib/auth-failure.ts`). 새 문구 둘을 더하고, `unconfigured` 문구를
  수단 중립(*"Sign-in isn't available right now."*)으로 고쳤다 — 옛 *"Phone sign-in …"* 은 소셜에서
  거짓이다.
- **로그인 화면의 요청 상태가 하나다**(`LoginStatus`) — `requesting` · `failed`가 어느 수단의
  것인지 싣는다. 어느 수단이든 요청 중이면 **네 수단 · 뒤로가기 · 국가 선택이 전부 무동작**이다.
  **취소는 `idle`과 구별되지 않는다** — 문구 · 발화 · 이벤트가 0이다. 상태는 소셜 요소 셋에도
  `data-status`로 난다. **새 `data-testid` · 새 이벤트는 0건이다.**
- **`entry_login_method_selected`는 로그인이 성공한 순간 한 번 난다** — 소셜도 전화번호와 같다.
  순서는 세션 저장 → 수단 선택 이벤트 → 언어 선택 열람 이벤트 → `push`이고, 취소 · 실패에서는 0이다.
  오늘까지 소셜은 **누르는 순간** 났다.

### D6. 이미 저장된 임시 토큰은 **그대로 인정한다** — ⚠ 사용자 확인 필요

- 스플래시의 「임시 토큰만 있음 → 곧장 앱」 갈래를 **바꾸지 않는다.** `lib/auth-token.ts`는 한 줄도
  안 바뀌었다 — 읽기(`hasAuthToken`)는 스플래시가 계속 쓰고, **쓰기 함수 둘은 제품 코드의 호출자가
  0이 됐다.** 새로 임시 토큰을 쓰는 경로는 없다.
- 근거 둘. ① **로그아웃이 없다** — 그 설치를 로그인으로 보내면 벗어날 수단이 재설치뿐이 된다.
  ② integration 파수꾼 파일들이 「임시 토큰 부팅 → 곧장 앱」을 **동기로** 기대고 있다.
- 사용자가 「로그인으로 보냄」을 고르면 바뀌는 자리: 스플래시 분기의 `temporary` 갈래 · 파수꾼들의
  부팅 헬퍼 · `auth-token.ts` 삭제.

### D7. Apple도 웹 OAuth다 — ⚠ 사용자 확인 필요

Apple도 Google · Facebook과 같은 authorize → 창 → 교환을 탄다. 네이티브 Sign in with Apple
(`grant_type=id_token`)로 바꾸는 날 바뀌는 자리는 `social-sign-in.ts` 안의 `apple` 갈래 하나 ·
새 호스트 모듈 하나(ADR-0017 D1을 다시 통과) · 교환 한 종류다. **화면 · 결선 · 결과 union은 안
바뀐다** — `signInWithSocialProvider`가 수단을 숨기고 실패 어휘(`unsupported` ·
`sign-in-incomplete`)가 웹에 묶이지 않는다.

### D8. OAuth `state`를 쓰지 않는다

authorize 요청에 `state`를 싣지 않는다. CSRF · 콜백 주입을 `state` 대신 두 가지가 막는다 —
(1) PKCE가 받은 `code`를 이 호출만 아는 verifier에 묶어, 남이 만든 `code`를 넣어도 교환이 실패한다.
(2) 콜백 스킴을 Info.plist에 등록하지 않아(D4) 인증 세션 밖에서 이 앱으로 콜백을 주입할 입구가
없다 — 콜백은 이 앱이 연 세션 안에서만 돌아온다(RFC 9700 §2.1이 PKCE를 CSRF 방어로 인정한다).
스킴을 등록하는 날(D4 재검토)에는 `state`를 함께 넣는다.

## 제공자 · 대시보드 설정 — ⚠ 아직 하지 않았다

코드는 섰지만 **실서버로 소셜 로그인이 돈 적이 한 번도 없다.** 필요한 것은 값이 아니라 **켜야 할
자리**만 적는다 — 값은 저장소 어디에도 두지 않는다.

| 자리 | 해야 할 것 |
|---|---|
| Google · Facebook 개발자 콘솔 | OAuth 클라이언트 ID · 시크릿, 승인된 리다이렉트에 Supabase 콜백 주소 |
| Apple Developer | Services ID · 키 |
| Supabase 대시보드 **Duru** 프로젝트 — Auth Providers | 세 제공자를 켜고 위 값을 넣는다 |
| Supabase 대시보드 — 리다이렉트 허용 목록 | **`duru://auth-callback`** 을 더한다 |

설정이 빠졌을 때의 모양을 **앱이 알 수 없다** — 창 안의 일이기 때문이다.

- **허용 목록에 없으면** GoTrue가 Site URL로 보내 창이 앱으로 돌아오지 않는다. 사용자가 닫으면
  `cancelled`(문구 없음)다.
- **제공자가 꺼져 있으면** authorize가 창 안에 JSON 오류를 띄운다. 창이 뜨는 것까지는 확인되고
  로그인은 안 된다.
- **Explorer에서는 창 자체가 없다** — 모듈이 없어 `unsupported` 문구가 선다. `.env.local`이 없으면
  그보다 앞에서 `unconfigured`다.

⚠ **그래서 새 설치는 어느 수단으로도 서버 없이 로그인을 지날 수 없다.** 오늘까지 소셜이 그 경로
였고, 다른 흐름의 수동 e2e가 그것을 전제로 삼았다([e2e 공통 전제](../e2e/README.md)). 제공자 설정이
풀리기 전까지 새 설치에서 「로그인된 상태」를 만드는 길은 전화번호의 테스트 번호 하나다.

## 사용자 확인 필요

| 무엇 | 막는 것 |
|---|---|
| 맥락의 기본값 다섯 전부 | 이 ADR을 `채택`으로 올리는 것 |
| **Apple을 웹 OAuth로 둘지 네이티브로 둘지**(D7) | 막지 않는다. 네이티브면 호스트 모듈이 하나 더 는다 |
| **제공자 · 대시보드 설정**(위 절) | 실서버 소셜 로그인 · e2e S1–S5 · S7 |
| **스킴을 등록하지 않는 것**(D4) — 요구사항과 어긋난다 | 실기의 콜백 가로채기 확인(e2e S2) |
| 스킴 이름 `duru`(D4) — 역 DNS로 바꾸면 스킴 리터럴 하나와 허용 목록이 바뀐다 | 막지 않는다 |
| **이미 저장된 임시 토큰을 그대로 인정하는 것**(D6) | 막지 않는다 |
| 시스템 확인 알림을 받아들일지(D2 — `prefersEphemeralWebBrowserSession = false`) | 막지 않는다 |
| **다른 흐름 e2e의 전제**(위 절 끝) | 새 설치에서의 다른 흐름 수동 확인 |

## 버린 대안

| 대안 | 버린 이유 |
|---|---|
| `@supabase/supabase-js`의 OAuth | ADR-0027의 버린 이유 그대로에 더해, 그 흐름이 기대는 브라우저 이동 · `crypto`가 Lynx에 없다(맥락 1). 결국 창과 난수는 호스트가 진다 |
| implicit 흐름(토큰을 콜백 주소 프래그먼트로) | 공개 클라이언트다. 토큰이 주소에 실리고 가로챈 쪽이 곧 세션을 얻는다 |
| verifier를 `Math.random`으로 | 암호학적 난수가 아니다 |
| SHA-256을 호스트(CryptoKit)로 | 검증이 `pnpm verify` 밖으로 가고 호스트 메서드가 는다(D3) |
| `CFBundleURLTypes` 등록 + Safari로 열기 + `openURLContexts` | 들어오는 입구가 생기고(ADR-0012 D2 · ADR-0026 D4), 앱 전환 뒤 돌아오는 상태 기계가 생긴다. 스킴을 다른 앱이 가로챌 여지도 생긴다 |
| `webview` 태그로 제공자 페이지 | D2의 조건 2 — 찾았는데 쓰지 않았다 |
| `prefersEphemeralWebBrowserSession = true` | 확인 알림이 사라지지만 매번 제공자 비밀번호를 다시 친다 |
| verifier를 화면 상태에 | 화면이 PKCE를 알게 된다. 한 호출의 지역 변수로 충분하다(D1) |
| 소셜 요청 상태를 전화번호와 따로 | 「전화번호 요청 중 + 소셜 요청 중」이라는 불가능한 조합이 타입에 생긴다(D5) |
| 임시 토큰 설치를 로그인으로 보냄 | D6 — 로그아웃이 없어 재설치가 유일한 출구가 된다. 확인 필요로 남긴다 |
| 네이티브 Sign in with Apple | D7 — 모듈이 하나 더 는다. 확인 필요로 남긴다 |

## 대가

- **새 설치는 서버 없이 로그인을 지날 수 없다.** 제공자 설정 전에는 소셜이 막히고 전화번호는
  테스트 번호로만 된다. 다른 흐름의 수동 확인이 그만큼 비싸진다.
- **호스트 모듈이 일곱이다** — Android 이관 목록에 행이 하나 는다(ADR-0017 D5).
- **처음 한 번 시스템 확인 알림이 뜬다**(D2).
- **창 안의 실패를 앱이 모른다** — 제공자 꺼짐 · 허용 목록 밖 · 오프라인은 사용자가 창을 닫는
  것으로 끝나고 문구가 서지 않는다.
- **개발 루프에서 소셜 로그인을 볼 수 없다** — Explorer에는 모듈이 없다(ADR-0012 D3의 이중 트랙).
- **번들에 SHA-256 순수 구현이 들어간다** — 크기는 `pnpm size:check`가 판정한다.
- **임시 토큰으로 들어온 옛 설치는 계속 서버 검증 없이 들어온다**(D6).
- **콜백 모양이 공개 문서 근거다**(D1의 ⚠) — 실서버로 돌기 전까지 파서는 가정 위에 서 있다.
- 로그아웃은 여전히 없다 — 세션을 지우는 것은 갱신을 서버가 거절했을 때뿐이다(ADR-0027 D4).

## 재검토 조건

- **실기에서 등록하지 않은 스킴의 콜백이 가로채지지 않는 것이 확인되는 시점** → D4.
  `CFBundleURLTypes`를 더하고, 위 표의 「진입점이 는가」 · 「등록이 필요한가」 칸을 다시 적는다
- **실서버에서 GoTrue의 콜백 · 교환 모양이 D1의 가정과 다른 것이 확인되는 시점** → D1. 파서와
  교환 실패 판정을 고친다
- **사용자가 Apple을 네이티브로 정하는 시점** → D7. 새 모듈은 ADR-0017 D1의 조건 셋을 따로 통과한다
- **사용자가 임시 토큰 설치를 로그인으로 보내기로 정하는 시점** → D6
- **로그아웃이 화면 목록에 들어오는 시점** → D6 · ADR-0027 D3. 임시 토큰 키를 지울 첫 자리가 된다
- **Deployment Target을 17.4 아래로 내리는 시점** → D2. `.customScheme` 대신 옛 이니셜라이저와
  `#available` 분기가 필요하다
- **스킴 이름이나 번들 ID를 바꾸는 시점** → D4. 스킴 리터럴과 대시보드 허용 목록이 함께 바뀐다
- **인증 창 말고 다른 외부 페이지가 요구되는 시점**(약관 · 도움말 등) → ADR-0026 D4. 이 ADR은
  목적지 **하나**를 연 것이지 임의 URL 열기를 연 것이 아니다
