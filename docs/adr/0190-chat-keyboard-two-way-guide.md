# ADR-0190 — 채팅 방 안내: 키보드 두 갈래(내 언어 · Hangul keys) 단계

- 상태: **채택 — 앱, 초안 PR(머지 전), 운영 변경 없음.**
- 날짜: 2026-11-24.
- **사용자 결정**
  - 시안 「채팅 두 언어 안내 시안」(canvas 순서 0 · 1 · 1 · 3 · 4 · 4-1 · 5 · 5-1 · 5-2, 참고 RoomVi)을 보고 「이 흐름과 화면 그대로 진행」.
  - 시안 메모: 새 단계 = 키보드 토글 안내, 빠짐 = 교정 안내(지금의 chat 단계), 입력 칸 안내 글 Message → 「Korean or 내 언어」,
    안내를 이미 본 사람은 키보드 안내만 한 번, 전구 · 예시 사진 · 예시 음성은 그대로, 목록 카드(0)는 그대로.
- 이어받는 결정: [ADR-0139](0139-messenger-first-entry-guide.md)(덕수쌤 첫 입장 안내 · 건너뛰기 없음 개정) ·
  [ADR-0146](0146-companion-snapshot-voice.md)(예시 사진 · 음성 단계) · [ADR-0129](0129-correction-card-and-rating.md)(교정 카드 `l1_to_ko`) ·
  [ADR-0029](0029-product-analytics-posthog.md)(이벤트) · [ADR-0185](0185-ui-traditional-chinese-taiwan.md)(화면 언어 여덟 · 언어 검증)

## 결정

### D1. 단계 순서
- 새 사용자: **keyboard → ideas → (서버가 제안하면) sample → voice**. 교정 안내(`chat`) 단계는 지운다. 예시가 없으면 「1 of 2」 · 「2 of 2」.
- 안내를 이미 본 사람(`room` 기록 있음): 키보드 단계를 아직 안 봤으면 **그 단계만 한 번**(꼬리표 「New」) + 지금 규칙의 예시 단계.
- 입력 줄에 키보드 토글이 서지 않는 방(한국어 자판 탐지 `present`, 지금은 탐지가 늘 `unknown`이라 실제로는 없음)이면 가리킬 곳이 없어
  키보드 단계가 빠진다.
- 판정은 순수 함수 `roomGuideSteps`(`keyboardSeen` · `toggle` 입력이 더해짐), 단계 안 화면 전환은 `keyboardGuideNext`.

### D2. 키보드 단계 — 두 화면, 같은 번호
1. **Phone keyboard 먼저**: 단계가 서면 키보드를 휴대폰으로 바꾸고 입력 칸에 초점을 줘 시스템 키보드를 연다. 이때 입력 칸의
   `keyboardheightchange`가 실제 높이를 재 기존 저장 경로(`usePhoneKeyboardHeight` → `libitum.messenger.keyboard-height`)에 남긴다.
   말풍선: 「Chat in your own language — I'll show you how to say it in Korean.」 / 「Next, try typing Korean yourself.」 / Next.
   꼬리는 토글의 **Phone keyboard 칸**.
2. Next → 토글을 **Hangul keys**로 바꾼다(학습 키보드가 잰 높이 그대로 같은 자리에 선다). 말풍선만 바뀌고 꼬리는 **Hangul keys 칸**.
   「Or type Korean right here with Hangul keys.」 / 「No Korean keyboard needed. Switch any time with the toggle below the message box.」 / Next
   (안내를 이미 본 사람에게 이 단계만 뜬 경우는 마지막이라 「Got it」).
- 두 화면 모두 단계 표시는 같은 번호(예: 「1 of 4」).
- 안내 안의 토글을 직접 눌러도 바뀐다 — 말풍선이 그 칸의 화면을 따라간다.
- 키보드 단계를 떠나면(다음 단계 · 안내 끝) 키보드를 접는다. 키보드 값은 채팅 기본값 **Hangul keys**로 남는다(시안 3 · 4는 키보드가 닫힌 그림).
- 뒤로가기는 삼킨다(ADR-0139 개정 2026-11-23과 같음). 방의 「열린 키보드 접기」보다 위에 서야 해서 방 훅 뒤 순서로 등록한다
  (`useGuideKeyboard`) — 그렇지 않으면 뒤로가기가 키보드를 접어 안내가 보이지 않은 채 남았다(테스트로 잡음).

### D3. 겹침 — 토글 줄만 밝게, 위치를 재지 않음
- 키보드 단계는 방 화면 전체에 겹치는 세 칸(`KeyboardGuideLayer`): **위**(머리 · 로그 · 기능 줄 · 입력 줄을 덮는 막 + 말풍선) ·
  **가운데**(토글 줄 — 같은 `KeyboardToggleRow`를 막 없이 다시 그림, 눌러도 바뀜) · **아래**(키보드 자리와 같은 높이).
- 원본 토글 줄의 위치를 재지 않는다. 아래 칸이 키보드 자리 높이(`chatKeyboardSlotHeight`, 독과 같은 값)를, 가운데 칸이 같은 부품의
  같은 높이를 가져 원본 위에 겹친다 — ADR-0139 D2의 「복사본 줄」과 같은 방식이고, 키보드 높이가 바뀌면 말풍선 · 토글이 함께 움직인다
  (숫자 고정 없음).
- Phone keyboard 화면의 아래 칸은 막이 없다 — 시스템 키보드는 앱이 덮을 수 없어 막은 키보드 위에서 끝난다. Hangul keys 화면은
  학습 키보드까지 덮는다(시안 1 · 1).
- 말풍선은 토글 줄보다 앞 문서 순서의 위 칸 안에 있고 꼬리 끝이 위 칸 안에서 끝나 토글 줄에 가리지 않는다. 막은 z-index 없이 문서
  순서(ADR-0022).
- 꼬리 가로 자리는 토글의 두 칸과 같은 두 몫 가운데 가리키는 칸 쪽 몫의 가운데다(숫자 없음).
- 색 · 크기는 실제 토큰 · 기존 코치마크(흰 말풍선 · 주황 단추)를 쓴다 — 시안의 어두운 말풍선은 그림일 뿐이다. 작은 줄은
  `messenger-guide-detail`(body-s, fg-neutral-subtle).

### D4. 기록 — 새 키
- 키보드 단계를 본 것은 **`libitum.messenger.keyboard-guide-seen` = "1"** 에 적는다. 기존 `libitum.messenger.guide-seen` 배열(목록 ·
  방 · 예시)에 넣지 않는다 — 예전 빌드는 모르는 값을 버리고 배열을 다시 적어 기록이 사라질 수 있다. 기존 배열의 뜻은 그대로다.
- 안내를 끝낼 때(전체 끝) 키보드 단계가 들었으면 `keyboard`를 남긴다. 저장소를 못 쓰면 안내를 띄우지 않는다(기존 규칙).

### D5. 입력 칸 안내 글
- `messengerChat.composer.placeholder`: 「Message」 → **「Korean or {화면 언어 이름}」** — en 「Korean or English」, vi 「Tiếng Hàn hoặc
  tiếng Việt」(시안 RoomVi), es 「Coreano o español」, id 「Bahasa Korea atau Indonesia」, ja 「韓国語または日本語」, th 「ภาษาเกาหลีหรือภาษาไทย」,
  my 「ကိုရီးယား သို့မဟုတ် မြန်မာ」, zh-TW 「韓文或中文」. 학습자 언어는 화면 언어로 본다(문구표가 언어마다 하나).
- 이 문구는 채팅 방 입력 줄(`ComposerRow`)만 쓴다 — 레슨 · 대면 입력 칸은 다른 문구라 바뀌지 않는다.

### D6. 이벤트
- 새 이벤트 **`messenger_guide_keyboard { stage: phone | hangul, action: shown | next | switched }`**(영역 `chat`, PostHog만).
  `shown` = 화면이 처음 섬(화면마다 한 번), `next` = 그 화면에서 Next, `switched` = 안내 안의 토글을 직접 눌러 바꿈(stage는 바꾼 뒤).
- `messenger_guide_finished.part`에 `keyboard`가 더해진다 — 안내를 이미 본 사람에게 키보드 단계가 든 안내를 끝냄. 새 사용자는 그대로 `room`.

### D7. 내 언어로 보낸 말의 한국어 — 이미 있음
- 서버 교정 kind `l1_to_ko`(메시지에 한국어가 아닌 부분이 있으면 자연스러운 한국어 전체 + 뜻)를 앱이 이미 연필 교정 카드로 보인다
  (`CorrectionCard` 「IN KOREAN」 제목 · 한국어 글 · 뜻 · Send in Korean, ADR-0129, CR-UI3). 이번 변경에서 앱 · 서버를 더 고치지 않는다.
  실서버 확인(실제 메시지 보내기)은 하지 않았다 — 코드와 테스트로만 확인.

## 버린 대안
1. **토글 줄 위치를 재서(`bindlayoutchange`) 말풍선을 붙이기** — ADR-0139 버린 대안 2와 같은 까닭(기기마다 측정이 어긋남). 자리 높이 +
   같은 부품 복사본으로 대신했다.
2. **말풍선을 독 안 토글 줄에 `bottom: 100%`로 띄우기** — 부모 밖 절대 배치는 기기에서 탭을 막았다(「…」 메뉴, 2026-11-10).
3. **기존 `guide-seen` 배열에 `keyboard` 값 더하기** — 예전 빌드가 배열을 다시 적을 때 사라진다(D4).
4. **키보드 단계를 기존 코치마크(머리 · 로그만 덮음) 안에 두기** — 토글은 기능 줄 · 입력 줄 아래라 꼬리가 닿지 않고, 입력 줄을 덮어야
   한다는 시안과 다르다.

## 대가
- 키보드 단계 동안 토글이 두 벌(원본 · 안내 안 복사본) 있고 test id가 같다 — 테스트는 `within(안내)`로 고른다. 기기 자동화가 생기면
  접두사를 둔다(ADR-0139 대가와 같음).
- Android에서 휴대폰 키보드 화면 중 시스템 뒤로가기는 OS가 키보드를 먼저 내려 토글 아래가 흰 빈칸으로 남는다(안내는 그대로, Next로
  진행). 기기 확인 2026-11-24, [e2e](../e2e/messenger-guide.md) 실행 기록.
- 휴대폰 키보드 자동 초점이 기기에서 시스템 키보드를 띄우지 못하면(포커스 거부) 학습 키보드가 밑판으로 남은 채 「Phone keyboard」가 켜진
  그림이 된다. 이때 입력 칸이 막 아래라 눌러 열 수 없다 — 기기 확인 결과는 [e2e](../e2e/messenger-guide.md) MG-E8.
- 안내를 이미 본 사람도 업데이트 뒤 덕수쌤 방에 처음 들어가면 키보드 단계를 한 번 본다(의도).
- 앱 전체 통합 테스트(`App.messenger-turns`)는 덕수쌤 방에서 안내를 먼저 끝내야 글을 칠 수 있다 — 안내가 입력 줄 키보드를 쥔다.

## 테스트
- unit MG-U9 ~ U14(`messenger-guide.unit` · `messenger-guide.storage.unit`) · AN1 · AB3(이벤트 수)
- ui KG-UI1 ~ UI8(`MessengerGuide.keyboard.ui`) · MG-UI3 · UI5(`MessengerGuide.ui`, 순서 바뀜) · MG-UI10 ~ UI16(`MessengerGuide.sample.ui`) ·
  EV-UI2(`chat-events.ui`) · D5 · M4(`MessengerChatScreen.device1.ui`, 입력 칸 안내 글) · LV-U1 ~ U3(언어 여덟)
- integration KG-I1 · I2(`App.messenger-keyboard-guide`) · CP-I4(안내를 끝낸 뒤 보내기)
- e2e [수동](../e2e/messenger-guide.md) MG-E8 ~ E11
