# ADR-0126 — 대화 설정: 설정 탭 Chats 화면 · 먼저 보내는 메시지 시트 · 기억 화면 · 방 사이드바 기억 · 교정 방식

- 상태: **채택 — 1단계(가짜 출처).** 서버 결선 0 · 분석 이벤트 0 · 저장 키 0 · 호스트 모듈 0.
- 날짜: 2026-11-11.
- **사용자 결정**: 결정 문서 8번(2026-11-10, [AI 컴패니언 ↔ 메신저 UI 통합 결정](https://claude.ai/artifact/9BTvrL4GfTxvMrAUzwJr1x)) — 계정 하나의 값(추천 답변 · 먼저 보내는 메시지 · 공유 기억 · 생년)은 **설정 탭 「Chats」**, 인물마다의 값(그 인물의 기억)과 방에서 바꾸고 싶은 값(교정 방식)은 **방 사이드바**. 시안 https://claude.ai/artifact/Y47wvJB1SZvKSDq9RAZmUw(「확인 진행」).
- 이어받는 결정: [ADR-0113](0113-messenger-chat-ui.md)(대화 출처 포트 · 사이드바 · 겹침 — 적용 기록), [ADR-0125](0125-messenger-safety-ui.md)(생년 시트 · `flatten={false}` · `accessibility-enable-tap` · 시트 닫힘 뒤 숨은 입력 초점 — 적용 기록).
- 다루지 않는 것: 서버 저장(`companion_preferences` · `companion_memories` — 컴패니언 PR이 들어온 뒤), 먼저 보내는 메시지의 실제 발송 · 푸시, 18세 미만에게 먼저 보내는 메시지를 끄는 표시, 교정 방식이 실제 답에 미치는 효과(서버 프롬프트).

## 결정

### D1. 대화 출처 포트에 설정 · 기억을 더한다 (추가만)
- 목록 스냅숏 `preferences { replyIdeas, proactive: off | daily1 | daily2, proactiveHour: 0~23 | null, feedbackMode: separate | natural | prefix }`, `setPreferences(patch)` — 틀린 칸(시각 24 · 모르는 빈도)은 버리고, 바뀐 것이 없으면 알리지 않는다.
- 기억: `memories(scope)` → `{ memories: [{ id, content, edited, createdAt }], count, cap, full }`(같은 상태면 같은 참조), `updateMemory(id, content)`(앞뒤 공백을 걷어 1~500자만, 고치면 `edited`), `deleteMemory(id)`. 층은 `shared`(상한 30) · `character { characterId }`(상한 50) — 서버 초안 상한과 같다.
- 추천 답변을 끄면 **모든 방의 `thread.ideas`가 빈 배열**이 되고, 방의 전구는 이미 있던 규칙(보기가 없으면 꺼짐)으로 꺼진다. 「…」 메뉴의 New reply ideas도 그리지 않는다(눌러도 아무 일이 없으므로) — 메뉴를 열 때 초점은 Fix로 간다. 방마다의 `settings.autoIdeas`는 포트에 남지만 사이드바 토글은 지웠다(아래 D4).
- 가짜 출처: 기본 씨앗에 공유 기억 둘 · 미나 둘 · 사장님 하나. 앱을 다시 켜면 씨앗으로 돌아간다(1단계 가짜 데이터와 같은 성질).

### D2. 설정 탭 「Chats」 → Chats 화면 (route `chat-settings`)
- 설정 탭 **학습 묶음의 끝**에 「Chats」 줄(설명: 추천 답변 · 메시지 · 기억). 새 묶음을 세우지 않았다 — 묶음 구성(학습 · 계정 · 계정 동작)을 고정한 테스트 · 접근성 이름을 그대로 둔다. 내비 대상 목록(`settingsNavTargetsFor`)이 아니라 따로 둔 줄이라 분석 이벤트가 없다.
- 화면: While chatting(Reply ideas 스위치) · Messages from characters(They message you first → 시트) · About you(What everyone knows about you → 기억 화면, Birth year → ADR-0125 생년 시트 — 닫을 수 있음) · 각주(인물 기억은 방 ☰에서).
- 시스템 뒤로: 시트가 열렸으면 시트만 닫고(저장 없음), 아니면 설정 탭으로.

### D3. 먼저 보내는 메시지 시트
- 빈도 셋(Off · Once a day · Twice a day)은 라디오 줄, 시각(Any time · 9 · 12 · 18 · 21시)은 알약. **Off면 시각을 고를 수 없다**(흐리게 · 탭 없음 · `disabled`). 조용한 시간(22~8시) · 하루 두 번이면 약 10시간 뒤라는 안내. **Save를 눌러야 저장**한다.
- 시각 표기는 언어별(en 「9 PM」, es · ja 「21:00」, id 「21.00」, vi 「21:00」 — PrimJS에 `Intl`이 없어 문구가 쓴다).

### D4. 방 사이드바 — 자동 보기 토글 자리에 두 줄
- 여섯째 「What {이름} remembers」(값: `n / 50`, 가득이면 `· full`) → 사이드바를 닫고 **메신저 스택에 기억 화면**(route `chat-memories`)을 쌓는다. 뒤로 = 방.
- 일곱째 「Correction style」(값: 지금 방식) → 시트(라디오 셋 — Card only(기본) · Naturally in the reply · Point it out first, 「모든 캐릭터에 다음 메시지부터」 안내). Save해야 저장, 닫으면 사이드바로 · 초점은 그 줄로. 지우기는 여덟째.
- 자동 보기 토글은 지웠다 — 설정 탭 Reply ideas 하나가 모든 방에 적용된다(시안 주석).

### D5. 기억 화면 (route `chat-memories { characterId | null, characterName | null }`)
- 공유 층 · 인물 층이 같은 모양: 머리(뒤로 · 제목 · `n / 상한`) · 가득이면 알림 상자 · 안내 · 목록(글 · 날짜 「11/9」 · 고쳤으면 「Edited」 · 고치기 · 지우기 단추) · 비면 빈 문구.
- 고치기는 대화상자(앱 `ChatModalFrame` + ui-lynx `TextField`, 500자 카운터, 빈 글이거나 **바꾼 것이 없으면 Save 꺼짐** — 출처도 같은 글이면 무동작이라 「Edited」는 실제로 바뀐 글에만 붙는다), 지우기는 확인 대화상자. 시스템 뒤로는 대화상자만 닫는다.
- 날짜는 목록 시각과 같은 언어별 표기(`messengerChat.time.date` — en 「11/9」, es · id · vi 「9/11」, ja 「11月9日」). `Intl`이 없어 문구가 순서를 정한다.
- 화면은 `useChatMemories(source, scope)`로 그 층의 참조를 구독한다 — 기억이 바뀌어도 목록 스냅숏은 그대로라 스냅숏 구독으로는 다시 그려지지 않는다.

### D6. 접근성 (Android 기기 확인에서 정함)
- 새 탭 요소는 모두 `flatten={false}` · `accessibility-enable-tap`(ADR-0125 D3과 같다). 라디오는 「…, selected」로 읽고 `accessibility-role-description="radio"`.
- **글도 접근성 요소로 세운다** — 섹션 제목(heading) · 각주 · 시트 설명 · 라벨 · 안내 · 기억 개수 · 빈 문구. Android는 접근성 요소가 아닌 `<text>`를 펴서 트리에서 지웠다. 같은 까닭으로 공용 `ChatHeader`의 제목에도 `flatten={false}` · `accessibility-element`를 줬다(방 · 이야기 메신저 머리도 Android에서 제목이 읽힌다).
- 사이드바의 기존 Story point · Get coins 줄도 `flatten={false}` — 실제 접근성 트리(`uiautomator dump --compressed`)에 없었다.
- 사이드바 위 시트(교정 방식)를 닫아 **사이드바로** 돌아와도 숨은 `<input>`의 초점을 다음 프레임에 내린다 — ADR-0125의 처방은 겹침이 **다 닫힐 때만** 돌아 Android에서 Gboard가 떴다. 이제 「부모로 닫힘」이면 모두 내린다.

## 리뷰 (2026-11-11, review 에이전트)
- 1차 FAIL — es 문구가 이름이 들 때 복수 동사(C1). 고침: 이름 유무로 문장을 나눴다(CS-U15). 함께 고침: 같은 글 Save → Edited(W1) · 날짜 순서(W2) · 끔인데 New reply ideas(W4) · 기억 구독(W5) · 조건부 단언(W6) · 계획 빈칸(W7: 지우기 · 문구 · 이벤트 없음) · spec 문서 어긋남(W8) · vi 화폐 이름 xu(W9) · es 단수 compartido(W10) · default 낭독(S1). 기록만: 방 다시 마운트(W3, 대가), 지우기 확인 단추 색(S6 — 방 지우기 대화상자와 같은 ui-lynx Dialog 규칙은 따로 맞추지 않았다), CSS 글자 리터럴(S4 — safety.css 선례).

## 버린 대안
1. **설정 탭에 새 묶음 「Chats」** — 묶음 구성 · 접근성 이름을 고정한 테스트 열 개가 바뀌고 설정 탭이 길어진다. 학습 묶음 끝 한 줄로 충분하다.
2. **기억 고치기를 여러 줄 입력으로**(시안의 textarea) — ui-lynx `TextField`에 여러 줄이 없다. 한 줄 입력(가로 스크롤)으로 두고 500자 카운터를 붙였다. Fix request 대화상자와 같다.
3. **인물 기억 화면을 사이드바 안 겹침으로** — 목록 · 고치기 · 지우기 · 대화상자가 사이드바 폭(320)에 들지 않는다. 화면으로 쌓는다.
4. **설정 내비 대상(`SettingsNavTarget`)에 `chats` 추가** — 대상마다 분석 이벤트가 붙는 규칙이라 새 이벤트를 만들게 된다(이번 범위 밖).

## 대가
- 가짜 출처라 설정 · 기억은 앱을 끄면 사라진다. 서버가 들어오면 출처만 바꾼다(화면 · 포트는 그대로).
- 사이드바가 여덟 줄이 되어 작은 화면에서 지우기 단추까지 스크롤이 필요할 수 있다.
- `ChatHeader` 제목 접근성 변경이 방 · 이야기 메신저에도 닿는다(읽히는 요소가 하나 늘 뿐 조작은 같다).
- 앱 셸은 스택 맨 위 화면 하나만 그리므로, 방에서 인물 기억 화면에 다녀오면 방이 다시 마운트된다 — **입력 칸에 쓰던 글 · 열린 키보드가 사라진다.** 사이드바를 연 시점에 쓰던 글이 있는 경우는 드물다고 보고 감수한다(방 상태를 출처로 올리는 일은 서버판에서).
- 쓰지 않게 된 것: 사이드바 자동 보기 문구(`autoIdeas` · `autoIdeasDescription`) · test-id `sidebarAutoIdeas`(부재 단언용) · 출처 `setAutoIdeas` · 방 `settings.autoIdeas`, 기억 문구 `memories.length`. 서버판에서 포트를 정리할 때 걷어낸다.

## 테스트
- unit CS-U1 ~ U13(`chat-settings.unit.test.ts`): 규칙 · 리듀서 · 가짜 출처 설정 · 기억(같은 글 무동작). CS-U14 ~ U16(`lib/ui-copy-chat-settings.unit.test.ts`): 언어별 시각 · es 수 일치 · 개수 표기.
- ui CS-UI14 ~ UI17: 바꾸지 않으면 Save 꺼짐 · 대화상자 없이 바뀐 기억도 다시 그림 · 끔이면 메뉴에 New reply ideas 없음 · default 꼬리표 낭독.
- ui CS-UI1 ~ UI13: 사이드바 두 줄 · 토글 없음 · 교정 방식 흐름 · 기억 줄 · Chats 화면 · 시트 · 뒤로 · 기억 화면 · 고치기 · 지우기 · 숨은 입력 초점. 기존 MC-UI22(줄 순서 1~8) · 설정 탭 줄 목록 테스트를 고쳤다.
- integration CS-I1 ~ I4(`App.chat-settings.integration.test.tsx`) — 인물 기억 지우기 뒤 사이드바 개수, 분석 이벤트 없음 포함.
- e2e: [수동 기록](../e2e/messenger-chat-settings.md) — Android 에뮬레이터 · iOS 시뮬레이터.

## 재검토 조건
- 컴패니언 서버(`companion_preferences` · 기억 RPC)가 들어오면 출처를 서버로 바꾸고 상한 · 글자 수를 서버 값과 맞춘다.
- 18세 미만에게 먼저 보내는 메시지를 끄는 규칙이 정해지면 시트에 표시를 더한다.
- ui-lynx `TextField`에 여러 줄이 생기면 기억 고치기를 그것으로 바꾼다.
