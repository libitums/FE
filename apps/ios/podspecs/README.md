# LynxService 4.0.1의 SDWebImage 호환 명세

CocoaPods 공식 배포 명세를 보관하고 Image 하위 명세의 SDWebImage 의존성만
`5.15.5`에서 `5.21.7`로 바꿨습니다. SDWebImage의 공식 PrivacyInfo.xcprivacy가
리소스 번들로 포함되는 버전을 쓰기 위한 앱의 호환 조정입니다.

- 원본: https://cdn.cocoapods.org/Specs/1/a/0/LynxService/4.0.1/LynxService.podspec.json
- 원본 SHA-256: `0f40dee834ad97f53e694e4bf26d9a42757be59efdef6ccc02f7c19b4be9bbc3`
- 라이선스: Apache-2.0, Lynx Authors. 동봉한 `LynxService-LICENSE`를 따릅니다.
- 변경한 필드: `subspecs[name=Image].dependencies.SDWebImage` 하나.
- 소스는 기존 공식 `LynxService-4.0.1.zip` 그대로 받고 소스 코드를 수정하지 않습니다.
- Lynx / LynxBase / LynxServiceAPI / XElement 4.0.1, PrimJS 4.0.0,
  SDWebImageWebPCoder 0.11.0 버전도 유지합니다.

Podfile은 `:podspec`으로 이 파일을 읽습니다. `Pods/`나 전역 CocoaPods 캐시를
수정하는 방식이 아니므로 새 checkout에서도 같은 의존성을 설치할 수 있습니다.
SDK manifest는 SDWebImage 배포본의 `SDWebImage.bundle/PrivacyInfo.xcprivacy`를 사용합니다.

LynxService를 올릴 때에는 공식 명세의 Image 의존성을 다시 확인합니다. 공식 명세로
manifest를 포함하는 SDWebImage 버전이 설치되면 로컬 명세를 제거하고 Podfile과 lock을
함께 바꿉니다. 이후 Release Archive 포함 검사와 이미지·캐시 네이티브 회귀를 실행합니다.
