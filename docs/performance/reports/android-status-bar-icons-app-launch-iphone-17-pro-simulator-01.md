# Android 상태바 아이콘 표지 추가 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-10-06T08:01:22Z
- 상태: 측정 — Release Simulator Host를 새 시뮬레이터에 새로 설치해 성능 캡처 모드로 실행하고, 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했습니다.
- 기능 PR: 어두운 윗면을 가진 화면의 루트에 `data-statusbar` 표지를 달아 Android 호스트가 상태바 아이콘 색을 맞추게 한
  변경(이 보고서와 같은 PR, 작업 id `android-status-bar-appearance`)
- 대상 commit: `f6aae70e22807fddee636a379bf1c5f0d8c47bc8`
- 기기: iPhone 17 Pro 시뮬레이터(이 측정을 위해 새로 만든 기기, 측정 뒤 삭제)
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값(`pod install --deployment`)
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장 `main.lynx.bundle`(1,389,146 bytes);
  `--performance-capture --bundle-url=main.lynx`로 실행. Xcode 26.6(17F113)
- 실행 회차: 01
- 측정 뒤의 변경: 대상 commit 뒤에 `apps/mobile/src`에서 테스트가 아닌 파일 둘이 한 번 더 바뀌었습니다(`6b3110c3` — 연속 학습
  모달의 장식 운석 하나를 상태바 아래로 내림). `screens/journey-map/JourneyStatModal.tsx`에 한 줄이 더해졌고(운석 c에만 인라인
  `top`을 safe area inset 값으로 줌), `screens/journey-map/journey-stat-modal.css`에서 그 운석의 `top: -17px` 선언 한 줄이 빠지고
  주석이 바뀌었습니다. 같은 구간의 나머지 `apps/mobile/src` 변경은 ui 테스트 파일 하나뿐이고(`git diff --stat f6aae70e HEAD --
  apps/mobile/src`의 세 파일), `apps/ios` · `packages` · lockfile 변경은 없습니다. 바뀐 코드는 로그인 뒤 탭 루트에서 연속 학습 칩을
  눌러야 서는 모달 안에서만 그려집니다 — 이 시나리오(로그인 전 초기 로드 → 온보딩 첫 스텝)의 관찰 구간에서는 그 모달이 그려지지
  않습니다. 번들에 실리는 것은 CSS 선언 한 줄이 빠지고 인라인 `style` 하나가 드는 것입니다. **그 commit으로는 다시 재지
  않았습니다.** 작업 기록은 그 변경 뒤의 번들을 1389.3 kB로 적고 있으나 이 기록이 직접 확인한 값이 아닙니다. 이 변경으로
  iOS에서도 그 운석의 자리가 바뀝니다(공유 JS · CSS) — 「iOS에서 사용자가 보는 동작은 바뀌지 않습니다」는 아래 서술은 대상
  commit까지의 것입니다.

## 시나리오

- 전제: 새로 만든 시뮬레이터에 앱을 새로 설치했습니다(직전 설치본을 `simctl uninstall`로 지운 뒤). 저장된 로그인 세션이 없어
  스플래시가 끝나면 온보딩 첫 스텝으로 갑니다.
- 단계: `pnpm bundle:host` → `pod install --deployment` → Release Host 빌드 → 설치 → 성능 캡처 모드로
  실행하고 조작하지 않습니다. 9초 뒤 캡처 파일을 `performance:report` 분석기로 읽고 Host를 종료합니다.
  `performance:capture:smoke`가 하는 순서와 같고, 그 명령은 수치를 출력하지 않아 같은 단계를 손으로 밟았습니다.
- 이 회차의 자리: 시뮬레이터 부팅 뒤 **세 번째 실행**입니다. 앞의 둘은 준비 실행 하나(대상 commit)와 직전 commit 번들의
  실행 하나이고, 이 회차는 [전후 5회차씩 비교](android-status-bar-icons-ab-app-launch-iphone-17-pro-simulator-05runs.md)의
  첫째 묶음 대상 commit 01회차와 같은 실행입니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot입니다. 이 회차의 9초 뒤
  스크린샷은 눈으로 확인하지 않았습니다(같은 묶음의 대상 commit 05회차 스크린샷이 온보딩 첫 스텝인 것은 확인했습니다).

⚠ **이 시나리오는 표지가 달린 요소를 하나도 그리지 않습니다.** 로그인 전 초기 로드가 그리는 것은 스플래시와 온보딩이고
둘 다 표지 대상이 아닙니다(`SplashScreen.tsx` · `OnboardingScreen.tsx`에 `data-statusbar`가 없습니다). 표지가 달린 여덟 곳은
모두 로그인 뒤에 닿습니다 — 가장 이른 `JourneyEntryScreen`도 로그인 → 언어 선택의 `다음` 뒤에 쌓입니다
(`entry-wiring.ts`의 `onContinueLanguageSelect`). 시뮬레이터에서 로그인을 지날 수단이 없어 그 화면들은 실행되지 않았습니다.
이 캡처가 지나는 것은 이 변경이 **번들에 더한 바이트를 읽어 들이는 비용**뿐이고, 표지 속성을 요소에 싣는 비용은 이 기록
밖입니다.

## 이 변경이 무엇을 건드렸나

Android 호스트가 화면 트리에서 `data-statusbar="light-icons"` 표지를 찾아 상태바 아이콘을 밝게 · 어둡게 바꿉니다. 공유
JS에서 테스트를 빼고 바뀐 것은 아홉 파일입니다.

- `apps/mobile/src/lib/status-bar-icons.ts`(신규): 문자열 상수 하나(`lightStatusBarIcons = "light-icons"`)와 그 타입입니다.
  로직이 없습니다.
- 컴포넌트 여덟 파일: 위 상수의 import 한 줄과 요소 하나에 `data-statusbar={lightStatusBarIcons}` 속성 한 줄씩입니다.
  루트 요소에 단 것이 일곱(`EpisodeIntroScreen` · `EpisodeNarrativeScreen` · `EpisodeFinalScreen` · `VisualNovelScreen` ·
  `JourneyEntryScreen` · `JourneyStatModal` · `FirstUnitGuide`), 안내 스크림 요소에 단 것이 하나(`JourneyMapScreen`의
  `first-unit-map-scrim`)입니다. 훅 · 효과 · 상태 · 이벤트 리스너는 더해지지 않았습니다.

iOS 호스트는 이 속성을 읽지 않습니다(`apps/ios/Host` · `apps/ios/HostTests`에 dataset 키 `statusbar`를 읽는 코드가 없습니다). iOS에서
사용자가 보는 동작은 바뀌지 않습니다. 두 commit 사이에 `apps/ios`와 lockfile 변경은 없습니다. 번들이 달라졌으므로
영향 시나리오로 **앱 실행(초기 로드)** 을 쟀습니다 — 다만 위 ⚠대로 이 시나리오는 바뀐 컴포넌트를 그리지 않습니다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 52.453 ms, fcp 53.161 ms
  LoadBundle loadBundle: loadBundle 22.676 ms, parse 6.757 ms,
    loadBackground 23.365 ms, pipeline 52.464 ms, mtsRender 8.48 ms,
    resolve 1.771 ms, layout 0.158 ms,
    paintingUiOperationExecute 3.439 ms, layoutUiOperationExecute 0.341 ms

Memory
  after-initial-load [complete]: totalBytes 2086848 bytes,
    elementBytes 6240 bytes, viewBytes 3072 bytes,
    mainThreadRuntimeBytes 2077536 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 49006848 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 1 ms
```

캡처 레코드는 둘(Rendering entry 하나 · Memory snapshot 하나)이고 분석기는 종료 코드 0으로 끝났습니다.

## 비교

- 이 파일은 회차 하나만 담습니다. 이 변경 직전 commit(`84759d5c`)과의 비교는 같은 시뮬레이터에서 두 commit의 번들을 번갈아
  잰 [전후 5회차씩 비교](android-status-bar-icons-ab-app-launch-iphone-17-pro-simulator-05runs.md)에 있습니다.
  거기서 번들은 1,388,505 → 1,389,146 bytes(+641 bytes), `mainThreadRuntimeBytes`는 직전 2,075,360 bytes → 대상
  2,077,536 bytes(+2,176 bytes, 통계에 넣은 회차 안에서는 두 쪽 모두 흔들리지 않음)였습니다. 초기 `pipeline`의 평균 차이는
  첫째 묶음에서 +2.769 ms, 순서를 뒤집은 둘째 묶음에서 −3.736 ms로 부호가 뒤집혔습니다.
- 이 회차의 `pipeline` 52.464 ms는 그 비교의 첫째 묶음에서 대상 commit 5회차 중 가장 큰 값입니다. 이 한 회차를 대표값으로
  읽지 않습니다.
- 같은 날 앞서 잰 다른 변경의 기록(초기 `pipeline` 31 ~ 41 ms대)보다 이번 세션의 값이 전반적으로 큽니다. 다른 세션 · 다른
  시뮬레이터 · 다른 commit이고, 이번 측정 중 같은 머신에서 다른 작업(다른 워크트리의 dev 서버 등)이 함께 돌고 있었으며
  이를 통제하지 않았습니다. 세션 사이의 값을 나란히 놓아 방향을 읽지 않습니다.

## 해석

이 실행에서 초기 `pipeline`은 52.464 ms, `parse`는 6.757 ms였고 element node는 6개(스플래시)였습니다. 첫 paint 직후
memory query는 Lynx 귀속 2,086,848 bytes를 반환했고 그중 main thread runtime이 2,077,536 bytes입니다.

**단일 실행이라 이 기록만으로는 이 변경이 초기 로드를 느리게 했는지 · 메모리를 늘렸는지 판정할 수 없습니다.** 렌더 시간은
같은 번들에서도 회차 사이에 8 ~ 31 ms 폭으로 흔들렸으므로 한 회차의 `pipeline` 값은 방향을 말하지 않습니다.

측정 한계는 다음과 같습니다.

- **표지가 달린 화면의 렌더는 재지 않았습니다.** 여덟 곳 모두 로그인 뒤 경로에 있고 이 시나리오는 거기에 닿지 않습니다.
  속성 하나를 요소에 싣는 비용, 그 화면들의 첫 렌더 시간 · 메모리는 이 기록에 없습니다.
- **Android 호스트의 비용은 재지 않았습니다.** 표지를 실제로 읽는 것은 Android 호스트이고(화면 트리를 걸어 dataset을
  읽습니다), 그 비용은 iOS 수집기의 범위 밖입니다. 작업 기록에는 Android 계측 테스트가 잰 값(여정 맵, 170 ~ 171 노드에서
  200회 평균 12 ~ 83 µs)이 있으나 **이 보고서가 잰 값이 아니고 iOS의 값도 아닙니다.**
- background 스레드 쪽은 이 캡처에 잡히지 않습니다. snapshot의 `backgroundThreadRuntimeBytes`는 0 bytes로 보고됐습니다(이
  수집기가 이 시점에 background runtime 메모리를 돌려주지 않습니다).

수치의 분산, 실제 기기 체감, Android에서의 결과(이 변경이 실제로 동작하는 플랫폼입니다), 다른 iOS · 기기에서의 결과를
일반화하지 않으며 성능 통과 · 개선 · 회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace 미수집입니다.
- fluency: 해당 없음 — 이 시나리오에 스크롤 · 전환이 없습니다.
- memory: `after-initial-load` 하나뿐입니다. 표지가 달린 화면을 연 뒤의 snapshot은 없습니다.
- NativeModule: 이 변경은 공유 JS에서 NativeModule을 더하지 않았습니다. Android 호스트가 트리를 걷는 비용은 iOS 수집기의
  범위 밖이고 이 기록에서 재지 않았습니다.

## 결론과 후속

- 결론: 상태바 아이콘 표지가 들어간 대상 commit에서 iOS 초기 load를 한 회차 수집했습니다(초기 `pipeline`
  52.464 ms · `mainThreadRuntimeBytes` 2,077,536 bytes). 이 시나리오는 표지가 달린 요소를 그리지 않아 번들 증가분의 영향만
  지나며, 그 영향도 이 한 회차로는 판정되지 않습니다. 직전 commit과의 비교는 별도 기록에 있습니다.
- 후속: 표지가 달린 화면(여정 입장 · 에피소드 표지 · 서사 · 최종 테스트 · 비주얼 노벨 · 통계 모달 · 첫 유닛 안내)의 렌더는
  로그인 뒤 경로를 시뮬레이터에서 지날 수단이 생긴 뒤에 봅니다. Android 호스트 쪽 비용은 Android 수집 경로가 생긴 뒤에
  봅니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
