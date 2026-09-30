# SDWebImage Privacy Manifest — iOS Release Archive — 01

## 실행 조건
- 측정 일시: 2026-09-30, Asia/Seoul.
- 상태: 미측정 — SDK 배포 선언과 이미지 기능 호환성을 검증하며 성능을 측정하지 않습니다.
- 대상 commit: 1accb496ef81c2fae529b69f017e4143b9b51411 위 codex/ios-sdk-privacy-manifest 작업 트리. 선행 PR #193을 포함합니다.
- 기기: 개발용 Mac, iPhone 17 Pro 시뮬레이터 및 generic iOS 빌드 대상.
- OS: iOS Simulator 26.5 / iOS SDK 26.5, Xcode 26.6 (17F113).
- Lynx SDK: iOS Host 4.0.1, ReactLynx 0.125.0. SDWebImage 5.21.7.
- 빌드: Host Release Archive (코드 서명 없음), Debug XCTest, Rspeedy production 번들. 회차 01.

## 시나리오
공식 manifest가 없는 SDWebImage 5.15.5를 5.21.7로 올립니다. LynxService의 공식 4.0.1
명세에서 Image의 SDWebImage 제약만 바꾸고 Lynx 런타임·서비스 소스는 유지합니다.
실제 번들 이미지와 캐시를 등록된 Lynx 서비스로 읽고, Release Archive에 SDK 원본의
manifest가 포함되는지 확인합니다.

## 분석 결과
- 공식 LynxService podspec과 로컬 명세의 차이는 SDWebImage 의존성 한 필드입니다.
  설치 전후 LynxService의 소스·헤더 8개는 바이트 단위로 동일합니다.
- `pod install --deployment --no-repo-update` 통과. HostTests의 CocoaPods 타깃 선언을
  추가해 재설치 후에도 Debug·Release 헤더 검색 경로가 자동으로 연결됩니다.
- 잠긴 의존성 재설치를 한 번 더 실행해 Podfile.lock과 Xcode 프로젝트가 바이트 단위로
  그대로 유지되는 것을 확인했습니다.
- HostTests 전체 54건 통과. 새 4건은 등록된 Lynx 서비스의 PNG·JPEG 로딩, 실제 앱
  WebP의 다중 프레임 재생·일시 정지·재개, 원본 파일과 메모리를 지운 후 디스크 캐시
  재로딩을 확인합니다. 네트워크나 테스트 전용 이미지 로더로 대체하지 않습니다.
- 코드 서명 없는 generic iOS Release Archive 성공. 앱 루트·SDWebImage.bundle·
  MJRefresh.Privacy.bundle에 manifest 3개가 포함됩니다. 모두 plutil 문법 검사를 통과하고,
  앱과 SDWebImage의 plist 값 전체가 각각 소스와 일치합니다.
- SDWebImage SDK 원본은 FileTimestamp / C617.1을 선언합니다.
- Archive의 표시 이름 Duru, 번들 ID com.libitum.host, 실행 파일 Host, 최소 iOS 17.4를
  확인했습니다. CocoaPods가 선택적 따옴표를 제거해도 메타데이터 테스트는 같은 값을 검증합니다.
- 전체 `pnpm verify` 통과. 모바일 production 번들은 1,383,096 bytes로 선행 PR과
  동일하며 Archive 안의 JS 번들도 현재 production 산출물과 바이트 단위로 같습니다.

## 해석
검증 한계: 기능 호환성·plist 문법·번들 포함 여부를 확인합니다. 성능 trace·메모리는
미측정이며 성능 기준선으로 사용할 수 없습니다. 실제 기기의 화면 품질·네트워크 조건별
원격 이미지 로딩은 확인하지 않습니다. 코드 서명·App Store Connect 업로드·심사 검증을
수행하지 않으며, 앱의 개인정보 수집 공개 항목을 이 SDK 선언만으로 확정할 수 없습니다.

## 결론과 후속
SDWebImage가 제공하는 공식 선언을 사용하며, 새 SDK에 맞춰 앱의 선언을 임의로 복제하지
않습니다. 최종 서명 Archive의 Privacy Report와 App Store Connect 검증 및 App Privacy
공개 항목 감사가 남아 있습니다. 공식 LynxService 명세가 manifest 제공 버전을 허용하면
로컬 podspec을 제거하고 이미지·캐시 회귀와 Archive 검사를 다시 실행합니다.

## main 통합 재검증
- 검증 일시: 2026-10-01, Asia/Seoul. 선행 PR #187–#193의 리뷰 수정을 포함해 전체 `pnpm verify`와 iPhone 17 Pro / iOS Simulator 26.5의 HostTests 54건이 통과했습니다.
- `pod install --deployment --no-repo-update` 후 Podfile.lock과 Xcode 프로젝트의 SHA-256이 그대로 유지되었습니다. 현재 production 번들과 Host에 복사된 번들도 바이트 단위로 일치합니다.
- 현재 모바일 번들은 1,402,356 bytes로 1,403,000 bytes 상한 이내입니다. SDK 선언과 이미지 서비스 변경은 최초 Archive 검증 이후 바꾸지 않았습니다.
- 최종 서명 Archive·App Store Connect·수집 공개 감사와 성능 수치는 미측정이며 기존 해석의 한계를 유지합니다.
