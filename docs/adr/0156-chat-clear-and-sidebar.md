# ADR-0156: 대화 비우기(Clear chat) · 채팅 설정 사이드바 정리 — My profile · 상대 프로필 숨김 · 추천 답변 토글

- 상태: **채택** (2026-11-17) — 마이그레이션 `20261211120000_companion_clear_chat.sql` 운영 미적용(SQL 편집기로 적용 필요).
- 날짜: 2026-11-17
- **사용자 결정** (2026-11-17):
  - 「채팅 지우기보단 clear chat으로 하고 내용 초기화해야할듯」 · 「지우기 할때는 모달도 뜨게」 · 범위는 「대화 + 기억 + 친밀도」.
  - 「채팅 설정 my profile은 설정에 있는 내페이지로 가게 하고 덕수 쌤 -> 는 일단 숨겨줘」.
  - 「이지선다 주는거 사이드바 메뉴에서 토글로 껐다켰다 되게 하기」.
- 바꾸는 결정: [ADR-0113](0113-messenger-chat-ui.md) 사이드바 O4의 「Delete chat」(방을 메모리에서만 지움) · 상대 프로필 줄 · 내 프로필 줄(무동작), [ADR-0126](0126-messenger-chat-settings.md)의 추천 답변 설정(기기 메모리 — 다시 켜면 씨앗으로).

## 맥락

- 「Delete chat」은 앱 메모리에서 방만 뺐다. 서버 기록은 그대로라 앱을 다시 켜면 방과 대화가 돌아왔다. 서버에는 학습자가 부르는 초기화가 없었다(시험 계정 운영용 `companion_operator_reset`뿐).
- 상대 프로필 · 내 프로필 줄은 1단계부터 누르면 아무것도 하지 않았다.
- 추천 답변 칩 설정(`replyIdeas`)은 설정 탭 Chats 화면에만 있었고 기기 메모리라 다시 켜면 켜진 채로 돌아왔다. 서버 프로필에는 이미 `reply_suggestions`(기본 참, 20261118)가 있고, 꺼진 계정에는 서버가 칩을 만들지 않는다(`chat-send` · `companion-suggest`).

## 결정

### D1. 대화 비우기 — 서버 함수 `companion_clear_chat(p_character_id)`

- 지운다: 그 인물과의 대화(`conversations` 행 — 메시지 · 교정 · 평가 · 신고는 외래 키로 함께), 그 인물만의 기억(`memories.character_id` = 그 인물), 친밀도 · 말투 단계(`relationships`).
- 남긴다:
  - 공유 기억(`character_id` null) — 다른 인물도 읽는 학습자 프로필이다.
  - 엽전 지갑 · 예약(`credit_holds`) · 체험 사용량(`trial_usage`) — 덕수쌤 무료 20통을 다시 받지 않게.
  - 앨범(`companion.media`) — 대화에 외래 키가 없어 남고 「From a past chat」으로 보인다([ADR-0146](0146-companion-snapshot-voice.md) · [ADR-0150](0150-companion-media-album.md)).
  - 일시 차단 · 고지 상태(계정 단위).
- 진행 중인 턴(보류된 내 글, `companion.pending_timeout()` 3분 안)이 있으면 지우지 않고 `{ status: "busy" }` — 턴 마무리가 사라진 메시지를 찾다 실패하지 않게. 오래된 보류는 함께 지운다.
- `SECURITY DEFINER` · `search_path = ''` · `auth.uid()`만(없으면 28000) · 모르는 인물 22023 · `authenticated`에만 실행 권한. 여러 번 불러도 `{ status: "cleared" }`.

### D2. 앱 — 확인 모달 뒤 방은 남고 대화만 빈다

- 사이드바 마지막 줄 「Clear chat」 → 확인 모달(`ClearChatDialog`): 제목 「Clear this chat?」, 설명은 대화와 그 인물이 기억하는 것이 지워지고 되돌릴 수 없으며 사진은 앨범에 남는다는 것, 버튼 Cancel · Clear(위험 색).
- Clear → `source.clearRoom(roomId)`:
  - 서버 방: `companion_clear_chat`이 `cleared`를 준 뒤에만 방을 빈 채로 되돌리고(목록에 남음 · 열림 그대로), 열린 방이면 기록을 다시 읽어 비었으니 첫 인사를 받는다. 답을 기다리는 중이면 서버를 부르지 않고 `busy`.
  - 앱 안 방: 기기에서만 처음 모습(씨앗 opening 한 줄)으로.
  - 성공하면 겹침을 모두 닫는다(`dismiss-overlays`). 못 비우면 모달이 남아 설명 자리에 까닭(답 기다리는 중 · 연결 실패)이 서고, 같은 Clear로 다시 시도한다. 대화는 그대로다.
- `deleteRoom`(메모리에서 방 빼기)은 테스트 · 옛 길로만 남는다.

### D3. My profile → 설정 탭 User profile

- 사이드바 「My profile」 줄을 누르면 사이드바를 닫고 설정 탭으로 옮겨 User profile 화면(`profile`)을 쌓는다. 뒤로 가면 설정 탭 루트다.

### D4. 상대 프로필 줄(「덕수쌤 →」) 숨김

- 프로필 화면이 생길 때까지 그리지 않는다(코드 · test-id `sidebarProfile` · 문구 `viewProfile`은 남김). 줄 순서: ①엽전 ②내 프로필 ③이야기 시점 ④앨범 ⑤생년 ⑥기억 ⑦교정 방식 ⑧추천 답변 ⑨Clear chat.

### D5. 추천 답변 토글 — 사이드바에도, 계정마다 남는다

- 사이드바 ⑧에 설정 탭 Chats와 같은 「Reply ideas」 스위치(`SettingsCell` toggle, 낭독은 스위치 · 켜짐/꺼짐). 같은 값(`preferences.replyIdeas`)이라 두 곳이 늘 같다. 꺼지면 방의 칩 · 보기 판은 지금처럼 숨는다(새 화면 쪽 변경 없음).
- 저장(`reply-ideas-pref.ts`):
  - 기기 — `libitum.messenger.reply-ideas` `{ <출처 키>: boolean }`(계정마다). 다시 켜도 꺼진 채로 시작한다.
  - 서버 방 — 바꾸면 `companion_save_profile(p_reply_suggestions)`, 시작할 때 `companion_load_profile`의 `replySuggestions`를 읽어 학습자가 아직 안 바꿨으면 따른다(다른 기기 · 재설치). 서버는 꺼진 계정에 칩을 만들지 않아 모델 호출도 줄어든다.

## 버린 대안

1. **방을 목록에서 지우기(지금 그대로)** — 다시 켜면 돌아오고, 사용자가 원한 것은 「내용 초기화」다.
2. **체험 사용량까지 되돌리기** — 비우기를 반복해 덕수쌤 무료 20통을 계속 받는다.
3. **공유 기억까지 지우기** — 다른 인물이 아는 학습자 정보까지 사라진다. 인물 하나와의 초기화가 범위다.
4. **My profile을 메신저 스택에 쌓기** — User profile 화면의 나가기가 설정 스택 루트로 접는 길이라 메신저 목록으로 튀었다. 설정 탭으로 옮겨 쌓는다.

## 대가

- 비운 뒤 그 인물은 학습자를 처음 만난 듯 말한다(존댓말 · 기억 없음). 되돌릴 수 없다.
- 앨범의 사진 · 음성은 남아 「From a past chat」으로 보이고, 다시 그리기는 막힌다(ADR-0150 D6).
- 추천 답변 설정이 서버 값을 따르는 것은 출처를 만들 때 한 번이다 — 바로 다시 그리지는 않고, 다음 화면 갱신 때 보인다.
- 운영에 마이그레이션을 적용하기 전에 이 앱이 나가면 서버 방의 Clear는 늘 「연결 실패」로 끝난다(대화는 그대로).

## 구현

- DB: `20261211120000_companion_clear_chat.sql`. 테스트 CC1 ~ CC4(`companion-clear-chat.integration.test.ts`).
- 앱(`apps/mobile/src`):
  - `screens/messenger-chat/chat-room-reset.ts`(clearRoom · deleteRoom) · `ClearChatDialog.tsx` · `ChatSettingsSidebar.tsx` · `ChatRoomOverlays.tsx` · `chat-room-state.ts`(`clear-confirm` · `dismiss-overlays`) · `reply-ideas-pref.ts` · `chat-fixture-settings.ts`.
  - `lib/companion-api.ts`(`clearChat` · `saveReplySuggestions`) · `companion-parse.ts`(`clearOutcomeFrom` · `profileFrom.replySuggestions`).
  - `app/messenger-chat-wiring.ts`(`onOpenMyProfile` · `replyIdeasStore`) · `render-messenger-chat.tsx`.
  - 문구 5개 언어 `ui-copy-*-chat.ts`(`sidebar.clearChat` · `clearChat`).
- 테스트: unit CC-U1 ~ U5 · RI-U1 ~ U4, ui CC-UI1 ~ UI8, integration MC-I5(비우기로 고침), 기대값 변경 MC-UI22 · CS-UI 순서 · SnapshotSelf 앨범 줄 순서 · MC-U11 · 포커스 · SA-U7.
- 배포 순서: 마이그레이션 → 앱. 함수 배포는 없다.
