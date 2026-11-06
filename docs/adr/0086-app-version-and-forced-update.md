# ADR-0086 — 설정의 앱 버전 표시 · 스토어 강제 업데이트(정책 파일 하나로 켠다)

- 상태: **채택 — 클라이언트 · 호스트.** 서버 코드 · 마이그레이션 0. 켜는 것은 콘텐츠 버킷의 파일 하나(`app-policy.json`, 사용자 몫).
  ⚠ **기기 확인 전이다** — 설정 줄 · 교체 화면 · 스토어 열기 · 뒤로가기는 [e2e](../e2e/app-update.md)가 진다.
  ⚠ **iOS 스토어 주소는 아직 없다** — Apple App ID가 비어 있어(`AppStoreURL.appleId = nil`) iOS는 `unconfigured`로 답한다. 앱이 App Store에 오르면 채운다(D5).
- 날짜: 2026-10-27.
- 다루는 축: 앱이 자기 버전을 아는 길 · 설정의 표시 · 「이 빌드보다 낮으면 못 쓴다」를 운영자가 켜는 자리 · 앱이 그것을 읽고 막는 때와 화면 · 스토어로 보내는 호스트 접점 · 측정.
  **다루지 않는 것**: Play In-App Updates(즉시 갱신 API) · 선택(soft) 업데이트 · 설정의 「업데이트 확인」 행 · 버전을 분석 사용자 속성으로 싣기.
  ⟨2026-11-06⟩ 마지막 항목(분석 속성)은 [ADR-0110](0110-app-version-in-analytics.md)이 채웠다 — 아래 「적용 기록」.

## 맥락

Android `versionCode` 6 · iOS 빌드 11까지 올렸지만(#320) 옛 빌드를 쓰는 기기에 「올려라」를 말할 길이 없었다 — JS에는 앱 버전 상수가 없고(ADR-0056 §10 정정 기록), 서버에 최소 버전 문도 없다. 매니페스트의 `min_client_level`은 **콘텐츠** 수준을 잠글 뿐(옛 앱은 원격 에피소드가 잠긴 채 맵은 돈다) 앱을 막지 않는다. 사용자(2026-10-27)가 「설정에서 버전을 보고, iOS · Play 강제 업데이트가 가능하게」를 요구했다.

## 결정

### D1. 호스트가 globalProps `appVersion = { platform, name, build }`를 로드 앞에 한 번 보낸다

- iOS `Host/AppVersion.swift`: `CFBundleShortVersionString`이 `name`, `CFBundleVersion`이 `build`. **빌드가 정수로 읽혀야** 싣는다(`1.0.11` 같은 값은 보내지 않음 — 정책과 수로 비교한다). Android `AppVersion.java`: `versionName` · `versionCode`.
- 실행 중 바뀌지 않으니 `loadTemplate` · `renderTemplateUrl` 앞에 `updateGlobalProps` 한 번. 키 단위 병합이라 safe-area · 배율 · 동작 줄이기와 섞이지 않는다.
- JS `lib/app-version.ts` `appVersionFrom(globalProps)` — 모양이 틀리면 `null`(Explorer · 테스트). `null`이면 설정 줄이 없고 **막지 않는다**(D3).

### D2. 설정 목록 끝에 `Version 1.0 (11)` 한 줄 — 읽기 전용

- `SettingsScreenProps.appVersion: AppVersion | null`(필수). `settings-screen-version`은 목록 상자의 마지막 자식, 가운데 정렬 작은 본문, 흐린 색. 조작 단위가 아니다 — `accessibility-element`에 보이는 문구 그대로.
- 문구 `copy.settings.version(name, build)`.

### D3. 정책은 콘텐츠 버킷 루트의 `app-policy.json` 하나다 — 앱 시작마다 받아 저장하고, 스플래시가 나가는 순간 저장본으로 판정한다

- 형식 `{ "schema": "app-policy-1", "min_build": { "ios": 11, "android": 6 } }`. 플랫폼 키는 선택, 값은 정수 0 이상. 정본은 [정책 파일 스펙](../specs/app-update-policy.md).
- 받기: `lib/app-policy-refresh.ts`가 에피소드 매니페스트보다 **먼저**(실행기 첫 줄) 분 단위 키 `?m=`로 한 번. 유효하면 저장소 키 `libitum.app-policy`에 원문 저장, 서버에 없으면(400 · 403 · 404 · 410) 저장본 제거, 그 밖 실패 · 형식 틀림은 저장본 유지 — `audio-manifest-refresh.ts`와 같은 규칙.
- 판정: `entry-wiring.onSplashTimeout` 맨 앞에서 `appUpdateDecision(appVersion, loadAppPolicy(store))`. `build < min_build[platform]`이면 `required`. **저장본으로 판정한다** — 이 실행에서 받았으면 그것이고, 오프라인이면 지난 실행의 것이다. 정책이 스플래시 뒤에 오면 이번 실행은 막지 않고 다음 시작에 적용한다(ADR-0078 D4의 「다음 시작」 원칙과 같다).
- **정책 파일을 버킷에 두는 이유**: 전송 · 캐시 키 · 업로드 절차 · 오프라인 저장본이 이미 있고 서버 코드가 0이다. 콘텐츠와 앱 정책이 한 버킷에 있는 대가는 「대가」 1.

### D4. 막는 화면은 진입 route `update-required`다 — 스플래시 자리를 `replace`하고 앱에 들어가지 않는다

- `required`면 세션 갱신 · `enterApp` · 푸시 토큰 동기화를 하지 않는다. 화면: 제목(heading) · 본문 · `Update` 버튼 하나(`Button` brand · xl · fill). 나가는 수단이 없다 — 스토어에서 업데이트한 뒤 다시 켜는 것이 유일한 길. Android 뒤로가기는 진입 구간 기본값(`leave` — 앱이 뒤로 물러남, `back-decision.ts`).
- `Update` → `onOpenAppStore` → 호스트 응답까지 버튼 로딩. `opened`가 아니면 버튼 위에 실패 문구(`appUpdate.failure`)를 세우고 한 번 낭독한다. 다시 누를 수 있다.
- `entry_screen_viewed`를 내지 않는다(`EntryViewedScreenName`에서 제외) — D6의 이벤트가 그 자리다.

### D5. 호스트 모듈 `AppUpdateModule.openStore(callback)` — 주소는 호스트가 들고, JS는 아무것도 넘기지 않는다

- iOS: `AppStoreURL.url` = `https://apps.apple.com/app/id<Apple App ID>` → `UIApplication.open`. **ID가 없으면(`appleId = nil`) 열지 않고 `unconfigured`.** 앱이 App Store Connect에 만들어지면 `AppStoreURL.appleId`에 숫자 ID를 넣는다 — 그 전에는 정책에 `min_build.ios`를 두지 않는다.
- Android: `market://details?id=<applicationId>` → `ActivityNotFoundException`이면 `https://play.google.com/store/apps/details?id=…`. 둘 다 실패면 `failed`.
- 콜백 `{ status: "opened" | "failed" | "unconfigured" }`. JS `lib/app-update.ts`가 `unavailable`(모듈 없음) · `malformed`를 더한다. ADR-0026 D4 · ADR-0033의 경계(나가는 목적지 하나, 호스트 고정) 그대로다.

### D6. 측정 — `app_update_required_shown { platform, build, minBuild }`

- 스플래시가 나가는 순간 막힐 때 1회, `entryEventSink`. 숫자는 문자열(분석 속성은 문자열 · 불리언뿐 — ADR-0029). 실행 수 대비 비율이 옛 빌드 잔존이다. 이름 목록 `analytics-event-names.ts` 39개.

### D7. 300줄 · 토큰 · 스레드

- 새 모듈은 전부 100줄 아래. 새 토큰 없음. `app-policy-refresh.ts`만 `background-only`; 판정 · 디코드(`app-policy.ts`)는 순수라 어느 스레드에서도 import된다.

## 버린 대안

1. **Play In-App Updates(immediate)** — Android만 되고 iOS는 어차피 스토어로 보내야 한다. 정책 파일 + 스토어 열기가 두 플랫폼에 같은 모양이다. Android만 즉시 갱신을 더하는 것은 후속(재검토 1).
2. **매니페스트에 `min_app_build` 넣기** — 콘텐츠 파이프라인이 만드는 파일에 앱 정책을 섞는다. 에피소드를 올릴 때마다 정책을 다시 적어야 하고, 매니페스트 파싱 실패가 정책까지 끌어내린다.
3. **Supabase 표 + RPC** — 서버 코드 · 마이그레이션 · 권한이 생긴다. 값 둘을 위해서는 과하다.
4. **실행 중 도착한 정책으로 즉시 막기** — 레슨 도중 화면이 뒤집힌다. 다음 시작에 적용하는 것이 ADR-0078과 같은 원칙이고, 스플래시가 로고 2.4초 + 최대 3초를 서므로 보통은 그 실행에서 잡힌다.

## 대가

1. **콘텐츠 버킷에 앱 정책이 산다.** 버킷을 비우거나 옮기면 정책도 사라진다(404 → 저장본 제거 → 막지 않음 — 실패 방향은 「열림」이다).
2. **막는 판정은 시작 한 번뿐이다.** 하루 종일 켜 둔 앱은 다음 시작까지 옛 빌드로 돈다.
3. **iOS는 ID를 채우기 전까지 반쪽이다** — 화면은 서지만 버튼이 스토어를 못 연다. 그래서 `min_build.ios`를 두지 않는다(D5).
4. **버전을 모르는 호스트(Explorer · 옛 호스트)는 막지 않는다.** 이 PR 전 빌드는 `appVersion`을 안 보내므로 정책으로 막을 수 없다 — 이 ADR은 **다음 빌드부터** 효력이 있다.

## 재검토 조건

1. Android 사용자가 스토어를 열고도 돌아오지 않는 비율이 높으면 Play In-App Updates(immediate)를 Android에 더한다.
2. 정책에 플랫폼 밖 조건(계정 · 지역)이 필요해지면 버킷 파일이 아니라 서버 판정으로 옮긴다.
3. 선택 업데이트(「나중에」)가 필요해지면 `recommended_build`를 더하고 화면을 나눈다.

## 후속

- Apple App ID 채우기(D5) · `app-policy.json` 첫 업로드(사용자) · 기기 확인([e2e](../e2e/app-update.md)) · PostHog 이벤트 사전(wiki)에 `app_update_required_shown` 추가.

## 적용 기록

- ⟨2026-11-06 — 적용 기록이고 결정을 바꾸지 않는다⟩ **「다루지 않는 것」의 「버전을 분석 사용자 속성으로 싣기」가 [ADR-0110](0110-app-version-in-analytics.md)으로 채워졌다.** globalProps `appVersion`의 **둘째 소비자**가 생겼다 — `lib/app-version-properties.ts`가 background 스레드에서 `lynx.__globalProps`를 `appVersionFrom`에 넘겨 모든 PostHog 이벤트의 `platform` · `appVersion` · `appBuild`와 `identify`의 사람 속성으로 싣는다(모르면 셋 모두 `unknown`). D1의 모양(`{ platform, name, build }`) · 보내는 시점 · `appVersionFrom` 자체는 변경 0이고, D2의 설정 줄과 PostHog 속성은 한 값의 두 표현이다(줄이 없으면 `unknown`). D6의 `app_update_required_shown.platform`은 자동 속성과 같은 이름 · 같은 값인데, 펼침 순서를 「이벤트 필드가 이김」으로 고정했으므로 이 이벤트의 모양은 그대로다. 「대가」 4의 「버전을 모르는 호스트」는 분석에서도 같다 — 이 결정 이전 빌드의 이벤트에는 속성이 없고(`unknown`이 아니라 없음), 그것이 곧 옛 빌드 잔존의 다른 읽기다.

- ⟨2026-11-06 — 적용 기록이고 결정을 바꾸지 않는다⟩ **정책 파일에 선택 칸 `unavailable_login_methods`가 더해졀다.** 결정은 바꾸지 않는다 — 정책은 여전히 콘텐츠 버킷 루트의 `app-policy.json` 하나이고, 앱 시작마다 받아 저장하고 저장본으로 판정한다(D3). [ADR-0111](0111-guest-entry-without-account.md) D1 개정 3이 같은 파일에 **선택 칸 `unavailable_login_methods: { "all": [...], "android": [...] }`**(누르면 인증 창 대신 「사용 불가 안내」가 뜨는 로그인 수단)를 더했다. `schema`는 `app-policy-1` 그대로다 — 칸 추가는 호환 변경이고, 이 칸을 모르는 옛 빌드는 「모르는 키는 버린다」 규칙으로 그대로 돈다. 디코더(`lib/app-policy.ts` `decodeUnavailableLoginMethods`)는 이 칸의 모양이 틀리면 **칸만** 없는 것으로 보고 `min_build` 판정은 살린다 — 「아는 키의 값이 틀리면 파일 전체 무효」는 `min_build`에만 해당한다(강제 업데이트와 로그인 수단을 결합하지 않는다). `app-policy-refresh.ts`는 변경 0(원문 저장 그대로). 로그인 화면은 저장본을 `loadStoredAppPolicy()`로 읽어 수단을 정하고, 칸이나 정책이 없으면 앱 상수 기본값이다. 정본은 [정책 파일 스펙](../specs/app-update-policy.md). 「후속」의 첫 업로드는 2026-11-06에도 아직이다 — 이 칸이 효력을 갖는 것도 그때부터다.
