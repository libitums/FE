# ADR-0166: 비회원도 회원과 같은 메신저 목록 — 보내기는 로그인 권유

- 상태: **채택 — 앱만**(서버 · 마이그레이션 변경 없음). (2026-11-19) · 확인 필요 1 · 2 **결정**(2026-11-20, D5)
- 날짜: 2026-11-19
- **사용자 결정** (2026-11-19, 앱 1.2.0 iOS 심사 전): 「비회원도 똑같이 뜨게하고 채팅 보내면 로그인 필요하다고 띄우고 로그인시켜」 · 새 문구는 다섯 UI 언어 모두
  실제 번역(영어 복사 금지), 가장 긴 언어로 iPhone 13 mini에 들어가야 한다.
- 바꾸는 결정: [ADR-0128](0128-messenger-access.md) — 손님에게 메신저 탭 대신 가입 권유 안내를 세우던 것을, 비회원은 같은 목록 + 계정 동작에서
  권유로 바꾼다(로그아웃 · 진입 구간의 안내는 그대로). [ADR-0111](0111-guest-entry-without-account.md) — 비회원 「로그인」 성공 뒤 `backToRoot` → `back`(연 자리로).

## 맥락

- 비회원(「Continue without an account」, ADR-0111)이 메신저 탭을 열면 가입 권유 안내(`ChatAccessGate`)만 보였다. 대화 출처는 데모 씨앗
  (「익선 게스트하우스」 · 「사장님」)이라 안내 뒤 얼굴도 회원 목록과 달랐고, 덕수쌤 방 · 첫 입장 안내(ADR-0139) · 추천 친구 줄(ADR-0162 · 0164)이 없었다.
- 컴패니언 서버는 계정 없는 사람을 받지 않는다(ADR-0128). 그래서 비회원이 볼 수는 있어도 서버에 닿는 동작(보내기 · 사진 · 음성 · 엽전)은 할 수 없다.

## 결정

### D1. 접근 셋 — open · preview · sign-in

- `messengerAccessOf`: 회원 `open`, 비회원 `preview`, 로그아웃(진입 구간) `sign-in`. `canBrowseChats` = open · preview — 목록 · 방을 그린다.
  `sign-in`만 가입 권유 안내를 세운다.
- preview가 회원과 같은 것: 목록 · 덕수쌤 첫 입장 안내 · 새 친구 NEW(탭 배지) · 새 친구 시트(Reply가 열 방이 있다) · 엽전 칩(기기 엽전).
- preview가 막는 것(회원만): 대화 설정 · 기억 · 앨범 화면, 설정 탭 Chats 줄, 서버 푸시 방 열기(비회원은 푸시 등록이 없다).

### D2. 비회원 출처 — 회원과 같은 인물 방, 서버 0

- 세션 없음 + 비회원 표식이면(`app/guest-preview.ts`) 출처 씨앗이 `guestCompanionSeed()`다 — 앱 인물 표(`COMPANION_ROSTER`: 이야기 다섯 + 추천 친구 넷)의 방,
  각 방의 첫 말 = 인물의 `firstLine`(시트 첫 말과 같은 문장이면 그 영어 뜻). 데모 방은 비회원에게 서지 않는다(테스트 씨앗은 그대로).
- 해금 규칙은 회원과 같다: 기기 해금 기록(`fixture` 키)에 있는 이야기 인물은 열린 채 시작하고, 에피소드를 끝내면 같은 길(`commitNewFriend`)로 열린다.
- 방을 열면 첫 인사를 앱 안에서 놓는다(가짜 출처 옵션 `greetOnOpen`) — 서버의 첫 인사를 흉내 내지 않고 정해 둔 첫 줄 하나. 서버 요청은 0이다.
- 추천 친구 포트(`guestSuggestedFriendsPort`)는 앱 카탈로그만 — 제안 · 먼저 만나기 · 보이는 친구 RPC · 성인 확인 없음. 나이를 모르는 비회원에게는
  서버 규칙의 「나이 모름」을 따른다(미성년자만 open 수위 친구를 숨긴다 — ADR-0164) → 넷 다 보인다.

### D3. 계정 동작은 「로그인 필요」 대화상자

- 대화상자(`SignInPromptDialog`) = ui-lynx `Dialog`, [Sign up or log in · Not now]. 주 단추는 설정 탭 「Sign in」과 같은 길(`guest-login` route, ADR-0111),
  Not now · 뒤로가기는 닫기만(입력한 글은 남는다).
- 띄우는 자리(`trigger`): 보내기 · 보기 칩 · 고친 문장 다시 보내기(`send`), 사진 · 음성 요청(`media`), 엽전 칩 · 엽전 상점(`coins`), 방 메뉴(사이드바)와
  더보기에서 여는 겹침 · 👎 평가(`menu`), 추천 친구 「Start chatting」(`add_friend`). 판정은 순수 함수 `guestGateOf`. 더보기 펼침 · 사진 크게 보기 ·
  키보드 · 보기 패널 열기는 그대로 둔다.
- 로그인 성공 뒤 `back` — 로그인 화면만 걷어 연 자리로 돌아간다(방에서 열었으면 그 방). 방은 접근이 바뀌어 회원 출처로 새로 선다(`key = roomId:access`).
  비회원 기록 이관은 ADR-0111 그대로다.

### D4. 이벤트 하나 — `chat_sign_in_prompt_closed { trigger, choice }`

- 대화상자를 닫을 때 한 번(`choice`: sign_in · later). 뜬 수 = 이 이벤트 수, 로그인으로 넘어간 비율 = sign_in 비율. 로그인 성공은 기존
  `entry_login_method_selected`가 센다. 사전: [ADR-0029](0029-product-analytics-posthog.md). Airbridge 매핑 없음.

### D5. 비회원 흐름 다듬기 ⟨2026-11-20 — 확인 필요 1 · 2 결정, 사용자 승인 「proceed」⟩

iOS 1.2.0 시뮬레이터 QA(wiki 「QA-2026-11-20-iOS-1.2.0」)에서 나온 거친 곳 다섯을 고친다.

1. **비회원은 생년을 묻지 않는다.** 방을 열 때의 생년 시트(ADR-0125)는 회원 · 아직 안 물음일 때만 선다(순수 함수 `asksBirthYearOnEntry`,
   `use-entry-birth-year.ts`). 비회원은 첫 인사와 입력 줄을 바로 보고, 계정 동작은 대화상자다. 생년은 로그인 뒤 회원 방에서 회원과 같이 묻는다 —
   비회원 답이 옮겨지지 않아 두 번 묻던 일(대가 1)이 사라진다.
2. **대화상자 문구는 누른 자리에 맞춘다**(대화상자 하나, `trigger`로 고름 — 순수 함수 `signInPromptCopyOf`). 번들 천장(ADR-0149) 때문에 자리별 새 제목 대신
   **누른 기능의 기존 이름**을 제목으로 쓴다:

   | trigger | 제목(기존 키) | 본문 |
   | --- | --- | --- |
   | send · media | `access.promptTitle` 「Sign in to send messages」 | `promptBody` |
   | coins | `album.getCoins` 「Get Yeopjeon」 | `promptKeepBody`(새) |
   | menu(≡ · 더보기 창 · 👎) | `room.settings` 「Chat settings」 | `promptBody` |
   | add_friend | `suggested.startChatting` 「Start chatting」 | `promptBody` |
   | tickets | `tickets.getMore` 「Get more tickets」 | `promptKeepBody`(새) |

   처음 판(자리별 새 제목 넷 + 두 문장 본문)은 천장을 2,096 B 넘었다(성능 보고서 guest-flow-polish-01).
3. **비회원 방 머리에 무료 남은 수 줄(「20 of 20 free messages left」)이 없다** — 보낼 수 없으니 남은 수도 없다(`ChatRoomHeader.plan = null`).
4. **티켓 모달 Get more tickets — 비회원은 대화상자(`trigger: tickets`)**. 「More ways to get tickets are coming soon」 막다른 안내 대신 같은 대화상자,
   주 단추는 같은 로그인 길(`guest-login`). 대화상자는 모달의 형제로 서고(고정 안의 고정을 피함), 떠 있는 동안 모달은 낭독에서 숨는다. 회원 · 시험 계정은
   지금 그대로(하루 한 장 지급 · 안내). 결선: `withLearningTickets`가 비회원이면 `ticketHeader.signIn`을 채운다.
5. **비회원 방 전구(Reply ideas)는 보내기와 같은 대화상자(`send`)** — 보기가 없어 꺼져 있던 단추를 켜 두고(`ChatRoomDock.guest`) `open-ideas`를 관문으로
   보낸다(`guestGateOf`).

이벤트: `chat_sign_in_prompt_closed.trigger`에 `tickets` 하나를 더했다(ADR-0029 사전). 전구는 새 값 없이 `send`.

## 문구(다섯 언어, `messengerChat.access`)

| 키 | en | es | id | ja | vi |
| --- | --- | --- | --- | --- | --- |
| `promptTitle` | Sign in to send messages | Inicia sesión para enviar mensajes | Masuk untuk mengirim pesan | メッセージを送るにはログインが必要です | Đăng nhập để gửi tin nhắn |
| `promptBody` | Create a free account to chat with the people from your stories. Your progress so far comes with you. | Crea una cuenta gratis para chatear con las personas de tus historias. Tu progreso se conserva. | Buat akun gratis untuk mengobrol dengan orang-orang dari ceritamu. Progresmu tetap tersimpan. | 無料アカウントを作ると、ストーリーで出会った人たちとチャットできます。これまでの進み具合も引き継がれます。 | Tạo tài khoản miễn phí để trò chuyện với những người trong câu chuyện của bạn. Tiến độ của bạn vẫn được giữ. |
| `promptLater` | Not now | Ahora no | Nanti saja | 今はしない | Để sau |

**⟨2026-11-20⟩ 더한 키 하나 — `promptKeepBody`**(엽전 · 티켓 자리의 본문):

| 키 | en | es | id | ja | vi |
| --- | --- | --- | --- | --- | --- |
| `promptKeepBody` | Create a free account to keep your Yeopjeon and tickets. | Crea una cuenta gratis para guardar tus Yeopjeon y boletos. | Buat akun gratis untuk menyimpan Yeopjeon dan tiketmu. | 無料アカウントを作ると、Yeopjeonとチケットを保存できます。 | Tạo tài khoản miễn phí để giữ Yeopjeon và vé của bạn. |

iPhone 13 mini 시뮬레이터에서 en · es(티켓 · 대화 설정) · vi(엽전) · ja(티켓) 대화상자가 넘치지 않는다(2026-11-20).

주 단추는 기존 `signIn`(「Sign up or log in」 · 다섯 언어 있음)을 쓴다. 인물 이름은 한글 그대로(ui-copy 정책). iPhone 13 mini에서 es(제목 두 줄) · vi
(본문 세 줄)가 대화상자 안에 들어간다(2026-11-19 시뮬레이터).

## 대가

- ~~비회원의 생년 묻기(ADR-0125)는 회원과 같이 방을 처음 열 때 선다.~~ ⟨2026-11-20 D5-1⟩ 비회원은 묻지 않는다 — 로그인 뒤 회원 방에서 한 번.
- ~~대화상자 제목은 「보내기」 기준 한 문장이다.~~ ⟨2026-11-20 D5-2⟩ 자리별 제목. 다만 새 문장이 아니라 누른 기능의 기존 이름이라 「로그인이 필요하다」는
  말은 본문과 주 단추(「Sign up or log in」)가 진다.
- ⟨2026-11-20⟩ 비회원 티켓 모달의 Get more tickets는 하루 한 장 지급(초기 이벤트)을 하지 않는다 — 대화상자만 선다. 로그인하면 회원 길로 받는다.
- ⟨2026-11-20⟩ 번들 천장(ADR-0149) 여유가 186 B만 남았다.
- 운영 스위치 `friends_mode`를 off로 내려도 비회원에게는 앱 표의 추천 친구가 보인다(비회원은 서버를 읽지 않는다). 다시 끄려면 앱 출시가 필요하다.

## 확인 필요(사용자 몫)

1. ~~비회원 생년 묻기를 그대로 둘지(대가 1).~~ **결정 2026-11-20**: 묻지 않는다 — 로그인 뒤 회원 방에서(D5-1).
2. ~~엽전 칩 · 친구 추가에서 뜰 때 제목을 따로 둘지(대가 2).~~ **결정 2026-11-20**: 자리별로 — 메시지 · 엽전/상점 · 대화 설정 · 친구 추가(+ 티켓)(D5-2).
   번들 때문에 제목은 기존 이름으로 했다. 「Sign in to …」 꼴 새 제목을 원하면 천장 여유를 먼저 만들어야 한다(약 2.1 kB).
3. 기기 회차 GM-E1 ~ E6([docs/e2e/guest-messenger.md](../e2e/guest-messenger.md)) — GM-E4(실제 Google 로그인) · GM-A1은 기기 몫.
4. ⟨2026-11-20⟩ 티켓 없음 대화상자(E6m)의 Get more tickets는 비회원에게도 그대로다(이번 범위 밖) — 같은 권유로 바꿀지.
