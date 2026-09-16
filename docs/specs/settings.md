# LIB-259 계약 — 설정 탭: 사용자 프로필 · 개인정보 보호 및 약관 · 세션 토글 둘

- 기준: 계약 고정 · 구현 기점 `33f71d8`(LIB-257 뒤).
- 요구사항: 2026-09-16 사용자 결정 Q1~Q6(설정 · 프로필 · 약관 셋 전부 · 이동 항목과 세션 토글 ·
  프로필은 표시 전용 · 토글 둘의 대가를 알고 넣는다 · 측정)을 이 계약에 통합했다. 화면 명세 쪽
  변경(설정 탭 표 · 탭별 스택 · 구현 순서 10번)은 [화면 명세](../screens.md)가 진다.
- 계약 타입: `apps/mobile/src/screens/settings/settings.contract.ts` ·
  `screens/profile/profile.contract.ts` · `screens/terms/terms.contract.ts`, 세션 옵션 어휘
  `apps/mobile/src/lib/session-options.ts`, 네비게이션 어휘 `apps/mobile/src/app/navigation.ts`(`Screen`).
- 상태: **고정·구현됨.** unit · ui · integration 계층이 녹색이다. 수동 iOS 흐름은 설계됐고 아직
  실행되지 않았다(§7).
- 이 문서는 공개 계약의 요약이다. 값의 정본은 코드이고, 수동 절차의 정본은
  [설정 e2e](../e2e/settings.md)다.

## 0. 고정 범위와 불변식

1. 설정 탭 루트에 **이동 항목 둘**(사용자 프로필 · 개인정보 보호 및 약관) 다음 **세션 토글 둘**
   (`자동 재생` · `대본 표시`)이 이 순서로 선다. 액션 행이 없고, **나가는 수단도 없다** — 탭
   루트라 바텀 네비게이션이 그 자리다([ADR-0022](../adr/0022-scroll-regions-and-fixed-affordances.md) D1).
2. 이동 항목을 누르면 그 화면이 **설정 탭 스택에** 쌓인다. 두 화면의 나가기는 보이는 텍스트와
   `accessibility-label` 모두 **`설정으로`** 이고 동작은 `backToRoot`다.
3. 프로필은 **표시 전용**이다. 항목 셋을 보여 주고 **입력 · 편집 · 저장 수단이 0건**이다.
   화면 안 조작 단위는 **나가기 하나**다.
4. 약관은 **고정 임시 본문**이다. 절 넷 · 절마다 문단 둘이고 본문이 한 화면을 넘어 스크롤된다.
   **외부 링크 · 웹뷰가 0건**이다.
5. 토글 둘은 **지금 있는 동작만** 끈다 — 새 기능을 여는 토글이 아니다. 기본값은 **둘 다 켜짐**이고
   **저장하지 않는다**(§4).
6. 이벤트는 넷 — 설정 열림 · 프로필 열림 · 약관 열림 · 토글 변경. 서버 · fetch · 영속 저장이
   0건이다([ADR-0007](../adr/0007-app-internals-state-routing-data-errors.md) D1).
7. 새 `NavAction`이 없다. `Tab` · `Nav` · 리듀서는 한 글자도 바뀌지 않았고 `Screen`에 멤버 둘이
   늘었다.

## 1. 컴포넌트와 데이터 흐름

```text
App (app/App.tsx)                                        ← 유일한 결선 자리. sessionOptions의 주인
├─ SettingsScreen  { sessionOptions, onSelectNavTarget, onToggleSessionOption }
│   ├─ SettingsNavItem × 2     { target, onSelect }      ← profile · terms
│   └─ SettingsToggleItem × 2  { optionKey, value, onToggle }
├─ ProfileScreen   { items, onExit }                     ← items = profileItems()
├─ TermsScreen     { sections, onExit }                  ← sections = termsSections()
└─ ListeningScreen { …기존, sessionOptions }             ← 값을 읽지 않고 그대로 넘긴다
    └─ ListeningPrompt { text, audioSource, sessionOptions }   ← 유일한 소비자
```

- 프로필 항목과 약관 절은 App이 모듈 로드 때 한 번 받는다(`profileList` · `termsSectionList`).
  그 두 모듈이 임시값의 유일한 자리다([코드 규약](../conventions/code.md) 「임시 입력값의 이음매」).
  화면은 목록을 계산 · 정렬 · 거르지 않는다.
- 이름 · 라벨 · 상태 낱말 · 이벤트 payload는 순수 모듈(`lib/session-options.ts` ·
  `screens/settings/settings.ts`)이 계산한다. 컴포넌트는 그 결과를 그린다.
- 토글: 행 tap → `onToggle(key)` → App이 `toggleSessionOption`으로 다음 값을 계산 → sink →
  `setSessionOptions(next)`.
- 이동: 항목 tap → `onSelectNavTarget(target)` → sink → `push({ name: target })`.
  **`SettingsNavTarget`이 route 이름과 같은 문자열이라 사상 표가 없다.**
- 나가기: `설정으로` → `onExit` → `backToRoot`.
- **화면은 스택도 `dispatch`도 모른다**(ADR-0007 D3). 화면이 받는 것은 콜백뿐이다.

## 2. 설정 루트 — 이동 항목 둘과 토글 둘

| 순서 | 종류 | 보이는 낱말 | 목적지 · 값 |
|---:|---|---|---|
| 1 | 이동 항목 | 사용자 프로필 | route `profile` |
| 2 | 이동 항목 | 개인정보 보호 및 약관 | route `terms` |
| 3 | 세션 토글 | 자동 재생 | `auto-play-audio` — 켜짐 / 꺼짐 |
| 4 | 세션 토글 | 대본 표시 | `show-transcript` — 켜짐 / 꺼짐 |

- 이동 항목의 라벨은 [화면 명세](../screens.md) 설정 탭 표의 **화면 이름 그대로**이고, 목적지
  화면의 제목도 같은 문자열이다 — 항목을 누른 사용자가 같은 낱말을 다시 만난다.
- 토글 라벨 둘은 요구사항 문면 그대로다(「문항 오디오 **자동 재생**」 · 「듣기 **대본 표시**」).
- **항목 목록을 props로 받지 않는다** — 이동 항목 둘은 `SettingsNavTarget` union이, 토글 둘은
  `sessionOptionKeys`가 이미 닫았다(`BottomNavigator`가 세 탭을 모듈 상수로 둔 것과 같은 근거).

**토글의 상태가 나가는 채널은 셋이고 전부 색이 아니다** (WCAG 1.4.1).

| 채널 | 무엇을 보나 | 켜짐 | 꺼짐 |
|---|---|---|---|
| `data-checked` | 로직이 이 항목을 어떤 상태로 보는가 | `"true"` | `"false"` |
| `accessibility-label` | 보조기술이 상태를 받는가 | `자동 재생, 켜짐` | `자동 재생, 꺼짐` |
| 보이는 상태 낱말 | 색 말고 형태 · 낱말 채널이 있는가 | `켜짐` | `꺼짐` |

**접근성** ([ADR-0016](../adr/0016-assistive-technology-semantics.md)).

- 설정 화면: `설정, 머리말` → `사용자 프로필, 버튼` → `개인정보 보호 및 약관, 버튼` →
  `자동 재생, 켜짐, 버튼` → `대본 표시, 켜짐, 버튼`. **행마다 정지 하나**다 — 루트 하나만
  `accessibility-element={true}`이고(D5), 토글의 표식 묶음이 `accessibility-elements-hidden`으로
  상태 낱말을 가린다. 라벨 `<text>`는 보이는 이름을 지므로 가리지 않는다.
- **켜짐도 꺼짐도 접미사를 단다** — 구분자는 쉼표 + 공백이다(D3). **꺼짐에 접미사가 없으면
  「꺼짐」과 「상태 없는 버튼」이 같은 소리가 되어** 같은 목록의 이동 항목과 갈리지 않는다.
  이것이 D3의 비대칭을 복사하지 않은 이유이고, 판별 게이트는 **D13**이 진다 — 이 토글 둘이
  그 D의 **첫 사례**다.
- 역할은 **`button`** 이다. `accessibility-traits` union에 `switch`·`checkbox`가 **없고**,
  `adjustable`은 위·아래 스와이프 조절을 약속하는데 그 제스처가 이 저장소에 0건이다 —
  **없는 조작을 약속하지 않는다.** `accessibility-value`를 쓰지 않고(D3 `정정 기록`),
  `disabled`도 두지 않는다 — 둘 다 언제나 조작 가능하다(D10).
- 설정 상태의 `header`는 화면 제목 `설정` 하나다(D12). 이동 항목도 토글도 `header`가 아니다 —
  라벨 뒤에 그것이 이름 붙이는 내용이 오지 않는다(D12 G1).

**스크롤과 머리.** 설정은 머리 [고정] · 흐르는 영역 [흐름] · 액션 없음이다(ADR-0022 D2 표 5번).
목록 상자 `settings-screen-list`가 스크롤의 유일한 직계 자식이다(D4). **이 회차 전까지 설정의
흐르는 영역은 자식이 0개였다** — 그 사실을 근거로 삼던 수동 항목들이 함께 갱신됐다.
머리 정렬과 행 정렬은 [ADR-0023](../adr/0023-scale-mismatch-in-flex-boxes.md) 사례 ㉕ · ㉖ · ㉗다.

| 표면 | test-id |
|---|---|
| 제목 · 흐르는 영역 · 목록 상자 | `settings-screen-title` · `settings-screen-scroll` · `settings-screen-list` |
| 이동 항목 루트 · 라벨 | `settings-nav-item-<target>` · `settings-nav-item-label-<target>` |
| 토글 루트 · 라벨 · 상태 낱말 | `settings-toggle-item-<key>` · `settings-toggle-item-label-<key>` · `settings-toggle-item-state-<key>` |

## 3. 사용자 프로필과 개인정보 보호 및 약관

**프로필 — 항목 셋, 전부 입력값이다.**

| 순서 | `id` | 이름 | 값(임시) |
|---:|---|---|---|
| 1 | `name` | 이름 | 두루 학습자 |
| 2 | `learning-language` | 학습 언어 | 한국어 |
| 3 | `learning-goal` | 학습 목표 | 일상 대화 |

- **파생값을 한 칸도 넣지 않는다.** 연속 학습일 · 완료 스텝 수 · 진행률 · 클리어 수는 **항목으로도
  타입으로도 자리가 없다**(`ProfileItem`의 필드는 셋뿐이라 더하면 `tsc`가 선다). 근거는
  [화면 명세](../screens.md)의 「파생값은 임시로 채우지 않는다」 — *"파생값에 가짜를 넣으면 가짜
  값 하나가 아니라 **가짜 계산 규칙**이 굳는다."* 셋은 전부 **온보딩이 받을 입력값**이다.
- **편집 어포던스가 0건이다.** `<input>` · `bindtap` · `traits="button"`을 가진 요소가 나가기
  하나뿐이고, 행에 카드 · 모서리 · 면 · 꼬리 아이콘도 없다 — **눌리지 않는 것이 눌리게 생기지
  않았다.** 항목은 조작 단위가 아니므로 이름 `<text>`와 값 `<text>`가 각각 정지가 된다(가리면
  값이 보조기술에서 사라진다 — ADR-0016 D5).
- 진짜 값은 계정과 온보딩에서 온다(둘 다 범위 밖). 오는 날 바뀌는 것은 `profileItems`의 `value`
  셋뿐이다 — 형태 · 화면 · 결선은 안 바뀐다.

**약관 — 절 넷, 절마다 문단 둘.**

| 순서 | `id` | 절 제목 |
|---:|---|---|
| 1 | `collected` | 수집하는 정보 |
| 2 | `usage` | 정보의 이용 |
| 3 | `retention` | 보관과 파기 |
| 4 | `contact` | 문의 |

- **문구는 임시이고 분량은 계약이다.** 절 4 · 문단 8 · 문단마다 문장 2 이상 · 본문 600자 이상이
  `unit`으로 지어져 있다. 그 하한이 있는 이유는 **수용 기준의 「긴 본문이 스크롤된다」가 분량에
  달려 있기 때문**이다 — 데이터 쪽이 짧아지면 스크롤 근거가 무너진다.
- **문구 리터럴을 단언하지 않는다**(임시 입력값 규칙) — 바뀌는 날 테스트가 함께 빨개지면 깨진
  것이 화면인지 값인지 갈리지 않는다. 개수와 하한만 계약이 진다.
- 절 제목 넷은 `header`다(D12 G1 — 뒤따르는 문단의 이름이다). 그래서 약관 상태의 제목 축 닫힌
  집합은 **다섯**이다(화면 제목 + 절 제목 넷). 문단은 접근성 속성 0개다.
- 실제 법무 문구가 아니다. 외부 링크 · 웹뷰 0건 — `<view>`·`<text>`뿐이다.

**두 화면의 공통.** 머리는 나가기(`설정으로`) → 제목 순이고, 흐르는 영역의 유일한 직계 자식이
각각 `profile-screen-list` · `terms-screen-content`이며, **액션 행이 없다**(나아갈 곳이 없다).
화면 안 조작 단위는 **나가기 하나**다. testid는 `profile-screen-*` · `profile-item-*` ·
`terms-screen-*` · `terms-section-*` 계열이다.

## 4. 세션 옵션 — 기본값과 대가

| 키 | 라벨 | 끄면 무엇이 달라지나 | 기본값 |
|---|---|---|---|
| `auto-play-audio` | 자동 재생 | 듣기 화면에 들어가도 **스스로 틀지 않는다.** 재생 조작이 `듣기`(▶)로 서고, 누르면 난다 | **켜짐** |
| `show-transcript` | 대본 표시 | 문항 카드에서 **대본 `<text>`가 렌더에서 빠진다.** 재생 조작은 그대로 있다 | **켜짐** |

- **상태는 App의 `useState` 하나가 소유하고 prop으로 내려간다.** 값 하나(`SessionOptions`)가
  내려가므로 화면마다 boolean이 늘지 않고, 셋째 옵션이 생겨도 시그니처가 안 바뀐다. 읽는 화면은
  **둘**(설정 · 듣기)이고 깊이는 **2단계**라 ADR-0007 D1의 라이브러리 도입 조건(화면 3 · 깊이 3)에
  **둘 다 미달**이다.
- **저장하지 않는다.** 저장소 모듈을 import하지도 부르지도 않는다 — 앱을 다시 켜면 둘 다 켜짐으로
  돌아간다(ADR-0007 D1 — 넣는 것은 로그인 토큰뿐이다). **버그가 아니라 결정이다.**
- **대본을 CSS로 숨기지 않고 렌더를 거른다.** 숨긴 `<text>`는 보조기술 정지점으로 **남아서**
  「보이지 않는다」가 거짓이 된다.
- **자동 재생을 꺼도 cleanup은 그대로다.** effect는 조건 없이 걸고 갈리는 것은 본문의 재생 호출뿐이다 —
  걷어내면 사용자가 `듣기`로 튼 소리가 화면을 떠나도 계속 난다.

**대가 — 숨기지 않는다.**

**기본값이 켜짐인 것은 취향이 아니라 대가의 결과다.** 오늘 번들의 문항 오디오는 판정용 기계
음성이라(`docs/adr/README.md` 보류 표 「오디오 자산의 출처·형식」) **대본을 끄면 문항을 풀 수
없다.** 기본값이 꺼짐이면 **기본 상태의 앱이 학습을 끝낼 수 없다.** 그래서 켜짐만 성립한다.
끄는 것을 막지도 않고 경고 문구도 두지 않는다 — 경고는 이 회차가 지어낼 문구이고 요구사항에
없다. 대신 **수동 절차가 이 상태를 명시적으로 돈다**([설정 e2e](../e2e/settings.md) **T6** —
끈 채로 정답을 고르는 절차를 두지 않는다. 오답이 나와도 실패가 아니다).

**⚠ 이 대가는 보는 사용자와 보조기술 사용자에게 비대칭이다.** 대본을 끄면 **보이는** 사용자에게
남는 것은 「정답을 알 수 없다」이지만, **화면을 보지 않는 사용자에게는 문항 내용을 지는 채널이
0이 된다** — 대본 `<text>`가 렌더에서 빠지면 그 정지도 함께 사라지고(숨기지 않고 거르는 것이
옳다), 오늘 번들 오디오는 기계 음성이라 **소리도 대안 채널이 못 된다.** `대본 표시`라는 라벨만
으로는 이 차이가 드러나지 않는다. **이것은 오늘 고칠 경로가 없는 임시 상태이고 — 실제 문항
오디오가 오는 날 사라진다** — 그때까지 관측만 남긴다: [설정 e2e](../e2e/settings.md)의 **V4**가
대본을 끈 채 듣기 화면을 VoiceOver로 훑어 **문항 내용을 지는 정지가 0개라는 사실 자체를
기록한다**(통과/실패를 가르지 않는 관찰 기록형이다).

**화면 문구안은 채택하지 않았다.** 토글 라벨 아래에 결과 한 줄을 두는 안은 시각 값까지 준비돼
있지만(새 토큰 0건), 고르면 고정 문구가 늘고 ui 계층의 red-green을 다시 타야 하므로 **계약이
혼자 정하지 않고 사람 결정으로 남겼다.** 이 문단이 그 자리를 대신 지는 **최소안**이고 **코드
변경이 0건**이다.

## 5. 네비게이션

| 사건 | 동작 | 스택 |
|---|---|---|
| 설정 탭 tap | `switchTab("settings")` | 각 스택 보존 |
| 이동 항목 tap | `push({ name: target })` | `stacks.settings`에만. 나머지 둘은 **같은 참조** |
| `설정으로` tap | `backToRoot` | `stacks.settings` → `[{ name: "settings" }]` |
| 프로필을 둔 채 다른 탭을 다녀옴 | 아무 동작 없음 | 프로필이 **그대로 서 있다** |

- 라벨 `설정으로`는 **활성 스택의 루트**를 가리키고 액션은 `backToRoot`다 — 여정의 `맵으로` ·
  롤플레이의 `목록으로`와 **같은 동작**이고 라벨만 목적지를 따른다(ADR-0007 **D6**). **셋째
  라벨이고 새 결정이 아니다** — 판정은 D6.1 유지이고 기록은 그 ADR 「정정 기록」 2026-09-16에 있다.
- **`specialUnitExitLabel`의 표를 쓰지 않는다** — 그 표는 특별 유닛의 진입 출처 어휘이고,
  프로필 · 약관은 특별 유닛이 아니며 설정 스택에만 선다. 라벨은 두 화면의 리터럴이다.
- 프로필과 약관은 **서로를 열지 않는다** — 설정에서만 닿아 스택 깊이가 최대 2다.
- 새 `NavAction`이 0건이고 `entry`를 건드리지 않는다.

## 6. 측정 이벤트

| 이름 | 속성 | 발생 시점 | 발생하지 않는 때 |
|---|---|---|---|
| `settings_opened` | 없음(`{ name }`만) | 바텀 네비게이션 `설정` tap → **탭이 실제로 설정으로 바뀔 때** `dispatch` 직전 1회 | 이미 설정 탭인데 다시 누를 때 · 설정 스택 안 이동 · `설정으로`로 돌아올 때 |
| `profile_opened` | 없음 | `사용자 프로필` tap → `push` 직전 1회 | 그 밖 |
| `terms_opened` | 없음 | `개인정보 보호 및 약관` tap → `push` 직전 1회 | 그 밖 |
| `session_option_changed` | `option`(`auto-play-audio` \| `show-transcript`) · `value`(boolean) | 토글 tap → `setSessionOptions` **직전** 1회. `value`는 **바뀐 뒤** 값 | 설정 화면을 열거나 떠날 때 · 듣기 화면이 값을 읽을 때 |

| 지표 | 계산 |
|---|---|
| 설정 열림 수 | `settings_opened` 개수 |
| 이동 비율 | (`profile_opened` + `terms_opened`) ÷ `settings_opened`. **1을 넘을 수 있다** — 한 번 열어 둘 다 볼 수 있다 |
| 토글 변경 분포 | `session_option_changed`를 `option`(둘) × `value`(둘)로 묶는다 |

- **열림을 탭 전환으로 센다.** 이미 설정 탭일 때 다시 누르면 네비게이션이 무동작이라 열람으로
  세지 않는다 — 세면 비율 지표가 부푼다. 알림이 **버튼 누름**으로 세는 것과 갈리는 자리이고,
  이유는 버튼과 달리 **탭은 무동작일 수 있다**는 것이다.
- payload에 프로필 자리표 값 · 약관 본문 · 사용자 식별자 · 시각을 싣지 않는다 — 타입이 초과
  속성으로 막는다.
- sink는 App의 optional prop `settingsEventSink`이고 기본값 `null`로 정규화되며, 제품 진입점은
  `null`을 명시한다. **이 변경이 병합돼도 실제 집계는 0건이다.** 그래서 이벤트는 **e2e 항목이
  아니다** — 기기에서 관측할 수 없고 `integration`이 진다.

## 7. 테스트 계층

경로는 `apps/mobile/src/` 기준이다.

| 계층 | 파일 |
|---|---|
| unit | `lib/session-options.unit.test.ts` · `screens/settings/settings.unit.test.ts` · `screens/profile/profile-items.unit.test.ts` · `screens/terms/terms-sections.unit.test.ts` · `app/navigation.unit.test.ts` |
| ui | `screens/settings/SettingsScreen.ui.test.tsx` · `SettingsNavItem.ui.test.tsx` · `SettingsToggleItem.ui.test.tsx` · `screens/profile/ProfileScreen.ui.test.tsx` · `screens/terms/TermsScreen.ui.test.tsx` · `screens/listening/ListeningPrompt.sessionOptions.ui.test.tsx` |
| integration | `app/App.settings.integration.test.tsx`(설정 루트 · 스택 · 토글이 듣기에 닿는가 · 이벤트) · `app/App.heading-trait.integration.test.tsx`(프로필 · 약관 상태의 제목 축) |
| e2e (수동) | [설정 e2e](../e2e/settings.md) — T1–T8 · D1 · V1–V4. **실행 0회.** V는 iPhone 실기 · Release · VoiceOver로 사람만 판정한다. **V4는 관찰 기록형이다**(통과/실패가 없다) |

- **기존 듣기 테스트의 단언은 한 줄도 바뀌지 않았다.** 고친 것은 fixture에 `sessionOptions`를
  더한 것뿐이다 — 기본값이 켜짐이라 기존 관찰이 그대로다.
- **새 단언은 끈 픽스처로만 선다.** 기본값에서는 옳은 배선과 「prop을 안 읽고 오늘 동작 그대로」의
  관찰이 **같아서** 파수꾼이 공허해진다. 그래서 자동 재생 끔 · 대본 끔 · 둘 다 끔의 세 픽스처가
  새 케이스를 지고, 「켜면 지금 동작 그대로」는 **기존 케이스가 이미 진다.**
- **T4는 실기만 답한다** — 소리는 호스트 앱에만 있다([ADR-0017](../adr/0017-host-native-capabilities-and-audio.md)).

## 8. 성능 기록

[ADR-0021](../adr/0021-performance-report-ci-automation.md)이 요구하는 기록은
[`settings-iphone-17-pro-simulator-01`](../performance/reports/settings-iphone-17-pro-simulator-01.md)이다.
관찰 구간과 한계는 그 보고서에 있다.

## 비고

- **임시 값 — 확인 권장.** 프로필 값 셋과 약관 본문은 계약이 고정한 자리표다. 바뀌면
  `profile-items.ts`(값)와 `terms-sections.ts`(문구)만 바뀐다 — 형태 · 분량 하한은 그대로다.
- **토글 상태를 CSS 상태 클래스로 내지 않는다.** 예약 상태어 여섯에 「켜짐」이 없고, 일곱째를
  만들려면 [ADR-0003](../adr/0003-workspace-and-directory-structure.md) D7의 표에 행을 더하는
  **결정이 먼저**다. 이 회차는 상태 클래스를 0개로 두어 그 표를 열지 않았다.
- **사람 결정 하나가 열려 있다** — 대본 토글의 대가를 **화면 문구로도** 낼지다(§4). 최소안으로
  지금 막지 않는다.
- **실기가 답할 것.** 토글 두 글리프의 식별성(노브 좌우 차이가 작다) · 프로필 · 약관 머리의
  **최대 배율 낭독 순서**(V2 · V3) · 대본을 끈 채의 듣기 화면 정지 목록(V4).
