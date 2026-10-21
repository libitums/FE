# 튜토리얼 u00 — 새 설치 오프라인 · Episode 1의 문 · 옛 사용자 · 롤플레이 회귀

결정은 [ADR-0079](../adr/0079-tutorial-as-catalog-episode.md)가 진다. 자동 테스트(unit · ui · integration)는 내장 본문 · 그림 표와 우선순위 · 문 규칙 · 옛 기록 스냅숏 · 첫 유닛 안내 · 티켓 비용 · Airbridge 매핑을 지키지만,
**실제 기기 네트워크 차단에서 번들 `/static` 그림이 서는지(iOS 리소스 · Android 재작성) · 실행 사이 저장소 시드(옛 사용자) · VoiceOver 안내 낭독 · 큰 글꼴 배치**는 기기에서만 판정한다.

⚠ **아직 실행하지 않았다**(2026-10-21) — 사용자 폰(iPhone 13 mini)에 `915a4e58` 빌드를 설치해 사용자가 보는 중이고, 시뮬레이터 회차는 로그인 대기다. 아래는 절차만이다.

## 준비

- iPhone 17 Pro 시뮬레이터 · `pnpm bundle:host` 뒤 Debug 호스트 + `--bundle-url=main.lynx`(다른 작업 트리의 3000 포트를 피한다).
- 판정: 화면 녹화 프레임 · 스크린숏 · Accessibility Inspector · 앱 컨테이너의 저장소(`defaults export`) · 콘텐츠 폴더.
- iOS `StorageModule`은 `UserDefaults.standard`에 키 앞 `libitum.`을 **하나 더** 붙여 쓴다 — 진행 캐시는 `libitum.libitum.progress.cached.<사용자>`다.
- 앱 컨테이너: `xcrun simctl get_app_container booted com.libitum.host data`(아래 `<data>`).
- ⚠ **u00의 `S2`(듣기 고르기) · `S7`(듣고 조립)은 빈 레슨이다** — 학습 문항 음성이 아직 연결되지 않아 그 단계의 문항 하나가 `audio-missing`으로 건너뛰어진다(ADR-0079 D12, 후속 `feat/audio-slow-playback`). 아래 판정은 그 둘을 「열리고 끝남으로 바뀐다」까지만 본다.
- u00은 티켓을 쓰지 않는다(ADR-0079 D8) — EU-2는 티켓 대기 없이 끝까지 간다.

## 흐름

| id | 조건 · 절차 | 판정 |
|---|---|---|
| EU-0 | 회귀: 기존 설치(옛 앱 진행 있음 — EU-4 시드) 위에 이 빌드를 덮어 실행 | 스플래시 → 맵, 크래시 0 |
| EU-1 | **새 설치 · 오프라인**: 앱 지움 → 기기 네트워크 끔(macOS Wi-Fi 끔 또는 Network Link Conditioner 100% loss) → 설치 · 실행 · 온보딩 · 진입 | 맵 첫 구획 `Episode 0.` · 띠 제목 `Tutorial`, 노드 = 표지 + 레슨 11 + `Culture` 둘(S12 · S13) + `Final test`. 표지 컷 그림 6장 · S3 그림(hello) · S5 그림(thanks) · S12 문화 카드 앞면 · RP 배경 · 마무리 그림이 **모두 보임**, 빈 회색 면 0. 소리는 없다(음성은 받지 못함) |
| EU-2 | EU-1 그대로 u00을 끝까지 | 레슨 말풍선에 티켓 태그 없음 · 티켓 수 그대로. `RP` 통과 전에는 Episode 1 표지를 눌러도 반응 없음, 통과 뒤 열림 |
| EU-3 | 첫 유닛 안내: EU-1의 첫 맵 | 가림막 · u00 표지 들림 · 표지 아래 말풍선 「Tap to start your lesson!」(`first-unit-map-tooltip`) · 표지(또는 말풍선) 탭 → 안내 닫힘 · 표지 화면. VoiceOver: 말풍선 · 표지만 읽힘. 말풍선 자리 래퍼 `.catalog-map-section-cover`의 배치가 겹치지 않는지(계약의 「새 CSS 규칙 0」에서 벗어난 자리) |
| EU-4 | **옛 사용자 시드**: 앱 종료 → `xcrun simctl spawn booted defaults export com.libitum.host - > prefs.plist` → 진행 캐시 키에 `completedEpisodeFinalIds`가 `tutorial-final-test`를 담은 스냅숏 v1 · 로그인 세션 시드 → `defaults import` → 실행 | Episode 1 표지 열림 · u00은 처음 상태(표지 열림 · 레슨 잠김) · 첫 유닛 안내 없음 · 맵이 Episode 1 쪽으로 스크롤 · 트로피 1 |
| EU-5 | 롤플레이 탭 | u00 구획 없음 · u01 ~ 이야기 롤플레이가 열림(미리보기 → 컷 → 대화). 메신저 · 전화 · 비주얼 노벨 항목 없음 |
| EU-6 | 온라인 복귀 뒤 재실행 | 내장 그림 받기 0(Proxyman · `<data>/Library/Application Support/content-files/images/u00-tutorial`이 생기지 않음). u00 음성 12개는 받는다(`content-files/audio/u00-tutorial/…`) |
| EU-7 | 큰 글꼴(접근성 크기 최대) | 맵 한 열 배치 · u00 노드 15 겹침 0 |
| EU-8 | Android 에뮬레이터(가능하면 — `ANDROID_HOME` · 전용 에뮬레이터) | EU-1 · EU-2 · EU-5 같은 판정. 그림은 `/static` → `asset:///` 재작성([ADR-0051](../adr/0051-android-image-url-redirect.md)) |

## 호스트 테스트 — `pnpm verify` 밖

| id | 대상 | 단언 |
|---|---|---|
| HA1 | `apps/android/app/src/androidTest/java/com/libitum/host/AudioPlaybackModuleTest.java` | 목록이 남은 셋(`greeting-1` · `ordering-2` · `tutorial-cabin-announcement`)이고 전부 재생 · 나머지 테스트 그대로(에뮬레이터 `connectedAndroidTest`) |
| HA2 | iOS HostTests | 변경 0 — 고정물 셋이 남아 그대로 통과(`xcodebuild test`) |

## Android Maestro 흐름 셋

완료 낭독([android-completion-announcement](android-completion-announcement.md)) · 앱 리뷰([android-app-review](android-app-review.md)) · 말하기 권한([android-speech-recognition](android-speech-recognition.md))은 옛 튜토리얼 좌표를 쓴다 — u00 경로(완료 낭독 = u00 레슨 · 앱 리뷰 = u00 완료 설문 · 말하기 권한 = u00 `S5`)로 고치는 일은 e2e 단계에 남았다(사용자 결정 Q5). 고치기 전까지 그 흐름은 깨진 상태다.

## 결과

- 아직 없다.
