# ADR-0129 — 교정 카드 3종 · 고친 문장 다시 보내기 · 답 평가(👍 👎)

- 상태: **채택 — 1단계(가짜 출처).** 서버 · 분석 · 저장 키 · 호스트 변경 0.
- 날짜: 2026-11-12.
- **사용자 결정**: 「교정 · 평가 진행 시안부터」 → 시안 https://claude.ai/artifact/Mz2rLEwvJ2FWHaxZKB7HcU → 「진행」(시안의 기본값 그대로 — 👍 👎는 최근 답 하나 아래, 다시 보내기는 카드 안, 「Ask for a fix」 제거). 결정 문서 4 · 결정 5 · 6([AI 컴패니언 ↔ 메신저 UI 통합 결정](https://claude.ai/artifact/9BTvrL4GfTxvMrAUzwJr1x)).
- 이어받는 결정: [ADR-0117](0117-messenger-chat-turns-coins-new-friend.md)(내 말풍선 연필 카드), [ADR-0125](0125-messenger-safety-ui.md)(신고 시트), [ADR-0126](0126-messenger-chat-settings.md)(교정 방식).
- 근거(서버 명세 · 컴패니언 PR #400 `docs/specs/ai-companion-api.md`): 교정 카드 §4.2 `{kind correction|better|l1_to_ko, original, corrected, items[], better, meaning}`, 평가 `companion_rate_message(p_message_id, p_rating up|down|null, p_reasons[5], p_note ≤200)`, 다시 보내기 `chat-send`의 `replaces_message_id`(마지막 내 글만, 아니면 409 `not_latest_message`, 옛 턴은 숨김).

## 결정

### D1. 교정 데이터는 서버 카드 모양
- `ChatCorrection = { kind, corrected, changes, items[{original, corrected, reason}], better{text, meaning, explanation}|null, meaning|null }`(`chat-feedback.contract.ts`). 옛 `explanation` 한 줄은 없앴다.
- `changes`(고친 문장 안 바뀐 범위)는 앱 강조용으로 남긴다 — 서버가 주지 않으면 서버 출처 결선 때 `items`에서 계산한다.

### D2. 연필 카드 — 제목이 종류를 말한다
- correction = 「FIX」: 고친 문장(바뀐 곳 강조) · 고친 곳마다 「원래 → 고침 · 이유」 · 더 나은 표현(있으면 「MORE NATURAL」 칸).
- better = 「MORE NATURAL」: 더 나은 글 · 뜻 · 설명. l1_to_ko = 「IN KOREAN」: 한국어 글 · 뜻.
- 본문은 낭독 요소 하나(`correctionSpoken` — 문장 부호를 겹치지 않는다), 다시 보내기 단추는 그 밖 형제(Android에서 따로 초점).

### D3. 고친 문장 다시 보내기
- 단추(「Send corrected」, l1_to_ko는 「Send in Korean」)는 **마지막 내 글이고 그 뒤가 캐릭터 글 답뿐이며 답을 기다리는 중이 아닐 때만**(`resendableMessageId`). 기다림은 출처가 `ChatThread.awaitingReply`로 알린다.
- **누르는 순간 출처의 최신 방으로 다시 판정한 뒤에만 관문을 지난다**(`resendIfReady` · `readyResend` — 리뷰 C1: 같은 렌더 안 연속 탭이 무료 수 · 엽전만 두 번 쓰고 한 통만 가던 길). 👍도 최신 방을 읽는다.
- 누르면 보내기 관문(무료 수 · 엽전 — `useChatTurns.authorizeSend`)을 지나고, 옛 턴(내 글 · 그 뒤 답)과 그 노트 · 평가를 지우고 고친 글(better면 더 나은 글)을 새로 보낸다. 서버도 새 턴 기준으로 센다.

### D4. 답 평가 👍 👎 — 가장 최근 캐릭터 글 아래에만
- 👍는 바로 저장, 다시 누르면 지움(`rating null`). 켜진 쪽은 `data-on` · 낭독 「…, selected」.
- 👎는 이유 시트. 지난 캐릭터 글에 남은 평가는 결과 한 줄(「You liked this」 · 「You flagged this」)만 — 고치기는 다음 단계(길게 누르기 메뉴).
- 위기 안내 · 고지 줄 · 사진 · 음성에는 없다(글 답만).

### D5. 👎 이유 시트
- 서버 이유 다섯을 여럿 고른다(시트 순서 고정), 하나 이상이면 Send. 메모 선택 200자(코드 포인트). 닫기 · 뒤로는 저장하지 않는다.
- 「Made me uncomfortable」을 고르면 「Want us to look at this message?」 · 「Report」 — 평가를 저장하고 신고 시트(ADR-0125)를 연다. 신고 사유는 새로 고른다.
- 닫히면 접근성 초점은 👎 단추로 돌아간다(`focusOriginOf` = `rating`). 👎에서 넘어간 신고 시트도 `from: "rating"`을 실어 닫히면 👎로(리뷰 W2).
- 다시 보내면 글 수는 같아도 로그가 끝으로 내려간다 — `jumpKey`가 마지막 내 글 id.

### D6. 「…」 메뉴의 「Ask for a fix」 제거
- 👎 이유가 대신한다. 대화상자 · 출처 `requestFix` · 문구 · test-id를 지웠다. 메뉴 상자 최소 높이는 항목 둘 120(추천 답변이 꺼져 Report 하나면 구분선 없이 64 — 기기에서 빈 칸이 남았다).
- 신고 · 👎 시트의 체크 줄은 `CheckRow` 하나를 함께 쓴다.

## 버린 대안
1. **모든 캐릭터 글 아래 👍 👎** — 로그가 아이콘으로 덮이고 학습 글이 밀린다. 지난 글은 결과 한 줄만.
2. **다시 보내기 = 입력 칸에 고친 글을 채워 주기** — 한 번 더 눌러야 하고, 서버 `replaces_message_id`(옛 턴 숨김)와 맞지 않는다.
3. **「Ask for a fix」 유지** — 자유 글 요청은 서버 계약에 없다. 평가 이유 · 메모가 같은 몫을 진다.

## 대가
- 1단계 평가 · 다시 보내기는 가짜 출처 메모리에만 — 앱을 다시 켜면 사라진다.
- 시트 설명 줄이 Android에서 빈칸으로 보인다 — 신고 시트(기존)도 같아 ui-lynx `BottomSheet` description의 기기 문제로 따로 본다(이 변경 밖).
- 번들 +32.9 kB(상한 4,600,000).

## 리뷰 (2026-11-12, review 에이전트)
- FAIL → 고침: C1(연속 탭 이중 차감 — 누르는 순간 재판정, CR-U13 · U14), W1(기다림 신호 `awaitingReply`), W2(신고 초점), W3(헛통과 CR-U7 · U8 다시 씀), W4(엽전 모자람 · 메모 저장 · 초점 통합 CR-I7 · I8), W5(ja 「報告しました」→「よくないと伝えました」), S1(끝으로 내림), S2(👍 연속 탭), S4(👍 👎 44 × 44), S7(지운 대화상자 주석). 기록: W6(BottomSheet 설명 줄 — 이 변경 밖), S3(불러오는 중 제목 BETTER 유지), S5(메모 칸 길이 — TextField 카운터), S8(가짜 교정 이유는 영어만), S9(번들 여유).

## 테스트
- unit CR-U1 ~ U15(`chat-feedback.unit.test.ts` · `chat-room-state.unit.test.ts`), ui CR-UI1 ~ UI8(`chat-feedback.ui.test.tsx`) · 메뉴(CS-UI16), integration CR-I1 ~ I8(`MessengerChatScreen.feedback.ui.test.tsx`).
- e2e: [수동 기록](../e2e/messenger-correction-rating.md).

## 재검토 조건
- 서버 출처 결선(교정 카드 · 평가 · `replaces_message_id` 409 처리), 지난 글 평가 고치기(길게 누르기 메뉴), 시험 계정 차감 정책(ADR-0128 사용자 결정 추가).
