# ADR-0201 — 말하기 채점을 발음 기준으로: 띄어쓰기 · 받침 표기 · 작은 오차를 받고, 「통과」는 모범 정답과 함께

- 상태: **채택 — 채점 규칙(`@libitums/episode-core/judge`) · 앱의 순수 판정 함수만 바꿈. 화면은 「앱 인계」(D6)로 남김.**
  서버 · 마이그레이션 · Edge Function 변경 없음.
- 날짜: 2026-11-26. 브랜치 `hyesungKomet/stt-refinement`.
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
- 전 규칙으로 맞던 답은 그대로 맞는다(perfect). **새 규칙은 전보다 엄격해지는 곳이 없다.**
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

- 앞뒤에 덧붙은 낱말(`카드 주세요`, `그러니까 지금부터요`)은 여전히 공짜다.
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

## 대가 · 알려진 한계

- **덧붙은 낱말은 공짜다**: 정답 앞뒤로 아무 낱말이나 길게 붙여도 감점이 없다(전 앱 규칙도 뒤 낱말은 무시했다).
- **뜻이 반대인 삽입**: `처음이에요` ← `처음이 아니에요`는 자모 셋 차이라 긴 문장에서는 close가 될 수 있다(체험판 r3부터의 한계 —
  테스트에 「알려진 한계」로 둔다).
- **같은 소리 다른 낱말**: 발음형이 같으면 perfect다(`개`/`게`, `의사`/`이사`). 인식기가 소리로 적는 이상 가를 수 없다.
- 일치도 숫자가 체험판 수집 데이터에서 내려간다(D5).

## 배포

- 서버 · 마이그레이션 · Edge Function: **없음**.
- 앱: 다음 앱 번들(OTA/스토어)에 실린다 — 판정이 바뀌는 것뿐이라 호스트 변경 없음.
- 랜딩 체험판: 랜딩 배포에 실린다.

## 검증

- `packages/episode-core` 단위 테스트: `spoken-answer.unit.test.ts`(새 — 등급 · 허용 오차 · 낱말 경계 · 와일드카드),
  `spoken-lenient.unit.test.ts`(사례 표 판정 그대로, 일치도 숫자 갱신).
- 앱: `speak-word.unit.test.ts`(SW5 — `비밀 번호` 정답 · `고기`/`거기` 오답), `roleplay-story.unit.test.ts`(RS3 순서 · RS10 발음 기준),
  `episode-core-imports.unit.test.ts`(`judgeSpokenAnswer` 재수출 동일성).
- 랜딩: `trial-machine.unit.test.ts` · `trial-speech-attempt.integration.test.ts`(일치도 숫자) · `trial-build.integration.test.ts`(IB5).
