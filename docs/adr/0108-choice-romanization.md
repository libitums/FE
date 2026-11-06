# ADR-0108 — 한국어 보기에 로마자 줄을 세우고 설정에서 켜고 끈다: ui-lynx `OptionSelector` `romanization` · 세션 옵션 하나를 기기에 저장

- 상태: **채택 — 클라이언트 쪽.** 서버 · 콘텐츠 형식 · 새 분석 이벤트 이름 · 새 토큰 0. ui-lynx 변경은 `OptionSelector` 하나(FE 확장 `romanization`)다.
  unit · ui · integration은 녹색이고(mobile unit 4707 · ui 2117 · integration 735), **기기 확인은 아직이다**([보기 로마자 e2e](../e2e/choice-romanization.md) CR-E1 ~ CR-E10 미실행).
  성능 보고서는 [번들만 잰 01](../performance/reports/choice-romanization-01.md)이고 13 mini compact 높이 실측은 e2e CR-E6의 몫으로 남았다.
- 날짜: 2026-11-06.
- **사용자 결정**(2026-11-06, 요구사항): 「한국어만 적힌 보기는 로마자를 한글 상단에 연한 회색 · 작은 글자로 보조 정보 제공, 사용자가 끄고 켤 수 있게」 — 설정에서 켜고 끄며 **기본은 켬**, 고른 값은 기기에 남는다. 듣기 문항도 보기 로마자를 보인다(답이 잘려 「듣기 문항도 보인다」로 읽음 — [추론], 이의 없음).
- **사용자 결정**(2026-11-06, 디자인 뒤):
  1. 「듣기 문항은 **제시문의 답 전 로마자를 없애고 보기 로마자를 보인다**」 — [ADR-0084](0084-lesson-item-redesign.md) D7(`beforeAnswer: "romanization"`)의 부분 대체. 답한 뒤 대본(한글 + 로마자)은 그대로.
  2. 「**스크롤은 최대한 없어야 한다**」 — compact 밀도의 보기 로마자는 한 단계 작은 글자(caption 11/16)로, 그 밖의 높이 절약도 찾는다. regular는 body-s.
  3. 「**문화 확인(CULTURE_CHECK) 보기도 넣는다**」(로마자 · 한글 · 뜻 세 줄).
- 다루는 축: **보기 로마자의 대상 유형과 원천 · 데이터 모양 · 표시 갈래와 기본값 · 설정의 자리 · 기기 저장 · ui-lynx 표면 · 보기 낭독 · 듣기 답 전 제시 · compact 높이 절약 · 측정**.
  **다루지 않는 것**: 콘텐츠의 빠진 로마자 채우기(콘텐츠 파이프라인 · 버킷 업로드 — 따로), 제시문 · 카드 · 대화 버블의 로마자, 다른 세션 옵션(자동 재생 · 대본 표시)의 설정 노출 · 저장, 본문 글꼴(PR #386 — 아래 D8), 서버 · 계정 동기화.
- 부분 대체: [ADR-0084](0084-lesson-item-redesign.md) D7 「`LISTEN_SELECT`는 답하기 전 로마자만」(결정 1). 같은 문장을 적용 기록으로 옮겼던 [ADR-0082](0082-item-audio-and-slow-playback.md) D13의 ⟨2026-10-22⟩ 줄도 닫는다.
- 예외: [ADR-0007](0007-app-internals-state-routing-data-errors.md) D1 「세션 옵션은 저장하지 않는다」의 **첫 예외 — 이 옵션 하나만** 저장한다(D3).
- 각 ADR에 적용 기록을 달았다: [0084](0084-lesson-item-redesign.md) · [0082](0082-item-audio-and-slow-playback.md) · [0007](0007-app-internals-state-routing-data-errors.md) · [0032](0032-account-sign-out-and-deletion.md). 설정 계약은 [설정 스펙](../specs/settings.md), 화면은 [화면 명세](../screens.md).

근거 표시: **[코드]** 저장소 코드(`apps/mobile/src/` 기준) · **[데이터]** 내장 u00 ~ u08 스캔 · **[실측]** 테스트 · 빌드 · **[사용자]** · **[추론]**.
계약의 정본은 저장소 밖 작업 폴더의 spec(고정 v1 + 접근성 정정)과 design이고 이 문서는 그중 **결정**만 옮긴다. 시그니처 · 클래스 · testid는 코드가 진다.

**왜 새 번호인가** — 실체화된 ADR-0084 D7을 뒤집고, ADR-0007 D1에 첫 예외를 내고, 설정에 첫 토글 · 기기 저장 키 · ui-lynx 표면이 한꺼번에 생긴다(ADR README 「형식」 — 여럿이 한꺼번에).

## 맥락

1. **보기 글은 한글인데 읽는 법이 없다.** 콘텐츠의 보기는 `options[].roman`(스키마 필수) · 빈칸 타일 `tiles[].roman`을 이미 갖지만 매핑 둘(`app/catalog-choice-map.ts` · `app/catalog-culture-map.ts`)이 버렸다 [코드]. 한글을 아직 못 읽는 학습자는 제시문 로마자만 보고 보기를 골라야 했다.
2. 보기를 그리는 화면은 `WordChoiceActivity` · `ListeningActivity` 둘이고 둘 다 `components/QuestionOptions` → ui-lynx `OptionSelector`를 쓴다(ADR-0084 D5) [코드].
3. 내장 u00 ~ u08에서 대상 유형의 보기 · 타일은 전부 한글이고 `roman`이 빈 것은 0개다. TRANSLATE_TO_EN 보기 68개는 전부 영어다 [데이터]. 요구사항의 「u03 빈칸 타일 188개 중 21개 빈 로마자」는 버킷 판 기준이다.
4. 세션 옵션은 `AppSession`의 상수였고(`initialSessionOptions`) 설정 화면은 토글을 그리지 않았다(PR #185 이후) [코드]. `session_option_changed` 이벤트 타입은 남아 있고 부르는 곳이 0이었다.
5. 듣기의 답 전 「로마자만」 갈래(ADR-0084 D7)는 카탈로그 매핑 어디에서도 실리지 않았다(늘 `nothing`) [코드] — 결정 1은 쓰이지 않는 갈래와 그 테스트를 지우는 일이다.
6. 13 mini compact 최장 4지선다 듣기(u03 `S1-14`)는 보기 아래 끝 약 612pt, 내용 한계 약 682pt다([성능 보고서](../performance/reports/lesson-redesign-iphone-13-mini-simulator-01.md)). design의 그림 계산으로 로마자 줄이 +68pt를 더해 2pt 남짓만 남는다 [추론] — 결정 2의 이유다.

## 결정

### D1. 대상은 보기 글이 한국어인 문항이고, 로마자가 빈 보기는 그 보기만 줄을 생략한다

| 유형 | 화면 | 원천 |
|---|---|---|
| LISTEN_SELECT · MIN_PAIR_AB | 듣기 | `options[i].roman` |
| ROLE_LINE · CLOZE_CHOICE · REPLY_SELECT · PARTICLE_FILL · PARTICLE_SWAP | 단어 선택 | `options[i].roman` |
| IMG_MATCH | 단어 선택(그림 2열) | `options[i].roman` |
| CULTURE_CHECK | 단어 선택(문화 확인) | `options[i].roman` — 뜻과 함께 세 줄(결정 3) |
| CLOZE | 단어 선택 | `tiles[order[i]].roman` — **섞은 순서 그대로** |

- TRANSLATE_TO_EN(영어 보기)은 키를 싣지 않는다. 그 밖의 유형 · 최종 테스트 · 이야기 최종은 범위 밖이다.
- 로마자가 없거나 비면 그 보기만 줄이 없다 — 다른 보기는 그대로이고 빈 줄을 남기지 않는다. 콘텐츠를 채우는 일은 따로 한다(「미확인 · 후속」 3).

### D2. 데이터는 늘 문항에 실리고, 표시 여부만 화면이 설정에서 받는다

- 문항 타입(`WordChoiceQuestion` · `ListeningQuestion`)에 `choiceRomanizations?: readonly (string | null)[]` — 있으면 길이 = 보기 수(표시 순서), 빈 자리는 `null`, 하나라도 있을 때만 키가 있다. 정규화는 `choiceRomanizationsOf` 한 곳(치환 · trim)이다.
- 설정을 바꿔도 다시 매핑하지 않는다. 다시 풀기(`catalog-review.ts`)는 같은 문항 객체를 쓰므로 손대지 않았다.

### D3. 표시 갈래 · 기본값 · 설정 자리 · 저장 — ADR-0007 D1의 새 예외

- 세션 옵션 키 셋째 `show-choice-romanization`, **기본 켬**. 화면은 불리언이 아니라 갈래 `ChoiceRomanization`(`"shown"` | `"hidden"`)를 받는다.
- 설정 탭 목록 **맨 위** 새 묶음 `Learning`에 토글 하나 — 제목 `Romanization on choices` · 설명 `Show how each Korean answer is read, in small text above it.`(다섯 언어 동시). 맨 위인 까닭은 이동 묶음이 길어 그 아래면 13 mini 첫 화면 밖이기 때문이다(design).
- **저장 키 `libitum.session-option.show-choice-romanization`** — 값 `"on"` / `"off"`, **정확히 `"off"`일 때만 끔**이고 없음 · 깨짐 · 읽기 실패는 켬이다. 쓰기 실패는 삼킨다(이번 실행의 상태는 유지). 범위는 **기기**이고 로그아웃 · 계정 삭제에 남는다([ADR-0032](0032-account-sign-out-and-deletion.md) 표).
- 상태의 주인은 여전히 `useState` 하나(`app/use-session-options.ts`, 초기화 함수가 저장값을 읽는다)다. 다른 두 옵션은 저장하지 않는다 — ADR-0007 D1의 「세션 옵션은 저장하지 않는다」는 이 키 하나만 빼고 그대로다.

### D4. ui-lynx `OptionSelector`에 FE 확장 `romanization` — 라벨 위 한 줄

- `OptionSelectorOption.romanization?: string`(빈 값 = 없음). 항목 안 줄 순서는 위에서부터 **로마자 → 라벨 → 뜻**(있는 것만). 로마자 · 뜻이 모두 없으면 지금처럼 라벨 `<text>` 하나라 끔 경로의 DOM이 바뀌지 않는다.
- 줄 모양은 기존 로마자 역할(기울임 · medium · muted)의 작은 판 — 뜻 줄의 크기 · 상태 색 규칙을 공유하고 `font-style: italic` 규칙 하나만 더한다. 새 토큰 0, ui-lynx에 앱 글꼴 이름을 넣지 않는다.
- 줄이 있고 없음을 JSX 조건식이 아니라 **정적 갈래 셋**(로마자만 · 뜻만 · 둘 다)으로 나눈다 — ReactLynx에서 조건부 자식은 줄마다 wrapper를 끼워 DOM 순서를 흐린다. ui-lynx `dist` 증가의 대부분이 이 갈래로 본다(추정 — 「대가」 1).
- design-system 보고 대상이다(ADR-0084 「미확인 · 후속」 5에 더함).

### D5. 낭독 — `한글, Pronunciation: 로마자[, 뜻][, 판정]`

- 켬이면 보기의 접근성 이름에 로마자를 더한다. 로마자 조각은 `copy.readAloud.pronunciation(roman)`(`Pronunciation: …`)으로 감싼다 — ADR-0084 D19 「로마자는 모든 화면에서 이 접두로 읽는다」와 맞춘다(접근성 감사 CR-A1 반영, 2026-11-06). 예: `안녕하세요, Pronunciation: annyeonghaseyo` · 문화 확인 `잘 먹겠습니다, Pronunciation: jal meokgetseumnida, Thank you for the food, Correct`.
- 로마자 줄 자체는 접근성 요소가 아니다(항목 surface가 가린다 — 기존 구조). 끔이면 이름이 지금과 같다. 구분자는 쉼표 + 공백(ADR-0016 D3).

### D6. 듣기 답 전 제시는 재생 줄만 — 로마자는 보기로 (결정 1)

- `ListeningBeforeAnswer` · `ListeningQuestion.beforeAnswer` · `ListeningPromptProps.beforeAnswer` · 대본 갈래 `"romanization"`을 지웠다. 대본 갈래는 `none` | `full` 둘이다.
- 답 전 제시 카드 = 재생 줄만(구분선 · 로마자 · 한글 대본 없음). 답한 뒤(또는 대본 표시 설정이 켜지면) 한글 + 로마자 — 지금과 같다. 소리 없는 문항(`audio === null`)이 대본을 처음부터 보이는 규칙도 그대로다.
- 켬이면 보기 로마자는 **답 전부터** 선다. 보기 한글은 원래 보이므로 로마자가 정답을 새로 드러내지 않는다 — ADR-0082 D13 「대본은 답한 뒤에만」은 제시문 대본에 대한 결정이고 보기 정보와 충돌하지 않는다.

### D7. compact 밀도에서 높이를 줄인다 (결정 2)

- `QuestionOptions` 바깥 상자에 밀도 클래스(`question-options-compact` · `-regular`)를 달고, compact에서만 두 규칙:
  - 보기 로마자 줄 → `typography-caption-*`(11/16, 굵기 medium 유지 — 색 · 기울임은 ui-lynx 규칙 그대로라 상태 색 우선순위가 바뀌지 않는다).
  - 보기 글 묶음 row-gap → 0.
- regular는 design 그대로(body-s 12/18 · row-gap `spacing-2`). 기대 절감은 약 20pt(+68 → 약 +48, 13 mini 한계 대비 약 22pt 여유)이고 **추정**이다 — 판정은 e2e CR-E6의 13 mini 실측이다.

### D8. 글꼴 — PR #386과의 병합 순서

새 글꼴 이름을 정의하지 않는다. 지금 main에서는 body-s family = 로마자 역할 family라 할 일이 없다. PR #386(ADR-0107, 로마자 글꼴 Duru Roman)과 **둘째로 병합되는 쪽**이 로마자 family 선언을 `.text-role-romanization`과 `.ui-lynx-option-selector-romanization`이 공유하는 선택자 묶음 하나로 옮긴다 — 목록을 복사하지 않는다.

### 측정

새 이벤트 0 — 기존 `session_option_changed`(ADR-0029)의 `option`에 값 `show-choice-romanization`이 생겼다. 토글 tap → 상태 · 저장 **직전** 1회, `value`는 바뀐 뒤 값. 새 지표는 두지 않는다(요구사항 「측정 — 없음」).

## 버린 대안

1. **보기 전용 새 컴포넌트** — 같은 상태 표(선택 · 판정 · 비활성)를 두 번 짓는다. `meaning`과 같은 FE 확장으로 둔다(ADR-0084 버린 대안 5와 같은 판단).
2. **매핑이 설정을 읽어 다시 매핑** — 설정을 바꿀 때마다 문항을 다시 만들고 다시 풀기와 갈린다. 데이터는 늘 싣고 표시만 가른다(D2).
3. **화면 prop 불리언** — 불리언 prop이 화면마다 늘어난다. 갈래 `ChoiceRomanization` 하나로 받는다.
4. **세션 옵션 전체를 JSON 하나로 저장** — 자동 재생 · 대본 표시까지 저장 대상이 되어 ADR-0007 D1을 한꺼번에 바꾼다. 사용자가 고른 것은 이 옵션 하나다.

## 대가

1. **ui-lynx `dist` 상한을 올렸다** — 실측 557,772 bytes, 앞 기준 556,388 대비 +1,384 bytes(계약 · 검증 · 정적 갈래 JSX 셋 · CSS · 타입 선언 · 소스맵). 상한 556,000 → 559,000(사전 승인 규칙 — 실제 기능 성장). 앱 `main.lynx.bundle` 3,911.0 kB는 상한 4,060 kB 안이라 그대로다([성능 보고서](../performance/reports/choice-romanization-01.md)).
2. **보기가 한 줄씩 높아진다** — 13 mini compact 최장 4지선다는 안전망(ADR-0022 · 0084 D1)에 닿을 수 있다. 실측 전이다(CR-E6).
3. **설정 셀의 상태 낱말이 영어다(CR-A2, Major)** — ui-lynx `SettingsCell`이 `on` / `off` 리터럴을 낸다(기존 한계, [설정 스펙](../specs/settings.md) 개정 2026-09-29의 ⚠). vi · ja 사용자는 상태를 알아듣기 어렵다. **vi 배포 전에 닫기를 권한다** — ui-lynx 변경 · `dist` 예산이라 별도 작업이다(「미확인 · 후속」 1).
4. **iOS에서 셀이 `button`으로 읽힌다(CR-A3, Minor)** — Lynx traits에 switch가 없다. 두 번 탭 뒤 새 상태가 들리지 않을 수 있다. CR-A2의 값 속성과 함께 고친다.
5. **로마자 조각의 언어를 지정할 수 없다(CR-A4, 플랫폼 한계)** — Lynx에 요소 · 조각 단위 언어 속성이 없어 어느 음성이 로마자를 읽을지 OS 판별에 맡겨진다. `Pronunciation:` 접두가 피해를 줄인다. 언어별 청취는 CR-E5에서 들은 그대로 적고, 글자 단위로 읽히는 언어가 있으면 이 절에 더한다.
6. **PR #386과 병합 순서가 걸린다**(D8) — 둘째로 병합되는 쪽이 선택자 한 줄을 옮겨야 보기 로마자가 제시문 로마자와 같은 글꼴이 된다(CR-E10).

## 재검토 조건

1. **13 mini compact 실측(CR-E6)에서 `S1-14` · `S2-04`가 스크롤하면** — 결정 2에 어긋난다. 로마자를 보기 오른쪽으로 옮기거나 regular 문턱(ADR-0084 D1)을 다시 본다.
2. **다른 세션 옵션을 설정에 내거나 저장하게 되면** — ADR-0007 D1의 예외가 둘이 되는 날이다. 그때 세션 옵션 저장을 한 규칙으로 묶을지 정한다. 세션 옵션을 읽는 화면이 넷이 되거나 prop 깊이가 3을 넘으면 D1의 도입 조건도 함께 본다.
3. **design-system이 설명 붙은 선택지 · 보조 줄을 정식으로 내면** — `romanization` · `meaning` FE 확장을 그 표면으로 옮긴다.
4. **CR-E5에서 로마자가 글자 단위로 읽히는 UI 언어가 있으면** — 낭독에서 로마자를 뺄지(D5 · ADR-0084 D19를 함께 바꾸는 결정) 다시 본다.

## 미확인 · 후속

1. **CR-A2 · CR-A3 — SettingsCell 상태 낱말 번역 · iOS 역할**(ui-lynx `stateLabels` + 값 속성). 별도 작업, vi 배포 전 권고.
2. **기기 확인** — [보기 로마자 e2e](../e2e/choice-romanization.md) CR-E1 ~ CR-E10 전부 미실행(13 mini compact 높이 · iPhone 15 regular · 실제 서체 · VoiceOver/TalkBack 청취 · 강제 종료 뒤 유지 · 큰 글자 · Android · #386 뒤 글꼴).
3. **콘텐츠의 빠진 로마자 채우기** — 사용자 결정은 「콘텐츠에 채우기」다. 콘텐츠 파이프라인 · 버킷 업로드 작업으로 따로 한다. 그때까지 빈 보기는 줄을 생략한다(D1).
4. **design-system 보고** — `OptionSelector` `romanization`.
5. GitHub wiki 이벤트 사전의 `session_option_changed`(새 `option` 값)는 저장소 밖이라 따로 고친다.
