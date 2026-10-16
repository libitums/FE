# Android 최소 호스트 확인

## 준비

Android SDK 35, JDK 17, Android 에뮬레이터와 `apps/android` Gradle 프로젝트를 준비한다.
`pnpm bundle:android` 뒤 `pnpm preview`로 빌드된 번들을 제공한다. 원격 서버를 쓰면 Debug 실행 인자
`--es bundle-url https://…/main.lynx.bundle`로 지정한다.

## 절차

| 항목 | 행동 | 통과 기준 |
|---|---|---|
| A1 | Debug APK를 열기 | Duru 첫 화면이 뜨고 미리보기 서버의 번들·이미지를 로드 |
| A2 | `pnpm bundle:android` 뒤 로컬 설치용 `bundled` APK 열기 | 네트워크 개발 서버 없이 첫 화면과 로컬 이미지가 뜸. [Maestro 흐름](../../e2e/android-host.yaml)으로 온보딩→로그인 화면도 검증 |
| A3 | 소셜 로그인으로 세션 저장 후 앱 완전 종료·재실행 | `StorageModule`에서 세션을 읽고 서버 갱신 뒤 로그인 유지 |
| A4 | 기기 시스템 글자 크기 변경 후 앱 재실행 | 글자 배율이 반영되고 핵심 조작이 가려지지 않음 |
| A5 | 소셜 버튼에서 인증 창을 열고 `duru://auth-callback`으로 복귀 | Android 브리지의 `completed` 콜백 뒤 PKCE 교환을 수행. [Maestro 절차](android-social-login.md) 참조 |
| A6 | 작은 화면에서 버튼 가림·진입 문구 대비·접근성 클릭 확인 | 고정 버튼과 소셜 수단을 조작할 수 있고, 안내 문구를 읽을 수 있음. Android 접근성 트리의 버튼 이름과 `ACTION_CLICK`을 확인 |
| A7 | 로그인 화면의 이용약관·개인정보처리방침 링크 열기 | 각 링크가 호스트에 고정된 HTTPS 문서를 Custom Tab으로 열고 뒤로가기로 로그인 화면에 복귀 |
| A8 | 시스템 뒤로가기(제스처·3버튼)를 층·쌓인 화면·탭 루트·여정 맵·번들 로드 전에서 누르기 | 층만 닫힘 → 화면의 닫기와 같음 → 여정 탭 → 앱을 떠남 순으로 동작하고, JS 준비 전에는 Activity가 끝남. 항목과 실행 결과는 [시스템 뒤로가기 절차](android-system-back.md)의 B1~B9가 진다 |
| A9 | 3버튼 · 제스처 내비게이션에서 탭 루트 · 화면 위 층 · 설문 시트의 하단 조작을 누르고, 앱을 켠 채 모드를 바꾸기 | 탭 알약과 하단 버튼이 시스템 바 위에 있어 눌리고, 3버튼의 탭 바 면은 화면 바닥까지 한 면이며, 제스처 모드 수치는 그대로이고, 모드 전환에 탭 바가 따라 바뀜(API 37에서는 설정 앱 방식의 전환에도 재생성 없이, API 30에서는 재생성을 거쳐 새 자리에 선다 — N9의 「정정의 정정」과 A12. 경계를 API 36으로 본 것은 추론이고 API 31 ~ 36은 재지 않았다). 항목과 실행 결과는 [내비게이션 바와 하단 탭 바 절차](android-navigation-insets.md)의 N1~N9가 진다 |
| A10 | `bundleRelease` AAB를 bundletool로 분할 설치해(Play 배포 형태) 효과음 · 대사 오디오 · 서사 배경 그림 확인 | 분할 APK에 대사 m4a 21 · 효과음 mp3 8이 무압축으로 있고, 효과음 8종과 대사가 플레이어를 실제로 시작하며, 서사 배경 그림이 단색이 아니라 그려지고 움직임. 항목과 실행 결과는 [효과음 · 대사 오디오 · 서사 배경 절차](android-assets.md)의 E1~E8이 진다 |
| A11 | `bundleRelease` AAB를 분할 설치해(Play 배포 형태) 출시 설정 확인 — 패키지 `libitum.duru.android` · `versionCode` 2 · `targetSdk` 36 · 16 KB 페이지 | 64비트 `.so`가 전부 16 KB 정렬이고 16 KB 에뮬레이터에서 호환성 대화상자가 뜨지 않으며, 새 패키지로 FCM 토큰 · 딥링크 콜백 · 앞선 항목(A8 ~ A10)이 그대로 동작. 항목과 실행 상태는 [출시 설정 절차](android-release-config.md)의 R1~R9가 진다 — **R6은 API 30 · 4 KB 에뮬레이터 하나에서만 실행(나머지 API 수준 · 실기 4 KB는 미확인) · R9(서명 · Play 업로드 · 실기)는 미실행** |
| A12 | 학습 화면 도중에 기기 회전 · 다크 모드 전환 · 화면 크기 변경 · 시스템 언어 변경 · 내비게이션 모드 전환 · 분할 화면 · 큰 화면 흉내의 가로 · 글꼴 크기와 디스플레이 크기 변경 | 휴대폰에서 세로가 유지되고, 다크 모드 · 크기 변경 · 시스템 언어 · 큰 화면 가로에서 Activity가 다시 만들어지지 않아 같은 문항 · 이어지는 소리 · 뒤로가기 확인창이 남으며 새 창을 채우고 시스템 바에 가리지 않음. 내비게이션 모드 전환은 API 36 이상에서 재생성 없이 탭 바가 새 자리로 가고 API 35 이하에서는 다시 서되 정상 화면이 선다(실측은 API 37과 API 30 — 경계 36은 SDK 속성의 등장 버전에서 온 추론). 분할 화면은 재생성 없이 세로 모양 영역을 채우고 가로 모양 영역에는 레터박스가 서며 그 안의 탭이 듣는다(받아들인 동작 — 낮은 창에서 아래 조작부가 잘려 닿지 못하는 것은 보장하지 않는 것이고 관찰로 적는다). 글꼴 크기 · 디스플레이 크기는 다시 서되 죽지 않고 로그인 세션이 남음. 항목과 실행 상태는 [화면 방향과 구성 변경 절차](android-orientation.md)의 O1~O12가 진다 — **API 31 ~ 35 · 실기는 미확인, O11(TalkBack 포커스)은 로그인 · 온보딩 화면에서만 확인, 큰 화면은 휴대폰 AVD의 흉내에서만 실행(플랫폼이 스스로 고정을 무시하는지는 미증명)** |
| A13 | 밝은 화면(여정 맵 · 설정 · 스플래시 · 대화상자의 스크림)과 어두운 화면(에피소드 표지 · 서사 · 최종 테스트 · 비주얼 노벨 · 지표 모달 · 첫 단원 안내)을 오가며 상태바의 시계 · 아이콘 색 보기 | 밝은 표면에서는 어두운 아이콘, 어두운 표면에서는 밝은 아이콘이 서고(창의 `apr=` 플래그와 무손실 캡처의 글리프 인접 배경 색 쌍 — 시계 4.5:1 · 아이콘 3:1), 층을 닫으면 아래 표면의 명암으로 돌아가며, 같은 명암끼리의 전환에서는 뒤집히지 않고, 야간 모드 · 복귀 · 재생성 뒤에도 표면의 명암이 맞음. 내비게이션 바는 바뀌지 않음. 전환 지연은 하드웨어 가속으로 뜬 기기에서만 판정한다(SwiftShader로 뜬 에뮬레이터에서는 「판정 불가(환경)」 — 통과가 아니다). 항목 · 도구 · 실행 상태는 [상태바 아이콘 명암 절차](android-status-bar-icons.md)의 S1~S14가 지고, 결정과 받아들인 대비(서사 채팅 위 안내 4.48:1 · 스크림 0.45 위 시계)는 [ADR-0050](../adr/0050-android-status-bar-icons.md)이 진다 — **`journey-entry`는 기기에서 닿지 못함, API 31 ~ 36의 어두운 아이콘 색 · 실기 · 호스트 GPU로 띄운 API 37의 지연은 미확인** |
| A14 | 작은 화면(320 × 640 · 폭 320 미만)과 글꼴 1.3 · 최대(2.0)에서 여정 맵 훑기 | 폭 320 이상 · 배율 2.0 이하에서는 두 열(라벨이 이웃과 닿지 않고 여백을 넘지 않음), 폭 320 미만이거나 배율이 2.0을 넘으면 한 열. 글꼴을 켠 채로 바꾸면 Activity가 다시 서는지는 계약이 비워 둔 관찰. 항목과 실행 상태는 아래 「A14 여정 맵 두 열 · 한 열 폴백」의 E-G3 · E-L4a ~ E-L4c · E-H1(JUnit)이 진다 — **2026-10-14 API 30 에뮬레이터 한 대에서 실행(에이전트 실행, 사람 미확인). 320 × 640 · 160 dpi 구성은 그 AVD에서 상태바가 비정상이라 밀도 540(320 × 693dp)으로 대신했고, 다른 API 수준 · 실기는 미확인** |

## 2026-10-01 실행 결과

API 35 ARM 에뮬레이터(320×640)에서 확인했다. `pnpm preview`가 3001 포트를 골라
Debug 실행 인자에 `http://10.0.2.2:3001/main.lynx.bundle`를 지정했다.

| 항목 | 결과 | 근거 |
|---|---|---|
| A1 | 통과 | [Debug 화면](evidence/android-debug-preview.png): 첫 화면·이미지 표시. Lynx 로그에서 `StorageModule.get` 호출 확인 |
| A2 | 통과 | [번들 포함 화면](evidence/android-bundled.png): 개발 서버 없이 첫 화면·로컬 이미지 표시. APK 안의 `assets/main.lynx.bundle`, `assets/static/` 확인 |
| A3 | 모의 인증 응답으로 재시작·갱신 통과, 실제 제공자 미검증 | 저장소 경계 테스트에 더해 실제 Lynx 화면에서 서로 다른 앱 프로세스의 두 차례 갱신·토큰 교체·여정 화면, 400 거부 시 세션 삭제·로그인 화면을 확인했다. 제공자 계정으로 로그인한 뒤 실제 서버에서 갱신하는 경로는 미실행 |
| A4 | 온보딩·로그인 화면 통과 | [첫 화면 130%](evidence/android-font-130.png), [로그인 100%](evidence/android-login-font-100.png), [로그인 130%](evidence/android-login-font-130.png): 320×640에서 온보딩 3단계를 지나 로그인에 도달했다. 130%에서 Facebook 문구와 로고가 겹치는 문제를 수정해 버튼 3개·약관 링크가 모두 보임. 로그인 뒤 화면은 미검증 |
| A5 | 브리지·모의 왕복 통과, 실제 제공자 로그인 미검증 | 순수 Java URL·콜백 검사와 API 35 계측 3건이 통과했다. 임시 `https://example.invalid` 설정의 번들에서 Apple 버튼을 누르면 `provider=apple`·PKCE challenge를 실은 브라우저가 열렸다. 모의 `duru://auth-callback?code=fake` 복귀 후 교환의 네트워크 오류 문구가 나타났고, 브라우저 뒤로 가기는 오류 없이 로그인 화면으로 돌아왔다. 실제 제공자 코드 교환은 남았다 |
| A6 | 작은 화면·문구 대비·접근성 노드와 클릭 통과, TalkBack 미검증 | 320×640·160 dpi에서 온보딩 카드가 `Next` 위에 그려지는 현상을 재현해 고정 버튼을 전면에 배치했다. 100%·130%에서 세 단계와 로그인 화면에 도달했다. 온보딩 안내·로그인 안내·약관 일반 문구를 `fg-neutral-muted`로 바꿔 배경 대비 약 6.53:1로 높였다. 온보딩·로그인 텍스트와 링크의 Android 접근성 노드 및 버튼·링크의 `ACTION_CLICK`을 계측했다 |

### 2026-10-02 법률 문서 링크 검증

API 35 에뮬레이터에서 `LegalDocumentModuleTest` 2건이 통과했다. 문서 이름 둘이 iOS
호스트와 동일한 HTTPS 주소로만 연결되고, 임의 URL·잘못된 타입은
`invalid-arguments`를 반환했다. bundled APK의
`E2E_UDID=<ID> pnpm test:e2e:android:legal`에서 약관·개인정보처리방침 링크가 각각
고정 Notion 주소의 Custom Tab을 열고 뒤로가기로 로그인 화면에 복귀했다. 설정 화면에서
같은 모듈을 호출하는 경로는 실제 로그인 계정 없이 별도 E2E를 실행하지 않았다.
모의 인증 설정의 bundled APK에서 집계 명령 `pnpm test:e2e:android`도 통과했다
(호스트 1·소셜 3·법률 문서 2·작은 화면 2회차).

### A2 Maestro 실행

커밋 `c8a47647`, 390×844·160 dpi API 35 전용 에뮬레이터, `bundled` APK,
Maestro 2.11.0에서
`E2E_UDID=<ID> pnpm test:e2e:android:host`가 통과했다. 흐름은 첫 화면의 대화 문구를
확인하고 온보딩 세 단계를 누른 뒤 로그인 화면 기준 이미지와 비교한다. 개발 서버를
켜지 않고 `bundled` APK를 설치해 실행했다. 처음에는 Android 접근성 트리에 첫
화면의 대화 문구만 잡히고 `Next`와 소셜 버튼 이름이 빠져 있어 화면 좌표로 눌렀다.
공통 `Button`에 `flatten={false}`를 적용한 뒤에는 이 이름들이 트리에 나타나고
Maestro가 이름으로 누른다. 화면 크기·글자 배율이 바뀌면 기준 이미지를 다시 확인한다.

### 2026-10-02 Debug 개발 서버와 HMR

Debug APK에 `LynxWebSocketModule`과 외부 변경분 파일 fetcher를 등록했다. API 35
에뮬레이터에서 `pnpm dev`가 출력한 `3001` 포트의 번들을
`--es bundle-url http://10.0.2.2:3001/main.lynx.bundle`로 열어 첫 온보딩 화면을
확인했다. WebSocket은 `/rsbuild-hmr`에 연결됐고, 화면 소스의 문구를 임시로 바꾼 뒤
앱을 재실행하지 않고 변경 문구가 나타났다. 원래 문구로 되돌렸을 때도 즉시 반영됐으며
Android 로그에 `Updated modules`와 `App is up to date`가 기록됐다. 임시 소스 변경은
작업 트리에 남기지 않았다. 서버가 선택한 포트를 실행 인자에 반영해야 한다.
Debug·bundled·release 변형을 빌드했고, 개발 브리지 클래스가 bundled/release APK에
포함되지 않은 것도 확인했다. bundled APK에서 Maestro 호스트 1건·작은 화면 2건,
모의 인증 번들에서 소셜 로그인 3건이 통과했다.

### A6 작은 화면·접근성 재현

`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:small`은 320×640·160 dpi에서
글자 배율 1.0과 1.3을 각각 설정한다. 첫째·둘째 온보딩의 고정 `Next`가 카드 위에
보이는 기준 이미지와 이름 선택자 탭, 마지막 단계 뒤 소셜 로그인 화면을 확인한다. 종료할 때
390×844·1.0으로 복원한다. 화면 기준 이미지는 `e2e/screenshots/android-small-*.png`다.

기존 Android `uiautomator dump`에서는 로그인 `Back`만 `content-desc`가 있었고
`Next`와 Apple·Google·Facebook 버튼 이름이 빠져 있었다. Button 표면에 접근성
속성을 중복하거나 Lynx의 기본 접근성 요소 설정을 켜도 달라지지 않았다. 공통
`Button` 루트에 `flatten={false}`를 적용하자 `Next`와 세 소셜 버튼의 `content-desc`가
나타났다. 390×844·320×640에서 Maestro 이름 선택으로 온보딩과 로그인 진입이 통과했다.
전용 에뮬레이터에는 TalkBack이 없어 실제 낭독과 순차 탐색 검증은 남아 있다.

### A6 접근성 클릭 재현

API 35 에뮬레이터에서 `UiAutomation`으로 `ACTION_CLICK`을 실행했다. 처음에는 버튼 이름만
보이고 `isClickable=false`였으며 `ACTION_CLICK`도 없었다. ReactLynx가 사용하는
Android View 기반 접근성 경로에서 Lynx의 `accessibility-enable-tap` 속성이 자동으로
클릭 동작으로 연결되지 않았다. 공통 `Button`·`RoundButton`은 활성 상태에만 이 속성을
설정하고, 최소 호스트의 `AccessibilityTapBridge`가 해당 View에 클릭 동작을 연결한다.
계측 테스트는 `Next`→`Back`→`Next`→`Next`→`Next`→`Get started`를 접근성 클릭만으로
실행한 뒤(⟨2026-10-13⟩ 온보딩 넷째 스텝 `Make it yours`를 비운 채 넘긴다 — 진행 문구는 `Step 1 of 4`) Apple·Google·Facebook 버튼의 `isClickable`과 `ACTION_CLICK`을 확인한다.
온보딩 진행 상태·제목·본문과 로그인 제목·설명·약관 문구·인증 실패 문구는 Lynx의
텍스트 평탄화를 해제해 Android 접근성 노드로 노출한다. 약관 링크 두 개는
`ACTION_CLICK`도 노출한다. 독립된 약관 텍스트 노드 사이의 시각적 간격은 CSS로 유지한다.
계측 테스트는 로그인 노드의 읽기 순서가 뒤로 가기→제목→설명→소셜 버튼 3개→약관
문구→이용약관→구분자→개인정보처리방침인지 확인한다. Android 접근성 노드의 순서만
검사했으며 TalkBack의 실제 음성 낭독·스와이프 초점 이동을 뜻하지 않는다.
2026-10-01 API 35 계측 1건과 Maestro 호스트 1건·소셜 3건·작은 화면 2건이 통과했다.
소셜 Maestro는 모의 콜백 후 인증 실패 문구가 접근성 노드에 나타날 때까지 기다린 뒤
오류 화면 이미지를 비교한다.
모의 인증 설정을 제거하고 재빌드한 APK에서도 호스트 Maestro가 다시 통과했다.

현재 전용 AOSP 에뮬레이터에는 TalkBack과 Google Play가 없다. 실제 TalkBack
검증에는 Google Play 시스템 이미지 또는 Android Accessibility Suite가 설치된 기기가
필요하다. Google Play 이미지를 설치하려는 SDK Manager가
`android-sdk-arm-dbt-license` 동의를 요구해 설치를 보류했다. 테스트 가능 환경이
준비되면 온보딩 각 단계와 로그인 화면에서 좌우 스와이프로 위 순서의 음성 낭독을 듣고,
두 약관 링크를 두 번 탭해 각각의 문서로 이동하는지 확인한다. Lynx의
`accessibility-traits="header"`만으로는 Android `isHeading()`이 켜지지 않아
온보딩·로그인 제목에 `accessibility-heading={true}`를 명시했다. API 35 계측에서
온보딩 세 제목과 로그인 제목의 `isHeading()`이 모두 참이었다. 실제 TalkBack의
제목 단위 탐색은 서비스가 설치된 환경에서 별도로 확인해야 한다. 이 변경 후
Maestro 호스트 1건·모의 소셜 로그인 3건·작은 화면 2건이 통과했고, 모의 설정을 제거한
최종 APK에서도 호스트·작은 화면 흐름이 통과했다.

Debug 앱을 로컬 미리보기 번들로 실행할 때 다음처럼 재현한다.

```sh
pnpm bundle:android
pnpm preview
cd apps/android
./gradlew assembleDebug assembleDebugAndroidTest
adb -s <전용 에뮬레이터 ID> install -r app/build/outputs/apk/debug/app-debug.apk
adb -s <전용 에뮬레이터 ID> install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s <전용 에뮬레이터 ID> shell am instrument -w \
  -e class com.libitum.host.ButtonAccessibilityTest \
  -e bundleUrl http://10.0.2.2:<preview 포트>/main.lynx.bundle \
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner
```

이 계측은 **`-e bundleUrl`과 TalkBack 켬**이 둘 다 있어야 통과한다. 하나라도 빠지면 `… accessibility node missing`으로 실패한다 —
전제 · TalkBack을 켜고 되돌리는 명령 · 2026-10-05 결과는 [Android TalkBack 검증](android-talkback.md#계측-buttonaccessibilitytest의-전제와-실행)에 있다.

### A3 저장소 경계 재현

에뮬레이터를 켜고 `apps/android/test-storage-restart.sh`를 실행한다. 스크립트는
Debug 앱과 계측 APK를 설치하고 세 테스트를 각각 다른 계측 프로세스에서 실행한다.
저장과 삭제 사이, 삭제와 재조회 사이에 앱을 강제 종료한다. 테스트 값은 가짜 토큰이며
인증 서버를 호출하지 않는다.

처음에는 세션 키도 `SharedPreferences.Editor.apply()`로 기록했다. 저장 직후 같은
프로세스의 조회는 통과했지만, 프로세스 종료 후 재조회는 `null`이었고 디스크에
저장 파일도 없었다. 세션 키의 저장·삭제에 `commit()`을 사용한 뒤 세 테스트가
모두 통과했다. 다른 저장 키는 `apply()`를 유지한다.

모바일 JS의 기존 IA7·IA8·IA9 통합 테스트도 통과했다. 이 테스트들은 저장된 세션의
재실행 후 토큰 갱신 성공, 갱신 거절 시 삭제, 네트워크 오류 시 보존을 각각 확인한다.
추가로 API 35 에뮬레이터에서 `E2E_UDID=<ID> sh apps/android/test-session-resume.sh`의
계측 4건을 통과했다. 스크립트는 테스트용 HTTPS 설정을 번들에 주입하고 Lynx HTTP
서비스를 계측 프로세스 안에서 모의한다. 세션을 저장한 뒤 앱을 강제 종료하고 새
프로세스에서 refresh 요청 본문의 토큰, 저장된 새 토큰과 여정 화면을 확인한다. 다시
강제 종료·재실행해 두 번째 토큰 교체를 확인하고, 마지막 재시작에서는 400 응답에 따라
저장 세션이 삭제되고 소셜 로그인 화면이 표시되는지 확인한다. 실제 서버나 제공자
계정은 쓰지 않는다. 스크립트가 앱 데이터를 지우므로 전용 에뮬레이터에서 실행하고,
일반 번들이 필요하면 완료 후 `pnpm bundle:android`를 다시 실행한다.
초기 심사 버전은 소셜 로그인만 사용하며 `productPhoneSignIn = "hidden"`이다. Android
`WebAuthenticationModule`을 추가했고 Apple도 이 호스트에서는 웹 OAuth로 로그인한다.
실제 A3 기기 검증에는 Supabase·Apple·Google·Facebook 제공자 설정과 테스트 계정이 필요하다.

### A5 인증 창 재현

`sh apps/android/test-web-auth-contract.sh`를 실행해 HTTPS authorize URL과 등록된
콜백만 받는지 확인한다. 에뮬레이터에 Debug 앱과 계측 APK를 설치하고
`adb shell am instrument -w -e class com.libitum.host.WebAuthenticationModuleTest,com.libitum.host.WebAuthenticationFlowTest
libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner`를 실행한다. 계측은 난수,
잘못된 요청, Custom Tab 시작 뒤 모의 딥링크의 `completed` 콜백을 확인한다. 실제
제공자 창의 복귀와 코드 교환은 설정·계정이 준비되면 세 버튼 각각에서 수동 확인한다.
임시 `PUBLIC_SUPABASE_URL=https://example.invalid`와 테스트용 anon key로 번들을 빌드해
Apple 버튼의 브라우저 시작·뒤로 취소·모의 딥링크 복귀도 살폈다. `fake` 코드는 실제
서버 코드가 아니므로 교환이 `network`로 끝나는 것까지만 확인했다. 테스트 뒤 임시
설정이 없는 번들로 다시 빌드했다.
Maestro 소셜 흐름은 모의 딥링크 복귀 후 로딩 표시가 끝나기를 기다린 다음 오류 화면
이미지를 비교한다. 네트워크 종료 전에 이미지를 찍으면 로딩 표시가 남아 비교가 흔들린다.

### A4 글자 크기 재현

API 35 ARM 에뮬레이터를 320×640 세로 화면으로 맞추고 시스템 `font_scale`을
`1.0`, `1.3`으로 각각 설정했다. `bundled` APK를 재실행한 뒤 온보딩의 `Next`를
두 번, `Get started`를 한 번 눌러 로그인 화면을 비교했다. 130%에서 Facebook
버튼 글자가 로고와 겹치는 문제를 관찰해 글자 영역의 좌우 여백을 늘렸다. 수정 후
문구가 두 줄로 접히고 세 버튼과 약관 링크가 화면 안에 남았다. 전화번호 수단은
현재 제품에서 숨겨져 있어 이 화면 검증에 포함되지 않는다.

### A14 여정 맵 두 열 · 한 열 폴백 (journey-map-grid, 2026-10-14)

여정 맵의 일반 유닛이 두 열로 서고, 화면 폭이 320 미만이거나 글자 배율이 2.0을 넘으면 한 열로 떨어진다. 호스트는 `MainActivity`가 `onCreate`와 `onConfigurationChanged`에서
`fontScale` · `viewportWidth`(= `widthPixels / density`, dp)를 globalProps로 보낸다. 판정 · 자동 스크롤 · 낭독 순서 등 전체 절차는
[여정 맵 e2e](journey-map.md) 「두 열 배치 · 한 열 폴백 · 다음 유닛으로 자동 스크롤」이 지고, 이 절은 **Android 화면 크기 · 글꼴에서만 닫히는 셋**(E-G3 · E-L4 · E-H1의 JUnit 쪽)을 맡는다.
번들만이 아니라 **호스트(APK)도 새로 빌드한다** — 번들만 새로 만들면 호스트가 두 값을 보내지 않아 값 없음(두 열)으로만 읽힌다.

준비: 작은 화면은 `devtools/android-maestro/run-small-screen.sh`의 설정(`adb shell wm size 320x640` · `adb shell wm density 160`). **시작 전 `wm size` · `wm density` ·
`settings get system font_scale`을 기록하고 끝에 되돌린다**(`null`이면 `delete`). 설정을 바꾼 뒤 앱을 다시 실행해 맵으로 간다. 기록은 위 A6 · A4 재현과 같은 방식으로 캡처한다
(`adb exec-out screencap -p > docs/e2e/evidence/journey-map-grid-android-<id>-<n>.png`).

| id | 조건 | 단계 | 관찰(통과 조건) | AC |
|---|---|---|---|---|
| E-G3 | 320 × 640 · 160 dpi · `font_scale` 1.0, 그다음 1.3 · 진행 있는 계정 | 1. 각 배율로 설정하고 앱을 다시 실행한다. 2. 튜토리얼 · 카탈로그 구획을 훑는다 | **두 열**이다(경계 — 폭 320은 두 열). 라벨이 이웃 라벨과 닿지 않고 화면 여백을 넘지 않는다. **`Asking for directions`의 줄 수를 기록한다**(기기 글꼴이 목업과 다르다 — design E2). 두 표식의 위 모서리가 한 선이다 | 9 |
| E-L4a | 폭 320 미만 — `adb shell wm size 300x640`(밀도 160) · `font_scale` 1.0 | 1. 설정하고 앱을 다시 실행한다. 2. 맵을 훑는다 | **한 열**(줄마다 유닛 하나). 글자가 칸을 넘지 않는다. 유닛 순서는 두 열일 때와 같다 | 9 |
| E-L4b | 글꼴 최대 — `adb shell settings put system font_scale 2.0`(설정 앱의 최대 값과 같게 맞춘다) · 폭 320 이상(예: 390 × 844 · 320 × 640) | 1. 설정하고 앱을 다시 실행한다. 2. 맵을 훑는다 | **2.0 이하라 두 열이다**(정확히 2.0은 두 열). 라벨이 두 줄로 접히고 이웃과 닿지 않는다. 기기의 실제 배율이 2.0을 넘는지(넘으면 한 열이어야 한다)를 비고에 적는다 | 9 |
| E-L4c | 앱을 **켠 채로** 글꼴을 바꾼다 — `adb shell settings put system font_scale 1.3` 뒤 앱으로 돌아온다 | 1. 맵에 선 채로 글꼴 값을 바꾼다. 2. 앱으로 돌아온다. 3. 화면 · 글자 · 배치를 본다 | 계약이 확인한 것은 `configChanges`에 `fontScale`이 없다는 데까지다(M-10) — **Activity가 실제로 다시 서는지는 계약이 비워 두었다.** 관찰 칸은 비워 둔다. 다시 선다면(앱이 맵 처음으로 돌아오는가) 새 글자 배율과 배치가 **함께** 맞는지를 있는 그대로 적는다 | 9 |
| E-H1(JUnit) | `cd apps/android && ./gradlew testDebugUnitTest --tests '*ViewportMetricsTest'` | 실행한다 | HA1(`globalProps(1.3f, 1080, 2.625f)`의 폭이 `1080 / 2.625`) · HA2(`density ≤ 0` · `NaN` 배율은 키가 없고 던지지 않는다) · HA3(같은 입력 두 번이 `equals`)가 통과한다. **`pnpm verify` 밖이다 — 사람이 돌리고 여기에 적는다.** iOS의 XCTest는 [여정 맵 e2e](journey-map.md)의 E-H1이 진다 | 9 |

#### 실행 기록

| id | 결과 | 비고(설정 · 측정값 · 증거 파일) |
|---|---|---|
| E-G3 | 통과(대체 구성) | **조건이 절차와 다르다.** 320 × 640 · 160 dpi(`run-small-screen.sh` 구성)는 이 AVD에서 상태바 영역이 비정상으로 커서(앱 높이 약 436dp) 대표성이 없어 참고로만 남겼다(1.0 · 1.3 · 2.0 모두 두 열이었고, 낮은 높이 탓에 자동 스크롤의 한계선이 이겨 1.0에서 간격 1dp, 1.3에서 대상이 카드에 19dp, 2.0에서 통째로 카드 뒤). 대신 **`wm density 540`(320 × 693dp)**: 1.0 · 1.3 모두 **두 열**, 라벨이 이웃과 닿지 않고, 대상과 카드 간격 24.0dp. `Asking for directions` 줄 수 **1.0 / 1.3: 1줄 / 2줄**. 폭 경계는 `wm size 880x2340`(320dp)이 두 열, `877x2340`(319dp)이 한 열. 증거 `e2e-android-18-*` · `-19-*` · `-20-*` · `-21-*` |
| E-L4a | 통과 | 조건이 절차와 다르다 — `wm size 825x2340`(밀도 440 그대로, 300dp) · 1.0, 앱을 켠 채로 바꿨다. **한 열**, 겹침 없음, Activity 재생성 없이 곧바로 갱신(`screenSize`가 `configChanges`에 있다). 재확인에서도 같음. 증거 `e2e-android-17-width300-live.png` · `e2e-fix2-android-r-width300.png` |
| E-L4b | 통과 | 392dp · 2.0과 320 × 693dp · 2.0 모두 **두 열**, 라벨끼리 겹치지 않음. 기기의 실제 배율: globalProps `fontScale` **2**(number) — 설정 최대 2.0을 넘지 않았다. adb로만 넣을 수 있는 2.5에서는 **한 열**(`fontScale` 2.5). ⚠ 320 × 693dp · 2.0에서 자동 스크롤 대상이 카드에 11 ~ 12dp 걸리고 대상 라벨 둘째 줄이 바텀 내비 뒤에 선다 — [여정 맵 e2e](journey-map.md) E-D2, 보류(머리 카드 재설계). 증거 `e2e-android-15-font2.0-live.png` · `-16-font2.5-live.png` · `-21-…-font2.0.png` |
| E-L4c | 기록 | 맵에 선 채로 `font_scale`을 바꾸면 **Activity가 다시 선다**(새 `MainActivity` 인스턴스 `CREATED → RESUMED`, M-10 닫힘). 새 배율이 number로 실리고 글자와 배치가 **함께** 맞는다(2.0 두 열 · 2.5 한 열). 다시 서면서 맵이 새로 마운트되어 자동 스크롤이 한 번 더 돈다 |
| E-H1(JUnit) | 통과 | `./gradlew :app:testDebugUnitTest` 82건 실패 0, `ViewportMetricsTest` 3 / 3(HA1 · HA2 · HA3) — 1회차, 재확인은 `--rerun`으로 같은 결과(그사이 `apps/android` 변경 없음) |

| 기기 · API · 빌드 SHA(호스트 · 번들) | 확인자 · 날짜 | 설정 복원 확인 |
|---|---|---|
| AVD `R6_API30`(API 30, google_apis arm64, 1080 × 2340 · 440 dpi) · 1회차 `ed04cc37` · 재확인 `7298de16`(Debug APK + 로컬 HTTP 번들 — 계측 픽스처로 로그인 · 진행을 심음, 임시 변경은 되돌림) | 에이전트 실행, 사람 미확인 · 2026-10-14 | `font_scale` 1.0 · `wm size reset` · `wm density reset` · 애니메이션 배율 셋 1 확인, 앱 · 테스트 APK 제거(두 회차 모두) |
