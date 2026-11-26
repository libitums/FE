# ADR-0189: 지나간 한국어 문장 다시 듣기 · 소리 없는 문장은 회색 · 단어 칩 소리

- 상태: **제안 — 구현됨**(브랜치 `feat/replay-audio`, 머지 전). (2026-11-24)
- 날짜: 2026-11-24
- **사용자 요청**(2026-11-24, 「123 진행」 — 운영 `public.feedback` 튜토리얼 별점 의견): 소리를 다시 듣고 싶다(여러 건) · 소리가 안 나는 문장이 있다 ·
  단어 고르기 칩을 누르면 소리가 났으면(한글을 모르는 사용자). 이 ADR의 기본값은 조정자 지시 범위 안에서 스스로 정했다 — 아래 「스스로 정한 기본값」.
- 번호: 처음에는 0188로 적었으나 같은 날 병렬 작업 `feat/dialogue-romanization`(#580)이 0188(대화문 로마자)을 써서 0189로 옮겼다. `fix/slow-playback`은 새 ADR 번호를 쓰지 않는다.
- 이어받는 결정: [ADR-0060](0060-episode-voice-remote-audio.md)(컷 음성 · 받은 파일만), [ADR-0172](0172-answer-echo-all-items.md)(정답 뒤 음성 · 녹음 색인 D2),
  [ADR-0173](0173-letters-audio.md)(소리 파일이 없으면 회색 — Letters #573), [ADR-0029](0029-product-analytics-posthog.md)(이벤트 이름 규칙), [ADR-0016](0016-assistive-technology-semantics.md) D5 · D10.
- 시안: [docs/design/replay-audio.md](../design/replay-audio.md)

## 맥락

- 이야기 컷(표지 · 통과 뒤 · 막간 이야기)은 컷이 설 때 그 대사 음성을 **한 번** 낸다(ADR-0060). 다시 들을 방법이 없었다.
- 레슨의 정답 뒤 음성(ADR-0172)도 판정 뒤 **한 번**뿐이다. 듣기 문항만 다시 듣기 조작이 있다.
- 「소리가 안 나는 문장」 — 수준 5판 18편 · 음성 정보 파일(`generated_at` 2026-11-13, 1,879항목, 이미 받아 둔 사본)을 대조했다
  ([보고](../content/silent-sentences-2026-11-24.md), 도구 `devtools/content/silent-sentences-report.mjs`):
  - 소리 없는 문장 179개 중 **178개가 콘텐츠에 음성 id가 없는 것**(`no-audio-id`)이다. id가 있는데 파일이 없는 것(`not-in-manifest`)은 **0**.
  - 컷: 혼잣말(monologue) 48/50 · 지문(narration) 55/67이 녹음이 없다. 대사(speech) 95 · 전화(call) 14는 모두 있다. 막간 문자(message 55 · reply 13)는 메신저 화면이라 다시 듣기 자리가 아니다.
  - 대화 줄 4개(u02 D2 · u03 D2 · D7 · D8)는 `{이름}` · `{나라}` 자리표시자가 든 줄이라 녹음이 없다. 레슨 정답 1개(u03 S8-01)는 녹음이 있어도 자리표시자라 **앱이 일부러** 끈다(ADR-0060 D2).
  - 결론: **코드 문제가 아니라 콘텐츠 범위다** — 혼잣말 · 지문을 녹음하지 않았다. 녹음을 만들면 앱 변경 없이 소리가 나고 회색이 풀린다.
- 칩: 단어 고르기 보기 · 조립 조각이 녹음 색인(ADR-0172 D2)에서 소리를 찾을 수 있는 비율 — 대화 조립 72/72 · 대사 고르기 237/290 · 대답 고르기 120/163 ·
  그림 고르기 204/330 · 빈칸 고르기 188/410 · 빈칸 215/679 · 문장 순서 32/168 · 영어 뜻 고르기 0/280(영어 보기) [실측 — 보고서 표].

## 결정

### D1. 이야기 컷 — 대사 상자 위 오른쪽 스피커

- `CatalogCoverScreen`(표지 · 통과 뒤 · 막간 이야기 · 롤플레이 미리보기 컷이 같은 화면) 대사 상자 **위 오른쪽 끝** 한 줄에 스피커(`SentenceReplayButton`, RoundButton L, 아이콘 `volume`, 이름 「Play again」).
  누르면 그 컷의 소리를 **처음부터** 다시 낸다(재생 모듈은 하나라 앞 소리는 끊긴다). 컷 진행 · 영어/로마자 토글과 무관하다.
- 대사 상자는 그 자체가 토글 단추라 스피커는 상자 **밖 형제**다(단추 안 단추 금지, ADR-0016 D5). Next 옆을 버린 근거는 시안 §2(320 폭에서 Next 글이 잘림 · 잘못 눌러 컷을 넘김).
- 소리가 없는 컷은 같은 자리에 **회색 꺼진 단추**(`AudioUnavailableControl` — Letters와 같은 원칙, 이름 「Audio not available yet」, 눌리지 않음).
- ⟨2026-11-24 개정 — [ADR-0188](0188-dialogue-romanization.md) D7⟩ 컷 스피커의 면은 흰 원이 아니라 **대사 상자와 같은 면(gray-950) + 흰 아이콘**이다
  (`SentenceReplayButton tone="dialog"` — RoundButton `overlay`를 짙은 원 위에). 회색 꺼진 단추도 같은 면에 **흐린 아이콘(gray-800)**이고 비활성
  불투명도를 걷었다(면이 그림에 비치지 않게) — 켜진 단추와는 아이콘 밝기(흰 ↔ 회색)로 갈린다. 레슨 판정 줄 스피커(`tone` 기본 `light`)는 그대로다.

### D2. 레슨 — 판정 배지 옆 스피커, 판정 뒤 기다리는 화면만

- 셸 `verdictReplay`: 판정 배지 옆 [배지][8][스피커 M]. 정답 뒤 음성(ADR-0172)이 있으면 그 소리, 없으면 회색. **판정 전에는 없다**(정답을 미리 들려주지 않음).
- 서는 곳: **문장 조립(WORD_ORDER) · 음절 조립** — Check 뒤 Next를 기다리는 화면.
- 서지 않는 곳:
  - **저절로 넘어가는 화면(단어 고르기 · 낱말 말하기)** — 넘어가는 동안 화면 전체가 「Continue」 단추다(WCAG 2.2.1 층). 그 위에 스피커를 두면 누름이 넘김과 겹친다.
    셸은 `advance`가 있으면 `verdictReplay`를 그리지 않는다. 넘김을 멈추는 길(스피커를 누르면 Continue로 바뀜)은 흐름이 바뀌는 일이라 **후속 · 사용자 결정**으로 남긴다.
  - **듣기 문항 · 듣고 조립** — 위 줄 듣기 조작에 이미 다시 듣기가 있다(`answerReplayOf`가 `null`).
  - **대화 조립** — 정답이 여러 줄이라 한 문장이 없다. 대신 줄마다 칩 소리(D3)가 난다.
  - 자판 입력(타자) · 짝 맞추기 · 카드 — 셸 배지를 쓰지 않는 화면이라 이번 범위 밖(후속).

### D3. 칩 소리 — 누른 낱말의 소리, 판정 · 점수 · 이벤트와 무관

- 단어 고르기 보기(`choiceAudio`) · 문장 순서 · 대화 조립 조각(`chipAudio`)에 **그 글과 글자 그대로 같은 이 에피소드 녹음**의 주소를 싣는다(`catalogChipAudioOf`, 받은 파일 · 자리표시자 규칙은 ADR-0060 D2 그대로).
- 단어 고르기: 보기를 누르는 순간(= 판정 순간) 그 낱말 소리. 정답 뒤 음성은 0.8초 틈 뒤에 이 소리를 이어받는다(재생 모듈 하나). 판정 뒤 다시 누른 보기는 소리가 없다(잠김).
  누른 보기의 소리가 **정답 뒤 음성과 같은 파일**이면(대사 고르기에서 정답 대사를 누름) 칩 소리를 건너뛴다 — 같은 문장이 0.8초 사이로 두 번 나지 않게(ui WC5,
  integration AE2 · AE3이 기존 기대를 지킨다). 틀린 보기는 그 낱말 → 정답 음성 순으로 들린다.
- 조립: 조각을 **놓을 때만** 소리. 되돌릴 때는 조용하다.
- **설정 Auto-play(`auto-play-audio`)를 끄면 칩 소리도 나지 않는다**(단어 고르기 · 조립 모두, ui WC6 · SC6) — 접근성 감사 Major: 단어 고르기는 누르는 순간 칩 소리 ·
  판정 효과음 · 화면낭독의 판정 낭독 · 0.8초 뒤 정답 음성이 겹치는데, 이를 끌 길이 이 설정뿐이다. 스피커(D1 · D2)는 사람이 누르는 소리라 설정과 무관하다.
- 소리가 없는 칩은 지금처럼 조용 — 칩 모양은 바뀌지 않는다(꺼짐 표시 없음, 시안 §6).
- **듣고 조립 · 음절 조립은 싣지 않는다** — 듣고 조립은 듣기 문제라 낱말 소리가 답을 들려준다. 음절 조각은 음절 하나라 같은 글자의 다른 소리가 섞인다(받침 · 연음).
- 판정 · `episode_item_answered` · 점수는 칩 소리와 무관하다(ui SC3 · WC3, integration IR3이 지킨다).

### D4. 낱말 하나짜리도 찾는다 — 정답 뒤 음성의 낱말 제외와 다르다

ADR-0172 D2는 정답 뒤 음성에서 낱말 하나짜리(「배」 · 「눈」)를 색인에서 찾지 않는다 — 다른 뜻의 녹음을 정답으로 들려줄 수 있어서다.
칩 소리는 **그 글자의 발음**을 들려주는 자리라 같은 글자의 다른 뜻 녹음도 같은 소리다. 그래서 칩은 낱말도 찾는다. 대가: 동음이의 낱말의 억양 · 문맥 차이는 남는다.

### D5. 측정 — 이벤트 둘(PostHog만, Airbridge 매핑 없음)

- `sentence_audio_replayed { episodeId, surface: story_cut | lesson_answer, stage? (prologue | epilogue | interlude), unitKey? }` — 켜진 스피커를 누를 때마다.
- `choice_chip_sound_played { episodeId, unitKey, surface: word_choice | sentence_order }` — 소리가 **난** 칩 누름마다(소리 없는 칩은 나지 않음).
- sink는 기존 `episodeIntroEventSink`, 결선은 `catalog-listen-wiring.ts`(레슨은 `LessonAudio.onSoundUsed`, 컷은 `onStorySentenceReplayed`). 이름 105 → 107.
- 롤플레이 미리보기 컷(`RoleplayStoryFlow`)은 스피커는 서지만 이벤트를 잇지 않았다(롤플레이 결선에 에피소드 sink가 없음 — 후속).
- 읽는 법: 다시 듣기 사용률 = `sentence_audio_replayed` 낸 사람 ÷ 컷 · 레슨을 본 사람(`episode_intro_viewed` · `episode_lesson_started`). 칩 소리는 단어 고르기에서는 판정과 같은 순간이라 「노출」이고, 조립에서만 「쓰려고 누른 것」이다.

### D6. 「소리 없는 문장」 점검 도구

- `devtools/content/silent-sentences.mjs`(순수) · `silent-sentences-report.mjs`(CLI): 배달 JSON 폴더 + 음성 정보 파일 → 까닭별(`no-audio-id` · `not-in-manifest` · `no-recording` · `placeholder`) 목록 · 칩 소리 범위 표.
  **네트워크를 쓰지 않는다** — 이미 받아 둔 파일만 읽는다. 규칙은 앱 TS를 옮겨 적었다(확장자 없는 import라 Node가 앱 파일을 바로 읽지 못함) — 앱 규칙을 바꾸면 같이 고친다(unit SS1 ~ SS6).

## 스스로 정한 기본값

- 컷 스피커 자리(대사 위 오른쪽) · 레슨 스피커 자리(배지 옆) · 레슨에서 저절로 넘어가는 화면은 제외 · 칩 소리를 듣고 조립 · 음절 조립에서 뺌 · 낱말 칩도 찾음 · 이벤트를 누를 때마다 · 아이콘 `volume`.
- 문구 「Play again」 8개 언어: es Reproducir de nuevo · id Putar lagi · ja もう一度再生 · my ပြန်ဖွင့်ရန် · th เล่นอีกครั้ง · vi Phát lại · zh-TW 再播一次.

## 대가

- 컷 화면의 그림 영역이 60(48 + 간격 12) 줄었다. 큰 글자에서 대사 상자 상한(40vh)은 그대로다.
- 단어 고르기에서 칩 소리 · 판정 효과음 · 0.8초 뒤 정답 음성이 이어서 난다. 칩 소리가 0.8초보다 길면 정답 음성이 끊고 들어간다.
- 레슨 스피커의 48 누르는 자리가 36 줄 위아래로 6씩 넘친다(`overflow: visible`) — 넘친 띠의 탭이 기기에서 단추로 가는지는 e2e RA6에서 본다(시안 §3 미해결 1).
- 회색 스피커가 이야기 컷의 60 %(혼잣말 · 지문)에 선다 — 녹음이 생기기 전까지 「소리가 없다」는 사실이 더 잘 보인다. 녹음 여부는 콘텐츠 결정이다.
- 도구가 앱 규칙을 두 벌로 갖는다(D6).
- 접근성 감사(2026-11-24, 코드 근거)의 Minor 셋은 고치지 않고 남긴다: 이름 「Play again」이 대상(문장)을 말하지 않음(8개 언어 문구 재번역 필요) ·
  혼잣말 · 지문 컷마다 회색 단추에서 낭독이 한 번 더 멈춤(대사 상자 이름에 「소리 없음」을 붙일지 디자인 결정) · 넘친 누르는 자리(e2e RA6).

## 확인

- unit: `lib/sentence-replay.unit.test.ts` SR1 ~ SR9, `app/catalog-chip-audio.unit.test.ts` CA1 ~ CA5, `app/catalog-chip-audio.map.unit.test.ts` CM1 ~ CM5,
  `app/catalog-events.replay.unit.test.ts` RE1 ~ RE3, `lib/analytics-events.unit.test.ts` AN1(107), `devtools/content/silent-sentences.unit.test.mjs` SS1 ~ SS6.
- ui: `SentenceReplayButton.ui.test.tsx` RB1 ~ RB3, `CatalogCoverScreen.replay.ui.test.tsx` CR1 ~ CR4, `LearningShell.replay.ui.test.tsx` LR1 ~ LR4,
  `SentenceOrderScreen.sound.ui.test.tsx` SC1 ~ SC6, `WordChoiceScreen.chip-sound.ui.test.tsx` WC1 ~ WC6, `SyllableBuildActivity.replay.ui.test.tsx` SB1 · SB2.
- integration: `App.replay-audio.integration.test.tsx` IR1 ~ IR3(계획 → 화면 → 재생 모듈 · sink).
- e2e: [수동 절차](../e2e/replay-audio.md).

## 재검토 조건

1. 혼잣말 · 지문 녹음이 생기면 — 보고를 다시 돌려 회색이 줄었는지 본다(앱 변경 없음).
2. 저절로 넘어가는 화면에서도 다시 듣기 요청이 나오면 — 스피커가 넘김을 멈추는 흐름(D2)을 사용자와 정한다.
3. `choice_chip_sound_played`가 이벤트 양을 크게 늘리면 — 문항당 한 번으로 묶는다.
