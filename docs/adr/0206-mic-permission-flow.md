# ADR-0206: 마이크 권한 · 인식 실패 흐름 — 사전 안내 · 거부 시트(설정 열기) · 다른 문구의 다시 말하기

- 상태: **채택 — 앱, PR(머지 전), 서버 · 운영 변경 없음 · 호스트는 테스트용 정리 하나**
- 날짜: 2026-11-27
- **사용자 결정**: 시안 「말하기 개선 시안」의 P1(MicPrime) · P2(MicDenied) · P3(MicFailed)와 메모 n3를 보고 「진행」(2026-11-27).
- 이어받는 결정: [ADR-0026](0026-permission-entry-conditions-and-denial-handling.md)(권한 입장 조건 · 거부 처리 · 외부 이동은 이 앱의
  설정 페이지 하나) · [ADR-0067](0067-episode-format-speaking.md) D4 · D5(국면별 조작 · 활동 안 잠금) ·
  [ADR-0181](0181-speech-no-match-retry.md)(못 알아들음 = 다시 말하기) · [ADR-0017](0017-host-native-capabilities-and-audio.md)(인식 접점) ·
  [ADR-0029](0029-product-analytics-posthog.md)(이벤트) · [ADR-0185](0185-ui-traditional-chinese-taiwan.md)(화면 언어 여덟).
- **부분 개정**: ADR-0067 D5(「blocked는 활동 동안 되돌아가지 않는다」 — 권한이 다시 열리면 푼다, D3) ·
  ADR-0181 D3 · D4(인식 실패 `failed`는 「진짜 불가 · Try again 없음 · 불가 문구」 — 다른 문구의 다시 말하기로 바꾼다, D5).

## 왜

- 권한 거부(`unavailable:blocked`)는 Android 66건(56명)이다. 레슨 화면에 설정으로 가는 길이 없어 한 번 거부하면 레슨 끝까지 Skip만 할 수 있었다.
- 거부와 인식 실패가 같은 문구였다 — 「Speech recognition isn't available right now. Tap Skip to continue.」.
- 시스템 권한 창이 아무 설명 없이 첫 마이크 탭에 떴다(왜 필요한지 · 목소리를 저장하는지 모른 채 답한다).

## 결정

### D1. 사전 안내(P1) — 첫 말하기 문항 직전, 아직 묻지 않은 사용자에게 한 번

- 말하기 활동(낱말 말하기 · 따라 읽기)이 **열릴 때** 권한을 조회(`getStatus`, 창을 띄우지 않음)해 판정한다 — 순수 함수
  `micGateOf(status)`(`lib/mic-permission.ts`):

  | 권한 상태(마이크 · 음성 인식) | 문 | 열 때 시트(`micSheetOnOpen`) |
  | --- | --- | --- |
  | 하나라도 미요청(`not-determined`) | `ask` | 사전 안내를 본 적 없으면 **사전 안내**, 봤으면 없음 |
  | 하나라도 거부(`denied`, 미요청 없음) | `denied` | **거부 시트**(D2) |
  | 제한(`restricted`) · 모름 · 인식기 없음 | `unavailable` | 없음(되돌릴 곳이 없다 — 지금 「인식 불가 · Skip」 그대로) |
  | 둘 다 허용 · 인식기 있음 | `ready` | 없음 |

- 시트: 「Time to speak Korean」 · 「Duru listens to your voice to check your pronunciation. Your voice isn't saved.」 ·
  [Allow microphone](주) · [Not now — skip speaking](보조). 고를 때까지 머무는 시트(닫기 단추 · 바깥 누름 없음, ui-lynx `BottomSheet`).
  - **「목소리를 저장하지 않음」은 사실이다** — 호스트는 오디오 버퍼를 인식기에만 넘기고 파일을 쓰지 않으며(iOS `AVAudioEngine` 탭 ·
    Android `SpeechRecognizer`), 앱은 인식 글자만 다룬다. 개인정보 처리방침(「We do not record, store, or receive your voice.」)과 같은 뜻이다.
    인식기 제공자(Apple · Google)로 소리가 갈 수 있다는 것은 처리방침이 적는다 — 시트는 「저장」만 말한다.
- **Allow** → 시스템 권한 창(`requestPermissions`). 답이 허용이면 시트가 닫히고 활동은 준비 국면(마이크를 눌러 말한다 — 저절로 듣지 않는다),
  거부면 거부 시트(D2)로 바뀐다. 답을 기다리는 동안 두 단추는 잠긴다.
- **Not now** → **이 레슨의 말하기를 건너뛴다**(D4, 까닭 `mic:not-now`).
- **한 번 본 뒤에는 다시 띄우지 않는다** — 띄울 때 기기 키 `libitum.mic-primer-seen` = `"1"`을 적는다(시스템 권한이 기기 단위라 계정 키가 아니다).
  그 뒤 미요청이면(Not now를 골랐던 사용자) 다음 레슨에서는 시트 없이 **마이크를 누를 때 시스템 창이 바로 뜬다**(지금 동작).
  저장소를 못 읽으면 처음으로 본다(사전 안내가 다시 설 수 있다 — 막지 않는다).
- 롤플레이는 미리보기의 **Start**가 같은 판정을 한다(지금처럼 열 때가 아니라 시작 단추에서) — 미요청 · 처음이면 사전 안내, Allow 뒤 답은
  지금의 미리보기 판정(`speechReadinessOf`)에 넘긴다(허용 → 표지 컷 · 거부 → 지금의 「Turn on the microphone」 안내). **Not now는 장면을 시작한다**
  — 롤플레이는 말하기가 전부라 「말하기 건너뜀」이 곧 빈 판이 되므로, 턴마다 「Can't speak now」로 넘기게 두고 마이크를 누르면 그때 시스템 창이 뜬다.

### D2. 거부(P2) — blocked일 때만 「Microphone is off」 시트와 Open Settings

- 거부 시트: 「Microphone is off」 · 「Turn on the microphone for Duru in Settings, then come back — we'll check again.」 ·
  [Open Settings](주) · [Continue without speaking](보조).
- 서는 때: ① 활동이 열릴 때 이미 거부(D1 표) ② 사전 안내 Allow 뒤 거부 ③ 문항 중 마이크를 눌러 시스템 창에서 거부했거나 듣는 사이 권한이
  거두어짐 — 말하기 결선(`useSpeechAttempt`)이 결말 `unavailable:blocked`와 함께, **문이 `denied`일 때만** 거부 시트를 부른다
  (제한 · 인식기 없음은 부르지 않는다 — 설정으로 되돌릴 수 없다).
- **설정으로 가는 길은 앱에 이미 있다** — 호스트 `SpeechRecognitionModule.openSettings`(iOS `UIApplication.openSettingsURLString` ·
  Android `Settings.ACTION_APPLICATION_DETAILS_SETTINGS`), 롤플레이 미리보기 안내가 쓰던 것. 새 호스트 코드는 없다. 목적지는 ADR-0026 D4의
  「이 앱의 설정 페이지 하나」 그대로다.
- **Open Settings**를 눌러도 시트는 남는다. **앱이 앞으로 돌아오면**(호스트 전역 이벤트 `contentSyncOpportunity`, ADR-0071) 권한을 다시 조회해
  둘 다 허용이면 시트를 닫고 활동 잠금을 푼다(D3). 아직 거부면 그대로다. iOS는 권한을 바꾸면 앱을 다시 띄우기도 한다 — 그때는 레슨이 처음부터다.
- **Continue without speaking** → 이 레슨의 남은 말하기를 건너뛴다(D4, 까닭 `unavailable:blocked` — 기존 값 그대로).
- 롤플레이 대화 중 거부: 같은 거부 시트. Continue without speaking은 시트만 닫는다(턴마다 「Can't speak now」), 그 화면에서는 다시 띄우지 않는다.
  롤플레이 미리보기의 거부 안내(`Dialog` — 「Turn on the microphone」 · Open Settings · Not now)는 **그대로 둔다** — 이미 설정으로 가는 길이 있고,
  다시 Start를 누르면 다시 판정한다.

### D3. 권한이 다시 열리면 활동 잠금을 푼다(ADR-0067 D5 개정)

- 리듀서 동작 `reopen`(낱말 말하기 · 따라 읽기) — 가용성을 `open`으로, 불가(blocked) 국면이면 준비로. 바뀔 것이 없으면 같은 참조
  (공용 `speechReopened`, `lib/speech-attempt.ts`). 부르는 때는 사전 안내 Allow 허용 · 설정에서 돌아와 허용 둘이다.

### D4. 「이 레슨의 말하기 건너뜀」

- Not now · Continue without speaking을 고르면 **지금 활동의 남은 문항**(지금 문항 포함)을 그 까닭으로 건너뜀 보고하고 결과를 한 번 올린다 —
  레슨 마지막 활동이어도 완료 카드 없이(결과 화면으로). 낱말 말하기는 문항마다 `episode_item_answered`(`skipped`, `skipReason`)를 내고,
  따라 읽기는 지금 문항의 건너뜀 하나와 남은 수를 건너뜀 수로 올린다(채점하지 않는 활동 — 지금 Skip과 같은 보고 꼴).
- **같은 레슨의 뒤 말하기 활동은 열자마자 같은 까닭으로 건너뛴다**(시트 없이). 기억은 레슨 열쇠(`에피소드:유닛`) 하나이고 레슨이 새로
  시작될 때(`clearSession`) 비운다. 실행 동안만 산다(저장하지 않음).
- 새 건너뜀 까닭 하나 — `mic:not-now`. 기존 `unavailable:*` · `missed:*` · `user`는 그대로다.

### D5. 인식 실패(P3) — 거부와 다른 문구, Try again이 주 버튼(ADR-0181 D3 · D4 개정)

- 인식 실패(`unavailable:failed` — 마이크 입력 실패 · 클라이언트 오류 등)는 이제 **다시 말할 수 있는 실패**다(`speechRetryable`):
  안내 「Something went wrong while listening. Try again.」(새 문구 `micPermission.listenFailed`) · [Try again](주) · [Skip](보조) · 마이크 대기.
  잠그지 않는다(지금처럼). 건너뜀 까닭은 `unavailable:failed` 그대로.
- 못 알아들음(`missed:no-match`)은 ADR-0181의 문구(「I didn't catch that. Tap the mic and try again.」) 그대로 — 이미 거부와 다른 문구다.
- **Android 한국어 팩 없음(#555)은 그대로 둔다** — 인식기 오류 12 · 13(언어 없음)이면 지금의 「인식 불가 · Skip」이다(다시 말해도 풀리지 않는다).
  진단에 도메인이 없어(옛 Android 호스트는 한국어 팩도 싣지 않는다) 코드만 본다 — 다른 도메인의 12 · 13도 지금 안내 그대로다.
- **같은 문항에서 두 번 실패하면 「Hear it」(정답 듣기)을 함께 보인다** — 낱말 말하기, 정답 소리가 있을 때. 누르면 힌트의 「정답 듣기」와 같은
  기록(`hintUsed: listen`)으로 소리를 한 번 낸다. 들으면(판정) · 문항이 바뀌면 다시 센다. 따라 읽기는 문장 듣기 줄이 늘 있어 더하지 않았다.
- 롤플레이: 인식 실패도 같은 문구 + Try again 버튼(못 알아들음의 버튼 자리 · 누르면 Stop으로 남는 규칙 그대로).
- **개정 ⟨2026-11-27, 롤플레이 — 마이크 하나⟩**(브랜치 `fix/roleplay-duplicate-mic-button`, 사용자 지시): 롤플레이의 「Try again / Stop」 버튼
  (`roleplay-talk-missed-retry`)은 바로 위 공용 마이크와 같은 일을 해 중복이었다 — 「Stop」이 두 곳에 동시에 서기도 했다. 버튼을 걷고 **마이크 하나**가
  다시 말하기를 맡는다: 못 알아들음 · 인식 실패 뒤 마이크의 낭독 이름과 아래 상태 문구가 「Try again」(`speaking.tryAgain`), 듣는 중에는 「Stop」.
  스크린리더는 마이크를 그 이름으로 찾는다 — 버튼을 둔 까닭이던 「이름 있는 다시 말하기 · 포커스가 사라지지 않음」은 같은 마이크 요소가 이름만 바뀌며
  지킨다(`roleplayMicLabels`). 권한 거부(진짜 불가)는 그대로 마이크가 꺼지고 「Try again」이 없다.
  - 말하기 퀴즈(`SpeakWordActivity`)에도 같은 꼴이 있다 — 셸 아래 주 버튼(Speak · Stop speaking · 판정 전 Try again)이 큰 마이크와 같은 동작이다
    (ADR-0201 D6 적용 1의 「스스로 정한 기본값 — 남겼다」). 이 개정에서는 바꾸지 않았다: 셸 버튼 행이 비며 Skip이 작업 영역으로 옮겨 가는 화면
    변경이고, 흐름 테스트 12개 파일 49곳이 그 버튼을 누른다 — 따로 정한다.
  - 확인: ui `RoleplayTalkScreen.missed.ui` RT-M1 ~ RT-M6 · `RoleplayTalkScreen.mic.ui` RT-P1(마이크 하나 · 이름 Try again · 누르면 다시 듣기, red → green).

### D6. 이벤트(PostHog만, Airbridge 매핑 없음)

| 이름 | 속성 | 때 |
| --- | --- | --- |
| `mic_permission_sheet_shown` | `surface`(`speak-word` · `read-aloud` · `roleplay`) · `sheet`(`prime` · `denied`) | 시트가 설 때 |
| `mic_permission_answered` | `surface` · `result`(`allowed` · `denied`) · `source`(`prompt` · `settings`) | 사전 안내 Allow 뒤 시스템 창 답 · 설정에서 돌아와 허용 |
| `mic_permission_settings_opened` | `surface` | Open Settings |

- 권한을 모르면(미요청 · 모름이 남음) `answered`를 내지 않는다. 설정에서 돌아와 **아직 거부**인 것은 내지 않는다(돌아온 때를 다 세지 않음).
- Not now · Continue without speaking은 따로 내지 않는다 — 건너뛴 문항의 `skipReason`(`mic:not-now` · `unavailable:blocked`)이 싣는다.
- 이름 128 → 131(AN1), Airbridge 표 98 · 90 → 101 · 93(AB3, 모두 null).

### D7. 어디에 붙였나

| 자리 | 사전 안내 | 거부 시트 | 인식 실패 문구 · Try again | 「Hear it」 |
| --- | --- | --- | --- | --- |
| 낱말 말하기(SPEAK_WORD, `screens/speak-word`) | 열 때 | 열 때 · 문항 중 | ○ | ○ |
| 따라 읽기(SHADOW, `screens/read-aloud`) | 열 때 | 열 때 · 문항 중 | ○ | — (문장 듣기 줄) |
| 롤플레이(`RoleplayStoryFlow` · `RoleplayTalkScreen`) | Start | 대화 중(미리보기는 기존 안내) | ○ | — (힌트는 롤플레이 화면 개편이 맡음) |
| 말하기 탐침(`speech-probe`, 개발용) | — | — | — | — |

음성 입력을 쓰는 곳은 이 셋과 개발용 탐침뿐이다 — `useSpeechAttempt` · `requestSpeechPermissions`를 부르는 자리를 훑었다(웹 체험판은 브라우저 권한이라 밖).

## 버린 대안

- **사전 안내를 마이크를 처음 누를 때 띄우기**: 시안은 「첫 말하기 문항 직전」이고, 누른 뒤 안내가 끼면 말하려던 흐름이 두 번 끊긴다.
- **Not now 뒤에도 레슨마다 사전 안내**: 한 번 이유를 들은 사람에게 같은 시트를 되풀이한다. 시스템 창이 그 뒤를 맡는다.
- **거부 시트를 열 때는 띄우지 않고 마이크를 눌렀을 때만**: 이미 거부한 56명은 매 문항 Skip을 누르고서야 길을 본다.
- **인식 실패를 `missed:failed`로 옮기기**: 고칠 곳은 적지만 `unavailable:failed` 건너뜀 까닭의 뜻이 바뀌어 지난 측정과 이어지지 않는다(브리프: 기존 사유 유지).
- **롤플레이 미리보기 안내를 거부 시트로 바꾸기**: 이미 Open Settings가 있고 화면 개편이 같은 파일을 고치고 있어 겹침을 줄였다.

## 구현

- 순수: `lib/mic-permission.ts`(`micGateOf` · `micSheetOnOpen` · `micAnswerOf`) · `lib/lesson-speaking-skip.ts` ·
  `lib/speech-attempt.ts`(`speechRetryable` · `speechFailuresAfter` · `speechReopened` · 마이크 대기) · 두 리듀서의 `reopen` ·
  `speakWordSkipRest` · `readAloudRemainingCount` · `lib/item-answer.ts`(`mic:not-now`).
- 결선: `components/mic-permission/use-mic-permission.ts` · `use-mic-speech-attempt.ts` · `MicPermissionSheet.tsx`,
  `components/use-speech-attempt.ts`(거부면 `onPermissionDenied`), `screens/speak-word/SpeakWordMic.tsx`(낱말 말하기 결선 · 결과 올리기 · Hear it).
- 앱: `render-catalog-activity.tsx`(레슨 열쇠 · 이벤트) · `screen-wiring.ts`(`onMicPermissionEvent` → `episodeIntroEventSink`) ·
  `catalog-lesson-wiring.ts`(`clearSession`이 건너뜀 기억도 비움) · `RoleplayStoryFlow.tsx` · `render-roleplay-story.tsx`.
- 문구: `lib/ui-copy-mic-permission.ts` — 여덟 언어(en · es · id · ja · my · th · vi · zh-TW).
- 호스트: 새 기능 없음. Android `SpeechPermissionState`(마이크 상태 이름 — 컨트롤러에서 떼어 단위 테스트), iOS HostTests 메서드 표 확인.

## 테스트

- unit: MP-U1 ~ U7 · LS-U1 ~ U3 · SA-R1 ~ R6 · SW-P1 ~ P7 · RA-P1 ~ P4 · RS-P1 ~ P3 · AN1 · AB3 (+ 바뀐 기대 SW1 · SW7 · SW8 · RA1 · RA6 · RA8 · SA4).
- ui: USW-P1 ~ P11 · URA-P1 ~ P4 · RT-P1 ~ P2 (+ USW8b · URA10 · RT5 · RT-M5 개정).
- integration: IMP1 ~ IMP3(`App.mic-permission`) · IR5 · IR5b · IR5c · IR7(`App.roleplay-story`).
- 호스트: Android `SpeechPermissionStateTest` · iOS `testMethodLookupExposesOpenSettingsForDeniedSheet`.
- 기기: [e2e](../e2e/mic-permission.md) MP-E1 ~ E8.

## 한계

- iOS는 설정에서 권한을 바꾸면 앱을 끝내고 다시 띄우는 경우가 많아, 「돌아오면 다시 확인」은 주로 Android에서 보인다. iOS는 다시 띄운 뒤 레슨을
  다시 열면 허용된 채 시작한다.
- 롤플레이의 한국어 팩 없음(Android 12 · 13)은 상태에 진단이 없어 인식 실패 문구 + Try again이 선다(레슨 두 화면은 지금 안내 그대로).
- 따라 읽기의 「이 레슨의 말하기 건너뜀」은 지금 문항 하나만 `episode_listen_item_answered`(skipped)를 내고 남은 문장은 건너뜀 수로만 센다.
- 사전 안내 · 거부 시트에 시안의 큰 마이크 아이콘은 없다 — 앱 바텀 시트(ui-lynx)에 제목 위 자리가 없어 제목 · 본문 · 단추만 그렸다.
