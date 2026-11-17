# ADR-0150: 사진 · 음성 2단계 — 앨범 · 사진 속 내 모습 · 다시 그리기

- 상태: **채택** (2026-11-15)
- 날짜: 2026-11-15
- **사용자 결정** (2026-11-15): 시안(artifact N2RXQUcsvgv1iERwFGFmXy)의 추천안 M1 ~ M7 전부 — 「진행」.
- 다루는 축: ADR-0146 D5 ~ D7(저장본 · 다시 그리기 · 앨범 · 학습자 모습)의 앱 화면. 서버 모양은 0146 그대로이고 앨범 칸 두 개만 더한다.

## 맥락

- ADR-0146 「앱 연결」 1단계(#442)는 방의 Snapshot · Snap voice를 서버에 이었다. 새 화면은 두지 않았다.
- 그래서 세 가지가 서버에만 있고 앱에서 닿을 수 없었다.
  - 앨범(`companion_list_media`)
  - 학습자 모습(`companion_save_profile(p_snapshot_self)`)
  - 다시 그리기(`again: true`)
- 방에는 기록 첫 쪽(30) 밖 메시지의 결과를 다시 놓지 않는다. 그래서 옛 사진 · 음성은 앨범이 아니면 다시 볼 길이 없다.

## 결정

### D1. 앨범은 방 사이드바 「Album」 줄에서, 인물마다 [사용자 M1]
- 줄 자리: 이야기 시점 다음(data-order 5). 뒤 줄은 하나씩 밀린다(생년 6 · 기억 7 · 교정 방식 8 · 지우기 9).
- 화면: 메신저 스택의 `chat-album {roomId, characterName}`. 뒤로 가면 방이다.
- Chats 목록의 전체 앨범(A2)은 두지 않는다.

### D2. 한 격자 + All / Photos / Voice 탭, 날짜 묶음 [사용자 M2]
- 날짜 묶음: 기기 시간대로 Today · Yesterday · 월 일.
- 사진은 메시지마다 한 칸이다. 최신 판이 칸이 되고, 판이 둘 이상이면 「N versions」 띠를 단다. 판은 사진 보기 안의 번호 칩으로 고른다 [추론].
- 쪽은 30개다. 「Show more」는 가장 오래된 칸의 시각을 커서(`p_before`)로 다음 쪽을 읽는다.

### D3. 대화를 지워도 앨범에 남고 「From a past chat」 [사용자 M3]
- 서버 `media_json`에 두 칸을 더한다(마이그레이션 `20261203120000`). `companion_list_media` · `companion_get_media` · 시작 · 마침 응답이 모두 이 함수를 쓴다.
  - `fromPastChat`: 그 메시지가 없다(대화 초기화로 지워짐).
  - `line {ko, en}`: 만들 때 저장한 말풍선(`media.source`)의 말 조각을 이어 붙인다. 말 조각이 없으면 지문을 쓴다.
- 지난 대화의 칸은 다시 만들 수 없다. `companion_media_begin`이 메시지를 찾지 못한다. 그래서 Redraw · Record again을 숨긴다.
- 옛 서버(칸 없음)는 빈 말 · false로 읽는다. 앱이 먼저 나가도 깨지지 않는다.

### D4. 「You in snapshots」는 Chats 설정 About you에 [사용자 M4]
- 시트에서 Woman · Man · Just hands(female · male · hidden) 중 고르고 Save한다. 얼굴은 늘 그리지 않는다고 알린다.
- 앱 값은 `ChatPreferences.snapshotSelf`다. null이면 아직 고르지 않은 것이고, 이때는 서버 기본(female)을 보인다.
- 바뀌면 두 곳에 적는다.
  - 기기: `libitum.messenger.snapshot-self`, 계정(출처 키)마다.
  - 서버 방이면 서버: `companion_save_profile(p_snapshot_self)`. 다른 칸은 null이라 바꾸지 않는다.
- 한 번 고르면 null로 되돌리지 않는다.

### D5. 첫 Snapshot에서 한 번 묻는다 [사용자 M5]
- 고른 적이 없으면 사진 요청 모달 안에 「How should you appear?」 칩 셋이 선다. 기본은 Woman이다.
- 확정하면 고른 값을 **요청보다 먼저** 저장한다. 서버가 그 값으로 그린다.
- 음성 · 이미 고른 경우는 묻지 않는다.

### D6. Redraw는 사진 보기 안에서만, 음성은 재생 시트의 Record again [사용자 M6]
- 값: 사진 25(보기는 늘 앞 그림이 있음; 없으면 35는 서버 규칙 그대로), 음성 15. 확인 모달이 값과 잔액을 보이고, 모자라면 주 버튼이 Get Yeopjeon이다.
- 엽전을 내는 곳:
  - 서버 방: 서버가 예약 · 확정한다. 앱 지갑에서 빼지 않는다.
  - 가짜 방: 화면이 앱 지갑에서 뺀다.
- 거절(엽전 부족 · 만드는 중 · 상한 · 대상 아님)은 앨범 위 회색 글로 보인다.

### D7. 방에서는 새 결과가 옛 결과 자리를 대신하고, 앨범엔 둘 다 [사용자 M7]
- 방 로그: 같은 메시지 · 같은 종류의 결과(사진 · 음성) 줄은 최신 하나만, 첫 줄의 자리에 선다(`collapseMediaResults`). 다시 열기(resume)에도 같다.
- 다시 만드는 동안 방에는 기존 자리표시자가, 앨범 칸에는 「Drawing…」(반짝임, 움직임 줄이기면 멈춤)이 선다. 방 로그에 자리표시자가 사라지면 앨범을 다시 읽는다.

## 적용

- 순수 규칙: `chat-album-rules.ts`, `collapseMediaResults`(chat-media-rules), `albumMediaOf` · `mediaPageFrom`(companion-media-parse).
- 출처: `chat-fixture-album.ts`(앨범 포트 · 내 모습 저장), `chat-remote-send.ts`(요청 · 다시 만들기 공용), `remake`(chat-remote-media).
- 어댑터: `companion-media-api.ts`(`again` · `list` · `saveSelf`).
- 화면: `ChatAlbumScreen` · `AlbumTile` · `AlbumPhotoViewer` · `AlbumVoiceSheet` · `RemakeDialog` · `SnapshotSelfSheet` · `AskMediaOverlay`, `NavRow`(사이드바 · Chats 공용).
- 문구: 5개 언어 `ui-copy-*-chat-album.ts`.
- `MESSENGER_MEDIA_READY`는 false 그대로다. 기기 e2e(`docs/e2e/companion-media-album.md`) 뒤에 함께 켠다.

## 대가 · 남는 것

- 다른 기기에서 바꾼 모습은 이 기기에 늦게 온다. 기기 값을 먼저 쓰고, 서버에서 다시 읽지 않는다 [추론].
- 기록 첫 쪽 밖의 옛 메시지를 다시 만들면 결과는 앨범에만 선다. 방 로그에 그 대상이 없어서다. 그 사이 앨범은 「Drawing…」이 곧 걷히고 다시 읽는다.
- 앨범 칸 수(사이드바 설명 「12 photos · 4 voice messages」)는 RPC가 없어 보이지 않는다. 설명은 고정 문구다.
- 마이그레이션 `20261203120000`은 운영에 적용하지 않았다(사용자 작업). 적용 전에도 앱은 빈 말 · false로 동작한다.

## 추가 (2026-11-17) — 방에서 사진을 누르면 사진 보기 [사용자]

- 결정: 방의 다 만든 사진(그림이 있는 사진 줄)을 누르면 앨범과 같은 사진 보기(`AlbumPhotoViewer`)가 **방 위 겹침**으로 열린다. 앨범 화면으로 옮겨 가지 않는다 — 앨범을 다시 읽지 않고 바로 열리며, 닫으면 방 그대로다.
- 칸은 방 로그의 사진 줄로 만든다(`chatPhotoTile` — 앨범의 `albumItemsFromLog`와 같은 칸). 그때의 말 · 판(같은 메시지의 사진들, 오래된 것부터) · 다시 그리는 중(방에 자리표시자)이 앨범과 같다.
- Redraw도 앨범과 같다: 확인(`RemakeDialog`, 25) → `source.album.remake`. 결과 · 거절은 방에 줄로 선다. 가짜 방은 앱 지갑에서 내고, 모자라면 엽전 상점. 확인 · 상점을 닫으면 방으로 돌아온다(앨범처럼 사진 보기로 돌아가지 않는다).
- 만드는 중 · 그림 없는(서명 URL 없음) 사진은 누를 자리가 없다. 누름 자리는 묶음 전체이고 낭독은 단추(문구는 기존 사진 말 그대로)다.
- 열면 키보드 자리 · 보기 판을 접는다(겹침 상태 `photo` · `photo-redraw`). 시스템 뒤로가기는 겹침부터 닫는다(`useChatRoom`이 단 하나의 주인).
- 닫힌 뒤 낭독 초점은 플랫폼에 맡긴다 — 같은 test-id의 사진이 여럿이라 누른 그 사진을 가리킬 수 없다.
- 적용: `chat-album-rules.ts`(`chatPhotoTile`), `chat-room-state.ts`(겹침 · `openPhotoAction`), `ChatPhotoLayer.tsx`, `ChatRoomOverlays.tsx`, `ChatMediaBubbles.tsx`(`onOpen`), `ChatMessageRows.tsx`(`onOpenPhoto`). 테스트 CV-U1 ~ U5 · CV-UI1 ~ UI5.
