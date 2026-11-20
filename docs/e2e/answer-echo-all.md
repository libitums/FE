# 정답 뒤 음성 — 기기 확인 절차 · 기록

[ADR-0172](../adr/0172-answer-echo-all-items.md). 정답을 고른 뒤 정답 음성이 **실제로 재생 모듈에 닿는지**, 판정 효과음과 겹치지 않는지, 다음 문항에서 끊기는지를 본다.
소리는 듣지 않는다(시뮬레이터 · 에뮬레이터, 무음). 재생 호출 로그와 오디오 세션 · 포커스 로그로 판정한다.

| 이미 지는 층 | 무엇을 |
|---|---|
| unit | 수준 5 `feedback.audio_url` 디코드(AA1 ~ AA4), 녹음 색인 · 정답 문장(RA1 ~ RA6 · AT1 ~ AT6), 문항 음성 갈래 · 길이(IE1 ~ IE12 · IM1 ~ IM3), 신호 틈 · 넘김 기다림(QD1 ~ QD6) |
| ui | 틈을 둔 재생 · 취소(UA-D1 ~ UA-D4), 대답 고르기 정답 대답(WC-E1), 긴 정답 음성 동안 넘기지 않음(WC-E2), 다섯 화면의 정답 뒤 재생 시점 |
| integration | 수준 5 모양 u01에서 WORD_ORDER · CLOZE · ROLE_LINE · REPLY_SELECT 정답 뒤 재생 주소, 틈 안에 넘기면 무음 · 재생 뒤 넘기면 정지(AE1 ~ AE4) |

## 준비

- 콘텐츠: 운영 버킷 수준 5(`manifests/level-5.json`). 앱이 원격 본문을 받아야 하므로 `apps/mobile/.env.local`이 있어야 한다(값은 적지 않는다).
  튜토리얼(u00)은 수준 5에서 `IMG_MATCH`(S1-02) · `SYLLABLE_BUILD`(S1-05)의 정답 음성이 `feedback.audio_url`에 있고, `CLOZE`(S2-01) · `ROLE_LINE`(S3-01) · `CULTURE_CHECK`(S3-04)는 문항 음성이 없다.
  음성은 앱에 실린 튜토리얼 음성이라 받기를 기다리지 않는다.
- 비교: **red** = 이 변경 전 번들(base 커밋의 앱 코드), **green** = 이 브랜치 번들. 호스트 앱은 같다.
- iOS: 전용 시뮬레이터(iPhone 17 Pro, iOS 26.5), Debug 호스트 + `--bundle-url=main.lynx`, 번들만 앱 컨테이너에 갈아 끼운다.
  로그: `log stream --level debug --predicate 'process == "Host"'` — Lynx가 남기는 `NativeModule: LynxModuleDarwin will invokeMethod: <모듈>.<메서드> , args: …` 줄.
- Android: Pixel_8 AVD `-read-only`(전용 포트), `assembleBundled`, 미디어 음량 0.
  로그: `logcat`의 `MethodInvoker::InvokeMethod, method: (<모듈>.<메서드>.<인자>) will fire` 줄, `dumpsys audio`의 `requestAudioFocus()` · `abandonAudioFocus()`.
- 비회원으로 들어가 튜토리얼 표지를 건너뛰고 레슨 1 → 2 → 3을 푼다.

## 항목

| # | 확인 | 기대 |
|---|---|---|
| AE-D1 | red · green: 레슨 1 `IMG_MATCH` 정답 | red: `SoundEffectsModule.play correct_answer`만. green: 그 뒤 약 0.8초에 `AudioPlaybackModule.play level-3-u00-tutorial-s1-01-word-r2` |
| AE-D2 | red · green: 레슨 1 `SYLLABLE_BUILD` 정답 | red: 효과음만. green: 약 0.8초 뒤 `…s1-03-word` |
| AE-D3 | green: 레슨 2 `CLOZE` 정답 | 약 0.8초 뒤 `…d-01-r2`(대화 1번 줄 — 「안녕하세요! 한국은 처음이세요?」) |
| AE-D4 | green: 레슨 3 `ROLE_LINE` · `CULTURE_CHECK` 정답 | `…d-02-r2` · `…d-04-v2` |
| AE-D5 | green: 듣기 · 대화 순서(`LISTEN_SELECT` · `LISTEN_BUILD` · `TURN_ORDER`) 판정 | 정답 뒤 재생 없음 |
| AE-D6 | green: 정답 음성 뒤 다음 문항 | `AudioPlaybackModule.stop`이 다음 문항 전에 한 번 |
| AE-D7 | 실행 로그 | JS 오류(ReferenceError · TypeError) 없음 |
| AE-D8 | green(넘김 기다림 포함): 레슨 2 `CLOZE` 정답 | 정답 음성이 끝난 뒤에 넘어간다(`stop`이 말소리 끝 뒤) |

## 기록 — 2026-11-20

- 빌드: base `2c99e0e1`(red) · `feat/answer-echo-all` WIP(green, 넘김 기다림 · 길이 전). `.env.local`이 든 번들.
- 콘텐츠: 원격 수준 5판이 섰다 — 레슨 1이 카드 → 그림 → 카드 순(「Word 1 of 1」), 레슨 2 `LISTEN_BUILD`가 `d-02-r2`(내장판은 `d-01-r2`).

### iOS 시뮬레이터 iPhone 17 Pro · iOS 26.5

| # | 결과 | 로그(시각) |
|---|---|---|
| AE-D1 | 통과 | red 22:58:06.724 `correct_answer` · 재생 없음. green 23:00:11.047 `correct_answer` → 11.849 `play …s1-01-word-r2`(+802 ms) → 13.564 `stop`(넘김) |
| AE-D2 | 통과 | red 22:59:11.842 `correct_answer` · 재생 없음. green 23:00:58.184 → 58.986 `play …s1-03-word`(+802 ms) |
| AE-D3 | 통과(잘림 발견) | 23:01:48.664 → 49.467 `play …d-01-r2`(+803 ms) → 51.179 `stop`. 녹음 길이 3.11초인데 2.5초 넘김에 1.7초에서 끊겼다 → 넘김 기다림(ADR-0172 D4)을 더함, ui WC-E2 |
| AE-D4 | 통과 | `ROLE_LINE` 23:02:43.569 → 44.372 `play …d-02-r2`(+803 ms). `CULTURE_CHECK` 23:03:35.556 `play …d-04-v2`(이 화면은 판정 효과음이 없다), Continue에서 `stop` |
| AE-D5 | 통과 | `LISTEN_SELECT` 오답 · `LISTEN_BUILD` · `TURN_ORDER` 정답 뒤 `play` 없음 |
| AE-D6 | 통과 | 위 각 줄의 `stop` |
| AE-D7 | 통과 | JS 오류 0건. Lynx 네이티브 경고(`layout_context` · `timing_map`)만 |

### Android Pixel_8 AVD(-read-only) · assembleBundled

| # | 결과 | 로그(시각) |
|---|---|---|
| AE-D1 | 통과 | red 23:06:24.874 `correct_answer` · 재생 없음. green 23:07:17.120 → 17.921 `play …s1-01-word-r2`(+801 ms), `requestAudioFocus()` 17.950 `USAGE_MEDIA/CONTENT_TYPE_SPEECH` → `abandonAudioFocus()` 19.131(재생 끝), 19.647 `stop` |
| AE-D2 | 통과 | 23:07:55.032 → 55.834 `play …s1-03-word`(+802 ms) |
| AE-D3 | 통과 | 23:08:25.323 → 26.125 `play …d-01-r2`(+802 ms) → 27.839 `stop` |
| AE-D7 | 통과 | `FATAL` · JS 오류 0건 |

### iOS 재확인 — 넘김 기다림을 더한 번들(같은 날)

| # | 결과 | 로그(시각) |
|---|---|---|
| AE-D8 | 통과 | 새 시뮬레이터 · 새 비회원. 레슨 2 `CLOZE` 23:21:39.344 `correct_answer` → 40.147 `play …d-01-r2`(+803 ms) → 43.483 `stop`(넘김). 판정에서 넘김까지 4.139초 = 0.8 + 2.925(`speech_end_ms`) + 0.4초 — 말소리가 끝난 뒤 넘어갔다. JS 오류 0건 |

미확인: Android에서 넘김 기다림, `REPLY_SELECT` · `PARTICLE_FILL` · `CLOZE_CHOICE` · `WORD_ORDER` · `TRANSLATE_*` · `SPEAK_WORD`(통합 · ui 시험이 진다), VoiceOver · TalkBack 판정 낭독과의 겹침(ADR-0172 「남은 일」).
