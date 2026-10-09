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
| unit | CSS의 `scale(var(--libitum-motion-scale-pressed))` · `scale(var(--libitum-motion-scale-enter))` 문자열 단언 + 비항등 scale 리터럴 0(4단계 전환 — 전에는 토큰 값과 `scale(0.95)` · `scale(0.96)` 숫자 대조), `motionDurationMs`, contract 파생(`contentVisibility` · `hasPressedShade`) |
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
- TalkBack · VoiceOver를 켠 상태: 이 절차의 판정 항목이 아니다. 다만 Button Loading이 라벨을 `visibility: hidden`으로 숨긴 뒤 **숨긴 `<text>`가 별도 정지가 되지 않는가**는
  iOS는 Lynx Pod 소스(hidden → `view.hidden`, 루트 `isAccessibilityElement`로 잎)로 닫혔지만 Android는 AAR뿐이라 실기가 유일한 근거다 — M2-I3 · M2-A3의 비고에 확인 항목을 두고,
  기기 없는 회차에는 「미확인」으로 남긴다.

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
   **Android는 100 ms 간격을 지킬 수 없다** — 기기 안 `screencap` 한 장이 0.4 ~ 1.2 s 걸린다. 대신 **불규칙 간격 10프레임 이상**에서 틈 각도가 계속 달라지면 회전으로
   판정한다(정지 원이었다면 모든 프레임이 같다; 주기의 배수와 우연히 맞는 한두 프레임은 있어도 전체는 다르다).
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
- **4단계부터 keyframe 본문 `scale(var())`의 기기 게이트를 겸한다** — Dialog enter keyframe의 `scale(0.96)`이 `scale(var(--libitum-motion-scale-enter))`로 바뀌었다. 첫 프레임이 100 %(안쪽이 아님 —
  축소 없음)면 통과가 아니라 **실패**: 4단계 fallback(keyframe 셋만 리터럴 복귀 — [ADR-0053](../adr/0053-motion-policy.md) D6). 회귀 기준은 아래 결과 표와 같은 수치(iOS 전환점 97.1 %)이지 96 정확값이 아니다.
- 증거: `motion-tokens-ios-M2-I2-off-1.png`, `-off-2.png`.

### M2-I3 — Button Loading은 라벨이 없고 폭이 같고 돈다 (AC2 · AC3, 가정 A1 · A3)

- **조작**: playground `catalog:button`을 연다. **끈** 상태에서 변형(neutral · brand · outline · subtle · text)마다 Default · Disabled · Loading이 한 줄에 있다. 행별로 캡처하고,
  Loading 버튼은 100 ms 간격 두 프레임을 더 잡는다.
- **관찰**:
  - (a) **폭 · 높이**: Loading 버튼의 폭 · 높이가 같은 행 Default와 같다(**±1 px**, 버튼 상자 가장자리를 측정). 수정 전은 폭이 **+18 px**다.
  - (b) **라벨**: Loading에 라벨 글자가 보이지 않고 12 px 원만 가운데에 있다. 자리는 남는다((a)가 같으므로 `visibility: hidden`이 자리를 지킨다 — 가정 A1).
  - (c) **회전**: 100 ms 간격 두 프레임에서 원의 틈 각도가 **다르다**. 틈이 보이지 않으면 A3 실패로 적는다(전제 4).
  - 다섯 변형 모두 (a) ~ (c)를 본다. 한 변형만 어긋나도 그 변형을 비고에 적는다. **text 변형은 상자(surface)가 투명이라 폭을 직접 잴 수 없다** — 같은 행 구조의 subtle과
    spinner 중심 x가 같고 Default 라벨 중심 간격이 같다는 **간접 근거**로 적고, 비고에 그렇게 밝힌다.
  - (d) **보조기술(미확인 칸)**: VoiceOver를 켜고 Loading 버튼에 정지하면 이름이 「<라벨>, loading」 **한 번**이고, 다음 스와이프가 숨긴 라벨 글자를 따로 읽지 않는다.
    기기 없는 회차에는 「미확인」으로 남긴다(통과로 적지 않는다).
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

- **조작**: **끈** 상태에서 계속 표시(`ui-lynx-visual-novel-dialog-continue-indicator`)가 보일 때 **1초 간격**으로 두 장 캡처한다. **도달 길**: 여정 맵 맨 위 「Episode intro」 →
  Next → 「Before We Land」(`EpisodeNarrativeScreen`). 비주얼 노벨 화면(DialoguePanel)은 `VisualNovelDialog`를 `continueIndicator="off"`로 쓰므로 거기에는 계속 표시가 **없다** —
  [동작 줄이기 e2e의 「조작 도달 길」](motion-reduced.md#조작-도달-길)이 가리키는 VN 진입이 아니다.
- **관찰**: 계속 표시 화살표의 **y가 같다**(bounce 없음). 수정 전은 4 px 오르내린다. 1초 간격은 주기와 겹칠 수 있으니 다른 간격(0.3 s · 0.7 s)으로 한 장씩 더 잡아 모두 같을 때만
  통과로 적는다. 대사 진입 직후 타이핑은 1단계 M-I6이 판정 불가였으므로 이 항목은 **계속 표시의 y만** 본다.
- 증거: `motion-tokens-ios-M2-I7-off-1.png`, `-off-2.png`.

### M2-I8 (탐색, 판정 아님) — `scale(var(--libitum-motion-scale-pressed))`가 Lynx에서 풀리는가 (가정 A4)

- **조작**: **버리는 워크트리**에서 `packages/ui-lynx/src/round-button/round-button.css`의 눌림 `scale(0.95)`(`:active .surface` 규칙, 116행 부근)를 `scale(var(--libitum-motion-scale-pressed))`로 바꿔 번들만 새로
  만들고 M2-I1 조작을 한다. 이 워크트리의 변경은 커밋하지 않고, 확인이 끝나면 워크트리와 번들을 버린다.
- **기록**: 아래 셋 가운데 **하나**를 결과 표에 적는다. 통과/실패가 아니다 — 3단계의 입력이다. Android 쪽은 [보상 · 문항 전환 e2e](motion-reward.md)의 **M3-A8**이 같은 방법으로 잰다.
  - 「풀림(95 %)」 — 눌림이 M2-I1과 같이 95 %다.
  - 「안 풀림(100 %)」 — 눌림이 있지만 축소가 없다.
  - 「무효(눌림 없음)」 — 눌림 자체가 보이지 않는다(선언이 통째로 무효).
- 증거: `motion-tokens-ios-M2-I8-1.png`(누른 중), 지름 측정값.
- *(4단계에서 전환했다 — 이 탐색 항목은 닫혔다. 전환 뒤 회귀는 M2-I1 · M2-I2 · M2-A1 · M2-A2의 「4단계 회차」 소절이 본다.)*

## Android 항목

[Android 준비](motion-reduced.md#android-준비-에뮬레이터-pixel_8-api-37)(세 배율 기록 · 복원 포함)를 그대로 쓴다.

| id | 조작 | 판정 |
|---|---|---|
| M2-A1 | M2-I1과 같음(끈 상태). 누른 채 `A shell input swipe x y x y 3000` 중 캡처 | surface 지름 95 % — 회귀 확인. 증거 `motion-tokens-android-M2-A1-off-*.png` |
| M2-A2 | M2-I2와 같음(끈 상태) | 첫 프레임 카드 상자가 안쪽(96 %) — 회귀 확인. **4단계부터 keyframe 본문 `scale(var())`의 게이트를 겸한다** — 첫 프레임 100 %(안쪽 아님)면 **실패**(D6 fallback); Android keyframe `var()`는 기기 기록이 없어 이 행이 첫 근거다. 증거 `motion-tokens-android-M2-A2-off-*.png` |
| M2-A3 | Button Loading. **playground를 열 수 있으면** M2-I3과 같다. **못 열면** 로그인 화면의 소셜 버튼을 눌러 요청 중(loading) 캡처와 누르기 전 캡처를 비교한다 | 폭 · 높이 같음(±1 px) · 라벨 없음 · 불규칙 10프레임 이상의 틈 각도가 계속 다름(전제 4). **playground 가부를 결과 표 「Android playground」에 적는다**(A5). (d) TalkBack을 켜고 Loading 버튼에 정지하면 이름이 「<라벨>, loading」 한 번이고 다음 스와이프가 숨긴 라벨을 따로 읽지 않는다 — 소셜 버튼 대체 경로에도 같다. Android는 AAR이라 소스 근거가 없어 **실기가 유일한 근거**이고, 안 했으면 「미확인」. 증거 `motion-tokens-android-M2-A3-*.png` |
| M2-A4 | Round Button loading(playground 필요) | M2-I4와 같음. 못 열면 「미확인」 |
| M2-A5 | 설정 **(i)** `transition_animation_scale 0` · `animator_duration_scale 1`([1단계 한계 절](motion-reduced.md#이-절차로-확인하지-못하는-것)), RoundButton · LearningUnit을 누른 채 | M2-I5와 같은 색 · 지름 판정(축소 없음 + 합성 색 ±2). 이어서 **(ii)** 접근성 「애니메이션 삭제」에서도 한 번 — 막의 150 ms 전환이 플랫폼 정지와 겹쳐도 색은 **정착값**으로 보여야 한다. 끈 상태는 색 불변 · 축소만. 증거 `motion-tokens-android-M2-A5-i-*.png` · `-ii-*.png` · `-off-*.png` |
| M2-A6 | 설정 (i), loading 행(playground 또는 소셜 버튼) | 회전 유지(두 프레임 틈 각도 다름). **(ii)에서도 돌려** 보이는 대로 적는다 — 1단계 M-A4는 배율 0에서도 Lynx 페이드 중간 프레임이 보였다고 적었으므로, keyframe이 멈추는지 여기서 다시 확인한다 |
| M2-A7 | M2-I7과 같음 — 도달 길은 여정 맵 맨 위 「Episode intro」 → Next → 「Before We Land」(`EpisodeNarrativeScreen`; VN 화면에는 계속 표시가 없다) | 계속 표시 y가 같다 |

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

## 실제로 일어난 일 — 두 회차, 같은 빌드

iOS는 e2e-red 회차가, Android는 e2e-green 회차가 돌았다. 둘 다 **같은 빌드 `56960511`**(호스트 = 번들; 호스트 소스는 이 작업에서 바뀌지 않았다)이다. red 회차 때
에뮬레이터를 다른 세션이 쓰고 있어 Android는 미실행이었고, green 회차가 M2-A1 ~ M2-A7을 돌았다. 캡처 · 측정 스크립트는 저장소에 넣지 않았다 — 작업 `motion-tokens-stage2`의
산출물 `artifacts/e2e-red/`(iOS) · `artifacts/e2e-green/`(Android)에 있고 파일 이름은 위 「증거 파일 이름」 대신 `<platform>-<id>-<구분>-<n>.png` 꼴이다.

- **red는 길 1로 돌았다.** 수정 전 `49ef26be` 워크트리에서 번들을 만들어 Host.app의 번들만 교체하고(playground는 그 트리의 dev 서버) M2-I3 · M2-I4 · M2-I5 · M2-I7을 관찰했다.

  | 항목 | 수정 전 관찰(`49ef26be`) | 수정 후(`56960511`) |
  |---|---|---|
  | M2-I3 (a) | Loading 폭 296 px vs Default 242 px = **+54 px(= +18 css px, 3x)** neutral · brand · subtle, outline 302 vs 248 | 242 = 242 |
  | M2-I3 (b) | 원 + 라벨 「계속하기」가 보임 | 라벨 없음 |
  | M2-I3 (c) | 완전한 정지 원(틈 없음), 5프레임 픽셀 차 0 | 틈 각도 회전 |
  | M2-I4 | playground에 Round Button loading 행이 없음(관찰 불가) | 회전 |
  | M2-I5 켠 | active `#F46B18` · neutral `#F7F8F9` 불변(막 없음, 지름도 불변) | `#E16316` · `#E4E5E5` |
  | M2-I7 | 계속 표시 중심 y가 2148 · 2154 · 2152 · 2158로 8프레임 중 3프레임이 다름(최대 10 px 이동 = bounce) | 불변 |

  코드 근거도 같다: `round-button.css` · `button.css`의 `@keyframes`가 `49ef26be`에서 0, HEAD에서 각 1; `round-button.css`의 shade 선언 0 → 3; `visual-novel-dialog.css`의 bounce keyframe ·
  `animation: … 1000ms`는 HEAD에서 0.
- **절차가 틀렸던 곳(이 문서에 반영함)**: M2-I7 · M2-A7의 도달 길이 없었고 VN 화면에는 계속 표시가 없다(EpisodeNarrativeScreen이다); M2-I8의 `round-button.css` 행 번호는
  106이 아니라 116; Android는 100 ms 간격을 지킬 수 없어 불규칙 10프레임으로 판정했다; text 변형의 Loading 폭은 간접 근거뿐이다.
- **playground**: 두 플랫폼 모두 3000을 다른 worktree의 Rspeedy가 점유해 이 worktree의 `pnpm dev`가 **3001**에 떴다(`--port` 옵션은 없다). iOS Release Host가
  `--bundle-url=http://localhost:3001/playground.lynx.bundle`을, Android 호스트가 `am start … --es bundle-url http://10.0.2.2:3001/playground.lynx.bundle`을 그대로 열었다 —
  가정 A5 **성립**(호스트 소스 수정 없음). `apps/mobile/dist`에는 `playground.lynx.bundle`이 없어 정적 서버 길(2)은 막혀 있다. 한계: dev 번들은 `ui-lynx`를 dist 대신 src
  alias로 읽어 main 번들과 같은 산출물이 아니다(같은 HEAD 소스).
- **M2-I8 탐색의 결과는 「풀림(95 %)」** — iOS Lynx는 `transform: scale(var())`를 푼다(번들 안에 `scale( {{--libitum-motion-scale-pressed}})`가 있음을 확인했고
  눌림이 165 → 157 px로 M2-I1과 같다). Android는 탐색하지 않았다 — 3단계가 [보상 · 문항 전환 e2e](motion-reward.md) **M3-A8**로 잰다(결과는 그 문서의 결과 표). 전환 조건과
  결과 처리는 [ADR-0025](../adr/0025-ui-lynx-package-and-storybook-catalog.md) 「2026-10-09 2단계」 · 「3단계」.
- **Android (ii) 「Remove animations」(세 배율 0)에서도 spinner가 돌았다** — 이 에뮬레이터에서 배율 0은 CSS keyframe 회전을 멈추지 않는다(1단계 M-A4가 페이드 중간 프레임을 본 것과
  같은 방향). 막의 150 ms 전환도 (ii)에서 정착값으로 보였다.

## 결과

통과·실패는 `통과` / `실패: <관찰>` / `판정 불가: <이유>` / `미확인`으로만 적는다. 수치는 iOS가 시뮬레이터 px(3x), Android가 `wm size 390x844` · `density 160`으로 돌려 1 px = 1 css px다.

| 항목 | 플랫폼 | 결과 | 비고(설정 · 측정값 · 증거 파일) |
|---|---|---|---|
| M2-I1 | iOS 시뮬레이터 | 통과 | 끈. LearningUnit active surface 216 → 212 → 206 px(95.4 %); RoundButton neutral은 M2-I5 끈 회차에서 165 → 157(95 %). `ios-M2-I1-off-*`(`measure.txt`) |
| M2-I2 | iOS 시뮬레이터 | 통과 | 끈. 카드 상자 위/아래 첫 프레임 944/1678(높이 735) → 정착 933/1689(757) = 97.1 %, 1단계 e2e-green과 같은 수치(문서의 96 %는 전환점 기준으로 97.1 %로 나온다). `ios-M2-I2-off-*`(`cardbox.txt`). *(4단계 주: 이 행이 keyframe 본문 `var()` 게이트의 회귀 기준이다 — 아래 「4단계 회차」.)* |
| M2-I3 | iOS 시뮬레이터 | 통과 | 끈, playground. (a) Default/Loading 폭 neutral 242/242 · brand 242/242 · outline 248/248 · subtle 242/242, 높이 102/102 · 102/102 · 108/108 · 108/108 — **text는 간접 근거**(spinner 중심 x 713.5가 subtle과 같음). (b) 라벨 없음, 12 px 원(bbox 36 px)만 — A1 성립. (c) 5변형 모두 프레임마다 291 → 327 → 0 → 33 → 69 → 96°(≈36°/100 ms), 틈 약 78° — A3 성립. (d) VoiceOver **미확인**. `ios-M2-I3-off-playground-1.png`, `ios-M2-I3-I4-off-f00~f05.png` |
| M2-I4 | iOS 시뮬레이터 | 통과 | 끈. Round Button loading neutral · brand 291 → 330 → 0 → 36 → 69 → 99°, 틈이 보이는 호. 수정 전 playground에는 행이 없어 「틈 없는 원이었는가」는 Button(M2-I3 (c) 수정 전: 정지 원)으로만 안다. 같은 프레임 `ios-M2-I3-I4-off-*` |
| M2-I5 | iOS 시뮬레이터 | 통과 | 켠: 지름 불변(active 213 = 213, available 213 = 213, neutral 165 = 165, clear 눌린 색 bbox 213). 색(±2): clear `#35A66F` → `#319966`, active `#F46B18` → `#E16316`(기대 `#E06216`), available `#FFF0E6` → `#EBDDD4`, neutral `#F7F8F9` → `#E4E5E5`(기대 `#E3E4E5`). 아이콘 픽셀은 누르기 전과 같다(흰 픽셀 수 clear 420 = 420, active 707 = 707) — A2 성립. 끈: 색 불변, 축소 213 → 201(94 %) · 165 → 157(95 %). `ios-M2-I5-on-*`, `-off-*`, `-summary.txt` |
| M2-I6 | iOS 시뮬레이터 | 통과 | 켠, playground. Button 5변형 + Round Button neutral · brand loading 전부 75 → 111 → 147 → 174 → 210 → 249°. `ios-M2-I6-on-f00~f05.png` |
| M2-I7 | iOS 시뮬레이터 | 통과 | 끈, EpisodeNarrativeScreen 「Before We Land」. 8프레임(간격 1.0 · 0.3 · 0.7 · 0.2 · 0.45 s) 전부 화살표 bbox y 2134 ~ 2162, 첫 프레임과 다른 픽셀 0. `ios-M2-I7-off-*` |
| M2-I8(탐색) | iOS 시뮬레이터 | 풀림(95 %) | 버리는 워크트리에서 `round-button.css` 116행을 `scale(var(--libitum-motion-scale-pressed))`로 바꾼 번들. RoundButton neutral 165 → 157 px. `ios-M2-I8-probe-*`. Android는 [motion-reward.md](motion-reward.md#결과) M3-A8 행. *(4단계 주: 두 플랫폼 모두 풀려 4단계에서 전환했다 — 회귀는 아래 「4단계 회차」 소절.)* |
| (실기) M2-I3 · M2-I5 | iOS 실기 | 미확인 | 실기 없음 |
| M2-A1 | Android 에뮬레이터 | 통과 | 끈, 3초 누름 중 연속 캡처. LearningUnit active 72 → 68 px(94.4 %), 색 `#F46B18` 불변; RoundButton neutral 56 → 52(92.9 %, 정수 픽셀), 색 `#F7F8F9` 불변; available · clear 72 → 68, 색 불변. `android-M2-A1-*`, `android-M2-A5-off-*` |
| M2-A2 | Android 에뮬레이터 | 통과 | 끈, 확인창 6회(기기 안 `screencap` 루프). 중간 프레임 3회 카드 상자 폭 316 · 316 · 318, 정착 320(1단계 M-A4 끈 기준 310 ~ 318과 같다). 반투명 중간 프레임이라 96 % 정확값은 못 읽는다. `android-M2-A2-off-*`. *(4단계 주: keyframe 본문 `var()` 게이트의 회귀 기준 — 316 ~ 318 / 320이면 같은 수치, 320이면 실패.)* |
| M2-A3 | Android 에뮬레이터 | 통과(playground) | 끈. Default/Loading 폭 · 높이 neutral 84/84 · 36/36, brand 84/84 · 36/36, subtle 84/84 · 36/36, outline 86/86 · 38/38 — **text는 간접 근거**(원 중심 x 245.5가 subtle과 같음). 라벨 없음, 12 × 12 px 원만. 회전: 10프레임(0.6 ~ 0.9 s) 틈 각도 100 · 20 · 290 · 170 · 130 · 60 · 345 · 250 · 120 · 10°, 틈 약 50 ~ 70°, 다섯 변형 동기. (d) TalkBack **미확인**(시작부터 꺼져 있었고 켜지 않았다). `android-M2-A3-off-playground-1.png`, `-width-measure.txt`, `android-M2-A3-A4-off-f00~05.png`, `-gap.txt` |
| M2-A4 | Android 에뮬레이터 | 통과 | 같은 프레임에서 Round Button neutral · brand loading 10프레임 틈 각도가 변함(원 12 px, 틈 보임). `android-M2-A3-A4-off-gap.txt` |
| M2-A5 | Android 에뮬레이터 | 통과 | (i) `transition_animation_scale 0` · `animator 1`: 지름 불변(active 72 = 72, RB 56 = 56, clear 72 = 72, available 72 = 72), 색(±2) active → `#E16316`, RB → `#E4E5E5`, available → `#EBDDD4`(정확), clear → `#319966`(정확); 아이콘 픽셀 불변(active 191 = 191, clear 211 = 211) — A2 성립. (ii) 「Remove animations」(세 배율 0.0): 같은 정착값, 아이콘 불변. 끈: 색 불변 + 축소만(72 → 68 · 56 → 52). `android-M2-A5-i-*`, `-ii-*`, `-off-*` |
| M2-A6 | Android 에뮬레이터 | 통과 | (i) Button 5변형 + Round Button neutral · brand loading, 두 번 각 10프레임(0.6 ~ 1.3 s) 틈 각도 계속 변함. (ii) 세 배율 0.0에서도 150 · 30 · 280 · 180 · 190 · 130 · 30 · 340 · 260 · 190° — **돈다**(기록: 배율 0이 CSS keyframe을 멈추지 않는다). `android-M2-A6-a6_i-*`, `-a6_i2-*`, `-a6_ii-*` |
| M2-A7 | Android 에뮬레이터 | 통과 | 끈. 「Episode intro」 → Next → 「Before We Land」. 화살표 bbox x 339 ~ 346, y 691 ~ 699, 주황 픽셀 40개 — 24프레임(1.15 · 0.75 · 0.45 s 회차 각 8프레임) 전부 같음. 수정 전은 bounce(4 px). `android-M2-A7-off-*` |

| 칸 | 값 |
|---|---|
| 시작 값(실행 전 기록) | iOS 동작 줄이기: 0(꺼짐) / Android `animator_duration_scale`: `null` · `transition_animation_scale`: 1.0 · `window_animation_scale`: 1.0, `font_scale` 1.0, `accessibility_enabled` 0(TalkBack 꺼짐), `navigation_mode` 2(안 바꿈) |
| Android playground (가정 A5) | **열었다** — `apps/mobile/src/playground/current.ts`를 `"catalog:button"`으로 임시 변경 → `pnpm dev`(3001) → `am start -n libitum.duru.android/com.libitum.host.MainActivity --es bundle-url http://10.0.2.2:3001/playground.lynx.bundle`. 호스트가 `bundle-url` extra를 받아 http 번들을 그대로 열었다(호스트 소스 수정 없음). `dist`에는 `playground.lynx.bundle`이 없어 길 2는 불가 |
| 확인자 | test-runner 에이전트(iOS는 e2e-red 회차, Android는 e2e-green 회차) |
| 날짜 | 2026-10-09 |
| 빌드 SHA (호스트 · 번들) | 호스트 = 번들 = `56960511`(두 플랫폼). 번들은 로그인을 위해 `PUBLIC_SUPABASE_URL=https://localhost:18791`(iOS, 모의 TLS 서버) · `https://example.invalid`(Android)로 빌드 |
| 기기 · OS · 빌드 종류 | iPhone 17 Pro 시뮬레이터(iOS 26.5, 전용 `motion-stage2`) · **Release** Host(`CODE_SIGNING_ALLOWED=NO`, pod install 안 함) + `--bundle-url=main.lynx` / Pixel_8 AVD `emulator-5554` API 37 · debug + androidTest, `wm size 390x844` · `density 160`, 정적 서버 18792 |
| 설정 복원 확인 | iOS 0 → 0, 전용 시뮬레이터 `shutdown` · `delete`(목록 0건), 모의 서버 종료, 탐색 워크트리 삭제. Android 전역 · 보안 · 시스템 설정 끝 덤프가 시작 덤프와 `diff` 동일(`wm size` · `density` reset, 「Remove animations」 끔). 두 플랫폼 모두 `current.ts` 원복, 3001 dev 서버 종료(3000의 다른 worktree 서버는 그대로), `git status --short` 0줄 |

### 4단계 회차 — scale `var()` 전환 뒤 회귀(iOS · Android), 기준 `2debe051` 대조

4단계([ADR-0053](../adr/0053-motion-policy.md) D6)가 `round-button.css` · `learning-unit.css`의 눌림 `scale(0.95)`와 `dialog.css` enter from · exit to의 `scale(0.96)`을
`scale(var(--libitum-motion-scale-pressed | enter))`로 바꿨다(배지 `scale(0.8)`은 [보상 · 문항 전환 e2e](motion-reward.md#결과)의 「4단계 회차」). 값이 토큰과 같아 **달라야 하는 것은 없고**
아래 행은 전부 회귀다 — 통과 기준은 위 결과 표와 **같은 수치(±같은 오차)** 이지 95 · 96의 정확값이 아니다. 하나만 다르다: **M2-I2 · M2-A2는 keyframe 본문 `var()`의 기기 게이트를 겸한다** —
첫 프레임이 100 %(안쪽 아님)면 통과가 아니라 **실패**이고 4단계 fallback(keyframe 셋만 리터럴 복귀 — D6)이 선다. iOS는 구현 전 탐색이 Dialog enter 첫 프레임 하단 1678(위 M2-I2 기록과 일치)로
풀림을 봤고, Android keyframe은 이 회차가 처음 본다. 눌림(M2-I1 · M2-A1)은 일반 규칙이라 두 플랫폼 모두 근거가 있다(M2-I8 · M3-A8).

수정 전 대조는 기준 `2debe051`(3단계 병합)이고 호스트는 불변(`d602fe08` 이후)이다. **결과 행은 실행 회차가 채운다 — 「실행 중」인 행은 통과가 아니다.**

#### iOS

| 항목 | 플랫폼 | 결과 | 비고(설정 · 측정값 · 증거 파일) |
|---|---|---|---|
| M2-I1 | iOS 시뮬레이터 | 실행 중 — 실행 회차가 채운다 | RoundButton neutral 165 → 157 px(95 %) · LearningUnit 216 → 206(95.4 %) — 일반 규칙 `var()` |
| M2-I2 — keyframe 게이트 | iOS 시뮬레이터 | 실행 중 — 실행 회차가 채운다 | 카드 상자 첫 프레임 하단 1678 · 전환점 97.1 %. **100 %(안쪽 아님)면 실패**(D6 fallback) |

| 칸 | 값 |
|---|---|
| 시작 값(실행 전 기록) | 실행 중 — 실행 회차가 채운다 |
| 확인자 | 실행 중 — 실행 회차가 채운다 |
| 날짜 | 실행 중 — 실행 회차가 채운다 |
| 빌드 SHA (호스트 · 번들) | 실행 중 — 실행 회차가 채운다 |
| 기기 · OS · 빌드 종류 | 실행 중 — 실행 회차가 채운다 |
| 설정 복원 확인 | 실행 중 — 실행 회차가 채운다 |

#### Android

| 항목 | 플랫폼 | 결과 | 비고(설정 · 측정값 · 증거 파일) |
|---|---|---|---|
| M2-A1 | Android 에뮬레이터 | 실행 중 — 실행 회차가 채운다 | RoundButton neutral 56 → 52 px · LearningUnit 72 → 68 — 일반 규칙 `var()` |
| M2-A2 — keyframe 게이트 | Android 에뮬레이터 | 실행 중 — 실행 회차가 채운다 | 중간 프레임 카드 상자 폭 316 ~ 318 / 정착 320. **320(안쪽 아님)이면 실패**(D6 fallback) — Android keyframe `var()`의 첫 기기 근거 |

| 칸 | 값 |
|---|---|
| 시작 값(실행 전 기록) | 실행 중 — 실행 회차가 채운다 |
| 확인자 | 실행 중 — 실행 회차가 채운다 |
| 날짜 | 실행 중 — 실행 회차가 채운다 |
| 빌드 SHA (호스트 · 번들) | 실행 중 — 실행 회차가 채운다 |
| 기기 · OS · 빌드 종류 | 실행 중 — 실행 회차가 채운다 |
| 에뮬레이터 점유 확인 · 알림 | 실행 중 — 실행 회차가 채운다 |
| 설정 복원 확인 | 실행 중 — 실행 회차가 채운다 |
