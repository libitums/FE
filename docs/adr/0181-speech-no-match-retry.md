# ADR-0181: 말하기 — 못 알아들음은 「인식 불가」가 아니라 「다시 말하기」

- 상태: **채택 — 앱**(2026-11-24). 브랜치 `fix/speech-no-match`.
- 날짜: 2026-11-24
- **부분 개정** ⟨2026-11-27 — [ADR-0206](0206-mic-permission-flow.md) D5⟩ D3 · D4의 인식 실패(`unavailable:failed`) — 「진짜 불가 · Try again 없음 · 불가 문구」였던 것을
  거부와 다른 문구(「Something went wrong while listening. Try again.」) · Try again(주) · Skip(보조)로 바꾼다(롤플레이도). Android 언어 없음(12 · 13, 한국어 팩)은 그대로다.
  같은 문항에서 두 번 실패하면 낱말 말하기에 「Hear it」이 함께 선다. 건너뜀 까닭은 그대로 `unavailable:failed`.
- **사용자 보고(2026-11-23)**: Android에서 말하기를 시험하는데 「Speech recognition isn't available right now. Tap Skip to continue.」가 뜸 —
  「하드웨어 문제가 아닌 발음 문제면 틀렸다고 떠야하지 않나」. 이어 「못알아들음 문제면 다시 풀 수 있게 retry 버튼도 있으면 좋을 거 같은데」.
- 이어받는 결정: [ADR-0067](0067-episode-format-speaking.md) D4 · D5(국면별 조작 · 활동 안 잠금) ·
  [ADR-0084](0084-lesson-item-redesign.md)(`episode_item_answered`의 `skipReason`) · [ADR-0017](0017-host-native-capabilities-and-audio.md)(인식 접점 · 오류 코드) ·
  [ADR-0029](0029-product-analytics-posthog.md)(이벤트 이름 · 값).

## 맥락

`speechAttemptOutcomeOf`는 인식 결과가 `recognized`가 아니면 모두 `unavailable`로 접었다 — 권한 · 인식기 없음은 `blocked`, 나머지는 `failed`.
화면은 `failed`에도 「인식 불가 · Skip」을 보였다. Android 호스트는 `ERROR_NO_MATCH`(7, 말을 알아듣지 못함) · `ERROR_SPEECH_TIMEOUT`(6, 말이 없음)을
`recognition-failed`로 올리므로, **발음이 크게 다르거나 말이 들리지 않은 것**이 「이 기기에서 말하기를 쓸 수 없다」로 보였다.
14일 Android 낱말 말하기의 86%가 건너뜀이었고 `unavailable:failed`가 가장 많았다(ADR-0017 2026-11 기록) — 그 일부가 이 경로다.
iOS의 짝은 `kAFAssistantErrorDomain` 1110(말 없음) · 203(알아들을 말이 없어 다시)이다.

## 결정

- **D1 결말 하나를 더한다 — `missed`**. `SpeechAttemptOutcome`에 `{ kind: "missed", reason: "no-match" | "network", diagnostic? }`.
  「쓸 수 없음(`unavailable`)」과 갈라 둔다 — 기기 · 권한 문제가 아니라 **같은 문항을 곧바로 다시 말하면 풀릴 수 있는** 한 번의 실패다.
  판정은 `recognition-failed`일 때만, 받아쓰기 꺼짐 판정 다음에 한다.

  | 플랫폼 · 도메인 | 코드 | 결말 |
  |---|---|---|
  | Android `android.speech.SpeechRecognizer` | 6 `SPEECH_TIMEOUT` · 7 `NO_MATCH` | `missed:no-match` |
  | Android 〃 | 1 `NETWORK_TIMEOUT` · 2 `NETWORK` · 4 `SERVER` | `missed:network` |
  | iOS `kAFAssistantErrorDomain` | 1110 말 없음 · 203 다시 | `missed:no-match` |
  | iOS `kLSRErrorDomain` | 201 받아쓰기 꺼짐 | `unavailable:dictation-off`(그대로) |
  | 권한 거부 · 인식기 없음(`permission-denied` · `recognizer-unavailable`, Android 8 · 9 · 11 포함) | — | `unavailable:blocked`(그대로) |
  | 마이크 입력 실패(`audio-failed`, Android 3) · 클라이언트 · 언어 없음(5 · 12 · 13) · 너무 많은 요청(10) · 그 밖 | — | `unavailable:failed`(그대로) |

  **같은 코드라도 도메인이 다르면 가르지 않는다**(예 `kLSRErrorDomain` 1110은 `failed`). 네이티브는 바꾸지 않았다 — 두 호스트가 이미 도메인 · 코드를 싣는다.
- **D2 네트워크 실패는 「다시 말하기」 쪽이다(틀림 아님)**. 인식 서버에 닿지 못한 것은 기기 능력도 발음도 아니고, 연결이 돌아오면 같은 문항에서 풀린다.
  그래서 `missed`로 두되 안내만 다르다(연결 확인 뒤 다시). 활동을 잠그지 않는다.
- **D3 화면 — 안내 + Try again(주) + Skip(보조)**. 낱말 말하기 · 따라 읽기는 주 버튼 `Try again`(기존 `SpeechControl` `retry` · 라벨 `speaking.tryAgain`),
  보조 `Skip`(기존 보조 버튼 꼴), 마이크(파형)도 대기 상태라 눌러 다시 듣는다. 롤플레이는 마이크 아래에 판정 뒤 다시 하기와 같은 꼴의
  브랜드 `Try again` 버튼(xl · 가득)을 세우고 「Can't speak now」(건너뛰기)는 그대로 둔다. 그 버튼을 눌러 다시 듣는 동안에는 **같은 자리가 `Stop`으로 남는다** —
  누른 요소가 사라지면 스크린리더 포커스가 마이크가 켜진 채 다른 요소로 옮겨 그 이름을 읽고, 그 낭독이 인식기에 들어간다(접근성 감사 M1).
  안내는 서는 순간 한 번 알린다(듣는 중에는 알리지 않는다). 롤플레이의 불가 안내도 같은 방식으로 한 번 알린다(전에는 알리지 않았다).
  진짜 불가(`blocked` · `failed` · `dictation-off`)의 화면은 바꾸지 않았다 — `Try again`이 없다(받아쓰기 꺼짐의 기존 `Try again`만 그대로).
- **D4 문구** — `speaking.notCaught`(못 알아들음, 롤플레이의 기존 `retryHeard`와 같은 문장 · 같은 번역) · `speaking.networkRetry`(새 문장, 7개 언어).
  롤플레이는 못 알아들음에 기존 `roleplayStory.retryHeard`를 그대로 쓰고 네트워크에만 `speaking.networkRetry`를 쓴다.
  롤플레이의 `unavailable:failed`(마이크 입력 실패 등)는 전에 `retryHeard`(「I didn't catch that…」)를 보였는데, 이제 못 알아들음이 `missed`로 갈라졌으므로
  진짜 불가의 문구 `roleplayStory.unavailable`(「Speaking isn't available right now. You can skip this line.」)로 바꾼다 — 귀로 들어도 두 국면이 갈린다(감사 m1).
- **D5 점수 · 이벤트 — 못 알아들음은 판정이 아니다**. 기존 말하기 채점 규칙(ADR-0067 D6 「판정 뒤 재시도 없음」 · 결과 배열은 판정된 문항만)을 그대로 따른다.
  - `missed`는 결과 배열에 들지 않고 판정 배지 · 판정음 · 정답 상자가 없다. **틀림으로 세지 않는다** — 들은 글자가 없어 정답과 견줄 것이 없고,
    틀림으로 접으면 다시 말할 기회 없이 문항이 끝나 사용자 요청(「다시 풀 수 있게」)과 어긋난다.
  - **다시 말하기는 몇 번이든 세지 않는다**. `episode_item_answered`는 지금처럼 문항당 첫 판정 한 번 — 다시 말해 들리면 그 판정(정답 · 오답)이,
    다시 말하지 않고 넘기면 `skipped`가 한 번 난다. 그 사이의 `missed`는 이벤트를 내지 않는다.
  - 못 알아들은 뒤 Skip의 `skipReason`은 **`missed:no-match` · `missed:network`**(새 값 둘, 이름은 그대로 — ADR-0029 「값을 더함」). 오류 코드는 기존 `speechErrorCode`가 싣는다.
  - 따라 읽기는 채점이 없어 그대로다 — `missed`에서 Skip만 건너뜀 수 +1, 다시 말해 들리면 기존 「연습함」 보고 한 번.
  - 롤플레이는 `missed`에서 「Can't speak now」가 건너뜀 수 +1(판정 없이 넘김, 지금의 불가 건너뜀과 같다).
- **D6 잠금** — `missed`는 활동 안 잠금(`speechAvailabilityAfter`)에 들지 않는다. `blocked`만 잠근다(ADR-0067 D5 그대로).
- **D7 튜토리얼 말하기** — 따로 된 화면(`screens/speaking/`)은 이제 없다. 튜토리얼 · 레슨의 말하기는 모두 위 세 화면(낱말 말하기 · 따라 읽기 · 롤플레이)과
  하나의 결선 훅(`useSpeechAttempt`)을 지나므로 따로 고칠 자리가 없다.

## 버린 대안

- **`unavailable`에 사유 `no-match`를 더하기**: 고칠 곳은 적지만 「쓸 수 없음」 아래에 「다시 말하면 됨」이 섞이고 `skipReason`이 `unavailable:no-match`가 되어
  이 보고의 원인(「인식 불가」로 보임)을 이름에 남긴다.
- **못 알아들음을 오답으로 접기**: 낱말 말하기는 판정 뒤 재시도가 없어 한 번 못 알아들으면 문항이 틀림으로 끝난다. 측정에도 「틀린 발음」과 「말이 들리지 않음」이 섞인다.
- **네이티브에서 새 상태 이름을 올리기**: 두 호스트 · 테스트 · 탐침을 함께 바꿔야 하고 이미 실린 도메인 · 코드로 충분하다.

## 구현

- `lib/speech-attempt.ts` — `SpeechMissReason` · `missed` 결말 · 코드 표 · `speechMissedHintOf` · 마이크 상태(`missed` → 대기).
- `lib/item-answer.ts` — `ItemSkipReason`에 `missed:<reason>` · 진단을 `missed`에서도 싣는다.
- `screens/speak-word/` · `screens/read-aloud/` — 리듀서(시작 · 건너뜀) · 조작 표 · 안내 줄 · 낭독 · `data-reason` · 마이크 탭.
- `screens/roleplay-story/` — 국면 `missed` · `missedReason` · 안내 · `Try again` 버튼(`roleplay-talk-missed` · `roleplay-talk-missed-retry`).
- 문구 `speaking.notCaught` · `speaking.networkRetry` — en · es · id · ja · my · th · vi.

## 테스트

- unit: `speech-attempt.missed.unit.test.ts` SA-M1 ~ M4(코드 표 · 잠금 · 마이크 · 건너뜀 까닭 · 진단), `speak-word.missed.unit.test.ts` SW-M1 ~ M7,
  `read-aloud.missed.unit.test.ts` RA-M1 ~ M5, `roleplay-story.missed.unit.test.ts` RS-M1 ~ M4.
- ui: `SpeakWordActivity.missed.ui.test.tsx` USW-M1 ~ M6, `ReadAloudActivity.missed.ui.test.tsx` URA-M1 ~ M5, `RoleplayTalkScreen.missed.ui.test.tsx` RT-M1 ~ M5
  (진짜 불가에 `Try again` 없음 포함).
- integration: `App.speak-word-missed.integration.test.tsx` ISM1 · ISM2(다시 말해 맞히면 이벤트 하나 · Skip은 `missed:no-match` + 코드 7 한 번).
- 기기: [e2e](../e2e/episode-format-speaking.md) 「못 알아들음 — 다시 말하기」.

## 한계

- 롤플레이 마이크 view에 `flatten={false}`가 없고 「Can't speak now」가 접근성 요소가 아니어서 Android TalkBack에서 빠질 수 있다(감사 m3, 이 변경 전부터) — TalkBack 실기 확인과 함께 따로 고친다.

- iOS의 「못 알아들음」 코드(1110 · 203)는 문서 · 접점 테스트의 관찰값이고, 이 회차의 시뮬레이터는 인식기를 만들지 못해(`kLSRErrorDomain` 계열 → `failed`)
  iOS 실기에서 못 알아들음 경로를 보지 못했다. iOS의 네트워크 오류 코드는 가르지 않았다(그대로 `failed`).
- 인식기가 빈 글자로 `recognized`를 올리면 지금처럼 들음(낱말 말하기는 오답)이다. 실기에서 그 경로가 잦으면 `missed`로 옮길지 다시 본다.
- Android에서 한국어 팩을 확인하는 짧은 틈에 사용자가 `Stop`을 누르면 호스트가 `recognition-failed` + `ERROR_CLIENT`(5, 메시지 「Stopped before listening」)를
  올려 지금처럼 「인식 불가 · Skip」이 선다. 같은 코드 5가 다른 클라이언트 오류에도 쓰여 앱에서 가르지 않았다 — 배포 뒤 `speechErrorCode=5`의 비율을 보고,
  잦으면 호스트가 이 경로를 따로 싣게 한다(리뷰 지적).
- 두 호스트는 `recognition-failed`에도 그때까지 읽은 글자를 싣지만, 앱은 지금처럼 `missed` · `unavailable`에서 그 글자를 쓰지 않는다.
- iOS 네트워크 오류 코드는 비어 있다 — 배포 뒤 iOS `unavailable:failed`의 `speechErrorCode` 분포로 채운다.
- 배포 뒤 `skipReason` 분포(`unavailable:failed` 대 `missed:*`)로 이 갈래가 맞는지 본다.
