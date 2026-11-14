# ADR-0138 — 메신저 서버 모드 배달 실패 1단계 (보내지 못한 글 · 끊긴 답 채우기 · 기록 실패)

- 상태: **채택 — 1단계(앱만).**
- 날짜: 2026-11-13.
- **사용자 결정**: 「네트워크 연결 끊겼을 때 화면이랑 메신저 전송 실패 등 다양한 오류 상황 설계」 → [시안](https://claude.ai/artifact/3yPsCAW7bqCixkSTYbQgow) → 「이어서 진행」 = 시안의 추천안
  - Q1 연결 배너는 연결이 필요한 화면만(2단계)
  - Q2 보내지 못한 글은 사용자가 누를 때만 다시 보냄
  - Q3 「답만 다시」는 서버에 부탁, 1단계는 안내만
  - Q4 빨강 없음 · Q5 재시작하면 안 남김 · Q6 메신저부터
- 이어받는 결정
  - [ADR-0137](0137-messenger-companion-server-source.md) 서버 모드 출처
  - [ADR-0134](0134-companion-sse-streaming.md) D2(끊겨도 서버는 턴을 끝냄 · client_message_id 멱등) · [ADR-0124](0124-chat-stream-native-sse.md) D4(재연결은 출처 몫)
  - [ADR-0062](0062-progress-cache-first.md) D6 · D7(자동 재시도는 조용히, 실패에 빨강 없음) · [ADR-0007](0007-app-internals-state-routing-data-errors.md) D4(네트워크 실패는 화면이 다룸)

## 맥락
- ADR-0137까지는 모든 실패가 회색 줄 「Message not sent. Please try again.」 하나였다. 어떤 글이 안 갔는지 · 어떻게 다시 보내는지가 없었고, 다시 입력해야 했다.
- 서버 오류 코드 20개 가운데 15개가 그 한 줄로 묶여 로그인 만료 · 앱 업데이트 필요 · 서버 혼잡이 구분되지 않았다.
- 답 도중 끊겨도 서버는 답을 끝까지 저장하는데(ADR-0134 D2) 앱은 다시 읽지 않았다. 방을 열 때 기록 · 첫 인사를 못 받으면 빈 방만 남았다.

## 결정

### D1. 「서버가 받았나」로 나눈다 (`companion-outcome.ts`, 순수)
- `start` 뒤에 끊겼으면 서버는 받았다 → **기록에서 채움**(D3).
- `start`를 받지 못했으면 **받았는지 모른다** — 서버는 글을 저장한 뒤 `start`를 보내므로 그 사이에 끊겼을 수 있다. **Not sent**로 두고 기록을 한 번 읽어 확인한다(서버에 같은 글이 2분 안에 있으면 서버 판으로 바꾸고, 답이 아직 없으면 채운다). 같은 id로 다시 보내면 서버가 가른다(멱등).
  - 끝 사유 `network` · `timeout-connect` · `timeout-idle` · `unavailable` · `cancelled`, 응답 본문이 서버 모양이 아님, 사전 오류 `turn_in_progress` · `duplicate_message` · `not_latest_message`.
  - 확인 없이 Not sent: `internal_error`. 까닭 줄도: `rate_limited` · `invalid_session` · `unsupported_contract_version`.
  - 서버에서 턴이 실패한 글(`status: failed`)은 기록에서 빼 보낸 글로 보이지 않게 한다.
- 받은 뒤 SSE `error` → 회색 줄: `guardrail_blocked` 「{name} can't reply to that…」, 그 밖 「{name} can't reply right now.」(다시 시도 경로가 없어 시키지 않는다).
- `invalid_session` 줄은 「You were signed out, so this message wasn't sent.」 — 회원 다시 로그인 경로가 없어 시키지 않는다.
- 앱 · 서버 버그 코드(`character_not_found` · `invalid_request` · `method_not_allowed` · `server_misconfigured` · 모르는 코드) → 「Something went wrong on our side…」.
- 차단 · 시간 · 연령(입력 줄) · 크레딧 · 대화 불가(회색 줄)는 ADR-0137 그대로.

### D2. 보내지 못한 글
- 옅은 주황 면 · 점선 · 진한 주황 글의 말풍선 + 「Not sent」 + ↻(빨강 없음). 말풍선이나 ↻을 누르면 대화상자 Send again · Delete · Cancel.
  - ui-lynx `Dialog`는 버튼이 둘까지라 앱 상자(`ChatModalFrame`)에 세로로 셋.
- Send again은 맨 앞 글부터 **같은 client_message_id**로 보내고, 성공하면 다음 것을 잇는다. Delete는 로그에서만 뺀다(서버에 없는 글).
- 보내지 못한 글이 있는 동안 새 글은 서버로 가지 않고 그 뒤에 Not sent로 쌓인다 — 순서가 섞이지 않게.
- 오프라인이면 스트림을 열지 않고 바로 Not sent(`companion-api`가 `NetworkStatusModule.current()`로 판단).
- 앱을 다시 켜면 남지 않는다(Q5).

### D3. 끊긴 답 채우기
- 「Getting the rest of the reply…」 줄을 띄우고 기록을 바로 한 번, 그 뒤 2 · 5 · 10 · 30초에 다시 읽는다. 그 답(`${assistantId}#…`)이 서면 서버 판으로 바꿔 끼운다.
- 30초 안에 못 채우면 「Reply didn't finish.」 + Refresh. 채우는 동안은 답을 기다리는 중이다 — 보내기 막힘, 칩이 오면 판 자동 열림.
- 기록 합치기(`chat-log-merge.ts`, 순수): 같은 id는 서버 판, 앱에만 있는 줄은 공통 줄 사이면 그 자리, 마지막 공통 줄 뒤면 끝. 앱이 턴에서 만든 고지(`<내 글>~n*`)는 서버가 그 턴의 notice 행(내 글 뒤 · 다음 내 글 전)을 넣었을 때만 버린다(위기 카드 · 실패 줄은 남김). 확인한 글의 턴은 그 뒤에 무엇이든 서면 끝난 것으로 본다(답 없는 차단 · 위기 턴).
- 다른 다시 읽기(앞으로 옴 · Try again)가 답을 채우면 stalled도 풀린다. 닫힌 방에 채워진 답은 안 읽음을 하나 올린다. 같은 보기면 보기를 바꾸지 않는다(판이 다시 열리지 않게).

### D4. 기록 실패
- 기록 · 빈 방 첫 인사를 못 받으면 `history: failed`. 빈 방은 가운데 「Couldn't load your chat」 + Try again, 글이 있는 방은 맨 위 「Couldn't load new messages.」 + Try again.
- 다시 열거나 Try again이면 처음부터(첫 인사 포함).

### D5. 앞으로 올 때 다시 읽기
- 호스트 `contentSyncOpportunity`(앱이 앞으로 옴 · 오프라인→온라인)에 열린 방을 조용히 다시 읽는다 — 끊긴 답 · 선톡 · 다른 기기 대화.
- 답을 기다리는 중 · 읽는 중 · 채우는 중이면 건너뛴다.

## 버린 대안
1. **연결되면 저절로 다시 보냄** — 한참 뒤 맥락이 어긋난 글이 가고 크레딧이 쓰인다(Q2).
2. **빨간 느낌표** — 학습 앱에서 빨강은 「틀렸다」로 읽힌다(Q4, ADR-0062 D7).
3. **끊기면 무조건 실패 줄** — 서버는 답을 끝까지 만든다. 실패로 보이면 다시 보내 크레딧을 두 번 쓴다.

## 대가
- 「답만 다시」가 없어 받은 뒤 답 실패(SSE error)는 안내만 있고 다시 시도가 없다(서버 3단계).
- `invalid_session`은 회색 줄 안내만 — 회원용 다시 로그인 경로가 없다(손님용 `guest-login`만).
- 연결 배너 · 목록 표시 · Back online은 호스트 연결 바뀜 이벤트가 필요해 2단계.
- 읽는 중 돌기(0.6초)는 넣지 않았다. 빈 방은 첫 인사 동안 입력 중 점만.
- `unsupported_contract_version`은 Not sent + ↻이지만 다시 보내도 성공하지 않는다(리뷰 S1 — 사용자 확인 대기).
- 상태 변화(Not sent가 됨 · stalled) 낭독, 대화상자를 닫은 뒤 초점은 ↻이 아니라 보내기 단추(리뷰 S4 · S5).
- 서버 판 찾기는 같은 글 · 2분 안(기기 시계)이다. 앱이 서버 id로 바꾼 뒤 서버에서 실패한 턴은 보낸 글로 남는다(리뷰 N1 · N4).
- 번들 +43.1 kB(상한 4,686,000).

## 테스트
- unit ES-U1 ~ U15(`companion-outcome` · `chat-log-merge` · `companion-api` 오프라인 · SSE error 코드 · 실패 행 빼기)
- integration ES-I1 ~ I19(`chat-fixture-delivery.integration.test.ts` — 가짜 원격, 리뷰 지적 I12 ~ I19)
- ui ES-UI1 ~ UI8(`MessengerChatScreen.delivery.ui.test.tsx` · `use-messenger-refresh.ui.test.tsx` — UI7 · 8 Android 접근성)
- e2e [수동 기록](../e2e/messenger-error-states.md)

## 재검토 조건
- 서버가 「답만 다시」 · 회원 재로그인 경로 · 2단계 호스트 이벤트를 줄 때
- 보내지 못한 글을 재시작 뒤에도 남겨 달라는 요청
