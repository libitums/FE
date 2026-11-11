# ADR-0113 — 메신저 자유 대화 UI 1단계: 탭 넷 · 공용 chat 부품 · 가짜 대화 출처 · 키보드 전환 규칙

- 상태: 채택 ⟨2026-11-09⟩ — 1단계(UI만, 서버 없음)
- 요청: 「채팅 기능 넣을 때 가상 키보드 위에 전환 토글을 둬서 가상 키보드와 휴대폰 키보드를 자연스럽게 오가게」 → 시안 댓글 약 40건 → 「디자인된 것 기준으로 특정 브랜치에서 UI 작업 먼저」 · 「재사용을 생각해서 /change로」(사용자 발화, 2026-11-09)
- 시안: https://claude.ai/artifact/L2X7mBoNe35u1ARbLkf5M5(키보드 전환 흐름 시안)
- 사용자 결정(2026-11-09): ① 스토어 빌드에서도 메신저 탭을 **바로 4탭으로 보인다** ② 학습 메신저와 겹치는 부품을 **지금 공용 부품으로 올린다** ③ 젬 잔액은 **앱의 실제 잔액**(`gemCount`)이다 — 가짜 값을 두지 않는다(⟨2026-11-10⟩ 재화가 엽전으로 바뀌어 지금은 보유 엽전 `coinCount` — 아래 D7) ④ 메신저 목록에도 **전역 머리(AppHeader)를 보인다** — **같은 날 뒤집었다: 메신저 목록에는 전역 머리를 그리지 않는다**(아래 「사용자 결정 추가」)
- 이어받는 결정(결정 문장은 바꾸지 않는다 — 각 ADR에 적용 기록): [ADR-0070](0070-keyboard-dock.md)(자판 도크 — route 표에 행 하나) · [ADR-0112](0112-keyboard-touch-input.md)(자판 — 선택 prop `height`) · [ADR-0088](0088-interlude-story-unit.md) D5(문자 막간 — 공용 부품으로 옮김, 모양 불변)
- 관련 설계: 자유 대화 서버 설계 ADR-0102 6판(브랜치 `docs/adr-0102-messenger-chat`, 아직 main에 없다 — 아래 「ADR-0102와의 관계」)

## 맥락

자유 대화는 서버(엣지 함수 · 동의 · 기억 · 사진 · 음성 허가증) 설계가 사용자 결정 대기 중이다(ADR-0102 6판 Q1 ~ Q8). 화면은 그 결정과 따로 굳힐 수 있다 — 목록 · 방 · 겹침 · 키보드 전환은 서버가 무엇을 돌려주든 같은 모양이다. 그래서 1단계는 **UI만** 만들고, 데이터는 계약된 가짜 출처 하나 뒤에 둔다. 2단계는 그 출처만 서버로 바꾼다.

학습 메신저(`StoryMessengerScreen`, ADR-0088 D5)는 이미 머리 · 말풍선 줄 · 입력 중 점 · 로그 · 답장 보기를 화면 안 함수로 갖고 있었다. 자유 대화가 같은 것을 또 만들면 두 메신저가 따로 늙는다.

ui-lynx dist는 예산 559.0 kB 중 557.8 kB를 쓰고 있어(여유 약 1.2 kB) 이 변경은 ui-lynx를 건드리지 않는다.

## 결정

### D1. 탭 넷 — 여정 · 롤플레이 · 메신저 · 설정 (사용자 결정 ①)

- `Tab`에 `"messenger"`가 셋째로 들어간다. route 둘: 탭 루트 `messenger-list`, 그 위에 쌓이는 `messenger-chat{roomId}`. `initialNav.stacks.messenger = [messenger-list]`, `TAB_ROOTS`에 `messenger-list`.
- 바 항목 아이콘은 `@libitums/icons/lynx/message`, 라벨(낭독 이름)은 en `Chats` · es `Chats` · id `Obrolan` · ja `チャット` · vi `Trò chuyện`. 타이밍 flag는 규칙대로 `libitum:navigation:messenger`(ADR-0019 수집기는 접두사라 코드 · 문서 변경 없음).
- ui-lynx 바(항목 64 · 간격 32 · 좌우 24)는 넷이면 400pt라 375 화면을 넘는다. **앱 쪽 CSS에서 간격 24 · 좌우 여백 16으로 덮어** 360pt로 줄인다(`components/bottom-navigator.css` — ui-lynx 계약은 그대로, [바텀 네비게이션 스펙](../specs/bottom-navigator.md) 적용 기록).
- 탭 전환 · keep-alive · Android 시스템 뒤로(탭 루트 → 여정 루트)는 다른 탭과 같은 규칙이다. 방(`messenger-chat`)에서는 탭 바가 숨는다.
- ~~메신저 목록 위에도 전역 머리(연속 학습 · 트로피 · 알림)가 선다(사용자 결정 ④).~~ 뒤집힘(2026-11-09): 목록에는 전역 머리가 없고 목록 자체 머리가 안전 영역 바로 아래에서 시작한다(`appHeaderVisibleOn`). 목록 자체 머리에는 「Chats」 제목과 잔액 칩이 있고, 칩은 상점을 겹침으로 띄운다(⟨2026-11-10⟩ 엽전 칩 · 엽전 상점 — D7).

### D2. 공용 부품 경계 — `components/chat/`에는 도메인 없는 일곱만 (사용자 결정 ②)

- `components/chat/`: `ChatHeader` · `ChatHeaderSide` · `ChatLog` · `ChatIncomingRow` · `ChatOutgoingRow`(사진 분기 포함) · `ChatTypingRow` · `ChatReplyOption`(+ 순수 `chatReplyOptionLabel`). test-id는 부르는 쪽이 넘긴다. 말풍선 · 아바타는 ui-lynx `ChatBubble` · `Avatar`를 그대로 쓴다.
- 학습 메신저의 클래스 18개는 선언 그대로 `chat-*`로 이름만 옮겼다 — DOM 순서 · 크기 · 색 · 낭독은 같고, 기존 `StoryMessengerScreen` ui 테스트는 고치지 않고 통과한다(AC15). `storyMessengerTestIds` · `StoryMessengerCopy` · `useStoryChat`은 그대로다.
- 자유 대화에만 있는 것(전구 · 알약 · 토글 · 「…」 메뉴 · 겹침 여덟 · 사진 · 음성 말풍선)은 `screens/messenger-chat/`에 남는다. 2단계에서 학습 쪽이 필요해질 때 올린다.

### D3. 데이터는 포트 하나 — `ChatSource`, 1단계 구현은 픽스처

- `chat-source.contract.ts`의 `ChatSource`가 목록 스냅샷 · 방 스레드 구독 · 보내기 · 사진/음성 요청 · 고쳐 주세요 · 신고 · 보기 다시 만들기 · 지우기를 진다. 1단계 구현 `createFixtureChatSource`는 시드(인물 넷 — 미나 · 가게 주인 · 익선 게스트하우스 · 잠긴 가게 점원, 아바타는 기존 `mina-casual` · `yunkyung-casual`만 재사용)와 정해 둔 답장(입력 중 약 0.6초 → 답 약 2.4초, 사진 · 음성은 스켈레톤 약 3초 → 도착)을 낸다. 새 인물 · 그림을 지어내지 않는다.
- 타이머는 주입한다(테스트는 가짜 시계). 출처는 앱 결선(`app/messenger-chat-wiring.ts`)이 모듈 싱글턴 하나로 들고, 로그아웃과 무관하다. 지우기는 가짜 출처에서만 그 방을 뺀다.
- 자리 상수(가격 30 · 10, 신고 사유, 고쳐 주세요 최대 200자, 보기 수 3, 타이밍)는 `chat-placeholders.ts` 한 파일이다.
- 새 분석 이벤트 · 네트워크 요청 · 권한 · 저장 키는 없다(데이터는 번들 안).

### D4. 키보드 규칙 — 순수 `keyboardPlanFor` + 네이티브 자리 포트 둘

- 학습 문항(TypingActivity)은 지금처럼 늘 학습 키보드다 — 포트를 읽지 않는다(MC-I7).
- 자유 대화: 포트 `KoreanKeyboardProbe`가 `present`면 휴대폰 키보드만(토글 없음), `absent` · `unknown`이면 **학습 키보드가 기본 + 입력 줄 아래 토글 줄**(「Hangul keys」 · 「Phone keyboard」).
- **1단계의 포트는 둘 다 빈 구현이다** — `unknownKoreanKeyboardProbe`는 늘 `unknown`, `emptyKeyboardHeightStore`는 늘 `null`. 네이티브 감지 · 실제 키보드 높이 저장은 2단계 일이다. 그래서 1단계 화면은 늘 학습 키보드 + 토글이다.
- 전환: 학습 → 휴대폰은 학습 키보드를 깔아 둔 채 입력에 focus(오르는 휴대폰 키보드가 위를 덮는다), 휴대폰 → 학습은 학습 키보드를 먼저 깔고 blur. **글이 정본**이고, 학습 키보드는 `keysFromText`로 글을 자모로 되감아 조합을 이어 간다.
- 방 route는 셸 모드 `keyboard-dock`이다(`shellEdgeModeFor` — ADR-0070 D2 표에 한 행).

### D5. 키보드 높이 — 저장값이 없으면 화면 높이 표

`resolveChatKeyboardHeight`: 저장값(1단계는 늘 없음)이 있으면 그것, 없으면 화면 높이 표 — **700 미만 260 · 870 미만 300 · 그 이상 320**(pt/dp, 아래 안전 영역 포함 총높이) — 를 쓰고, 하한은 200 + 아래 인셋이다. 값은 [추론](시안 Z5의 260 · 기본 300)이고 2단계 실측이 바꾼다. 같은 높이를 보기 판 · 휴대폰 키보드 자리 칸이 쓴다(전구 → 보기 판 전환에 점프 없음).

학습 키보드는 선택 prop `MessengerKeyboardProps.height`로 그 높이를 받아 **줄 수 · 칸 배치는 그대로 두고 키 높이(40 ~ 56)로 차이를 흡수**한다(`screens/messenger/keyboard-fit.ts`). prop이 없으면 예전 그대로(판 232) — 타자 활동은 바뀌지 않는다.

iPhone SE(375 × 667)에서 머리 · 기능 줄 · 입력 줄 · 토글 · 키보드 260을 빼면 로그 칸이 163pt 남는다(AC14).

### D6. 입력은 앱 쪽 `<input>` 하나 — 늘 마운트, 학습 · 보기 모드에서는 숨은 입력

ui-lynx `TextField`는 값을 밖에서 넣을 수 없고(`defaultValue`만) focus/blur API가 없으며 입력창 안 왼쪽 전구를 담지 못해 쓰지 않는다. 입력 줄은 학습 글 표시(`view` + `text` + 커서 막대)와 앱 쪽 `<input>`을 겹친다. `<input>`은 **늘 마운트**되어 있고 학습 · 보기 모드에서는 투명 · 터치 없음 · 접근성 숨김이다(`readonly`는 iOS에서 다시 focus를 막아 쓰지 않는다). 학습 쪽에서 바뀐 글은 `setValue` 대신 `default-value`로 다시 마운트해 넣고, 보낸 뒤 비우기만 `setValue`다. 입력 칸 낭독은 이름 「Message」 고정 + 값은 `accessibility-value`(접근성 M4).

### D7. 잔액은 앱의 실제 값 (사용자 결정 ③) — ⟨2026-11-10 개정⟩ 재화는 엽전

⟨2026-11-10, 사용자 결정 「엽전으로 전부」⟩ PR #405([ADR-0116](0116-yeopjeon-reward.md) D7)가 젬 화면 · 다이아 칩을 지워, 메신저의 재화를 엽전으로 바꿨다 — 잔액은 보유 엽전(`wiring.coinCount`), 칩 · 요청 버튼은 엽전 아이콘, 「Get coins」는 엽전 상점(`CoinShopScreen`, 방 안에서는 `ownsBack={false}`), 문구 gems → coins 5개 언어. 가격 숫자는 그대로. 아래 원문의 젬 표현은 옛 기록이다. 같은 날 코드 식별자도 엽전으로 바꿨다 — `gemBalance` → `coinBalance`, `GemShopLayer` → `CoinShopLayer`, 겹침 `gem-shop` → `coin-shop`, testid `messenger-list-gem` → `messenger-list-coins` · `sidebar-gems` → `sidebar-coins`, 클래스 `.chat-sidebar-gems-*` → `.chat-sidebar-coins-*` · `.chat-gem-button*` → `.chat-coin-button*`.

원문(옛 기록):

목록 · 방 · 사이드바 · 사진/음성 요청 모달은 `wiring.gemCount`(지금 대개 0)를 받는다. 잔액이 가격보다 적으면 요청 모달의 주 버튼이 「Get gems」가 되어 기존 젬 화면을 연다. 젬 차감 · 결제는 1단계에 없다.

### D8. 대비 — 주황 면은 `brand-primary`(사용자 결정, 2026-11-09 안 A 번복)

흰 글/`brand-primary`는 3.02:1로 4.5에 못 미친다. 키보드 선례(ADR-0112의 윗글쇠 켜짐)대로 **이 변경이 새로 만든 작은 글 면**(Snapshot 알약 · 안 읽은 수 · 토글 켜짐 쪽 · 입력 줄 초점 테두리)은 처음에 `brand-strong`(5.46:1)으로 두었으나, **사용자가 `brand-primary`로 정했다**(흰 글 3.02:1은 다른 `brand-primary` 단추와 같은 앱 전체 예외로 받아들임). 글자색(`.chat-sidebar-coins-label`)은 대비를 위해 `brand-strong` 그대로다. 공용 · ui-lynx 부품(내 말풍선 · 답장 보기 · 요청 모달 주 버튼)은 바꾸지 않고 예외로 기록한다(아래 「알려진 한계」). 상대 말풍선 번역 줄 3.22는 ui-lynx `ChatBubble` 안이라 범위 밖이고, 새 음성 말풍선 번역은 `fg-neutral-muted`(6.22)를 쓴다. 새 디자인 토큰은 0개다.

### D9. 번들 상한 4,060,000 → 4,490,000 bytes

이 변경의 main 번들 실측은 4,242,966 bytes(CI 설정, `.env.local` 없음)로 앞 상한 4,060,000을 넘는다. 키보드 PR 기준(3,976,673) 대비 +266 kB이고 **전부 새 기능의 코드 · 데이터**다 — 소스 기준 화면 · 부품 코드 약 131 kB · CSS 약 47 kB · 픽스처 약 36 kB · 5개 언어 문구 약 26 kB(ReactLynx는 화면 코드를 두 스레드용으로 함께 싣는다). 의존성 추가 · ui-lynx 변경 · 이미지 추가는 없다. 사용자 결정 ①(바로 4탭)로 늘어난 몫이라 상한을 실측 위 여유 약 250 kB인 4,490,000으로 올렸다(`devtools/bundle-size/budget.json` note · [성능 보고서](../performance/reports/messenger-chat-ui-01.md)).

## 버린 대안

1. **메신저 탭을 개발 빌드에서만 보이기** — 사용자가 바로 4탭을 골랐다(결정 ①). 가짜 데이터가 스토어에 보이는 대가는 아래.
2. **학습 메신저 줄을 복제(ADR-0102 6판 D10의 「`MessageRow` 복제」)** — 두 메신저가 따로 늙는다. 사용자가 공용으로 올리기를 골랐다(결정 ②).
3. **공용 부품에 전구 · 알약 · 토글까지** — 학습 메신저는 그것을 쓰지 않는다. 쓰는 곳이 둘이 될 때 올린다.
4. **ui-lynx `TextField`로 입력** — D6의 세 이유.
5. **ui-lynx 바 간격을 4탭용으로 고치기** — ui-lynx 여유 약 1.2 kB이고 다른 소비자의 계약이 바뀐다. 앱 덮어쓰기로 충분하다.
6. **목록에서 전역 머리 숨기기** — 처음엔 사용자가 보이기를 골랐으나(결정 ④) 같은 날 숨기기로 뒤집었다.
7. **가짜 잔액(예: 120)** — 실제 잔액과 다른 수가 보이면 혼란스럽다(결정 ③).

## 대가

- 스토어 사용자도 **가짜 대화 목록과 정해 둔 답장**을 본다(1단계 결정). 대화는 서버로 가지 않고 앱을 다시 켜면 시드로 돌아간다.
- main 번들 +266 kB(D9). 런타임 성능은 재지 않았다.
- 탭 넷 바는 360pt라 360dp 화면에서 좌우 여백이 0이다.
- es · id · ja · vi chat 문구와 탭 이름은 에이전트 번역이다 — 원어민 검토 전이다.
- `messenger-chat.css`가 약 720줄이다(oxlint `max-lines`는 TS만 본다). 매체 말풍선을 나누면 읽기 좋다.

## 알려진 한계

1. **휴대폰 키보드로 바꿀 때 입력 줄이 높이 차이만큼 튈 수 있다.** 저장된 실제 키보드 높이가 없어 표 값(D5)을 쓰기 때문이다. 튄 양은 [기기 확인](../e2e/messenger-chat-ui.md) MC-E4에서 pt/dp로 남기고, 2단계 네이티브 높이 저장이 닫는다.
2. **한국어 키보드 감지는 늘 `unknown`** — 휴대폰에 한국어 키보드가 있어도 학습 키보드 + 토글이 보인다.
3. **가짜 데이터가 스토어 빌드에 보인다**(대가 첫째).
4. **번역 문구는 원어민 검토가 필요하다.**
5. 대비 예외(D8): 답장 보기 흰/`brand-primary` 3.02 · 아래 줄 `gray-200` 2.74 — 자유 대화에서는 로마자 줄이 이 면에 새로 들어왔다. 학습자가 읽는 글이라 후속에서 다시 본다.
6. ~~**메신저의 재화는 젬이고, 엽전으로 바꿀 예정이다**~~ → ⟨2026-11-10⟩ **바꿨다**(D7 개정 — #405 머지). 남은 것: 실제 차감 · 결제 없음. 옛 기록: — 목록 젬 칩 · 사이드바 「Get gems」 · 요청 모달 「◆ [N]」 · 젬 부족 → 젬 화면은 1단계에서 실제 구매를 하지 않는다. 공통 머리 젬 숨김(스토어 심사 대응, [탭 e2e 「상단 젬 칩 숨김」](../e2e/tab-navigation.md#상단-젬-칩-숨김))과 겹치지만, **사용자 결정(2026-11-09): 재화는 PR #405(ADR-0116, 젬 → 엽전 · 엽전 상점을 모두에게 노출)로 바뀐다** — #405가 합쳐지면 이 화면들의 재화를 엽전으로 바꾼다(StatChip tone · 젬 화면 → 엽전 상점 · 「gems」 문구 5개 언어 · 모달 주 버튼 아이콘). 그때까지 젬 진입은 그대로 둔다.
7. 상대 · 내 프로필 줄은 화살표가 있는데 눌러도 아무 일이 없다(접근성 N12 — 1단계 [추론]).

## 기기에서 드러난 Lynx와 테스트 환경의 차이 (2026-11-09)

자동 테스트가 모두 green인 상태에서 iOS SE 3 시뮬레이터 1회차가 결함 여덟(D1 ~ D8)을 찾았다. 그중 넷은 테스트 환경이 Lynx 런타임과 다르게 굴어서 생긴 것이라, 같은 종류의 다음 작업을 위해 적는다(각각 재현 테스트를 더했다).

1. **Lynx CSS 속성 선택자는 `data-*`에 맞지 않는다.** `[data-state=picked]` 같은 선택자가 테스트(jsdom 계열)에서는 맞고 기기에서는 무시돼, 토글 선택 쪽이 칠해지지 않았다(D1). → 상태는 **클래스 변형**으로 표시한다(일곱 곳 + `chat.css` picked).
2. **background 스레드에는 `globalThis.setTimeout`이 없다.** Lynx는 `setTimeout`을 전역 속성이 아니라 맨 식별자로 주입한다. 가짜 출처 기본 타이머가 `globalThis.setTimeout`이라 예약이 던졌고, 보내기가 「sent」 전에 멈춰 입력이 비지 않고 답장이 오지 않았다(D5 · D6). → 맨 식별자 `setTimeout`을 부른다(`chat-fixture-room.ts` `defaultTimers`, `lib/posthog-client.ts`의 `globalThis.fetch` 관찰과 같은 차이).
3. **`<scroll-view>`는 flex 기준으로 높이가 정해지지 않는다.** 보기 판에 px 높이를 줬어도 안쪽 scroll-view가 내용만큼 자라 셋째 보기가 잘리고 스크롤되지 않았다(D7, 2회차에 재발). → 스크롤 칸에도 **px 높이**를 준다.
4. **모듈 싱글턴이 첫 렌더의 콜백을 영원히 쥐고 있었다.** 출처 싱글턴이 첫 렌더의 `imageUrlOf`(그때는 늘 `null`을 돌려준다)를 잡아 아바타 그림이 끝까지 안 보였다(D3). → 싱글턴은 **가장 최근 resolver**를 부른다.

나머지 넷은 모양 문제였다: 「…」 아이콘이 로딩 점으로 보임(D2 → 가로 점 셋) · 잠긴 줄 자물쇠가 이니셜과 겹침(D4 → 모서리 배지, 디자인 표의 「가운데」와 다르다) · 「…」 메뉴 높이가 접힘(D8 → `min-height` 168 · `flex-shrink: 0`). 2 · 3회차에서 D1 ~ D8이 모두 고쳐진 것을 확인했다([실행 기록](../e2e/messenger-chat-ui.md#실행-기록)).

## 사용자 결정 추가 (2026-11-09, PR #406 리뷰 반영 중)

- **방은 키보드가 닫힌 채 열린다.** 키보드 자리와 키보드 토글 줄이 없고, 입력 줄이 안전 영역 위 맨 아래에 선다. 입력 칸을 누르면 키보드 계획대로 열린다(탐지 absent · unknown → 학습 키보드 + 토글, present → 휴대폰 입력 초점, 토글 없음). 전구는 보기 패널을 연다. 로그를 누르거나 시스템 뒤로가기를 하면 접힌다. 뒤로가기 순서는 겹침 → 열린 키보드 · 보기 패널 → 방 나가기. 보낸 뒤에는 열려 있던 키보드가 열린 채 남고, 닫힌 채 보내면 닫힌 채 남는다. 리듀서는 `ChatSlot`에 `closed` 변형을 두고 `open-keyboard` · `close-keyboard`를 더했다(초기값 closed, 쓰던 글 · 키 열은 접어도 남는다).
- **메신저 목록에는 전역 머리(AppHeader)를 그리지 않는다** (결정 ④ 뒤집음). `appHeaderVisibleOn(screen)`이 `messenger-list`에서만 false.
- **대화 출처 포트에 `closeRoom(roomId)`가 더해졌다.** `useChatRoom`이 방을 나갈 때 부르고, 가짜 출처는 그 뒤 온 답을 안 읽음으로 쌓는다(리뷰 #1). 서버판도 같은 뜻을 구현한다.
- 리뷰 반영의 나머지: 휴대폰 초점은 입력 칸이 켜진 모습이 그려진 다음 프레임에 보낸다(#2 · #3). 대화 로그는 끝을 보고 있을 때만 따라간다(#4, 끝 48px). 휴대폰 + 키보드를 내린 자리는 토글이 있어도 접힌다(#5, 바꾸는 중 깔개 동안은 유지 — 스펙 §5.3 · MC-U3 개정). 숨은 입력 칸은 휴대폰으로 바꿀 때만 다시 만든다(#6). 사진은 줄마다 자기 경로로 다시 푼다(#7). 시스템 뒤로가기 등록은 `useChatRoom` 하나뿐이다(#8). 접근성 초점 호출은 `restoreAccessibilityFocus` 하나로 합쳤다(#9). 목록 시각은 그릴 때 읽는다(#10).

## 접근성

하네스 점검(2026-11-09): Critical 1 · Minor 7 · Note 16.

- C1(겹침이 닫힌 뒤 초점 복귀): 일곱 origin(「…」 · ☰ · Snapshot · Snap voice · 사이드바의 Get gems · 이야기 시점 · Delete) 모두 **접근성 요소 자체에 `id`**를 달고(`ChatHeaderSide`에 선택 `id`), 뒤 화면의 숨김이 풀린 다음 프레임에 `requestAccessibilityFocus`를 부른다. 메서드 이름은 `@lynx-js/types` 4.1.0에 있다 — 실제 이동은 MC-E7로만 확인한다.
- Minor 반영: 상대 답장 · 사진 · 음성 도착 낭독(M1) · 작은 단추 `hit-slop`으로 44(M2) · 큰 글자에서 고정 높이 → 최소 높이(M3) · 입력 칸 이름 고정(M4) · 전구 · 「…」 열림 상태 문구 5개 언어(M5) · 움직임 줄이기에서 로그 점프 스크롤(M6) · 「…」 메뉴가 열리면 첫 항목으로 초점(M7).
- 남김: 목록 한 줄 말줄임 속성(N10) · 큰 글자에서 로그 칸이 3배에 약 59pt로 줄어듦(N11 — MC-E3에서 수치) · 무동작 프로필 줄(N12).

## 테스트 계획

[ADR-0006](0006-command-interface-and-test-layers.md) 계층 판정: unit · ui · integration required, e2e required(수동).

- unit MC-U1 ~ U30: 키보드 규칙 · 높이 표 · 자모 되감기 · 방 리듀서 · 보내기 규칙 · 목록 정렬 · 가짜 출처(타이머 주입) · 포트 · CSS 규칙 · copy 5개 언어.
- ui MC-UI1 ~ UI26 + 기기 · 접근성 회귀: 공용 부품 · 학습 메신저 회귀 · 목록 · 방(보내기 · 키보드 · 전환 · 보기 · 「…」 · 겹침 · 지우기 · 초점 복귀 · 도착 낭독) · 바 항목 넷 · `MessengerKeyboard` `height`.
- integration MC-I1 ~ I10: 탭 넷 · 목록 → 방 → 뒤로 · 셸 모드 · 젬 잔액 · 5개 언어 · TypingActivity가 포트를 읽지 않음. 탭 셋을 고정하던 기존 통합 테스트는 계약대로 넷으로 고쳤다.
- 결과(기기 결함 · 접근성 반영 뒤): unit 5,155 · ui 2,385 · integration 826 · typecheck 0 · `pnpm lint` 통과.
- e2e(수동): [`docs/e2e/messenger-chat-ui.md`](../e2e/messenger-chat-ui.md) MC-E1 ~ E13.

## 기기 확인 상태 (2026-11-09)

⚠ **사람 손 · 실기 미확인.** iOS SE 3 시뮬레이터에서 에이전트가 세 회차 돌렸다(결과 [실행 기록](../e2e/messenger-chat-ui.md#실행-기록)). 겹침 흐름 대부분 · 시스템 뒤로 · 움직임 줄이기 · 스크린리더 · 큰 글자 · Android · 스토어 구성 빌드는 아직이다.

## ADR-0102와의 관계

ADR-0102 6판(자유 대화 서버 설계)은 브랜치 `docs/adr-0102-messenger-chat`에만 있다. 이 ADR은 그 설계의 **UI 부분 1단계**이고, 아래 둘은 그 ADR의 문장과 다르다. 그 브랜치를 합칠 때 그쪽 문장을 이 ADR에 맞춰 고친다 — 여기서는 메모만 둔다.

- **D9(입력 자판, Q1 대기)** — 「앱 자판 기본 · 긴 문장은 시스템 자판 전환」의 UI 쪽 답이 이 ADR D4 · D5 · D6이다(감지 포트 · 토글 · 높이 표 · 숨은 입력).
- **D10(「`MessageRow`를 복제한다」)** — 이 ADR D2가 대체한다: 복제하지 않고 `components/chat/`로 올렸다. 폴더 계약(`screens/messenger-chat/`의 내용)도 그에 맞춰 고친다.
- 번호: main의 0102는 [에피소드 번역표 파일](0102-episode-translation-files.md)이다. 자유 대화 ADR이 main에 들어올 때 번호를 정리한다.

## 재검토 조건

1. 2단계(서버)를 시작할 때 → D3의 픽스처를 서버 출처로 바꾸고, 스토어의 가짜 데이터(대가 첫째)를 걷는다.
2. 네이티브 한국어 키보드 감지 · 키보드 높이 저장이 생기면 → D4 · D5의 빈 포트를 바꾸고 알려진 한계 1 · 2를 닫는다.
3. MC-E4에서 점프가 크게 보이면 → 표 값을 기기별로 다시 정한다(design의 플랫폼별 표 후보).
4. 학습 메신저가 전구 · 알약 · 토글을 쓰게 되면 → D2 경계를 넓힌다.
5. 답장 보기 면의 대비(알려진 한계 5)를 고칠 때 → 공용 · ui-lynx 쪽을 함께 본다.

## 적용 기록

- ⟨2026-11-10⟩ **1.5단계 — [ADR-0117](0117-messenger-chat-turns-coins-new-friend.md).** 이 ADR의 결정 문장은 그대로이고 아래가 바뀌었다.
  - D3 출처 포트: `ChatSource` += `requestMeaning` · `openCorrection` · `unlockCharacter`, `ChatThread` += `notes`, `ChatRoomSummary` += `isNew`(구독 모델 — 0117 D1). 픽스처의 **미나 방은 에피소드 3 중간 이야기 유닛(막간)을 끝내기 전까지 잠긴다**(0117 D3) — 목록 순서 · 안 읽음 수가 바뀌었다. D3 「저장 키는 없다」는 1.5에서 기기 범위 키 둘이 생겼다(0117 D7).
  - D3 자리 가격: `CHAT_PLACEHOLDERS.price`(사진 30 · 음성 10)를 지우고 `CHAT_COIN_PRICES` **사진 60 · 음성 40 · 메시지 10** 엽전으로(사용자 결정, 0117 D5).
  - D2 공용 부품: `ChatHeader`에 선택 prop `subtitle`(턴 줄 자리 — 없으면 DOM 동일, 학습 메신저 불변). 내 말풍선은 이제 ui-lynx `ChatBubble`이 아니라 앱 상자 `MyMessage.*`이고 `ChatOutgoingRow`의 children으로 들어간다(공용 줄 불변 — 0117 D1). `ChatLog`는 내가 보낸 글이 늘면 읽던 자리와 상관없이 끝으로 내린다(기기 F2).
  - D7 겹침: `coin-shop`의 `from`에 `send`가 더해졌다(무제한 겹침은 없다 — 무제한 티켓은 학습 전용, 0117 D8).
  - D8 대비 예외를 내 말풍선 안 뜻 글(흰 글/`brand-primary` 3.02)과 연필 점(2.97)까지 넓혔다(사용자 결정 DM · DD — 0117 D2).
  - 알려진 한계 6의 「남은 것: 실제 차감 · 결제 없음」 — 1.5는 엽전을 **지갑 포트의 메모리**에서만 쓴다(0117 D6). 실제 차감은 여전히 없다.
  - **공용 `ChatLog` 끝 판정 재작성(학습 메신저 포함)**: `getScrollInfo` 대신 `layoutchange` 뷰포트 높이와 `scroll`/`scrollend`의 `scrollTop` · `scrollHeight`로 끝 근처를 정하고, 선택 prop `jumpKey`(바뀌면 끝으로)를 더했다. 같은 부품을 쓰는 학습 메신저(`StoryMessengerScreen`)의 끝 따라가기 판정에도 적용된다 — 상세와 기기 확인 책임은 [ADR-0117](0117-messenger-chat-turns-coins-new-friend.md) 「공용 `ChatLog` 변경이 학습 메신저에 미치는 영향」.
- ⟨2026-11-11, [ADR-0125](0125-messenger-safety-ui.md)⟩ 대화 출처 포트에 **추가만** 했다 — 메시지 `notice` · `crisis`, 방 `inputBlock`, 목록 스냅숏 `birthYear` + `setBirthYear`. D3의 다른 메서드 · 가짜 출처의 답장 규칙은 그대로다. 사이드바(O4)는 이야기 시점 다음에 「Birth year」 줄이 들어와 일곱 줄이 됐다(자동 보기 · 지우기는 여섯째 · 일곱째). 겹침에 `birth-year` 하나가 더해졌고, 시스템 뒤로가기의 주인은 여전히 `useChatRoom` 하나다.
- ⟨2026-11-11, [ADR-0126](0126-messenger-chat-settings.md)⟩ 대화 출처 포트에 **추가만** 했다 — 목록 스냅숏 `preferences` + `setPreferences`, `memories` · `updateMemory` · `deleteMemory`. 추천 답변을 끄면 모든 방의 `thread.ideas`가 비고, 방마다의 `settings.autoIdeas`는 포트에 남지만 사이드바 토글은 지웠다. 사이드바(O4)는 여섯째 「What {이름} remembers」 · 일곱째 「Correction style」, 지우기는 여덟째. 겹침에 `feedback-mode`(부모는 사이드바) 하나가 더해졌다.
