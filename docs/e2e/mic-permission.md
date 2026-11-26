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

(아래에 기기 · 날짜 · 결과를 적는다.)
