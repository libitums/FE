# ADR-0081 — 학습 문항 화면을 한 규칙으로 다시 그린다: 밀도 둘 · 판정은 지시문 자리 · 글 역할 셋 · 보기는 OptionSelector `outlined-subtle` · 문화 확인은 장면과 해설 판 · 상대 아바타 그림 `counterpart_avatar`

- 상태: **채택 — 클라이언트 쪽.** 호스트 · 서버 변경 0. 콘텐츠 형식은 **선택 키 하나**(`counterpart_avatar`)가 더해졌고 지금 데이터(내장 u00 ~ u03)에는 그 키가 없다 — 그림 · JSON 업로드는 사용자 몫이다.
  ui-lynx 표면이 넓어졌다 — `OptionSelector`(variant `outlined-subtle` · 판정 축 `feedback` · 뜻 줄 `meaning` · 확정이면 1개 허용), `ChatBubble`(`annotation`).
  **e2e는 iPhone 13 mini 시뮬레이터 한 회차(부분)** — EU2 · EU4 · EU8과 EU1 일부를 봤고, 거기서 나온 iOS 결함 셋(흐름 안 `Check` 넘침 · 빈칸 밑줄 색 · 그림 위 모서리)을 고친 뒤 같은 시뮬레이터에서 다시 봤다(D18 · 재검토 조건 6 · D8 ~ D11).
  ⟨2026-10-22, 최종 HEAD⟩ 캔버스 대조(EU1 — 불일치 둘 기록) · regular 기기(EU3 — iPhone 15 시뮬레이터 통과) · 큰 글꼴(EU9 — 13 mini 통과)을 더 봤다.
  Android · 스크린리더 · 아바타 그림 · 세 구간 시간(EU1-A · EU5 ~ EU7 · EU8 Android)은 미실행이다 — [학습 문항 리디자인 e2e](../e2e/lesson-redesign.md) 「결과」.
  성능 보고서는 [부분 측정 01](../performance/reports/lesson-redesign-iphone-13-mini-simulator-01.md)(번들 증가량 · 13 mini 화면별 높이)이고 렌더 · 프레임 · 메모리 · 세 구간 시간은 미측정이다(「미확인 · 후속」 1).
  접근성 감사(코드 · CSS · 토큰 대비, 기기 청취 없음)의 지적을 반영했다(D15 · D18 · D19).
- 날짜: 2026-10-22.
- **사용자 결정**(2026-10-22): 시안은 Design 캔버스 셋째 ~ 다섯째 줄 수정안(S12 제외) · ui-lynx `OptionSelector`에 새 variant `outlined-subtle` · 아래 그림자 버튼 금지 ·
  S13 답한 뒤 **고른 보기만 남긴다**(고르지 않은 보기 · 장면 그림은 접힘) · TURN_ORDER 내 칸 · 내 조각은 **`brand-primary`**(시안 색 — 흰 글씨 대비 3.02, 「대가」 1) · 조각 안 뜻 줄은 흰색 ·
  **긴 콘텐츠 몇 문항은 13 mini에서 한 번 스크롤을 허용**(「대가」 2) · 아바타는 에피소드마다 그 에피소드 인물(통일하지 않음 — 콘텐츠 몫) · S13 장면 5:2 · S5 정답 로마자도 글 역할 규칙 ·
  새 문구 `What do you say?` / `Nice reply!` / `That's right!` / `Not quite` · 셸 아래 버튼 요소는 그대로(Check만 ui-lynx `Button`).
- 다루는 축: 문항 화면의 **세로 밀도와 그 판정 · 판정 표시의 자리 · 한글 · 로마자 · 영어 뜻의 모양 구별 · 문항 보기 컴포넌트 · 듣기 조작 부품 · 줄 배치 조립의 채점 시점 · 대화 조립의 화자 표시 · 문화 확인의 제시와 해설 · 상대 아바타 그림의 출처 · 최종 테스트 정답 상자의 면 · 문항 단위 측정**.
  **다루지 않는 것**: 문항 순서 · 채점 규칙 · 통과 기준([ADR-0058](0058-catalog-learning-session.md) 그대로), 단어 카드(S1 — [ADR-0073](0073-new-word-cards.md)) · 문화 카드(S12 — [ADR-0072](0072-culture-card-flip.md)) · 타자 입력 단서 · 온보딩의 모양, 소리 재생 시점([ADR-0080](0080-item-audio-and-slow-playback.md) 그대로), 셸 아래 기본 버튼 요소, 콘텐츠 문구.
- 부분 대체:
  - [ADR-0080](0080-item-audio-and-slow-playback.md) D13(v2) **「듣기 대본은 답한 뒤에만」 가운데 `LISTEN_SELECT`의 로마자** — 답하기 전에 **로마자만** 보인다(D7). 한글 대본은 여전히 답한 뒤다. `MIN_PAIR_AB`는 답 전 아무것도 없다.
  - [ADR-0080](0080-item-audio-and-slow-playback.md) D8 표 **`LISTEN_BUILD` 행의 「상대 말풍선 자리에 3열 줄 · 내 말풍선 · 답 줄 · 창고 그대로」** — 카드 없는 줄 배치(D12)다. 대본이 정답이라 처음부터 보이지 않던 것은 그대로이고, **정답 로마자는 위 줄에 늘 보인다**(사용자가 고른 캔버스 S7v2).
  - [ADR-0067](0067-episode-format-speaking.md) D6의 **「영어 뜻 줄을 보인다 — 사용자 결정(Q1)」** — 이번 사용자 결정(요구사항 6)으로 카드의 뜻 줄을 걷었다(D8 ~ D11). 뜻은 그림 낭독 이름 · 그림 실패 대체 글자에 남는다.
  - [ADR-0016](0016-assistive-technology-semantics.md) D10 적용 기록 ⟨2026-10-16⟩의 **「단어 선택은 응답 뒤에도 보기를 `button`으로 둔다」** — 답한 뒤 나머지 보기는 `disabled`다(D5). 셸의 「아직 할 수 없는 버튼은 없는 것으로 말한다」에 **줄 배치 Check 하나가 예외**다(D12).
- 이어받는 결정: [ADR-0022](0022-scroll-regions-and-fixed-affordances.md)(합친 흐름 `learningShellFlow`가 마지막 안전망) · [ADR-0020](0020-dynamic-type-font-scale.md) 결정 5(고정 높이는 하한 — 큰 글자에서 잘리지 않고 자란다) · [ADR-0030](0030-app-fonts-jost.md) D3(Pretendard 없음 — 기울임이 진짜 기울임인 이유) ·
  [ADR-0066](0066-episode-format-screens.md)(문화 확인 · 음절 조립 학습형) · [ADR-0065](0065-episode-format-additions.md)(대화 조립 화자) · [ADR-0067](0067-episode-format-speaking.md)(따라 읽기 · 낱말 말하기) · [ADR-0073](0073-new-word-cards.md) D4(지시문 heading-m) ·
  [ADR-0072](0072-culture-card-flip.md)(문화 카드 그림) · [ADR-0071](0071-episode-background-download.md) · [ADR-0079](0079-tutorial-as-catalog-episode.md) D2(그림 주소 우선순위) · [ADR-0029](0029-product-analytics-posthog.md) D14. 각 ADR에 적용 기록을 달았다.

근거 표시: **[코드]** 저장소 코드(`apps/mobile/src/` 기준) · **[데이터]** 내장 4 에피소드(u00 ~ u03) 실측 · **[캔버스]** 시안 캔버스 · **[실측]** 테스트 · 빌드 · **[사용자]** · **[추론]** 관찰 없이 이어 붙인 것.
계약의 정본은 저장소 밖 작업 폴더의 spec(고정 v1 · 사용자 확인 결과)과 design(디자인 고정)이고 이 문서는 그중 **결정**만 옮긴다. 시그니처 · 클래스 · testid는 코드가 진다.

**왜 새 번호인가** — 열 개 가까운 학습 화면의 결정(판정 자리 · 보기 · 대본 공개 · 조립 채점 시점 · 문화 확인 제시)이 한꺼번에 바뀌고, 그 가운데 ADR-0080 · ADR-0016 적용 기록의 실체화된 문장을 뒤집는다(ADR README 「형식」 둘째 줄 — 여럿이 한꺼번에).

## 맥락

1. **13 mini에서 넘쳤다** [코드 · 캔버스]. 쓸 수 있는 높이는 812 − 50 − 34 = 728, 셸 여백 · 세션 헤더를 빼면 본문 574다. 카드마다 판정 칸(32 ~ 40 + 간격 16)이 따로 있어 S2 · S10 · S13이 답한 뒤 넘쳤다(S2 4지선다 651).
   넘치면 셸이 지시문 · 무대 · 작업 영역을 한 스크롤로 합친다(ADR-0022) — 넘침은 깨지지 않지만 「스크롤 없이 한 화면」이라는 시안의 전제가 서지 않았다.
2. **한글 · 로마자 · 영어 뜻이 모양으로 구별되지 않았다** [코드]. 화면마다 크기 · 색만 조금씩 다른 줄이었다. 한글을 못 읽는 학습자는 어느 줄이 발음이고 어느 줄이 뜻인지를 위치로만 짐작했다.
3. **보기가 두 벌이었다** [코드]. `ListeningChoice`(테두리 `gray-300`) · `WordChoiceOption`(`border-default` — 스크린숏 S13의 짙은 테두리). ui-lynx `OptionSelector`에는 판정 상태 · 둘째 줄이 없고 2개 미만이면 던졌다.
4. **조립의 `Check`가 「없다가 서는」 버튼이었다** [코드]. 자동 채점은 없었지만, 칸이 다 차야 버튼이 나타나 「언제 채점되는지」가 보이지 않았다.
5. **문화 확인이 문화 카드와 끊겨 있었다** [코드 · 데이터]. 카드의 그림 · 대사는 앞 단계에 있고, 확인은 질문 글만 보였다. 해설(`feedback.correct`)은 디코드되지만 읽히지 않았다(10/10 en · ko 있음).
6. **대화 조립의 상대는 이니셜뿐이었다** [코드]. 에피소드에 인물 그림을 실을 자리가 없었다.
7. **로마자 기울임은 진짜 기울임이다** [코드 — ADR-0030 D3]. 앱은 Pretendard를 싣지 않아 본문이 시스템 서체(SF Pro · Roboto)다 — `font-style: italic`이 합성이 아니다. 요구사항의 「합성 기울임」 걱정은 지금은 해당 없다.

## 결정

### D1. 밀도는 둘이다 — 쓸 수 있는 높이 756 미만이면 `compact`

- `lib/learning-density.ts`(순수): 쓸 수 있는 높이 = `SystemInfo` 창 높이 − 안전 영역 위 − 아래. **756 미만 → `compact`**(13 mini 728), 그 밖 `regular`(13/14 763 · 15/16 759). **높이를 모르면 `compact`**(스크롤 없음이 우선 — 「대가」 4).
- 셸과 화면이 같은 훅(`useLearningDensity`)을 부르고, 셸 루트 클래스 `learning-shell-density-<d>` 하나로 화면 CSS가 갈린다. 글 길이로 문항마다 내린다 — 25자 이상 듣기 · 문화 확인 장면 말풍선 한글 25자 이상은 기기와 무관하게 compact(셸 `densityOverride`).
- compact는 **그림 높이 → 카드 여백 → 글자 단계** 순으로, 13 mini에 필요한 화면에만 정의한다(필요 없는 화면은 compact 값이 없다). 마지막 안전망은 지금의 합친 흐름이다 — 큰 글자 · SE 같은 더 작은 화면 · 「대가」 2의 긴 문항.
- 판정 · 버튼 · 보기 크기는 문항 시작과 답한 뒤에 같다 — 답하는 순간 밀도를 바꾸지 않는다.

### D2. 판정은 지시문 자리에 겹쳐 선다 — 카드 안 판정 칸 다섯을 걷는다

- 셸 `verdict`가 있으면 판정 배지가 지시문 줄 위에 겹친다. 지시문 글은 **흐름에 남고** 보이지 않게(낭독 제외) 가려진다 — 2줄 지시문에서도 밀림 0. 줄 상자 하한 36(배지 높이).
- 듣기 · 단어 선택 · 문장 순서 · 음절 조립 · 낱말 말하기의 판정 칸과 듣기 카드의 최소 높이를 지웠다(카드는 내용 높이).
- 예외: 문화 확인(해설 판이 판정 — D15) · 따라 읽기(채점 없음) · 타자 입력(이 변경 밖) · 최종 테스트(전용 화면).

### D3. 글 역할은 셋이고 한 부품이 진다 — 로마자는 기울임, 뜻은 구분선 아래

- `components/TextRoles`: **로마자** = 기울임 · medium · `fg-neutral-muted` · **구분선** = thin `gray-300`(낭독 제외) · **뜻** = 구분선 아래 semibold · `fg-neutral`. 보기 · 조각 안의 뜻은 구분선 없이 한글 아래 작은 줄(body-s · muted).
- 로마자 크기는 한글 단계에서 나온다(큰 두 단계 → m, 작은 두 단계 → s).
- 적용 화면: S2 듣기(소리 없는 제시 포함) · S6 · S9 · S10 · S13 질문 카드 · S7 · WORD_ORDER · S8 · S5. **범위 밖**: 단어 카드 · 문화 카드 · 타자 입력 단서 · 온보딩.
- Lynx에서 안쪽 `<text>`는 바깥 글꼴을 물려받지 않는다 — 강조 조각이 있는 로마자는 조각마다 역할 클래스를 다시 준다 [실측]. 밑줄은 longhand가 지워져 `text-decoration: underline` 한 줄로 쓴다 [실측]. iOS Lynx는 `text-decoration-color` · 두께도 읽지 않아 밑줄이 글자색을 따른다 [실측 — 시뮬레이터] — 색을 바꾸려면 글자색을 바꾼다(재검토 조건 6).

### D4. 한글 주인공 줄은 네 단계이고 작은 단계에서 색을 바꾼다

- regular: 10자 이하 display · 24자 이하 heading-l · 그 밖 heading-m. compact는 한 단계씩 아래(heading-s까지). 경계 수는 듣기 글 크기 규칙과 같은 값이다(그 함수는 이 규칙의 재수출로 남는다).
- 색은 heading-m 이상 `brand-primary`(흰 바탕 3.02 — 큰 글자 3:1), **heading-s는 `fg-brand`**(5.46 — 18 Bold는 큰 글자가 아니다).
- 지시문 글자는 밀도와 무관하게 heading-m 그대로다(ADR-0073 D4).

### D5. 문항 보기는 ui-lynx `OptionSelector` `outlined-subtle` 하나다

- **ui-lynx 확장**(FE 확장 — design-system 「확장」 규칙 1의 Feedback 축 · `icon` 확장과 같은 부류):
  1. variant **`outlined-subtle`** — `outlined`와 크기 · 글자 · 상태가 같고 기본 테두리만 `gray-300`.
  2. 옵션 **`feedback?: "correct" | "incorrect"`** — 그 항목은 조작 불가(traits `disabled`) · 판정 색 · 표시(tick / cross). 우선순위 Feedback → Disabled → Selected → Pressed → Default. `filled`에는 쓰지 않는다(던짐).
  3. 옵션 **`meaning?: string`** — 라벨 아래 뜻 한 줄(body-s). 두 줄 보기의 세로 여백을 줄인다.
  4. 접근성 이름 — `accessibilityLabel`을 넘기고 판정 · 뜻이 있으면 그 이름을 **그대로** 쓴다(앱이 판정 · 뜻을 담아 준다). 아니면 라벨 + 뜻 + 판정 또는 `selected`.
  5. 개수 하한 — 확정(`committed`)이면 1개, 아니면 2개(지금 규칙). 문화 확인의 「고른 것만 남김」이 1개다.
- **앱**: `components/QuestionOptions`가 듣기 · 단어 선택 · 문화 확인의 보기를 모두 그린다(`ListeningChoice` · `WordChoiceOption`을 지웠다). 크기는 compact면 s(그림 문항은 늘 m). 상태는 `open` · `waiting`(그림 기다림) · `judged`(고른 항목 판정, 나머지 `disabled` 또는 `collapsed`).
- **답한 뒤 나머지 보기는 `disabled`다** — 그 문항 인스턴스에서 다시 고를 수 없고 다음 문항은 새 요소다(ADR-0016 D10 적용 기록).
- 배치: 그림 문항 2열 grid, 그 밖은 세로 쌓기(짧은 보기도 — 캔버스 S6v2). 옛 칩 가로 배치 규칙을 지웠다.

### D6. 듣기 조작은 부품 셋이다

- `ListenControls.Replay`(RoundButton l) · `.Playback`(xl, 색 갈래 `neutral` 기본 · `brand`) · `.Slow`(지원할 때만 — ADR-0080 D8). 이름 · 탭은 안쪽 RoundButton이 지고 바깥 상자는 testid만 진다.
- S2 = 다시 듣기 · 재생 · `Slow` 한 줄(재생이 가운데). S7 = **brand 재생** + [정답 로마자 / 다시 듣기 · `Slow`]. 간이 줄(S8 · S9)은 그대로.

### D7. S2 듣기 대본 — `LISTEN_SELECT`는 답하기 전 로마자만 (사용자 결정)

- 문항이 「답 전에 무엇을 보이는가」를 갈래로 싣는다 — `romanization` | `nothing`, **없으면 `nothing`**(정답 노출 방지가 기본). `LISTEN_SELECT`만 `romanization`.
- 카드 = 재생 줄 → 구분선 → 로마자. 답한 뒤(또는 대본 표시 설정이 켜지면) 한글 + 로마자. `MIN_PAIR_AB`는 답 전 구분선 · 로마자가 없다.

### D8 ~ D11. 화면별 — 그림 · 음절 칸 · 낱말 말하기 · 질문 카드

- **S3 그림 고르기** — 그림이 카드 가장자리까지 채운다. iOS Lynx는 바깥 `Card.Media`의 둥근 모서리로 안쪽 그림을 자르지 않아 [실측 — 시뮬레이터] 그림 틀 · 그림에 카드와 같은 반지름(`radius-xl`)을 직접 준다(S13 장면 띠도 위 두 모서리를 직접). 그림 비율은 기기가 아니라 **보기 행 수**로: 2지(1행) 1:1, 3 ~ 4지(2행) 4:3. 보기 2열 m.
- **S4 음절 조립** — 답 칸은 음절마다 한 칸(48×56, `CompactNumericInput` s 모양 — 자판을 띄우면 안 되는 칸이라 컴포넌트는 쓰지 않는다). 칸 상태 `filled` · `current`(흰 면 + `brand-strong` 테두리) · `empty`, 채점 뒤 판정 색.
  **쓴 타일은 자리를 지키고 비활성 색으로 남으며 `X, used`로 읽힌다**(traits `disabled`) — 전에는 숨기고 낭독에서 뺐다.
- **S5 그림 보고 말하기** — 카드 = 그림 + 정답 로마자(글 역할). **영어 뜻 줄을 지웠다**(뜻은 그림 이름 · 실패 대체 글자에 남는다). 파형은 카드와 버튼 사이(하한 56). 그림 비율 regular 5:4 · compact 4:3.
- **S6 · S9 · S10 · S13 질문 카드** — 한글(D4) → 로마자 → 구분선(뜻이 있을 때) → 뜻. **빈칸 채우기(`CLOZE`)의 로마자 줄은 첫 `___`를 정답 로마자(`answers[0].roman`)로 바꾼 전체 문장**이고, 그 조각은 **`fg-brand` 글자색 + 기본 밑줄**이다(재검토 조건 6의 결과 — 처음 정한 `brand-primary` 밑줄 색은 iOS가 그리지 않았다. `fg-brand`는 흰 바탕 5.46). 정답 로마자가 비면 문맥 로마자 그대로(강조 없음).

### D12. `LISTEN_BUILD` · `WORD_ORDER`는 카드 없는 「줄」 배치이고, 채점은 `Check`로만

- 위 줄(LISTEN_BUILD = D6의 S7 줄 · WORD_ORDER = 영어 문장) → 답 줄 둘(아래 선 2px `gray-300`) → 조각 뭉치(쓴 자리는 폭 유지 빈칸) → **흐름 안 `Check`**(셸 `actionPlacement="in-flow"` — 떠 있으면 뭉치가 버튼 밑으로 72 들어간다) → 같은 자리 `Next`. `Check` · `Next` · `See results`는 **같은 ui-lynx `Button` 요소**이고 문구 · 동작만 바뀐다(D19 — 초점 유지).
- **`Check`는 문항 내내 서 있다** — 놓은 조각이 하나 이상이면 켜지고, 없으면 꺼진 채 상태가 읽힌다(ui-lynx `Button`, traits `disabled`). **조각을 다 놓아도 저절로 채점하지 않는다.** 대화 배치(TURN_ORDER)는 지금처럼 칸이 다 차면 선다(캔버스에 버튼 없음).
- 로마자: LISTEN_BUILD는 정답 로마자(`answers[0].roman`, 없으면 `stimulus.audio.roman`)가 **늘** 보인다. WORD_ORDER는 `answers[0].roman`이 **Check 뒤에만** 보인다(답 전 노출 없음).
- 옛 내 말풍선 · 문장 줄 · 상대 칸(`SentenceOrderPartnerSlot`) · `support` 필드를 지웠다(카탈로그 생산자가 없었다). 판정 규칙 · 놓을 수 있는 수는 그대로.

### D13. 따라 읽기의 `Practice` 표식을 걷는다

카드 = 한글(heading-l · neutral) → 로마자 → 구분선 → 뜻 → 간이 줄. 파형은 작업 영역. 문구 키 `readAloud.badge`를 지웠다.

### D14. 대화 조립 — 내 칸 · 내 조각은 주황 면 `brand-primary`, 조각마다 뜻, 상대는 그림 아바타 (사용자 결정)

- 내 칸 · 내 조각 = **`brand-primary` 면 · 흰 글자, 조각 안 뜻 줄도 흰색**. 상대 = 흰 면 · `gray-300` 테두리 · 뜻 `fg-neutral-muted`. 칸 하한 48 · 간격 8 · 아바타 sm.
- 창고 조각마다 화자(`chipSpeakers` — 칸 화자와 같은 규칙)와 영어 뜻(`tiles[].en`이 **모든** 타일에 있을 때만)을 싣는다. 놓인 칸은 한글만(뜻은 이름에). 채점 뒤 창고는 접힌다.
- 이름: 창고 조각 = `Your line: 진짜요? 감사합니다!, Really? Thank you!` / `Partner's line: …`. 칸 이름은 그대로(화자 포함).
- 상대 아바타 = 레슨 계획의 `counterpartAvatarUrl`(D16) → ui-lynx `Avatar`. 그림이 없거나 로드에 실패하면 이니셜(Avatar의 `error` 규칙), 낭독 제외.

### D15. 문화 확인 — 짝 카드의 그림 · 대사로 장면을 세우고, 답한 뒤 해설 판 + `Continue`

- **짝 카드**(`app/catalog-culture-map.ts`, 순수): 같은 단계에서 이 문항이 k번째 문화 확인이면 그 앞 문화 카드 목록의 k번째(없으면 마지막), 같은 단계에 앞선 카드가 없으면 **바로 앞 단계**에서 같은 규칙, 없으면 짝 없음. u00 `S13-01` → `S12-01`, u01 `CULT-05` → `CULT-02` [데이터].
- **장면은 카드 제목(`context.ko`)이 `「…」`로 감싼 대사일 때만** 선다 — 그림 5:2 띠(그림이 없으면 띠 없음) + 상대 아바타 + ui-lynx `ChatBubble` incoming(`annotation` = 로마자 · 뜻). 지시문 `What do you say?`.
  감싸지 않은 제목은 주제 제목이지 대사가 아니라 질문 카드(D11 모양)로 선다 — u00만 장면, u01 ~ u03은 질문 카드 [데이터].
- 장면 그림은 9:16 원본을 틀 폭으로 크게 그려 위쪽 약 5 %가 틀 위에 오게 한다(Lynx `image`의 가운데 자르기로는 몸통만 남는다 [실측 — 시뮬레이터]).
- **답한 뒤**(사용자 결정): 자동 넘김 없음. 장면 그림 · 고르지 않은 보기 접힘, 상대 말풍선은 한글만, **정답이면** 내 말풍선(outgoing, 고른 보기 한글) + 내 아바타. 아래 **해설 판**(tone = 정오, 제목 `Nice reply!` · `That's right!` · `Not quite`, 줄 = `feedback.correct`의 en → ko) + `Continue`.
  오답도 같은 해설을 보인다 — 정답을 알려 주는 글이고, `why_wrong`은 범용 문구라 쓰지 않는다.
- 낭독: 답하는 순간 `제목. en`을 한 번 알린다. 판정 배지(D2)는 서지 않는다.
- **해설 판의 접근성 구조**: 판 루트는 접근성 요소가 아니다. **글(아이콘 · 제목 · 해설 줄)만 감싸는 안쪽 view**가 접근성 요소 하나(이름 = 제목 + 해설)이고, 아래 버튼 행(`Continue`)은 그 view의 **형제**라 따로 닿는다 — 조작 단위를 접근성 요소 안에 넣지 않는다([ADR-0016](0016-assistive-technology-semantics.md) D5). 이 문항은 자동 넘김이 없어 `Continue`가 유일한 진행 수단이다.
- **글만 판 안에서 스크롤한다** — 글 부분 `scroll-view`의 상한 `50vh`. 큰 글꼴에서도 `Continue`가 화면 안에 남고, 보통 글꼴에서는 내용이 상한보다 작아 모양이 같다.

### D16. `counterpart_avatar` — 에피소드 최상위 선택 그림 경로

- 와이어: 최상위 선택 문자열. 디코더(`lib/episode-avatar.ts`, 백그라운드 전용): trim해 비면 없음. **버킷 상대 경로**(선두 `/` · `..` · 스킴 금지, 선두 `content/` 허용 — 다른 그림 경로와 같은 해석) **그리고** 확장자 `.webp` · `.png` · `.jpg` · `.jpeg` **그리고** 공백 · `?` · `#` 없음이면 받는다.
  어긋나면 키를 버리고 **경고** `invalid-asset-path`(`counterpart_avatar`)를 남긴다 — **에피소드 디코드는 실패하지 않는다.**
- 받기: 자산 목록(`episodeAssetPaths`)에 들어간다. 받기 실패 규칙은 다른 그림과 같다(서버에 없음은 적고 넘어감 — 아바타가 에피소드를 묶지 않는다).
- 주소: 레슨 계획 `counterpartAvatarUrl` = 받아 둔 파일 > 내장 > 원격(ADR-0079 D2의 `imageUrlOf` 그대로). 원격이 오프라인이면 이니셜.
- 내장 에피소드가 이 키를 가지면 그 그림도 내장 표에 함께 실어야 한다 — 가드 테스트가 내장 u00 본문의 모든 그림 경로(아바타 포함)를 표와 대조한다. 지금 u00 JSON에는 키가 없다.
- 형식 · 업로드 순서는 [콘텐츠 계약](../specs/episode-content-json-contract.md) §2 · §9 · §13.

### D17. 최종 테스트의 정답 상자는 불투명이다

`AnswerReveal`의 어두운 면 변형(`surface`)을 걷고 머리 줄 `label`(`Answer`)을 더했다. 최종 테스트는 어두운 판 위에서도 불투명 `feedback-correct-surface` + `-text`(6.73)다. 다른 세 화면은 그대로(`text`만).

### D18. 셸 — 판정 자리 · 해설 판 · 흐름 안 버튼 · 밀도

- `LearningShell`에 `verdict` · `feedback`(해설 판) · `actionPlacement`(`floating` 기본 | `in-flow`) · `densityOverride`가 더해졌다. 루트에 밀도 클래스 · `data-density`.
- `feedback`이 있으면 아래 버튼 행이 흐름 안으로 오고 그 위에 판이 화면 가장자리까지 선다(`LearningShellFeedbackPanel`).
- **아래 기본 버튼 요소는 그대로다**(design의 「ui-lynx `Button`으로 교체」를 하지 않았다 — 값이 이미 Button xl brand와 같고 그 testid를 읽는 테스트가 36파일 190곳이다). `actionButton`(ui-lynx `Button`)은 문장 순서 화면만 쓴다 — `Check`와 그 뒤 `Next` · `See results`가 모두 그 자리의 같은 `Button`이다(D19).
  `actionButton`은 요소 또는 함수를 받는다 — 함수면 셸의 아래 버튼 동작(누름 소리 · 합친 흐름 맨 위로 · `onAction`)을 받아 그 버튼에 건다.
- **아래 버튼 행의 하한 높이는 56이다**(버튼 높이와 같은 값 — 떠 있을 때도 흐름 안에 설 때도). iOS Lynx가 ui-lynx `Button`이 든 행의 높이를 배치에서 0으로 세어, 떠 있는 행은 `bottom`이 높이 0 기준이 되고 흐름 안의 행은 위 `flex: 1` 스크롤이 행 몫까지 차지했다 —
  13 mini 시뮬레이터에서 줄 배치 `Check`의 아래 끝이 안전 영역 경계 778을 27.6 ~ 27.9 pt 넘었다 [실측 — [성능 보고서 01](../performance/reports/lesson-redesign-iphone-13-mini-simulator-01.md)]. 하한을 준 뒤 같은 화면(S7 · S11 · u01 문장 조립)의 `Check`가 셸 버튼 자리 698 ~ 754에 선다 [실측 — 시뮬레이터 재확인]. 큰 글자에서는 내용이 하한을 넘어 자란다(ADR-0020 결정 5).

### D19. 접근성

- 새 이름: `Check`(꺼지면 traits `disabled`, 켜지면 `button`) · 쓴 음절 타일(`X, used`) · 창고 대화 조각(화자 + 글 + 뜻) · 문화 장면 말풍선(화자 + 한글 + `Pronunciation: <로마자>` + 뜻) · 해설 판 글(제목 + 해설 — D15) · 보기(판정 · 뜻 포함).
- **로마자는 모든 화면에서 `Pronunciation: <로마자>` 접두로 읽는다** — 한글 · 로마자 · 뜻의 구별(D3)이 모양뿐 아니라 낭독에도 서게 한다. 따라 읽기 · 단어 카드 · 문화 카드가 이미 쓰던 꼴(`readAloud.pronunciation`)로 맞췄다.
  `TextRoles.Romanization`은 부르는 쪽이 이름을 주지 않으면 이 이름을 진다(빈칸 문장은 빈칸을 말로 푼 문장에 접두). ChatBubble `annotation`은 낭독용 `spokenRomanization`을 받아 화면 글은 그대로 두고 낭독만 바꾼다.
- **줄 배치 조각 · 대화 칸의 정오는 색만이 아니다** — 채점 뒤 이름 뒤에 `correct` / `incorrect` 접미사, 라벨 옆에 `tick` / `cross` 아이콘(이름 없음 — 낭독은 접미사가 진다). WCAG 1.4.1.
- **`Check` → `Next` · `See results`에서 초점이 남는다** — 같은 자리의 같은 ui-lynx `Button` 요소라 이름만 바뀌어 스크린리더가 새 이름을 다시 읽는다(D12 · D18).
- **판정 뒤 가린 지시문 `<text>`는 `accessibility-element={false}`** — 가림 속성(`accessibility-elements-hidden`)은 자손에만 들어 잎 `<text>`에는 무동작이다(ADR-0016 D5). 가리지 않을 때는 속성을 넘기지 않는다.
- 낭독 제외: 아바타 · 장식 장면 그림. 구분선은 자식 없는 view라 처음부터 정지점이 아니다 — 가림 속성을 붙이지 않는다. 그림 문항(S3)의 그림 이름 `Picture: <뜻>`은 그대로.
- **RoundButton brand 아이콘은 `brand-primary`를 유지한다(사용자 결정, 2026-10-22) — S7 재생 단추 포함.** 면(`gray-100`) 위 `brand-primary`는 2.84로 비텍스트 3:1(WCAG 1.4.11)에 못 미치지만 수용하며, 별도 과제로 둔다. ui-lynx `RoundButton`의 FE override(2026-09-21)는 그대로다.
- 판정 낭독은 지금 규칙(화면마다 한 번) — 배지 자리만 옮겼다. 정답 노출 방지: `MIN_PAIR_AB` · `WORD_ORDER`는 답 전 로마자 없음, 그림 문항 낭독에 한글 없음.

### 측정

새 이벤트 하나 — **`episode_item_answered`**(sink `episodeIntroEventSink`, Airbridge 매핑 없음, PII 없음).

| 속성 | 뜻 |
|---|---|
| `episodeId` · `unitKey` · `itemId` | 문항 |
| `itemType` | 채점 유형 16 가운데 하나(듣기 · 그림 · 빈칸 · 대답 · 역할 대사 · 번역 · 조사 둘 · 문화 확인 · 듣고 조립 · 문장 조립 · 대화 조립 · 음절 조립 · 낱말 말하기) |
| `result` | `correct` · `incorrect` · `skipped`(낱말 말하기 `Skip`) |
| `density` | `regular` · `compact`(그 문항의 밀도) |

- 발생: 채점 문항이 **처음 판정되는 순간 문항당 한 번**. 따라 읽기 · 단어 카드 · 문화 카드 · 짝 맞추기 · 타자 입력은 내지 않는다(채점 밖이거나 이번에 화면이 바뀌지 않음 — 비교 대상 아님). 듣기 여섯 유형은 `episode_listen_item_answered`와 **둘 다** 낸다(묻는 것이 다르다).
- 읽는 법: 유형별 정답률 = `itemType`별 correct ÷ (correct + incorrect) · 줄 배치 Check 뒤 오답률 = `itemType ∈ {LISTEN_BUILD, WORD_ORDER}`의 incorrect 비율 · 대화 조립 정답률 = `TURN_ORDER`. 모두 `density`로 갈라 작은 화면 효과를 본다.
  이탈(레슨 중단)은 기존 `episode_lesson_started` 대비 `episode_lesson_finished`로 충분하다.
- **한계**: 새 이벤트라 리디자인 전 기준선이 없다 — 전후 비교는 이탈 · 레슨 정답률(기존 이벤트)로, 유형별 값은 출시 뒤 추이와 밀도 간 비교로 읽는다. u00(미출시)에는 기존 이벤트의 기준선도 없다.

## 버린 대안

1. **카드 안 판정 칸을 남기기** — 모든 화면에서 52를 더 먹어 S2 · S10 · S13이 13 mini에서 넘친다(맥락 1).
2. **판정이 지시문을 「바꾸게」(지시문 노드를 배지로 교체)** — 2줄 지시문이면 줄 상자가 줄어 아래가 밀린다. 지시문을 흐름에 두고 가린다(D2).
3. **화면 전체를 한꺼번에 줄이는 하나의 compact** — 여유 있는 화면까지 캔버스에서 멀어진다. 화면마다 필요한 단계까지만(D1).
4. **로마자를 글자 간격으로 구별** — 토큰 값(0.12 ~ 0.32px)으로는 차이가 눈에 띄지 않아 모양 채널이 못 된다. Pretendard를 넣는 날의 대안은 로마자만 Jost(`font-family-accent`)다(재검토 조건 1).
5. **보기 전용 새 컴포넌트(설명 붙은 선택지)** — design-system 확장 규칙 3의 길이지만 같은 상태 표를 두 번 짓는다. `meaning` FE 확장으로 두고 design-system에 보고한다(「미확인 · 후속」 4).
6. **내 칸 · 내 조각을 `brand-strong`** — design의 권고(흰 5.46 · 뜻 4.96, AA 충족)였으나 **사용자가 시안 색 `brand-primary`를 골랐다**(「대가」 1).
7. **S13 답한 뒤 「나머지 보기 비활성」으로 남기기** — 긴 해설에서 13 mini가 46 ~ 58 넘친다. 사용자가 「고른 것만 남김」을 골랐다.
8. **긴 문항까지 스크롤 없게 예산을 더 깎기** — 가장 긴 몇 문항 때문에 모든 문항의 글자 · 그림이 작아진다. 사용자가 그 문항의 한 번 스크롤을 받아들였다(「대가」 2).
9. **셸 아래 기본 버튼을 ui-lynx `Button`으로 교체** — 값이 같고, 36파일 190곳의 단언이 함께 바뀌어 이 변경의 위험이 커진다(D18).
10. **Check를 칸이 다 찰 때만 세우기(지금 규칙)** — 「언제 채점되는가」가 보이지 않는다(맥락 4). 늘 서고 상태가 읽히는 쪽이 요구사항 「Check 버튼 상태가 읽힌다」를 직접 만족한다.
11. **문화 확인 짝을 「같은 단계의 같은 순번」으로만** — u00은 카드(`S12`)와 확인(`S13`)이 다른 단계다. 바로 앞 단계까지 본다(D15).
12. **오답 해설에 `why_wrong`** — 데이터의 값이 범용 문구(「이 자리에 맞는 말이 아니다」 등)라 해설이 되지 않는다.
13. **아바타를 문항 그림 키 규칙(`…image_url`)에 맞춰 이름 짓기** — 콘텐츠가 이미 `counterpart_avatar`로 준비 중이었다. 자산 목록이 키 이름을 하나 더 안다.

## 대가

1. **내 칸 · 내 조각의 흰 글씨 대비가 3.02다 — WCAG 1.4.3 AA 미달(사용자 수용).** `brand-primary` 위 흰 글자는 한글 · 뜻 줄 모두 큰 글자가 아니다. 뜻 줄을 `gray-200`(2.74) 대신 흰색으로 둬 이 면에서 낼 수 있는 최대로 올렸다.
   셸 아래 버튼(2026-09-28 승인 부채) · 문화 확인 내 말풍선(ChatBubble outgoing — ui-lynx 값 그대로)과 같은 값이다. 조각의 낭독 이름이 글 · 뜻을 모두 진다.
2. **13 mini에서 한 번 스크롤하는 문항이 있다(사용자 수용).** u03 대화 조립 다섯 문항(창고 3 ~ 4행 — `S2-02` · `S2-10` · `S4-09` · `S4-12` · `S4-18`)과 해설이 긴 문화 확인의 답한 뒤 일부[추론 — 예산 계산]. 수용 기준 「가장 긴 문장」은 이 예외를 뺀다. e2e에 「안전망」으로 기록한다.
3. **로마자 기울임은 시스템 서체에 기댄다.** SF Pro · Roboto의 진짜 기울임이다 — 앱에 Pretendard를 넣으면 합성 기울임이 되고 iOS는 조용히 똑바로 그릴 수 있다(재검토 조건 1).
4. **높이를 모르는 런타임은 compact다** — `SystemInfo`가 없는 옛 호스트 · 일부 테스트 환경에서 regular 기기가 compact로 보일 수 있다.
5. **밀도 문턱 756은 기기 목록 가정이다** — iOS 기준으로 잡았고 Android dp는 다양하다(낮으면 compact — 안전 쪽).
6. **outlined-subtle 기본 테두리 `gray-300`/흰 1.15** — 비글자 3:1 미달이다. outlined `gray-400`(1.35)의 design-system 승인 예외와 같은 부류로 둔다 — 항목은 라벨(17:1)과 누름 영역 전체로 식별된다. 새 variant이므로 design-system에 수치를 보고한다.
7. **`meaning` · `annotation`은 design-system 확장 규칙 3과 어긋나는 FE 확장이다** — 기록하고 보고한다(D5 · 버린 대안 5).
8. **번들** — 최종 HEAD(e354c3b0)를 `.env.local` 없는 같은 설정(`pnpm build && pnpm size:check`)으로 잰 앱 `main.lynx.bundle`은 기준 49dc553e 2,103,053 → **2,157,080 bytes(+54,027)** 이고 상한 2,385,000 안이라 올리지 않았다. ui-lynx `dist`는 528,482 → **548,402 bytes(+19,920)**, 상한 530,000 → 549,000(OptionSelector · ChatBubble 확장 — 사용자 사전 승인 규칙, 여유 598). 729e574b 때 실측(앱 +50,004 · ui-lynx +19,418) 뒤 접근성 반영 · 기기 결함 수정이 앱 +4,023 · ui-lynx +502를 더했다. 새 의존성 · 미디어 없음.
   **spec 예측(+14 ~ 22 kB)보다 크다** — 729e574b의 +50 kB는 예측 상단의 약 2.3배, 최종 +54 kB는 약 2.5배다. 몫은 로직 · ui-lynx 단계 +21.5 kB와 화면 · 결선 단계 +28.1 kB로 둘 다 예측을 넘었고, 어느 화면이 얼마인지는 재지 않았다(커밋 단위 몫). 나눔은 [성능 보고서 01](../performance/reports/lesson-redesign-iphone-13-mini-simulator-01.md) 「번들」.
9. **기존 ui · integration 단언이 대량으로 바뀌었다** — 보기 testid가 `ui-lynx-option-selector-item-choice-<i>`로 바뀌고 판정 칸 · 옛 보기 파일 셋이 지워졌다.
10. **RoundButton brand 아이콘(`S7` 재생 단추 포함)이 회색 면(`gray-100`) 위 `brand-primary`로 2.84다 — WCAG 1.4.11 비텍스트 3:1 미달(사용자 수용, 2026-10-22).** 접근성 감사는 `fg-brand`(짙은 주황)를 권했으나 사용자가 시안 색을 유지했다(D19). 단추는 이름(`Play` 등)과 원형 면 전체로 식별된다. 고치려면 ui-lynx `RoundButton` FE override(2026-09-21)를 함께 바꿔야 해 별도 과제로 둔다.

## 재검토 조건

1. **Pretendard를 앱에 넣으면**(ADR-0030 D3) — 로마자 기울임이 합성이 된다. 로마자만 `font-family-accent`(Jost) · medium · muted로 옮긴다(버린 대안 4).
2. **긴 데이터 문항의 안전망(한 번 스크롤) 비율이 늘면** — 새 에피소드에서 13 mini 스크롤 문항이 유형별 대표까지 번지면 §5 예산(그림 비율 · 카드 여백 · 글자 단계)을 다시 잡는다.
3. **주황 면 토큰을 다시 정하면** — 사용자가 `brand-strong`으로 가거나 design-system이 `brand-primary` 위 흰 글자를 고치면 대화 조립 · ChatBubble outgoing · 셸 아래 버튼을 함께 본다(「대가」 1).
4. **기기 목록이 바뀌면** — 쓸 수 있는 높이 756 근처의 지원 기기가 생기거나(Android 포함) e2e EU3에서 regular 기기가 넘치면 문턱을 다시 잰다.
5. **design-system이 Feedback 축 · 설명 붙은 선택지 · 말풍선 주석을 정식으로 내면** — FE 확장을 그 표면으로 옮긴다.
6. ~~**e2e EU8에서 빈칸 밑줄 색 · 두께가 서지 않으면** — 강조 조각을 `fg-brand` 색 + 기본 밑줄로 바꾼다.~~ **⟨2026-10-22 발동 · 적용⟩** iOS(13 mini 시뮬레이터)가 `text-decoration-color`를 무시해 밑줄이 글자색이었다. 강조 조각을 `fg-brand` 글자색 + 기본 밑줄로 바꿨다(D3 · D11). Android 확인은 남았다(e2e EU8).

## 미확인 · 후속

1. **성능 — 세 구간 시간** — [성능 보고서 01](../performance/reports/lesson-redesign-iphone-13-mini-simulator-01.md)은 번들 증가량 · 13 mini 화면별 높이만 쟀다. 남은 것: 실제 13 mini 기기 Release 빌드 baseline(49dc553e) / candidate 각 3회 — 레슨 시작 → 첫 문항 첫 그리기(u00 S2 · S7 · S13, 회귀 ≤ 10 %) · 보기 탭 → 판정 배지(≤ 100 ms) · S13 보기 탭 → 해설 판(≤ 150 ms), 렌더 · 프레임 · 메모리(e2e EU7).
2. **남은 기기 확인** — [학습 문항 리디자인 e2e](../e2e/lesson-redesign.md) 「결과」의 미실행 항목: Android(EU1-A · EU8) · VoiceOver · TalkBack 청취(EU5 — 해설 판 → `Continue` 도달, 판정 뒤 지시문 미낭독, `Check` → `Next` 초점 유지 포함) · 아바타 그림(EU6). ⟨2026-10-22⟩ 캔버스 대조(EU1) · regular 기기(EU3, iPhone 15 시뮬레이터) · 큰 글꼴(EU9, 해설 판 글 스크롤과 `Continue` 화면 안)은 최종 HEAD에서 실행했다 — EU3 · EU9 통과, EU1은 불일치 둘(neutral 듣기 아이콘 회색 · `S13` 머리 학습형 이름)을 기록만 했다.
3. **아바타 그림 업로드와 JSON 갱신** — 사용자(256×256 WebP 준비 중). 순서는 [콘텐츠 계약](../specs/episode-content-json-contract.md) §13 규칙 4.
4. **design-system 보고** — `outlined-subtle` 상태 대비(기본 테두리 1.15) · `meaning` · Feedback 축 · ChatBubble `annotation`.
5. GitHub wiki 이벤트 사전(`episode_item_answered`)은 저장소 밖이라 따로 고친다.
