# ADR-0170 — 주간 순위(Lessons · Chat words) · 다섯째 탭 · 채팅 단어

- 상태: **채택 — 앱 · 서버 파일. 운영 미적용**(마이그레이션 · `chat-send` 배포 · 예약 작업은 사용자 작업 — `apps/supabase-functions/README.md` 「주간 순위」).
- 날짜: 2026-11-20.
- **사용자 결정**: 시안 (가) 「탭 5개」(2026-11-20) — 보드 `RankingTab` · `RankingChat` · `ChatWords`, 규칙 노트 rkNote · cwNote.
- 번호: 0168은 다른 브랜치(romance-ladder), 0169는 병행 브랜치(more-menu)가 쓸 수 있어 비웠다.
- 이어받는 결정: [ADR-0111](0111-guest-entry-without-account.md)(비회원 로그인 흐름), [ADR-0116](0116-yeopjeon-reward.md) · [ADR-0140](0140-yeopjeon-launch.md)(서버 지갑),
  [ADR-0129](0129-correction-card-and-rating.md)(교정 단계), [ADR-0148](0148-coin-claim-valid-units.md)(콘텐츠 유닛 표), [ADR-0149](0149-bundle-size-ceiling-and-report.md)(번들 천장).

## 결정

### D1. 하단 탭 다섯 — 순위는 넷째, 트로피
- 순서 journey · roleplay · messenger · **ranking** · settings. 탭 배열에 한 줄, 5개 배치는 항목 수 클래스(`-items-5`)만 본다: 항목 56 · space-between · 좌우 16.
  맨 오른쪽 탭이 More로 바뀌어도(병행 브랜치) 이 규칙은 그대로다.
- 순위 탭 루트(`{ name: "ranking", board }`)는 전역 머리가 없다(메신저 목록과 같은 규칙).

### D2. 규칙은 서버가 정본
- 주 시즌은 **월 00:00 UTC** 시작. 그룹은 그 주에 처음 점수를 얻을 때 배정 — 가입 나이(<14일 · <60일 · 그 밖) × 진도(통과 유닛 0~9 · 10~39 · 40+) 구간에서
  숨기지 않은 인원이 목표(25) 미만인 그룹, 없으면 새 그룹(상한 30). 값은 `ranking.settings`.
- **Lessons** = 그 주에 **처음** 통과한 콘텐츠 유닛(`companion.content_units`: S1~S8 · CULT · RP). 다시 통과는 0(사용자 평생 한 번). `learning_progress` 트리거가 센다 — 저장 RPC는 그대로.
- **Chat words** = 배운 단어(`voca:` — VOCAB_CARD로 만난 것) 가운데 그 주 메신저에서 바르게 쓴 서로 다른 단어, 주 1번. 교정 `items[].original`에 그 단어가 있으면
  세지 않고(pending) 고쳐 다시 보낼 때 센다. 어간 기준(맛있어요 → 맛있다 — 두 글자 어간은 어간 전체로 찾는다). 입력 검사에 걸린 글은 세지 않는다.
- 추출은 교정을 내는 같은 단계(`chat-send`의 피드백 사슬) — 모델 호출 추가 없음, RPC 한 번. 결과는 같은 `correction` 이벤트 · 같은 저장 카드의 `chatWords`.
- 동점은 그 점수에 먼저 닿은 사람이 위. 줄은 표시 이름 · 나라 · 지금 에피소드 · 점수뿐(user id · 이메일 없음). 계정 삭제는 CASCADE로 순위 행도 지운다.

### D3. 숨기기
- 설정 「Hide me from ranking」. 숨긴 사람은 기록은 쌓지만 남의 목록 · 그룹 수 · 보상에서 빠지고, 자기 순위 탭은 「You're hidden」 + Show me.
- 정본은 서버(`ranking_set_hidden`), 설정 줄은 계정별 기기 사본(`libitum.ranking.hidden.<userId>`)으로 선다 — 설정을 열 때마다 서버를 부르지 않는다. 보드를 읽을 때 사본을 고친다.

### D4. 상위 3 보상 — 설정, 기본 꺼짐
- `ranking.settings.reward_enabled = false` · `reward_amount = 30`(시안의 예시 — **사용자 미결정**). 켜면 주 정산(`ranking_settle_week`, 월 00:05 UTC 예약)이
  각 그룹 · 보드 1~3위(점수 > 0)에게 `companion.grant_once(..., 'ranking', 주:보드:사용자)`로 준다(다시 돌려도 한 번).
- 꺼져 있으면 구역 줄은 「Top 3 this week」, 켜지면 「Top 3 get a bonus N Yeopjeon」.

### D5. 화면 상태
- 불러오는 중(자리 표시 다섯) · 빈(이번 주 그룹 없음 — 「Your week starts soon」) · 오류(Try again) · 오프라인(Try again) · 숨김(Show me) · 비회원(Sign in → 기존 로그인 화면).

### D6. 채팅
- 서버 방 머리 아래 「N chat words this week · #R in your group ›」(보드 값과 이 방의 마지막 `weekTotal` 가운데 큰 값) → 순위 탭 Chat words.
- 내 말풍선 아래 「+N chat words」 + 단어 칩, 짚힌 단어는 회색 줄. 기록(다시 열기)에서도 저장 카드의 `chatWords`로 보인다.

### D7. 번들 — `extractStr`
- 기능만으로 `.lynx.bundle` +73,857 B(5,399,880 B)라 천장(5,327,000 B)을 넘었다. 천장은 올리지 않고 ReactLynx `extractStr: true`(두 스레드의 같은 문자열을
  한 번만 싣기)를 켰다 — 앱 전체 -102,933 B, 결과 5,297,854 B(main 대비 -28,169 B, 접근성 · 리뷰 반영 뒤). **기기(iOS · Android) 확인이 남았다** — 문제가 있으면 이 줄만 되돌리고
  기능을 줄이거나 천장을 사용자가 정한다.

### D8. 분석
- `ranking_opened{board, source, view}` · `ranking_board_switched{from, to}` · `ranking_own_row_viewed{board, rank, score}` ·
  `chat_words_earned{count, pending, weekTotal}` · `ranking_hide_toggled{hidden}` — 이름 · 단어는 싣지 않는다.

## 버린 대안
1. **(나) More 메뉴 줄의 순위** — 시안 비교에서 (가)가 가장 잘 보여 사용자가 골랐다.
2. **레슨 = 앱이 보낸 통과 수** — 앱이 임의 키를 저장해 부풀릴 수 있다. 서버의 콘텐츠 유닛 표와 트리거로 센다.
3. **채팅 단어를 따로 모델로 뽑기** — 비용이 는다. 교정 단계가 이미 낸 `learnedUsed`와 글자 판정을 쓴다.
4. **천장 올리기** — ADR-0149가 막는다(사용자 결정).

## 대가
- 출시 초기에는 구간이 아홉이라 작은 그룹이 여럿 생길 수 있다. 새 계정 · 비회원 기록을 들인 첫 저장은 그 주 Lessons가 한 번에 크게 오를 수 있다.
- 새 에피소드를 올릴 때 `companion.content_units`를 채우지 않으면 순위에도 들어가지 않는다.
- th · my 화면 문구는 PR #522가 들어올 때 이 문구표에 더한다.

## 열린 결정(사용자)
- 보상 액수 · 켤지(D4), 주 시간대(UTC 월요일 — 지역 자정이 아님), 그룹 크기(25 · 30)와 구간, 다시 통과 규칙(평생 한 번), 유닛 범위(S · CULT · RP).

## 리뷰 (2026-11-20)
- review 에이전트: **PASS(조건부)**. 고침: W1 같은 사용자 배정 경합(진도 저장이 롤백될 수 있었음 — 사용자 단위 잠금 + on conflict, WR-D11), W2 숨기기 사본이 계정 단위가 아님(RK-U11).
  남김: W3 `extractStr` 기기 확인, W4 e2e(서버 적용 뒤), S1 실패한 턴에서 센 단어가 남음(주 1번이라 부풀지 않음), S2 마이그레이션 전 유닛이 스냅숏에서 빠졌다 다시 오면 한 번 더 셀 수 있음, S3 방 줄 순위는 방을 연 때 값.
- accessibility 에이전트: Critical 4(Android `flatten`) · 대비 · 얻은 단어 한 줄 낭독 · 내 줄 You를 고침(RK-UI10 · CW-UI4). 남김: 상태 안내 낭독(announce), 숨기기 저장 실패 안내, 머리 글 요소화.

## 테스트
- unit RK-U1 ~ U11 · CW-U1 ~ U3 · 서버 CWS-U1 ~ U6 · CWS-H1 · H2, db WR-D1 ~ D11, ui RK-UI1 ~ UI10 · CW-UI1 ~ UI4 · ST-UI · BN-UI, integration RK-I1 ~ I5.
- e2e: [수동 절차](../e2e/weekly-ranking.md) — 서버 적용 뒤. [성능 기록](../performance/reports/weekly-ranking-01.md).
