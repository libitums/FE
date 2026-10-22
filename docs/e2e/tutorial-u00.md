# 튜토리얼 u00 — 새 설치 오프라인 · Episode 1의 문 · 옛 사용자 · 롤플레이 회귀

결정은 [ADR-0079](../adr/0079-tutorial-as-catalog-episode.md)가 진다. 자동 테스트(unit · ui · integration)는 내장 본문 · 그림 표와 우선순위 · 문 규칙 · 옛 기록 스냅숏 · 첫 유닛 안내 · 티켓 비용 · Airbridge 매핑을 지키지만,
**실제 기기 네트워크 차단에서 번들 `/static` 그림이 서는지(iOS 리소스 · Android 재작성) · 실행 사이 저장소 시드(옛 사용자) · VoiceOver 안내 낭독 · 큰 글꼴 배치**는 기기에서만 판정한다.

⚠ **실제 앱 흐름으로는 아직 돌리지 못했다** — 시뮬레이터 앱은 소셜 로그인만 되어 진입할 수 없다. 2026-10-22에 개발 전용 플레이그라운드 회차(1차, 아래 「결과」)로 화면 판정을 먼저 했고, 사용자가 이 PR의 기기 확인을 그 부분 회차로 받아들였다(2026-10-22, [ADR-0079](../adr/0079-tutorial-as-catalog-episode.md) 머리). 제품 번들 오프라인 `/static` 그림(iOS 리소스 · Android 재작성) · 실제 로그인 · 저장소 시드 옛 사용자 · 서버 동기화 · 음성 12개 받기와 그림 받기 0 · 티켓 수 · Android(EU-8) · VoiceOver 실제 낭독은 후속 회차에 남았다.

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

완료 낭독([android-completion-announcement](android-completion-announcement.md)) · 앱 리뷰([android-app-review](android-app-review.md)) · 말하기 권한([android-speech-recognition](android-speech-recognition.md))은 옛 튜토리얼 좌표를 쓴다 — u00 경로(완료 낭독 = u00 레슨 · 앱 리뷰 = u00 완료 설문 · 말하기 권한 = u00 `S5`)로 고친다(사용자 결정 Q5). 고치는 일은 2026-10-22 사용자 결정으로 **이 PR이 아니라 후속 작업**이 맡는다. 고치기 전까지 그 흐름은 깨진 상태다.

## 결과

### 1차 — 2026-10-22, 플레이그라운드 회차(iPhone 13 mini 시뮬레이터, iOS 26.5, `3658bfd8`)

방법: 시뮬레이터 앱이 소셜 로그인만 되어 실제 흐름에 들어갈 수 없어, `apps/mobile/src/playground`에 임시 화면(커밋하지 않고 회차 뒤 되돌림)을 두고 `rspeedy dev`의 `playground.lynx.bundle`을 Debug 호스트에 띄웠다.
임시 화면은 **실제 결선**을 쓴다 — `catalogWiring`(표지 · 레슨 · 최종 테스트 결선) · `navReducer` · `renderScreen` · `FirstUnitGuideProvider` · `shellInsetsOf` · 호스트가 넘긴 안전 영역. 콘텐츠는 내장 카탈로그(`bundledCatalogInput`)뿐이고 그림 주소는 **내장 그림 표만** 쓴다(원격 · 받아 둔 파일 없음).
빠진 것: 서버 진행 불러오기 · 저장, 티켓 원장(`withLearningTickets` — 남은 수는 고정값), 음성, 전역 머리 칩, 이벤트 전송(콘솔로만 받음).
탭은 `idb ui tap --duration 0.15`로 했다 — 길이 없는 탭은 ui-lynx `Button`에 닿지 않았고, 화면 아래 약 720 pt 밑의 탭은 시스템 제스처 영역에 먹혔다(도구 · 시뮬레이터 쪽 사정이라 결함으로 보지 않았다).

| id | 결과 | 근거 · 남은 것 |
|---|---|---|
| EU-0 | 미실행 | 옛 진행이 있는 실제 설치 위에 덮어 실행해야 한다 — 로그인 필요 |
| EU-1 | **부분 통과** | u00 노드 15(표지 + 레슨 11 + `Culture` 둘 + `Final test`) · 노드 이름 `Episode 0. …` · 말풍선 띠 `Episode 0, unit 01` / `Tutorial` / `1 / 15`. 내장 그림이 모두 섬 — 표지 배경 · 컷 6장 · S3 `hello` · S5 `thanks` · S12 문화 카드 앞면 · 최종 테스트 배경 · 마무리 컷 4장, 빈 회색 면 0. **네트워크 차단 · 제품 번들의 `/static`(iOS 리소스)은 보지 못했다** — 개발 서버가 그림을 HTTP로 내줬다. `rp-end.webp`는 내장돼 있지만 그리는 화면이 없다(콘텐츠 `closing_image_url`을 읽는 코드 없음) |
| EU-2 | **부분 통과** | 표지 → 컷 6 → 「Episode start!」 → S1 ~ S13 → 최종 테스트 3턴 → 결과 → 마무리 컷 4 → 「Episode clear!」 → 맵까지 끝까지 감. `RP` 전 Episode 1 표지를 눌러도 반응 없음(잠김), 통과 뒤 열림. S2 · S7은 빈 레슨이라 열자마자 결과(「PERFECT LESSON!」)로 바뀜. 레슨 말풍선에 티켓 태그 없음. **티켓 수 그대로는 판정하지 못했다** — 임시 화면에 티켓 원장이 없다(결과 화면의 「5 tickets left」는 고정값) |
| EU-3 | **통과**(VoiceOver 낭독은 접근성 트리로 대신) | 가림막 · 표지 들림 · 표지 아래 말풍선 「Tap to start your lesson!」. 안내 중 접근성 트리에 **말풍선과 표지 둘만** 남음. 표지 탭 → 안내 닫힘 · 표지 화면. 표지 노드 자리가 안내 유무와 같음(y 399) — 래퍼 `.catalog-map-section-cover`가 배치를 밀지 않음. 말풍선은 가림막 위에서 레슨 1 · 2 노드에 겹쳐 선다(안내 중이라 노드는 가려짐) |
| EU-4 | **부분 통과** | 옛 튜토리얼 통과(`legacyTutorialPassed = true`)를 결선에 직접 넣음 — Episode 1 표지 열림 · u00 표지 열림 · 레슨 잠김 · 안내 없음 · 맵이 Episode 1 쪽으로 스크롤. **저장소 시드(`defaults import`) · 스냅숏 읽기 · 트로피 1은 보지 못했다** — 로그인 필요, 트로피는 임시 화면에 없음 |
| EU-5 | **부분 통과** | 롤플레이 탭: u00 구획 없음, Episode 1 ~ 3 구획 · 메신저 · 전화 · 비주얼 노벨 항목 없음. u01 미완료라 모두 잠김 — 미리보기 → 컷 → 대화는 열어 보지 못했다 |
| EU-6 | 미실행 | 받기 루프 · 버킷 · 앱 컨테이너가 필요하다 — 임시 화면은 받기를 돌리지 않는다 |
| EU-7 | **통과** | 접근성 크기 최대(`content_size accessibility-extra-extra-extra-large`)에서 맵 한 열, u00 노드 15의 틀이 서로 겹치지 않음(접근성 트리 좌표로 셈) |
| EU-8 | 미실행 | Android 에뮬레이터 회차는 하지 않았다 — 사용자 결정(2026-10-22)으로 후속 회차 |

관찰(이 PR 밖, 후속): 단어 선택의 제시문에 빈칸이 없으면(S9 · S10 · S13) 한국어 · 로마자 줄의 접근성 라벨이 빈 값으로 잡힌다(`WordChoicePresentation`이 `accessibility-label={undefined}`를 넘김 — 이 브랜치에서 바뀌지 않은 파일). VoiceOver가 그 줄을 읽는지는 기기에서 확인해야 한다.

성능 기록: [tutorial-u00-iphone-13-mini-simulator-01](../performance/reports/tutorial-u00-iphone-13-mini-simulator-01.md).
