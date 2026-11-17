# ADR-0154: 메신저를 로그인한 일반 회원 모두에게 연다

- 상태: **채택** (2026-11-17) — 앱만. 운영 서버 `companion.settings.testers_only = false`는 사용자가 따로 바꾼다.
- 날짜: 2026-11-17
- **사용자 결정** (2026-11-17 「일반 회원도 열리게」): 이번 출시(Android 1.4.0 · iOS 1.1.0)에서 메신저를 시험 계정이 아닌 회원에게도 연다.
- 바꾸는 결정: [ADR-0128](0128-messenger-access.md) D1 · D3(시험 계정이 아닌 회원 「곧 열림」), [ADR-0137](0137-messenger-companion-server-source.md)(서버 모드는 로그인한 시험 계정만).

## 맥락
- 앱은 메신저를 열지 정할 때 서버 `testers_only`가 아니라 액세스 토큰의 시험 계정 표시(`app_metadata.duru_tester`, [ADR-0085](0085-tester-access.md))를 봤다. 서버 설정만 바꿔서는 일반 회원에게 열리지 않았다.
- 지난 스토어 빌드에는 메신저 탭이 없었다. 이번 출시로 업데이트하는 회원 모두가 메신저를 처음 본다.

## 결정
### D1. 판정 — `messengerAccessOf(accountState)`
- 로그인 = `open`, 손님 · 로그아웃 = `sign-in`. 시험 계정 표시는 메신저 판정에 쓰지 않는다. `coming-soon`과 그 문구(다섯 언어)는 닿는 길이 없어 지웠다.
- 같은 판정을 쓰는 곳은 그대로 따라온다: 메신저 탭 목록 · 설정 Chats 줄 · 방 route(ADR-0128 D3a) · 선톡 푸시(`canOpenChats`) · 새 친구 시트(#451) · 엽전 출시 뒤 채팅 모달(`chatOpen`) · 탭 NEW 배지.

### D2. 서버 모드 — 로그인한 회원이면
- 대화 출처는 로그인한 회원이면 서버 모드(사용자마다 `server:<userId>`), 손님 · 로그아웃이면 가짜다. 시험 표시가 바뀌어도 같은 회원이면 출처를 다시 만들지 않는다.
- 등급은 그대로 — 시험 계정 `unlimited`, 회원 `free`(무료 3통 · 엽전 보내기, ADR-0117 · 0140).

### D3. 다시 켠 뒤 목록 미리보기
- 서버 방은 기록을 방을 열 때만 읽어, 앱을 다시 켜면 목록 줄이 빈 미리보기 · 시각 없이 섰다. 서버 출처를 만들 때 열린 방마다 `companion_list_messages`를 한 번 읽어 로그에 합친다(`previewOnStart`, `chat-remote-preview.ts`).
- 첫 인사는 청하지 않는다 — 기록이 비면 그대로 두고 방을 열 때 지금처럼 받는다. 같은 기록을 방을 열 때 다시 읽어도 같은 id는 한 줄이다(`mergeLog`).
- 안 읽음 · NEW는 되살리지 않는다(서버에 읽음 기록이 없다).

## 버린 대안
1. **서버 설정(`testers_only`)을 앱이 읽어 판정** — 읽는 API가 없고(`companion_list_characters`는 인물별 `not_available`만 준다) 이번 출시 일정 안에 서버를 바꾸지 않는다.
2. **모든 회원에게 시험 계정 표시를 붙임** — 시험 계정은 티켓 · 유닛 잠금 · 분석에서도 빠진다(ADR-0085). 메신저만 열려야 한다.

## 대가
- **서버 순서**: 운영 `testers_only`가 켜져 있으면 회원은 메신저 목록은 보지만 모든 방에서 `not_available`(「You can't chat with … yet」)을 받는다. 이 앱이 사용자에게 닿기 전에 `testers_only = false`로 바꾼다. 옛 앱(메신저 탭 없음)에는 영향이 없다.
- **비용**: 회원 대화 · 첫 인사 · 선톡 · 사진 · 음성이 모두 실제 모델 호출이다. 앱을 켤 때마다 열린 방 수만큼 기록 읽기가 한 번씩 나간다.
- **엽전 표시 어긋남(고치지 않음)**: 앱은 하루 무료 3통 뒤 메시지마다 3엽전을 지갑에서 빼지만, 서버는 덕수쌤 밖의 인물은 첫 통부터 3엽전을 빼고 덕수쌤은 체험 수(20) 안에서 무료다. 그래서 칩이 서버 잔액과 다음 동기화(학습 보상 지급) 전까지 다르다 — 무료로 보인 통에 엽전이 빠지거나, 덕수쌤에게 낸 엽전이 실제로는 빠지지 않는다. 서버 `done.balance`를 칩에 잇고 무료 수를 서버 기준으로 맞추는 일은 등급 정책 결정이 필요해 따로 둔다.
- 엽전이 3 미만이면 해금 첫 인사가 오지 않고 「You can't chat with X yet」가 남는다(서버 `companion_greet_context`가 무료 인사에도 턴 판정을 쓴다 — 서버 수정 필요).

## 테스트
- unit MA-U1(`messenger-access.unit.test.ts`) · SW-U2 · SW-U4 · SW-U9(`messenger-chat-wiring.server.unit.test.ts`) · SW-U7(`new-friend-wiring.server.unit.test.ts`) · MG-U1
- ui MA-UI1 · UI3 · UI4 · UI6(`ChatAccessGate.ui.test.tsx`, MA-UI2 삭제)
- integration MA-I2(`App.messenger-access.integration.test.tsx`) · CP-I7(`App.companion-push.integration.test.tsx`) · YL-I2(`App.launch-coins.integration.test.tsx`) · MC2-I6(`App.new-friend.integration.test.tsx`) · IT1 · GE5b(설정 Chats 줄) · SS-I14 · SS-I15(`chat-fixture-remote.integration.test.ts`)
- e2e: [수동 기록](../e2e/messenger-access.md) MA-E4 개정.
