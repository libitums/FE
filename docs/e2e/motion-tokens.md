# 0.4.0 motion 토큰 소비가 기기에서 보인다 — 눌림 축소 · Spinner 회전 · Button Loading 폭 · reduced 눌림 막 · VN 정지 (iOS · Android)

토큰 0.4.0을 소비하도록 바꾼 결과를 시뮬레이터 · 에뮬레이터에서 확인하는 **수동 절차**다. 계약은 작업 `motion-tokens-stage2`의 `spec.md` §6(AC1 ~ AC4 · AC10) ·
§11(가정 A1 ~ A5), 막의 합성 색은 같은 작업 `design.md` §4, Button Loading 폭은 §3이 진다. 이 문서는 아래 다섯 가지만 본다.

1. 끈(standard) 상태의 눌림 축소 비율 — RoundButton 95 %, Dialog 첫 프레임 96 %(**회귀 확인**: 토큰 소비로 CSS 파일이 바뀌었다).
2. Spinner 회전 — Round Button · Button 둘 다, 끈 상태와 켠(reduced) 상태 모두.
3. Button Loading — 라벨이 보이지 않고 폭 · 높이가 같은 행의 Default와 같다.
4. reduced 눌림 막 — 켠 상태에서 눌러도 줄지 않고 surface가 어두워진다.
5. 비주얼 노벨의 계속 표시가 튀지 않는다.

| 이미 지는 층 | 무엇을 |
|---|---|
| unit | 토큰 값과 CSS의 `scale(0.95)` · `scale(0.96)` 숫자 대조, `motionDurationMs`, contract 파생(`contentVisibility` · `hasPressedShade`) |
| ui | Loading DOM(숨긴 라벨 · Spinner · `"<label>, loading"`), 막 요소의 있고 없음, VN 속성 제거, CSS 텍스트(keyframes · 막 선언) |
| integration | 패키지 export · 산출물, `lint:motion`, Storybook 빌드 |

수용 기준 대응(`spec.md` §6): **AC1** = M2-I1 · M2-I2 · M2-A1 · M2-A2, **AC2** = M2-I3(c) · M2-I4 · M2-I6 · M2-A3 · M2-A4 · M2-A6, **AC3** = M2-I3 · M2-A3,
**AC4** = M2-I5 · M2-A5, **AC10** = 이 문서. VN 계속 표시 정지는 M2-I7 · M2-A7이다.
가정 대응(`spec.md` §11): **A1**(`visibility: hidden`이 자리를 지킨 채 숨김) = M2-I3, **A2**(막이 아이콘 아래) = M2-I5, **A3**(`border-top-color` cascade, 틈이 보임) =
M2-I3(c) · M2-I4, **A4**(`transform: scale(var())` 풀림) = M2-I8(탐색, 기록만), **A5**(Android에서 playground를 열 수 있는가) = 아래 「playground 실행 경로」와 M2-A3 · M2-A4.

## 이 절차로 확인하지 못하는 것

- **회전 각속도 수치**: 한 바퀴 1000 ms가 맞는지는 재지 않는다. 연속 캡처 간격(수백 ms)과 틈의 모호함으로 각속도를 읽을 수 없다. 이 문서는 「두 프레임에서 틈 각도가 **다르다**」만 판정한다.
  1000 ms · linear는 unit(CSS 텍스트)이 진다.
- **iOS 실기**: 시뮬레이터로 판정한다. 실기에 닿으면 M2-I3 · M2-I5를 한 번 더 하고, 못 하면 「미확인」으로 적는다. 시뮬레이터 통과를 실기 통과로 적지 않는다.
- **Android에서 playground에 닿는지(가정 A5)**: 1단계 Android 절차는 정적 서버(`apps/mobile/dist`)였다. dev 전용 playground 번들을 열 수 있는지는 이 문서가 **시도하고 가부를 기록**할 뿐
  미리 알지 못한다. 못 열면 Round Button loading(M2-A4)은 「미확인」, Button Loading(M2-A3)은 로그인 소셜 버튼으로 대신 본다.
- **`transform: scale(var(--…))` 풀림(가정 A4)**: 통과/실패가 아니다. M2-I8은 3단계의 입력을 만드는 **탐색 항목**이고, 이 계약은 리터럴을 쓴다.
- Android 배율 0에서 앱의 `reduced` 분기와 플랫폼 정지를 가르는 한계, 캡처 간격의 정밀도, `data-motion` 값을 직접 못 읽는 것: [동작 줄이기 e2e의 「이 절차로 확인하지 못하는 것」](motion-reduced.md#이-절차로-확인하지-못하는-것)과 같다.
- TalkBack · VoiceOver를 켠 상태: accessibility 단계의 몫이다.

## 전제

준비는 [동작 줄이기 e2e](motion-reduced.md)의 「전제」 · 「iOS 준비」 · 「Android 준비」 · 「연속 두 장 비교」를 **그대로** 따르고 되풀이하지 않는다(전용 시뮬레이터 · 에뮬레이터,
전역 설정 값 기록 후 복원, 「같다 = 정지, 다르다 = 움직임」, 로그인된 상태에서 시작 — [공통 전제](README.md#공통-전제)). 이 작업만의 부분:

1. **호스트는 바뀌지 않았다 — 번들만 새로 만든다.** 단 **1단계 호스트(`reducedMotion`을 boolean으로 보내는 `d602fe08` 이후)가 설치돼 있어야** 켠 상태가 전달된다. 설치된 호스트가
   그 이전이면 호스트도 새로 빌드한다. 결과 표에 번들 SHA와 호스트 SHA를 따로 적는다.
2. **조작 도달 길**(맵의 RoundButton · LearningUnit · Dialog `×` · VN 진입)은 [동작 줄이기 e2e의 「조작 도달 길」](motion-reduced.md#조작-도달-길)을 쓴다.
3. 측정은 1단계 산출물 `motion-reduced-motion/artifacts/e2e-red/tools/`의 `burst.py`(약 100 ms 간격 연속 캡처) · `diam.py`(surface 지름) · `orange.py`(색 픽셀),
   `e2e-green/tools/`의 `card_box.py`(카드 상자 전환점), `review-fix/tools/`의 `pburst.py`(누른 채 연속 캡처)를 재사용한다. 이 저장소에 복사하지 않는다. 도구가 없으면 스크린샷을
   픽셀 도구로 직접 읽고, 결과 표 비고에 쓴 방법을 적는다.
4. **「회전한다」의 판정**: 100 ms 간격 두 프레임에서 원(12 px)의 **틈**(위쪽이 투명한 호) 각도를 비교해 **다르면** 회전이다. 틈이 보이지 않는 완전한 원이면(가정 A3 — 상단 투명이
   cascade에 져서 안 보이는 경우) 회전을 판정할 수 없고 **A3 실패**로 적는다(통과로 적지 않는다). 한 바퀴가 1000 ms이므로 100 ms 간격은 약 36°를 움직인다 — 캡처 지연이
   1000 ms의 배수에 걸려 같은 각도가 나올 수 있으니, 같게 나오면 간격을 달리해(예: 130 ms) 한 번 더 잡고서야 「회전 없음」으로 적는다.
5. **막 색의 판정**: 아이콘을 **피한** surface 지점(가장자리 안쪽 여백) 한 픽셀씩 누르기 전 / 누른 중을 비교한다. 기대값은 `design.md` §4의 합성 색이고 허용 오차는 채널당 ±2다.

| 대상 | 누르기 전 | 누른 중(기대) |
|---|---|---|
| RoundButton | `#F7F8F9` | `#E3E4E5` |
| LearningUnit available | `#FFF0E6` | `#EBDDD4` |
| LearningUnit active | `#F46B18` | `#E06216` |
| LearningUnit clear | `#35A66F` | `#319966` |

### 증거 파일 이름

`docs/e2e/evidence/motion-tokens-<platform>-<id>-<n>.png` — `<platform>`은 `ios` 또는 `android`, `<id>`는 `M2-I3` 같은 항목 id, `<n>`은 `off-1` · `off-2` · `on-1` ·
`on-2`(끈 상태 · 켠 상태), 항목에 따라 `before`(누르기 전) · `press`(누른 중) · `loading`을 덧붙인다. 예: `motion-tokens-ios-M2-I5-on-press-1.png`.
영상은 저장소에 커밋하지 않는다(프레임 캡처 PNG만).

### playground 실행 경로

Button Loading과 Round Button loading은 앱 화면에 상시 보이지 않아 dev 전용 playground의 `catalog:button`으로 본다. `ButtonCatalog`는 변형마다 Default · Disabled · Loading을
**한 줄에** 그리므로 폭 비교가 한 캡처로 끝나고, 「Round Button · loading」 행이 따로 있다.

**iOS**([Android 효과음 · 서사 배경의 E7](android-assets.md)과 같은 방식 — 로컬 전용, 커밋하지 않는다):

```sh
lsof -nP -iTCP:3000 -sTCP:LISTEN          # 다른 worktree의 rspeedy dev가 남았는지 본다. 있으면 cwd를 확인하고 끈다
# apps/mobile/src/playground/current.ts 의 current 를 "catalog:button" 으로 바꾼다 (커밋하지 않는다)
pnpm dev                                  # 배경. http://localhost:3000/playground.lynx.bundle 이 200인지 확인
xcrun simctl launch "$UDID" com.libitum.host --bundle-url=http://localhost:3000/playground.lynx.bundle
git checkout apps/mobile/src/playground/current.ts   # 끝에 되돌린다
```

**Android — 시도하고 가부를 기록한다(가정 A5)**: 에뮬레이터에서 호스트 머신의 dev 서버는 `10.0.2.2`로 보인다. dev 전용 `playground` 번들은 `apps/mobile/lynx.config.ts`의 `entry`가
dev에서만 더하므로, 정적 서버가 서빙하는 `apps/mobile/dist`에 들어 있는지부터 본다. 두 길을 차례로 시도한다.

1. `pnpm dev` 후 호스트가 번들 주소를 `http://10.0.2.2:3000/playground.lynx.bundle`로 받게 하는 길(Android 호스트가 번들 주소를 인자나 설정으로 받는지는 [Android 호스트](android-host.md)와
   호스트 코드로 확인한다).
2. `dist`에 `playground.lynx.bundle`이 있으면 그 파일을 정적 서버로 열도록 번들 주소를 바꾸는 길.

어느 쪽으로든 열었으면 **무엇을 했는지를 결과 표 「Android playground」 칸에** 적는다. 둘 다 안 열리면 「열 수 없음: 이유」를 적고 M2-A4는 「미확인」, M2-A3은 소셜 버튼 대체로 간다.
호스트 소스를 playground용으로 고치는 것은 이 절차의 범위가 아니다 — 그런 수정이 필요하면 「열 수 없음」으로 적는다.

## iOS 항목

### M2-I1 — 끈 상태 RoundButton 눌림은 95 %다 (AC1, 회귀 확인)

- **조작**: **끈** 상태에서 여정 맵의 RoundButton을 누르기 전 한 장, 누른 채 연속 캡처(1단계 M-I5 off와 같다).
- **관찰**: surface 지름이 누르기 전의 **95 %**다(1단계 측정 216 → 206). CSS 파일이 바뀐 뒤에도 같아야 하는 **회귀 확인**이다.
- 증거: `motion-tokens-ios-M2-I1-off-before-1.png`, `-off-press-1.png`, `-off-press-2.png`.

### M2-I2 — 끈 상태 Dialog 첫 프레임은 96 %다 (AC1, 회귀 확인)

- **조작**: **끈** 상태에서 학습 화면 `×`로 나가기 확인창을 열고 연속 캡처(1단계 M-I4 off).
- **관찰**: 첫 프레임의 **카드 상자 전환점**이 정착 프레임보다 안쪽이다(96 %에서 1로). 폭 · 높이 값이 아니라 전환점으로 비교한다 —
  [측정 주의](motion-reduced.md#m-i4--dialog는-불투명도만-바뀐다-ac9)는 그대로 쓴다.
- 증거: `motion-tokens-ios-M2-I2-off-1.png`, `-off-2.png`.

### M2-I3 — Button Loading은 라벨이 없고 폭이 같고 돈다 (AC2 · AC3, 가정 A1 · A3)

- **조작**: playground `catalog:button`을 연다. **끈** 상태에서 변형(neutral · brand · outline · subtle · text)마다 Default · Disabled · Loading이 한 줄에 있다. 행별로 캡처하고,
  Loading 버튼은 100 ms 간격 두 프레임을 더 잡는다.
- **관찰**:
  - (a) **폭 · 높이**: Loading 버튼의 폭 · 높이가 같은 행 Default와 같다(**±1 px**, 버튼 상자 가장자리를 측정). 수정 전은 폭이 **+18 px**다.
  - (b) **라벨**: Loading에 라벨 글자가 보이지 않고 12 px 원만 가운데에 있다. 자리는 남는다((a)가 같으므로 `visibility: hidden`이 자리를 지킨다 — 가정 A1).
  - (c) **회전**: 100 ms 간격 두 프레임에서 원의 틈 각도가 **다르다**. 틈이 보이지 않으면 A3 실패로 적는다(전제 4).
  - 다섯 변형 모두 (a) ~ (c)를 본다. 한 변형만 어긋나도 그 변형을 비고에 적는다.
- 증거: `motion-tokens-ios-M2-I3-off-row-<variant>-1.png`, `-off-loading-1.png`, `-off-loading-2.png`.

### M2-I4 — Round Button loading이 돈다 (AC2, 가정 A3)

- **조작**: playground의 「Round Button · loading」 행(neutral Default · neutral loading · brand loading)을 **끈** 상태에서 100 ms 간격 두 프레임으로 잡는다.
- **관찰**: neutral · brand loading 둘 다 두 프레임의 틈 각도가 **다르다**. 지금까지 틈 없는 완전한 원이었다면 그 사실도 비고에 적는다.
- 증거: `motion-tokens-ios-M2-I4-off-1.png`, `-off-2.png`.

### M2-I5 — 켠 상태에서는 줄지 않고 어두워진다 (AC4, 가정 A2)

- **조작**: **켠** 상태(설정 › 손쉬운 사용 › 동작 › 동작 줄이기; 켜고 재실행)에서 여정 맵의 RoundButton과 LearningUnit(available · active · clear 스텝)을 누르기 전 한 장,
  누른 채 한 장(`pburst.py`). **끈** 상태에서 같은 조작을 한 번 더 한다.
- **관찰**:
  - 켠 상태: surface **지름이 누르기 전과 같다**(축소 없음) **그리고** 아이콘을 피한 지점의 픽셀이 전제 5의 표대로 어두워진다(±2).
  - 아이콘 픽셀은 누르기 전과 **같다** — 막은 아이콘 아래에 그려진다(가정 A2). 아이콘이 함께 어두워지면 가정 A2 실패로 적는다(막에 `z-index` 필요).
  - 끈 상태: 색은 **불변**이고 축소(95 %)만 있다. 막이 보이면 실패다.
  - 막의 전환은 150 ms다 — 누른 직후가 아니라 **정착한 뒤** 프레임으로 색을 읽는다.
- 증거: `motion-tokens-ios-M2-I5-on-before-1.png`, `-on-press-1.png`(LearningUnit은 `-on-press-lu-available-1.png` 꼴), `-off-before-1.png`, `-off-press-1.png`.

### M2-I6 — 켠 상태에서도 loading이 돈다 (AC2)

- **조작**: **켠** 상태에서 playground의 Button Loading 행과 Round Button loading 행을 100 ms 간격 두 프레임으로 잡는다.
- **관찰**: 두 프레임의 틈 각도가 **다르다**(reduced에서도 spinner는 유지 — 「진행 중임을 알리는 유일한 수단」).
- 증거: `motion-tokens-ios-M2-I6-on-1.png`, `-on-2.png`.

### M2-I7 — VN 계속 표시가 튀지 않는다

- **조작**: **끈** 상태에서 비주얼 노벨 대사가 다 나와 계속 표시(`ui-lynx-visual-novel-continue-indicator`)가 보일 때 **1초 간격**으로 두 장 캡처한다.
- **관찰**: 계속 표시 화살표의 **y가 같다**(bounce 없음). 수정 전은 4 px 오르내린다. 1초 간격은 주기와 겹칠 수 있으니 다른 간격(0.3 s · 0.7 s)으로 한 장씩 더 잡아 모두 같을 때만
  통과로 적는다. 대사 진입 직후 타이핑은 1단계 M-I6이 판정 불가였으므로 이 항목은 **계속 표시의 y만** 본다.
- 증거: `motion-tokens-ios-M2-I7-off-1.png`, `-off-2.png`.

### M2-I8 (탐색, 판정 아님) — `scale(var(--libitum-motion-scale-pressed))`가 Lynx에서 풀리는가 (가정 A4)

- **조작**: **버리는 워크트리**에서 `packages/ui-lynx/src/round-button/round-button.css`의 눌림 `scale(0.95)`(106행 부근)를 `scale(var(--libitum-motion-scale-pressed))`로 바꿔 번들만 새로
  만들고 M2-I1 조작을 한다. 이 워크트리의 변경은 커밋하지 않고, 확인이 끝나면 워크트리와 번들을 버린다.
- **기록**: 아래 셋 가운데 **하나**를 결과 표에 적는다. 통과/실패가 아니다 — 3단계의 입력이다.
  - 「풀림(95 %)」 — 눌림이 M2-I1과 같이 95 %다.
  - 「안 풀림(100 %)」 — 눌림이 있지만 축소가 없다.
  - 「무효(눌림 없음)」 — 눌림 자체가 보이지 않는다(선언이 통째로 무효).
- 증거: `motion-tokens-ios-M2-I8-1.png`(누른 중), 지름 측정값.

## Android 항목

[Android 준비](motion-reduced.md#android-준비-에뮬레이터-pixel_8-api-37)(세 배율 기록 · 복원 포함)를 그대로 쓴다.

| id | 조작 | 판정 |
|---|---|---|
| M2-A1 | M2-I1과 같음(끈 상태). 누른 채 `A shell input swipe x y x y 3000` 중 캡처 | surface 지름 95 % — 회귀 확인. 증거 `motion-tokens-android-M2-A1-off-*.png` |
| M2-A2 | M2-I2와 같음(끈 상태) | 첫 프레임 카드 상자가 안쪽(96 %) — 회귀 확인. 증거 `motion-tokens-android-M2-A2-off-*.png` |
| M2-A3 | Button Loading. **playground를 열 수 있으면** M2-I3과 같다. **못 열면** 로그인 화면의 소셜 버튼을 눌러 요청 중(loading) 캡처와 누르기 전 캡처를 비교한다 | 폭 · 높이 같음(±1 px) · 라벨 없음 · 100 ms 간격 두 프레임의 틈 각도 다름. **playground 가부를 결과 표 「Android playground」에 적는다**(A5). 증거 `motion-tokens-android-M2-A3-*.png` |
| M2-A4 | Round Button loading(playground 필요) | M2-I4와 같음. 못 열면 「미확인」 |
| M2-A5 | 설정 **(i)** `transition_animation_scale 0` · `animator_duration_scale 1`([1단계 한계 절](motion-reduced.md#이-절차로-확인하지-못하는-것)), RoundButton · LearningUnit을 누른 채 | M2-I5와 같은 색 · 지름 판정(축소 없음 + 합성 색 ±2). 이어서 **(ii)** 접근성 「애니메이션 삭제」에서도 한 번 — 막의 150 ms 전환이 플랫폼 정지와 겹쳐도 색은 **정착값**으로 보여야 한다. 끈 상태는 색 불변 · 축소만. 증거 `motion-tokens-android-M2-A5-i-*.png` · `-ii-*.png` · `-off-*.png` |
| M2-A6 | 설정 (i), loading 행(playground 또는 소셜 버튼) | 회전 유지(두 프레임 틈 각도 다름). **(ii)에서도 돌려** 보이는 대로 적는다 — 1단계 M-A4는 배율 0에서도 Lynx 페이드 중간 프레임이 보였다고 적었으므로, keyframe이 멈추는지 여기서 다시 확인한다 |
| M2-A7 | M2-I7과 같음(Android는 튜토리얼 「Before We Land」 프롤로그, 도달 길은 [조작 도달 길](motion-reduced.md#조작-도달-길)) | 계속 표시 y가 같다 |

Android 한계: 배율 0이 `ObjectAnimator`를 멈추는지 여부로 앱의 `reduced` 분기와 플랫폼 정지가 겹칠 수 있다. M2-A5 · M2-A6은 (i)를 먼저 돌려 판정하고 (ii)는 겹침을 적는 데 쓴다.

## red의 근거 — 수정 전 번들(main `49ef26be`)

`49ef26be`는 이 단계 직전이다(토큰 소비 · Spinner 회전 · Button Loading · 막이 아직 없다). 수정 전 번들에서 기대하는 관찰은 다음과 같다(**호스트는 같으므로 번들만 수정 전이면 된다**).

| 항목 | 수정 전 번들의 관찰 |
|---|---|
| M2-I3 (a) | Loading 버튼 폭이 Default보다 **+18 px**(spinner 12 + gap 6) |
| M2-I3 (b) | 라벨이 보인다 |
| M2-I3 (c) · M2-I4 · M2-I6 | 두 프레임의 원이 같다(회전 없음) |
| M2-I5 | 켠 상태에서 눌러도 색 불변(막 없음) |
| M2-I7 | 계속 표시 y가 오르내린다(4 px bounce) |
| M2-I1 · M2-I2 · M2-A1 · M2-A2 | 수정 전후 **같아야 한다**(회귀 항목, red가 아니다) |

두 길이 있다.

1. **수정 전 번들로 한 번 돈다.** `git worktree add /tmp/mt-before 49ef26be`로 만든 트리에서 번들을 만들고(playground는 위 경로, 호스트는 그대로) M2-I3 · M2-I4 · M2-I5 · M2-I7을 돌려
   위 표의 관찰을 캡처로 남긴다. 끝나면 워크트리를 지운다.
2. **돌리지 않는다면 코드 근거로 대신한다.** 이 경우 e2e의 red는 **기기에서 관찰한 것이 아니라 코드 근거**라고 명시하고, 수정 후 빌드의 관찰이 유일한 기기 증거가 된다.
   - 회전 없음: `git show 49ef26be:packages/ui-lynx/src/round-button/round-button.css | grep -c keyframes`가 **0**이다(`button/button.css`도 0).
   - 폭 +18 px: `49ef26be`의 `button.css` Loading 규칙이 라벨을 그대로 두고 spinner를 앞에 끼우며 `column-gap`을 `spacing-6`으로 바꾼다.
   - 막 없음: `49ef26be`의 `round-button.css`에 reduced 눌림 막 선언이 없다.

## 결과

아직 실행하지 않았다. 통과·실패는 `통과` / `실패: <관찰>` / `판정 불가: <이유>` / `미확인`으로만 적는다.

| 항목 | 플랫폼 | 결과 | 비고(설정 · 측정값 · 증거 파일) |
|---|---|---|---|
| M2-I1 | iOS 시뮬레이터 | 아직 실행하지 않았다 | |
| M2-I2 | iOS 시뮬레이터 | 아직 실행하지 않았다 | |
| M2-I3 | iOS 시뮬레이터 | 아직 실행하지 않았다 | (a) 폭 · 높이 / (b) 라벨 / (c) 틈 각도 |
| M2-I4 | iOS 시뮬레이터 | 아직 실행하지 않았다 | |
| M2-I5 | iOS 시뮬레이터 | 아직 실행하지 않았다 | 지름, 변형별 색 4종 |
| M2-I6 | iOS 시뮬레이터 | 아직 실행하지 않았다 | |
| M2-I7 | iOS 시뮬레이터 | 아직 실행하지 않았다 | |
| M2-I8(탐색) | iOS 시뮬레이터 | 아직 실행하지 않았다 | 풀림 / 안 풀림 / 무효 중 하나 |
| (실기) M2-I3 · M2-I5 | iOS 실기 | 아직 실행하지 않았다 | |
| M2-A1 | Android 에뮬레이터 | 아직 실행하지 않았다 | |
| M2-A2 | Android 에뮬레이터 | 아직 실행하지 않았다 | |
| M2-A3 | Android 에뮬레이터 | 아직 실행하지 않았다 | playground 사용 / 소셜 버튼 대체 |
| M2-A4 | Android 에뮬레이터 | 아직 실행하지 않았다 | |
| M2-A5 | Android 에뮬레이터 | 아직 실행하지 않았다 | (i) · (ii) 각각 |
| M2-A6 | Android 에뮬레이터 | 아직 실행하지 않았다 | (i) · (ii) 각각 |
| M2-A7 | Android 에뮬레이터 | 아직 실행하지 않았다 | |

| 칸 | 값 |
|---|---|
| 시작 값(실행 전 기록) | iOS 동작 줄이기: / Android `animator_duration_scale`: · `transition_animation_scale`: · `window_animation_scale`: |
| Android playground (가정 A5) | 열었는가 / 어떻게 / 열 수 없는 이유 |
| 확인자 | |
| 날짜 | |
| 빌드 SHA (호스트 · 번들) | |
| 기기 · OS · 빌드 종류 | |
| 설정 복원 확인 | |
