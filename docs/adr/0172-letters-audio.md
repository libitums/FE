# ADR-0172: 글자 소리 — 41개 파일 · 자음은 「자음 + ㅏ」 · 합치기 퀴즈는 정답 효과음 뒤 한 번

- 상태: **제안 — 앱 · 도구 구현됨, 소리 파일의 목소리는 사용자 결정 대기**(브랜치 `feat/letters-audio`). (2026-11-20)
- 날짜: 2026-11-20
- **사용자 요청** (2026-11-20): 「정답했을 때 음성 나올 수 있도록」 → 「될 수 있는거 다」 — 자모 칸을 누르면 발음, 합치기 퀴즈에서 맞히면 완성된 음절.
  운영 버킷 업로드는 사용자가 한다.
- 이어받는 결정: [ADR-0169](0169-more-menu-letters-wordbook.md) D2(소리 id · 버킷 경로 · 정보 파일에 있을 때만 소리) · D3(합치기 퀴즈) — **D3의 「두 칸이 차면 결과 글자 + 소리」를 아래 D6으로 좁힌다**.
  [ADR-0060](0060-episode-voice-remote-audio.md) D1 · D2(버킷 `audio/<id>.m4a` · 앱에 싣지 않음), [ADR-0074](0074-voice-synced-typing.md)(음성 정보 파일), [ADR-0087](0087-content-level-manifests.md)(시험 버킷 `content-test`).

## 맥락

- ADR-0169는 Letters 화면과 합치기 퀴즈를 소리 자리까지 만들어 두었다. 소리 id는 `letters/<로마자>`, 파일은 버킷 `content`의 `audio/letters/<로마자>.m4a`이고,
  음성 정보 파일 `audio/manifest.json`에 그 id가 있어야 소리가 있다고 본다. 파일은 하나도 없다.
- 합치기 퀴즈는 두 칸이 차는 순간 합친 음절을 틀었다 — 같은 순간 `LearningShell`의 판정 배지가 정답/오답 효과음(`correct_answer` · `wrong_answer`)을 낸다.
  효과음 파일은 2.04 s이고 들리는 소리는 0.89 s에서 끝난다(−45 dB 무음 검출). 둘이 겹친다.
- 레슨 음성(level-3 · level-5)은 저장소 밖에서 ElevenLabs로 만든 파일을 콘텐츠 담당이 staging에 올린 것이다. 저장소 안의 TTS 스크립트는
  `tooling/audio/generate.sh`(macOS `say` Yuna) 하나뿐이고 스스로 「테스트 자산이지 컨텐츠가 아니다」라고 적는다. 서버의 ElevenLabs 연결
  (`companion-media-voice.ts`)은 컴패니언 음성 메시지용이고 키는 Edge Function 비밀값이다.

## 결정

### D1. 소리 파일은 41개 — 목록은 앱의 한 곳(`LETTER_SOUND_SYLLABLES`)

- `lib/letters/jamo.ts`의 `LETTER_SOUND_SYLLABLES`: 자모표 40자의 소리를 보드 순서로(같은 소리 「아」는 한 번 — ㅇ과 ㅏ) 39개, 그 뒤 퀴즈 음절 너 · 도.
  가는 자모표의 ㄱ 소리와 같은 파일이다. 버킷 경로 · id는 ADR-0169 「소리 파일」 표 그대로다.
- 업로드 도구(`devtools/content/letters-audio-*.mjs`)는 이 목록과 `letterAudioIdOf`를 앱 파일에서 직접 읽는다(Node 22 타입 제거). 목록을 두 벌 두지 않는다.
- 검사: unit JM11 · JM12(41개 · 겹침 없음 · 보드 순서), CQ16(퀴즈 라운드 음절이 목록에 있음), devtools LAU1 · LAU2.

### D2. 자음은 「자음 + ㅏ」로 들려준다 — 이름(기역)도, 자음 단독도 아니다

ADR-0169의 기본값(조정자 결정)을 근거와 함께 확정한다.

- **소리를 가르치는 표다.** 칸의 로마자는 소리(ㄱ = g / k)이고, Practice가 이어지는 합치기 퀴즈의 답이 「ㄱ + ㅏ = 가」다. 칸에서 들은 「가」와 퀴즈의 결과
  「가」가 같은 소리가 된다. 이름(「기역」)은 소리 g를 들려주지 않고, 학습자에게 두 음절짜리 낯선 말을 하나 더 준다.
- **자음은 홀로 소리 나지 않는다.** 한국어 자음의 단독 발음은 사람마다 「그」 · 「으」를 붙이거나 이름을 읽는다. 그래서 TTS가 이상하게 읽는다 —
  macOS `say` Yuna에 「ㄱ」을 주면 「기역」과 **바이트가 같은** 파일이 나왔다(ㄲ = 쌍기역, ㅇ = 이응, ㅎ = 히읗도 같음, 2026-11-20 실측). 단독 자모를 TTS에
  넘기면 이름을 듣게 된다.
- **ㅏ를 붙인다.** 기본 모음 첫 글자이고 보드 그림(ㄱ + ㅏ = 가) · Letters 추천 그림과 같다. 쌍자음도 같은 규칙(까 · 따 · 빠 · 싸 · 짜)이라 평음과 바로 비교된다.
- **ㅇ은 「아」.** 첫소리 ㅇ은 소리가 없다는 것을 「아」(= ㅏ의 소리)로 들려준다. 칸 로마자 「silent / ng」가 받침 소리를 글로 보탠다.
- **모음은 「ㅇ + 모음」**(아 · 야 · 의 …) — 한글 모음은 ㅇ 없이 쓰지 않는다.
- 버린 대안: 이름(기역 · 니은 …) — 소리를 가르치지 않음, 퀴즈와 어긋남. 「자음 + ㅡ」(그 · 느) — ㅡ는 학습자가 가장 헷갈리는 모음이고, 퀴즈 · 보드와 어긋난다.
  자음 단독 녹음 — 사람 녹음으로도 표준이 없고 TTS로는 이름이 된다.
- 대가: 「가」가 ㄱ의 소리이자 ㄱ + ㅏ의 소리다. 칸이 「ㄱ = 가」로 들리는 것을 학습자가 「ㄱ은 가로 읽는다」로 오해할 수 있다 — 칸의 로마자(g / k)와 퀴즈가 보탠다.

### D3. 소리의 목소리 — **사용자 결정 대기**. 저장소에 레슨 음성 파이프라인이 없어 파일 생성을 멈췄다

요청은 「저장소에 레슨 음성을 만든 TTS 파이프라인이 있으면 같은 목소리와 형식, 없으면 방법을 보고하고 멈춤 · 유료 키 · 계정을 새로 만들지 않음」이었다.
레슨 목소리를 만든 파이프라인은 저장소에 없다(맥락 3). 그래서 **올릴 파일은 만들지 않았고**, 어느 목소리로든 같은 명령으로 41개를 만들 도구를 두었다.

| 방법 | 목소리 | 비용 · 조건 | 명령 |
|---|---|---|---|
| A. ElevenLabs API | 레슨과 같은 계정의 목소리(voice id를 사용자가 고름) | 이미 있는 계정 키를 환경 변수로만 — 41회 짧은 요청 | `ELEVENLABS_API_KEY=… ELEVENLABS_VOICE_ID=… node devtools/content/letters-audio-build.mjs --engine elevenlabs --out devtools/content/letters-audio` |
| B. 웹에서 내려받기 · 사람 녹음 | 아무 목소리 | 파일 41개를 `<로마자>.(mp3\|wav\|m4a\|aiff)`로 한 폴더에 | `node devtools/content/letters-audio-build.mjs --engine clips --from <폴더> --out devtools/content/letters-audio` |
| C. macOS `say`(Yuna) | 시스템 음성 | **배포 불가** — Apple 소프트웨어 사용권은 시스템 음성을 개인 · 비상업 용도로만 허락한다 | `--engine say --out <저장소 밖 폴더>` — 기기 확인용. 도구가 저장소 안 출력을 거부하고, 업로드 스크립트가 운영 버킷이면 거부 |

- 낭독 글자는 음절 하나다(「가」). 단독 자모를 넘기지 않는다(D2).
- C로 만든 41개는 이 브랜치의 기기 확인에만 썼고 커밋하지 않았다.
- `tooling/audio/generate.sh`의 「라이선스가 깨끗해 저장소에 커밋할 수 있다」는 위 사용권과 맞지 않는다 — 그 파일은 시험 자산이라 이 ADR에서 고치지 않고 적어만 둔다.

### D4. 파일 형식 — 레슨 음성과 같은 m4a, 짧게 다듬음

`letters-audio-build.mjs`가 입력(엔진 출력 · 녹음)을 같은 길로 다듬는다: 앞뒤 무음(−45 dB) 자름 → 앞뒤 0.12 s 덧댐(계약 부록 C 「앞뒤 무음 0.2 s 이내」) →
모노 44.1 kHz → 최고점 −1.5 dBFS → AAC 80 kbps m4a(레슨 파일과 같은 비트레이트), 메타데이터 없음.
길이 · 말소리 끝(`duration_ms` · `speech_end_ms`)은 같은 무음 기준으로 잰다. 출력 폴더에 `audio/letters/*.m4a` · `letters-audio-timings.json`(정보 파일에 더할 항목) ·
`files.json`(경로 · 바이트 · sha256 · 길이) · `SHA256SUMS` · `SOURCE.txt`(만든 방법).

### D5. 올리기는 사람이 — 정보 파일은 올리는 순간의 버킷 원문에 합친다

- `bash devtools/content/letters-audio-upload.sh <폴더>`: sha256 확인 → 41개 `POST /storage/v1/object/content/audio/letters/<로마자>.m4a`
  (`x-upsert: true` · `cache-control: max-age=31536000` · `audio/mp4`) → 공개 주소의 sha256 대조 → 지금의 `audio/manifest.json`을 받아 letters 항목만 더함
  (`letters-audio-merge.mjs`, 다른 항목 · 순서 그대로, `generated_at`만 새 시각, 2칸 들여쓰기 + 끝 줄바꿈) → 정보 파일 `POST`(`max-age=60`) → 공개 주소 대조.
  **파일 먼저, 정보 파일 마지막**(계약 13절) — 정보 파일이 먼저 서면 앱이 없는 파일을 틀려 한다.
- 운영 버킷에는 `SOURCE.txt`가 있고 say 엔진이 아닌 폴더만 올린다. 받은 원문 · 합친 판(`manifest.live.json` · `manifest.merged.json`)은 gitignore.
- service_role 키는 `supabase projects api-keys`에서 셸 변수로만 받고, curl에는 명령줄 인자가 아니라 stdin 설정으로 넘긴다(`ps`에 보이지 않음). `DRY_RUN=1`은 키 없이 검사 · 합친 파일만 만든다. `BUCKET=content-test`로 시험 버킷.
- 정보 파일을 저장소에 미리 만들어 두지 않는 이유: 버킷의 정보 파일은 콘텐츠를 올릴 때마다 바뀐다(2026-11-20 현재 1,879항목). 미리 만든 파일로 덮으면 그 사이 올라온 항목이 사라진다.
- 올린 뒤에는 앱 업데이트 없이 다음 정보 파일 갱신 때 소리가 난다(ADR-0169 D2).

### D6. 합치기 퀴즈 — 맞힌 때만, 정답 효과음 뒤 0.9 s에 그 음절을 한 번

- `composeEchoOf(state)`: 맞힌 판정이면 그 라운드 음절(가 · 너 · 도), 판정 전 · 틀림 · 완료는 null. `COMPOSE_ECHO_DELAY_MS` = 900(효과음의 들리는 길이 0.89 s 뒤).
- 화면은 그 값이 서면 틈 뒤에 한 번 튼다. Next · Try again · 나가기로 라운드 · 화면이 바뀌면 틈을 걷는다(앞 라운드 소리가 다음 라운드에 나지 않음).
- **틀리면 음절 소리를 내지 않는다** — 오답 효과음만. 틀린 조합(거 · 나 …)을 들려주면 정답 소리와 섞인다.
- **설정 Auto-play(`auto-play-audio`)를 따른다** — 레슨 정답 음성(`answerEchoCueOf`)과 같은 값. `off`면 정답 뒤 소리만 쉬고 ▶(만들 글자 듣기)는 그대로 난다.
  지금 설정 화면에는 이 항목이 없어 늘 `on`이다 — 다시 생기면 같이 따른다.
- 레슨의 정답 음성 패턴(`lib/question-audio.ts` · `useAudioCue`)은 판정 즉시 틀고 지연이 없다. 그 파일은 다른 작업이 바꾸는 중이라 건드리지 않고 값(`AutoPlayAudio`)만 가져왔다.
- 자모표 칸은 그대로 — 누르는 순간 튼다(효과음이 없다).

### D7. 파일이 없을 때는 지금처럼 조용히

정보 파일에 letters 항목이 없거나(업로드 전) 정보 파일 자체가 없으면(첫 실행 · 오프라인) 주소가 null이다 — 칸은 「sound not available yet」 · 이벤트 `audio: unavailable`,
퀴즈는 소리 없이 판정 · Next. 재생 모듈을 부르지 않는다. 바뀐 것이 없다.

## 대가

- 소리 파일이 아직 없다 — 목소리를 고르고(D3) 만들고 올리기 전까지 사용자에게 바뀐 것이 없다.
- VoiceOver · TalkBack이 판정(「Correct」)을 낭독하는 동안 0.9 s 뒤 음절이 겹칠 수 있다. 정보 손실은 없다(결과 칸에 글자가 선다).
- 틀린 조합의 소리가 없어져, 스크린리더 사용자는 무엇을 만들었는지를 결과 칸에서 읽는다 — 그래서 결과 칸 이름에 합친 글자와 로마자를 붙였다(「Syllable, 거, geo」, ui CS17).
  판정 낭독 자체에 「You made 거」를 붙이는 것은 새 문구(7개 언어)가 필요해 후속으로 남긴다(접근성 감사 Minor).
- 0.9 s는 효과음 파일에 묶인 값이다. 효과음을 바꾸면 CQ17과 함께 다시 잰다.
- 오프라인에서는 소리가 나지 않는다(ADR-0060 D1 — 받아 두지 않음). 받아 둔 레슨 파일과 같은 `content-files/audio/letters/` 경로에 파일이 있으면 그것을 먼저 쓴다.

## 확인

- unit: `jamo.unit.test.ts` JM11 · JM12, `compose-quiz.unit.test.ts` CQ14 ~ CQ17, `devtools/content/letters-audio.unit.test.mjs` LAU1 ~ LAU7.
- ui: `LettersComposeScreen.ui.test.tsx` CS3(개정) · CS11 ~ CS18(CS17 결과 칸 이름 · CS18 틈 동안 포트가 바뀌어도 틈 유지).
- integration: `App.letters-audio.integration.test.tsx` LAI1 ~ LAI4(받아 둔 정보 파일 → 로더 → 결선 → 화면 → 재생 모듈, 주소는 실제 해석기).
- e2e: [수동 절차](../e2e/letters-audio.md) — iOS 시뮬레이터 · Android `assembleBundled` 에뮬레이터, 검증용 say 파일을 기기의 받아 둔 파일 자리에 두고.
- 업로드 도구: `DRY_RUN=1`으로 운영 정보 파일(1,879항목)을 받아 합쳐 1,920항목 · 바뀐 줄은 `generated_at`과 letters 41항목뿐임을 확인.
