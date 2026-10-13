# Meta 앱 이벤트 — 값 넣기 · 수신 확인 · 스토어 고지

호스트 앱에 든 Meta(Facebook) 앱 이벤트 SDK를 **켜고, 확인하고, 되돌리는** 운영 안내다. 무엇을 왜 그렇게 정했는지는
[ADR-0057](adr/0057-meta-app-events.md)이, 기기에서 보는 절차는 [Meta 앱 이벤트 e2e](e2e/meta-app-events.md)가 진다.

⚠ **이 문서의 「수신 확인」과 「스토어 고지」 절차는 아직 한 번도 실행되지 않았다.** 실제 앱 ID로 Meta가 이벤트를 받는
것을 본 적이 없고, 스토어 콘솔의 화면 이름은 콘솔에서 직접 대조하지 않았다. 처음 실행하는 사람이 어긋난 곳을 이 문서에
고쳐 적는다.

## 한눈에

- 값이 **없으면** 앱은 SDK를 한 줄도 부르지 않는다. 화면 · 동작이 SDK를 넣기 전과 같고 Meta로 나가는 요청이 없다.
- 값이 **있으면** SDK가 설치 · 앱 실행을 스스로 보내고, 앱은 가입 완료 · 레슨 완료 둘을 더 보낸다.
- 값은 저장소에 커밋하지 않는다. 플랫폼마다 추적하지 않는 파일 하나에 적는다.
- ⚠ **Android는 값이 없는 빌드에도 광고 ID 권한이 실린다.** Play에 올리기 전에 콘솔의 선언부터 고친다
  ([스토어 고지에서 바뀌는 것](#스토어-고지에서-바뀌는-것)).

## 값 넣기

Meta 개발자 계정의 앱에서 **앱 ID**(숫자)와 **클라이언트 토큰**(앱 설정 → 고급)을 받는다. 키 이름은 두 플랫폼 모두
`META_APP_ID` · `META_CLIENT_TOKEN`이다.

| 플랫폼 | 값 파일(추적 안 함) | 예시 파일(추적함 · 빈 값) |
|---|---|---|
| iOS | `apps/ios/Config/Meta.local.xcconfig` | `apps/ios/Config/Meta.local.xcconfig.example` |
| Android | `apps/android/app/meta.properties` | `apps/android/app/meta.properties.example` |

```sh
# 저장소 루트
cp apps/ios/Config/Meta.local.xcconfig.example apps/ios/Config/Meta.local.xcconfig
cp apps/android/app/meta.properties.example apps/android/app/meta.properties
# 두 파일을 열어 값을 채운다
git status --short apps/ios/Config apps/android/app   # 아무것도 나오지 않아야 한다
```

```
// apps/ios/Config/Meta.local.xcconfig — 등호 양옆 공백은 있어도 된다
META_APP_ID = <숫자>
META_CLIENT_TOKEN = <토큰>
```

```
# apps/android/app/meta.properties
META_APP_ID=<숫자>
META_CLIENT_TOKEN=<토큰>
```

- **값은 빌드 시점에 박힌다.** 파일을 만들거나 고친 뒤에는 그 플랫폼의 호스트를 다시 빌드한다. iOS는 값이 바뀌면 clean
  빌드가 안전하다. JS 번들(`pnpm bundle:host` · `pnpm bundle:android`)은 값과 무관하다.
- **두 파일은 서로를 모른다.** 한쪽에만 넣으면 그 플랫폼만 보낸다 — 빌드는 경고하지 않는다.
- **형식이 틀리면 값이 없는 것과 같다.** 앱 ID는 숫자만, 클라이언트 토큰은 공백 없는 한 덩어리여야 한다. 앞뒤 공백은
  걷어 낸다. 둘 중 하나라도 어기면 SDK를 시작하지 않는다(오류도 내지 않는다).
- 워크트리마다 따로 둔다 — 추적하지 않는 파일이라 다른 워크트리로 따라오지 않는다.
- CI와 배포 빌드에 값을 넣는 방법은 정해지지 않았다. 지금은 배포 빌드를 만드는 기기에 두 파일을 손으로 둔다.
- **실제 값을 문서 · 로그 · 커밋 메시지 · 실행 기록에 적지 않는다.**

## 값이 없을 때의 동작

값 파일이 없거나, 비었거나, 형식이 틀린 빌드에서는

1. 호스트가 SDK 초기화를 부르지 않는다(iOS는 프레임워크가 로드만 되고, Android는 SDK의 자동 초기화 provider를
   매니페스트에서 뺐다).
2. 호스트 모듈 `MetaAppEventsModule`이 등록되지 않는다. JS는 모듈이 없는 것을 「보낼 곳 없음」으로 읽는다.
3. PostHog 전송은 영향을 받지 않는다 — 두 전송은 서로의 설정을 전제로 하지 않는다.
4. debug · bundled · release 어느 빌드도 값이 없다는 이유로 실패하지 않는다.

그래도 **값과 무관하게 실리는 것**이 있다 — SDK 바이너리(iOS 앱 약 +9.8 MB, 시뮬레이터 Release 기준), Android 매니페스트의
광고 ID 권한 등 여섯, iOS `Info.plist`의 SKAdNetwork 식별자 둘, SDK가 싣는 프라이버시 매니페스트.

값 없는 빌드의 기기 확인 결과(2026-10-13, 시뮬레이터 · 에뮬레이터 각 한 대, 로그인 화면까지)는
[e2e 문서의 「A 결과 기록」](e2e/meta-app-events.md#a-결과-기록)에 있다.

## 무엇이 Meta로 가는가

| Meta에 보이는 것 | 언제 | 내는 쪽 |
|---|---|---|
| 앱 설치 · 앱 실행 | 설치 뒤 첫 실행 · 앱이 전경으로 올 때 | SDK 자동 이벤트 |
| `fb_mobile_complete_registration` (가입 완료) | 진입 흐름 끝의 「여정 시작하기」 | 앱 |
| `fb_mobile_level_achieved` (레슨 완료) — `fb_level`(유닛 ID) · `fb_content_type`(`messenger` \| `visual_novel`) | 여정의 메신저 유닛을 처음 끝낼 때 · 여정의 비주얼 노벨 유닛이 끝날 때 | 앱 |

읽을 때 알아 둘 것(매핑의 정본과 이유는 [ADR-0057 D6](adr/0057-meta-app-events.md)).

- **「가입 완료」는 가입이 아니라 진입 흐름 완주다.** 로그아웃 뒤 다시 로그인하거나 재설치 뒤 로그인해도 난다.
- **「레슨 완료」는 사용자당 최대 2회다.** 여정의 메신저 유닛 하나와 비주얼 노벨 유닛 하나뿐이고, 표준 학습 유닛 · 전화
  유닛 · 카탈로그 레슨은 보낼 이벤트가 없다. 롤플레이(연습)에서 끝낸 것은 보내지 않는다.
- 사용자 ID · 이메일 · 전화번호 · 로그인 수단은 싣지 않는다.
- iOS는 광고 식별자(IDFA)를 수집하지 않고 추적 허용 팝업을 띄우지 않는다. 설치는 SKAdNetwork · 집계 측정으로 센다 —
  Android보다 늦고 거칠게 보인다.

## Meta 이벤트 관리자에서 수신 확인

⚠ 실행된 적이 없는 절차다. 기록은 [e2e 시나리오 C](e2e/meta-app-events.md)의 표에 남긴다.

1. Meta 개발자 계정의 앱 설정에 플랫폼을 등록한다 — iOS 번들 ID `com.libitum.host`, Android 패키지 이름
   `libitum.duru.android`(키 해시를 요구하면 배포 서명 키의 것).
2. Meta 앱 대시보드에서 **자동 인앱 구매 이벤트 로깅을 끈다.** 결제 이벤트는 이 작업의 범위 밖이다. 켜 둔 때 SDK가 무엇을
   싣는지는 확인하지 않았다.
3. 위 「값 넣기」대로 값을 넣고 호스트를 다시 빌드해 **새로 설치**한다(설치 이벤트를 보려면 기존 앱을 지운다).
4. Meta **이벤트 관리자 → 테스트 이벤트**를 열어 둔다. SDK 이벤트는 묶여서 나가므로 몇 분 늦을 수 있다. 앱을 홈으로
   보냈다 되돌리면 전송이 당겨진다.
5. 앱에서 진입 흐름을 끝까지 가고(「여정 시작하기」), 여정의 메신저 유닛을 끝낸다.
6. 기대: 설치 · 앱 실행, `fb_mobile_complete_registration`, `fb_mobile_level_achieved`(`fb_level` · `fb_content_type` 포함)가
   보인다.
7. 함께 보고 결과를 적는다 — Android 11 이상에서 설치 리퍼러가 잡히는지(매니페스트 `<queries>` 선언이 필요한지 모른다),
   결제 관련 자동 이벤트가 실리지 않는지.
8. 개발 기기에서 확인만 했다면 값 파일을 지우고 다시 빌드한다.

같은 PR에서 할 일이 하나 더 있다 — GitHub wiki
「[이벤트 사전](https://github.com/libitums/FE/wiki/Analytics-Events)」의 세 이벤트(`entry_completed` ·
`messenger_unit_completed` · `visual_novel_unit_completed`)에 「Meta로도 전달」과 Meta 이름을 표시한다. wiki는 저장소 밖이라
PR 작성자가 손으로 한다.

## 스토어 고지에서 바뀌는 것

스토어 콘솔의 수정은 사용자 몫이다. 저장소는 이것을 강제하지 못한다.

### Google Play — 값을 넣기 전에, 이 변경이 든 빌드를 올리기 전에 먼저

**순서가 중요하다.** `com.google.android.gms.permission.AD_ID` 권한은 값 파일과 무관하게 **이 변경이 든 모든 빌드의
매니페스트에 실린다.** 콘솔의 선언이 「광고 ID를 쓰지 않음」인 채로 AAB를 올리면 Play가 거절하거나 경고할 수 있다.

1. Play Console → 앱 콘텐츠 → **광고 ID**: 「사용함」으로 바꾸고 용도에 광고 · 마케팅(광고 성과 측정)과 분석을 고른다.
2. 앱 콘텐츠 → **데이터 보안**: 수집 · 공유하는 데이터에 기기 또는 기타 ID(광고 ID)와 앱 활동(앱 상호작용 — 위 표의
   이벤트)을 더하고, 목적에 광고 또는 마케팅을, 「제3자와 공유」에 Meta를 반영한다.
3. 그다음에 이 변경이 든 AAB를 올린다.
4. 값은 그 뒤 언제 넣어도 된다 — 값을 넣는 것은 선언을 바꾸지 않는다(권한은 이미 실려 있다).

이 변경으로 Android 매니페스트에 새로 실리는 권한은 여섯이다 — `AD_ID`, SDK가 더한 `ACCESS_ADSERVICES_ATTRIBUTION` ·
`ACCESS_ADSERVICES_AD_ID` · `ACCESS_ADSERVICES_CUSTOM_AUDIENCE` · `ACCESS_ADSERVICES_TOPICS`, 그리고 설치 리퍼러의
`com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE`. 사용자에게 뜨는 대화상자는 없다.

### App Store

1. App Store Connect → 앱이 수집하는 개인정보: **제품 상호작용** · **기기 ID**의 용도에 **개발자의 광고 또는 마케팅**을
   더한다(앱의 `PrivacyInfo.xcprivacy`가 이미 그렇게 선언한다).
2. **「추적」 질문은 판단이 필요하다.** 앱은 추적 허용을 묻지 않고 IDFA를 수집하지 않으며 앱 매니페스트는
   `NSPrivacyTracking = false`다. 그러나 SDK 자체의 매니페스트는 tracking `true`를 선언한다. 근거와 한계는
   [iOS 프라이버시 문서](ios-privacy.md#meta-sdk와-추적-선언)에 있다. 어떻게 답할지는 정해지지 않았다
   ([ADR-0057](adr/0057-meta-app-events.md) 「사용자 확인 필요」 7).
3. 공개 개인정보처리방침에 Meta로 보내는 것을 적는다 — 문안 초안은 같은 문서에 있다.

## 되돌리기

| 하려는 것 | 방법 | 따라오는 것 |
|---|---|---|
| 보내기를 멈춘다(SDK는 둔다) | 두 값 파일을 지우고 다시 빌드 | 없음. 권한 · 용량은 그대로다 |
| Android 광고 ID 권한을 뺀다 | `AndroidManifest.xml`의 `AD_ID` 줄을 `tools:node="remove"`로 바꾸고 `com.facebook.sdk.AdvertiserIDCollectionEnabled`를 `false`로 | 정적 검사 `host-meta-app-events.integration.test.mjs`의 I-S1을 함께 고친다. Play 선언을 되돌린다. Android 설치 귀속이 거칠어진다. `ACCESS_ADSERVICES_*` 넷은 SDK가 넣는 것이라 남는다 |
| SDK를 걷어 낸다 | 이 변경을 되돌린다(pod · Gradle 의존 · 호스트 파일 · 매니페스트 · `Info.plist` · 프라이버시 매니페스트 · JS 모듈 셋 · 진입점) | 스토어 고지를 모두 되돌린다. 결정을 뒤집는 일이므로 ADR-0057을 `대체됨`으로 |

## 확인 명령

| 무엇을 | 명령 |
|---|---|
| 추적 파일이 계약대로인가(값이 비었는가 · provider 제거 · 추적 문구 없음 등) | `pnpm test:android-bundle` (I-S1 ~ I-S7, iOS 파일도 읽는다) |
| JS 매핑 · 합성 | `pnpm test:unit` · `pnpm test:integration` |
| iOS 판정 · 모듈 · 이름 상수 | [e2e 문서](e2e/meta-app-events.md) A1의 7 (`HostTests/MetaAppEventsTests`) |
| Android 판정 · 이름 상수 · 계측 | [Android README](../apps/android/README.md#meta-앱-이벤트) |
