# ADR-0082 — 학습 문항의 음성을 잇고, 듣기 문항에 「천천히」(0.85배 · 음높이 유지)를 둔다: 재생 모듈의 다섯째 메서드 `playAtRate`

- 상태: **채택 — 클라이언트 · 두 호스트.** 서버 · 버킷 형식 · 에피소드 스키마 · 음성 id 변경 0. `-slow` 음성 파일을 요청하지도 기다리지도 않는다.
  ⚠ **기기 확인은 부분 회차로 수용했다**(사용자 결정 2026-10-22) — unit · ui · integration · 호스트 테스트(iOS HostTests `AudioPlaybackModuleTests` 11/11 · Android JVM 통과 · 계측 `AudioPlaybackModuleTest` 22/22, 2026-10-21)와 번들 크기에 더해,
  iPhone 13 mini 시뮬레이터 회차(2026-10-22, [학습 문항 음성 e2e](../e2e/item-audio.md) 「결과」)에서 0.85 길이 비(음성 몫 1.173 ~ 1.176배) · 나가면 `Slow, off` · u00 `S2` · `S7`(받은 파일 있음 · 없음) · 간이 줄 `Stop`과 BA7(큰 글자 한 줄 — 고친 회차)을 확인했다.
  **하지 않은 것** — 음높이 청음 · Android 기기 회차(EU2) · 덕킹 · 효과음 겹침(EU4 · EU5 일부) · VoiceOver · TalkBack 낭독(BA1 · BA2 · BA4 ~ BA6) · 지연(EU6) · 옛 호스트(EU7) — 은 **후속**이다(아래 「미확인 · 후속」 1).
  사용자 폰(iPhone 13 mini)에서 「`Slow` 글자가 보이지 않는다」던 보고(2026-10-21)는 `49dc553e`가 고쳐 시뮬레이터 13 mini 기본 글자 크기에서 보였다(사용자 폰에서 다시 보지는 않았다).
- 날짜: 2026-10-22.
- **사용자 결정**(2026-10-21): 소리가 있는 **모든 유형**에 문항 음성을 잇는다 · 듣기 문항은 **서면 한 번 자동 + 다시 듣기** · 「천천히」는 **그 레슨이 끝날 때까지** 유지하고 나가면 1.0, **저장하지 않는다** ·
  `LISTEN_BUILD`는 **기존 조립 화면을 다시 쓴다**(새 화면 없음) · 카탈로그 컷 · 대화 · 최종 테스트는 **원래 하던 대로**(1.0 · 자동 재생 규칙 그대로 — 플레이어 줄 「듣기 버튼으로만」 예외는 하지 않는다) ·
  받아쓰기는 소리가 붙어도 **로마자 · 뜻 단서를 지금처럼 보인다** · 동작 줄이기에서 켜진 `Slow`를 누르는 동안의 글자 대비 4.21을 **받아들인다** ·
  듣기 대본은 **답한 뒤에만 보인다**(v2) · 간이 줄의 다시 듣기는 **재생 중에 멈춤이 된다**(v3).
  **사용자 결정**(2026-10-22): 받아 둔 음성 파일만 소리 문항으로 친다(v4) · 소리 없는 `LISTEN_SELECT` · `MIN_PAIR_AB`는 **건너뛰지 않고 대본이 보이는 모양으로 세운다**(v4 정정) ·
  기기 확인의 미실행 항목은 **부분 회차로 수용하고 후속**으로 둔다 · 접근성 큰 글자에서 켜진 `Slow`가 재생 원을 가운데에서 미는 것을 **받아들인다**(「대가」 9) ·
  `S9` 질문 카드 한국어 · 로마자 줄의 빈 접근성 이름(이 PR 전부터 있던 결함)은 **이 PR 밖** — 다음 리디자인 PR에서 확인하고 고친다.
- 다루는 축: 재생 모듈의 속도 표면과 옛 호스트 호환 · 음높이 · 0.85의 자리 · 문항 유형별 재생 시점 · 「천천히」 상태의 주인과 수명 · 소리 없는 문항 · 재생 모듈 없는 환경 · `LISTEN_BUILD` 화면 ·
  듣기 대본의 기본값과 공개 · 문항 음성의 접근성(1.4.2 · 상태 낭독) · 측정.
  **다루지 않는 것**: 카탈로그 컷 · 대화 · 최종 테스트의 재생(1.0 · [ADR-0060](0060-episode-voice-remote-audio.md) D5 그대로), 시크 · 볼륨 · 0.85 밖의 배속 선택, 「천천히」 저장, 문항 쪽 길이 동기화(없다 — D11), 음성 id · `audio/manifest.json` 형식.
- 부분 대체:
  - [ADR-0017](0017-host-native-capabilities-and-audio.md) D3의 **「시크 · 배속 · 볼륨 · 페이드」 가운데 「배속」 한 낱말** — 아래 D1 · D2. 메서드 표면은 넷 → **다섯**(`play` · `playAtRate` · `stop` · `pause` · `resume`). 나머지 제외 목록은 그대로 산다.
  - [ADR-0058](0058-catalog-learning-session.md) D3의 **「학습 문항의 매핑은 여전히 늘 `audioSource: null`」** — 소리 있는 문항은 이제 소리를 낸다. 소리 없는 듣기(`LISTEN_SELECT` · `MIN_PAIR_AB`)는 **더는 건너뛰지 않고** 대본이 보이는 `ListeningSilentPrompt`로 선다(v4 정정 — D10). 받아쓰기의 꺼진 재생 조작은 소리 없는 받아쓰기에 그대로다.
  - [ADR-0066](0066-episode-format-screens.md) D8의 **`LISTEN_BUILD` = 화면 없이 `audio-missing`** — 소리가 있으면 문장 순서 화면으로 선다(D9). 소리 없으면 지금처럼 건너뛴다.
- 이어받는 결정: [ADR-0060](0060-episode-voice-remote-audio.md) D2 · D3 · D7(주소 규약 · 네이티브는 스킴만 · 실패는 무음) — 재검토 조건 1 발동, [ADR-0067](0067-episode-format-speaking.md)(`SHADOW` = `read-aloud`) — 재검토 조건 1 발동,
  [ADR-0065](0065-episode-format-additions.md) D8 · 재검토 조건 1, [ADR-0074](0074-voice-synced-typing.md)(컷 타자기 — 1.0 고정이라 그대로), [ADR-0016](0016-assistive-technology-semantics.md) D5 · D10 · D11 · D13, [ADR-0029](0029-product-analytics-posthog.md) D14,
  [ADR-0081](0081-tutorial-as-catalog-episode.md) D12(u00 `S2` · `S7` 빈 레슨 — 해소). 각 ADR에 적용 기록을 달았다.

근거 표시: **[코드]** 저장소 코드(`apps/mobile/src/` 기준) · **[데이터]** 버킷 에피소드 7개 실측 · **[Pod]** Lynx iOS Pod 소스 · **[실측]** 테스트 · 빌드 · **[사용자]** · **[추론]** 관찰 없이 이어 붙인 것.
계약의 정본은 저장소 밖 작업 폴더의 spec(v1 · 사용자 확인 결과 · v2 · D10 보정 · v3)이고 이 문서는 그중 **결정**만 옮긴다. 시그니처는 코드가 진다.

**왜 새 번호인가** — 재생 모듈의 표면(ADR-0017 D3)이 바뀌고, 그 위에 학습 문항 매핑(ADR-0058 · 0065 · 0066) · 말하기 학습형(ADR-0067) · 듣기 설정의 기본값이 한꺼번에 바뀐다. 모두 실체화된 결정이다(ADR-0010 D10 첫째 · 둘째 줄).

## 맥락

1. **학습 문항의 소리가 없었다** [코드]. 문항 `stimulus.audio_url` 소비처가 0이었다 — `LISTEN_SELECT` · `MIN_PAIR_AB`는 매핑의 소리 자리가 늘 `null`이라 `audio-missing`으로 건너뛰고, `LISTEN_BUILD`는 무조건 `audio-missing`,
   `REPLY_SELECT`는 상대 말을 글로 보이는 단어 선택, `DICTATION`은 꺼진 재생 조작(`AudioUnavailableControl`), `SHADOW`는 글 보고 읽기였다. 문항 음성 파일은 이미 받기 대상이었다(`lib/episode-assets.ts`).
2. **데이터에는 소리가 있다** [데이터]. 소리 있음/전체: `LISTEN_SELECT` 128/128 · `SHADOW` 51/51 · `REPLY_SELECT` 35/35 · `LISTEN_BUILD` 35/35 · `DICTATION` 29/29 · `MIN_PAIR_AB` 12/12 · `TRANSLATE_TO_KO` 52/52 · `TRANSLATE_TO_EN` 23/24 ·
   `WORD_ORDER` 21/21 · `SYLLABLE_BUILD` 18/18 · `SPEAK_WORD` 13/13 · `IMG_MATCH` 8/8. 모든 `audio_url`이 음성 정보 파일에 있다. `LISTEN_BUILD` 35개는 모두 정답을 공백으로 나눈 조각이 타일과 1:1로 맞는다.
3. **옛 호스트에 인자를 하나 더 보내면 소리가 나지 않는다** [Pod]. `Pods/Lynx/core/runtime/js/bindings/modules/ios/lynx_module_darwin.mm:441-462` — 인자 수가 셀렉터보다 **많으면** `E_NATIVE_MODULES_COMMON_WRONG_PARAM_NUM`을 올리고 **메서드를 부르지 않는다**.
   `play(source, done, rate)`를 옛 iOS 호스트에 보내면 무음 + Lynx 오류다. Android Lynx 소스는 확인하지 못했다[추론: 같은 인자 수 검사]. 릴리스는 JS 번들과 호스트가 함께 나가지만, 「옛 호스트 + 새 JS」는 Explorer · 개발 빌드에서 생긴다.
4. **u00 `S2`(`LISTEN_SELECT`) · `S7`(`LISTEN_BUILD`)이 빈 레슨이었다** [코드 — ADR-0081 D12]. 문항이 하나뿐인 단계라 건너뛰면 아무것도 남지 않았다.
5. **듣기 대본이 처음부터 보였다** [코드 · 사용자]. 설정 `show-transcript`의 초기값이 켜짐이었다 — 문항 음성이 판정용 기계 음성뿐이던 때의 값이다. 기기 확인에서 u00 `S2` 카드에 대본이 정답째 보였다(2026-10-21).
6. **같은 음성이 두 문항 연속이면 둘째가 자동 재생되지 않았다** [코드]. 옛 듣기 훅(`screens/listening/use-listening-playback.ts`)의 자동 재생 키가 음성 주소였다. 데이터에 실재한다(u00 `S2-01` · `S8-01`이 같은 `d-04`).

## 결정

### D1. 호스트 속도는 새 메서드 `playAtRate(source, rate, done)` — `play`는 바이트 하나 안 바뀐다

- `play(source, done)`의 모양 · 동작은 그대로다. 컷 · 대화 · 최종 테스트와 1.0 문항은 늘 `play`(인자 **둘**)로 간다.
- `playAtRate`는 `play`와 **한 몸**이다(공유 private 함수) — 해석 세 갈래(https · 받아 둔 `file://` · 번들 id) · 대체 · `done` 한 번 · 세션 · 포커스 규칙이 같고 속도만 더한다. 그래서 오프라인 · 404 · 해석 실패 처리가 1.0과 같다.
- JS 접점 `lib/audio.ts` `playAudio(source, onFinished, rate?)`: `rate`가 없거나 1이면 `host.play`, 1이 아니고 `typeof host.playAtRate === "function"`이면 `host.playAtRate`, 없으면(옛 호스트) `host.play`로 1.0. 세대 가드 · `"unavailable"` · 한 번 규칙은 갈래와 무관하게 같은 코드다.
- **옛 호스트 감지 = 메서드 존재**(맥락 3 — 인자를 늘리면 무음이 되므로). 선례는 말하기 모듈의 `openSettings` typeof 감지(ADR-0076). 감지 결과 `slowPlaybackSupport()`(`"supported" | "unsupported"`)는 **화면이 아니라 결선**(`app/catalog-lesson-audio.ts`)이 한 번 읽어 `LessonAudio.slowPlayback`으로 내린다 — 「화면은 모듈을 부르지 않는다」 원칙 그대로다. `"unsupported"`면 「천천히」를 그리지 않는다.
- 메서드는 **다섯**이다. ADR-0017 재검토 조건 「한 모듈의 메서드가 다섯을 넘는 시점」에는 닿지 않았다 — **다음 하나가 그 조건이다.**

### D2. 0.85는 JS 한 자리에 — 네이티브는 범위만 지킨다

- `SLOW_PLAYBACK_RATE = 0.85`는 `lib/listen-pace.ts` 한 곳이다. 타입 `PlaybackRate = 1 | 0.85`가 다른 값을 막는다(닫힌 타입 — JS 런타임 검사는 두지 않는다).
- 네이티브에는 0.85 리터럴이 없다. iOS `NSNumber?` · Android `double`을 받아 `nil` · NaN · 무한 · 0.5 미만 · 2.0 초과를 1.0으로 정규화한다(iOS `AudioPlaybackModule.playbackRate` · Android `AudioPlaybackRate.normalized`).

### D3. 음높이는 유지한다 — 1.0이면 속도 설정을 아예 부르지 않는다

- iOS: 속도가 1이 아닐 때만 `AVPlayerItem.audioTimePitchAlgorithm = .timeDomain` · `AVPlayer.defaultRate = rate`. `defaultRate`라서 일시정지 → `play()` 재개도 같은 속도다. `PlaybackAudioSession`(덕킹) 호출 자리 · 순서는 그대로다.
- Android: 요청의 속도를 들고, `active.start()` **바로 뒤** 속도가 1이 아니면 `setPlaybackParams(…setSpeed(rate).setPitch(1f))`. 첫 시작 · 재개 · 포커스 복귀가 모두 같은 함수(`startOrFinish`)를 지나 늘 다시 건다. 일시정지 상태에서는 부르지 않는다(멈춘 MediaPlayer가 0 아닌 속도를 받으면 재생을 시작한다[추론 — 기기 확인 항목]).
  실패(`IllegalStateException` · `IllegalArgumentException`)는 logcat `AudioPlayback`의 `W` `Cannot set playback speed`만 남기고 1.0으로 계속한다 — `done` 규칙에 닿지 않는다. 플레이어를 놓으면(`releasePlayer`) 기억한 속도를 1로 되돌린다.
- 1.0 경로는 두 호스트 모두 속도 API를 부르지 않는다 — 회귀 0.

### D4. 문항 음성은 두 갈래다 — `listen` · `answer-echo`

| 갈래 | 유형 | 재생 |
|---|---|---|
| `ListenAudio`(`kind: "listen"`) | `LISTEN_SELECT` · `MIN_PAIR_AB` · `REPLY_SELECT` · `LISTEN_BUILD` · `DICTATION` · `SHADOW` | D6 — 서면 지금 속도로 한 번 자동 · 다시 듣기 · 「천천히」 |
| `AnswerEchoAudio`(`kind: "answer-echo"`) | `TRANSLATE_TO_KO` · `TRANSLATE_TO_EN` · `WORD_ORDER` · `SYLLABLE_BUILD` · `SPEAK_WORD` · `IMG_MATCH` | D5 — 판정 순간 1.0으로 한 번, 조작 없음 |

- 불리언 대신 갈래를 문항 데이터에 싣는다 — 화면이 「듣기냐」를 다시 계산하지 않고, 한 화면(단어 선택 · 타자 · 문장 순서)이 두 갈래를 문항마다 섞어 받는다.
- 주소는 [ADR-0060](0060-episode-voice-remote-audio.md) D2의 함수 하나(`contentAudioSourceOf`)를 지난다. 자리표시자 검사는 **치환 전** 원문으로 한다 — 듣기 다섯 = `stimulus.audio.ko`, `SHADOW` = 그것 또는 `stimulus.text.ko`, `TRANSLATE_TO_EN` = `stimulus.text.ko`, `TRANSLATE_TO_KO` · `WORD_ORDER` · `SYLLABLE_BUILD` · `SPEAK_WORD` = `answers[0].ko`, `IMG_MATCH` = 정답 보기 `ko`.

### D5. 비듣기 여섯은 판정이 서는 순간 1.0으로 한 번

- 정답 · 오답 모두. 다섯 유형의 음성이 곧 정답이라 판정 전 재생은 답을 알려 준다(`TRANSLATE_TO_EN`만 제시어 음성이지만 규칙을 하나로 둔다).
  판정 순간 = 단어 선택 `hasAnswered` · 타자 · 문장 순서 · 음절 `checked` · 낱말 말하기 `heard`(판정이 난 국면만 — 불가 · 건너뜀은 재생 없음).
- 자동 재생 설정(`auto-play-audio`)이 꺼지면 내지 않는다. 「천천히」 · 조작이 없다.
- 같은 순간의 정오 효과음과 겹칠 수 있다(효과음은 별도 플레이어) — **늦추지 않는다**(지연 타이머는 ADR-0060 버린 대안 6과 같은 이유로 버린다). 겹침의 체감은 기기 확인 항목이다.
- 문항이 넘어가거나 화면이 내려가면 기존 훅(`lib/use-audio-cue.ts`, 키 `<문항 순번>:echo`)의 정리가 멈춘다.

### D6. 듣기 여섯 — 훅 하나가 자동 재생 · 다시 듣기 · 「천천히」 · 보고를 진다

- `components/use-listen-audio.ts`의 `useListenAudio`가 여섯 유형 · 다섯 화면(듣기 · 단어 선택 · 타자 · 따라 읽기 · 문장 순서)의 재생 주인이다. 옛 `screens/listening/use-listening-playback.ts`는 지웠다.
- **자동**: 키가 **문항 순번**이다(맥락 6 해소). 자동 재생 설정이 켜져 있으면 지금 속도로 한 번. 정리에서 `stopAudio()`.
- **다시 듣기**: 처음부터, 지금 속도. 누른 횟수를 속도별로 센다(아래 「측정」).
- **「천천히」를 켜면** 0.85로 **처음부터 다시** 재생한다. **끄면 재생을 건드리지 않고** 다음 재생부터 1.0이다(갑작스러운 소리를 내지 않는다).
- 문항이 없으면(`cue === null`) 모든 동작이 무동작이다.

### D7. 「천천히」 상태는 레슨의 것이다 — 저장하지 않는다 (사용자 결정)

- 주인은 `AppSession`의 `useState<ListenPace>` 하나다(`pendingResults`와 같은 자리 · 같은 수명). `clearSession`이 시작 · 나가기 · 마지막 활동 끝 · 재시도에서 `"normal"`로 되돌린다.
- 같은 레슨의 다음 문항 · 다음 활동으로 이어지고, 다른 레슨 · 앱 재실행으로 이어지지 않는다. 최종 테스트는 늘 1.0이라 영향이 없다.
- 결선 `app/catalog-listen-wiring.ts`가 값 · 토글 · 이벤트를 내고 `app/catalog-lesson-audio.ts`가 활동마다 `LessonAudio`(속도 · 지원 여부 · 자동 재생 · 콜백)를 짓는다. 단독 활동(레슨 밖)은 `standaloneLessonAudio` — 「천천히」는 `unsupported`라 보이지 않는다.

### D8. 화면은 최소로 바꾼다 — 새 화면 · 새 토큰 · 새 아이콘 없음

| 유형 | 화면 | 소리 있음 | 소리 없음 |
|---|---|---|---|
| `LISTEN_SELECT` · `MIN_PAIR_AB` | 듣기 | 3열 줄 — 다시 듣기 · 재생/일시정지 · `Slow`(`ListenPlaybackControls`) | 건너뛰지 않고 대본 + 보기(`ListeningSilentPrompt`, 재생 조작 없음 — v4 정정) |
| `LISTEN_BUILD` | 문장 순서(대화 아닌 갈래) ⟨2026-10-22 — 카드 없는 줄 배치로 바뀜, 끝의 「적용 기록」⟩ | 상대 말풍선 자리에 3열 줄 — 대본 · 로마자 · 뜻 **없음**(대본이 곧 정답). 내 말풍선 · 답 줄 · 창고 그대로 | `audio-missing` 건너뜀 |
| `REPLY_SELECT` | 단어 선택 | 제시문 · 로마자 · 뜻이 **그대로 보이고** 그 다음 간이 줄(다시 듣기 · `Slow`, `ItemListenControls`) | 글만 |
| `DICTATION` | 타자 | 단서 칸을 세로로 — 간이 줄 위 · 로마자 · 뜻 아래(**단서 유지 — 사용자 결정**) | `AudioUnavailableControl` + 단서 |
| `SHADOW` | 따라 읽기 | 문장 묶음 다음 · 파형 앞에 간이 줄. `Speak` · `Try again`은 먼저 `stopAudio()`. 녹음 중 간이 줄을 누르면 녹음을 멈추고 재생(그 시도의 결말은 지금 규칙) | 효과음만 |
| 비듣기 여섯 | 각 화면 | 보이는 변화 없음(D5) | 재생 없음 |

- 「천천히」 = 글자 토글 `Slow`(알약). 켜짐은 글자색 + 면 + 2pt 테두리 + 앞의 체크 아이콘(색 말고 두 채널 — WCAG 1.4.1). 지원이 없으면 **숨기고 꺼 두지 않는다**(ADR-0016 D10) — 자리는 비워 둬 재생 원이 가운데에 남는다.
- 간이 줄에는 「재생 중」 표시가 없다(롤플레이 `playAgain` 선례). 상태는 D12의 이름이 진다.
- `SHADOW`의 학습형 이름 `read-aloud` · 지시문 `Read the sentence out loud.` · `prompt.en`의 쓰임은 **바꾸지 않는다** — 화면 구조는 줄 하나가 더해질 뿐이고 채점 없는 연습이라는 성격이 같다(ADR-0067 재검토 조건 1의 처리).

### D9. `LISTEN_BUILD`는 기존 문장 순서 화면에 선다 (사용자 결정)

판정 순서: ① 소리 없음 → `audio-missing`(지금과 같은 우선) ② 타일 한국어(치환 · trim)에 빈 값 → `malformed` ③ 정답 `answers[0].ko`를 공백으로 나눈 조각마다 아직 안 쓴 첫 같은 글자 타일을 찾고, 하나라도 없으면 `malformed`
④ 에피소드 · 문항 id로 정한 순서로 섞는다. 정답에 쓰이지 않은 타일은 오답 조각이다. 결과는 `sentence-order` 학습형이라 앞뒤 `WORD_ORDER` · `TURN_ORDER`와 한 활동으로 묶인다(ADR-0058 D4 그대로).

### D10. 소리 없는 문항 · 재생 모듈 없는 환경은 지금 길로 간다

- 소리 없음 = `audio_url`이 비었거나 · 원문에 자리표시자가 있거나 · 규약 밖 id. 유형별 동작은 D8 표의 오른쪽 열 그대로다.
- **재생 모듈 없음**(Explorer · 모듈 없는 호스트)도 같은 길이다 — 콘텐츠 포트 `EpisodeContent.audioUrlOf`가 `isAudioAvailable()`이 거짓이면 `null`을 낸다(레슨 계획만 이 포트를 쓴다 — 컷 · 최종은 `imageUrlOf` 그대로).
  레슨 계획 메모 키는 로드 때 한 번 채운 `EpisodeContent.itemAudioEnabled`로 「소리 · 무음」을 가른다(가짜 경로로 판정하지 않는다).
- 주소가 풀린 문항은 **네트워크를 보지 않고 선다** — 재생 실패는 무음이다(ADR-0060 D7). 아래 「대가」 4.
- **v4 — 받은 파일만 소리** (사용자 결정 2026-10-22): `audioUrlOf`는 기기에 받아 둔 파일의 `file://`만 낸다(원격 https로 내려가지 않음). 받은 파일이 없으면 소리 없음이라 `LISTEN_SELECT` · `MIN_PAIR_AB`는 건너뛰지 않고 대본이 보이는 `ListeningSilentPrompt`로 서며, `LISTEN_BUILD`는 건너뛴다. 판정 시점은 레슨 계획을 만들 때(레슨 시작)이고, 계획 메모는 그때 물어본 음성 경로의 답이 그대로일 때만 재사용한다. 컷 · 최종(ADR-0060)의 음성 주소 규칙은 그대로다.

### D11. 문항 쪽 길이 동기화는 없다 — `speech_end_ms ÷ rate`를 넣지 않는다

음성 길이에 맞추는 소비자는 카탈로그 컷 타자기뿐이고([ADR-0074](0074-voice-synced-typing.md)) 컷은 1.0이다. 이번 변경도 문항 타자기를 만들지 않는다. 컷 경로가 `playAudio` 인자 둘이라는 것을 unit이 지킨다. 문항 타자기가 생기면 재검토 조건 2.

### D12. 접근성

- **`Slow` 토글**: 루트 하나가 접근성 요소(ADR-0016 D5), traits `button`, 이름 `Slow, on` / `Slow, off`(보이는 글자가 이름 앞머리 — WCAG 2.5.3, 접미사는 설정 토글과 같은 `settings.optionState` — ADR-0016 D13). 상태가 바뀌면 이름만 갱신하고 능동 발화는 하지 않는다(ADR-0016 D11). 높이 하한 48 · 글자 크기를 따라 자람.
- **대비**: 켜짐 라벨 5.01 · 테두리 5.46 · 꺼짐 라벨 16.05. **동작 줄이기에서 켜진 `Slow`를 누르는 동안 4.21 — 사용자 결정으로 받아들인다**(RoundButton 눌림 막 예외와 같은 부류 — 누르는 동안에만 생긴다).
- **간이 줄 다시 듣기**: 이름 · 탭은 안쪽 `RoundButton`이 진다(감싼 상자는 testid만 — 이중 낭독 · 버블링 의존을 없앤다). 이름 `Play again`, **재생 중이면 같은 단추가 `Stop`**(일시정지 아이콘 · 탭 = `stopAudio()`, 멈추면 다시 `Play again`) — 사용자 결정 2026-10-21. 이름이 상태를 지므로 낭독 공지를 더하지 않는다.
- **WCAG 1.4.2(Audio Control)**: 문항이 서는 자동 재생은 듣기 3열(재생/일시정지)과 간이 줄(재생 중 `Stop`)로 화면을 떠나지 않고 멈출 수 있다. **판정 뒤 한 번 재생(비듣기 여섯 · D5)에는 멈춤 조작을 두지 않는다** — 다음 문항으로 넘어가면 멈춘다.
  근거: 그 소리는 막 판정한 정답을 한 번 확인시키는 것이고 1.0 고정이며(「천천히」가 늘리지 않는다), 판정 영역에 조작을 더하면 다섯 화면의 판정 배치와 `Next`의 자리가 함께 바뀐다. **3초를 넘는 정답 음성이 있다면 그 문항은 엄격 해석으로 1.4.2 미충족이다 — 「충족」이라고 적지 않는다.** 그 수는 재지 않았다(버킷 음성 정보 파일 `duration_ms`로 셀 수 있다 — 후속).
  [ADR-0060](0060-episode-voice-remote-audio.md) D8(컷 음성 여섯의 수용)과 같은 꼴이고, 그 ADR 재검토 조건 4(「3초 넘는 음성이 새로 늘 때」)의 처리 기록이 거기 있다.
- **듣기 대본 공개 낭독**(v3): 듣기 화면(`LISTEN_SELECT` · `MIN_PAIR_AB`)에서 대본 표시 설정이 꺼져 있으면, 판정이 처음 서는 순간 문항당 한 번 「정오. 한국어 대본. 로마자」를 낭독한다(`listeningRevealAnnouncement`). 다른 자리에 새로 나타난 내용이라 ADR-0016 D11의 공지 허용 범위다. 설정이 켜져 있으면 지금 공지 그대로다.
- 덕킹(iOS `PlaybackAudioSession`) · Android 포커스(`AUDIOFOCUS_GAIN_TRANSIENT` · 일시 손실 멈춤/복귀 · 영구 손실 끝) · 화면을 떠날 때 정리 — **코드 자리 · 순서를 바꾸지 않았다.** 속도만 더했다.
- **기기 확인 항목**(조치 여부는 확인 뒤 정한다): 판정 낭독 · 정오 효과음 · 정답 음성의 겹침(VO 덕킹 켬/끔 · TalkBack), `SHADOW` 녹음 중 간이 줄을 눌렀을 때 인식 결과 낭독과 문장 음성의 겹침, `Slow` 두 번 탭 뒤 새 상태가 다시 읽히는가 — [e2e](../e2e/item-audio.md) BA4 ~ BA6.

### D13. 듣기 대본은 답한 뒤에만 보인다 (사용자 결정 v2)

- 설정 초기값 `show-transcript`를 **꺼짐**으로 바꿨다(`lib/session-options.ts`). 자동 재생은 켜짐 그대로다. 저장 방식은 바뀌지 않았다(끈 값 · 켠 값 모두 저장하지 않는다).
- 듣기 화면은 판정이 나면(정 · 오 무관) 대본(한국어 + 로마자)을 **렌더한다**(CSS 숨김이 아니라 렌더를 거름 — 판정 전 대본이 보조기술 정지점으로 남지 않는다). 다음 문항에서 다시 숨긴다. 설정의 「대본 표시」를 켜면 처음부터 보인다.
- 소리 없이 대본만으로 푸는 경로(`ListeningSilentPrompt`)는 처음부터 대본이다 — 그대로. `LISTEN_BUILD`의 상대 말풍선 자리는 처음부터 대본이 없다.
- ⟨2026-10-22⟩ **`LISTEN_SELECT`는 답하기 전 로마자만 보인다** — 이 절의 「대본은 답한 뒤에만」 가운데 로마자 몫이 부분 대체됐다([ADR-0083](0083-lesson-item-redesign.md) D7). 한글 대본은 여전히 답한 뒤다. 끝의 「적용 기록」.

### 측정

새 이벤트 하나 — **`episode_listen_item_answered`**(문항당 1회, sink `episodeIntroEventSink`, Airbridge 매핑 없음).

| 속성 | 뜻 |
|---|---|
| `episodeId` · `unitKey` · `itemId` · `itemType` | 듣기 여섯 유형 중 하나 |
| `result` | `correct` · `incorrect`(채점 넷) · `practiced` · `skipped`(`SHADOW`) |
| `pace` | 판정 순간의 속도(`normal` · `slow`) |
| `slowTurnedOn` | 이 문항에서 「천천히」를 켰는가 |
| `replayCount` · `slowReplayCount` | 1.0 / 0.85에서 **사용자가 누른** 다시 듣기 수(10진 문자열 — ADR-0029). 자동 재생 · 켤 때의 다시 재생 · 재생/일시정지는 세지 않는다 |

- 발생: 판정이 처음 서는 순간 — 듣기 보기 고름 · `REPLY_SELECT` 고름 · `DICTATION` 확인 · `LISTEN_BUILD` 확인 · 따라 읽기 `heard`(`practiced`) 또는 `Skip`(`skipped`). 소리 없는 문항은 내지 않는다.
- 읽는 법: 「천천히」 켬 비율 = `slowTurnedOn` 참 수 ÷ 이벤트 수(분모는 판정까지 간 문항 — 판정 전에 나간 문항은 빠진다, 한계) · 다시 듣기 횟수 = 두 수의 합 · 정답률 변화 = 같은 에피소드 · 유형 안에서 `result`를 `pace`(또는 `slowTurnedOn`)로 갈라 비교.
- PII 없음 — 콘텐츠 id · 유형 · 수만. 입력 글자 · 음성 · 문장은 보내지 않는다.

## 버린 대안

1. **`play(source, done, rate)`로 인자 늘리기** — 옛 iOS 호스트는 인자 수가 많으면 메서드를 부르지 않아 **무음 + Lynx 오류**다(맥락 3). 새 메서드는 존재로 감지되고 없으면 1.0으로 난다.
2. **속도 지원 여부를 화면이 모듈에 묻기** — 화면이 `NativeModules`를 만지게 된다(ADR-0017 D3 「JS 접점은 파일 하나」 · `isAudioAvailable`을 화면이 부르지 않는 원칙). 결선이 한 번 읽어 내린다.
3. **`-slow` 음성 파일을 따로 받기** — 납품이 두 배가 되고 기다릴 날이 정해지지 않았다. 재생 속도로 충분하다.
4. **꺼진 `Slow`를 두기(지원 없을 때)** — 「영구히 조작 불가한 것」이고 눌러도 1.0으로 남는 거짓이 된다(ADR-0016 D10). 숨긴다.
5. **「천천히」를 저장하기** — 사용자 결정(레슨이 끝나면 1.0).
6. **끌 때도 1.0으로 다시 재생** — 끄는 조작에 갑작스러운 소리가 붙는다.
7. **비듣기 여섯을 문항이 설 때 재생** — 음성이 곧 정답이라 답을 알려 준다(D5).
8. **판정 뒤 재생을 효과음 뒤로 미루기(지연 타이머)** — 타이머 · 취소 규칙이 는다(ADR-0060 버린 대안 6).
9. **`LISTEN_BUILD` 새 화면** — 사용자 결정(기존 조립 화면 재사용).
10. **받아쓰기 단서(로마자 · 뜻) 숨기기** — 「듣고 쓰기」가 「로마자 옮겨 쓰기」로 풀릴 수 있지만 사용자가 지금처럼 보이기로 했다.
11. **카탈로그 대화 · 최종의 플레이어 줄을 「듣기 버튼으로만」** — 사용자 결정 「원래 하던대로」.
12. **판정 뒤 한 번 재생에도 멈춤 조작** — D12의 근거. 엄격 해석 미충족을 알고 받아들인다.
13. **켜진 `Slow`만 동작 줄이기에서도 축소 유지(대비 4.21 회피)** — 동작 줄이기 원칙(ADR-0053)에 어긋난다. 사용자가 4.21을 받아들였다.

## 대가

1. **번들 +25,194 bytes**(튜토리얼 u00 `3658bfd8` 2,077,859 → `49dc553e` 2,103,053, +1.21 %, `.env.local` 없는 같은 설정 로컬 실측 — [성능 보고서](../performance/reports/item-audio-iphone-13-mini-simulator-01.md)) — 계약 예측 +7 ~ 11 kB보다 크다. 문항 음성 매핑 · 듣기 훅 · 토글과 간이 줄 · 일곱 화면 결선이 화면마다 조건 자식 · 핸들러를 한 겹씩 더한 몫이다. 상한 2,385,000은 그대로다(`devtools/bundle-size/budget.json` note). 새 의존성 · 미디어 없음.
2. **레슨 문항 자동 재생이 크게 는다** — 듣기 여섯은 문항이 설 때, 비듣기 여섯은 판정 순간. 다른 앱 소리가 그때마다 줄어든다(iOS 덕킹 · Android 일시 포커스).
3. **판정 뒤 한 번 재생에는 멈춤이 없다**(D12) — 3초를 넘는 정답 음성은 엄격 해석으로 1.4.2 미충족이다.
4. **받아 둔 음성 파일이 없으면 듣기 문항이 소리 없이 선다**(v4 — 오프라인 · 아직 못 받음 · 404 모두) [코드 — `audioUrlOf`는 받은 `file://`만 낸다] — `LISTEN_SELECT` · `MIN_PAIR_AB`는 대본이 보이는 소리 없는 제시로 서서 읽고 고른다(재생 조작 없음, `episode_listen_item_answered` 없음). `LISTEN_BUILD`는 건너뛰어 그 자리가 빈다. 판정은 레슨 시작 시점이라 레슨 도중 파일이 받아져도 그 레슨은 바뀌지 않는다. u00 첫 오프라인 설치는 음성을 받지 못한 상태라(ADR-0081 D12) `S2`는 대본이 보이는 소리 없는 듣기로, `S7`은 건너뛰어져 빈 레슨으로 선다 [실측 — 시뮬레이터, 받은 파일을 치워 흉내 낸 e2e EU8b].
5. **판정 낭독 · 효과음 · 정답 음성이 같은 순간에 겹칠 수 있다**(D5 · D12) — 체감은 기기에서 보지 않았다.
6. **옛 호스트에서는 「천천히」가 보이지 않는다**(D1) — 옛 호스트는 개발 빌드에만 있다(맥락 3).
7. **`sessionOptions`는 상수라 자동 재생 「꺼짐」은 앱에서 닿지 않는다** — unit · ui로만 판정한다.
8. **설정의 「대본 표시」 초기값이 꺼짐이 됐다** — 대본으로 풀던 사람은 설정에서 켜야 한다(끈 값처럼 켠 값도 저장되지 않아 재실행마다 꺼짐).
9. **접근성 큰 글자에서 `Slow`를 켜면 듣기 3열의 재생 원이 가운데에서 밀린다** (사용자 결정 2026-10-22 — 받아들인다) [실측 — 시뮬레이터 iPhone 13 mini].
   큰 글자에서 `Slow`가 낱말 가운데서 줄바꿈되던 것(BA7)을 고치며(`caf893ef`) 듣기 3열 · 간이 줄을 「같은 폭이되 내용 폭보다 좁아지지 않는 칸」(`minmax(max-content, 1fr)` 격자)으로 바꿨다 —
   켜진 토글이 칸보다 넓어지면 그 칸이 넓어지고 맞은편 칸이 내준다. 375pt 폭 · 접근성 최대 글자(AX5)에서 `S2` 재생 원 중심이 188 → 151pt(약 37pt 왼쪽)로 옮겨 간다. **보통 글자 크기(`large`)에서는 움직이지 않는다.**
   두 칸을 같은 폭으로 고정하면 375pt 폭에서 줄이 화면 밖으로 넘치거나 낱말이 다시 쪼개진다. 간이 줄(두 칸)의 이동은 재지 않았다.

## 재검토 조건

1. **배속 선택지가 늘어나면**(0.85 밖) — D2의 닫힌 타입 · 토글 하나의 모양 · 「천천히」 이름을 다시 본다. 재생 모듈의 메서드가 여섯째로 늘면 ADR-0017 D2 조건이다.
2. **문항에 길이 동기화 · 타자기가 생기면** — 맞출 길이 = `speech_end_ms ÷ rate`(`duration_ms`도 같은 비율)로 맞춘다(D11).
3. **정답 효과음 · 판정 낭독과 정답 음성의 겹침이 학습을 해친다고 보고되면** — D5 「늦추지 않는다」를 연다. 능동 발화를 하는 화면은 공지 완료 콜백 뒤에 시작하는 길부터 본다(타이머가 아니라).
4. **「천천히」 저장 요구가 오면** — D7. 저장 키 · 계정 경계 · 기본값을 함께 정한다.
5. **3초를 넘는 정답 음성이 확인되거나 판정 뒤 재생의 불편이 보고되면** — D12의 수용을 걷는다(판정 뒤 재생에 멈춤 조작을 두거나 음성을 줄인다).
6. **기기 확인(BA4 ~ BA6)에서 `Slow`의 상태 변화가 다시 읽히지 않으면** — 공지를 더하지 말고 traits에 `selected`를 더하는 안을 ADR-0016 D13 게이트로 다시 판정한다.

## 미확인 · 후속

1. **기기 확인의 미실행 항목**(부분 회차로 수용 — 사용자 결정 2026-10-22) — 음높이 청음, Android 기기 회차(EU2), 덕킹 · 효과음 겹침(EU4 · EU5 일부), VoiceOver · TalkBack 낭독(BA1 · BA2 · BA4 ~ BA6), 지연(EU6), 옛 호스트(EU7).
   절차는 [학습 문항 음성 e2e](../e2e/item-audio.md)에 있다. 겹침 · 재낭독 결과가 나오면 재검토 조건 3 · 6으로 판정한다.
2. **Android 원격 실패의 `done`이 약 30초 뒤에 온다** [실측 — 계측] — MediaPlayer가 거부된 연결을 그만큼 다시 시도한다. 그동안 화면은 멈추지 않는다(실패는 무음 · 흐름은 소리 결과를 읽지 않는다 — ADR-0060 D7). 계측 대기는 10 → 40초로 고쳤다([Android 오디오 재생 검증](../e2e/android-audio-playback.md)).
3. **성능 보고서의 지연 셋**(레슨 시작 → 첫 문항 첫 그리기 · 문항 첫 그리기 → 호스트 재생 호출 · `Slow` 탭 → `playAtRate` 호출) — [성능 보고서](../performance/reports/item-audio-iphone-13-mini-simulator-01.md)는 「부분 측정」(번들 · 재생 길이 비만)이다. 지연 · 렌더링 · 메모리 · Android는 후속.
4. **판정 뒤 정답 음성의 길이 집계**(D12) — 버킷 음성 정보 파일 `duration_ms`로 1.0에서 3초를 넘는 정답 음성의 수와 유형을 센다.
5. **짝 작업 — GitHub wiki 「이벤트 사전」의 `episode_listen_item_answered`**(저장소 밖) — 위 「측정」의 속성 · 발생 · 읽는 법과, 소리 없는 제시로 선 듣기 문항은 이벤트를 내지 않는다는 것을 같은 PR의 짝 작업으로 옮긴다.
6. **`S9`(대답 고르기) 질문 카드의 한국어 · 로마자 줄 접근성 이름이 빈 값**(시뮬레이터 접근성 트리 관찰 — 이 PR 전부터 있던 결함) — 사용자 결정으로 이 PR 밖이다. 다음 리디자인 PR에서 VoiceOver로 확인하고 고친다. ⟨2026-10-22 — 고침, [ADR-0083](0083-lesson-item-redesign.md)⟩ 원인은 빈칸 없는 줄의 `accessibility-label`을 비워 둔 것이다(빈칸 있는 줄만 라벨을 두던 규칙). 로마자 줄은 글 역할 부품이 늘 `Pronunciation: <로마자>` 이름을 주고, 제시문은 빈칸이 없으면 보이는 글자가 이름이다(S9 · S10 · S13 질문 카드 공통, ui `WordChoicePresentation.blank.ui.test.tsx` UBL2). VoiceOver 청취는 [학습 문항 리디자인 e2e](../e2e/lesson-redesign.md) 후속 회차 몫이다.

## 적용 기록 ⟨2026-10-22 — 학습 문항 리디자인⟩

결정은 [ADR-0083](0083-lesson-item-redesign.md) D6 · D7 · D12 · D13. 재생 시점 · 속도 · 「천천히」 수명 · 접근성 이름(D1 ~ D7 · D12)은 바뀌지 않는다 — 화면 모양에 닿는 자리만 적는다.

- **D13(v2)의 부분 대체 — `LISTEN_SELECT`는 답하기 전 로마자만** (사용자 결정, 요구사항 3). 문항이 「답 전에 무엇을 보이는가」를 갈래(`romanization` | `nothing`, 없으면 `nothing`)로 싣고 `LISTEN_SELECT`만 `romanization`이다. 카드는 재생 줄 → 구분선 → 로마자. **한글 대본은 여전히 판정 뒤에만 렌더된다.** `MIN_PAIR_AB`는 답 전 구분선 · 로마자도 없다(두 보기의 차이가 곧 로마자라 답을 알려 준다). 대본 표시 설정 · 판정 때 대본 낭독(D12)은 그대로다.
- **듣기 조작이 부품 셋이 됐다** — `ListenControls.Replay`(RoundButton l) · `.Playback`(xl, `neutral` 기본 · `brand`) · `.Slow`. 듣기 3열 줄(`ListenPlaybackRow`)의 순서 · 「재생이 늘 가운데」 규칙 · 이름 · testid는 그대로다. 간이 줄(`ItemListenControls`)도 그대로다.
- **D8 표 `LISTEN_BUILD` 행** — 「상대 말풍선 자리에 3열 줄 · 내 말풍선 · 답 줄 · 창고 그대로」는 그때의 모양이다. 지금은 카드 없는 줄 배치다: 위 줄 = **brand 재생 단추** + [정답 로마자 / 다시 듣기 · `Slow`] → 답 줄 둘 → 조각 뭉치 → 흐름 안 `Check`. **정답 로마자가 처음부터 보인다**(사용자가 고른 시안 S7v2) — 한글 대본은 여전히 없다. 내 말풍선은 지웠다.
- **D8 표 `SHADOW` 행** — 따라 읽기의 `Practice` 표식을 걷었다. 간이 줄 자리(문장 묶음 다음 · 파형 앞)는 그대로다.
- ⚠ 기기에서 보지 않았다([학습 문항 리디자인 e2e](../e2e/lesson-redesign.md), 미실행). 이 문서의 [e2e](../e2e/item-audio.md) EU8의 `S2` · `S7` 기대 모양도 함께 고쳤다.
