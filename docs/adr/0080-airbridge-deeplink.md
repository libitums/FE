# ADR-0080 — Airbridge 딥링크 · 지연 딥링크: `duru://<탭>`을 앱 구간에 들어선 뒤 그 탭으로 연다

- 상태: **채택 — iOS · Android 호스트 · 클라이언트.** 서버 변경 0.
  ⚠ **기기 확인은 일부다** — iOS 실기에서 scheme 링크 셋(탭 둘 · 모르는 목적지)을 봤고(2026-10-22), universal link · App Link ·
  지연 딥링크 · Android 탭 이동은 남았다([e2e 시나리오 E](../e2e/airbridge-events.md#e--딥링크--지연-딥링크-adr-0080)). App Link
  검증은 Airbridge 대시보드에 SHA256 지문이 들어간 뒤에야 된다.
- 날짜: 2026-10-22.
- **사용자 결정**(2026-10-22): 목적지는 **앱 열기 + 주요 탭 셋**(여정 · 롤플레이 · 설정) · 지연 딥링크는 **가입 뒤 맵에서** 연다 ·
  scheme은 **`duru://`**.
- 바꾸는 것: [ADR-0063](0063-airbridge-events.md) 「다루지 않는 것」의 딥링크 · 지연 딥링크 · Associated Domains를 연다(그 ADR의
  「재검토 조건」 「딥링크 · 지연 딥링크를 쓰기로 한 때 → D5」 발동). D5의 「지연 딥링크 조회 요청」은 이제 쓰는 요청이다.
  Android의 `setTrackMetaDeferredAppLinkEnabled(false)`(Meta 지연 앱 링크)는 그대로다.
- 다루지 않는 것: 탭 밖 목적지(에피소드 · 롤플레이 하나) · 딥링크 열림 제품 이벤트(Airbridge가 딥링크 열림을 스스로 잰다) · 웹 랜딩 ·
  커스텀 도메인.

근거 표시: **[코드]** · **[조회]** 2026-10-22 SDK 공개 API · **[추정]**.

## 맥락

1. `duru://`는 이미 로그인 콜백 `duru://auth-callback`이 쓴다 [코드] — iOS는 `ASWebAuthenticationSession`이 받아 URL scheme
   등록이 없었고, Android는 `MainActivity`의 `duru` · `auth-callback` 필터와 `onNewIntent`가 받는다.
2. 누른 서버 푸시는 호스트가 목적지를 **꺼낼 때까지** 들고 있고 JS가 앱 구간에서 꺼낸다(ADR-0034, `use-opened-push.ts`) [코드].
3. Airbridge SDK [조회]: iOS `trackDeeplink` · `handleDeeplink(connectionOptions:|openURLContexts:|userActivity:)` ·
   `handleDeferredDeeplink`, Android `handleDeeplink(Intent, OnSuccess<Uri>)` · `handleDeferredDeeplink(OnSuccess<Uri>)`.
   Airbridge 트래킹 링크는 scheme URL로 바꿔 `onSuccess`에 준다.

## 결정

### D1. 호스트는 받고, 해석하지 않고, 한 개를 들고 있는다

- iOS `AirbridgeDeeplinks`(`AirbridgeEvents.swift`): `SceneDelegate`의 `willConnectTo` · `openURLContexts` · `continue userActivity`가
  Airbridge 예제 그대로 `trackDeeplink` + `handleDeeplink`를 부른다. Airbridge 링크가 아니면 `duru://` scheme URL을 그대로 받는다.
  지연 딥링크는 `initializeSDK` 직후 `handleDeferredDeeplink` 한 번.
- Android `AirbridgeEvents`: `MainActivity.onResume`에서 `handleDeeplink(getIntent())`(처리한 Intent에 표시를 남겨 다시 선 Activity에서도 한 번만), 시작 직후
  `handleDeferredDeeplink` 한 번.
- 받는 것은 **`duru://`이고 `duru://auth-callback`이 아닌 것**뿐이다(`isOwnDeeplink`, HostTests N-I10 · JVM N-A5). 마지막 한 개를
  들고 있다가 `AirbridgeEventsModule.takeOpenedDeeplink(callback)`이 `{ url }`로 한 번 꺼낸다. 켜진 앱에 오면 전역 이벤트
  `airbridgeDeeplinkOpened`(인자 없음)로 알린다. Android 리스너는 `MainActivity.onDestroy`에서 푼다.
- **SDK가 시작되지 않은 빌드(값 없음)에서는 아무것도 하지 않는다** — 모듈도 없어 꺼낼 쪽이 없다. 링크는 앱만 연다.

### D2. 목적지 — `duru://journey` · `duru://roleplay` · `duru://settings`

`app/deeplink-target.ts`의 순수 함수가 URL을 탭으로 읽는다(`duru:///<탭>` · 쿼리 · 끝 `/` · 대소문자 허용, DL1 · DL2). 그 밖은
`null` — 앱만 열고 화면을 옮기지 않는다. 대시보드의 트래킹 링크 딥링크 주소는 이 셋 가운데 하나로 만든다.

### D3. 여는 때 — 앱 구간에 들어선 뒤

`useOpenedDeeplink(진입 스택이 비었다, 탭 루트로 접기)`가 앱 구간에 들어서는 순간과 전역 이벤트마다 꺼낸다. 그래서 지연
딥링크는 온보딩 · 로그인 · 프로필 · 언어 선택을 끊지 않고 「여정 시작하기」 뒤에 열린다(사용자 결정, DI4). 탭을 옮길 때는 그 탭
스택을 루트로 접는다(`tabRootActions` — 누른 알림과 같다).

### D4. 플랫폼 설정

| | iOS | Android |
|---|---|---|
| scheme | `Info.plist` `CFBundleURLTypes` `duru`(N-I11) | `MainActivity` VIEW 필터 `scheme="duru"`(로그인 콜백 필터는 그대로) |
| 웹 링크 | `Host.entitlements` `applinks:duru.airbridge.io` · `applinks:duru.abr.ge` | `autoVerify` 필터 `https://duru.airbridge.io` · `https://duru.abr.ge` |
| 대시보드에 넣을 것 | App ID `7SJJT6G6JK.com.libitum.host` | 패키지 `libitum.duru.android` + SHA256 지문(Play 앱 서명 키 · 업로드 키 · 디버그 키) |

> ⟨2026-10-26⟩ **커스텀 도메인 `go.k-duru.com`을 더한다.** 트래킹 링크 주소를 우리 도메인으로 바꾸려고 Airbridge 대시보드에
> 커스텀 도메인을 등록했다(가비아 CNAME → `duru-qw5r.custom-domain.airbridge.io`). iOS는 `applinks:go.k-duru.com`, Android는
> `http` · `https://go.k-duru.com`을 받는 `autoVerify` 필터를 하나 더 둔다. 필터를 나눠도 Android 11 이하는 앱의 `autoVerify`
> 도메인 **전부**가 검증돼야 App Link를 켜므로, 이 도메인의 `assetlinks.json`이 떠 있는 것이 기존 두 도메인의 검증 조건이 된다
> (2026-10-26 세 도메인 모두 같은 지문으로 200 확인). 기존 두 도메인은 그대로다(이미 나간 링크 · 연동 채널 링크는 `abr.ge`). 커스텀 도메인은
> 커스텀 채널 링크에만 쓰이고 최대 2개다. 이 도메인을 받지 않는 옛 빌드에서는 링크가 브라우저를 거쳐 열린다 [추정]. 위
> 「다루지 않는 것」의 커스텀 도메인은 이 보충으로 연다.

## 대가

1. Associated Domains가 서명 프로필에 들어가야 한다 — 자동 서명이 프로필을 다시 만든다. 손 프로필이면 기능을 켜야 한다.
2. Android App Link는 대시보드에 **Play 앱 서명 키** 지문이 없으면 스토어 설치본에서 검증되지 않는다 — 그때는 링크가
   브라우저로 열리고 Airbridge가 scheme으로 넘긴다 [추정].
3. 탭 밖 목적지를 열려면 D2에 표를 더하는 새 결정이다.

## 재검토 조건

- 에피소드 · 롤플레이 하나를 열고 싶을 때 → D2 · D3(잠긴 콘텐츠의 처리).
- 딥링크 열림을 PostHog로도 세고 싶을 때 → 측정 이벤트(ADR-0029 D14).
