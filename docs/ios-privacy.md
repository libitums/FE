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

이 파일의 범위는 **Host의 required-reason API**입니다. 데이터 수집을 하지 않는다는
선언이 아니며, `NSPrivacyCollectedDataTypes`를 빈 배열로 선언하지 않습니다.
계정·학습 진행 저장과 실제 배포 설정에서 켜는 분석 기능의 데이터 수집 항목은 별도로
감사하여 App Store Connect의 App Privacy 응답 및 manifest 수집 항목과 맞춰야 합니다.
SDK 선언도 앱의 `CA92.1` 항목으로 대신할 수 없습니다.

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
데이터 수집 공개 항목 감사는 별도로 수행해야 합니다.
