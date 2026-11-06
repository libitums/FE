# ADR-0109 — 학습 판정 진동(햅틱) — 효과음의 그림자

- 상태: **채택 — 클라이언트 · 호스트.** 화면 코드 변경 0. 서버 · 저장 · 상태 변경 0. ⟨2판 2026-11-06⟩ Android는 `VIBRATE` 권한으로 시스템 터치 진동 설정과 상관없이 진동한다 — 아래 「D3 2판」. ⚠ **실기 체감 미확인** — 아래 「기기 확인 상태」.
- 날짜: 2026-11-06.
- **사용자 결정**(2026-11-06): 「휴대폰 진동 정책은 어떻게할까」 → 추천안(진동은 효과음의 그림자 · 판정 넷만 · 시스템 기본 패턴 · 토글 없음 · 벨은 2단계) → 「/change 로 진행」.
- **사용자 결정 2판**(2026-11-06, 1.2.0 bundled 실기 Galaxy A52s): 「진동안되고」 → 원인은 기기의 「터치 상호작용」 진동 끔(`haptic_feedback_enabled=0`) → 「설정 상관없이 진동」. D3의 Android 열만 바꾼다. 이어서 「틀린거랑 맞은거랑 진동 구분안되고」 · 「정답 진동도 약하고 별로 정답같은 느낌도 안든다」 → 파형을 리듬(정답 톡톡 · 오답 부웅)으로 다시 정했다. 「앱 내 설정에선 진동 끌 수 있게 해줘야지」 → **D4**(앱 안 진동 토글).
- 다루는 축: 효과음이 나는 그 순간에 **어느 효과음에 어떤 시스템 진동을 붙이는가** — 정책이 어디에 있는가(D1), JS ↔ 호스트 결선(D2), 두 호스트가 쓰는 플랫폼 API와 설정 · 권한(D3).
  **다루지 않는 것**: 통화 벨 반복 진동(`ring_bell`), 앱 안 진동 토글(⟨2판⟩ D4가 연다), 사용자 정의 파형 · 길이 · 세기, 타일 끌기 · 칩 놓기 등 다른 상호작용의 진동, 효과음 자체(자산 · 음량 · 재생 규칙)의 변경, 진동 분석 이벤트.

## 맥락

- 저장소에 진동이 0이었다. 효과음 8종(`SoundEffectId`)이 `apps/mobile/src/lib/sound-effects.ts`의 `playSound(id)` → 호스트 `SoundEffectsModule.play(id)`로 나간다(iOS `SoundEffectsModule.swift` · Android `SoundEffectsModule.java` + `SoundEffectsController`). 계약은 [iOS 효과음 계약](../specs/ios-sound-effects.md)이 진다.
- `playSound`를 부르는 화면 코드는 34곳이지만 **판정 넷은 세 곳에서만 난다** — `AnswerVerdict`(`correct_answer` · `wrong_answer`), `LessonCompleteScreen`(`pass_lesson` · `failed_lesson`), `LearningActivityComplete`(`lesson_complete`). 나머지 31곳은 전부 `button`이다.
- 사용자층은 필리핀 · 인도 · 말레이시아의 저가 · 중가 Android가 많다 — 진동 모터가 거친 기기가 기준이다. iOS 17.4+ · Android minSdk 26.
- 설정 화면에 소리 · 진동 토글이 없고, Android 매니페스트에 `VIBRATE`가 없다.
- `ring_bell` · `accept_call`은 **죽은 id**다 — 튜토리얼 교체([ADR-0081](0081-tutorial-as-catalog-episode.md) · PR #296, 2026-10-22) 뒤 앱에 호출 자리가 0이고 호스트 자산 · unit 테스트만 남았다. 이 ADR은 정리하지 않는다.

## 결정

### D1. 정책은 JS 순수 함수 하나 — `hapticFor(id)`, 호스트는 두 종류만 받는다

| `SoundEffectId` | `hapticFor` | iOS | Android API 30+ | Android 26 ~ 29 |
|---|---|---|---|---|
| `correct_answer` · `pass_lesson` | `"success"` | `.success` | `CONFIRM` | `CONTEXT_CLICK` |
| `wrong_answer` · `failed_lesson` | `"error"` | `.error` | `REJECT` | `LONG_PRESS` |
| `button` · `lesson_complete` · `ring_bell` · `accept_call` | `null` | — | — | — |

- **진동이 붙는 사건은 넷이고 전부 「판정」이다** — 맞다 / 틀리다 / 통과 / 미통과. 진행 · 조작(`button`)에는 붙지 않는다. 새 효과음이 생기면 질문 하나로 가른다: *이 소리가 학습자의 답을 평가하는가?*
- 표는 `lib/sound-effects.ts` 안의 `Record<SoundEffectId, HapticKind | null>`이고 `hapticFor`는 그 조회다. **정책이 `SoundEffectId` 옆에 있어야 둘이 같이 바뀌고**, `Record`라 id가 늘면 표 누락이 컴파일 오류다. 순수 함수라 vitest가 표 전체를 잰다.
- 호스트가 받는 어휘는 `"success"` · `"error"` 둘(`HapticKind`)이다. 셋째 종류(`warning` · 퍼펙트 전용 패턴)는 두지 않는다 — 쓸 사건이 없고, 종류가 늘면 학습자가 외울 어휘가 늘며 저가 기기는 셋을 구별하지 못한다. 퍼펙트와 일반 통과의 진동은 같다(소리도 같다 — `perfect_lesson` 제거 선례).
- **`lesson_complete`(활동의 모든 문항 완료 안내)는 진동 없음** — 바로 뒤 결과 화면의 `pass_lesson` · `failed_lesson`이 판정 진동을 내므로 연속 두 번을 피한다. 그 카드는 「끝났다」지 「잘했다 · 못했다」가 아니라 success / error 어느 뜻도 맞지 않는다.
- `ring_bell` · `accept_call`은 표 완결성 때문에 두고 `null`이다. 벨 진동은 아래 재검토 조건 (a).

### D2. `playSound(id)` 결선 — 효과음 먼저, 진동은 독립 try

`playSound(id)` · `stopRing()`의 시그니처는 바뀌지 않는다. 화면 코드는 한 글자도 바뀌지 않는다.

1. 모듈을 한 번 조회한다(`NativeModules` 없음 · null · 모듈 null → 무동작).
2. **`play(id)`가 먼저** — 기존 호출 그대로, 자기 `try`.
3. 그다음 `hapticFor(id)`가 `null`이 아니고 `typeof module.haptic === "function"`일 때만 `haptic(kind)`를 **정확히 1회**, 자기 `try`.
4. 두 `try`는 독립이다 — `play`가 던져도 `haptic`은 가고, `haptic`이 던져도 `playSound`는 던지지 않는다.
5. `haptic`이 없는 모듈(옛 호스트)에서는 소리만 난다. 기존 테스트의 모의 `{ play, stopRing }`이 곧 옛 호스트라, 그 테스트들이 전부 그대로 green인 것이 회귀 그물이다.
6. `stopRing()`은 바꾸지 않는다.

진동은 효과음과 **같은 JS tick · 같은 모듈**에서 나간다 — `setTimeout` · 소리 onset 대기 · 보상 모션 프레임 맞춤은 하지 않는다. 한 판정 = 한 번은 효과음의 기존 중복 방지(`useEffect([result])` · `useEffect([verdict])`)가 그대로 진다. 진동 전용 가드 · ref · phase를 두지 않는다.

### D3. 호스트 `SoundEffectsModule.haptic(kind)` — 플랫폼 기본 상수만, 시스템 설정 추종

> ⟨2판 2026-11-06⟩ **Android 열은 아래 「D3 2판」이 대체한다.** iOS 열 · 메서드 · 인자 · 무시 규칙은 그대로다.

**새 모듈이 아니다.** 기존 `SoundEffectsModule`에 셋째 메서드 `haptic`을 더한다(아래 「네이티브 모듈 입장 조건」).

| 항목 | 값 |
|---|---|
| 메서드 | `haptic(kind)` — 반환 · 콜백 없음 |
| 인자 | 문자열 `"success"` \| `"error"` |
| 모르는 문자열 · 빈 문자열 · null · 비문자열 | **무시**, 던지지 않음, 로그 없음 |
| 권한 | 없음. Android `AndroidManifest.xml`에 `VIBRATE`를 **더하지 않는다** |
| 시스템 설정 | 플랫폼 API가 iOS 「설정 › 사운드 및 햅틱 › 시스템 햅틱」 · Android 「설정 › 소리 및 진동 › 터치 피드백」을 따른다 — 앱이 따로 읽지 않는다 |
| 햅틱이 없는 기기(iPad · 시뮬레이터 · 에뮬레이터) | 무동작 · 크래시 없음 |
| 패턴 | 플랫폼 기본 상수만. `CoreHaptics` · `Vibrator` · 사용자 정의 파형 금지 |

- **iOS** (`apps/ios/Host/SoundEffectsModule.swift`): `HapticFeedbackKind`(enum, `of(_:)` · `feedbackType`)가 문자열을 `UINotificationFeedbackGenerator.FeedbackType`으로 분류하고, nil이면 즉시 return. 아니면 메인 큐에서 `UINotificationFeedbackGenerator().notificationOccurred(type)`. `prepare()`는 부르지 않는다 — 판정 시점을 예측할 수 없어 엔진을 깨워 두는 이득이 없다. `methodLookup`에 `haptic` 키가 하나 는다. `SoundEffectsPlayer` · `play` · `stopRing` · 백그라운드 처리 변경 0.
- **Android** (`apps/android/app/src/main/java/com/libitum/host/`): 순수 함수 `HapticFeedbackConstant.of(kind, sdkInt)`가 문자열 + SDK를 `HapticFeedbackConstants` 정수로 분류한다(위 D1 표의 두 열, 그 밖 `NONE = -1`). `SoundEffectsController`가 생성자로 `View`를 하나 더 받고(`(Context, View)` — 기존 `(Context)`는 `this(context, null)`로 위임해 계측 테스트 · 리플렉션 호환) `haptic(kind)`는 메인 스레드에서 `hapticView.performHapticFeedback(constant)` **1인자 오버로드**만 부른다 — `FLAG_IGNORE_GLOBAL_SETTING` · `FLAG_IGNORE_VIEW_SETTING`을 쓰지 않아 시스템 설정이 그대로 걸린다. 반환값은 버린다. `MainActivity`가 `getWindow().getDecorView()`를 넘긴다(`CompletionAnnouncementModule`이 이미 쓰는 뷰). `SoundEffectsSession` · 오디오 포커스 · `SoundPool` · 벨 · `release()` 변경 0.
- 두 호스트의 분류는 플랫폼 API와 떨어진 순수 함수라 HostTests · JUnit이 표 전체를 잰다([ADR-0096](0096-network-type-in-analytics.md) D1의 `NetworkStatusLabel`과 같은 형태).

### D3 2판. Android는 `Vibrator`로 — 시스템 터치 진동 설정과 상관없이 ⟨2026-11-06⟩

| 항목 | 1판 | 2판 |
|---|---|---|
| API | decorView `performHapticFeedback(constant)` 1인자 | `Vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1), AudioAttributes)` — 메인 스레드, 던지면 `Log.w`만 |
| 패턴 | `CONFIRM` · `REJECT`(API 30+), `CONTEXT_CLICK` · `LONG_PRESS`(26 ~ 29) | 순수 클래스 `HapticPattern.of(kind)`의 한 번 파형 — `success` **톡톡** 55 ms × 2(쉼 70 ms), `error` **부웅** 280 ms 1회, 세기는 모두 255. **뜻은 리듬이 진다** — 세기 조절이 없는 모터(Galaxy A52s, `mCapabilities` 0)에서 첫 판(25 ms · 30 ms × 2)은 「구분 안 됨」, 둘째 판(40 ms 1회 · 70 ms × 2)은 「정답 진동이 약하고 정답 같은 느낌이 안 든다」(사용자, 2026-11-06). 짧은 두 번 = 됐다, 긴 한 번 = 아니다로 iOS `.success` · `.error`와 같은 나눔이고, 펄스는 모두 50 ms 이상(느린 모터가 다 돈다). 모든 API 같은 파형 |
| 속성 | — | 효과음과 같은 `AudioAttributes`(`USAGE_MEDIA` · `CONTENT_TYPE_SONIFICATION`). 터치 용도(`USAGE_TOUCH`)로 내면 Android 13+가 터치 진동 세기(끔 = 0)로 줄여 다시 꺼진다 |
| 권한 | 없음 | `android.permission.VIBRATE`(설치 시 자동 허용 · 사용자 승인 창 없음) |
| 시스템 설정 | 「터치 피드백」을 따름 | 따르지 않는다 — 꺼져 있어도 진동 |
| 진동 모터 없음 | 무동작 | `hasVibrator()`가 거짓이면 무동작 |
| `release()` | decorView 참조를 지움 | 진동 `cancel()` · 참조를 지움 |

- `FLAG_IGNORE_GLOBAL_SETTING`(`performHapticFeedback`의 설정 무시 플래그)은 API 33부터 일반 앱에서 무시된다 — 사용자 기기(One UI · API 34)가 그 대상이라 쓸 수 없다.
- `HapticFeedbackConstant` · 그 JUnit은 지우고 `HapticPattern` · `HapticPatternTest`로 바꾼다. `MainActivity`는 `SoundEffectsController(this)` — decorView를 넘기지 않는다.
- **iOS는 1판 그대로다.** `UINotificationFeedbackGenerator`는 「시스템 햅틱」 설정을 따르고, 그것을 우회하는 공개 API는 진동 알림음(`kSystemSoundID_Vibrate`, 약 0.4 s 긴 진동)뿐이라 판정 신호로 쓰지 않는다.

### D4. 앱 설정의 진동 끄기 ⟨2판 2026-11-06⟩

- 세션 옵션 `vibration`(기본 **켬**)을 더하고 설정 `Learning` 묶음의 둘째 토글 `Vibration`으로 세운다 — 보기 로마자 토글([ADR-0108](0108-choice-romanization.md) D3)과 같은 모양 · 같은 결선(`onToggleSessionOption` · `session_option_changed`).
- 기기에 남긴다: `libitum.session-option.vibration` = `"on"` | `"off"`, 정확히 `"off"`일 때만 끔. 기기 범위라 로그아웃 · 계정 삭제에서 지우지 않는다.
- **`playSound`가 진동이 붙는 id에서만 저장값을 직접 읽는다**(`storedVibrationEnabled()`) — 34곳의 호출자에 옵션을 넘기는 결선을 두지 않는다. 끔이면 `haptic`만 건너뛰고 효과음은 그대로다. 진동이 없는 id(`button` 등)는 저장소를 읽지 않는다.
- 두 플랫폼 공통이다 — iOS는 시스템 설정과 앱 설정이 둘 다 켜져야, Android는 앱 설정만 켜져 있으면 진동한다.

## 네이티브 모듈 입장 조건 (ADR-0017 D1)

- [ADR-0017](0017-host-native-capabilities-and-audio.md) D1의 입장 조건 셋은 **새 모듈을 열 때** 걸린다. 이번 변경은 새 모듈이 아니라 기존 `SoundEffectsModule`에 셋째 메서드를 더하므로 **D1은 발동하지 않는다.** ADR-0017 재검토 조건의 둘째 트리거(한 모듈의 메서드가 다섯을 넘는 시점)에도 닿지 않는다 — `play` · `stopRing` · `haptic` 셋이다.
- 그래도 조건 (3) 「사람이 판정할 수 있다」는 채운다 — [`docs/e2e/haptic-feedback.md`](../e2e/haptic-feedback.md)가 손 · 귀 · 시스템 설정 끔 · 옛 빌드 덮어 설치 · 햅틱 없는 기기를 항목으로 잰다.
- ADR-0017의 어느 목록(D1 「여전히 하지 않는 것」 · D3 재생 모듈의 「여기 없는 것은 하지 않는 것」)에도 진동 · 햅틱은 없었다 — 금지된 것이 열린 게 아니라 **적힌 적 없는 축을 이 ADR이 처음 정한다.** 적용 기록은 ADR-0017 끝에, 호스트 모듈 표의 `SoundEffectsModule` 행은 [색인](README.md#호스트-모듈-표)에서 갱신했다.

## 기존 사용자 안전

| 경우 | 동작 |
|---|---|
| 새 JS + 옛 호스트(`haptic` 없음) | `typeof` 검사에서 걸러 소리 그대로 · 진동 없음 · 던지지 않음 |
| 옛 JS + 새 호스트 | `haptic`을 부르는 코드가 없어 변화 없음 |
| 모듈이 던짐 · 모르는 값 | 소리는 이미 나갔고 `playSound`는 던지지 않음. 호스트는 모르는 값을 무시 |
| 햅틱이 없는 기기(iPad · 시뮬레이터 · 에뮬레이터) | 플랫폼 API가 무동작 — 크래시 없음(HostTests가 시뮬레이터에서 `haptic("success")` · `haptic("bogus")` · `haptic(nil)`이 던지지 않는 것을 지킨다) |
| 시스템 햅틱(터치 피드백) 끔 | iOS: 진동 없음 · 소리 그대로. Android(2판): **진동 그대로** · 소리 그대로 |
| 권한 · 신고 · 저장 | ⟨2판⟩ Android `VIBRATE` 하나가 는다(일반 권한 — 승인 창 없음, Play 데이터 보안 양식 대상 아님). iOS 새 권한 없음. `PrivacyInfo.xcprivacy` · Play 데이터 보안 양식 · 저장 키 · 서버 변경 없음 — `UINotificationFeedbackGenerator` · `performHapticFeedback`는 required-reason API · 권한 · 데이터 수집이 아니다 |
| 옛 빌드 위 덮어 설치 | HF-E6 — 데이터 유지 · `FATAL EXCEPTION` 0(아래 「기기 확인 상태」) |

## 버린 대안

| 대안 | 버린 까닭 |
|---|---|
| 호스트가 `play(id)` 안에서 진동까지 낸다(추천안의 원래 모양) | 정책이 두 플랫폼 코드에 흩어지고 vitest가 못 잰다. JS 순수 함수 하나에 두면 한 파일에 보이고 unit 계층이 표 전체를 지킨다 — 화면 코드 변경 0은 그대로다 |
| Android `Vibrator` · `VibrationEffect` + `VIBRATE` 권한 | ⟨2판에서 채택 — 사용자 결정⟩ 1판에서 버린 까닭: 권한이 하나 늘고 벨 소리 모드(무음 · 진동) 처리가 따라온다. 저가 모터는 파형을 재현하지 못한다. 시스템 상수는 OEM이 그 기기 모터에 맞춘 값이라 기기마다 최선의 것을 공짜로 받는다. 벨 반복 진동과 함께 2단계 |
| `button` 탭 진동(31자리) | 학습 한 번에 탭이 수십 번이다. 저가 모터의 피로 · 배터리 · 「알림이 왔다」와의 혼동 |
| 앱 안 진동 토글 | 시스템 설정이 끄는 길을 이미 제공한다. 제보가 쌓이면 효과음 토글과 묶어 하나로(재검토 조건 (b)) |
| 진동 분석 이벤트 | 진동은 효과음과 1:1이라 기존 판정 이벤트 수가 곧 진동 수다. 이벤트를 정하면 카탈로그만 늘고 알려주는 것이 없다 |
| reduced motion에 연동해 끄기 | 진동은 모션이 아니고 OS가 햅틱만 끄는 별도 설정을 둔다. 묶으면 「움직임을 줄였더니 판정 진동까지 사라졌다」는 뜻밖의 결합이 된다(아래 「접근성」) |
| 보상 모션 프레임에 맞춘 지연 · 멀티 펄스 | 타이머 · 상태 기계가 생기고, reduced에서 모션이 없어지면 기준점도 없어진다. 저가 기기에서 연타는 한 덩어리로 뭉개진다 |

## 대가

1. 판정 1건당 동기 네이티브 호출이 하나 는다(효과음 호출 옆). 번들 증가는 수십 바이트 — [성능 보고서](../performance/reports/haptic-feedback-01.md)(미측정 — 번들만).
2. 측정 이벤트가 없으므로 **저가 기기에서의 체감(`CONFIRM` · `REJECT`의 세기 · `LONG_PRESS`의 길이)은 스토어 리뷰 · 제보로만 안다.**
3. 시스템 햅틱 설정은 OS 전체를 끈다 — 「이 앱만」 끄는 길은 없다(재검토 조건 (b)).
4. ⟨2판⟩ **Android는 시스템 터치 진동 설정을 듣지 않는다** — 끄는 길은 앱 설정 `Vibration`(D4) 하나다. 두 플랫폼의 동작이 갈린다(iOS는 시스템 설정도 따름).

## 알려진 한계

- ⟨2판 2026-11-06 — 고침⟩ **틀린 문제 다시 풀기에서는 판정음 · 진동이 둘 다 없었다**(실기 제보 「틀린거 다시푸는 항목에서는 진동이 안나」). 판정음은 배지(`AnswerVerdict`)가 설 때 나는데, 다시 풀기([ADR-0058](0058-catalog-learning-session.md) ⟨2026-10-30⟩)는 셸이 배지 대신 「Fixed it! · Not quite」 판을 세운다. 셸에 `verdict`로 판정을 넘기는 다섯 학습형(단어 고르기 · 듣기 · 말하기 · 음절 만들기 · 문장 만들기)이 해당했다. 이제 `LearningShell`이 판으로 배지를 대신하는 순간 그 판정음을 한 번 낸다(진동은 D2대로 따라 난다). 카드 안에 자기 배지를 그리는 학습형(`result` — 짝 맞추기 · 타이핑)은 원래 소리가 났으므로 건드리지 않는다. ui 테스트 RS14.

- **Android 26 ~ 29**: `CONTEXT_CLICK` · `LONG_PRESS`는 성공 · 오류를 **뜻으로 구별하지 않는다** — 세기 차이만 있다(⟨2026-11-06 리뷰⟩ 성공은 `KEYBOARD_TAP`에서 `CONTEXT_CLICK`으로 바꿨다 — `KEYBOARD_TAP`은 저가 모터에서 거의 느껴지지 않아 「정답은 무음 · 오답만 세게」가 되기 때문).
- **Android에서 진동은 효과음의 로드 · 재생 상태를 보지 않는다** — `haptic`은 `SoundEffectsSession`을 거치지 않으므로, 첫 판정이 효과음 로드 전에 오거나(`WAIT_FOR_LOAD`) 자산 로드가 실패하면(`UNAVAILABLE`) 진동이 소리보다 먼저 나거나 진동만 난다. 효과음은 모듈 생성 때 미리 로드돼 첫 판정까지 보통 수 초가 있어 드물고, 소리 없이 진동만 나도 판정 정보는 다른 채널이 전한다. 받아들인다(⟨2026-11-06 리뷰⟩).
- **iOS는 생성기 하나를 들고 `prepare()`로 예열한다** — 모듈 생성 때와 매 진동 뒤. 매번 새로 만들면 Taptic Engine이 식은 채 시작해 진동이 소리보다 늦는다(⟨2026-11-06 리뷰⟩).
- **Android `SoundEffectsController`는 `release()`에서 decorView 참조를 지운다** — 모듈 param이 Activity를 붙들지 않게(⟨2026-11-06 리뷰⟩). 받아들인다. 진동은 보조 채널이고 판정 정보는 모양 · 색 · 문구 · 낭독 · 소리가 진다. 이 구간의 기기 확인은 「진동이 났다」만 판정하고(HF-E9 · E10), 둘의 구별은 API 30+ · iOS에서만 기대한다. 저가 기기가 이 구간에 많으므로 「진동이 있다」가 전달의 핵심이고 구별은 보너스다. `LONG_PRESS`는 저가 모터에서 「윙」 하는 긴 진동으로 느껴질 수 있다 — 오답마다 1회라 피로보다 체감 품질 문제다.
- **iOS VoiceOver 자체 햅틱과 겹칠 수 있다.** Lynx가 레이아웃마다 보내는 접근성 통지와 같은 tick에 판정 햅틱이 메인 큐로 가므로 수십 ms 안에 겹칠 수 있다. 정보 손실은 없다(라벨 · 낭독 · 소리가 판정을 전한다). HF-E11이 「구별됨 / 뭉개짐」을 적고, 뭉개지면 여기에 한 줄 더하는 것으로 끝낸다 — 코드는 바꾸지 않는다.

## 접근성

- **WCAG 1.3.3(감각 특성) — 진동은 다섯째 채널이다.** 모양(✓ / ✗) · 색 · 문구 · 낭독 라벨 · 소리가 먼저 있고 진동은 그 위에 선다. 여덟 사건 전부 진동 없이 잃는 정보가 0이다. 정책이 효과음 id의 순수 함수이고 어휘가 둘뿐이라 「진동만의 정보」가 구조적으로 생길 수 없다.
- **reduced motion과 분리한다.** `reducedMotion`([ADR-0053](0053-motion-policy.md) D2)이 `reduced`여도 진동은 그대로 난다 — `sound-effects.ts`는 `MotionProvider`를 읽지 않는다. 진동은 모션이 아니다(WCAG 2.3.3은 시각 애니메이션 조항). 두 OS가 햅틱만 끄는 별도 설정을 두므로 끄는 길은 이미 있고, 앱이 reduced에 묶어 끄면 그 사용자가 진동을 되찾을 길은 reduced를 포기하는 것뿐이 된다. ADR-0053은 햅틱을 언급하지 않는다 — 「reduced는 시각 모션만, 햅틱은 별도 OS 설정」이라는 경계는 이 ADR이 정한다.
- **VoiceOver · TalkBack 상태로 진동을 억제하지 않는다.** `isVoiceOverRunning` · `AccessibilityManager` 참조 0. 저시력 · 난청 사용자처럼 스크린리더와 햅틱을 **함께** 쓰는 사용자의 채널을 빼앗고 「VoiceOver를 켰더니 진동이 사라졌다」는 뜻밖의 결합이 되기 때문이다. 겹침은 위 「알려진 한계」.
- **사용자 제어**: ⟨2판⟩ 앱 설정 `Vibration`(D4)이 두 플랫폼에서 진동을 끈다. iOS는 시스템 설정도 따르고, **Android는 시스템 설정을 따르지 않는다**(사용자 결정, 「대가」 4).
- **밀도**: 문항당 1회(`Check` 뒤 한 번), 자동 넘김 화면은 다음 문항까지 2.5 s 이상. 전정 · 감각 과민 관점에서 우려할 밀도가 아니다.
- **`AnswerVerdict` light 면의 흰 잉크 대비 미달은 변경 없음 · 기존 기록**(`answer-verdict-face.ts`)이다. 이 작업은 그 파일을 건드리지 않고, 진동은 1.4.3(대비)의 완화책이 아니다 — 1.4.3은 글자 가독성, 1.3.3은 채널 다중성이다.

## 측정

**없음.** 진동은 효과음과 1:1이라 기존 판정 이벤트(`episode_item_answered` 등) 수가 곧 진동 수다. 진동 전용 이벤트는 카탈로그만 늘리고 알려주는 것이 없다. 출시 뒤 신호는 스토어 리뷰 · 제보(「진동이 거슬린다」 · 「안 울린다」)로 받고, 그때 앱 안 토글을 다시 본다(재검토 조건 (b)).

## 테스트 계획

[ADR-0006](0006-command-interface-and-test-layers.md)의 계층 판정: unit required · ui **not-applicable**(바뀌는 `.tsx` 0 — 진동은 DOM · 접근성 트리에 흔적이 없다) · integration required · e2e required(수동).

- unit(`lib/sound-effects.unit.test.ts`, HF-U1 ~ U10): `hapticFor` 표 8행, 새 호스트 모의에서 판정 넷 → `play` 1회 + `haptic` 1회 · 나머지 넷 → `haptic` 0회, 호출 순서 `["play:…", "haptic:…"]`, 옛 호스트 모의 · `haptic`이 함수 아님 · `haptic` 던짐 · `play` 던짐 · 모듈 없음에서 던지지 않음, `stopRing`은 `haptic`을 부르지 않음. **결과 33/33**(기존 3 + 새 10의 테스트 케이스). red 증명: 결선 전 10건 단언 실패.
- integration(`sentence-order-sound.integration.test.tsx`, HF-I1 + 기존 HF-I2): 문장 만들기 칩 → `Check` → `Next` → 활동 완료 흐름에서 `haptic:success`가 판정 직후에 정확히 1개. **결과 2/2.**
- 회귀(모바일 전체): unit 318파일 4672/4672 · ui 241파일 2104/2104(옛 호스트 모의의 기존 UI 테스트가 전부 green = 옛 호스트 경로의 회귀 그물) · integration 80파일 728/728.
- 호스트 ⟨2판⟩: Android JUnit `HapticPatternTest` **5/5**(파형 표 · 모르는 값 null · 한 번 파형의 길이 · 세기 범위 · 총 300 ms 이하 · 정답 2회 / 오답 1회 · 펄스 ≥ 50 ms · 오답 길이 > 정답 두 펄스 합), red 증명은 클래스가 없어 컴파일 실패. 전체 JUnit 실패 0.
- 호스트(1판 기록): Android JUnit `HapticFeedbackConstantTest` **5/5**(경계 29/30 · 모르는 값 `NONE` · 상수 구별) · `assembleDebug` · `assembleBundled` 성공 · 매니페스트 diff 0. iOS HostTests `SoundEffectsModuleTests` **7/7**(기존 3 + HF-H1 ~ H4: `HapticFeedbackKind` 분류 · `methodLookup` 키 셋 · 시뮬레이터에서 `haptic`이 던지지 않음). 계측 HF-H9는 미실행 — `(Context)` 생성자 유지 · 컴파일 확인만.
- 빌드 · 번들: `pnpm --filter mobile build`(CI 설정) 성공, `size:check` 통과 — [성능 보고서](../performance/reports/haptic-feedback-01.md).
- e2e(수동): [`docs/e2e/haptic-feedback.md`](../e2e/haptic-feedback.md) HF-E1 ~ E12.

## 기기 확인 상태 (2026-11-06)

⚠ **실기 체감은 미확인이다.** 아래 둘은 에이전트 실행이고 사람이 확인하지 않았다.

- **HF-E6 부분 통과** — Pixel_8 AVD(읽기 전용) · `bundled` APK. `haptic` 메서드가 없는 옛 빌드 위 `install -r` → `versionName` 1.2.0 · `firstInstallTime` 그대로 · logcat `FATAL EXCEPTION` 0 · 앱 프로세스 생존 · 온보딩 첫 면 정상. 「정답 1회」는 로그인 뒤 레슨이 필요해 못 했다.
- **HF-E7 부분 통과** — iPhone 17 Pro 시뮬레이터 · Debug 호스트 + 이 변경의 번들. `SoundEffectsModule registered` · 크래시 0 · 로그인 화면까지 정상. 판정 화면은 소셜 OAuth 뒤라 미도달.
- **미실행**: HF-E1 ~ E5 · E8 · E10 ~ E12(실기 필요), HF-E9(API 28 AVD 없음). 저가 Android의 `CONFIRM` · `REJECT` 세기는 HF-E1 ~ E3가 처음 판정한다 — 거슬리면 재검토 조건 (b)로 간다. 계약은 바꾸지 않는다.

## 재검토 조건

- (a) **`ring_bell`의 앱 호출 자리가 다시 생길 때** — 통화 벨 반복 진동(`Vibrator` · `VIBRATE` · 벨 소리 모드 처리)을 2단계로 연다. 지금은 죽은 id라 「벨 진동」을 조건으로 걸면 공회전한다 — 호출 자리의 부활이 전제다.
- (b) ~~「진동이 거슬린다」 제보가 누적되면 앱 안 토글을 연다~~ — ⟨2판⟩ D4로 열었다. 효과음 토글과 묶을지는 효과음 끄기 요청이 올 때 본다.
- (c) **플랫폼 상수가 기기별로 다르게 느껴진다는 제보** — 특정 OEM에서 `CONFIRM` · `REJECT`가 없거나 과하다는 보고가 오면 그때 상수 선택을 다시 본다. 사용자 정의 파형으로 가는 것이 아니라 상수 사이에서 고른다.
