# ADR-0201 — 말하기 채점을 발음 기준으로: 띄어쓰기 · 받침 표기 · 작은 오차를 받고, 「통과」는 모범 정답과 함께

- 상태: **채택 — 채점 규칙(`@libitums/episode-core/judge`) · 앱의 순수 판정 함수만 바꿈. 화면은 「앱 인계」(D6)로 남김.**
  서버 · 마이그레이션 · Edge Function 변경 없음.
- 날짜: 2026-11-26. 브랜치 `hyesungKomet/stt-refinement`.
- **개정 ⟨부정어 · 앞 낱말 · 어간 · 렌더 밖 판정⟩(2026-11-27)**: 브랜치 `feat/spoken-judge`(#628을 이어받음, 작성자 커밋 보존).
  검토에서 뜻이 반대인 답이 맞음으로 나왔다(아래 「개정」 절). 사용자 승인 2026-11-27 「진행」.
- **사용자 말**(2026-11-25): 「내장 STT를 쓰는 영역들 … 띄어쓰기, 약간의 오차 등도 오답으로 처리하는 거 같아서 그 로직을 수정하고자 해」.
- **사용자 결정**(2026-11-25 ~ 26, 대화로):
  - 앱의 말하기 문항 · 롤플레이를 체험판의 발음 기준 판정 계열로 바꾼다.
  - 완벽하게 같지 않고 기준 이상이라 정답으로 처리하는 경우(「통과」)는 **맞았다는 표시와 함께 모범 정답을 보인다**.
  - 짧은 정답은 비율 대신 **길이별 허용 오차 개수**로(D2).
  - 숫자 표기(`3개` ↔ `세 개`)는 이번에 넣지 않고, 콘텐츠에 몇 문항이나 걸리는지 센 뒤 정한다(D7).
  - 화면 변경은 이 PR에 넣지 않고 ADR로 남긴다.
- 이어받는 결정: [ADR-0083](0083-web-trial-and-episode-core.md)(체험판 · 공유 패키지 episode-core, 발음 판정 r3) ·
  [ADR-0181](0181-speech-no-match-retry.md)(못 알아들음은 다시 말하기).

## 왜

앱에서 STT 결과를 채점하는 곳은 셋이다.

| 영역 | 문항 / 화면 | 판정 함수(전) | 정오답 |
|---|---|---|---|
| 커리큘럼 | SPEAK_WORD → `screens/speak-word` | `judgeSpokenWord` → `judgeSpeaking` | 낸다 |
| 커리큘럼 | SHADOW → `screens/read-aloud` | `matchedWordCount`(앞에서부터 이어 맞은 낱말 칠하기 · 「n/m」) | 안 낸다 |
| 롤플레이 | `screens/roleplay-story/RoleplayTalkScreen` | `judgeRoleplayReply` | 낸다 |

셋 다 `judgeSpeaking` 계열이고, 이 규칙은 공백으로 낱말을 나눠 **`heard[i] === target[i]`로 글자 그대로** 비교했다. 그래서
`비밀번호`/`비밀 번호`(띄어쓰기), `먹어요`/`머거요`(연음), `할게요`/`할께요`(된소리 표기), `음 안녕하세요`(앞 군말), 오탈자 하나가
모두 오답이었다. 인식기는 같은 소리를 여러 맞춤법으로 적으므로, 학습자가 바르게 말해도 틀렸다고 나왔다.

랜딩 체험판에는 r3에서 만든 발음 기준 판정(`judgeSpokenLenient` — 자모 발음형 + 편집 거리)이 이미 있었지만, 앱은 쓰지 않았다
(파일 머리말 「앱 채점은 바꾸지 않고」).

## 결정

### D1. 세 등급 — perfect · close · incorrect (`judgeSpokenAnswer`)

`packages/episode-core/src/judge/spoken-answer.ts`. 인식 결과 한 줄과 받아 주는 정답들(+ 이름 · 나라 와일드카드)을 받는다.

| 등급 | 뜻 | 정오답 |
|---|---|---|
| `perfect` | 낱말 그대로 맞음(전 규칙 `judgeRoleplayReplyExact`) **또는 발음형이 같음** — 띄어쓰기 · 연음 · 받침 표기 · 된소리 · ㅐ/ㅔ · 군말만 다름 | correct |
| `close` | 발음형이 조금 다르지만 허용 오차 안(D2) | correct |
| `incorrect` | 그 밖 | incorrect |

- 정답이 여럿이면 등급이 높은 것, 같으면 일치도가 높은 것, 그것도 같으면 먼저 온 정답이 이긴다. 결과의 `expected`가 그 정답이다.
  화면은 close일 때 이 값을 모범 정답으로 보인다(D6).
- 전 규칙으로 맞던 답은 그대로 맞는다(perfect). **새 규칙은 전보다 엄격해지는 곳이 없다.** — 개정 E1로 예외 하나: 정답 뒤에
  부정어를 덧붙인 답(`좋아요` ← `좋아요 안`)은 전 규칙에서 맞았지만 이제 오답이다.
- `judgeRoleplayReply`(앱 롤플레이가 부르는 이름)는 이제 `judgeSpokenAnswer(...).result`다. 전 규칙은 `judgeRoleplayReplyExact`로
  이름을 바꿔 남겼다(perfect 판별 · 체험판의 `strict`).
- SPEAK_WORD의 `judgeSpokenWord`도 `judgeSpokenAnswer(answers, heard).result`다.

### D2. 허용 오차 — 비율 하나가 아니라 정답 길이로

비율 하나(0.75)로는 짧은 정답에서 자모 하나가 25%라 `고기`/`거기`가 통과했다. 정답의 발음형 자모 수(와일드카드 낱말 제외)로 정한다.

| 자모 수 | 허용 편집 거리 | 예 |
|---|---|---|
| 5개 이하 | 0(발음형이 같아야) | `고기` 4 · `카드` 4 · `가방` 5 · `고양이` 5 |
| 6 ~ 11개 | 1 | `처음이에요` 7 · `지금부터요` 10 |
| 12개 이상 | 25% 내림(전 0.75와 같음) | `카드로 할게요` 12 → 3 · u00 T1 19 → 4 |

- 마디 하한(마디 하나라도 일치도 0.5 미만이면 오답 — 절반만 말하기 막기)은 그대로 둔다. 단 **자모 3개 미만 마디**
  (`네` · `응` 같은 맞장구)는 하한을 보지 않고 전체 허용 오차가 받는다.
- 상수: `SPOKEN_EXACT_MAX_UNITS = 5` · `SPOKEN_ONE_SLIP_MAX_UNITS = 11` · `SPOKEN_LENIENT_THRESHOLD = 0.75` ·
  `SPOKEN_SEGMENT_FLOOR = 0.5` · `SPOKEN_FLOOR_MIN_UNITS = 3`.

### D3. 들은 말은 낱말 단위로만 건너뛴다

전 체험판 규칙은 정답 마디를 들은 말 **아무 자모 위치**에서 시작하는 구간과 맞췄다. 그래서 `현금으로 할게요`의 `금으로`가
`카드로`와 자모 셋 차이로 맞춰져 롤플레이 답이 정답이 됐다(뜻이 반대). 이제 구간은 **들은 말의 낱말 경계에서만** 시작하고 끝난다.

- 앞뒤에 덧붙은 낱말(`카드 주세요`, `그러니까 지금부터요`)은 여전히 공짜다. — **개정 E2로 바뀜: 뒤 낱말만 공짜, 앞 낱말은 군말만 공짜.**
- 낱말 경계는 인식 결과의 띄어쓰기에서 온다(`spokenTrackOf` — 발음형 단위열 + 낱말 시작 자리). 연음은 경계 너머로도 일어난다.
- 붙은 어미(`카드요` ← `카드`)는 덧붙은 낱말이 아니라 오답이다(전과 같음).
- 대가: 인식기가 정답의 **마디 경계를 넘어** 붙여 적으면(`네, 처음이에요` ← `네처음이에요`) 짧은 마디가 떨어질 수 있다. 전 규칙도
  오답이었으므로 퇴보는 아니다.

### D4. 와일드카드(이름 · 나라)는 마디를 끊는 자리

와일드카드가 든 낱말(`Emma로`, `미국에서`)은 비교에서 빼고, **그 자리에서 마디를 끊는다**. 끊긴 조각도 마디라 하한을 받는다.

- `저는 [미국에서] 왔어요. 여기서 며칠 묵어요?` ← `저는 캐나다에서 왔어요 여기서 며칠 묵어요` = perfect.
- 조각 하나(`왔어요`)를 빠뜨리면 하한이 막는다 = incorrect.
- 마디 순서가 바뀌면(`여기서 며칠 묵어요 저는 왔어요`) 전 규칙은 오답이었지만 이제 **close**다. 체험판 r3 규칙(마디 순서 무관)과 같다.
- 정답이 와일드카드뿐이면 무언가 말해야 맞는다(전과 같음).

### D5. 체험판도 같은 잣대

`judgeSpokenLenient`(체험판)의 통과 기준을 D2 · D3 · D4와 같게 바꿨다. `strict`/`lenient`/`incorrect` 모양과 화면은 그대로다.

- 체험판 사례 표(spec-r3 §5)의 판정은 **모두 그대로**다. 일치도 숫자만 D3 때문에 낮아졌다
  (예: T1 ← `안녕하세요` 0.684 → 0.526). 수집 이벤트의 `similarity` 값 분포가 이 날짜부터 조금 내려간다.
- 체험판 스크립트 46,053 B — 상한(IB5)을 실측 100 B 올림으로 **46,100**(ADR-0083 대가 11의 방식).

### D6. 앱 인계 — 화면에서 할 일(이 PR에 없음)

판정은 이미 바뀌었다(close도 correct). 아래는 「통과」를 학습자에게 보이는 화면 작업이다.

**1) 롤플레이 말하기(`screens/roleplay-story/RoleplayTalkScreen.tsx`)**
- 지금: correct면 「Great」 + 나 말풍선에 `turn.accepted[0]` + 번역, incorrect면 「Not quite」 + 들은 말 + `correctAnswer(accepted[0])`.
- 바꿀 것: 판정을 `judgeRoleplayReply` 대신 `judgeSpokenAnswer(turn.accepted, outcome.text, wildcards)`로 받아 상태에 `grade` ·
  `expected`를 싣는다(`roleplay-story.contract.ts`의 `heard` 액션 · 상태에 필드 추가).
  - perfect: 지금 correct와 같음. 단 말풍선 문장은 `accepted[0]` 대신 **`expected`**(학습자가 말한 쪽에 가장 가까운 정답).
  - **close: 맞음 표시(「Great」 · 정답 효과음) + 말풍선에 `expected` + 그 아래 「모범 답안」 표지와 함께 들은 말을 작게** —
    학습자가 무엇이 달랐는지 보게 한다. 번역 줄은 perfect와 같음.
  - incorrect: 지금과 같음. 단 `correctAnswer(expected)`.
- 결과 집계 · 다음 턴 이동은 `verdict`(correct/incorrect) 그대로 — close도 맞은 수에 든다.

**2) SPEAK_WORD(`screens/speak-word/SpeakWordActivity.tsx` · `speak-word.ts`)**
- 지금: 판정 뒤 `AnswerReveal`이 정오답과 상관없이 첫 정답(`answers[0]` · 로마자)을 보인다. 맞음 표시는 `verdict`.
- 바꿀 것: `speakWordResultAt` 옆에 등급까지 내는 순수 함수(예: `speakWordJudgementAt` → `SpokenAnswerJudgement | null`)를 두고,
  - 보이는 정답을 `answers[0]` 대신 **`expected`**로(정답이 여럿일 때 학습자가 말한 쪽).
  - **close: 맞음 표시 그대로 + reveal에 「모범 답안」 표지**(perfect는 지금처럼 정답만). 낭독(`speakWordResultAnnouncement`)도
    close면 「정답, 모범 답안 …」.

**3) 문구(화면 언어 여덟 — `lib/ui-copy-*.ts`)**
- 새 문구 하나: 「모범 답안」 표지(예: en `Model answer`). `ui-copy.contract.ts`에 키를 더하고 여덟 언어(en · es · id · ja · my · th ·
  vi · zh-tw)를 채운다. 테스트 `ui-copy-literals`가 화면 리터럴을 막는다.

**4) SHADOW 따라 읽기(`screens/read-aloud`) — 정하지 않음, 제안만**
- 정오답을 내지 않고 낱말 칠하기(`matchedWordCount`, 글자 그대로)만 한다. 띄어쓰기만 달라도 「2/5」로 보인다.
- 제안: 발음형으로 낱말을 맞추는 칠하기(낱말마다 `spokenUnitsOf` 비교 · 앞에서부터 이어서). 칠하기는 「어디까지 말했나」를 보이는
  값이라 허용 오차는 두지 않는다. 별도 결정이 필요하다.

**5) 측정(선택)**
- `episode_item_answered`(말하기)에 `grade`(perfect/close/incorrect)를 싣으면, close 비율로 D2 기준이 너그러운지 볼 수 있다.

### D7. 남은 것 — 숫자 표기(이번에 안 함)

인식기는 `세 개`를 `3개`로 자주 적는다. 발음형은 아라비아 숫자를 한글로 읽지 않으므로 이 경우는 여전히 오답이다.

- 먼저 운영 콘텐츠의 SPEAK_WORD · 롤플레이 정답 중 숫자 말(`하나 · 둘 · 셋 …` · `일 · 이 · 삼 …` · 단위 앞 `한 · 두 · 세 · 네 · 스무`)이
  든 것을 센다.
- 많으면: 들은 말의 숫자마다 한자어(`삼십오`) · 고유어 관형형(`세` · `스무`) · 고유어 기본형(`셋`) · 숫자 그대로를 후보로 펼쳐 가장 높은
  일치도를 쓴다(숫자 2 ~ 3개면 9 ~ 27 조합).
- 적으면: 콘텐츠에서 받아 주는 정답에 숫자 표기를 하나 더 넣는다(코드 변경 없음).

## 개정 ⟨부정어 · 앞 낱말 · 어간 · 렌더 밖 판정⟩(2026-11-27)

검토(이어받기 전 #628)에서 발음은 가깝지만 뜻이 반대인 답이 맞음으로 나왔다.

| 정답 ← 들은 말 | #628 | 원인 | 개정 뒤 |
|---|---|---|---|
| `좋아요` ← `안 좋아요` (`괜찮아요` · `갈게요`도) | perfect | 앞 낱말 `안`을 공짜로 건너뜀(D3) | incorrect(E1 · E2) |
| `네, 한국 음식을 좋아해요.` ← `아니요 한국 음식을 좋아해요` | close | 앞 낱말 공짜 + 마디 `네`는 하한 제외 | incorrect(E1) |
| `네, 한국 음식을 좋아해요.` ← `한국 음식을 안 좋아해요` | close | 자모 2개 삽입이 25% 안 | incorrect(E1) |
| `한국 음식을 좋아해요.` ← `한국 음식을 싫어해요` | close | 자모 3개 바뀜이 25% 안 | incorrect(E1) |
| `저는 학생이에요` ← `저는 학생이 아니에요` | close | 삽입이 25% 안 | incorrect(E1) |
| `오늘 날씨가 좋네요.` ← `오늘 날씨가 안 좋네요` | close | 삽입이 25% 안 | incorrect(E1) |
| `안녕히 가세요` ← `안녕히 계세요` | close | 자모 1개 바뀜이 25% 안 | incorrect(E3) |
| `사과` ← `이거 사과` | perfect | 앞 낱말 공짜 | incorrect(E2) |

### E1. 부정어 — 한쪽에만 있으면 incorrect (`negationMismatch`, `spoken-negation.ts`)

한국어 부정은 짧은 부사 하나(`안` · `못`)나 어간 하나(`없-` · `않-` · `싫-` · `모르-` · `아니-`)로 붙는다. 자모 2 ~ 4개라
길이 허용 오차(D2) 안으로 들어오고, 앞에 붙으면 D3의 「덧붙은 낱말」로 건너뛰어졌다. 그래서 거리와 따로 **낱말 단위로 센다**.

| 갈래 | 들은 말의 낱말이 이러면 | 예 |
|---|---|---|
| 안 · 못(짧은 부정) | 낱말 전체가 `안` · `못`, 또는 `안`/`못` + 상대 쪽 낱말(인식기가 붙여 적음) | `안 좋아요` · `안좋아요` · `못 가요` |
| 아니(부정 대답 · 부정 서술) | `아니` · `아닌` · `아닙` · `아냐` · `아뇨` · `아녜`로 시작 | `아니요` · `아니에요` · `아닙니다` |
| 없 · 않 · 싫 | 그 글자가 든 낱말 | `없어요` · `맛없어요` · `좋지 않아요` · `싫어해요` |
| 모르(알다의 부정) | `모르` · `몰라` · `몰랐` · `모릅` · `모를`로 시작 | `몰라요` |
| 말(금지) | 앞 낱말이 `-지`로 끝나고 `마` · `마요` · `마세요` · `말아요` · `말고` · `마라` · `말자` · `맙시다` …, 또는 붙여 적은 `-지마세요` · `-지마` | `앉지 마세요` · `하지마세요` |

- **정답 쪽에 같은 갈래가 있으면 그 갈래는 보지 않는다** — `아니요, 괜찮아요.` ← `아니요 괜찬아요`는 그대로 perfect.
- **양방향(PR 리뷰 반영)**: 정답의 부정어를 들은 말이 빠뜨려도 incorrect(`오늘은 안 가요` ← `오늘은 가요`, `시간이 없어요` ← `시간이 있어요`).
  인식기가 소리대로 적은 경우(`맛없어요` ← `맛업서요`)는 소리 표지(`업` · `실` · `몰` …)가 있으면 빠뜨리지 않은 것으로 본다.
- `안녕하세요`의 `안`은 세지 않는다(낱말 전체가 `안`이거나 뒤가 상대 쪽 낱말과 같을 때만).
- 앱 `judgeSpokenAnswer`에서는 그 정답의 등급이 incorrect, 체험판 `judgeSpokenLenient`에서는 그 (정답, 대안) 쌍이 strict · lenient가
  되지 못한다(다음 대안은 본다).
- 근거: 표준 국어 문법의 부정문(짧은 부정 `안`/`못` + 용언, 긴 부정 `-지 않다`/`-지 못하다`/`-지 말다`)과 부정 어휘(`없다` · `아니다` ·
  `모르다` · `싫다`). 반대말 전체(크다/작다)는 사전 없이 가를 수 없어 E3이 받는다.
- 대가: 명사 `안`(「가방 안」을 인식기가 `안 에`로 끊어 적는 경우)이나 `못`(나무 못)은 정답에 없으면 오답이 된다. 드물다고 본다.

### E2. 앞에 덧붙은 낱말 — 군말만 공짜

D3의 「앞뒤 낱말 공짜」를 고친다. 마디마다 맞춘 구간의 시작 중 가장 앞 자리보다 **앞에 있는 들은 말의 자모를 모두 거리로 센다**.
군말(`어 · 음 · 아 · 그 · 으 · 흠 · 엄`과 반복, 기존 목록)은 발음형을 만들 때 이미 빠지므로 여전히 공짜다.

- `사과` ← `이거 사과` = incorrect(자모 3개, 허용 0). `카드로 할게요.` ← `저 카드로 할게요` = close(자모 2개, 허용 3).
- 마디 순서 바뀜(`감사함니다 진짜요`)은 그대로 — 앞 자리는 마디들 중 가장 앞이다.
- 뒤에 덧붙은 낱말(`사과 주세요`)은 그대로 공짜(전 앱 규칙과 같다).
- 정답이 와일드카드 낱말로 시작하면(`Emma로 예약했어요.`) 들은 말 앞의 낱말은 그 자리라 세지 않는다.
- 같이 고친 것: 구간 시작 경계 바로 뒤에 끼어든 자모(연음으로 넘어온 받침, `저는 왔어요`의 `ㄴ`)는 하나씩 센다. 전에는 첫 자모를
  바꿈으로만 맞출 수 있어 거리가 1 더 나왔다. 기존 사례 표의 판정 · 일치도는 그대로다.

### E3. 낱말 첫 음절(어간 자리)은 바뀌면 안 된다

`가세요`/`계세요`(가다 / 계시다), `좋아해요`/`싫어해요`처럼 뜻을 가르는 차이는 대개 **낱말 첫 음절**에 있고, 어미의 차이
(`어디예요`/`어디에요`, `안녕하세요`/`안녕하세여`)는 뒤에 있다. 정답 낱말마다 첫 음절의 초성(ㅇ이면 없음) · 중성 자리를 두고,
최소 편집 맞춤에서 그 자리가 **다른 자모로 바뀌면**(빠지거나 끼어든 것은 제외) 통과하지 않는다(`SpokenSimilarity.stemSlips`).

- 버린 대안: 짝 표(반대말 · 존대 짝을 하나씩 적기)는 콘텐츠가 늘 때마다 빠진다. 허용 오차를 줄이기(25% → 15%)는 `카드루 할게요` ·
  `안녕하세여` 같은 받아 줘야 할 답까지 떨어뜨린다.
- 맞춤이 여럿이면 일치 · 빠짐 · 끼어듦을 바꿈보다 먼저 고른다(같은 거리면 너그럽게).
- 대가: 첫 음절을 잘못 들은 긴 낱말(`비빔밥` ← `피빔밥`)은 이제 오답이다. 뜻을 가르는 자리라 엄격한 쪽을 택했다.

### E4. 렌더 밖 판정 — SPEAK_WORD

`SpeakWordActivity`가 렌더 중에 `speakWordResultAt(question, state)` → `judgeSpokenAnswer`를 불렀다. 이 함수는 `"background only"`라
메인 스레드에서는 몸통이 비어 `undefined`를 돌려준다(위 「배포」 경고). #642 뒤로 메인 스레드는 첫 화면만 그려 실제로 터지지는 않지만,
첫 화면이 판정 국면으로 그려지는 날 깨진다.

- 판정은 인식 결말 콜백(배경 스레드)에서 `speakWordJudgementOf(question, outcome)`로 재고, `outcome` 동작에 실어 상태
  `judgement`(`SpokenAnswerJudgement | null`)에 담는다. 렌더는 `speakWordResultAt(state)`로 담아 둔 값만 읽는다.
- 세션 결과(`speakWordSessionResults`)는 끝낼 때(탭 핸들러) 다시 잰다 — 배경 스레드다.
- 롤플레이는 이미 결말 콜백에서 판정한다(`RoleplayTalkScreen`).

## D6 적용 1 ⟨말하기 퀴즈 화면⟩(2026-11-27, 브랜치 `feat/speak-word-ui`)

시안(말하기 개선 시안 S1 ~ S4, 사용자 승인 2026-11-27 「진행」)대로 SPEAK_WORD 화면을 바꿨다. 근거 데이터: Android 말하기 정답률 50%,
오답 화면이 들은 말을 보이지 않고 정답 상자가 초록이며 2.5초 뒤 저절로 넘어가 아무것도 가르치지 않았다.

- **공용 마이크**(`components/speech-mic`): 국면 idle · listening · checking · disabled. 88pt 단추, 음량 막대 7개(실제 음량), 남은 시간 링,
  「Listening…」 · 「Checking…」(멈춤을 누른 뒤 결말이 오기까지) · 「Tap to stop when you're done」. 롤플레이도 쓴다(다음 PR).
  - 음량: 두 호스트 모두 듣는 동안 `getStatus`에 `level`을 이미 싣는다 — 화면이 100 ms마다 읽는다. iOS는 PCM RMS 원값이라 제곱근 × 3으로
    편다. **Android는 `level`이 0 ~ 1로 잘려 말소리에서 늘 1이라 호스트를 작게 고쳤다** — 인식 서비스 dB 원값을 `levelDb`로 함께 싣고
    화면이 -2 ~ 10 dB를 0 ~ 1로 옮긴다(`SpeechRecognitionSession.levelDb`). 진단 값(`level` · `peakLevel` · `averageLevel`)은 그대로다.
  - **최대 8초**(스스로 정한 기본값): 링이 다 줄면 화면이 멈춤을 누른 것과 같이 멈춘다. 전에는 iOS는 누를 때까지 들었다.
  - 움직임 줄이기: 음량을 읽지 않고 막대는 고정 높이, 링은 다 찬 채 — 문구만 바뀐다. 만료 시계는 그대로다.
- **결과 시트**(`SpeakWordResult` · 보기 모형 `speak-word-result.ts`): 셸의 판정 배지 대신 작업 영역에 선다(`LearningShell`에는 `result`만
  넘겨 다시 도전 판은 그대로 선다).
  - perfect: 초록 면 · 「Perfect!」 · 정답 상자.
  - close: 초록 면 · 「Correct」 + 「Almost perfect」 · 「Model answer」 정답 상자 · 들은 말(다른 음절 주황 밑줄).
  - 오답: 흰 면 · 「Not quite」 · 「You said」 들은 말 ↔ 「Answer」 정답, 양쪽 다른 음절 밑줄(색만으로 말하지 않게 밑줄).
  - 정답 상자는 판정과 상관없이 중립(흰 면 · 회색 테), 정답 소리가 있으면 소리 단추(44pt 넘음).
  - 음절 차이는 순수 함수 `lib/syllable-diff.ts`(최장 공통 부분열, 띄어쓰기 · 부호는 비교 밖).
- **넘김**: 저절로 넘어가지 않는다. 맞으면 Continue, 처음 오답이면 Try again(주) + Next(보조) — 다시 말하기 한 번, 두 번째 오답이면
  Continue 하나. 다시 말하면 틀린 말은 문항 기록에서 빠지고 마지막 시도로 채점한다. 다시 도전(ADR-0058) 중에는 다시 말하기를 두지 않는다.
- **알림**: 결과는 서는 순간 한 번 `announce` — perfect 「Result, correct」, close 「…, Model answer: 카드 · kadeu」,
  오답 「…, You said: 카페, Answer: 카드 · kadeu」. 듣는 중에는 알리지 않는다(낭독이 인식기에 들어감).
- **측정**: `episode_item_answered`에 `grade`(perfect · close · incorrect)를 싣는다 — 문항의 처음 판정에서만(다시 말한 뒤는 보고하지 않음).
  들은 글자는 싣지 않는다. 이벤트 수는 그대로(AN1 · AB3 변동 없음).
- **문구**: 새 키 8개 — `speaking.listening` · `checking` · `tapToStop`, `speakWord.result.perfect` · `almostPerfect` · `modelAnswer` ·
  `youSaid` · `hearAnswer`, 여덟 언어 모두. 「Correct」 · 「Not quite」 · 「Answer」 · 「Continue」 · 「Next」 · 「Try again」은 있는 문구를 쓴다.
- 스스로 정한 기본값: 셸 아래 주 버튼(Speak · Stop speaking)은 남겼다(큰 마이크와 같은 동작, 접근성 이름이 있는 큰 단추). 권한 · 실패
  화면은 `feat/mic-permission-flow`의 몫이라 건드리지 않았다. → 아래 「적용 1 개정 ⟨마이크 하나⟩」로 바뀜.

### 적용 1 개정 ⟨마이크 하나⟩(2026-11-27, 브랜치 `fix/speak-word-duplicate-mic-button`)

- **사용자 결정**(2026-11-27, 「줄여줘」): 말하기 퀴즈의 셸 아래 주 버튼 중 큰 마이크와 **같은 동작**인 것(Speak · Stop speaking · 판정 전
  Try again)을 걷는다. 바로 위 「스스로 정한 기본값 — 남겼다」를 바꾼다. 근거: 같은 일을 하는 단추가 둘이고, 듣는 중에는 「Stop」이 마이크와
  버튼 두 곳에 동시에 섰다(롤플레이는 같은 날 ADR-0206 D5 개정으로 먼저 하나로 줄임).
- 이제 동그란 마이크 하나가 그 이름으로 낭독된다 — 대기 「Speak」, 듣는 중 「Stop speaking」, 못 알아들음 · 인식 실패 뒤 「Try again」(아래
  상태 문구도 「Try again」). 같은 문구 키를 쓴다(`speaking.speak` · `stopSpeaking` · `tryAgain`). 인식 실패(`unavailable:failed`)도 마이크가
  눌린다(전에는 꺼지고 셸 버튼만 다시 말하기였다).
- 셸 버튼 행에는 마이크가 하지 않는 일만 선다 — 판정 뒤(Continue · Try again · Next), 불가(Skip), 결과. 버튼 행이 비는 국면에는 보조 Skip이
  작업 영역(마이크 아래)에 선다(그림 로딩 중과 같은 자리).
- 받아쓰기 꺼짐(`dictation-off`)은 그대로 — Skip(주) · Try again(보조)이다(마이크가 아닌 설정 경로 안내라 다른 일).
- 확인: unit `speak-word.retry` SR3 / ui `SpeakWordActivity.*.ui`(마이크로 누름 — `speak-word-controls.test-support`가 같은 이름이 두 곳에
  서지 않는지 매번 봄) · USW-M7 / integration `App.speak-word-missed` ISM1 · `App.episode-format-speaking` · `App.mic-permission`.

## D6 적용 2 ⟨롤플레이 화면⟩(2026-11-27, 브랜치 `feat/roleplay-speak-ui`)

시안 R1 ~ R5(사용자 승인 2026-11-27). 근거: 롤플레이 완료 48%, 마친 판에서도 턴 66% 건너뜀, Hint 사용 약 3%, 밝은 장면에서 흰 글자가
안 읽힘, 오답 때 내 말이 크고 정답이 회색 작은 글자.

- **아래 흰 패널**: 말하기 묶음을 흰 카드 면에 둔다 — 그림 위 흰 글자 없음, 글자는 흰 면 위 4.5:1을 넘는 색만. 맨 위 「Your line」과
  내 문장의 **뜻**(늘 보임) → 공용 마이크(PR `feat/speak-word-ui`의 `SpeechMic`) → 작은 Hint · Can't speak now.
- **Hint 단계**: 뜻은 늘 패널 맨 위(스스로 정한 기본값 — 시안 R1은 한국어까지 늘 보였지만 그러면 R5의 「Show Korean」이 뜻이 없다) →
  Hint를 누르면 「Hear it」(내 문장 소리, 있으면) · 「Show Korean」(한국어 · 로마자). 쓴 힌트는 `hintUsed`(show가 listen보다 앞섬).
  로마자는 콘텐츠에 없어 `romanizeKorean`(ADR-0188)으로 만든다.
- **판정은 결말 콜백에서** `judgeSpokenAnswer`로 재어 상태에 등급 · 모범 문장을 담는다(렌더에서 채점하지 않음).
- **정답**: 내 말풍선(모범 문장) 뒤로 상대가 대본 다음 줄로 곧장 반응하고, 패널은 ✓ Great + Next. **2초 뒤 다음 턴**(누르면 바로). → 아래 「적용 2 개정 ⟨한 번에 한 목소리⟩」: 내 문장 소리가 끝난 뒤(최소 2초).
- **오답**: 정답 문장이 주인공(크게 · 로마자 · 소리 단추 · 다른 낱말 밑줄 `wordDiff`), 「You said」는 작게(다른 낱말 밑줄), Try again(주) ·
  Next(보조, 오답으로 기록). 시안의 「Skip」 대신 Next로 적었다 — 이 단추는 판정을 기록하고 넘기며, 판정 없는 건너뜀은 Can't speak now다.
- **진행**: 「Line 1 / 2」 대신 칸 막대(낭독 이름은 그대로 「Line 1 / 2」). 머리 「Episode N.」의 끝 마침표를 뗀다(`roleplayHeaderLabel`).
- **「Can't speak now」 잘림**: 링크 줄은 줄바꿈을 막지 않는다(기기 캡처로 확인).
- **측정**: 새 이벤트 `roleplay_story_turn_answered` { episodeId · turn · result(correct · incorrect · skipped) · grade? · hintUsed? } —
  턴을 넘기거나 건너뛸 때 한 번. 들은 문장 · 대사는 싣지 않는다. PostHog만(AN1 131 → 132, AB3 101 · 93 → 102 · 94).
- #646(마이크 권한 흐름, ADR-0206) 위에 얹었다 — 권한 시트 · 인식 실패 다시 말하기(`roleplayRetryable`)는 그대로.

### 적용 2 개정 ⟨한 번에 한 목소리⟩(2026-11-27, 브랜치 `fix/roleplay-audio-overlap`)

- 제보(사용자): 「롤플레이에서 정답을 말했을 때 음성이 나오다가 중간에 다른 사람 음성도 나온다」.
- 원인 [코드 · 기기 로그]: 맞히면 내 문장 소리(`replyAudioSource`)를 틀고, **고정 2초** 뒤 다음 턴으로 넘겼다. 다음 턴은 상대의 다음 줄
  소리(`counterpartAudioSource`)를 튼다 — 내 문장이 2초보다 길면 호스트의 「새 재생이 앞 재생을 대체」(ADR-0017 D3)로 중간에 끊기고 상대
  목소리가 들어왔다. 탐침 로그(iOS · Android): `play d-02-r2` → 2초 → `stop` · `play d-03-r2`.
- 결정 — **넘김은 끝 이벤트 기준**: 맞힌 뒤 다음 턴은 「최소 2초」와 「내 문장 소리가 끝남(호스트의 완료 콜백, 실패 포함)」이 둘 다 섰을 때
  (`roleplayAutoAdvanceReady`). 소리가 없거나 재생할 수 없으면 2초만 본다. 끝 신호가 오지 않는 호스트를 위해 상한 10초
  (`ROLEPLAY_REPLY_WAIT_CAP_MS`, 스스로 정한 기본값 — 내장 대사 소리는 길어야 4초대).
- **새 소리를 틀 때는 앞 소리를 멈춘다** — 「끝을 기다림」은 저절로 넘길 때만이다. Next를 누르면 기다리지 않고 바로 넘어가며, 신호 키가 바뀌어
  내 문장 소리가 멈춘 **뒤** 상대 소리를 튼다. 마이크 · 나가기는 신호 소리와 힌트 「Hear it」 소리를 둘 다 멈춘다(전에는 상대 소리가 없는 턴에서
  힌트 소리가 멈추지 않았다).
- **앱이 뒤로 가면**(`appDidEnterBackground`) 소리를 멈추고 그 턴은 저절로 넘기지 않는다 — 돌아와 Next를 누르면 넘어간다. Android 호스트는
  뒤로 갈 때 재생을 끝내며 완료 콜백을 올리므로(`interrupt`), 막지 않으면 배경에서 다음 턴 소리를 틀려 했다.
- Android #662(준비 스레드 비동기): 늦게 준비된 이전 요청은 호스트의 티켓 · 세대가 버리고(`AudioPrepareQueue`), JS의 완료 콜백도 세대로
  거른다(`lib/audio.ts`) — 이전 턴의 늦은 완료가 다음 턴의 넘김을 앞당기지 않게 완료는 그 소리를 낸 턴 번호로만 받는다.
- 확인: unit `roleplay-panel` RP7 / ui `RoleplayTalkScreen.audio.ui` RT-A1 ~ RT-A5 / integration `App.roleplay-audio` IRA1.

### 적용 2 개정 ⟨close — 모범 정답⟩(2026-11-27, 브랜치 `feat/roleplay-close-model-answer`)

- 사용자 말: 「롤플레이에서 완벽한 정답이 아닐 경우 답 보여지게」. 전에는 close(허용 오차 안의 맞음)도 perfect와 똑같이 ✓ Great만 서고 2초 뒤
  넘어갔다 — 이 ADR 머리의 사용자 결정 「통과는 맞았다는 표시와 함께 모범 정답을 보인다」가 롤플레이에는 닿지 않았다.
- **같은 규칙 · 같은 문구 키**(적용 1 말하기 퀴즈 close): ✓ Great 옆에 「Almost perfect」 알약, 「Model answer」 정답 상자(한국어 표시 없음 ·
  로마자 · 뜻 · 소리 단추), 「You said」 들은 말(다른 음절 주황 밑줄, `syllableDiff`). 새 문구 키 없음 — `speakWord.result.almostPerfect` ·
  `modelAnswer` · `youSaid` · `hearAnswer`(여덟 언어 있음). 오답 패널(#649)은 그대로 정답이 주인공이다.
- 정답 로마자는 D1(ADR-0188)의 「정답 공개는 스위치와 상관없이 선다」를 따른다.
- **close는 저절로 넘기지 않는다** — 읽을 것이 생겼으므로 Next를 기다린다(말하기 퀴즈의 Continue와 같은 결). 내 문장 소리는 맞힌 때처럼 한 번
  나고(모범 정답 소리), 대사 자리에는 내 말풍선(모범 문장) · 상대 반응이 그대로 선다. perfect는 바로 위 「한 번에 한 목소리」대로 소리 끝 뒤 넘어간다.
- 알림: 서는 순간 한 번 「Great, Almost perfect. Model answer: 아니요, 괜찮아요.」.
- 측정: `roleplay_story_turn_answered`의 `grade: close`는 이미 실린다 — 이벤트 변화 없음.
- 확인: unit `roleplay-panel` RP8 / ui `RoleplayTalkScreen.close.ui` RT-C1 ~ RT-C5.

## 대가 · 알려진 한계

- **뒤에 덧붙은 낱말은 공짜다**: 정답 뒤로 아무 낱말이나 붙여도 감점이 없다(전 앱 규칙도 뒤 낱말은 무시했다). 앞 낱말은 E2.
- ~~**뜻이 반대인 삽입**~~: 개정 E1 · E3으로 막았다(테스트의 「알려진 한계」를 실패 사례로 옮김).
- **사전 없는 반대말**: `크다`/`작다`, `여기요`/`저기요`처럼 첫 음절이 다르면 E3이, 거리가 크면 D2가 막는다. 첫 음절이 같은 반대말
  (`배고파요`/`배불러요`)은 거리가 커서 오답이다. 첫 음절이 같고 거리가 작은 반대말은 남는다.
- **같은 소리 다른 낱말**: 발음형이 같으면 perfect다(`개`/`게`, `의사`/`이사`). 인식기가 소리로 적는 이상 가를 수 없다.
- 일치도 숫자가 체험판 수집 데이터에서 내려간다(D5).

## 배포

- 서버 · 마이그레이션 · Edge Function: **없음**.
- 앱: 다음 앱 번들(OTA/스토어)에 실린다 — 판정이 바뀌는 것뿐이라 호스트 변경 없음.
- 앱 번들(ADR-0149): 판정 함수(`judgeSpokenAnswer` · `judgeRoleplayReply`)는 말하기 결과가 온 뒤 배경 스레드에서만 부르므로 `"background only"`로
  메인 스레드에서 뺐다. 로컬 실측 6,172,851 → 6,176,477 B(+3.6 kB, 떼기 전 +9.5 kB) — 천장 6,170,000은 그대로(CI 실측이 로컬보다 약 9 kB 작다).
  보고서 `docs/performance/reports/spoken-answer-judge-01.md`. **개정 뒤 다시 잼(2026-11-27)**: origin/main 9c45402d 5,747,436 → 5,753,849 B
  (+6,413, 그중 개정 몫 +2,044) — 천장 6,180,000 안. D6 화면 작업에서 이 함수를 **렌더 중 메인 스레드에서** 부르면 `undefined`가
  돌아온다 — 결과 상태(heard) 뒤에만 부를 것.
- 랜딩 체험판: 랜딩 배포에 실린다. 개정으로 스크립트 46,053 → 48,036 B, 상한(IB5) 48,100(ADR-0083 대가 11의 방식).

## 검증

- `packages/episode-core` 단위 테스트: `spoken-answer.unit.test.ts`(새 — 등급 · 허용 오차 · 낱말 경계 · 와일드카드),
  `spoken-lenient.unit.test.ts`(사례 표 판정 그대로, 일치도 숫자 갱신).
- 앱: `speak-word.unit.test.ts`(SW5 — `비밀 번호` 정답 · `고기`/`거기` 오답), `roleplay-story.unit.test.ts`(RS3 순서 · RS10 발음 기준),
  `episode-core-imports.unit.test.ts`(`judgeSpokenAnswer` 재수출 동일성).
- 랜딩: `trial-machine.unit.test.ts` · `trial-speech-attempt.integration.test.ts`(일치도 숫자) · `trial-build.integration.test.ts`(IB5).
- 개정: `spoken-guard.unit.test.ts`(새 — SG1 부정어 · SG2 앞 낱말 · SG3 첫 음절 · SG4 #628 사례 표 · SG5 체험판), `spoken-lenient.unit.test.ts`
  (「알려진 한계」 → 오답), `speak-word.unit.test.ts`(SW2 · SW6 — 판정을 결말과 함께 담고 렌더는 읽기만).
