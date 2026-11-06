# 분석 이벤트의 앱 버전 — 기기 확인

결정은 [ADR-0110](../adr/0110-app-version-in-analytics.md)이 진다. 자동 테스트는 변환 · 모르면 `unknown` · `/batch/` 요청의 세 속성 · 이벤트 필드 우선 · 식별의 `$set`을 지키지만,
**실제 호스트의 globalProps가 background에서 읽히는지 · PostHog에 어떤 값으로 들어오는지 · 옛 빌드 사용자의 이벤트에는 속성이 없는지 · 사람 속성이 갱신되는지**는 기기와 PostHog에서만 판정한다.

## 준비

- Android: 읽기 전용 에뮬레이터(`-read-only -port 5556`) · `bundled` 변형 · `.env.local`의 PostHog 키(빌드 뒤 지운다). iOS: 시뮬레이터 · Debug 호스트 + `--bundle-url=main.lynx`.
- 판정: PostHog에서 그 기기의 최근 이벤트(`environment`로 거른다)의 `platform` · `appVersion` · `appBuild`, Persons의 같은 세 속성.
- 전제: [network-status.md](network-status.md) 2026-11-04 기록대로 **iOS 시뮬레이터에서는 PostHog 이벤트가 만들어지지 않는 기존 현상**이 있다. 재현되면 AV-E2는 「시뮬레이터 미판정」으로 적고 실기 · TestFlight로 돌린다.
- 두 플랫폼의 버전 체계가 다르다 — Android `1.2.0 (12)`, iOS `1.0.0 (13)`. 값은 Info.plist · build.gradle 그대로 실리므로 분석은 `platform`과 함께 본다.

| # | 조작 | 기대 | 환경 | 결과 |
|---|---|---|---|---|
| AV-E1 | `bundled` 빌드(1.2.0 · 12) 실행 → 온보딩 `Next`(`entry_screen_viewed`) | 이벤트 properties에 `platform = android` · `appVersion = 1.2.0` · `appBuild = 12`, `network` · `networkCost` · `environment`는 그대로 | 에뮬레이터 | 통과 — 아래 기록 |
| AV-E2 | iOS Debug 호스트 · 같은 조작 | `platform = ios` · `appVersion = 1.0.0` · `appBuild = 13`(Info.plist 값 그대로). 이벤트가 안 만들어지면 「시뮬레이터 미판정 · 실기로」 | 시뮬레이터 | 미실행 |
| AV-E3 | PostHog에서 같은 시간대 **옛 빌드 사용자**의 이벤트를 본다(SQL `properties.appVersion IS NULL`) | 속성 셋이 **없다**(= 그 빌드 이전으로 읽는다). `unknown`이 아니라 없음 — `unknown`은 새 JS + globalProps 없는 호스트의 값. 새 빌드의 `$identify` · `$set` 이벤트에도 셋이 있다(등록 속성) | PostHog | 통과 — 아래 기록 |
| AV-E4 | 테스트 계정으로 로그인(또는 로그인된 설치를 다시 켬 = 부팅 세션 갱신) → PostHog Persons | 사람 속성에 `platform` · `appVersion` · `appBuild`(숫자)가 있고 값이 그 빌드와 같다. 빌드 번호를 올린 로컬 빌드로 **재로그인 없이 다시 켠 뒤** `appBuild`가 새 값으로 바뀐다 | 실기 또는 에뮬레이터 · 테스트 계정 | 미실행 |

## 실행 기록

### 2026-11-06 — Android 에뮬레이터(Pixel_8 AVD, 읽기 전용) · `bundled` 1.2.0 (12) · 에이전트 실행, 사람 미확인

- 이 빌드는 `.env.local`의 운영 키로 보내 테스트 이벤트가 `environment = production`에 섞였다 — `distinct_id` `01a1af9a-a776-7859-8cf1-0c1befe30f25`, 06:45:11 ~ 06:45:43 UTC, 세 건. 분석에서 거를 때 이 ID를 쓴다. 빌드 뒤 키 파일은 지웠다.
- **AV-E1 통과** — 스플래시 → 온보딩 → 로그인 화면까지 크래시 0. `episode_update_splash_closed` · `entry_screen_viewed(onboarding)` · `entry_screen_viewed(login)` 세 건 모두 `platform = android` · `appVersion = 1.2.0` · `appBuild = 12`이고 `network = wifi` · `networkCost = unmetered` · `environment = production`은 그대로다.
- **AV-E3 통과** — 같은 30분 안 옛 빌드 사용자 9명의 이벤트 164건에는 세 속성이 **없다**(`unknown` 0건). 값이 있는 사용자는 이 에뮬레이터 하나(3건)뿐이다.
- AV-E2(iOS)는 시뮬레이터 이벤트 미생성 현상(전제)과 로그인 필요 때문에, AV-E4(사람 속성)는 테스트 계정 로그인이 필요해 미실행 — 실기 · TestFlight 회차에서 본다.
