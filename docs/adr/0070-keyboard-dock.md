# ADR-0070 — 자판 화면은 셸이 위만 비우고, 자판 면이 화면 아래 · 좌우 끝까지 닿는다 (셋째 셸 모드 `keyboard-dock` · 키는 안전 영역 안)

- 상태: **채택 — 클라이언트 쪽.** 호스트 · 서버 변경은 0이다(새 globalProps 키 · 네이티브 코드 0 — 기존 `safeAreaInsets` · `tappableBottomInset`만 읽는다).
  요구는 「앱 자판(`MessengerKeyboard`)의 면을 바텀시트처럼 화면 바닥 · 좌우 끝까지 붙이고, 키는 안전 영역 안에 둔다」이다.
  열린 질문 넷(Q1 ~ Q4)은 **메인이 추천안을 골랐다** — 사용자 명시 승인이 아니다(아래 「열린 질문과 메인 추천안」).
  ⚠ **기기 확인은 일부다** — iOS 시뮬레이터 한 회차에서 타자 입력의 자판만 봤고, 메신저 자판 국면 · iPhone SE · Android는 실행하지 않았다([자판 바닥 붙이기 e2e](../e2e/keyboard-dock.md)).
- 날짜: 2026-10-19.
- 다루는 축: **셸과 화면이 안전 영역 가장자리를 나눠 지는 방식** — 셸이 비우는 가장자리의 종류(셋째 모드), 그 모드를 받는 route와 카탈로그 레슨의 활동별 갈림,
  화면이 인셋을 받는 길, 자판이 인셋을 더하는 자리, 자판이 없는 국면의 아래 여백, 아래 인셋의 출처(3버튼 · 제스처 · 홈 인디케이터), 타자 화면에서 자판과 `Check`의 자리.
  **다루지 않는 것**: 자판의 키 배치 · 줄 폭 366(면 폭 398 미만 기기에서 줄이 면 여백으로 넘치는 것 — 「대가」 4), 위쪽 띠 · 상태 바 아이콘([ADR-0050](0050-android-status-bar-icons.md) 그대로),
  `position: fixed` 층(시트 · 모달 — [ADR-0044](0044-android-tappable-inset.md) D3 그대로), 가로 방향 지원.
- 이어받는 결정(결정 문장은 바꾸지 않는다 — 각 ADR에 적용 기록):
  [ADR-0044](0044-android-tappable-inset.md) D3 「새 시트 · 새 바닥 고정 층이 지킬 규칙」 2(「셸 안에 서는 화면은 셸이 `safeAreaInsets.bottom`을 비운다」 — 자판 화면은 셸 안이지만 그렇지 않다) · 규칙 3(더하지 않는다 — 그대로 따른다),
  [ADR-0058](0058-catalog-learning-session.md) D6(「작업 영역에 메신저 자판이 선다」 — 자판은 껍데기 밖 화면 바닥으로 나왔다).
  `env(safe-area-inset-*)`를 쓰지 않는 근거는 ADR-0044 D3의 실측(이 호스트에서 0)이다.

**왜 새 번호인가** — 셸의 가장자리 규칙(ADR-0044 D2 · D3 규칙 2의 「셸 안 화면은 셸이 아래를 비운다」)과 ADR-0058 D6(작업 영역의 자판)의 결정 문장이 **함께** 바뀌고,
그 위에 셸 결선 · 화면 결선 셋 · 테스트가 이미 지어져 있다(ADR README 「형식」의 첫째 · 둘째 줄). 제자리로 쓰면 두 문서에 조각이 흩어진다.

근거 표시: **[코드]** 저장소 코드(`apps/mobile/src/` 기준) · **[실측]** 빌드 · 테스트 · 시뮬레이터 실행 · **[ADR]** 기존 결정 · **[추론]** 관찰 없이 이어 붙인 것.
계약의 정본은 저장소 밖 작업 폴더의 spec이고 이 문서는 그중 **결정**만 옮긴다. 시그니처는 코드가 진다.

## 맥락

1. **셸이 네 변의 안전 영역을 padding으로 비웠다** [코드]. `AppSession`의 `.app`(`app-shell`)은 `paddingTop/Left/Right = shellInsets`, `paddingBottom = shellBottomLayout(...).shellPaddingBottom`이고,
   `shellInsets`는 전체 화면 그림 화면(`isFullBleedScreen`)이면 0, 아니면 `safeAreaInsets` 그대로였다. 메신저 · 타자 화면은 「그 밖」이라 아래에 셸 배경(#FFFDFC) 띠가 섰다(iOS 34pt).
2. **그래서 자판 면이 바닥에 닿지 않았다** [코드]. 메신저에서는 자판이 답장 구역 안에서 가운데 정렬돼 면 폭이 398(줄 366 + 좌우 16)이고 그 아래에 셸 띠가 있었다.
   타자에서는 자판이 `LearningShell` 작업 영역(카드 스크롤 안)에 서서 껍데기 좌우 16 안쪽이었다 — 면 안쪽 폭 402 − 64 = 338 < 366이라 키 줄이 면 여백으로 넘쳤다 [추론 — 레이아웃 계산].
3. **`env(safe-area-inset-*)`는 이 호스트에서 0이다** [ADR]. ADR-0044 D3이 에뮬레이터에서 `BottomSheet`의 `env()` 항이 0으로 풀리는 것을 쟀고, iOS에서 값을 주는지는 기록이 없다.
   `lib/safe-area.ts`도 「Lynx에는 `env()`가 없어 JS로 받는다」고 적는다.
4. **화면이 스스로 인셋을 지는 선례가 이미 있다** [코드]. full-bleed 화면은 `insets={wiring.safeAreaInsets}`를 받아 인라인 여백으로 잡는다. 한편 CSS 토큰 여백이 있는 상자에 같은 축의 인라인 여백을 주면
   CSS 값을 덮어쓴다(`FinalWordChoicePanel.tsx`의 주석) — 인셋은 토큰 여백이 없는 상자에 더해야 한다.
5. **`<view>`는 기본으로 자식을 자른다는 것이 저장소의 전제다** [코드]. 그림자를 위해 `overflow: visible`을 명시하는 CSS가 여럿이다. 자판이 음수 여백으로 셸 padding까지 내려가려면 사이의 조상을 전부 바꿔야 하고,
   타자는 `overflow: hidden` 스크롤 안이다.
6. **두 화면은 쌓인 화면이라 탭 바가 없다** [코드]. 탭 바는 깊이 1에서만 서므로(`showsTabNavigator`) `messenger` · `roleplay-messenger` · `catalog-lesson`은 늘 「없음」이다.

## 결정

### D1. 셸의 가장자리 처리를 판별 유니온 셋으로 — `padded` · `keyboard-dock` · `full-bleed`

`app/shell-edges.ts`(순수)가 정한다.

| 모드 | 셸 padding(위 / 아래 / 좌 / 우) | 쓰는 곳 |
|---|---|---|
| `padded` | 인셋 그대로 | 쌓인 화면 · 진입 구간 · 탭 루트(지금 그대로) |
| `keyboard-dock` | 위만 · 0 · 0 · 0 | 자판 화면(D2) |
| `full-bleed` | 0 · 0 · 0 · 0 | 전체 화면 그림 화면(지금 그대로) |

- `isFullBleedScreen`(`app/full-bleed-screens.ts`)은 바꾸지 않고 새 함수가 그것을 먼저 묻는다 — 상태 바 아이콘 등록부 검사가 그 파일의 소스를 읽기 때문이다(ADR-0050).
- `AppSession`은 합성 `shellInsetsOf(screen, insets, wiring)` 한 번만 부른다. 위쪽(상태 바 띠)은 어느 모드에서나 지금과 같다.

### D2. 받는 route — 메신저 둘 전부, 카탈로그 레슨은 「지금 활동이 타자일 때」만

1. `isFullBleedScreen(screen)` → `full-bleed`
2. `messenger` · `roleplay-messenger` → `keyboard-dock`(국면과 무관)
3. `catalog-lesson`이고 현재 활동의 학습형이 `typing` → `keyboard-dock`
4. 그 밖 → `padded`

- 메신저는 국면마다 셸을 바꾸지 않는다 — 바꾸면 셸이 화면 지역 상태(답장 · 판정)를 알아야 하고 효과 한 틱의 깜빡임이 생긴다. 국면은 화면이 렌더 안에서 동기로 다룬다(D4).
- 카탈로그 레슨은 한 route가 열 가지 학습형을 그리므로 route만으로 정하면 다른 학습형 아홉의 아래 처리가 바뀐다. 현재 활동의 학습형은 route 값과 `wiring.episodeContent` · `wiring.learnerFill`에서
  순수하게 나온다(`catalogActivityFormOf` — 메모이즈된 `catalogLessonPlanFor`). 계획 · 활동이 없으면 `null` → `padded`. 활동 넘김은 새 route라 한 활동 동안 모드가 고정이다.

### D3. 화면은 필수 prop `insets`로 받는다 — `useGlobalProps` · Context를 쓰지 않는다

- `MessengerScreen` · `TypingActivity`의 새 **필수** prop `insets: SafeAreaInsets` = `wiring.safeAreaInsets`(full-bleed 선례와 같은 이름 · 타입).
  결선은 `render-screen.tsx`(메신저) · `render-roleplay-screen.tsx`(롤플레이 메신저) · `render-catalog.tsx`(타자) 셋이다. 테스트 · 플레이그라운드는 `zeroSafeAreaInsets`를 넘긴다.
- 필수인 이유: 결선을 빠뜨리면 iOS 홈 인디케이터 위로 키가 내려앉는데, 기본값이 있으면 타입이 잡지 못한다.
- 화면은 `keyboardDockEdgesOf(insets)`(`lib/keyboard-dock.ts`)로 아래 · 좌 · 우만 쓴다. `top`은 셸 몫이라 읽지 않는다.

### D4. 화면의 트리 — 「몸통 상자 + 자판」, 몸통은 바깥 여백(margin)으로 인셋을 진다

```text
화면 바깥 상자 (flex 1 · 세로 · 배경 없음 · 여백 없음)
├ 몸통 상자  style = keyboardDockBodyStyle(edges, dock)   ← 자판 밖 모든 내용
│     margin-left/right = 좌우 인셋(늘)
│     margin-bottom     = dock === "body" ? 아래 인셋 : 0
└ dock === "keyboard" ? <MessengerKeyboard edges={edges} …/> : 없음
```

- **margin인 이유**: 몸통의 바깥 띠가 투명해 셸 배경이 그대로 보인다 → 자판 없는 국면의 화면이 지금과 같다(메신저 흰 면 아래 띠 색 포함). padding이면 흰 면이 띠까지 칠한다.
- 바깥 상자는 늘 있고 자식 순서가 고정이라, 자판이 서고 걷혀도 몸통 아래(카드 · `LearningShell` 상태)가 다시 mount되지 않는다.
- 자판은 바깥 상자의 **마지막 자식**이고 바깥 상자에 여백이 없으므로 면이 화면 아래 · 좌우 끝에 닿는다(셸 padding 0 — D1).
- **메신저**: 바깥 상자가 기존 testid `messenger-screen`과 `accessibility-elements-hidden={guide.visible}`를 그대로 진다(자판까지 함께 가린다). 흰 면 · 위 여백 · gap 16은 새 몸통
  `messenger-screen-surface`로 옮겼다. 답장 자리는 순수 함수 `messengerReplyArea(reply, verdict)` → `"finish" | "retry" | "keyboard" | "choices"`가 정하고(지금의 삼항 그대로),
  `"keyboard"`일 때만 자판이 몸통 밖에 선다. 그 국면에 답장 구역이 아래 `spacing-12`(`messenger-screen-reply-docked`)를 가져 입력창 ↔ 자판 면 간격이 지금과 같다.
- **타자**: `LearningShell`은 바꾸지 않는다 — `workspace`를 넘기지 않고 자판을 껍데기 밖 형제로 둔다(`typing-activity` › `typing-activity-body` › `LearningShell` + 자판).
  자판이 서는 조건은 `typingKeyboardDock(state, questionCount)` → `"keyboard" | "body"`(채점 뒤 · 완료면 `"body"` — 지금 조건 그대로).
  결과로 **`Check`가 자판 위**에 서고(DOM · 낭독 순서가 「카드 → 버튼 → 자판」), 자판은 카드 스크롤 · 문항 전환 미끄럼 밖이다.

### D5. 자판은 면을 그대로 두고 키 줄 묶음에 margin을 준다

- 면(`messenger-keyboard` — 흰 판 · padding 24/24/16/16 · 위 두 모서리 `radius-xl` · `shadow-s3`)의 CSS는 그대로이고 `align-self: stretch`로 부모 폭 전부를 쓴다.
- 새 안쪽 상자 `messenger-keyboard-rows`(줄 간격 8 · CSS 여백 선언 없음)에 인라인 `marginBottom/Left/Right` = `keyboardRowsInsetStyle(edges)`.
  → **키 아래 끝 ↔ 화면 아래 = 24 + 아래 인셋**, 좌우는 면 폭이 398 + 좌우 인셋 이상일 때 16 + 좌우 인셋 이상.
- `MessengerKeyboard`의 새 필수 prop `edges: KeyboardDockEdges`. 키 · 라벨 · 접근성 속성 · testid(`messenger-key-*`) · 윗글쇠 동작은 그대로다. 토큰 값을 TS로 옮기지 않는다([ADR-0014](0014-design-system-consumption-verified.md) D1).

### D6. 아래 인셋은 `safeAreaInsets.bottom` 하나

| 호스트 | `safeAreaInsets`(위 / 아래) | 셸 padding(위 / 아래) | 자판 국면: 키 줄 묶음 margin-bottom | 자판 없는 국면: 몸통 margin-bottom |
|---|---|---|---|---|
| iOS(홈 인디케이터) | 59 / 34 | 59 / 0 | 34 | 34 |
| Android 제스처 | 24 / 24 | 24 / 0 | 24 | 24 |
| Android 3버튼 | 24 / 48(`tappableBottomInset` 48) | 24 / 0 | 48 | 48 |
| 테스트 · Explorer | 0 | 0 | 0 | 0 |

- `tappableBottomInset`을 더하지 않는다 — 호스트가 `tappableBottomInset ≤ safeAreaInsets.bottom`으로 자르므로(ADR-0044 D1) `safeAreaInsets.bottom`만으로 3버튼 48을 피한다(ADR-0044 D3 규칙 3).
- 3버튼에서는 흰 면이 시스템 바 밑까지 깔리고 시스템 막이 그 위에 얹힌다 — 탭 바 바닥 면(ADR-0044 D2)과 같은 그림이다.

### D7. 자판이 없는 국면 · 다른 화면은 지금과 같다

- 메신저 `See results` · `Try Again` · 객관식, 타자 `Next` · `See results`(채점 뒤 · 완료): 셸 padding-bottom 대신 몸통 margin-bottom이 같은 값을 진다 — 위치 · 띠 색이 같다.
- 카탈로그의 다른 학습형 아홉 · 결과 · 최종 · 표지, 탭 루트 · 알림 · 설정 · 진입 구간은 `padded` / `full-bleed` 그대로다(ADR-0044 수치 표 그대로).

### 측정

새 이벤트 · 속성은 없다 — 배치만 바뀌고 새 행동이 없다. 기존 이벤트(`messenger_*` · 카탈로그 학습 이벤트)는 그대로다.

## 버린 대안

1. **자판이 음수 margin으로 셸 padding까지 뚫고 내려간다(셸 불변)** — `<view>` 기본 잘림 전제(맥락 5)로 사이 조상을 전부 `overflow: visible`로 바꿔야 하고, 타자는 `overflow: hidden` 카드 스크롤 안이다.
2. **`env(safe-area-inset-bottom)`** — 이 호스트에서 0이다(ADR-0044 D3), iOS는 미확인.
3. **자판을 `position: fixed`로 띄운다(바텀시트처럼)** — 흐름에서 빠져 위 내용이 자판 높이(232 + 인셋)만큼 비울 상자를 따로 져야 하고(높이를 두 군데서 알아야 한다), 상태 바 등록부의 고정 층이 하나 는다(ADR-0050).
4. **국면마다 화면이 셸에 「자판이 섰다」를 알린다** — 효과 한 틱 뒤 셸이 바뀌어 자판이 설 때마다 인셋만큼 튀고, `AppSession` · `screen-wiring`(각 300줄)에 상태 · 콜백이 는다.
5. **`catalog-lesson` route 전체를 `keyboard-dock`** — 다른 학습형 아홉이 아래를 스스로 져야 하고, `LearningShell`의 절대 배치 층(떠 있는 액션 · 흐림 · 넘김 층)을 전부 고쳐야 한다.
6. **`LearningShell`에 자판 슬롯을 연다** — 슬롯 유무로 트리가 갈리면 껍데기가 다시 mount된다(흐름 · 나가기 확인 상태 초기화). 300줄 파일이고 사용처 열셋이 함께 닿는다. 타자 화면이 감싸는 쪽은 껍데기를 0줄 바꾼다.
7. **셸이 아래 띠를 흰 바닥 면으로 칠한다(탭 바 바닥 면 꼴)** — 국면을 셸이 알아야 하고(대안 4), 좌우 띠는 자판 높이를 몰라 칠할 수 없다.
8. **자판 면에 인라인 `paddingBottom: calc(var(--spacing-24) + Npx)`** — 인라인이 CSS 여백을 덮는 선례(맥락 4), 인라인 `var()` · `calc()`가 이 런타임에서 듣는지 기록이 없고, 토큰 값을 TS로 복제하는 길과 가깝다.

## 열린 질문과 메인 추천안

| # | 물음 | 고른 것 | 대안 |
|---|---|---|---|
| Q1 | 타자 화면의 `Check` · `Next` 자리 | **자판 바로 위**(껍데기 액션 행 그대로) — 메신저의 보내기도 자판 위 입력창에 있다. 낭독 순서가 「카드 → 버튼 → 자판」 | 버튼을 자판 면 안 첫 줄 위에 둔다 — 자판에 새 슬롯 · 새 시각, 메신저와 갈린다 |
| Q2 | 작은 기기 · 큰 글자에서 카드 영역 | **받아들인다** — 카드는 스크롤로 다 닿는다. iPhone SE에서 카드 영역 높이를 본다(e2e KDE3 — 미실행) | 화면이 낮으면 자판을 카드 스크롤 안으로 되돌린다 — 측정 · 두 트리가 늘고 「바닥에 붙음」이 기기마다 갈린다 |
| Q3 | 문항이 바뀔 때 자판의 움직임 | **제자리** — `Next` 뒤 카드만 움직인다. 새 모션 0 | 자판에 같은 전환 클래스 — 모션 대상 · 동작 줄이기 분기가 는다 |
| Q4 | 화면이 인셋을 받는 길 | **prop `insets`**(full-bleed 선례) | 셸이 「남긴 가장자리」를 Context로 공급 — 일치가 구조로 보장되지만 `AppSession`(300줄)에 Provider가 늘고 새 패턴이다 |

## 대가

1. **타자: 자판이 카드 스크롤 밖 고정이다.** 작은 기기 · 큰 글자에서 카드 영역이 자판 높이(232 + 아래 인셋)만큼 좁다 — iPhone SE(667pt)에서 100pt 안팎까지 좁아질 수 있다 [추론 — 높이 합산]. 카드는 스크롤로 닿는다.
2. **타자: `Check`가 자판 위로 왔다**(지금은 아래). 낭독 순서가 「카드 → 버튼 → 자판」으로 바뀌었다. 문항 전환 때 자판은 미끄러지지 않는다.
3. **화면이 아래 · 좌우를 스스로 지는 route가 셋 늘었다**(`messenger` · `roleplay-messenger` · 카탈로그 타자). 결선을 빠뜨리면 iOS 홈 인디케이터 위로 키가 내려앉는다 —
   잡는 것은 필수 prop(타입) · 통합 테스트(`App.system-insets` II7 ~ II10 · `App.catalog-lessons` KL1 ~ KL3)뿐이다.
4. **키 줄 폭 366 고정은 그대로다.** 면 폭 398 미만 기기(375pt · 360dp)에서 줄이 면 좌우 여백으로 넘친다 — 메신저는 지금도 그렇고, 타자는 이 변경으로 덜해졌다(면 안쪽 338 → 370 [추론]).
5. **번들 +3,994 bytes**(main `02dfee15` CI 설정 2,190,958 → 2,194,952, 로컬 설정 2,195,141). 계약 예측(+1.6 ~ 2.7 kB)보다 약 1.3 kB 크다 — 두 화면 트리 재구성의 몫이다.
   상한을 2,192,000 → 2,197,000 bytes로 올렸다(`devtools/bundle-size/budget.json` note · [성능 보고서](../performance/reports/keyboard-dock-iphone-17-pro-simulator-01.md)).

## 재검토 조건

- **`MessengerKeyboard`를 쓰는 화면이 하나 더 생기면** → D2의 route 표(`shellEdgeModeFor`)에 행을 더하고, 자판 화면이 셋을 넘으면 Q4(Context 공급)를 다시 본다.
- **카탈로그의 다른 학습형이 자판을 쓰게 되면** → D2 규칙 3의 「`typing`일 때만」.
- **iOS · Android에서 `env(safe-area-inset-*)`가 값을 준다고 확인되면** → D5의 JS 인셋 경로와 겹친다. 둘 중 하나를 걷는다(ADR-0044 재검토 조건과 같은 날).
- **가로 방향을 지원하게 되면** → D6의 좌우 인셋(지금 세로에서 0)과 D5의 「W ≥ 398 + l + r」을 실기에서 본다.
- **키 줄 폭 366이 기기 폭을 넘는 문제를 고칠 때** → 「대가」 4를 닫고 D5의 좌우 수식을 다시 쓴다.
- **iPhone SE · 큰 글자에서 카드 영역이 문항을 풀 수 없을 만큼 좁다는 관측이 나오면** → Q2의 대안(낮은 화면에서 자판을 카드 스크롤 안으로).
