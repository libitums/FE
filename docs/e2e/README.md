# 수동으로 통과시킬 흐름

**무엇을 통과시켜야 하는지를 여기에 고정해 둔다** ([ADR-0006 D6](../adr/0006-command-interface-and-test-layers.md)).
대부분은 사람이 돈다. ⟨2026-10-01⟩ **접근성 트리로 판정되는 기능 관찰 일부는 Maestro 흐름으로 옮긴다**
([ADR-0037](../adr/0037-ios-e2e-maestro.md)) — 아래 「자동화」. VoiceOver 발화 · Dynamic Type · 소프트 키보드 · 시스템
시트 · 실기 관찰은 자동화하지 않고 이 문서들이 계속 진다. Android 모의 OAuth
브라우저 왕복은 [별도 흐름](android-social-login.md)으로 확인한다.

## 형식

**파일 하나 = 흐름 하나 = 나중의 테스트 파일 하나.**
`docs/e2e/login.md` → ~~`login.e2e.test.ts`~~ `e2e/login.yaml`(ADR-0037 D3). 파일명이 이 대응을 강제한다.

```text
# <흐름 이름>              → 나중에 describe / test 이름
전제: <시작 상태>            → 나중에 beforeEach / goto
단계: 1. … 2. … 3. …        → 나중에 locator + tap/input
관찰: <무엇이 보이면 통과인가>  → 나중에 expect
```

**"관찰"은 인상이 아니라 식별 가능한 요소로 쓴다.** 자동화 도구가 CSS 셀렉터로 요소를
찾으므로("자연스럽게 보인다"가 아니라 "`#submit`이 사라지고 `#result`에 총액이 뜬다").
이렇게 쓰면 나중에 이관이 기계적이다. ⟨2026-10-01⟩ Maestro의 선택자는 CSS 셀렉터가 아니라 **보이는 문구 · 접근성
이름**이다(ADR-0037 D6) — 옮길 행의 관찰에는 testid와 함께 그 이름이 적혀 있어야 한다.

## 공통 전제

파일마다 반복해 적지 않는다. 여기 한 번만 쓴다.

- **자체 호스트 앱**에서 확인한다. Explorer는 개발 루프이지 판정 환경이 아니다
  ([ADR-0012 D5](../adr/0012-native-host-app-minimal.md)).
- 별도 표기가 없으면 **로그인된 상태에서 시작한다.**
- 로그인은 앱을 재시작해도 유지된다. 유지되지 않으면 그 자체가 실패다.
- **그 상태는 어떻게 만드나(LIB-261, 2026-09-29 개정 셋).** 「로그인된 상태」는 저장소에 Supabase
  세션(`libitum.auth.session`)이 있는 상태를 말한다 — 전화번호([ADR-0027](../adr/0027-phone-otp-auth-supabase.md))도
  소셜 셋([ADR-0028](../adr/0028-social-oauth-web-authentication.md))도 **같은 세션 하나**다. 새
  설치에서는 [진입 흐름](entry-flow.md)을 한 번 끝까지 통과해야(T1~T7) 세션이 생기고, 그 뒤로는 앱을
  재시작해도 스플래시 뒤 바로 첫 화면(보통 여정 맵)이 선다 — 온보딩·로그인을 다시 보지 않는다.
  ⚠ **세션은 재시작마다 서버 갱신을 거친다** — 네트워크가 없거나 서버가 거절하면 로그인으로 간다.
  - **초기 심사 빌드에는 Apple·Google·Facebook 로그인만 있다.** 전화번호 수단은 숨겨져
    있다. 제공자 · Apple Developer · Supabase 설정이 풀리기 전까지 실제 로그인을 지날
    수 없다 — 남은 외부 설정은 [ADR 보류 표](../adr/README.md#보류-표)의 「소셜 로그인의
    기본값 확인과 제공자 설정」 행이 진다. [진입 흐름](entry-flow.md)의 전화번호 테스트
    번호 절차는 이전 수동 회차 기록이며 현재 빌드의 실행 방법이 아니다.
  - **옛 임시 토큰(`libitum.auth.token`)만 있는 설치는 로그인된 상태가 아니다** — 앱이 그 키를 읽지
    않아 온보딩부터 다시 시작한다(ADR-0028 D6 · [진입 흐름](entry-flow.md) L1).
  - **자격을 지우는 수단이 앱에 없다** — 이 상태를 벗어나 진입 흐름을 다시 보려면 앱을
    삭제·재설치해야 한다([진입 흐름](entry-flow.md) 「재설치가 유일한 재진입 수단이다」).

## 자동화

흐름 파일은 `e2e/<flow>.yaml`이고 이 디렉터리의 `<flow>.md`와 이름이 같다. 어느 행을 옮겼는지는 흐름 파일의
주석(`# T1 — …`)이 적는다. **흐름 파일이 없는 문서, 흐름 파일이 옮기지 않은 행은 전부 수동이다.**

### iOS

준비물은 Xcode · Java(확인한 것은 OpenJDK 21) · Maestro CLI(확인한 것은 2.11.0)다. 저장소 의존이 아니라 각자 설치한다.

```sh
pnpm bundle:host
cd apps/ios && pod install
git checkout Host.xcodeproj/project.pbxproj   # pod install이 고친 것을 되돌린다
xcodebuild -workspace Host.xcworkspace -scheme Host -configuration Release \
  -sdk iphonesimulator -destination "generic/platform=iOS Simulator" \
  -derivedDataPath <빌드 폴더> build
xcrun simctl install <UDID> <빌드 폴더>/Build/Products/Release-iphonesimulator/Host.app
cd ../..
E2E_UDID=<UDID> pnpm test:e2e
```

- **Release로 빌드한다.** Debug는 `localhost:3000`의 dev 서버를 읽어 다른 작업 트리의 코드가 뜰 수 있다(ADR-0037 D2).
- **로그인까지 확인하는 빌드는 `apps/mobile/.env.local`을 먼저 확인한다.** 이 파일은 Git에서 제외되어 작업 트리에 자동으로 복사되지 않는다. `PUBLIC_SUPABASE_URL`·`PUBLIC_SUPABASE_ANON_KEY`가 비면 빌드는 성공해도 로그인 요청을 열지 못한다. 값은 로그나 실행 기록에 적지 않는다.
- **전용 시뮬레이터를 쓴다.** 흐름이 `clearState`로 앱 데이터를 지운다 — 로그인해 둔 시뮬레이터에 돌리면 세션이 사라진다.
- 자동 회차도 수동 회차와 같이 **커밋 · 기기 · 빌드 종류**를 흐름 문서의 실행 기록에 적는다. 통과한 흐름이 수동 전용
  행(실기 · VoiceOver)을 대신하지 않는다.

### Android

API 35 전용 에뮬레이터에 번들 포함 APK를 설치한 뒤
`E2E_UDID=<UDID> pnpm test:e2e:android`를 실행한다. 빌드 설정과 화면 크기,
개별 명령은 [Android 호스트 README](../../apps/android/README.md#maestro-e2e)에 있다.
`test:e2e`는 iOS의 `entry-flow.yaml`만 실행하며 Android 흐름은 별도 명령이다.
`pnpm verify`와 CI는 두 플랫폼의 Maestro 흐름을 부르지 않는다.

## 목록은 두지 않는다

인덱스를 만들면 인덱스가 디렉터리와 갈라진다. **목록은 디렉터리 자체다** — `ls docs/e2e/`.

## 갱신 규칙

화면을 추가하거나 흐름을 바꾸는 PR에서 **해당 흐름의 파일을 같은 PR에서** 고친다.
강제 수단은 없다 — 약속이다. 파일이 갈려 있으므로 어느 흐름이 바뀌었는지가 PR diff에
그대로 드러난다.

흐름 파일은 **화면이 생길 때 하나씩** 더한다. 앱이 없는 상태에서 미리 쓰면 추측이 되고,
추측으로 쓴 체크리스트는 처음 도는 순간 전부 틀린다.

카페 도착 비주얼 노벨 화면의 새 수동 흐름은
[비주얼 노벨 iOS Release E2E](visual-novel.md)에 있다. 절차는 설계됐지만 아직 실행되지
않았으며, 자동 unit/UI/integration 결과를 수동 iOS 결과로 대신하지 않는다.

분석 이벤트(PostHog) 전송의 수동 흐름은 [분석 이벤트 전송 e2e](analytics.md)에 있다. 2026-09-29 Debug 호스트 회차에서 A1만 통과했고 Release 회차는 아직 없다(A는 키 없이, B는 실제 `phc_` 키가 있어야 실행 가능).

UI 언어 문구표(영어 UI 둘러보기 · VoiceOver 낭독 · 레이아웃 · 재실행 유지)의 수동 흐름은 [UI 언어 e2e](ui-language.md)에 있다. 아직 실행된 회차가 없다.

서버 푸시 알림(권한 · 기기 등록 · 발송 · 누르면 목적지)의 수동 흐름은 [푸시 알림 e2e](push-notifications.md)에 있다. A(권한 · 등록)와 B(실기 발송)로 나뉘며 아직 실행된 회차가 없다.

계정 삭제 · 로그아웃(설정의 「Account actions」 묶음 · 삭제 대화상자 · Apple 재인증 · 서버 결말)의 수동 흐름은 [계정 삭제 · 로그아웃 e2e](account-deletion.md)에 있다. A(함수 배포 없이 시뮬레이터)와 B(함수 배포 · 시크릿 뒤)로 나뉘며 아직 실행된 회차가 없다.
