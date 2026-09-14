# iOS 홈 화면에 표시되는 Duru 서비스명 확인

전제: iOS 17.4 이상 시뮬레이터 또는 기기와 Xcode가 준비되어 있고, 자체 Host 앱의
Release 빌드를 확인한다. 이 절차는 자동화하지 않는 수동 E2E 흐름이다.

단계:

1. 저장소 루트에서 `xcodebuild -workspace apps/ios/Host.xcworkspace -scheme Host -configuration Release -sdk iphonesimulator -derivedDataPath /tmp/duru-service-name build`로 Release 앱을 빌드한다.
2. 시뮬레이터를 부팅하고 `xcrun simctl install booted /tmp/duru-service-name/Build/Products/Release-iphonesimulator/Host.app`으로 설치한다.
3. 설치된 번들의 메타데이터를 `plutil -p /tmp/duru-service-name/Build/Products/Release-iphonesimulator/Host.app/Info.plist`로 확인한다.
4. `xcrun simctl launch booted com.libitum.host`로 기존 bundle identifier를 사용해 앱을 실행한다.
5. 홈 화면으로 나가 앱 아이콘 아래 표시된 라벨을 확인하고, 필요하면 App Library에서도 같은 앱을 확인한다.

관찰:

- 빌드된 `Info.plist`의 `CFBundleDisplayName` 값이 정확히 `Duru`다.
- `plutil` 출력의 `CFBundleIdentifier`가 `com.libitum.host`이고, `xcrun simctl launch`가 해당 앱을 성공적으로 실행한다.
- 홈 화면/App Library에서 사용자에게 보이는 라벨이 정확히 `Duru`이며 `Host`, `duru` 또는 다른 문자열이 아니다.
- 설치·실행에 사용한 기술 식별자는 계속 `com.libitum.host`이며, 서비스명 변경으로 바뀌지 않는다.

실패 시 기록: 대상 OS 버전, 빌드 경로, `plutil`의 `CFBundleDisplayName`/`CFBundleIdentifier`
출력, 그리고 홈 화면에 실제로 보인 라벨을 함께 남긴다. `/tmp/duru-service-name`은 이
검증 산출물용 임시 경로이므로 기존 제품 파일을 덮어쓰지 않는다.
