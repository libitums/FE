# 비회원 메신저 — 같은 목록 · 로그인 권유 e2e (ADR-0166 · D5 2026-11-20)

기기에서 사람이 보는 절차다. 시뮬레이터 · 기기 확인 전에 소리를 끈다. 준비: 앱을 지운 뒤(또는 앱 데이터 초기화) 로그인 화면에서
「Continue without an account」로 들어간다. 서버 변경은 없다 — 비회원 구간은 컴패니언 요청이 0이어야 한다.

| # | 절차 | 기대 |
| --- | --- | --- |
| GM-E1 | 메신저 탭 | 가입 권유 안내 대신 회원과 같은 목록: 덕수쌤 줄(NEW · 「안녕하세요! 덕수쌤이에요.」 흐린 미리보기) 위에 덕수쌤 첫 입장 안내. Skip 뒤 「Meet new friends」 줄(차서연 · 권해준 · 송다은 · 임건우) · 덕수쌤 줄 · 머리 엽전 칩. 「익선 게스트하우스」 · 「사장님」 데모 방이 없다 |
| GM-E2 | 덕수쌤 방 → 글을 써서 보내기 | 생년 시트가 서지 않고(D5-1) 머리에 무료 남은 수 줄이 없다(D5-3). 첫 인사 한 줄이 보인다. 보내면 키보드가 내려가고 「Sign in to send messages」 대화상자(Sign up or log in · Not now). 내 줄이 생기지 않고 쓴 글은 입력 칸에 남는다 |
| GM-E3 | 사진 · 음성 단추, 머리 ☰, 엽전 칩, 추천 친구 → Start chatting | 모두 같은 대화상자, 제목만 자리별(D5-2): 사진 · 음성 「Sign in to send messages」 · ☰ 「Chat settings」 · 엽전 「Get Yeopjeon」(본문 「Create a free account to keep your Yeopjeon and tickets.」) · 친구 「Start chatting」. 요청 창 · 사이드바 · 상점이 서지 않고 친구가 목록에 추가되지 않는다 |
| GM-E4 | GM-E2 대화상자의 Sign up or log in → Google 로그인 | 탭 바 없는 로그인 화면 → 성공하면 같은 덕수쌤 방으로 돌아온다(회원). 다시 보내면 서버 답이 온다. 여정 진행 · 엽전은 비회원 기록이 옮겨진 값(ADR-0111) |
| GM-E5 | 설정(또는 여정) 탭 머리 티켓 칩 → Get more tickets | 「coming soon」 안내 대신 대화상자(제목 「Get more tickets」, 엽전/티켓 본문). Not now는 닫기만(안내 · 장수 그대로), 주 단추는 로그인 화면(D5-4) |
| GM-E6 | 덕수쌤 방 입력 줄의 전구(Reply ideas) | 켜져 있고, 누르면 「Sign in to send messages」 대화상자. 보기 판은 서지 않는다(D5-5) |
| GM-A1 | VoiceOver · TalkBack, GM-E2 | 대화상자 제목이 머리글, 단추 둘이 버튼. 떠 있는 동안 뒤 방이 읽히지 않는다. Android 뒤로는 Not now와 같다 |

다섯 언어: 설정 › Language에서 es · vi로 바꿔 GM-E2를 반복 — iPhone 13 mini에서 제목(es 두 줄) · 본문(vi 세 줄) · 단추가 대화상자 안에 들어간다.

PostHog: 대화상자를 닫을 때마다 `chat_sign_in_prompt_closed { trigger, choice }`(GM-E2 send · GM-E3 media · menu · coins · add_friend · GM-E5 tickets · GM-E6 send).
Airbridge로는 나가지 않는다.

**실행 기록** — 2026-11-19 iPhone 13 mini 시뮬레이터(iOS 26.5, 브랜치 feat/guest-messenger-same-list 번들): GM-E1 · GM-E2 통과, GM-E3은 엽전 칩만,
es · vi 맞음. GM-E4(실제 Google 로그인) · GM-A1은 기기 몫(미실행).

**실행 기록** — 2026-11-20 iPhone 13 mini 시뮬레이터(iOS 26.5, 브랜치 feat/guest-flow-polish 번들): GM-E1 · GM-E2(생년 시트 없음 · 무료 줄 없음) · GM-E3(☰ · 엽전 ·
친구) · GM-E5(Not now · 주 단추 → 로그인 화면) · GM-E6 통과. 언어: es(티켓 · ☰) · vi(엽전) · ja(티켓) 대화상자가 넘치지 않음. 사진 · 음성 단추와 GM-E4 · GM-A1은
이번 회차에서 돌리지 않았다(사진 · 음성은 ui 테스트 GC-U5가 본다).
