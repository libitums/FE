# FE

소마 17기 서비스 **Duru** 프로토타입의 **사용자 대면 클라이언트**를 담는 저장소다
(ADR-0001 D1, [ADR-0025](docs/adr/0025-duru-service-display-name.md)). 클라이언트가
여럿일 수 있고, 앱마다 언어와 도구가 다르다.

## 앱

| 앱 | 무엇 | 도구 |
|---|---|---|
| [`apps/mobile`](apps/mobile) | 사용자 대면 화면 전부. Lynx 번들을 만든다 | ReactLynx · rspeedy · pnpm |
| [`apps/ios`](apps/ios) | 그 번들을 로드해 실행하는 네이티브 호스트 | Swift · Xcode · CocoaPods |
| [`apps/android`](apps/android) | 같은 번들을 로드하는 Android 최소 호스트 | Java · Gradle · Lynx SDK 4.0.1 |
| [`apps/storybook-lynx`](apps/storybook-lynx) | 실제 Lynx Web bundle을 `<lynx-view>`로 보여주는 컴포넌트 카탈로그 | Storybook · Rspeedy |
| [`apps/supabase-functions`](apps/supabase-functions) | 서버 함수(Supabase Edge Function). 지금은 계정 삭제 `delete-account` 하나 — 배포 · 시크릿은 [그 README](apps/supabase-functions/README.md) | TypeScript · Deno · Supabase CLI |

공개 재사용 컴포넌트는 [`packages/ui-lynx`](packages/ui-lynx)에 있다. 현재 Button, Back Header,
Status Indicator, Progress Header를 명시적 package export로 제공한다.

**번들을 만드는 쪽과 로드하는 쪽이 다르다** (ADR-0002 D3). 화면을 고치면 `apps/mobile`을
빌드해 호스트로 옮겨야 실기기에 반영된다. iOS는 `pnpm bundle:host`, Android는
`pnpm bundle:android`가 Lynx 번들과 정적 자산을 함께 복사한다.

Android 호스트는 번들 로드, 이미지·HTTP 서비스, 입력·SVG·오버레이 요소,
영속 저장소, 소셜 웹 인증, 법률 문서, 오디오 재생, 완료 접근성 공지를 제공한다.
나머지 iOS 네이티브 모듈은 아직 Android에 없다.
빌드와 실행은 [`apps/android/README.md`](apps/android/README.md)에 있다.

앱 이름은 서비스명이 아니라 **타깃**으로 짓는다 (ADR-0002 D4). 앱이 늘 때 무슨 축으로
나뉘는지가 이름에서 읽혀야 하기 때문이다. 웹 앱과 관리자 앱은 요구사항에 없어서 첫
단계에서 뺐고, 생기면 같은 규칙으로 들어온다.

사용자에게 보이는 서비스명은 **Duru**다. 그래서 iOS 앱 아이콘 라벨은 `Duru`지만,
`Host` 타깃·제품명과 `@libitums/*`, `--libitum-*`, `com.libitum.host`, `libitum.` 계열
식별자는 호환성을 위한 기술 이름으로 유지한다 (ADR-0025 D1~D3). Release 빌드에서 둘의
경계를 확인하는 절차는 [서비스명 수동 E2E](docs/e2e/service-name.md)에 있다.

첫 단계 목표는 핵심 사용자 흐름을 처음부터 끝까지 시연할 수 있는 상태다 (ADR-0001 D1).

## Storybook Lynx

```sh
nvm use
pnpm storybook:lynx
```

기본 URL은 `http://localhost:6006`이다. Storybook의 manager와 Controls/Actions는 Web에서
동작하고, 각 Canvas는 Rspeedy 산출물을 실제 `<lynx-view>`로 실행한다. story 목록과 native
전용 검증 한계는 [`apps/storybook-lynx/README.md`](apps/storybook-lynx/README.md)를 본다.

## 첫 실행 — `apps/mobile`

아래는 Lynx 앱 쪽 절차다. `apps/ios`는 Xcode로 여는 별개 툴체인이고, 그 절차는 이 절
끝의 각주가 가리킨다.

```sh
nvm install && nvm use           # .nvmrc의 Node로 맞춘다. 없으면 install이 받아온다
corepack enable                  # packageManager 고정이 작동하려면 필요하다 (ADR-0005 D3)
pnpm install
pnpm dev                         # dev 서버가 URL을 낸다
```

**Node를 먼저 맞춰야 한다.** 범위 밖이면 `pnpm install`이 `ERR_PNPM_UNSUPPORTED_ENGINE`으로
막힌다 — 경고가 아니라 중단이다 (ADR-0005 D3의 `engineStrict`).
`nvm`이 없으면 [nvm 설치](https://github.com/nvm-sh/nvm#installing-and-updating)가 선행이다.

`pnpm dev`가 **실제로 출력한 URL**을 쓴다. 3000번이 점유돼 있으면 조용히 다음 포트로
옮겨가므로, 문서에 적힌 포트가 아니라 화면에 나온 것을 봐야 한다.

Lynx Explorer로 그 URL을 연다 — 기기는 QR 스캔, 시뮬레이터는 번들 URL을 Enter Card URL에
붙여넣는다. Explorer는 [lynx-family GitHub releases](https://github.com/lynx-family/lynx/releases)에서 받는다.

> **판정 환경은 Explorer가 아니라 자체 호스트 앱(`apps/ios`)이다** (ADR-0012 D5).
> 호스트는 만들어져 있다. 빌드·실행 절차는
> [docs/conventions/workflow.md](docs/conventions/workflow.md)에 있고, **Mac과 Xcode
> 정식 설치가 필요하다** — Command Line Tools만으로는 `simctl`이 없다.

### GitHub Packages 인증이 필요하다

`@libitums/design-tokens`·`@libitums/icons`가 의존에 있으므로 **토큰 없이는
`pnpm install`이 `401`로 죽는다.** GitHub PAT(scope: `read:packages`)를
`~/.npmrc`에 넣는다.

```ini
# ~/.npmrc  (저장소가 아니라 홈 디렉터리다)
//npm.pkg.github.com/:_authToken=<PAT>
```

**저장소 `.npmrc`에 넣으면 동작하지 않는다.** pnpm v10.34.2·v11.5.3부터 저장소가 소유한
`.npmrc`의 인증 항목을 무시한다(` WARN  Ignored project-level auth setting`). 저장소
`.npmrc`에는 registry 연결 한 줄만 커밋한다. **`.env`에 적는 것으로도 안 된다 — pnpm은
`.env`를 읽지 않는다.**

자세한 것은 [ADR-0014 D3](docs/adr/0014-design-system-consumption-verified.md)에 있다.

### Supabase 접속 값 — 로그인에 필요하다

전화번호 로그인은 Supabase Auth(SMS OTP)를, 구글 · 페이스북은 Supabase OAuth(PKCE)를, 애플은
네이티브 Sign in with Apple의 ID 토큰 교환을 부른다([ADR-0028](docs/adr/0028-social-oauth-web-authentication.md)). 접속 값은 **`apps/mobile/.env.local`**
하나에 둔다 — 빌드가 `import.meta.env.PUBLIC_*`로 번들에 넣는다
([ADR-0027 D2](docs/adr/0027-phone-otp-auth-supabase.md)).

```sh
# apps/mobile/.env.local  (git이 추적하지 않는다 — .gitignore의 .env.*)
PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<publishable 또는 anon 키>
```

- 값은 Supabase 대시보드 **Duru** 프로젝트의 API 설정(프로젝트 URL · API 키)에서 가져온다.
  `.env.local`을 바꾸면 `pnpm dev`를 다시 띄운다.
- **service_role(비밀) 키를 넣지 않는다.** 이 값은 번들에 그대로 들어간다. `sb_secret_`로
  시작하는 키는 앱이 설정이 없는 것으로 취급한다.
- 파일이 없거나 값이 틀리면 빌드는 되지만 로그인이 **요청도 인증 창도 열지 않고**
  *"Sign-in isn't available right now."* 를 띄운다 — **네 수단 모두**다.
- SMS 공급자가 아직 없어 실제 번호로는 코드가 오지 않는다. **테스트 번호**와 고정 코드는
  [진입 흐름 e2e](docs/e2e/entry-flow.md) 「전제」에 있다.
- **소셜 로그인은 접속 값만으로 서지 않는다** — 대시보드 쪽이 더 필요하다. ① Auth Providers에서
  구글 · 애플 · 페이스북을 켠다 — 구글 · 페이스북에는 각 제공자 콘솔의 클라이언트 값을, **애플의
  Client IDs에는 번들 ID `com.libitum.host`** 를 넣는다 ② 리다이렉트 허용 목록에
  **`duru://auth-callback`** 을 더한다(구글 · 페이스북) ③ **Apple Developer에서 App ID
  `com.libitum.host`에 Sign in with Apple 기능을 켠다.** ⚠ **2026-09-29 현재 셋 다 되어 있지
  않다** — 무엇이 빠지면 어떻게 보이는지는 ADR-0028 「제공자 · 대시보드 설정」에 있다.
- 소셜 로그인은 **자체 호스트 앱에서만** 된다 — 인증 창(구글 · 페이스북)과 애플 시트가 호스트
  모듈이라 Lynx Explorer에서는 *"This sign-in option isn't available on this device."* 가 선다.
  애플은 여기에 더해 **권한(엔타이틀먼트)이 서명에 들어간 빌드**여야 한다 — 기기에 Apple 계정이
  없는 시뮬레이터에서는 시스템 알림을 닫으면 같은 문구가 선다.
- **새 설치의 로그인은 전화번호 테스트 번호로 한다** — 개발 · QA용 우회 경로를 두지 않는다. 이
  변경 전의 임시 토큰(`libitum.auth.token`)만 있는 설치는 온보딩부터 다시 지난다.
- **설정의 `Sign out`은 접속 값만으로 되지만 `Delete account`는 서버 함수가 배포돼 있어야 한다** — 함수가
  없으면 삭제가 *"Couldn't delete your account. Please try again."* 으로 끝나고 계정은 그대로다. 함수 배포와
  Apple 키(.p8) 시크릿 등록은 [`apps/supabase-functions/README.md`](apps/supabase-functions/README.md)에 있다
  ([ADR-0032](docs/adr/0032-account-sign-out-and-deletion.md)).

### PostHog 키 — 분석 전송(선택)

앱은 화면 이벤트를 PostHog(US Cloud)로 보낸다([ADR-0029](docs/adr/0029-product-analytics-posthog.md)).
키는 **`apps/mobile/.env.local`** 에 둔다 — 빌드가 `import.meta.env.PUBLIC_*`로 번들에 넣는다.

```sh
# apps/mobile/.env.local  (git이 추적하지 않는다 — .gitignore의 .env.*)
PUBLIC_POSTHOG_KEY=phc_<프로젝트 API 키>
# 배포 번들을 만드는 곳에서만 아래 줄의 주석을 푼다. 개발자 기기에서는 풀지 않는다.
# PUBLIC_ANALYTICS_ENVIRONMENT=production
```

- **없으면 아무것도 보내지 않는다.** 앱은 그대로 돈다 — 개발에 키는 필요 없다.
- 값은 PostHog 프로젝트 설정의 **Project API Key**(`phc_…`)다. **개인 API 키(`phx_…`)는 넣지 않는다** —
  이 값은 번들에 그대로 들어가고, 앱은 `phc_`로 시작하지 않는 키를 없는 것으로 취급한다.
- PostHog 프로젝트는 **하나**다(무료 요금제). 개발 · 운영은 모든 이벤트에 붙는 `environment`
  속성으로 가른다 — `PUBLIC_ANALYTICS_ENVIRONMENT`가 정확히 `production`일 때만 `production`이고
  그 밖은 `development`다([ADR-0029](docs/adr/0029-product-analytics-posthog.md) D13).
- 키는 빌드 시점에 들어간다. `.env.local`을 바꾸면 `pnpm dev`(호스트 앱이면 `pnpm bundle:host`)를
  다시 한다.

무엇을 보내고 어떻게 읽는지는 GitHub wiki
[사용자 이벤트 분석 (PostHog)](https://github.com/libitums/FE/wiki/Analytics-PostHog)에 있다.

## 문서

| 어디 | 무엇 |
|---|---|
| [docs/screens.md](docs/screens.md) | 무엇이 있는가 — 화면 목록과 그 사이의 의존성 |
| [docs/conventions/](docs/conventions/) | 무엇을 해야 하는가 — 코드 규약과 작업 흐름 |
| [docs/adr/](docs/adr/) | 왜 그렇게 정했는가 — 결정 기록. 코드보다 먼저 읽는 곳 |
| [docs/e2e/](docs/e2e/) | 수동으로 통과시킬 흐름 |
| [docs/ios-privacy.md](docs/ios-privacy.md) | iOS 앱 API 선언, Archive 확인과 남은 SDK 배포 조건 |
