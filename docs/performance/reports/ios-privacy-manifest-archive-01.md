# 앱 Privacy Manifest — iOS Release Archive — 01

## 실행 조건
- 측정 일시: 2026-09-30, Asia/Seoul.
- 상태: 미측정 — 개인정보 API 선언의 빌드 포함 여부를 검증하며 성능을 측정하지 않습니다.
- 대상 commit: b553b1d806e6a46a00ee8b348a19f0cf46743654 위 codex/ios-app-privacy-manifest 작업 트리. 선행 PR #192를 포함합니다.
- 기기: 개발용 Mac, iPhone 17 Pro 시뮬레이터 및 generic iOS 빌드 대상.
- OS: iOS Simulator 26.5 / iOS SDK 26.5, Xcode 26.6 (17F113).
- Lynx SDK: iOS Host 4.0.1, ReactLynx 0.125.0.
- 빌드: Host Release Archive (코드 서명 없음), Debug XCTest, Rspeedy production 번들. 회차 01.

## 시나리오
Host의 Copy Bundle Resources에 추가한 PrivacyInfo.xcprivacy가 Release Archive의
앱 루트에 포함되고 UserDefaults 사용 사유 CA92.1이 소스와 일치하는지 확인합니다.
기존 네이티브 테스트와 전체 저장소 검사도 실행합니다.

## 분석 결과
- StorageModule은 앱 전용 `libitum.` 키를 UserDefaults.standard에서 읽고 씁니다.
- required-reason API 선언과 Xcode 리소스 등록을 추가하며 런타임 코드나 UI를 바꾸지 않습니다.
- `xcodebuild archive` Release / generic iOS / 코드 서명 없음: 성공.
- Archive의 `Products/Applications/Host.app/PrivacyInfo.xcprivacy`를 plist로 읽어
  UserDefaults / CA92.1 항목과 소스 전체 값의 일치를 확인했습니다. `plutil -lint`도 통과했습니다.
- HostTests 전체 50건, 전체 `pnpm verify` 통과. 모바일 번들은 1,383,096 bytes로
  선행 PR #192와 동일하며 Archive 안의 JS 번들도 현재 production 결과와 바이트 단위로 같습니다.
- Archive에 들어간 manifest는 앱 루트 파일과 `MJRefresh.Privacy.bundle`의 파일입니다.
  SDWebImage의 선언은 없습니다. 앱 파일 추가로 이 SDK 누락이 해결되었다고 판정하지 않습니다.

## 해석
측정 한계: plist 문법·번들 포함 여부와 기능 회귀를 확인합니다. 성능 trace·메모리는
미측정이며 성능 기준선으로 사용할 수 없습니다. 서명·App Store Connect 업로드·심사
검증을 수행하지 않으며 App Privacy 공개 항목도 이 결과만으로 확정할 수 없습니다.

## 결론과 후속
앱 자체의 required-reason API 선언 누락을 수정합니다. 별도로 확인된 SDWebImage 5.15.5의
SDK manifest 누락과 LynxService/Image의 버전 제약은 다음 작업에서 해결해야 합니다.
선언 근거·Archive 검사 절차·남은 배포 조건은 `docs/ios-privacy.md`에 기록했습니다.
