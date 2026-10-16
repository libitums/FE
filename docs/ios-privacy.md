# iOS Privacy Manifest — 앱 API 선언과 배포 확인

`apps/ios/Host/PrivacyInfo.xcprivacy`는 Host가 직접 사용하는 required-reason API를
선언합니다. Host 타깃의 Copy Bundle Resources에 등록되어 Debug와 Release 모두
`Host.app/PrivacyInfo.xcprivacy`로 포함됩니다.

## 앱의 API 사용 사유

| 카테고리 | 사유 | 코드 근거 |
| --- | --- | --- |
| `NSPrivacyAccessedAPICategoryUserDefaults` | `CA92.1` | `StorageModule.swift`의 `get`·`set`·`remove`가 `UserDefaults.standard`에서 `libitum.` 접두사 아래 앱 자체 정보를 읽고 씁니다. |

앱 그룹이나 다른 앱의 defaults를 읽지 않습니다. Host는 배포되는 범용 SDK가 아니므로
SDK 래퍼용 `C56D.1`을 쓰지 않습니다. 근거는
[Apple의 UserDefaults 허용 사유](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype)입니다.

## 수집 항목 대조 (2026-10-01)

App Store Connect의 공개된 응답과 배포 코드 경로를 대조했다. 아래 7개 항목을 앱 manifest에도 선언한다. 모두 사용자와 연결되고 광고 추적에 사용하지 않는다. 분석 항목은 `PUBLIC_POSTHOG_KEY`로 PostHog가 켜진 배포 설정을 포함한다. SDK 자체 API 선언은 이 표와 별도로 유지한다.

⟨2026-10-13⟩ **표의 두 행에 목적 `Developer Advertising`이 더해졌다** — Meta 앱 이벤트 SDK([ADR-0057](adr/0057-meta-app-events.md)) 때문이다. 이 두 칸은 **코드와 앱 manifest만 고친 것이고 App Store Connect의 응답과는 아직 대조하지 않았다** — 아래 [Meta SDK와 추적 선언](#meta-sdk와-추적-선언).

| App Store 항목 / manifest 접미사 | 목적 | 코드 근거 |
| --- | --- | --- |
| 이름 / `Name` | App Functionality | Google·Facebook 로그인 시 Supabase에 기본 프로필 저장. Apple은 `requestedScopes = []` |
| 이메일 / `EmailAddress` | App Functionality | Supabase 소셜 인증 프로필 |
| 대략적인 위치 / `CoarseLocation` | Analytics | PostHog GeoIP 국가·지역·시간대. ADR-0029 D15의 서버 변환 설정 전제 |
| 기타 사용자 콘텐츠 / `OtherUserContent` | Analytics | `feedback-api.ts` → `submit_feedback`: 선택적 평점·의견·화면/에피소드 맥락 |
| 사용자 ID / `UserID` | App Functionality, Analytics | Supabase 계정별 저장 및 로그인 후 PostHog identify |
| 기기 ID / `DeviceID` | App Functionality, **Developer Advertising** ⟨2026-10-13⟩ | `push_devices`의 APNs 토큰과 사용자 연결. Meta SDK 자체 manifest가 `DeviceID`를 선언한다(IDFA는 수집하지 않는다 — 아래 절) |
| 제품 상호작용 / `ProductInteraction` | App Functionality, Analytics, **Developer Advertising** ⟨2026-10-13⟩ | 서버 진행·학습 날짜·최근 접속 및 PostHog 화면/학습 이벤트. Meta로 가는 앱 설치 · 실행 · 가입 완료 · 레슨 완료 이벤트(`meta-events.ts`) |

`NSPrivacyTracking = false`이며 각 수집 항목의 tracking도 false다. ~~광고 ID·광고 SDK는 사용하지 않는다.~~ ⟨2026-10-13 — 이 문장은 더는 참이 아니다. 광고 측정 SDK(Meta `FBSDKCoreKit`)가 앱에 들어 있다. IDFA는 수집하지 않고 추적 허용(ATT)을 묻지 않는다 — 아래 [Meta SDK와 추적 선언](#meta-sdk와-추적-선언)⟩ 음성은 기기가 지원하면 온디바이스, 아니면 Apple Speech 서버에서 처리하며 앱 서버/분석에는 음성이나 인식 원문을 보내지 않는다. Apple 프레임워크 자체 수집은 개발자가 공개할 책임이 없다는 [Apple 안내](https://developer.apple.com/app-store/app-privacy-details/)의 “Apple frameworks or services” 기준을 따른다. 온디바이스라고만 안내해서는 안 된다.

신고 화면의 7개 항목은 현재 공개 상태와 일치한다(2026-10-01 기준 — 2026-10-13에 더한 `Developer Advertising` 목적 둘은 신고 화면에 아직 없다). 다만 신고 일치가 공개 처리방침의 완결성이나 운영 SaaS 설정을 증명하지는 않는다. 운영 PostHog 프로젝트 632540의 키가 Release 설정과 일치하는지 값 노출 없이 대조했다. `anonymize_ips = true`와 활성 GeoIP 변환 소스(국가·대륙·1단계 행정구역·시간대만 추가)를 MCP로 확인했다. 실제 `entry_screen_viewed` 속성 목록도 이 위치 항목들만 보고한다. 프로젝트의 replay/성능 수집 토글은 켜져 있지만 앱은 PostHogCore의 수동 이벤트만 쓰므로 웹 SDK 자동 수집 기능을 실행하지 않는다. 이번 검토에서는 운영 설정을 변경하지 않았다.

### Meta SDK와 추적 선언

2026-10-13. 광고 측정용 Meta 앱 이벤트 SDK가 Host에 들어왔다. 결정은 [ADR-0057](adr/0057-meta-app-events.md), 값 넣기와 스토어 콘솔 순서는 [운영 안내](meta-app-events.md)가 진다. 여기는 **iOS의 선언이 무엇이고 어디가 약한가**만 적는다.

앱이 하는 것과 하지 않는 것(코드 근거).

| 항목 | 상태 | 근거 |
| --- | --- | --- |
| 추적 허용(ATT) 요청 | 하지 않는다 | `NSUserTrackingUsageDescription`이 `Info.plist`에도 `INFOPLIST_KEY_*`에도 없다. 정적 검사 I-S4와 HostTests N-I6이 지킨다 |
| IDFA 수집 | 하지 않는다 | `Info.plist`의 `FacebookAdvertiserIDCollectionEnabled = false` |
| 자동 앱 이벤트(설치 · 실행) | 켠다 — **값이 있는 빌드에서만 나간다** | `FacebookAutoLogAppEventsEnabled = true`. 앱 ID · 클라이언트 토큰이 없으면 호스트가 SDK를 시작하지 않는다 |
| 앱이 보내는 이벤트 | 가입 완료 · 레슨 완료 둘. 파라미터는 콘텐츠 식별자뿐 | `apps/mobile/src/lib/meta-events.ts`. 사용자 ID · 이메일 · 전화번호 · 로그인 수단 없음, 고급 매칭 없음 |
| SKAdNetwork | 식별자 둘 | `Info.plist`의 `SKAdNetworkItems` — `v9wttpbfk9.skadnetwork` · `n38lu8286q.skadnetwork`. ⚠ Meta 공식 문서와 대조하지 못했다 |
| URL scheme · `LSApplicationQueriesSchemes` | 없다 | Facebook 로그인 · 공유 · 딥링크를 SDK로 하지 않는다 |

**앱 manifest** — `NSPrivacyTracking = false`를 유지하고, `ProductInteraction` · `DeviceID`의 목적에 `NSPrivacyCollectedDataTypePurposeDeveloperAdvertising`을 더했다. 두 항목의 tracking은 false 그대로다.

**SDK manifest** — 손대지 않는다(SDWebImage와 같은 원칙: SDK의 선언을 앱이 대신 적거나 고치지 않는다). `FBSDKCoreKit` 18.1.1이 싣는 선언은 다음과 같다(2026-10-13에 배포물을 받아 읽었다).

- `NSPrivacyTracking = true`
- `NSPrivacyTrackingDomains = [ep1.facebook.com]`
- `DeviceID` — tracking true, 목적 `ThirdPartyAdvertising`
- `OtherDataTypes`(Analytics) · `CrashData`
- required-reason API: UserDefaults `CA92.1`
- 함께 오는 `FBAEMKit` · `FBSDKCoreKit_Basics`의 manifest는 tracking false

**앱은 false, SDK는 true — 이 조합을 고른 근거**(계약 단계가 고른 기본값이고 사용자 확인 전이다). 이 앱은 ATT를 요청하지 않고 IDFA를 수집하지 않으며 사용자를 식별할 값을 Meta에 보내지 않는다. ATT 허용이 없는 앱에서 iOS는 manifest에 선언된 추적 도메인으로의 접속을 막는 것으로 알려져 있다(사전 지식이고 관찰이 아니다). 가짜 값 빌드에서 관찰한 요청은 추적 도메인이 아닌 `ep2.facebook.com`으로 나갔다. ⚠ **IDFA가 없다는 사실만으로 「추적 아님」이 확정되지는 않는다** — Apple의 정의는 광고 측정을 위해 앱의 데이터를 다른 회사의 데이터와 잇는 것을 포함한다.

**한계 — 확인하지 못한 것.**

1. **위 근거의 뒷부분은 관찰이 아니다.** iOS가 `ep1.facebook.com` 접속을 실제로 막는지는 이 저장소에서 보지 않았다. 관찰한 것은 `ep2.facebook.com` 요청 한 건뿐이다.
2. **앱 manifest의 `NSPrivacyTracking = false`가 SDK의 true와 함께 심사를 통과하는지 모른다.** Xcode의 Privacy Report는 앱과 SDK의 manifest를 합쳐 보여 주므로 보고서에는 tracking과 추적 도메인이 나타날 것이다. 서명한 Archive로 만들어 보지 않았다.
3. **App Store Connect의 「추적」 질문에 어떻게 답할지는 정해지지 않았다** — 사용자 판단이다([ADR-0057](adr/0057-meta-app-events.md) 「사용자 확인 필요」 7). 「추적함」으로 답하면 ATT 요청이 따라와야 하고 그것은 「팝업을 띄우지 않는다」는 결정과 부딪힌다.
4. **Meta가 받은 데이터를 자기 쪽에서 무엇과 잇는지는 앱이 통제하지 못한다.** 앱이 아는 것은 보내는 값까지다.
5. 값이 없는 빌드는 SDK를 시작하지 않지만 **SDK의 manifest와 프레임워크는 그대로 `.app`에 실린다.** 값의 유무가 선언을 바꾸지 않는다.

**App Store Connect에서 바뀌는 칸**(아직 고치지 않았다).

- 앱이 수집하는 개인정보 → **제품 상호작용** · **기기 ID**의 용도에 **개발자의 광고 또는 마케팅** 추가.
- 「추적」 질문 — 위 3.
- SDK가 선언하는 `CrashData` · `OtherDataTypes`를 앱의 응답에 더할지는 값이 있는 빌드에서 SDK가 실제로 무엇을 보내는지 본 뒤 정한다. 지금은 더하지 않았다.

**공개 개인정보처리방침에 더할 문안**(초안 — **공개 페이지에는 반영하지 않았다**. 아래 절의 문안들과 함께 게시한다).

> Advertising measurement. We use the Meta (Facebook) SDK to measure how our ads perform. When you install or open the App, complete sign-up, or finish certain lessons, the SDK sends these events to Meta together with device-level information such as device model, operating system version, and an identifier generated by the SDK. On Android this includes the advertising ID, which you can reset or delete in your device settings. We do not request permission to track you across other companies' apps on iOS, we do not collect the iOS advertising identifier (IDFA), and we do not send your name, email address, phone number, or account ID to Meta.

Section 3(제3자) 표에는 Meta Platforms 행을 더한다 — 기능 「advertising measurement」, 정보 「app install and usage events, device information, advertising ID (Android)」. ⚠ 「device model, operating system version, an identifier generated by the SDK」는 SDK의 일반 동작에 대한 사전 지식으로 적은 것이고 요청 본문을 열어 확인하지 않았다 — 게시 전에 값이 있는 빌드에서 대조한다.

### 공개 개인정보처리방침에 반영할 문안

2026-10-01 공개 [DURU Privacy Policy](https://gregarious-pharaoh-bb6.notion.site/DURU-Privacy-Policy-3eb0c2540c01802cad91cc0430552402)를 확인했다. 소셜 인증·PostHog·Apple Speech 설명은 있으나 서버 학습 기록·피드백·APNs 토큰이 누락되어 있다. 아래 문안은 코드 근거로 준비했으며 **공개 페이지에는 아직 반영하지 않았다**. 게시 시 effective date도 갱신한다.

1. Section 1에 추가:

   > Learning progress and feedback. We store completed learning activities and the dates you learn, linked to your account, so you can resume learning and see your streak across sessions and devices. If you submit feedback, we store your rating, message, and the related screen or lesson to improve the App.
   >
   > Notifications. If you enable reminders, we store your Apple push notification token, its link to your account, and your last active time to send learning reminders.

2. “Information stored on your device”에 추가:

   > Learning progress and learning dates that could not be sent are stored on your device and retried when a connection is available. Signing out keeps these pending records for the same account; deleting your account clears them. Uninstalling the App removes pending records that have not reached our servers.

   ⟨2026-10-15 — 이 초안은 더는 사실의 전부가 아니다. **서버가 확인한 진행도 기기에 남는다**([ADR-0062](adr/0062-progress-cache-first.md)) — 고친 초안은 아래 「학습 진행 저장본」⟩

3. Section 2 목적에 추가:

   > To save and restore learning progress, calculate learning streaks, and send reminders when you enable them.

4. Section 3 Supabase 행을 다음 내용으로 확장:

   > Account and sign-in; learning progress and learning dates; feedback; notification registration. Account information, sign-in tokens, completed activities, learning dates, feedback, push tokens and last active time.

   Apple 행의 기능에 “push notification delivery”를 추가하고 정보에 “push notification token and reminder payload”를 추가한다. 기존 Apple Speech 설명은 유지한다.

5. Section 4에 추가:

   > Learning progress, learning dates, and feedback are kept until you delete your account. Notification registrations are deleted when you delete your account. Signing out requests removal of the current device registration and requires a working connection. Disabling notifications in iOS stops delivery but does not itself delete the server registration. Pending learning records on your device are cleared after successful sync or account deletion.

   ⟨2026-10-15 — 마지막 문장은 미전송 기록에만 맞다. 확인된 진행의 기기 사본은 동기화 뒤에도 남고 계정 삭제 · 앱 삭제로 지워진다 — 아래 「학습 진행 저장본」⟩

기존 “Usage information: up to 1 year”는 **PostHog analytics records**로 범위를 명확히 하여 학습 진행의 계정 보존과 구분해야 한다. 특히 [PostHog 공식 보존 안내](https://posthog.com/docs/data/events-retention)는 플랜의 조회 가능 기간이 자동 삭제를 뜻하지 않는다고 명시한다. 이번 MCP에는 보존 기간 조회 도구가 없고 웹은 로그인이 필요해 현재 플랜의 기간을 확정하지 못했다. **1년 후 삭제한다고 단정하는 문구는 사용하지 않는다.** 공개 문안 확정 전에 실제 보존·삭제 절차를 확인하거나 그 절차에 맞춰 기간을 수정해야 한다. 개인정보처리방침 변경 후 공개 URL을 로그아웃 상태에서도 읽을 수 있는지 확인한다.

## 학습자 프로필 — 이름 · 나라 (2026-10-13)

> **App Store Connect 신고 갱신 필요.** 아래 대조는 코드 근거만 정리했다. 신고 화면 · 앱 manifest(`PrivacyInfo.xcprivacy`) · 공개 처리방침은 **아직 바꾸지 않았다**
> (ADR README 보류 표). 3d-2 출시 전에 사용자가 갱신한다.

3d-2([ADR-0059](adr/0059-learner-profile.md))가 **사용자가 직접 입력한 학습용 이름과 고른 나라**를 받는다. 온보딩 마지막 스텝 · 에피소드 전 화면 · 설정
`Name and country in lessons`에서 입력하고, 레슨 문장의 `{이름}` · `{나라}`를 채우는 데만 쓴다. 둘 다 있어야 저장되고 건너뛰면 아무것도 저장하지 않는다.

| 데이터 | 어디에 저장하나 | 목적 | 사용자 연결 | 추적 | 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| 학습용 이름(자유 입력, 1 ~ 30자) | **서버** — Supabase `learner_profiles.name`(계정당 1행) · 기기 `UserDefaults` | App Functionality(레슨 문장에 넣기) | 예 — `user_id`로 계정에 묶인다 | 아니다 | `learner-profile-api.ts` → `save_learner_profile` · `load_learner_profile`, 마이그레이션 `20261013120000_learner_profiles.sql` |
| 나라(목록에서 고름, ISO 코드 두 글자) | 위와 같음 — `learner_profiles.country_code` | App Functionality | 예 | 아니다 | 위와 같음 |

- **기기 저장**: `libitum.learner-profile.<userId>`(서버가 확인한 값도 둔다 — 부팅 직후 · 오프라인에서 문장을 채우려고)와 로그인 전 온보딩에서 입력했을 때만 생기는
  `libitum.learner-profile.guest`(로그인 직후 사용자별 칸으로 옮기고 지운다). 위 「앱의 API 사용 사유」의 UserDefaults `CA92.1` 범위 안이다 — 앱 자체 정보다.
- **보존 · 삭제**: 서버 행은 계정을 지우면 `auth.users` CASCADE로 지워진다. 기기 칸은 계정 삭제 성공에 지우고, **로그아웃에는 남긴다**(같은 계정으로 다시 들어오면
  미전송 값을 이어 올리려고 — 다른 계정은 읽지 않는다). 앱을 지우면 기기 칸도 사라진다. 사용자가 기록만 지우는 기능은 아직 없다(바꾸기만 된다).
- **분석에는 값이 없다.** PostHog 이벤트 `learner_profile_saved` · `learner_profile_skipped` · `learner_profile_opened`는 진입점과 처음/수정 여부만 싣고,
  이름 · 나라 · 그 길이 같은 파생값을 싣지 않는다([ADR-0029](adr/0029-product-analytics-posthog.md) D14 적용 기록). 로그에도 남기지 않는다.
- **나라는 위치 추정이 아니다.** 사용자가 스스로 고른 값이고, PostHog GeoIP의 「대략적인 위치」(위 표)와 따로 있으며 서로 합치지 않는다.

**신고 화면에서 고칠 것(판단은 사용자)**:

1. **이름 / `Name`** — 이미 App Functionality · 사용자 연결로 신고돼 있다. 코드 근거에 「사용자가 입력한 학습용 이름(Supabase `learner_profiles`)」을 더한다. 신고 항목 자체는 그대로일 수 있다.
2. **나라** — Apple 항목 가운데 딱 맞는 것이 없다. 후보는 ① **기타 사용자 콘텐츠 / `OtherUserContent`**(사용자가 앱에 입력한 값) ② **기타 데이터 유형 / `OtherDataTypes`**.
   자기 신고 국가를 「위치」로 보지 않는 쪽이 사실에 가깝다(GPS · IP에서 나온 값이 아니다) — 그러나 어느 쪽으로 신고할지는 정하지 않았다. 고른 항목은 목적 App Functionality · 사용자 연결 예 · 추적 아니오로 신고하고,
   같은 항목을 앱 manifest에도 선언한다.
3. 신고를 바꾸면 이 문서 「수집 항목 대조」 표에 행을 더한다(지금 표는 2026-10-01 공개 상태 그대로다).

**공개 개인정보처리방침에 더할 문안 초안**(공개 페이지에는 아직 반영하지 않았다):

> Learner profile. If you choose to, you can enter a name and select a country to use in lesson sentences (for example, "I'm from Germany."). We store them, linked to your account, so they appear in your lessons on any device. They are not used for advertising or tracking and are not sent to our analytics provider. You can change them in Settings. They are deleted when you delete your account.
>
> On your device, the App keeps a copy of your name and country so lessons can show them before a connection is available. Signing out keeps this copy for the same account; deleting your account removes it.

Section 3의 Supabase 행에 「learner profile (name and country you enter)」을 더한다.

## 학습 진행 저장본 (2026-10-15)

> **공개 처리방침 문구의 수정 여부는 사용자 판단으로 남겼다**(사용자 결정 2026-10-15 — 저장소 안 문서만 고친다, ADR README 보류 표). 아래는 코드 근거의 대조와 문안 초안이다.
> App Store 신고 항목은 바뀌지 않는다 — 새로 모으는 데이터가 아니라 이미 서버에 두는 학습 진행(위 「수집 항목 대조」의 제품 상호작용)의 **기기 사본**이다.

[ADR-0062](adr/0062-progress-cache-first.md)이 **서버가 마지막으로 확인한 학습 진행을 기기에 남긴다** — 켤 때 서버 응답 전에 여정 맵을 지난 진행으로 그리려는 것이다.
전에는 보내지 못한 진행(미전송)만 기기에 두고 서버가 확인하면 지웠다(ADR-0035 D3).

| 데이터 | 어디에 저장하나 | 목적 | 사용자 연결 | 추적 | 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| 학습 진행 스냅숏(끝낸 스텝 · 유닛 · 카탈로그 유닛 키 — 서버 `learning_progress.progress`와 같은 모양) | 기기 `UserDefaults` — 키 `libitum.progress.cached.<userId>` | App Functionality(켤 때 진행을 바로 보이기) | 키에 사용자 id(이 기기 안에서만) | 아니다 | `app/cached-learning-progress.ts`, 쓰는 자리 `app/journey-progress-sync.ts` |

- **담는 것**: 진행 스냅숏만이다. 이름 · 이메일 · 토큰 같은 식별 정보는 없다. 위 「앱의 API 사용 사유」의 UserDefaults `CA92.1` 범위 안이다 — 앱 자체 정보다.
- **보존 · 삭제**: **로그아웃에는 남긴다**(같은 계정으로 다시 들어오면 응답 전에 맵을 채우려고 — 다른 계정은 키가 달라 읽지 않는다). 계정 삭제 성공에 지운다. 앱을 지우면 함께 사라진다.
  서버의 진행은 그대로 계정 삭제 때 CASCADE로 지워진다.
- **분석**: 새 PostHog 이벤트 셋(`progress_load_delayed` · `progress_load_failed` · `progress_load_recovered`)은 상태 전이와 `attempt` · `trigger`만 싣고 진행 내용 · 사용자 id · 대기 시간을 싣지 않는다
  ([ADR-0029](adr/0029-product-analytics-posthog.md) D14 적용 기록).

**공개 개인정보처리방침 문안 초안**(공개 페이지에는 반영하지 않았다 — 위 「공개 개인정보처리방침에 반영할 문안」 2 · 5를 바꾸는 꼴):

- 2 “Information stored on your device”:

  > Your learning progress is also stored on your device, so the App can show it right away when you open it, before it reaches our servers. Progress and learning dates that could not be sent are kept on your device and retried when a connection is available. Signing out keeps these records for the same account; deleting your account clears them. Uninstalling the App removes them.

- 5 Section 4의 마지막 문장:

  > The copy of your learning progress on your device is kept until you delete your account or uninstall the App.

## 배포 산출물 확인

1. `pnpm bundle:host`로 production 번들을 준비합니다.
2. `apps/ios`에서 Release Archive를 만듭니다. 서명 없이 포함 여부만 확인할 때는 다음을 씁니다.

   ```sh
   xcodebuild archive -workspace Host.xcworkspace -scheme Host -configuration Release \
     -destination 'generic/platform=iOS' -archivePath build/Host.xcarchive \
     CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO
   ```

3. `plutil -lint build/Host.xcarchive/Products/Applications/Host.app/PrivacyInfo.xcprivacy`로
   문법을 확인하고 `plutil -p`로 UserDefaults / CA92.1 값과 소스의 일치를 확인합니다.
4. SDK별 manifest도 실제 `.app` 안에 들어 있는지 확인합니다. Xcode Organizer에서
   서명한 최종 Archive의 Privacy Report를 생성하고 App Store Connect 검증 결과를 확인합니다.

서명 없는 Archive 성공은 App Store 제출 승인이나 개인정보 공개 완료를 뜻하지 않습니다.
Apple이 지정한 iOS 앱의 파일 위치는
[manifest 추가 안내](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk)에 따릅니다.

## SDWebImage SDK manifest

SDWebImage는 [Apple의 manifest 필수 SDK 목록](https://developer.apple.com/support/third-party-SDK-requirements/)에 포함됩니다.
기존 5.15.5에는 manifest가 없어서 공식 선언을 제공하는 **5.21.7**로 고정합니다.
[SDK 원본 manifest](https://github.com/SDWebImage/SDWebImage/blob/5.21.7/WebImage/PrivacyInfo.xcprivacy)는
`FileTimestamp / C617.1`을 선언하며, CocoaPods가 이를
`Host.app/SDWebImage.bundle/PrivacyInfo.xcprivacy`로 복사합니다. 앱의 manifest에 SDK
선언을 대신 적거나 SDK의 선언 내용을 수정하지 않습니다.

LynxService/Image 4.0.1은 SDWebImage 5.15.5를 정확 버전으로 요구합니다. 그래서 공식
LynxService podspec의 Image 의존성 한 필드만 조정한 로컬 명세를 사용합니다.
**Lynx 런타임·서비스 소스·WebP coder 버전은 유지합니다.** 원본 출처·라이선스·변경 범위와
제거 조건은 [podspecs 안내](../apps/ios/podspecs/README.md)에 기록합니다.

업데이트 후 다음을 확인합니다.

- `pod install --deployment --no-repo-update`가 lock 변경 없이 완료되는지 확인합니다.
- HostTests에서 등록된 Lynx 이미지 서비스로 번들 PNG·JPEG·애니메이션 WebP를 읽고,
  WebP 프레임 진행·일시 정지·재개 및 원본·메모리 제거 후 디스크 캐시 재로딩을 확인합니다.
- 서명 없는 Release Archive에서 앱 자체 manifest와 `SDWebImage.bundle`,
  `MJRefresh.Privacy.bundle`의 SDK manifest가 모두 포함되는지 확인합니다.
  ⟨2026-10-13⟩ Meta SDK의 프레임워크 셋(`FBSDKCoreKit` · `FBAEMKit` · `FBSDKCoreKit_Basics`)이 들어온 뒤로는 이 확인을
  다시 하지 않았습니다 — 다음 Archive에서 세 프레임워크 안의 manifest도 함께 봅니다.
- SDK manifest를 plist로 읽어 설치된 SDK 원본의 값 전체와 비교합니다.

검증 기록은 [SDK manifest 보고서](performance/reports/ios-sdk-privacy-manifest-archive-01.md)를
참조합니다. 최종 서명 Archive의 Privacy Report·App Store Connect 검증과 앱 전체의
운영 설정과 공개 개인정보처리방침 반영 확인은 별도로 수행해야 합니다.
