# Airbridge 앱 이벤트 — 값 넣기 · 대시보드 연동 · 수신 확인 · 스토어 고지

호스트 앱에 든 Airbridge(MMP) SDK를 **켜고, 매체에 잇고, 확인하고, 되돌리는** 운영 안내다. 무엇을 왜 그렇게 정했는지는
[ADR-0063](adr/0063-airbridge-events.md)이, 기기에서 보는 절차와 결과는 [Airbridge 앱 이벤트 e2e](e2e/airbridge-events.md)가
진다. 이 SDK는 2026-10-13에 Meta 앱 이벤트 SDK([ADR-0057](adr/0057-meta-app-events.md), 대체됨)를 대신했다.

⚠ **이 문서의 「대시보드에서 할 일」 · 「수신 확인」 · 「스토어 고지」는 아직 한 번도 실행되지 않았다.** 실제 앱 이름 ·
App SDK Token으로 Airbridge가 이벤트를 받는 것을 본 적이 없고, 대시보드 · 스토어 콘솔의 메뉴 이름은 Airbridge 공식 문서와
기억에서 옮긴 것이라 화면에서 직접 대조하지 않았다. 처음 실행하는 사람이 어긋난 곳을 이 문서에 고쳐 적는다.

## 한눈에

- 값이 **없으면** 앱은 SDK를 시작하지 않는다(`initializeSDK`를 부르지 않는다). 화면 · 동작이 SDK가 없을 때와 같고
  Airbridge로 나가는 요청이 없다(2026-10-13 기기 확인 — [e2e 「A 결과 기록」](e2e/airbridge-events.md#a-결과-기록)).
- 값이 **있으면** SDK가 설치 · 앱 실행을 스스로 보내고, 앱은 가입 완료 · 레슨 완료 둘을 더 보낸다.
- 값은 저장소에 커밋하지 않는다. 플랫폼마다 추적하지 않는 파일 하나에 적는다.
- 매체(Meta · Google Ads · TikTok Ads · Apple Ads)와의 연결은 **앱이 아니라 Airbridge 대시보드에서** 한다. 앱에는 매체별
  SDK가 없다.
- ⚠ **Android는 값이 없는 빌드에도 광고 ID 권한이 실린다.** Play에 올리기 전에 콘솔의 선언부터 맞춘다
  ([스토어 고지에서 바뀌는 것](#스토어-고지에서-바뀌는-것)).

## 값 넣기

Airbridge 대시보드 **[Settings] > [Tokens]**에서 두 값을 받는다.

- **App Name** — 앱을 등록할 때 정한 고유 이름. 등록 뒤 바꿀 수 없다.
- **App SDK Token** — 같은 화면의 **Web SDK Token · API Token이 아니다.** 다른 토큰을 넣으면 형식은 맞아도 SDK가
  `invalid SDK token`으로 거절당한다.

키 이름은 두 플랫폼 모두 `AIRBRIDGE_APP_NAME` · `AIRBRIDGE_SDK_TOKEN`이다.

| 플랫폼 | 값 파일(추적 안 함) | 예시 파일(추적함 · **빈 값**) |
|---|---|---|
| iOS | `apps/ios/Config/Airbridge.local.xcconfig` | `apps/ios/Config/Airbridge.local.xcconfig.example` |
| Android | `apps/android/app/airbridge.properties` | `apps/android/app/airbridge.properties.example` |

```sh
# 저장소 루트 — 예시 파일은 값이 비어 있다. 복사만 하면 「값 없음」 빌드와 같다. 복사한 뒤 반드시 두 값을 채운다
cp apps/ios/Config/Airbridge.local.xcconfig.example apps/ios/Config/Airbridge.local.xcconfig
cp apps/android/app/airbridge.properties.example apps/android/app/airbridge.properties
# 두 파일을 열어 등호 뒤를 채운다
git status --short apps/ios/Config apps/android/app   # 아무것도 나오지 않아야 한다
```

```
// apps/ios/Config/Airbridge.local.xcconfig — 등호 양옆 공백은 있어도 된다
AIRBRIDGE_APP_NAME = <App Name>
AIRBRIDGE_SDK_TOKEN = <App SDK Token>
```

```
# apps/android/app/airbridge.properties
AIRBRIDGE_APP_NAME=<App Name>
AIRBRIDGE_SDK_TOKEN=<App SDK Token>
```

값이 실제로 빌드에 들어갔는지는 산출물에서 본다(값을 화면 · 로그에 찍지 말고 비었는지만 본다).

```sh
# iOS — 시뮬레이터에 설치한 앱. 비어 있지 않아야 한다
plutil -extract AirbridgeAppName raw "$(xcrun simctl get_app_container <UDID> com.libitum.host)/Info.plist" | grep -c .
# Android — 빌드한 변형의 BuildConfig. 빈 문자열("")이 아니어야 한다
grep -c 'AIRBRIDGE_APP_NAME = "";' apps/android/app/build/generated/source/buildConfig/bundled/com/libitum/host/BuildConfig.java   # 0
```

- **값은 빌드 시점에 박힌다.** 파일을 만들거나 고친 뒤에는 그 플랫폼의 호스트를 다시 빌드한다. iOS는 값이 바뀌면 clean
  빌드가 안전하다. JS 번들(`pnpm bundle:host` · `pnpm bundle:android`)은 값과 무관하다.
- **두 파일은 서로를 모른다.** 한쪽에만 넣으면 그 플랫폼만 보낸다 — 빌드는 경고하지 않는다.
- **형식이 틀리면 값이 없는 것과 같다 — 조용히 꺼진다.** 앞뒤 공백을 걷은 뒤 App Name은 영문 · 숫자 · 밑줄 · 하이픈만
  (`^[A-Za-z0-9_-]+$`), 토큰은 공백 없는 한 덩어리여야 한다. 어기면 SDK를 시작하지 않고 오류도 내지 않는다.
  **값을 넣었는데 이벤트가 오지 않으면 형식부터 본다.** App Name 규칙은 Airbridge 문서에 형식이 없어 이 저장소가 고른
  것이다 — 실제 이름이 규칙에 걸리면 규칙을 고친다([ADR-0063](adr/0063-airbridge-events.md) 「사용자 확인 필요」 17).
- 워크트리마다 따로 둔다 — 추적하지 않는 파일이라 다른 워크트리로 따라오지 않는다.
- CI와 배포 빌드에 값을 넣는 방법은 정해지지 않았다. 지금은 배포 빌드를 만드는 기기에 두 파일을 손으로 둔다.
- **실제 값을 문서 · 로그 · 커밋 메시지 · 실행 기록에 적지 않는다.**
- 예전 Meta 값 파일(`Meta.local.xcconfig` · `meta.properties`)이 남아 있어도 빌드가 읽지 않는다. `.gitignore`의 넓은 줄
  (`apps/ios/Config/*.local.xcconfig` · `apps/android/app/*.properties`)이 그 파일이 실수로 커밋되는 것을 막는다. 지워도 된다.

## 값이 없을 때의 동작

값 파일이 없거나, 비었거나, 형식이 틀린 빌드에서는

1. 호스트가 `Airbridge.initializeSDK`를 부르지 않는다. Airbridge에는 SDK가 스스로 시작하는 길이 없다.
2. 호스트 모듈 `AirbridgeEventsModule`이 등록되지 않는다. JS는 모듈이 없는 것을 「보낼 곳 없음」으로 읽는다.
3. PostHog 전송은 영향을 받지 않는다 — 두 전송은 서로의 설정을 전제로 하지 않는다.
4. debug · bundled · release 어느 빌드도 값이 없다는 이유로 실패하지 않는다.

그래도 **값과 무관하게 실리는 것**이 있다.

- SDK 바이너리 — iOS 동적 프레임워크 `Airbridge.framework`(arm64 바이너리 2,909,200 bytes), Android AAR과
  `libairbridgelib.so`(ABI마다 하나).
- Android 매니페스트의 광고 ID 권한(`AD_ID`) · 설치 리퍼러 권한, `<queries>`의 패키지 둘(`com.facebook.katana` ·
  `com.instagram.android`), 그리고 SDK의 수명주기 provider `AirbridgeLifecycleProvider` — 이 provider는 프로세스 시작 때
  수명주기 콜백 하나를 등록할 뿐 요청을 내지 않는다(ADR-0063 D5).
- iOS SDK가 싣는 프라이버시 매니페스트([iOS 프라이버시](ios-privacy.md#airbridge-sdk와-추적-선언)).

## 무엇이 Airbridge로 가는가

| Airbridge에 보이는 것 | 언제 | 내는 쪽 |
|---|---|---|
| Install · Open(앱 실행) · 세션 | 설치 뒤 첫 실행 · 앱이 전경으로 올 때 | SDK 자동 |
| `airbridge.user.signup` (가입 완료) — 속성 없음 | 진입 흐름 끝의 「여정 시작하기」 | 앱 |
| `airbridge.achieveLevel` (에피소드 최종 통과) — `level`(에피소드 id, 예: `u00-tutorial` · `u01-water`) · `label`(`episode_final`) | 에피소드의 최종 테스트를 통과할 때(`episode_final_passed`) — 신규 사용자의 첫 건이 튜토리얼 u00 완료 | 앱 |

⟨2026-10-21 — [ADR-0081](adr/0081-tutorial-as-catalog-episode.md) D9, 사용자 결정⟩ **`achieveLevel`의 뜻이 바뀌었다** — 이전에는 「여정의 메신저 유닛을 처음 끝낼 때 · 비주얼 노벨 유닛이 끝날 때」(`level` = 유닛 ID · `label` = `messenger` | `visual_novel`)였고, 그 화면이 옛 튜토리얼과 함께 지워져 한 건도 나지 않게 됐다. **매체 쪽 전환 이름 · 값 매핑이 옛 `messenger` · `visual_novel` 라벨을 쓰고 있으면 대시보드에서 `episode_final`로 고친다**(아래 「대시보드에서 할 일」 9 — 사용자 몫).

읽을 때 알아 둘 것(매핑의 정본과 이유는 [ADR-0063 D7](adr/0063-airbridge-events.md)).

- **「가입 완료」는 가입이 아니라 진입 흐름 완주다.** ~~로그아웃 뒤 다시 로그인하거나 재설치 뒤 로그인해도 난다.~~
  ⟨2026-10-18⟩ **서버에 기록(학습 진행 또는 학습자 프로필)이 있는 계정은 재로그인 · 재설치 뒤 로그인에서 더 나지 않는다** — 그 계정은 언어 선택 ·
  여정 입장을 건너뛰고 바로 맵에 들어가 「여정 시작하기」를 지나지 않는다([ADR-0069](adr/0069-returning-learner-login.md)). 기록이 없는 계정(처음
  가입 · 기록 전에 떠난 계정)은 지금처럼 난다. **2026-10-18 이 변경부터 해석이 끊긴다** — 그 뒤 가입 완료 수가 줄어 보이는 것은 정의 변경이다.
  기존 회원의 바로 맵 진입을 세는 새 제품 이벤트 `entry_returning_learner_entered`는 **Airbridge로 보내지 않는다**(PostHog에만 간다).
- **「레슨 완료」는 사용자당 최대 2회다.** 여정의 메신저 유닛 하나와 비주얼 노벨 유닛 하나뿐이고, 표준 학습 유닛 · 전화
  유닛 · 카탈로그 레슨은 보낼 이벤트가 없다. 롤플레이(연습)에서 끝낸 것은 보내지 않는다.
- 사용자 ID · 이메일 · 전화번호 · 로그인 수단은 싣지 않는다. Airbridge의 `setUserID` 등 사용자 식별 기능을 쓰지 않는다.
- ~~iOS는 IDFA 코드가 없는 SDK 변형(restricted)이고 추적 허용 팝업을 띄우지 않는다.~~ ⟨2026-10-22 — [ADR-0079](adr/0079-ios-tracking-authorization.md)⟩
  iOS는 일반판 SDK이고, **가입을 마친 뒤 여정 맵에 처음 들어설 때** 아직 정하지 않았으면 추적 허용을 한 번 묻는다. 허용하면
  IDFA가 실린다. 설치 이벤트는 그 결정을 **최대 600초** 기다린다 — Real-time Logs에 Install이 늦게 보일 수 있다. 거부 ·
  미결정이면 SKAdNetwork · Apple Ads(AdServices) · Airbridge의 비식별 매칭에 기댄다.
- ⚠ **값이 있는 빌드는 시작 직후 지연 딥링크 조회 요청을 낸다**(iOS `tracking-link.airbridge.io`, Android logcat의
  `fetching deferred-deeplink` — 가짜 값 빌드에서 관찰). 앱은 딥링크를 쓰지 않는다. 이 요청을 끄는 옵션은 확인하지 못했다
  (ADR-0063 「확인하지 못한 것」).

## Airbridge 대시보드에서 할 일

저장소 밖이고 사용자 몫이다. **순서대로** 한다 — 앞 단계가 뒤 단계의 전제다.

| 순서 | 할 일 | 어디서 |
|---|---|---|
| 1 | 앱 등록 — iOS 번들 ID `com.libitum.host` · Android 패키지 `libitum.duru.android` | Airbridge 가입 뒤 앱 추가 |
| 2 | **App Name**과 **App SDK Token**을 복사해 위 「값 넣기」의 두 로컬 파일에 넣고 다시 빌드 | [Settings] > [Tokens] (Web SDK Token · API Token 아님) |
| 3 | SKAN 준비 — iOS **App Auth**, 전환값 규칙(가입 완료 · 레슨 완료를 어느 값에 둘지) | [Settings] > [App Settings] > [App Auth] · [Management] > [SKAN Conversion Value] |
| 4 | Meta 연동 + SKAN 이벤트 매핑, 그리고 Meta Events Manager에서 「Import from Partner App」 | [Integrations] > [Ad Channel Integration] > Facebook Business |
| 5 | Google Ads 연동(계정 로그인 · iOS SKAN 토글) | 같은 메뉴 > Google Ads |
| 6 | TikTok Ads 연동 | 같은 메뉴 > TikTok |
| 7 | Apple Ads — 앱 쪽은 끝났다(AdServices). 캠페인 이름까지 보려면 Campaign Management API 연동 | 같은 메뉴 > Apple Ads |
| 8 | 매체별 **비용 연동**(설치당 비용을 보려면 필요) | 각 매체의 Cost Integration |
| 9 | 매체별 이벤트 포스트백 매핑(`airbridge.user.signup` → 매체의 가입 이벤트, `airbridge.achieveLevel` → 매체의 레벨 달성 이벤트 등) | 각 매체 연동 화면 |
| 10 | Play Console 데이터 보안 양식 — 공유 대상을 Meta → Airbridge로, 「광고 ID」 선언은 「사용함」 유지 | Play Console — 아래 「스토어 고지」 |
| 11 | App Store 개인정보 응답 — 「추적」 근거 갱신(restricted SDK) · 처리방침 문안 | App Store Connect — 아래 「스토어 고지」 |
| 12 | (선택) Meta Install Referrer — Meta 앱 ID와 복호화 키 | 결정 뒤에만 — 앱 코드에 값이 하나 더 필요하다(ADR-0063 「사용자 확인 필요」 12) |

- Meta 연동은 이제 Airbridge를 거친다. **Meta Events Manager에 예전 Meta SDK 앱 설정이 있다면 더 쓰지 않는다** — 앱이 Meta로
  직접 보내는 것은 없다. 남겨 두면 같은 이벤트가 두 경로로 보인다고 오해하기 쉽다.
- 인앱 구매 자동 추적의 기본값은 확인하지 못했다(앱에 젬 구매 화면이 있으나 호스트에 결제 코드는 없다). 결제 이벤트는
  범위 밖이므로 대시보드에 인앱 구매 관련 토글이 보이면 끈다 — 실제 동작은 수신 확인 때 함께 본다.

## 딥링크 대시보드 설정 ⟨2026-10-22 — [ADR-0080](adr/0080-airbridge-deeplink.md)⟩

| 칸 | 값 |
|---|---|
| iOS URI scheme · Android URI scheme | `duru://` |
| iOS App ID(universal link) | `7SJJT6G6JK.com.libitum.host` |
| Android 패키지 · SHA256 지문 | `libitum.duru.android` · Play 앱 서명 키(Play Console › 앱 무결성) + 업로드 키(`keytool -list -v -keystore ~/duru-upload.jks`) + 디버그 키 |
| 트래킹 링크의 딥링크 주소 | `duru://journey` · `duru://roleplay` · `duru://settings` 가운데 하나. 그 밖은 앱만 연다 |

- 앱은 Airbridge 도메인 `duru.airbridge.io` · `duru.abr.ge`를 universal link · App Link로 받는다. App Name이 `duru`라서 이 이름이다 —
  App Name이 바뀌면 `Host.entitlements` · `AndroidManifest.xml`도 바꾼다.
- 커스텀 도메인 `go.k-duru.com`도 받는다(ADR-0080 D4 보충). 대시보드 Tracking Link › Custom Domain에서 기본 도메인(별)으로 두면
  새 커스텀 채널 링크가 이 주소로 만들어진다. DNS는 가비아에서 CNAME 하나다.
- 지연 딥링크(설치 전에 누른 링크)는 가입을 마치고 「여정 시작하기」 뒤에 열린다.
- 확인 절차: [e2e 시나리오 E](e2e/airbridge-events.md#e--딥링크--지연-딥링크-adr-0080).

## Real-time Logs에서 수신 확인

⚠ 실행된 적이 없는 절차다. 기록은 [e2e 시나리오 C](e2e/airbridge-events.md#c--실제-값으로-airbridge-대시보드-수신-확인-사용자-몫-이번-범위-밖)의
표에 남긴다.

1. 위 「대시보드에서 할 일」 1 · 2를 마친다.
2. 값을 넣고 호스트를 다시 빌드해 **새로 설치**한다(설치 이벤트를 보려면 기존 앱을 지운다).
3. Airbridge 대시보드의 **Real-time Logs**를 열어 둔다. 이벤트는 수 분 늦게 올 수 있다. 앱을 홈으로 보냈다 되돌리면 전송이
   당겨질 수 있다.
4. 앱에서 진입 흐름을 끝까지 가고(「여정 시작하기」 — 로그인 필요), ~~여정의 메신저 유닛을 끝낸다~~ ⟨2026-10-21⟩ 튜토리얼 u00(맵 첫 구획 `Episode 0.`)의 최종 테스트를 통과한다.
   ⟨2026-10-18⟩ **서버에 기록이 없는 새 계정으로 로그인한다** — 기록 있는 계정은 바로 맵으로 가 `airbridge.user.signup`이 나지 않는다(위 「읽을 때 알아 둘 것」).
5. 기대: **Install** · **Open**, `airbridge.user.signup`, `airbridge.achieveLevel`(`level` · `label` 포함)이 보인다.
6. 함께 보고 결과를 적는다 — iOS 설치 이벤트가 실행 직후 곧바로 나가는지(ATT 대기 없음), 속성에 개인정보가 없는지, 결제
   관련 자동 이벤트가 실리지 않는지.
7. 개발 기기에서 확인만 했다면 값 파일을 지우고 다시 빌드한다.

같은 PR에서 할 일이 하나 더 있다 — GitHub wiki 「[이벤트 사전](https://github.com/libitums/FE/wiki/Analytics-Events)」의
세 이벤트(`entry_completed` · `messenger_unit_completed` · `visual_novel_unit_completed`)의 「Meta로도 전달」 표시를
「Airbridge로 전달」과 카테고리 · 속성(위 표)으로 바꾼다. wiki는 저장소 밖이라 PR 작성자가 손으로 한다.
⟨2026-10-21⟩ `messenger_unit_completed` · `visual_novel_unit_completed`는 이름째 지워졌다 — wiki에서는 「Airbridge로 전달」을 `episode_final_passed`(→ `airbridge.achieveLevel`, `label` `episode_final`)로 옮긴다.

## 스토어 고지에서 바뀌는 것

스토어 콘솔의 수정은 사용자 몫이다. 저장소는 이것을 강제하지 못한다. #242(Meta SDK)로 이미 고쳤다면 **공유 대상 이름과
「추적」 근거만** 바뀐다.

### Google Play — 이 변경이 든 빌드를 올리기 전에 먼저

**순서가 중요하다.** `com.google.android.gms.permission.AD_ID` 권한은 값 파일과 무관하게 **이 변경이 든 모든 빌드의
매니페스트에 실린다.** 콘솔의 선언이 「광고 ID를 쓰지 않음」인 채로 AAB를 올리면 Play가 거절하거나 경고할 수 있다.

1. Play Console → 앱 콘텐츠 → **광고 ID**: 「사용함」(#242에서 이미 바꿨다면 그대로), 용도에 광고 · 마케팅(광고 성과
   측정)과 분석.
2. 앱 콘텐츠 → **데이터 보안**: 기기 또는 기타 ID(광고 ID)와 앱 활동(앱 상호작용 — 위 표의 이벤트)을 수집 · 공유로, 목적에
   광고 또는 마케팅, **「제3자와 공유」의 대상을 Meta에서 Airbridge(AB180)로** 바꾼다. Airbridge가 매체(Meta · Google ·
   TikTok)에 귀속 결과를 넘기는 것을 「공유」로 적을지는 사용자 판단이다.
3. 그다음에 이 변경이 든 AAB를 올린다.
4. 값은 그 뒤 언제 넣어도 된다 — 값을 넣는 것은 선언을 바꾸지 않는다(권한은 이미 실려 있다).

Meta SDK에서 Airbridge로 바뀌며 병합 매니페스트에서 **빠진 것**: `ACCESS_ADSERVICES_ATTRIBUTION` · `ACCESS_ADSERVICES_AD_ID` ·
`ACCESS_ADSERVICES_CUSTOM_AUDIENCE` · `ACCESS_ADSERVICES_TOPICS`, Facebook 로그인 토큰용 receiver 둘. **남은 것**: `AD_ID`,
`com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE`. **새로 든 것**: 권한은 없다 — `<queries>`의 패키지
둘(Meta 앱 설치 여부 조회 — 이름을 지정한 조회라 Play의 「모든 패키지 조회」 정책 대상이 아니다)과 provider 하나. 사용자에게
뜨는 대화상자는 없다.

### App Store

1. App Store Connect → 앱이 수집하는 개인정보: **제품 상호작용** · **기기 ID**의 용도에 **개발자의 광고 또는 마케팅**
   (앱의 `PrivacyInfo.xcprivacy`가 이미 그렇게 선언한다. #242에서 바꿨다면 그대로).
2. ⟨2026-10-22⟩ **「추적」은 「예」로 답한다** — iOS가 허용을 묻고 IDFA를 싣는다(ADR-0079). 아래는 옛 기록이다.
   ~~**「추적」 질문은 여전히 사용자 판단이다.**~~ 근거가 #242 때보다 단순해졌다 — 앱 매니페스트도 SDK 매니페스트도
   `NSPrivacyTracking = false`이고, SDK 바이너리에 IDFA · ATT 코드가 없다. 근거와 한계는
   [iOS 프라이버시 문서](ios-privacy.md#airbridge-sdk와-추적-선언)에 있다.
3. 공개 개인정보처리방침의 제3자를 Meta에서 Airbridge(AB180)로 바꾼다 — 문안 초안은 같은 문서에 있다.

## 되돌리기

| 하려는 것 | 방법 | 따라오는 것 |
|---|---|---|
| 보내기를 멈춘다(SDK는 둔다) | 두 값 파일을 지우고 다시 빌드 | 없음. 권한 · 용량은 그대로다 |
| Android 광고 ID 권한을 뺀다 | 의존을 `io.airbridge:sdk-android-restricted:4.11.3`으로 바꾸고 `AndroidManifest.xml`의 `AD_ID` 줄을 `tools:node="remove"`로 | 정적 검사 `host-airbridge-events.integration.test.mjs`의 권한 단언을 함께 고친다. Play 선언을 되돌린다. Android의 Meta · TikTok 귀속이 거칠어진다 |
| ~~iOS에서 IDFA를 받을 수 있게 한다(ATT를 연다)~~ | ⟨2026-10-22⟩ 했다 — ADR-0079 | — |
| iOS ATT를 다시 닫는다 | pod을 `airbridge-ios-sdk-restricted`로 되돌리고 `NSUserTrackingUsageDescription` · `requestTrackingAuthorization` · 앱 manifest의 tracking을 되돌린다 | ADR-0079를 대체하는 새 결정. App Store 「추적」 응답을 되돌린다 |
| SDK를 걷어 낸다 | 이 변경을 되돌린다(pod · Gradle 의존과 저장소 블록 · 호스트 파일 · 매니페스트 · `Info.plist` · JS 모듈 셋 · 진입점 · 가드 숫자) | 스토어 고지를 되돌린다. 결정을 뒤집는 일이므로 ADR-0063을 `대체됨`으로. release-shrink A1 · A3 · A4와 정렬 검사 NA3의 숫자가 다시 바뀐다 |

## 확인 명령

| 무엇을 | 명령 |
|---|---|
| 추적 파일이 계약대로인가(값이 비었는가 · Meta 흔적 0 · 추적 문구 없음 · 조건부 등록 등) | `pnpm test:android-bundle` (`host-airbridge-events.integration.test.mjs` I-S1 ~ I-S9, iOS 파일도 읽는다) |
| JS 매핑 · 합성 | `pnpm test:unit` · `pnpm test:integration` |
| iOS 판정 · 모듈 · 이름 상수 | [e2e 문서](e2e/airbridge-events.md) A1의 7 (`HostTests/AirbridgeEventsTests`) |
| Android 판정 · 이름 상수 · 계측 | [Android README](../apps/android/README.md#airbridge-앱-이벤트) |
| Android 출시 산출물(dex · `.so` 개수 · 다운로드 크기) | [Android README 「코드 축소」](../apps/android/README.md#코드-축소r8와-난독화)의 `release-shrink.artifacts.mjs` |
