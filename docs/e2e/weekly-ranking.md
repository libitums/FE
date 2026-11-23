# 주간 순위 e2e (ADR-0170)

기기에서 사람이 보는 절차다. 준비: 회원 계정 둘 이상(같은 주 · 비슷한 진도), 비회원 설치 하나. 원격 DB 마이그레이션
`20261220120000_weekly_ranking.sql` · `chat-send` 배포 · `cron/ranking.sql` 적용 여부를 적는다(2026-11-20 기준 **셋 다 미적용** — 그 전에는
순위 RPC가 없어 회원 화면은 오류 안내다). 앱 소리는 설정에서 끈다.

| # | 절차 | 기대 |
| --- | --- | --- |
| WR-E1 | 로그인 뒤 하단 탭을 본다(375 · 390 폭) | 탭 다섯: 여정 · 롤플레이 · 메신저 · 트로피(순위) · 설정, 고른 간격, 잘림 없음. NEW 배지가 단추 안에 든다 |
| WR-E2 | 순위 탭을 연다 | 「Weekly ranking」 · 「Your group · N learners」 · 「Ends in N days」 · Lessons 선택. 1 ~ 3위 메달, 맨 위 「Top 3 this week」(보상 꺼짐), 4위(또는 생략 뒤 첫 줄) 앞 「Keep climbing」. 그룹이 크면 상위 3 · 점 셋 · 내 위 2 · 나 · 내 아래 1만(D11), 줄에 에피소드 없음, 아바타는 사람마다 같은 색 · 흰 이니셜(D10). 내 줄이 탭 바 위에 고정(바에 가리지 않음 — D9, 375 · 390 폭 · Android 제스처 · 3버튼) · 주황 테두리 · 브랜드 굵은 글 「N more to pass NAME」 |
| WR-E3 | 처음 통과하는 레슨을 끝내고 순위 탭에 다시 온다 | Lessons 점수 +1. 이미 통과한 레슨을 다시 통과하면 그대로 |
| WR-E4 | 서버 방에서 배운 단어(VOCAB_CARD에서 본 것)를 바르게 쓴다 · 「맛있어요」 | 내 말풍선 아래 「+N chat words」 + 칩(사전 꼴 「맛있다」). 머리 아래 줄 숫자가 오른다. 같은 주에 같은 단어는 다시 세지 않는다 |
| WR-E5 | 교정이 짚는 말(「조금 맵다요」)을 보낸 뒤 Send corrected | 처음엔 회색 「맵다 · counts when you resend it right」, 고쳐 보낸 글 아래에 +1 |
| WR-E6 | 방 머리 아래 줄을 누른다 | 순위 탭이 Chat words 보드로 열린다 |
| WR-E7 | 설정 › Hide me from ranking을 켠다 → 다른 계정에서 순위를 본다 → Show me | 다른 계정 목록 · 그룹 수에서 빠짐. 내 순위 탭은 「You're hidden」 · Show me로 돌아옴 |
| WR-E8 | 비회원으로 순위 탭 · 오프라인으로 순위 탭 · VoiceOver/TalkBack | 비회원: 「Sign in to join」 · Sign in → 로그인 화면. 오프라인: 「You're offline」 · Try again. 낭독: 줄마다 「#1, Linh, 14 lessons」(생략 점은 읽지 않음), 보드 「Lessons, selected」 |
| WR-E9 | 앱을 새로 켠 뒤 순위 탭을 처음 연다(이번 주 점수가 없는 회원 · 있는 회원 각각). 머리의 제목 · 「Ends in N days」 줄 · 보드 전환 · 그 아래를 본다 | 「Ends in N days」 줄이 불러오는 중부터 서 있고, 응답이 온 뒤에도 보드 전환(Lessons · Chat words)과 그 아래가 위아래로 움직이지 않는다. 그룹 알약(「Your group · N learners」)이 뒤늦게 서도 줄 높이가 그대로다(D14) |

**2026-11-20: 미실행** — 서버 미적용이라 앱 흐름 확인은 적용 뒤. 이 브랜치의 `extractStr` 번들(ADR-0170 D7)도 이때 iOS · Android에서 첫 화면 ·
문구가 그대로 보이는지 함께 본다.

**2026-11-21: 기기 화면 확인(D9 ~ D11, WR-E2의 배치 부분만)** — 서버 미적용이라 실제 로그인 · RPC 대신 순위 화면을 앱 셸(같은 `.app` 여백 · `AppNavigator` · 호스트 safe area)에 고정 보드로 띄운 임시 번들로 봤다(커밋하지 않음).
iOS 시뮬레이터 iPhone 13 mini · SE 3세대 · 17 Pro Max, Android 에뮬레이터 Pixel 8(제스처 · 3버튼, `assembleBundled`). main `9be02583`은 세 iOS 크기와 Android 제스처에서 내 줄 고정 칸이 바 밑에 깔렸고,
이 브랜치는 모두 바 위에 선다. 비회원 · 불러오는 중 · 숨김 · 빈 안내도 바 위 가운데. 낭독(VoiceOver · TalkBack)은 아직 보지 않았다.

**2026-11-23: WR-E9 실패 확인(고치기 전)** — 사용자가 iPhone 13 mini(main `f449e47b` Release 빌드, 이번 주 점수가 없는 회원 계정)에서 순위 탭에 들어올 때 「Ends in 7 days」 줄이 뒤늦게 생기며 그 아래가 밀리는 것을 봤다. 고친 뒤의 확인은 `fix/ranking-header-shift` 빌드를 같은 기기에 설치해 본다 — **아직 미실행**.
