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
*(2026-10-11 주: 숨김은 inline `opacity: 0`으로 바뀌었고 래퍼는 `width/height: 100%`다 — `hug` 행만 보던 M2-I3이 놓친 `fill` · 아이콘 조합은 아래 「눌림 확장 회차」 M5-I4가 본다.)*

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
  기기 없는 회차에는 「미확인」으로 남긴다. *(2026-10-11 주: 숨김이 `opacity: 0`으로 바뀌어 iOS의 `view.hidden` 근거는 더 이상 서지 않는다 — 루트 `isAccessibilityElement` 잎 근거만
  남고, 두 플랫폼 모두 실기 미확인이다.)*
- **눌림 확장 회차의 Android**(M5-A1 ~ M5-A6): 절차만 적었고 실행하지 않았다 — 결과 칸은 「미확인」이고 통과로 읽지 않는다. iOS에서도 켠 상태의 로딩 스피너(M5-I6)는
  미측정이다(아래 결과 표의 사유).

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
| Button brand(눌림 확장 회차) | `#F46B18` | `#E06216`(black 막) |
| Button neutral(〃) | `#2A3038` | `#3B4148`(**white** 막 — 어두운 면의 black 8 %는 Δ 3 ~ 4라 보이지 않는다) |
| 롤플레이 열린 카드(〃) | `#2A3038` | `#3B4148`(white 막) |

색만 바뀌는 자리(막 없음): OptionSelector outlined 항목 · 문장 순서 bank 칩 · Card interactive → `#F7F8F9`(`gray-100`). 눌림 확장 회차부터 막 · 색의 기대값은
[ADR-0053](../adr/0053-motion-policy.md) 정정 기록 1이 진다.

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
    *(2026-10-11 주: 이 행은 전부 `hug` · size m · 아이콘 없음이다. 제품의 로딩 버튼 다섯 자리는 전부 `xl` · `fill`(넷은 아이콘)이고 그 조합에서는 스피너가 왼쪽에 붙고 라벨이 보였다 —
    네 변 `0` 절대 배치가 `fill` surface에서 서지 않고 `<text>`의 `visibility: hidden`이 글자를 지우지 않았다(2026-10-10 시뮬레이터). 숨김은 inline `opacity: 0`, 래퍼는 `width/height: 100%`로
    바뀌었고 playground에 「Button · fill · icon · loading」 행이 생겼다 — 아래 「눌림 확장 회차」 M5-I4.)*
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
| M2-I1 | iOS 시뮬레이터 | 통과(RoundButton) / 미확인(LearningUnit) | RoundButton neutral 165 → 157 px(95 %) · LearningUnit 216 → 206(95.4 %) — 일반 규칙 `var()` 실측: RoundButton neutral 165 → 157 px(2회, 1 px 정확 168 → 158) · 색 `#F7F8F9` 불변. LearningUnit은 이 회차에서 재지 않았다(같은 선언 꼴). `motion-s4-ios-M2-I1-off-*` |
| M2-I2 — keyframe 게이트 | iOS 시뮬레이터 | 통과(게이트 통과) | 카드 상자 첫 프레임 하단 1678 · 전환점 97.1 %. **100 %(안쪽 아님)면 실패**(D6 fallback) 실측: 첫 보이는 프레임 카드 상자(그림자 포함) 930 × 747 → 정착 1003 × 779(높이비 95.9 %), 하단 전환점 1678(기록 1678) → 942/1680 → 933/1689. 첫 프레임부터 100 %인 회차 0. `motion-s4-ios-M2-I2-off-*` |

| 칸 | 값 |
|---|---|
| 시작 값(실행 전 기록) | iOS 동작 줄이기 0(켬은 M2-I5 구간만 — `defaults write … ReduceMotionEnabled -bool true` + 재부팅, 읽기값 1; 끝 값 0) |
| 확인자 | test-runner 에이전트(e2e-red 회차, iOS 회귀) |
| 날짜 | 2026-10-10 |
| 빌드 SHA (호스트 · 번들) | 호스트 `91262f72`(소스는 1단계 `d602fe08` 이후 불변) / 번들 `d649e114` 코드(= `91262f72`, 그 뒤 커밋은 테스트 · 문서뿐) · 1,403,113 B. 수정 전 대조 없음(회귀 — 2 · 3단계 기록과 대조) |
| 기기 · OS · 빌드 종류 | iPhone 17 Pro 시뮬레이터(전용 `motion-stage4`) · iOS 26.5 · Release Host + 내장 번들(`--bundle-url=main.lynx`), 모의 TLS 서버 18791로 로그인 시드. 각 항목 2회 |
| 설정 복원 확인 | 시뮬레이터 shutdown · delete(목록 0건), 동작 줄이기 0, 모의 서버 종료, `git status --short` 0줄 |

#### Android

| 항목 | 플랫폼 | 결과 | 비고(설정 · 측정값 · 증거 파일) |
|---|---|---|---|
| M2-A1 | Android 에뮬레이터 | 통과(RoundButton) / 미확인(LearningUnit) | RoundButton neutral 56 → 52 px · LearningUnit 72 → 68 — 일반 규칙 `var()` 실측: RoundButton neutral 56 → 52 px · 색 `#F7F8F9` 불변(2회). LearningUnit은 이 회차에서 재지 않았다. `motion-s4-android-M2-A1-off-*` |
| M2-A2 — keyframe 게이트 | Android 에뮬레이터 | 통과(게이트 통과) | 중간 프레임 카드 상자 폭 316 ~ 318 / 정착 320. **320(안쪽 아님)이면 실패**(D6 fallback) — Android keyframe `var()`의 첫 기기 근거 실측: `screencap` 루프 8회 중 6회 중간 프레임 폭 312 · 318 · 316 · 318 · 318 · 318, 영상 2회 308 → 312 → 318 → 320 · 308 → 314 → 316 → 320(정착 320). 첫 프레임부터 320인 회차 0 — Android keyframe 본문 `var()` 풀림을 처음 확인. `motion-s4-android-M2-A2-off-*` |

| 칸 | 값 |
|---|---|
| 시작 값(실행 전 기록) | `animator_duration_scale=null` · `transition_animation_scale=1.0` · `window_animation_scale=1.0` · `font_scale=1.0` · `wm size 1080x2400` · `density 420` · `accessibility_enabled=0` · `enabled_accessibility_services=null`(끝 값 전부 같음 — 전후 덤프 diff 0) |
| 확인자 | test-runner 에이전트(e2e-green 회차, Android 회귀) |
| 날짜 | 2026-10-10 |
| 빌드 SHA (호스트 · 번들) | 호스트 `543b5762`(소스는 1단계 `d602fe08` 이후 불변) / 번들 `d649e114` 코드(= `543b5762`, 그 뒤는 테스트 · 문서) · 1,403,113 B(iOS 회차와 같은 크기). 수정 전 대조 없음(회귀) |
| 기기 · OS · 빌드 종류 | `emulator-5554`(Pixel_8, API 37) · Debug Host(`assembleDebug`, `bundle:android`) + 정적 서버 18792 · 로그인 픽스처 `SignedInScreenFixtureTest` · `wm size 390x844` · `wm density 160`(1 px = 1 css px) · `screenrecord`(변화 시 ≈12 fps) + 기기 안 `screencap` 루프 |
| 에뮬레이터 점유 확인 · 알림 | 다른 세션의 반납 알림을 받고 시작 · 사용 중 알림 · 끝에 원복 후 반납 알림 |
| 설정 복원 확인 | 세 배율 · wm size · density 시작 값으로 원복(빈 `display_size_forced` · `display_density_forced` 키 삭제), 알림 권한 revoke, 전후 덤프 diff 0, 서버 18792 종료, 홈 화면(앱은 이 회차 빌드로 남김), `git status --short` 0줄 |

### 눌림 확장 회차(2026-10-11) — 다섯 대상의 95 % 눌림 · reduced 막 또는 색 · Button 로딩 스피너 중앙, 기준 `ab1c7994` 대조

[ADR-0053](../adr/0053-motion-policy.md) 정정 기록 1이 Button(전 variant) · Card interactive · OptionSelector 항목 · 문장 순서 bank 칩 · 롤플레이 열린 카드의 `:active`에
`scale(var(--libitum-motion-scale-pressed))`를 더하고, reduced에서는 막(Button neutral · brand · 롤플레이 카드) 또는 기존 색만 남기며, Button 로딩 래퍼를 `width/height: 100%` ·
숨김을 `opacity: 0`으로 바꿨다. 기기만 아는 것 셋을 본다 — (1) Lynx가 새 다섯 자리(`fill` surface · 카드 루트 · `flex: 1 1 0` 항목 · 칩 · 고정 160 px 카드)에서 일반 규칙
`transform: scale(var())`를 그리는가, (2) `position: relative` 안의 절대 `width/height: 100%` 박스가 surface를 받는가(래퍼 · 막), (3) `<text>` inline `opacity: 0`이 글자를 지우는가.
전제 · 도구 · 켬/끔 절차는 위 「전제」와 [동작 줄이기 e2e](motion-reduced.md) 그대로이고, 막 색 기대값은 전제 5의 표(눌림 확장 행)다. **iOS는 실행했고 Android는 절차만 적었다**(실행 후속).

**켬 전환은 설정 앱 손 조작 없이 된다** — 이 회차가 확인했다: `xcrun simctl spawn "$UDID" defaults write com.apple.Accessibility ReduceMotionEnabled -bool true` 뒤 앱을 재실행하면
호스트가 값을 읽어 막 · 축소 없음으로 바뀐다(4단계 회차는 같은 `defaults write` 뒤 재부팅을 썼다 — 재부팅은 필요 없다). 끌 때는 `-bool false`로 되돌리고 다시 재실행한다.
[동작 줄이기 e2e](motion-reduced.md)의 「`simctl`로 켜는 수단은 없다」 문장은 이 발견으로 정정했다.

**증거 파일 이름**: `motion-tokens-ios-M5-<id>-<off|on>-<대상>-<before|press>.png`(예 `motion-tokens-ios-M5-I5-on-neutral-press.png`), M5-I4는 `-catalog` · `-fill` · `-frame-1` · `-frame-2`.
22장 전부 저장소 밖 작업 산출물에 보관했다 — 위 M2 행과 같은 방식(저장소에 복사하지 않는다). 측정 요약은 같은 곳의 `measure.txt`.

**red의 근거(비공허)**: 눌림 넷(M5-I1 ~ M5-I3 · M5-I5의 축소 없음)은 코드 근거다 — 기준 `ab1c7994`의 다섯 CSS 파일(`button.css` · `card.css` · `option-selector.css` ·
`sentence-order-chip.css` · `roleplay-card.css`)에 `scale-pressed` 문자열 0건, HEAD에서 각 1건; reduced 막 선언 0건. 로딩(M5-I4)은 **기기 관찰**이다 — 2026-10-10 시뮬레이터 스크린샷
작업에서 제품 로딩 버튼(`xl` · `fill` · 아이콘)의 스피너가 왼쪽에 붙고 라벨이 보였다(기준 `ab1c7994`의 `button.css` 래퍼는 네 변 `0`, `Button.tsx`는 `visibility: hidden`).
수정 전 번들로 M5 항목을 다시 돌리지는 않았다.

#### iOS 절차(시뮬레이터 iPhone 17 Pro)

측정은 `idb ui tap --duration 4` 중 2 s 시점 캡처(전환 150 ms가 정착한 뒤), 폭은 surface 색(또는 배경과 다른 픽셀)의 bbox다. 단위는 물리 px(3x).

| id | 조작(끔 = 동작 줄이기 0) | 판정 |
|---|---|---|
| M5-I1 | 끔. Button neutral `xl` · `fill`(온보딩 Next)과 brand `xl` · `fill`(playground `catalog:button` 「Button · fill」)을 누르기 전 한 장 · 누른 채 한 장 | surface 폭 **95 % ± 1 %**(누르기 전 대비), 색 불변(neutral `#2A3038` · brand `#F46B18`). 수정 전 100 % |
| M5-I2 | 끔. OptionSelector outlined 항목(unselected — 설정 › Send feedback의 「3 · Okay」)과 문장 순서 bank 칩(playground `tutorial-practice`의 greeting) | 폭 95 % ± 1 %, 색은 기존 pressed `#FFFFFF` → `#F7F8F9`. 수정 전 100 % |
| M5-I3 | 끔. 롤플레이 목록의 열린 카드(튜토리얼 완료 계정) · 잠긴 카드 | 열린 카드 160 → 152 ± 2 css px(95 %), 색 `#2A3038` 불변; 잠긴 카드 160 = 160. 수정 전 둘 다 160 |
| M5-I4 | 끔. playground `catalog:button`의 brand Loading(2행 3열, `hug`)과 새 행 「Button · fill · icon · loading」(Default · Loading), Loading은 150 ms 간격 두 프레임 더 | 스피너 중심 x = surface 중심 x ± 1 css px; 라벨 · 아이콘 픽셀 0(스피너 픽셀만 남음); 폭 · 높이 = 같은 행 Default ± 1 px; 두 프레임 스피너 영역이 다름(회전). 수정 전: `fill` 행에서 스피너 왼쪽 · 라벨 보임 |
| M5-I5 | **켬**(위 `defaults write` + 재실행). M5-I1의 neutral · brand 버튼(brand는 에피소드 인트로 Next) · 롤플레이 열린 · 잠긴 카드 · OptionSelector 항목 · bank 칩 — 누르기 전 / 누른 중(정착 뒤) | 폭 전부 **100 %**. 막(±2): brand `#F46B18` → `#E06216`, neutral `#2A3038` → `#3B4148`, 열린 롤플레이 카드 `#2A3038` → `#3B4148`(글자 픽셀 불변); 잠긴 카드 색 불변(막 없음); 색만: OptionSelector · 칩 → `#F7F8F9`. 끔에서 막이 보이면 실패 |
| M5-I6 | 켬. M5-I4 행 | 회전 유지(두 프레임 다름) · 중앙 · 라벨 없음 |

#### Android 절차(에뮬레이터 Pixel_8 API 37 — 이 회차 **실행하지 않았다**)

| id | 절차 | 결과 칸 |
|---|---|---|
| M5-A1 ~ M5-A6 | iOS와 같은 조작과 판정. [Android 준비](motion-reduced.md#android-준비-에뮬레이터-pixel_8-api-37)(`wm size 390x844` · `density 160`, 세 배율 기록 · 복원) 그대로, 누른 채 `A shell input swipe x y x y 3000` 중 기기 안 `screencap` 루프. 켬은 M2-A5와 같이 (i) `transition_animation_scale 0` · `animator_duration_scale 1`, 이어서 (ii) 「Remove animations」. playground는 위 「playground 실행 경로」(가정 A5 성립 — `10.0.2.2:<port>`) | **미확인(실행 후속)** — 통과로 읽지 않는다. 1 px = 1 css px라 M5-I3 기대값은 160 → 152 그대로 |

#### 결과 — iOS

| 항목 | 플랫폼 | 결과 | 비고(설정 · 측정값 · 증거 파일) |
|---|---|---|---|
| M5-I1 | iOS 시뮬레이터 | 통과 | 끔. neutral `xl` `fill`(온보딩 Next) 320 → 304 px(**95.0 %**), 색 `#2A3038` 불변; brand `xl` `fill`(playground 「Button · fill」) 1086 → 1030(**94.8 %**), 색 `#F46B18` 불변. `ios-M5-I1-off-neutral-*`, `-off-brand-*` |
| M5-I2 | iOS 시뮬레이터 | 통과 | 끔. OptionSelector outlined 항목(Send feedback 「3 · Okay」) 1110 → 1054(**95.0 %**), 색 `#FFFFFF` → `#F7F8F9`; bank 칩(playground tutorial-practice greeting) 284 → 270(**95.1 %**), 색 `#FFFFFF` → `#F7F8F9`. `ios-M5-I2-off-*`, `-off-chip-*` |
| M5-I3 | iOS 시뮬레이터 | 통과(열린 카드) | 끔, 튜토리얼 완료 계정. 열린 카드 480 → 456(**95.0 %** = 160 → 152 css px), 색 `#2A3038` 불변. 잠긴 카드의 끔 폭은 이 회차에 따로 재지 않았다(켬 회차 M5-I5에서 480 = 480). `ios-M5-I3-off-*` |
| M5-I4 | iOS 시뮬레이터 | 통과 | 끔, playground. brand Loading(`hug`, 2행 3열): surface 폭 242 = Default 242, surface 중심 x 712.5 / 스피너 bbox 중심 x 709.5(차 3 물리 px = 1 css px) · 중심 y 389.5 = 389.5; 라벨 픽셀 1236 → 322(스피너만). 「Button · fill · icon · loading」: surface 폭 1086 = Default 1086, 중심 x 602.5 = 스피너 602.5, 중심 y 2279.5 / 2280.5; 라벨 · 아이콘 픽셀 2095 → 322; 150 ms 두 프레임 스피너 영역 차 264 px(회전). 가정 (2) · (3) 성립. `ios-M5-I4-catalog`, `-fill`, `-frame-1`, `-frame-2` |
| M5-I5 | iOS 시뮬레이터 | 통과 | 켬(`ReduceMotionEnabled=1` + 앱 재실행). neutral(온보딩 Next) 320 = 320, 색 `#2A3038` → **`#3B4048`**(기대 `#3B4148` ±2 — 흰 막 성립); brand(에피소드 인트로 Next) 813 = 813, 색 `#F46B18` → **`#E06216`**(기대값과 같음); 롤플레이 **잠긴** 카드 480 = 480, 색 `#2A3038` 불변(막 없음); OptionSelector 항목 1110 = 1110, 색 `#FFFFFF` → `#F7F8F9`(색만). 2차 회차(튜토리얼 완료 계정의 시뮬레이터에서 같은 방법으로 켬): 롤플레이 **열린** 카드 480 = 480, 색 `#2A3038` → **`#3B4048`**(흰 막), 제목의 흰 글자 픽셀 9028 → 9051(막이 글자 아래 — 글자 불변); bank 칩(레슨 1 다시 열기) 284 = 284, 색 `#FFFFFF` → `#F7F8F9`(색만). 끔에서 막 없음은 M5-I1 ~ M5-I3의 색 불변이 진다. `ios-M5-I5-on-neutral-*`, `-on-brand-*`, `-on-locked-*`, `-on-option-*`, `-on-open-*`, `-on-chip-*` |
| M5-I6 | iOS 시뮬레이터 | **미측정** | playground 엔트리에는 `MotionProvider`가 없어 playground는 늘 standard다 — 켬 상태의 로딩 행을 reduced로 볼 수 없다. 끔 상태의 회전은 M5-I4가 봤다. 제품 로딩 버튼은 요청 중에만 보여 이 회차에 잡지 못했다 |
| M5-A1 ~ M5-A6 | Android 에뮬레이터 | 미확인 | 실행하지 않았다(절차만) |

| 칸 | 값 |
|---|---|
| 시작 값(실행 전 기록) | iOS 동작 줄이기 0(켬은 M5-I5 구간만 — `simctl spawn … defaults write … ReduceMotionEnabled -bool true` + 앱 재실행) |
| 확인자 | test-runner 에이전트(iOS 수동 회차) |
| 날짜 | 2026-10-11 |
| 빌드 SHA (호스트 · 번들) | 번들 `17754f84`(브랜치 `feat/press-motion`, 그 뒤 커밋은 예산 · 보고서 · 문서) / 호스트 불변(1단계 `d602fe08` 이후). 수정 전 대조는 위 「red의 근거」(코드 근거 + 2026-10-10 관찰) |
| 기기 · OS · 빌드 종류 | iPhone 17 Pro 시뮬레이터 · iOS 26.5 · 3x. 눌림은 `idb ui tap --duration 4` 중 2 s 시점 캡처, 폭은 surface 색 bbox |
| Lynx 로그 | 이번 변경의 CSS 선택자 파싱 실패 0 — 「CSS selector parse failed」는 기존 `:focus-visible` 규칙 10종뿐 |
| 설정 복원 확인 | 1차 회차의 전용 시뮬레이터는 `delete`(끝 값 안 읽음). 2차 회차의 시뮬레이터는 끝에 `ReduceMotionEnabled`를 `false`로 되돌리고 `defaults read`로 0 확인. 모의 서버 · 3001 dev 서버 종료, playground `current.ts` · 임시 설정 파일 원복, `git status --short` 0줄 |
