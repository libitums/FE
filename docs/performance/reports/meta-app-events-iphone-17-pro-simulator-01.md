# Meta 앱 이벤트 SDK — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 · 앱 시작 시간 캡처(`performance:capture`)를 돌리지 않았습니다. 번들 크기와
  호스트 앱 용량만 재었습니다. 이 변경에는 화면이 없고, 값이 없는 빌드에서 런타임에 더해진 것은 동적 프레임워크
  셋의 로드(iOS)와 설정 판정 한 번뿐입니다.
- 기능 PR: Meta 앱 이벤트 SDK 설치 — iOS `FBSDKCoreKit` 18.1.1 · Android `facebook-core` 18.3.0, 호스트 모듈
  `MetaAppEventsModule`, JS 매핑 · sink 합성(이 보고서와 같은 PR). 결정은 `docs/adr/0057-meta-app-events.md`.
- 대상 commit: 브랜치 `sehyun0518/meta-sdk`의 `bc9d7185`(main `fa00ee33` 위)
- 기기: iPhone 17 Pro 시뮬레이터 — 앱 용량을 잰 Release 빌드의 대상이고, 값 없는 빌드를 실행해 뜨는 것까지
  보았습니다(성능 캡처는 아닙니다). Android 수치는 기기와 무관한 `bundled` APK 파일의 크기입니다.
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: 번들 크기는 `pnpm build`의 `main.lynx.bundle`(Node 22.23.2). iOS는 값 파일 없는 Release 시뮬레이터 빌드의
  `Host.app`, Android는 값 파일 없는 `./gradlew :app:assembleBundled`(R8)의 `app-bundled.apk`입니다.
- 측정 일시: 2026-10-13

## 시나리오

- 번들 크기: 이 브랜치를 빌드해 `apps/mobile/dist/main.lynx.bundle` 크기를 직전 기록
  (`episode-catalog-map-iphone-17-pro-simulator-01.md`의 1,720,937 bytes)과 비교하고 `pnpm size:check`를 돌렸습니다.
- 스레드 경계 확인: 산출 번들에서 문자열 `MetaAppEventsModule`의 등장 횟수를 셌습니다.
- iOS 앱 용량: 이 변경의 호스트 수정을 넣기 전과 넣은 뒤의 Release 시뮬레이터 `Host.app` 크기, 그리고 `Frameworks` 안의 새
  프레임워크 셋의 크기를 재었습니다.
- Android 앱 용량: 변경 후 `app-bundled.apk`의 크기를 재었습니다. 변경 전 값은 재지 않았습니다.
- 화면 확인: 없음 — 이 PR은 화면을 바꾸지 않습니다.

## 이 변경이 무엇을 건드렸나

- JS: 새 모듈 셋(`lib/meta-events.contract.ts` 타입 · `lib/meta-events.ts` 순수 매핑과 sink 합성 ·
  `lib/meta-app-events-module.ts` `background-only`)과 진입점 `app/index.tsx`의 결선 한 줄. 새 npm 의존성은 없습니다.
- iOS 호스트: pod `FBSDKCoreKit` 18.1.1과 전이 `FBSDKCoreKit_Basics` · `FBAEMKit`(미리 빌드된 동적 xcframework 셋),
  Swift 파일 둘, `Info.plist` 키, 프라이버시 매니페스트의 목적 둘.
- Android 호스트: `facebook-core` 18.3.0과 전이 의존, Java 파일 넷, 매니페스트의 권한 한 줄 · provider 제거 ·
  메타데이터 둘. 네이티브 `.so`는 더해지지 않았습니다.
- 새 이미지 · 음원은 없습니다.

## 분석 결과

| 항목 | 값 |
| --- | --- |
| `main.lynx.bundle` 직전 기록 | 1,720,937 bytes |
| `main.lynx.bundle` 이 브랜치 | 1,721,929 bytes |
| 차 | +992 bytes (+0.06 %) |
| 상한(`devtools/bundle-size/budget.json`) | 1,722,000 bytes — 수정하지 않음. 여유 71 bytes |
| iOS Release 시뮬레이터 `Host.app` 변경 전 | 53,260 KB |
| iOS Release 시뮬레이터 `Host.app` 변경 후 | 63,064 KB |
| 차 | +9,804 KB |
| 그중 `FBSDKCoreKit.framework` | 8,128 KB |
| 그중 `FBAEMKit.framework` | 1,160 KB |
| 그중 `FBSDKCoreKit_Basics.framework` | 316 KB |
| 그중 호스트 바이너리 | +200 KB |
| Android `app-bundled.apk` 변경 후 | 58,432,327 bytes |
| Android `app-bundled.apk` 변경 전 | 재지 않음 — 증감을 모릅니다 |

- 상한: `size:check`는 통과합니다. 상한을 넘지 않았으므로 올리지 않았습니다. 다만 여유가 71 bytes뿐이라 JS를
  조금이라도 더하는 다음 변경은 상한을 다시 올려야 할 것으로 보입니다.
- 스레드 경계: 문자열 `MetaAppEventsModule`은 번들에 1회 나옵니다. 번들이 바이너리 형식이라 그 한 번이 어느 스레드
  구간에 있는지는 가르지 못했습니다. 메인 스레드에 새지 않았다는 근거는 `background-only`를 첫 줄에 둔 모듈을 낀
  빌드가 성공했다는 것입니다(메인 스레드 그래프가 닿으면 빌드가 실패합니다).
- iOS 증가분 9,804 KB 가운데 프레임워크 셋이 9,604 KB입니다. 값이 없는 빌드에도 그대로 실립니다.

## 결론과 후속

- JS 번들의 증가는 작고(+992 bytes) 상한 안입니다. 그러나 여유 71 bytes는 CI 빌드 변동에도 걸릴 수 있는 크기라,
  상한을 미리 올릴지는 사용자 확인 항목으로 남겼습니다(`docs/adr/0057-meta-app-events.md` 「사용자 확인 필요」 9).
- iOS 앱이 시뮬레이터 Release 기준 약 9.8 MB 커졌습니다. 기기용 App Store 슬라이스에서의 증가분은 Archive를 만들어
  다시 잽니다.
- 동적 프레임워크 셋이 앱 시작에 주는 영향(dyld 로드 시간)과 값이 있는 빌드에서 SDK 초기화가 첫 화면까지의 시간에
  주는 영향은 재지 않았습니다. 실제 값을 넣어 수신을 확인하는 때에 `performance:capture`로 변경 전후를 잽니다.
- Android는 변경 전 APK를 같은 조건으로 빌드해 크기 증감과 다운로드 크기(AAB 기준)를 잽니다.

## 제한 사항

- 단일 빌드 1회라 빌드 간 변동은 보지 못했습니다. 번들의 직전 값은 앞선 보고서의 기록을 그대로 썼고 같은 세션에서
  다시 빌드하지 않았습니다.
- iOS 수치는 시뮬레이터 슬라이스의 디렉터리 크기입니다. 기기에 설치되는 크기나 App Store 다운로드 크기로 일반화할
  수 없습니다.
- Android는 변경 전 값이 없어 증감을 말할 수 없습니다. `bundled` APK는 ABI 넷을 다 싣는 로컬 검증용 산출물이라
  Play에서 받는 크기와 다릅니다.
- 렌더링 · 메모리 · 앱 시작 시간 · SDK 초기화 시간은 미측정입니다. 이 기록은 baseline이 아니며 성능 통과를 뜻하지
  않습니다.
