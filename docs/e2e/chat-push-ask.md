# 수동 e2e — 채팅 첫 답장 뒤 알림 권한 카드 (ADR-0197)

시스템 권한 창은 테스트 러너가 띄울 수 없어 기기에서 본다. integration(`App.chat-push-ask.integration.test.tsx`)은 호스트 모듈 대역으로 같은
흐름(첫 답 → 카드 → Turn on → 등록 RPC)을 이미 본다 — 여기서는 **실제 iOS 알림 권한 창 · Android 13+ `POST_NOTIFICATIONS` 창**과 카드의 모양만 본다.

## 준비

- 알림 권한이 미결정인 설치: iOS 시뮬레이터는 앱을 지우고 다시 설치(또는 `xcrun simctl privacy <udid> reset all <bundle id>`), Android는 앱 데이터를
  지우거나 새로 설치(API 33 이상 에뮬레이터).
- 앱 설정에서 소리를 끈다.
- 로그인한 회원 계정이 필요하다. 계정 없이 볼 때는 임시 탐침(커밋하지 않음)으로 사장님 방(가짜 출처)을 세우고, 카드 포트의 「로그인함」을 흉내 낸다 —
  판정 함수 · 카드 · 호스트 `getStatus` · `register`(시스템 창)는 실제다. 기록(3일 · 2번)과 기기 등록 RPC는 탐침에서 빠진다(integration이 본다).

| id | 확인 | 기대 |
|---|---|---|
| CPA-E1 | 방을 연다 | 카드 없음 |
| CPA-E2 | 글을 보내고 답이 다 온다 | 답 아래(로그 끝)에 카드 — 종 · 「Get a ping when {name} texts you?」 · 본문 · Turn on(주황) · Not now(회색) |
| CPA-E3 | iOS: Turn on | 시스템 「… Would Like to Send You Notifications」 창 |
| CPA-E4 | iOS: Allow | 카드가 「Notifications on — {name} will ping you.」 한 줄로 접힘 |
| CPA-E5 | Android 13+: Turn on | 시스템 「Allow Duru to send you notifications?」 창 |
| CPA-E6 | Android: Don't allow | 카드가 사라짐 |
| CPA-E7 | 방을 나갔다 다시 들어와 보내기 → 답 | 권한이 정해졌으므로 카드 없음 |
| CPA-E8 | Not now(새로 설치) | 카드가 사라지고 시스템 창 없음 |
| CPA-E9 | 실제 회원 계정 · 기기 등록 RPC · 3일 뒤 두 번째 | 미실행(계정 · 시간 이동 필요 — integration CPA-I1 · I2가 본다) |

## 실행 기록

### 2026-11-25 — iOS 시뮬레이터 · Android 에뮬레이터, 임시 탐침(로그인 흉내)

- **흉내**: 계정 없이 임시 탐침(커밋 안 함, 확인 뒤 진입점을 되돌리고 파일을 지움)으로 사장님 방(가짜 출처)을 세웠다. 카드 포트의 「로그인함」 ·
  빈 기록을 흉내 냈다 — 판정 함수 · 카드 · 방 화면 · 호스트 `getStatus` · `register`는 실제다. 기기 등록 RPC · 3일 · 2번 기록은 보지 않았다(CPA-E9).
- iOS 26.5 시뮬레이터(전용으로 만든 iPhone 17 Pro, 새 설치 = 미결정): CPA-E1 · E2 · E3 · E4 통과. 「'Duru'에서 알림을 보내고자 합니다.」 창 → 허용 →
  「Notifications on — 사장님 will ping you.」. JS 오류 로그 없음.
- Android 37 에뮬레이터(Pixel 8, 읽기 전용 · `-no-audio`, `assembleBundled`, 새 설치 = `POST_NOTIFICATIONS` granted=false): CPA-E1 · E2 · E5 · E6 통과.
  「Allow Duru to send you notifications?」 → Don't allow → 카드 사라짐. JS 오류 로그 없음.
- 첫 iOS 확인에서 Not now가 짙은 단추(neutral)로 보여 시안(옅은 회색)과 달라 `subtle`로 바꿨고, Android에서 옅은 회색으로 확인했다.
- CPA-E7 · E8 · E9는 실행하지 않았다(E7 · E8은 integration CPA-I2 · I4 · UI7이 본다).
