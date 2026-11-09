# ADR-0112 — 한국어 자판: 화면 폭을 쓰는 키 · 틈 없는 터치 · 닿는 순간 입력

- 상태: 채택 ⟨2026-11-09⟩
- 요청: 「한국어 가상 키보드 화면이 너무 자판이 작다는 문제도 있었고 잘 눌리지 않는다는 문제」 → 시안 비교 → 「/change로 진행하는데 모든 기기에 정상적으로 작동할 수 있도록 안정성 최대한 고려」(사용자 발화, 2026-11-09)
- 시안: https://claude.ai/artifact/EVFx4yfJuSLjcYP3MK17bT
- 이어받는 결정(결정 문장은 바꾸지 않는다 — 각 ADR에 적용 기록): [ADR-0070](0070-keyboard-dock.md)(자판 도크 · 인셋) · [ADR-0109](0109-haptic-feedback.md)(진동 모듈 · 설정 끄기)

## 맥락

`MessengerKeyboard`(받아쓰기 · 번역 · 패턴 타자 활동이 쓰는 두벌식 자판)는 키 30 × 40px, 키 줄 폭 366px 상한, 키 사이 가로 4 · 줄 사이 8px 틈이었다. 393 ~ 412dp Android 화면에서도 키가 커지지 않았고, 틈을 누르면 아무 일도 없었으며, 입력은 손을 뗄 때(`bindtap`)라 손가락이 미끄러지면 취소될 수 있었다. 눌림 표시 · 미리보기 · 진동이 없어 「안 눌렸다」고 느끼기 쉬웠다. 지우기 아이콘(×)은 「닫기」로 읽혔다.

데이터 신호: 키보드로 답하는 받아쓰기(DICTATION) 정답률 41%(35/85, 11-01 ~ 11-09) — 고르는 듣기 문항 81%. 문항이 원래 어려운 몫이 섞여 있어 키보드 몫을 따로 재지는 못했다.

## 결정

### D1. 칸 배치는 순수 표 하나 — 한 줄 10칸 격자, 칸끼리 맞닿는다

`screens/messenger/keyboard-layout.ts`의 `keyboardLayout`이 줄 넷을 낸다. 줄1 자모 10칸, 줄2 9칸(양 끝 ㅁ · ㅣ 칸이 1.5 — 반 칸은 터치 영역, 보이는 키는 안쪽으로 붙어 다른 키와 같은 폭), 줄3 윗글쇠 1.5 + 자모 7 + 지우기 1.5, 줄4 `.` 1.5 · 띄어쓰기 7 · `?` 1.5. 줄마다 합 10. **쉼표 키는 없앴다**(답에 거의 쓰이지 않는다 — 자리를 띄어쓰기에 줬다). 자모 값은 `hangulKeyRows`를 그대로 읽는다 — 조합 규칙 · 배열은 바뀌지 않는다.

CSS(`messenger-keyboard.css`): 칸 = `flex: <비율> 1 0` · 안쪽 3px · 틈 0, 보이는 키 48px. 판 위아래 8px → 판 높이 8 + 54 × 4 + 8 = **232 = 예전과 같다**(안전 영역은 키 줄 묶음의 바깥 여백으로 따로 더해진다 — ADR-0070 그대로). 키 줄 폭 100% · 상한 **480px**(세로 폰은 가장 넓은 기종까지 폭을 채우고, 가로 · 폴더블 · 태블릿에서는 칸이 48에서 멈춰 가운데로). 판 좌우 3px. 토큰 0.5.0만 쓰고, 토큰에 없는 둘(3 · 480)은 CSS 한 곳의 주석에 둔다.

### D2. 한 누름 = 한 입력 — touchstart가 입력하고, tap은 대체 경로

칸 하나가 `bindtouchstart` · `bindtouchend` · `bindtouchcancel` · `bindtap`을 모두 받는다. 판정은 순수 `lib/key-press-gate.ts`:

- touchstart → **항상 입력**하고 그 키에 「열린 누름」 기록을 쌓는다.
- touchend · touchcancel → 그 키의 가장 오래된 열린 기록에 끝 시각.
- tap → 그 키에 쓰이지 않은 기록(열린 채 30,000ms 이내, 또는 끝난 뒤 500ms 이내)이 있으면 **버린다**. 없으면 입력한다 — 스크린리더 활성화와 touchstart 유실이 같은 길로 한 번 입력된다. [추론] VoiceOver · TalkBack 두 번 탭은 요소 활성화(tap)로 오고 touchstart는 오지 않는다고 본다 — 기기 미확인(KT-E9). touchstart가 함께 와도 같은 누름의 tap은 버려지므로 한 번이다.
- 같은 키의 새 touchstart는 그 키의 앞 열린 누름을 닫는다(끝 이벤트가 빠진 경우). 열린 누름 창 30,000ms는 기록이 쌓이지 않게 하는 상한일 뿐이다 — 3초로 두면 오래 누른 키의 끝 · tap이 같은 누름으로 묶이지 않아 두 번 입력됐다(하네스 리뷰 W1, KT-U22).
- 키마다 따로, 호출마다 낡은 기록을 먼저 버린다(끝 이벤트가 사라져도 쌓이지 않는다). 시계가 뒤로 가도 던지지 않는다.

손가락이 키 밖으로 미끄러져도 이미 입력됐으므로 취소되지 않는다. 겹친 누름(두 손가락)은 칸마다 따로 입력된다. 윗글쇠도 같은 길이라 touchstart로 켜진 뒤 같은 누름의 tap이 다시 끄지 않는다.

### D3. 되돌리는 스위치 하나

`MessengerKeyboard.tsx`의 `INPUT_ON_TOUCH_START = true`. 실기에서 멀티터치가 다른 칸으로 배달되는 등 touchstart 입력에 문제가 보이면 이 한 줄을 false로 둔다 — touchstart는 눌림 표시만 하고 입력은 예전처럼 tap이 한다(배치 · 눌림 · 진동은 그대로).

### D4. 눌림 표시 · 말풍선 · 힌트

- 누르는 동안 보이는 키가 `gray-600`(즉시 — transition 없음, reduced motion과 같은 모습). 손을 떼거나 취소되면 풀린다. 끝 이벤트가 오지 않아도 **1,500ms** 안전 타이머가 푼다(지우기는 반복 전체 + 1,500ms).
- 자모 · 문장부호 칸은 눌린 동안 키 위에 글자 말풍선 하나(가장 최근 칸만). 첫 줄 ㅂ · ㅔ는 왼쪽 · 오른쪽 가장자리에 맞춘다(가운데면 좁은 화면 밖으로 나간다). z-index는 쓰지 않는다([ADR-0022](0022-scroll-regions-and-fixed-affordances.md) — TalkBack 순서) — 판 · 키 줄 · 줄 · 칸 · 키 면 다섯 상자가 `overflow: visible`.
- 라벨 · 힌트는 키 안의 잘리는 면(`messenger-keyboard-key-face`, `overflow: hidden`)에 두고 말풍선은 그 형제다 — 큰 글꼴([ADR-0020](0020-dynamic-type-font-scale.md))에서 라벨 · 힌트가 이웃 키로 번지지 않는다. 힌트 · 말풍선 글자는 `accessibility-element={false}`.
- 쌍자음 · ㅒ · ㅖ가 있는 일곱 키는 꺼져 있을 때 모서리에 그 글자를 작게(`label-s`) 보인다. 칸 라벨에는 섞지 않는다. 윗글쇠가 켜지면 키 면이 `brand-strong` + 흰 아이콘(5.46:1). 켜진 윗글쇠를 누르는 동안(면이 `gray-600`)은 아이콘을 `gray-900`으로 — 흰색은 2.1:1이라 비텍스트 3:1에 못 미친다.

### D5. 지우기 — 아이콘 · 길게 누르면 반복

아이콘은 앱 안 인라인 SVG(`backspace-icon.ts` — 라이브러리 0.5.0에 없다). 반복은 `lib/key-repeat.ts`: 첫 지우기는 게이트가 하고, **450ms** 뒤 첫 반복, **70ms**마다, **50번**에서 스스로 멈춘다. 손을 떼거나 취소되거나 화면이 사라지면 즉시 멈춘다. 살아 있는 타이머는 언제나 많아야 하나이고, 반복이 던지면 멈춘다. 반복 콜백 안에서 멈춰도 그 자리에서 끝난다(KT-U24). 반복마다 게이트에 지우기의 열린 누름이 있는지 보고(`hasOpenPress`) 없으면 멈춘다. 끝 이벤트가 유실되면 다른 키를 누를 때, 아니면 상한(50, 약 4초)에서 멈춘다. 앱이 백그라운드로 갈 때 멈추는 훅은 앱에 없다(KT-E7에서 본다).

### D6. 키 진동 — 새 종류 `key`, 앱 설정을 따르고 Android는 시스템 터치 진동도 따른다

`lib/sound-effects.ts`의 `createKeyHaptic()`이 설정(ADR-0109 D4)과 모듈을 **처음 누를 때 한 번** 읽고, 켜져 있으면 입력마다 `haptic("key")` 1회. 반복 삭제에는 진동이 없다. 호스트:

- iOS: `HapticFeedbackKind.key` → 판정 생성기와 별도의 `UIImpactFeedbackGenerator(.light)`(예열 · 매번 뒤 `prepare()`), 메인 큐. 「시스템 햅틱」은 UIKit이 따른다.
- Android: `HapticKindRoute.of(kind)` → `KEY`면 API 29+ `EFFECT_TICK`, 26 ~ 28 20ms one-shot. **터치 용도**(API 33+ `VibrationAttributes.USAGE_TOUCH`, 그 아래 `AudioAttributes.USAGE_ASSISTANCE_SONIFICATION`)라 시스템 「터치 진동」을 따른다 — API 37 AVD에서 끔 → `ignored_for_settings` 확인, API 26 ~ 32는 미확인 — 판정 진동(ADR-0109 D3 2판: 미디어 용도, 시스템 설정과 상관없이)과 **일부러 다르다**: 키 진동은 시스템 자판과 같은 성격이고, 판정은 학습 결과다.
- `key`를 모르는 옛 호스트는 무시한다(ADR-0109 「모르는 값 무시」) — 새 번들이 옛 앱에 와도 진동만 없다.

설정 화면의 진동 설명은 5개 언어에서 「답과 키 입력에 진동」으로 바꿨다(en: 「Vibrate for right or wrong answers and keyboard taps.」).

## 네이티브 모듈 입장 조건 (ADR-0017 D1)

새 모듈 · 메서드 없음. `SoundEffectsModule.haptic(kind)`이 받는 값 하나(`key`)가 늘었다. 권한 · 매니페스트 · PrivacyInfo 변경 없음(`VIBRATE`는 ADR-0109 2판에 이미 있다).

## 기존 사용자 안전

- 공개 계약 `MessengerKeyboardProps`와 조합(`hangul-keyboard.ts`) · 입력창 상태는 그대로다.
- test-id는 `messenger-key-<id>` 그대로(쉼표만 사라짐). 새 `messenger-key-preview` · `messenger-key-hint-<id>` · 칸의 `data-pressed`.
- 옛 호스트 + 새 번들: 입력 · 눌림 · 반복 정상, 진동만 없다.

## 버린 대안

1. **키만 키우고 tap 입력 유지** — 「잘 안 눌린다」의 절반(틈 · 미끄러짐 취소)이 남는다.
2. **touchstart만 쓰고 tap 제거** — 스크린리더 두 번 탭이 입력되지 않는다.
3. **main-thread 스크립트로 눌림 표시** — 반응은 빠르지만 두 스레드 결선이 늘어 안정성이 떨어진다. 키 30개 다시 그리기는 background setState로 충분했다(실기 확인 대상).
4. **터치 좌표로 키 찾기(판 하나가 이벤트를 받고 좌표 → 칸)** — 레이아웃 측정이 필요하고 플랫폼마다 좌표 기준이 다르다. 칸마다 이벤트를 받는 쪽이 단순하다.
5. **키 진동도 판정처럼 시스템 설정 무시** — 시스템 자판과 다르게 굴어 거슬린다.
6. **매 누름마다 진동 설정 읽기** — 저장소를 키마다 읽는다. 자판이 떠 있는 동안 설정은 바뀌지 않는다.
7. **시안대로 판 아래 여백 24** — 판 높이가 248이 돼 화면 본문이 줄어든다(design.md 7절).

## 대가

- 자모 칸 폭은 31.4(320pt) ~ 42.4(430pt)라 폰 폭에서 44pt를 못 넘는다 — 10칸 자판은 시스템 자판도 같다. 높이 54 · 1.5칸 키 · 띄어쓰기는 44 이상, 모든 칸이 24 × 24 이상(WCAG 2.5.8).
- 판 좌우 3px — 시스템 자판처럼 가장자리 가까이(2026-10-19 결정의 연장).
- 지우기 반복은 자모 단위다(조합 규칙 그대로) — 빠르게 지워진다.

## 알려진 한계

- **멀티터치 배달은 실기 미확인.** Lynx가 둘째 손가락의 touchstart를 그 손가락이 닿은 칸에 보내는지 확인하지 못했다(에뮬레이터 · 시뮬레이터 도구는 한 손가락만). 오배정이 보이면 D3.
- **첫 줄 말풍선이 판 위로 넘치는 것은 실기 미확인.** 잘리면 첫 줄만 말풍선을 생략한다.
- Android 26 ~ 28은 시스템 「터치 진동」 끔을 진동 서비스가 따르지 않을 수 있다(앱 설정은 따른다).
- 큰 글꼴([ADR-0020](0020-dynamic-type-font-scale.md))에서 힌트 · 자모 겹침은 확인하지 않았다.

## 접근성

- 칸 = `accessibility-element` · `button` · 라벨은 예전 값 그대로(윗글쇠 켜짐은 「Shift, on」). 힌트 · 말풍선은 칸 안이라 따로 읽히지 않는다.
- 대비: 눌린 면 위 글자 · 힌트 · 띄어쓰기 6.34, 윗글쇠 켜짐 흰 아이콘 5.46. 띄어쓰기 라벨을 `gray-700`(3.22, 미달)에서 `fg-neutral-muted`(6.22)로 고쳤다.
- 진동만으로 전하는 정보 없음(WCAG 1.3.3) — 눌림은 색 · 말풍선 · 입력창 글자로도 보인다.

- 하네스 접근성 점검(2026-11-09): Critical 0 · Minor 5 — M1(켜진 윗글쇠 누름 중 아이콘 대비) · M2(큰 글꼴 번짐) · M3(힌트 · 말풍선 낭독 제외 명시) · M5(끝 이벤트 유실 시 반복) 반영, M4(스크린리더 두 번 탭 실기 근거)는 KT-E9로 남는다.

## 측정

새 이벤트 없음. 배포 뒤 `episode_listen_item_answered`의 받아쓰기 정답률(지금 41%)과 타자 활동 완료율을 1.3.0과 비교한다.

## 테스트 계획

[ADR-0006](0006-command-interface-and-test-layers.md) 계층 판정: unit · ui · integration required, e2e required(수동), 호스트 required.

- unit: `keyboard-layout` · `key-press-gate` · `key-repeat` · `sound-effects`(createKeyHaptic) — 4 파일 77/77(하네스 리뷰 뒤 KT-U22 · U23 · U24 red → green, red 22 → green, 접근성 점검 뒤 `hasOpenPress` KT-U21 red → green). CSS 규칙(`messenger-keyboard.css.unit.test.ts`) 7/7(예전 CSS에서 6 실패).
- ui: `MessengerKeyboard.ui.test.tsx` 20/20(하네스 리뷰 뒤 KT-UI15 강화 · UI19 추가, red 10 → green, 접근성 점검 뒤 KT-UI14 ~ UI17 red 4 → green, 기기 확인 뒤 KT-UI18 — 윗글쇠로 누른 키의 말풍선 글자 — red 1 → green) — touchstart 한 번 · 같은 누름의 tap 버림 · tap만 입력 · 눌림 · 안전 타이머 · 말풍선 · 힌트 · 반복 · 언마운트 정리 · 겹친 누름 · 진동.
- integration: `TypingActivity.keyboard-touch.integration.test.tsx` 6/6 — 옛 컴포넌트에서 3 실패(공허하지 않음).
- 회귀: 모바일 unit 4,899 · ui 2,168 · integration 783.
- 호스트: Android JUnit `HapticKindRouteTest` 4/4 · `HapticPatternTest` 5/5 · assembleDebug · assembleBundled, iOS HostTests `SoundEffectsModuleTests` 8/8.
- 번들: `main.lynx.bundle` 3,976.8 / 4,060.0 kB(+11.8 kB) — [성능 보고서](../performance/reports/keyboard-touch-01.md)(미측정 — 번들만).
- e2e(수동): [`docs/e2e/keyboard-touch.md`](../e2e/keyboard-touch.md) KT-E1 ~ E11.

## 기기 확인 상태 (2026-11-09)

⚠ **사람 손 · 실기 미확인.** 아래는 에이전트 실행이다(측정용 번들, 시뮬레이터 · AVD).

- iOS 시뮬레이터(iPhone SE 3 · 17 Pro · iPad mini): 배치 정상 · 일곱 번 탭 → 일곱 자모 한 번씩 · 접근성 트리 31 `AXButton` 라벨 불변 · 칸 맞닿음.
- Android AVD(API 37 412dp · API 30 2GB 392 / 360dp): 「안녕」 · 「빠」 정확 · 틈 탭 → 한 키 · 미끄러짐 → 한 번 · 눌림 · 말풍선 · 지우기 반복과 멈춤 · `vibrator_manager`에 `usage: TOUCH` TICK, 시스템 터치 진동 끔 → `ignored_for_settings` · FATAL 0.
- 미실행: 두 손가락 · 첫 줄 말풍선 · 스크린리더 두 번 탭 · 손 체감 · 옛 호스트 · 가로.

## 재검토 조건

1. 실기에서 멀티터치 오배정 · 이중 입력이 보이면 → D3 스위치, 그다음 좌표 판정(버린 대안 4)을 다시 본다.
2. 첫 줄 말풍선이 잘리면 → 첫 줄만 말풍선 생략.
3. 배포 뒤 받아쓰기 정답률 · 완료율이 오르지 않으면 → 오타 계측(지우기 횟수 · 옆 키 오타) 이벤트를 더한다.
4. 아이콘 패키지에 backspace가 생기면 → 인라인 SVG를 바꾼다.
