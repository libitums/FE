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

| App Store 항목 / manifest 접미사 | 목적 | 코드 근거 |
| --- | --- | --- |
| 이름 / `Name` | App Functionality | Google·Facebook 로그인 시 Supabase에 기본 프로필 저장. Apple은 `requestedScopes = []` |
| 이메일 / `EmailAddress` | App Functionality | Supabase 소셜 인증 프로필 |
| 대략적인 위치 / `CoarseLocation` | Analytics | PostHog GeoIP 국가·지역·시간대. ADR-0029 D15의 서버 변환 설정 전제 |
| 기타 사용자 콘텐츠 / `OtherUserContent` | Analytics | `feedback-api.ts` → `submit_feedback`: 선택적 평점·의견·화면/에피소드 맥락 |
| 사용자 ID / `UserID` | App Functionality, Analytics | Supabase 계정별 저장 및 로그인 후 PostHog identify |
| 기기 ID / `DeviceID` | App Functionality | `push_devices`의 APNs 토큰과 사용자 연결 |
| 제품 상호작용 / `ProductInteraction` | App Functionality, Analytics | 서버 진행·학습 날짜·최근 접속 및 PostHog 화면/학습 이벤트 |

`NSPrivacyTracking = false`이며 각 수집 항목의 tracking도 false다. 광고 ID·광고 SDK는 사용하지 않는다. 음성은 기기가 지원하면 온디바이스, 아니면 Apple Speech 서버에서 처리하며 앱 서버/분석에는 음성이나 인식 원문을 보내지 않는다. Apple 프레임워크 자체 수집은 개발자가 공개할 책임이 없다는 [Apple 안내](https://developer.apple.com/app-store/app-privacy-details/)의 “Apple frameworks or services” 기준을 따른다. 온디바이스라고만 안내해서는 안 된다.

신고 화면의 7개 항목은 현재 공개 상태와 일치한다. 다만 신고 일치가 공개 처리방침의 완결성이나 운영 SaaS 설정을 증명하지는 않는다. 운영 PostHog 프로젝트 632540의 키가 Release 설정과 일치하는지 값 노출 없이 대조했다. `anonymize_ips = true`와 활성 GeoIP 변환 소스(국가·대륙·1단계 행정구역·시간대만 추가)를 MCP로 확인했다. 실제 `entry_screen_viewed` 속성 목록도 이 위치 항목들만 보고한다. 프로젝트의 replay/성능 수집 토글은 켜져 있지만 앱은 PostHogCore의 수동 이벤트만 쓰므로 웹 SDK 자동 수집 기능을 실행하지 않는다. 이번 검토에서는 운영 설정을 변경하지 않았다.

### 공개 개인정보처리방침에 반영할 문안

2026-10-01 공개 [DURU Privacy Policy](https://gregarious-pharaoh-bb6.notion.site/DURU-Privacy-Policy-3eb0c2540c01802cad91cc0430552402)를 확인했다. 소셜 인증·PostHog·Apple Speech 설명은 있으나 서버 학습 기록·피드백·APNs 토큰이 누락되어 있다. 아래 문안은 코드 근거로 준비했으며 **공개 페이지에는 아직 반영하지 않았다**. 게시 시 effective date도 갱신한다.

1. Section 1에 추가:

   > Learning progress and feedback. We store completed learning activities and the dates you learn, linked to your account, so you can resume learning and see your streak across sessions and devices. If you submit feedback, we store your rating, message, and the related screen or lesson to improve the App.
   >
   > Notifications. If you enable reminders, we store your Apple push notification token, its link to your account, and your last active time to send learning reminders.

2. “Information stored on your device”에 추가:

   > Learning progress and learning dates that could not be sent are stored on your device and retried when a connection is available. Signing out keeps these pending records for the same account; deleting your account clears them. Uninstalling the App removes pending records that have not reached our servers.

3. Section 2 목적에 추가:

   > To save and restore learning progress, calculate learning streaks, and send reminders when you enable them.

4. Section 3 Supabase 행을 다음 내용으로 확장:

   > Account and sign-in; learning progress and learning dates; feedback; notification registration. Account information, sign-in tokens, completed activities, learning dates, feedback, push tokens and last active time.

   Apple 행의 기능에 “push notification delivery”를 추가하고 정보에 “push notification token and reminder payload”를 추가한다. 기존 Apple Speech 설명은 유지한다.

5. Section 4에 추가:

   > Learning progress, learning dates, and feedback are kept until you delete your account. Notification registrations are deleted when you delete your account. Signing out requests removal of the current device registration and requires a working connection. Disabling notifications in iOS stops delivery but does not itself delete the server registration. Pending learning records on your device are cleared after successful sync or account deletion.

기존 “Usage information: up to 1 year”는 **PostHog analytics records**로 범위를 명확히 하여 학습 진행의 계정 보존과 구분해야 한다. 특히 [PostHog 공식 보존 안내](https://posthog.com/docs/data/events-retention)는 플랜의 조회 가능 기간이 자동 삭제를 뜻하지 않는다고 명시한다. 이번 MCP에는 보존 기간 조회 도구가 없고 웹은 로그인이 필요해 현재 플랜의 기간을 확정하지 못했다. **1년 후 삭제한다고 단정하는 문구는 사용하지 않는다.** 공개 문안 확정 전에 실제 보존·삭제 절차를 확인하거나 그 절차에 맞춰 기간을 수정해야 한다. 개인정보처리방침 변경 후 공개 URL을 로그아웃 상태에서도 읽을 수 있는지 확인한다.

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
- SDK manifest를 plist로 읽어 설치된 SDK 원본의 값 전체와 비교합니다.

검증 기록은 [SDK manifest 보고서](performance/reports/ios-sdk-privacy-manifest-archive-01.md)를
참조합니다. 최종 서명 Archive의 Privacy Report·App Store Connect 검증과 앱 전체의
운영 설정과 공개 개인정보처리방침 반영 확인은 별도로 수행해야 합니다.
