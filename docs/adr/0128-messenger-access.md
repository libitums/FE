# ADR-0128 — 메신저 탭 접근: 손님에게 가입 권유 · 시험 계정이 아닌 회원에게 「곧 열림」 · 설정 Chats 줄 숨김

- 상태: **채택 — 1단계(가짜 출처).** 서버 · 분석 · 저장 키 · 호스트 변경 0.
- 날짜: 2026-11-12.
- **사용자 결정**: 결정 문서 8번 「접근 허용」(2026-11-12, [AI 컴패니언 ↔ 메신저 UI 통합 결정](https://claude.ai/artifact/9BTvrL4GfTxvMrAUzwJr1x)) · 시안 https://claude.ai/artifact/6W1qNMcSB7GaUV99qx7zuV — ① 손님 가입 권유 + ② 비시험 회원 「곧 열림」 + 설정 Chats 줄 숨김(탭 자체를 숨기는 안 ③은 버림).
- 이어받는 결정: [ADR-0085](0085-tester-access.md)(시험 계정 표시 `app_metadata.duru_tester` — 적용 기록), [ADR-0111](0111-guest-entry-without-account.md)(손님 · 설정 Sign in 흐름), [ADR-0113](0113-messenger-chat-ui.md)(메신저 탭), [ADR-0126](0126-messenger-chat-settings.md)(설정 Chats 줄 — 적용 기록).
- 근거(서버 명세 · 컴패니언 PR #400): 계정 없는 손님은 컴패니언을 부를 수 없다(§3.13, PRD O7 — 무엇을 보일지는 FE), 결제(M4) 전에는 시험 계정만 부를 수 있고 아니면 403 `not_available`.

## 결정

### D1. 판정 — `messengerAccessOf(accountState, isTester)`
- 로그인 + 시험 계정 = `open`(지금 목록), 로그인 + 비시험 = `coming-soon`, 손님 · 로그아웃 = `sign-in`(시험 표시와 무관).
- 시험 계정은 ADR-0085의 `isTesterAccessActive()`(세션 훅이 렌더마다 토큰에서 맞춘 값)를 읽는다. 표시는 토큰 갱신 때 실린다(ADR-0085 D2).

### D2. 손님 — 가입 권유
- 메신저 탭 목록 · 엽전 칩 대신: 아바타(대화 출처의 열린 인물 이름 첫 글자, 최대 셋) · 「Text the people you meet」 · 본문 · 「Sign up or log in」.
- 단추는 설정 탭 「Sign in」과 같은 `onSignIn` — 손님 버튼 없는 로그인 화면, 손님 기록은 계정으로 옮긴다(ADR-0111).

### D3. 시험 계정이 아닌 회원 — 「곧 열림」
- 목록 대신 빈 목록과 같은 틀: 아이콘 · 「Chats are almost here」 · 본문 · 「Go to Journey」. 엽전 칩은 그대로(학습 보상은 계속 쌓인다).
- 대기 명단 · 알림 신청은 서버가 없어 넣지 않았다.

### D3a. 탭 루트 밖의 길도 같은 판정 (리뷰 W1)
- 방 · 대화 설정 · 기억 route는 `open`이 아니면 그 자리에 목록 화면(곧 그 계정의 안내)을 그린다 — 남은 선톡 알림, 시험 표시가 꺼진 뒤 열려 있던 화면.
- 선톡 푸시(ADR-0127)는 `open`이 아니면 메신저 탭 루트에서 멈춘다(방도 「열 수 없음」 안내도 없다). 판정은 누르는 순간에 읽는다.

### D4. 설정 탭 Chats 줄은 `open`일 때만
- 바꿀 설정이 없는 계정에 줄을 두지 않는다. `SettingsScreen`의 `onOpenChatSettings`가 null이면 줄이 없다.

### D5. 접근성
- 제목 · 본문을 접근성 요소로 세운다(Android가 펴서 지웠다 — ADR-0126 D6). 단추는 감싸는 상자가 이름 · 탭을 지고(`accessibility-enable-tap`), 안쪽 ui-lynx 단추를 숨긴 상자도 `flatten={false}` — 펴지면 Android가 단추 이름을 두 번 읽었다(기기 확인).

## 리뷰 (2026-11-12, review 에이전트)
- 조건부 PASS. 고침: W1 탭 루트 밖의 길(방 · 대화 설정 · 기억 route, 선톡 푸시)도 판정(D3a, CP-U8 · CP-I7) · W2 아바타 CSS를 토큰으로(3px 테두리만 이유 주석) · W3 증거에 층별 status · 종료 코드 · S1 test-id를 `messengerAccessTestIds`로 · S4 제목 · 본문 접근성 검사 · S5 es · ja · id 문구. 기록: S2 · S3(대가).

## 사용자 결정 추가 (2026-11-12, 1.5와 합치며)
- 메신저 1.5(#410, ADR-0117)는 시험 계정에게 대화 무제한(`tier: unlimited`)을 준다. 이 ADR로 메신저가 시험 계정에게만 열리므로 **무료 3통 · 엽전 보내기 화면은 지금 앱에서 아무도 보지 않는다.** 사용자 결정: **시험 계정은 무제한 유지**(서버 명세는 시험 계정도 차감한다고 적는다 — 서버와 맞출 때 다시 본다).
- 그 흐름의 앱 단 통합 테스트는 테스트 결선 훅(`setMessengerChatStoresForTests`)의 `tier: "free"`로 등급을 고정해 계속 돈다.
- 문구가 늘어 언어별 메신저 문구 파일을 나눴다: 대화 설정 · 선톡 안내 · 접근 문구는 `ui-copy-{언어}-chat-extra.ts`(`MessengerChatExtraCopy`).

## 버린 대안
1. **탭 자체를 숨김(시안 ③)** — 기능이 있다는 것을 모르고, 시험 계정 여부로 탭 바가 바뀌며, 출시 때 탭이 갑자기 생긴다.
2. **손님에게도 가짜 대화를 보임** — 서버가 들어오면 손님은 대화할 수 없다. 처음부터 가입 권유로 맞춘다.

## 대가
- 1단계 가짜 대화는 이제 시험 계정에게만 보인다. 운영 앱의 비시험 회원은 가짜 대화 대신 「곧 열림」을 본다.
- 메신저 통합 테스트는 시험 계정 토큰으로 부팅한다(`renderTesterApp`).
- 쓰는 중에 시험 표시가 꺼지면 다음 렌더부터 「곧 열림」이다(열려 있던 방 · 대화 설정 · 기억 화면 자리도). 방 안에서 서버 `not_available`을 받는 처리는 서버 출처 결선 때.
- 앱을 켠 직후 세션 토큰을 읽기 전 첫 렌더는 시험 계정에게도 「곧 열림」이다. 메신저 탭은 시작 탭이 아니라 보이지 않는다(리뷰 S2).

## 테스트
- unit MA-U1(`messenger-access.unit.test.ts`) · CP-U8, ui MA-UI1 ~ UI5(`ChatAccessGate.ui.test.tsx` · 설정 줄), integration MA-I1 ~ I3(`App.messenger-access.integration.test.tsx`) · CP-I7(비시험 회원의 선톡 푸시).
- e2e: [수동 기록](../e2e/messenger-access.md).

## 재검토 조건
- M4(결제)로 시험 계정 제한이 풀릴 때(`coming-soon` 제거), PRD O7에서 손님 체험을 열기로 할 때.
