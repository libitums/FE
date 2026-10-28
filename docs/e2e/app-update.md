# 앱 버전 표시 · 강제 업데이트 — 기기 확인

결정은 [ADR-0086](../adr/0086-app-version-and-forced-update.md)이 진다. 자동 테스트(unit · ui · integration)는 판정 · 저장 · 화면 · 호스트 접점 호출을 지키지만,
**호스트가 실제로 보내는 버전 값 · 설정 줄의 모양 · 스토어 앱이 실제로 열리는지 · 뒤로가기 · VoiceOver/TalkBack 낭독**은 기기에서만 판정한다.

## 준비

- iOS: iPhone 시뮬레이터 또는 실기 · Debug 호스트 + `--bundle-url=main.lynx`. Android: 에뮬레이터 · `bundled` 변형.
- **테스트 버킷**이 있으면 그것을 쓴다(`PUBLIC_SUPABASE_URL`을 테스트 프로젝트로). 실서버 버킷에 정책을 올리면 **모든 사용자**에게 적용된다 — 실서버에는 올리지 않는다.
- 정책 파일: `{ "schema": "app-policy-1", "min_build": { "android": 999 } }`(막음) · `{ "android": 1 }`(안 막음) · iOS는 `ios` 키로 같은 식. cacheControl 60초.
- 판정: 화면 캡처 · Accessibility Inspector / TalkBack · 저장소(`libitum.libitum.app-policy` — iOS `UserDefaults`는 키 앞에 `libitum.`을 하나 더 붙인다).

| # | 조작 | 기대 | 환경 | 결과 |
|---|---|---|---|---|
| AU1 | 정책 없이(404) 앱을 켜고 `Settings` 탭 끝까지 스크롤 | 목록 마지막에 `Version 1.0 (11)`(iOS) / `Version 0.1.0 (6)`(Android) — 값은 그 빌드의 `MARKETING_VERSION`·`CURRENT_PROJECT_VERSION` / `versionName`·`versionCode`와 같다. 눌러도 아무 일 없음 | 시뮬레이터 · 에뮬레이터 | 미실행 |
| AU2 | 막는 정책을 올리고 **앱을 완전히 종료한 뒤** 다시 켠다 | 로고 뒤 `Update Duru to continue` 화면(`update-required-screen-title`). 바텀 바 · 맵 없음. 저장소에 정책 원문 | 시뮬레이터 · 에뮬레이터 · 네트워크 | 미실행 |
| AU3 | AU2 화면에서 `Update`를 누른다 | Android: Play 앱의 이 앱 페이지(Play 없는 에뮬레이터면 브라우저). iOS: Apple App ID가 채워진 빌드면 App Store, 아니면 버튼 **위** `Couldn't open the store…` 문구 | 실기 권장 | 미실행 |
| AU4 | AU2 화면에서 Android 뒤로가기 | 앱이 뒤로 물러나 홈이 보인다(진입 구간 기본값 `leave` — 호스트 `moveTaskToBack`). 다시 열면 같은 화면 | 에뮬레이터 | 미실행 |
| AU5 | 비행기 모드로 앱을 켠다(AU2 뒤) | 저장본으로 여전히 막힌다 | 시뮬레이터 · 에뮬레이터 | 미실행 |
| AU6 | 정책을 지우고(404) 온라인으로 켠다 | 스플래시 뒤 평소대로 맵. 저장소의 정책 키 없음 | 시뮬레이터 · 에뮬레이터 | 미실행 |
| AU7 | AU2 화면을 VoiceOver/TalkBack으로 훑는다 | `Update Duru to continue, heading` → 본문 → `Update, button`. `Update`를 누른 뒤 못 열면 실패 문구가 한 번 낭독되고, 다시 훑으면 본문 → `Couldn't open the store…` → `Update, button` 순이다. 설정 줄은 `Version 1.0 (11)`로 읽히고 button이 아니다 | 실기 · 사람만 | 미실행 |
| AU8 | 최대 글자 배율(AX5)에서 AU2 화면 | 제목 · 본문 · 버튼이 모두 보이고 버튼이 화면 밖으로 밀리지 않는다 | 시뮬레이터 | 미실행 |

## 실행 기록

- 2026-10-27: 절차만 작성. 기기 실행 없음 — 자동 unit/ui/integration · Android JVM 호스트 테스트 결과를 기기 결과로 대신하지 않는다.
