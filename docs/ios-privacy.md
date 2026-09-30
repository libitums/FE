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

## 남은 배포 차단 항목 — SDK manifest

2026-09-30의 `Podfile.lock`·설치된 Pods·서명 없는 Release Archive를 확인한 결과:

- `SDWebImage 5.15.5`에는 `PrivacyInfo.xcprivacy`가 없습니다.
- `LynxService/Image 4.0.1`이 `SDWebImage = 5.15.5`를 요구하므로 앱 Podfile에서
  SDWebImage 버전만 올리면 의존성이 충돌합니다.
- SDWebImage는 [Apple의 manifest 필수 SDK 목록](https://developer.apple.com/support/third-party-SDK-requirements/)에 포함됩니다.
- `MJRefresh 3.7.9`의 자체 manifest는 Archive의 `MJRefresh.Privacy.bundle`에 포함됩니다.
- 같은 Archive에 SDWebImage용 manifest는 포함되지 않았습니다.

**이번 Host 선언 추가만으로 SDK 요구사항은 해결되지 않습니다.** 다음 작업에서
Lynx 이미지 서비스의 버전 제약과 SDK 제공 manifest를 함께 해결하고 이미지 로딩·캐시
동작을 검증해야 합니다. SDK 업그레이드나 포장 방식 변경은 별도 PR로 처리합니다.
