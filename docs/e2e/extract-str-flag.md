# extractStr 끔 — 실행 오류 확인 e2e (ADR-0169 D8 개정)

기기에서 사람이 보는 절차다. `__EXTRACT_STR_IDENT_FLAG__` ReferenceError가 실행 로그에서 사라졌는지, 문구 · 화면이 그대로인지 본다.
준비: `apps/mobile/.env.local` · iOS `Config/*.local.xcconfig` · Android `google-services.json` · `local.properties` · `*.properties`를 메인 체크아웃에서
복사(기기 빌드에만, 번들 크기는 복사 전에 잰다). 앱 소리는 끈다 — 설정에 닿지 못하면 Android는 에뮬레이터를 `-no-audio`로 띄운다.

| # | 절차 | 기대 |
| --- | --- | --- |
| XS-E1 | iOS: `pnpm bundle:host` → `pod install` → `xcodebuild … build` → 새 시뮬레이터에 설치 → `log stream --predicate 'process == "Host"'`을 켠 채 `simctl launch … --bundle-url=main.lynx` | 로그에 `__EXTRACT_STR_IDENT_FLAG__` 0줄, `Call exception` · `JSErrorReporter` · `onErrorOccurred` 0줄 |
| XS-E2 | iOS: 온보딩(비회원) → 여정 지도 → Chats → Ranking → More | 나라 목록 · 레슨 이름 · 친구 이름 · 순위 안내가 한국어 · 영어 그대로 |
| XS-E3 | Android: `pnpm bundle:android` → `./gradlew :app:assembleBundled` → 에뮬레이터(`-read-only -no-audio`)에 설치 → `logcat -c` 뒤 실행 | logcat에 `__EXTRACT_STR_IDENT_FLAG__` · `Call exception` · `JSErrorReporter` · `FATAL EXCEPTION` 0줄 |
| XS-E4 | Android: 온보딩(비회원) → 여정 지도 → Intro 레슨 한 장면 → Chats → Ranking → More | XS-E2와 같은 문구, 레슨 대사(한국어 + 영어 뜻)가 그대로 |

red 기준: 같은 절차를 `origin/main`(`extractStr: true`) 번들로 하면 실행마다 main-thread `ReferenceError`가 2번
(`main-thread.js:241:186`, `processData`) — iOS 로그 10줄, Android logcat 12줄.

**2026-11-20 실행 기록** (iPhone 17 Pro 시뮬레이터 iOS 26.5 · Pixel 8 AVD, 에이전트):

- red(origin/main 번들): iOS 오류 2번(10줄), Android 오류 2번(12줄). 그 밖의 JS 오류 없음.
- 고친 번들: XS-E1 · XS-E3 오류 0줄(iOS 두 번 실행, Android 한 세션 전체). XS-E2 · XS-E4 지도 · 나라 목록 · 레슨 대사 · Chats · Ranking 문구 그대로.
- **막힘(이 변경과 무관)**: More를 누르면 탭이 「Close menu」로 바뀌지만 메뉴 카드(Letters · My words · Settings)가 보이지 않는다 — iOS · Android 둘 다,
  `origin/main` 번들로도 같다. 그래서 Letters · 설정 화면은 이 절차로 보지 못했다. 이 변경 전후 JS는 `processData` 분기 하나만 다르다(성능 보고서 참고).
