# 수동 e2e — 마이크 사전 안내 · 거부 시트 · 인식 실패 (ADR-0206)

시스템 권한 창 · 설정 앱 왕복은 테스트 러너가 띄울 수 없어 기기에서 본다. integration(`App.mic-permission` IMP1 ~ IMP3 ·
`App.roleplay-story` IR5 · IR5b · IR5c · IR7)은 호스트 모듈 대역으로 같은 흐름을 이미 본다 — 여기서는 **실제 시스템 창 · 설정 앱 · 돌아옴**과 시트의 모양을 본다.

## 준비

- 앱 설정에서 소리를 끈다(Settings 탭 → 소리).
- 권한 미요청 만들기: iOS 시뮬레이터 `xcrun simctl privacy <udid> reset microphone com.libitum.host`(+ `reset speech-recognition`), Android 앱 데이터를 지우거나
  새로 설치. 사전 안내 「본 적 있음」을 지우려면 앱 데이터도 지운다(기기 키 `libitum.mic-primer-seen`).
- 거부 만들기: Android `adb shell pm revoke com.libitum.host android.permission.RECORD_AUDIO` + 앱이 한 번 물었던 기록(시스템 창에서 거부) — 새 설치에서
  사전 안내 → Allow → Don't allow가 가장 쉽다. iOS는 시스템 창에서 「허용 안 함」.
- 말하기 문항이 있는 레슨(예: Episode 1 · S6 낱말 말하기)과 롤플레이(Episode 1 끝낸 계정)를 준비한다.

| id | 확인 | 기대 |
|---|---|---|
| MP-E1 | 미요청 · 새 설치로 말하기 문항이 있는 레슨에 들어가 첫 말하기 활동이 선다 | 아래에서 시트 — 「Time to speak Korean」 · 「Duru listens to your voice … Your voice isn't saved.」 · Allow microphone(주황) · Not now — skip speaking(회색) |
| MP-E2 | Allow microphone | 시스템 마이크 창(iOS는 이어서 음성 인식 창) → 허용 → 시트 닫힘, 마이크를 눌러 말할 수 있음 |
| MP-E3 | (새 설치) Allow → 시스템 창에서 거부 | 「Microphone is off」 시트 — Open Settings(주황) · Continue without speaking(회색) |
| MP-E4 | Open Settings | 이 앱의 설정 화면(iOS 설정 › Duru · Android 앱 정보) |
| MP-E5 | 설정에서 마이크를 켜고 돌아온다 | Android: 시트가 닫히고 그 문항을 말할 수 있음. iOS: 앱이 다시 뜨면(권한 변경) 레슨을 다시 열어 시트 없이 말할 수 있음 |
| MP-E6 | 거부 상태에서 Continue without speaking | 이 활동의 남은 문항을 건너뛰고 다음 활동(또는 결과)으로 — 같은 레슨의 뒤 말하기 활동도 시트 없이 넘어감 |
| MP-E7 | 말하기 중 마이크 입력 실패(또는 못 알아들음) | 「Something went wrong while listening. Try again.」(못 알아들음은 「I didn't catch that …」) · Try again(주) · Skip(보조). 두 번 실패하면 「Hear it」 |
| MP-E8 | 롤플레이 미리보기 Start(미요청 · 처음) | 사전 안내 → Allow → 시스템 창 → 허용이면 표지 컷. Not now면 묻지 않고 장면 시작 |

## 실행 기록

### 2026-11-27 — iOS 시뮬레이터 · Android 에뮬레이터, 임시 탐침(낱말 말하기 단독)

- **흉내**: 로그인 없이 임시 탐침(커밋 안 함, 확인 뒤 진입점을 되돌리고 파일 · 탐침 번들을 지움)으로 낱말 말하기 두 문항을 레슨 맥락(`mic`)과 함께 세웠다.
  시트 · 결선 · 호스트 `getStatus` · `requestPermissions` · `openSettings` · 시스템 창은 실제다. 이벤트는 콘솔로 확인했다.
- iOS 26.5 시뮬레이터(전용 iPhone 17 Pro, 새 설치): MP-E1 · E2(마이크 창 → 허용 안 함, 이어서 음성 인식 창) · E3 · E4(설정 앱이 열림) 통과.
  설정에서 권한을 바꾸자(`simctl privacy grant`) 앱이 끝나고 다시 떴다 — 다시 열면 시트 없이 준비 국면(E5 iOS 쪽 = ADR-0206 한계 그대로).
  말하기 → 멈춤에서 인식 실패 → 「Something went wrong while listening. Try again.」 · Skip · Try again(E7) 통과.
- Android 에뮬레이터(Pixel 8, 읽기 전용 · `-no-audio`, `assembleBundled`, 새 설치): MP-E1 · E2(「Allow Duru to record audio?」 → Don't allow) · E3 · E4(앱 정보 설정) 통과.
  설정에 있는 동안 `pm grant` 뒤 뒤로 → **시트가 닫히고 준비 국면**(E5). 이벤트 `sheet_shown(prime)` → `answered(denied, prompt)` → `sheet_shown(denied)` →
  `settings_opened` → `answered(allowed, settings)` 순서로 났다. 제품 코드의 JS 오류 없음(탐침의 효과음 끄기 대입이 Android에서 막힌 오류 하나 — 탐침 전용).
- 실행하지 않음: E6(Continue without speaking — UI · integration이 봄) · 「Hear it」(탐침 문항에 정답 소리 없음 — UI USW-P10이 봄) · E8 롤플레이(integration IR5 · IR5c) · 실기기.
- 캡처: 사용자 보고에 경로를 적는다(저장소에 넣지 않음).
