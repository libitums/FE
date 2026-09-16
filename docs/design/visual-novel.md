# 카페 도착 비주얼 노벨 특별 유닛 — 토큰·시각 계약

- 대상: 여정 맵의 `VisualNovelMapItem`과 `VisualNovelScreen` · `VisualNovelScene` ·
  `DialoguePanel`
- 단위: `cafe-arrival-visual-novel`, 제목 `카페에 도착한 지민`
- 기준 흐름: `arrive` → `find` → `enter`의 고정 3장면. 분기·호감도·선택지·채점·애니메이션·
  오디오는 없다. `enter` 장면에 닿는 전이가 완료를 건다.
- 디자인 단일 출처: harness `profiles/frontend/knowledge/DESIGN.md`,
  `@libitums/design-tokens` **0.2.0**, ADR-0014·0015·0016·0020·0022·0023·0024,
  `docs/screens.md`의 특별 유닛 저충실도 화면 설명, 기존 메신저·전화 특별 유닛
- 이 문서가 지는 것: 토큰 사용, 레이어·상태별 시각 구성, 이미지 생성 명세와 교체 가능한
  번들 경계. 상태 전이·props·테스트 ID와 제품 구현은 specification이 진다.

## 0. 디자인 증거와 결론

별도 비주얼 노벨 와이어프레임은 이 기준 저장소에 없다. 확인 가능한 저충실도 근거는
`docs/screens.md`의 「특별 유닛 = 비주얼 노벨 · 메신저 · 전화 통화」와 「같은 여정 맵 세로
줄의 별도 항목」뿐이다. 따라서 새 내비게이션 틀을 만들지 않고 기존 특별 유닛의 맵 항목과
안전영역 안 단일 화면을 잇되, 비주얼 노벨에 필요한 **배경 / 캐릭터 / 대화 패널** 세 레이어만
명시적으로 고정한다.

새 design-system 토큰은 **0건**, 새 전역 프리미티브도 **0건**이다. 이미지 픽셀 치수와 생성
좌표는 교체 가능한 미디어 제작 계약이므로 토큰 대상이 아니며, 제품 CSS에 복사할 생값이
아니다. 제품 시각 값은 아래의 기존 토큰만 사용한다.

## 1. 재사용 토큰

### 1.1 색과 대비

| 토큰 | 사용처 | 0.2.0 값으로 확인된 대비 |
|---|---|---|
| `--libitum-color-background-primary` | 화면 및 이미지 로딩·오류 fallback 면 | — |
| `--libitum-color-background-elevated` | 상단 정보 행, 대화 패널, 맵 항목 면 | — |
| `--libitum-color-fg-neutral` | 제목·화자·대사 | primary 위 **16.82:1**, elevated 위 **15.65:1** |
| `--libitum-color-fg-neutral-muted` | `맵으로`·진행·계속 안내·완료 낱말 | primary 위 **6.53:1**, elevated 위 **6.07:1** |
| `--libitum-color-brand-strong` | 맵 항목 경계, 다시 보기 버튼 면 | primary 위 **5.38:1** |
| `--libitum-color-fg-neutral-inverted` | 다시 보기 버튼 라벨 | brand-strong 위 **5.46:1** |
| `--libitum-color-border-default` | 상단 정보 행·대화 패널 경계 | primary 위 **3.80:1** |
| `color.fg.brand` (TS) | 맵 종류 아이콘 | elevated 위 **5.01:1** |
| `color.feedback["correct-text"]` (TS) | 맵 완료 tick | elevated 위 **6.42:1** |

텍스트는 그림 위에 직접 놓지 않는다. 상단 정보와 대화는 불투명한 token surface 위에 놓아
생성 이미지의 밝기와 무관하게 WCAG AA를 유지한다. 팔레트에 승인된 scrim 토큰이 없으므로
임의 rgba·opacity·gradient overlay를 만들지 않는다. 완료는 색 외에 tick과 `완료됨` 낱말,
접근성 이름 접미사를 함께 쓴다.

### 1.2 간격·치수·선·모서리

`--libitum-layout-screen-padding-top` · `-x` · `-bottom` ·
`--libitum-layout-gap-block` · `--libitum-layout-gap-inline` ·
`--libitum-spacing-4` · `-8` · `-12` · `-16` · `-24` · `-48` · `-64` ·
`--libitum-radius-md` · `--libitum-radius-lg` · `--libitum-stroke-width-thin` ·
`--libitum-icon-size-md`.

`spacing-48`은 기존 나가기·주 액션의 터치 영역 하한이고 `spacing-64`는 기존 특별 맵 항목의
최소 높이다. 이미지 레이어는 화면 stage가 치수를 정하고, 원본 bitmap 치수를 CSS 치수로
쓰지 않는다.

### 1.3 타이포

| scale | 사용처 |
|---|---|
| `heading-s` | 화면 제목 |
| `dialogue-speaker` | 화자 `지민` |
| `dialogue-body` | 장면별 대사 |
| `label-m` | `맵으로`·장면 진행·맵 완료 낱말 |
| `label-l` | 맵 항목 제목 |
| `button-xl` | `처음부터 보기` |

모두 실제 발화이므로 대화는 `body-*`가 아니라 기존 `dialogue-*` 의미 scale을 쓴다. 줄 수·
높이를 제한하거나 글자 크기를 줄이지 않는다.

### 1.4 그림자와 모션

그림자, transition, fade, pan, zoom, 표정 교차 용해, 타자 효과를 모두 쓰지 않는다. 장면 전이는
배경·캐릭터·대사를 같은 상태 전이에서 즉시 교체한다. 따라서 reduced-motion 전용 분기도
필요 없고, 앱의 모션 감소 설정과 관계없이 같은 정적 화면이 나온다.

## 2. 레퍼런스 레이아웃과 안전영역

Host의 Lynx view는 iOS `safeAreaLayoutGuide.layoutFrame` 안에 배치된다. 이 화면은 그 안에서
`flex: 1`로 앱 콘텐츠 영역을 채우며 아래의 기존 BottomNavigator 위에 선다. 노치·상태 표시줄·
홈 인디케이터를 다시 추정해 별도 inset 생값을 더하지 않는다.

```text
┌──────────────────────────────────────┐  ← Host safe-area 안 app-content
│ [맵으로] 카페에 도착한 지민          │  불투명 상단 정보 행 — 나가기 │ 제목 묶음
│          장면 1 / 3                  │  (제목 묶음: 제목 위 · 진행 아래)
├──────────────────────────────────────┤
│                                      │
│      cafe-exterior-day (aspectFill)  │
│                                      │
│           jimin-neutral (aspectFit)  │  투명 PNG, 아래 가운데
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 지민                              │ │
│ │ 여기가 우리가 만나기로 한        │ │
│ │ 카페예요.                         │ │  불투명 DialoguePanel
│ │              [        다음       ] │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

화면은 `[고정] 상단 정보 행 / [남는 영역] VisualNovelScene`의 두 구획이다. scene 안에서는
배경 → 캐릭터 → 대화 패널 순서의 세 레이어를 `position: absolute`와 `z-index`로 겹친다.
Lynx가 지원하는 속성만 사용한다. 배경과 캐릭터는 load/error 상태가 필요하므로 CSS
`background-image`가 아니라 resolved size를 가진 `<image>`로 렌더한다.

- 상단 정보 행은 화면의 `screen-padding-top`/`-x`를 적용하고, row +
  `gap: layout-gap-inline`, `background-elevated`, 아래 `stroke-width-thin` 경계다. 흐름 자식은
  나가기와 제목 묶음 둘이다(§4.1).
- scene은 `position: relative`, `flex: 1`, `overflow: hidden`, fallback 면
  `background-primary`다. 이미지의 고유 크기로 scene 높이를 정하지 않는다.
- scene의 네 가장자리는 이미 Host safe area 안이다. 대화 패널은 좌우·아래
  `screen-padding-x`/`screen-padding-bottom`만큼 안쪽에 둔다.
- iPhone 17 Pro 402×874pt와 지원 하한 iPhone 13 mini 375×812pt에서 우선 검증한다.
  두 기기 모두 BottomNavigator를 포함한 실제 `app-content` 높이로 확인한다.

## 3. `VisualNovelMapItem`

`appointment-confirmation-phone-call` 뒤, `directions` 앞의 같은 맵 세로 줄에 선다. 일반
`JourneyStepNode`의 불리언 변형이 아니며 `available | completed`만 쓴다.

| 자리 | 시각 계약 |
|---|---|
| 루트 | `width: 100%`, `min-height: spacing-64`, row, 가운데 정렬, `gap: layout-gap-inline`, `padding: spacing-16`, `radius-lg`, `stroke-width-thin` solid `brand-strong`, 면 `background-elevated`, 축소 금지 |
| 종류 아이콘 | `@libitums/icons/lynx/book` (0.2.0에 존재 확인), `icon-size-md` + `color.fg.brand`. 전체 icon barrel을 import하지 않는다 |
| 제목 | `카페에 도착한 지민`, `label-l` + `fg-neutral`, 남은 폭에서 여러 줄 |
| 완료 묶음 | 완료일 때만 tick + `완료됨`; `gap: spacing-4`, `icon-size-md` + `feedback.correct-text`, 낱말 `label-m` + `fg-neutral-muted`, 축소 금지 |

완료 전에는 완료 묶음의 빈 공간을 예약하지 않는다. 완료 후에도 항상 다시 들어갈 수 있고
면·경계·종류 아이콘은 바뀌지 않는다. 제목은 말줄임표 없이 줄바꿈하며 가로 스크롤을 만들지
않는다. 완료는 새 CSS 상태 클래스 대신 조건부 묶음과 `data-status`가 각각 시각과 관찰을 진다.

## 4. `VisualNovelScreen`

### 4.1 상단 정보 행

> **2026-09-15 LIB-255 재배치.** 나가기를 머리 위 절대 배치에서 머리 행의 첫 흐름 자식으로
> 옮기고 제목의 고정 여백을 지웠다. 큰 글자 배율에서 나가기 글자가 제목과 겹치지 않게 하려는
> 것이고, 메신저·전화 머리와 같은 모양이다. 여정(`맵으로`)과 롤플레이(`목록으로`)는 같은 요소 ·
> 같은 선언이고 라벨 문자열만 다르다. 새 토큰은 0건이다.

- 행: row, `align-items: flex-start`, `gap: layout-gap-inline`. 흐름 자식은 둘뿐이다 — `맵으로`,
  그리고 제목과 진행을 세로로 품는 제목 묶음. 절대 배치 · 고정 여백 · `z-index`가 없다.
- `맵으로`: 행의 첫 자식. 항목 전체가 단일 button, `min-height: spacing-48`, 좌우 `spacing-12`,
  `radius-md`, 가운데 정렬, 축소 금지(`flex-shrink: 0`). 라벨은 `label-m + fg-neutral-muted`다.
- 제목 묶음: 행의 둘째이자 마지막 자식. `flex: 1`, column, `gap: spacing-4`,
  `margin-top: spacing-12`. 면·경계·radius 없음. `margin-top`은
  [ADR-0023](../adr/0023-scale-mismatch-in-flex-boxes.md) 규칙 3의 안 B(사례 표 ⑳)로,
  `(spacing-48 − heading-s line-height) / 2`의 산술 결과가 `spacing-12`와 값이 같은 것이다 —
  나가기 하한이나 heading scale이 바뀌면 재검토한다. 기본 배율에서 제목 첫 줄의 가운데가 나가기
  라벨의 가운데와 같은 높이에 선다.
- 제목: 묶음의 첫 자식. `heading-s + fg-neutral`, 남은 폭에서 여러 줄, header trait, 축소 금지.
- 진행: 묶음의 둘째 자식으로 제목 아래에 선다. `label-m + fg-neutral-muted`, 축소 금지.
  `장면 1 / 3`, `장면 2 / 3`, 완료 전이 뒤에는 `이야기 완료`다. 숫자만으로 완료를 표현하지 않는다.
- 375pt 폭이나 최대 배율에서는 제목과 진행이 묶음 안에서 줄바꿈해 세로로 늘어난다. 나가기는
  줄지 않고 제목은 나가기 반대쪽으로만 줄바꿈하므로 두 글자가 겹칠 방향이 없다. 고정 높이·
  말줄임·가로 스크롤은 금지한다. 상단이 커진 만큼 scene만 줄어든다.
- 기본 배율에서는 머리가 이전보다 높아져(묶음 여백과 진행 한 줄) scene이 그만큼 낮아지고, 최대
  배율에서는 제목 칸이 넓어져 머리가 이전보다 낮아진다 ⟨추정⟩. 새 머리에서의 배경 crop · 캐릭터 ·
  대사 패널이 덮는 몫은 [비주얼 노벨 e2e](../e2e/visual-novel.md) 「자산·레이아웃·Dynamic Type」이
  다시 판정한다.

### 4.2 상태

| 상태 | scene | 진행 | 대화 패널 | 다음 조작 |
|---|---|---|---|---|
| 첫 진입 | `arrive`, neutral | `장면 1 / 3` | 첫 대사 + `다음` | 명시적 버튼 → `find` |
| 미완료 재진입 | App이 보존한 `arrive` 또는 `find` | 해당 `장면 n / 3` | 해당 대사 + `다음` | 명시적 버튼으로 한 beat 전진 |
| 둘째 장면 | `find`, smile | `장면 2 / 3` | 둘째 대사 + `다음` | 명시적 버튼 → `enter`와 동시에 최초 완료 |
| 완료 | `enter`, smile | `이야기 완료` | 셋째 대사 + `처음부터 보기` | replay 또는 `맵으로` |
| 완료 재진입 | 처음부터가 아니라 완료 장면 | `이야기 완료` | 셋째 대사 + `처음부터 보기` | replay 또는 `맵으로` |
| replay | `arrive`, neutral | `장면 1 / 3` | 첫 대사 + `다음` | 완료 기록은 유지한 채 화면 세션만 재생 |

화면 전체와 `DialoguePanel`을 탭 대상으로 만들지 않는다. 상단 `맵으로`와 겹치거나 사용자가
대사를 읽는 중 우발적으로 넘길 수 있기 때문이다. 진행 중에는 보이는 `다음` button 하나만
beat를 전진시킨다. 완료 패널에서는 `처음부터 보기`만 button이다.

## 5. `VisualNovelScene`

### 5.1 배경 레이어

- `<image mode="aspectFill">`, scene과 같은 resolved width/height, 사방 inset 0.
- 자산 제작 focal point는 정규화 좌표 `(0.5, 0.44)`다. ReactLynx 0.125.0의 native
  `<image mode="aspectFill">`에는 별도 focal-position prop이 없으므로 runtime은 중앙 crop을
  사용한다. 배경의 safe zone을 이 중심 crop에서도 보존하며 장면마다 초점을 이동하지 않는다.
- 세 장면 모두 `cafe-exterior-day`를 쓴다. 동일 `src`를 장면마다 다시 만들지 않고 번들
  resolver의 같은 자산 값을 참조한다.

### 5.2 캐릭터 레이어

- `<image mode="aspectFit">`, 투명 PNG. scene의 좌우 안쪽은 `screen-padding-x`, 위는
  `spacing-16`, 아래는 0에 맞춘 resolved box를 사용한다.
- 캐릭터는 inline 가운데, 아래 정렬. 전신 canvas의 아래 일부가 대화 패널 뒤에 가려지는 것은
  의도지만 얼굴·머리·두 손은 패널 위에 남아야 한다.
- `arrive`는 `jimin-neutral`, `find`와 `enter`는 같은 `jimin-smile`을 재사용한다. 이미지
  변환·미러링·색 보정·runtime tint는 금지한다.
- 캐릭터는 장식적 서사 채널이고 대사/화자 낱말이 같은 의미를 전달한다. 접근성 요소로 만들거나
  존재하지 않는 `alt` prop을 쓰지 않는다.

### 5.3 로딩·오류·fallback

로컬 번들이므로 네트워크 loading UI나 spinner는 없다. `<image>`의 `bindload`/`binderror`로
각 레이어 상태는 관찰하되 장면 진행을 막지 않는다.

| 자산 상태 | 시각·행동 |
|---|---|
| decode 전 | scene의 `background-primary`가 즉시 보이고, 상단·대화 패널과 모든 조작은 즉시 렌더된다. 이미지 자리와 패널 위치는 최종과 같아 layout shift가 없다 |
| 배경 오류 | 깨진 이미지 표식을 숨기고 `background-primary` 유지. 캐릭터와 대사는 계속 보이며 진행 가능 |
| 캐릭터 오류 | 캐릭터 레이어만 숨긴다. 배경·화자 `지민`·대사·진행은 유지 |
| 둘 다 오류 | token fallback 면 + 불투명 대화 패널로 전체 서사를 끝까지 진행 가능 |
| 데이터의 미등록 asset ID | resolver가 임의 기본 그림을 고르지 않는다. 개발·테스트에서는 계약 오류로 드러내고, 출시 UI는 위 레이어별 fallback으로 안전하게 계속한다 |

이미지 fade-in과 플랫폼 `image-transition-style`은 쓰지 않는다. 이전 장면 이미지를 유지하는
`defer-src-invalidation`도 쓰지 않는다. 이 흐름은 배경이 같고 pose 교체가 즉시 일어나야 하며,
이전 표정이 남는 것은 현재 장면을 잘못 전달한다.

## 6. `DialoguePanel`

패널은 scene 아래에 겹치되 이미지와 독립된 불투명 surface다.

| 자리 | 시각 계약 |
|---|---|
| 루트 | `background-elevated`, `stroke-width-thin` solid `border-default`, `radius-lg`, `padding: spacing-16`, column, `gap: spacing-8`, 최소 높이만 콘텐츠가 정함 |
| 화자 | `지민`, `dialogue-speaker + fg-neutral` |
| 대사 | `dialogue-body + fg-neutral`, 정상 줄바꿈, 제한 없는 줄 수 |
| advance | `width: 100%`, `min-height: spacing-48`, 세로 `spacing-12`/가로 `spacing-16`, `radius-md`, `brand-strong`; 보이는 `다음`, `button-xl + fg-neutral-inverted` |
| replay | `width: 100%`, `min-height: spacing-48`, 세로 `spacing-12`/가로 `spacing-16`, `radius-md`, `brand-strong`; `button-xl + fg-neutral-inverted` |

`DialoguePanel`은 `지민, {대사}` 한 낭독 단위이며 button trait를 갖지 않는다. 보이는 `다음`은
별도 button이고 접근성 이름도 `다음`이다. 완료 패널은 같은 대사 단위 뒤에 `처음부터 보기`
button을 둔다. 이미지 레이어를 접근성 순서로 쓰지 않고, `맵으로` → 제목 → 진행 → 화자와
대사 → 현재 action의 specification 논리 순서를 VoiceOver 실기에서 확인한다 — 나가기가 머리 행의
첫 자식이라 먼저 온다(§4.1).

Dynamic Type 최대 배율에서는 패널이 위로 커지고 이미지 가시 영역이 줄어든다. 대사나 버튼을
줄이지 않는다. ReactLynx는 렌더 시점에 Dynamic Type 배율을 동기적으로 분기하는 API가 없어,
대사 낭독 단위를 항상 bounded vertical `scroll-view`로 두되 짧은 기본 대사는 overflow가 없어
실제 스크롤되지 않는다. 극단 배율에서만 내용 overflow가 생겨 스크롤로 닿는다. 상단과 패널이
합쳐 화면을 넘을 때도 텍스트 상자를 축소해 자르지 않는다는 ADR-0023 원칙을 따른다.

## 7. 정확한 장면 시각

| beat | background | character | 대사 | 완료 |
|---|---|---|---|---|
| `arrive` | `cafe-exterior-day` | `jimin-neutral` | `여기가 우리가 만나기로 한 카페예요.` | 아님 |
| `find` | `cafe-exterior-day` | `jimin-smile` | `2번 출구 오른쪽이라 금방 찾았죠?` | 아님 |
| `enter` | `cafe-exterior-day` | `jimin-smile` | `그럼 들어가서 같이 주문해 봐요.` | 이 장면에 진입한 순간 완료 |

대사 텍스트는 bitmap에 포함하지 않는다. 진짜 콘텐츠가 바뀔 때 이미지 재생성 없이 데이터만
바꿀 수 있어야 한다.

## 8. 임시 GPT 이미지 제작 계약

세 자산은 **임시지만 식별자·파일 경로·canvas 계약은 고정**이다. 교체 자산은 같은 의미와
경계를 만족하면 제품 코드·장면 데이터 변경 없이 파일만 대체할 수 있어야 한다.

### 8.1 공통 아트 디렉션

- 현대 서울의 작은 카페 앞, 따뜻하고 담백한 모바일 비주얼 노벨 일러스트. clean 2D digital
  painting, 부드러운 셀 셰이딩, 자연스러운 인체 비율, 친근하고 차분한 언어 학습 앱 톤.
- 늦은 오전의 부드러운 자연광, 낮은 대비의 warm cream·peach·terracotta와 muted green
  palette. UI 토큰 색을 이미지에 복제하려 하지 않는다.
- 캐릭터 `지민`: 한국인 20대 여성, 어깨까지 오는 짙은 갈색 머리, 앞머리 없음, 따뜻한 갈색
  눈, cream knit cardigan, muted sage shirt, dark straight trousers, 작은 tan crossbody bag.
  계약된 가방 외 별도 소품은 없다. 두 pose에서 얼굴·의상·체형을 동일하게 유지한다.
- 모든 자산에서 **문자, 숫자, 메뉴, 간판 글자, 자막, 말풍선, UI, 로고, 브랜드 마크,
  서명, 워터마크를 금지**한다. 배경의 간판은 읽을 수 없는 단색 형태만 허용한다.
- 폭력·성적 표현·유명인 닮은꼴·실존 브랜드·사진풍은 금지한다.

### 8.2 자산별 명세

#### `cafe-exterior-day`

| 항목 | 고정 값 |
|---|---|
| 파일 | `background-cafe-exterior-day.png` |
| bundle path | `apps/mobile/src/screens/visual-novel/assets/temporary/background-cafe-exterior-day.png` |
| 장면 | 서울 지하철 출구 계단의 오른쪽에 있는 아늑한 독립 카페 외관. 유리문, 작은 차양, 화분과 보행로. 출구 번호나 글자는 보이지 않고 사람과 캐릭터는 없음 |
| 카메라·구도 | 눈높이 28mm 상당의 세로 establishing shot, 카페 입구가 중앙 상단 45% 안에 오고 아래 35%는 캐릭터가 겹칠 수 있는 단순한 보행로. 좌우 가장자리에는 중요 물체 없음 |
| 빛·palette | 늦은 오전의 부드러운 왼쪽 위 자연광, 그림자 부드럽게; warm cream/peach/terracotta, muted sage foliage, 하늘은 옅고 채도 낮게 |
| canvas | **1290 × 2150 px**, portrait **3:5**. 전체 기기 화면이 아니라 header 아래 scene box에 맞춘 비율 |
| 투명도 | sRGB RGB/RGBA PNG, 완전 불투명. RGBA이면 모든 pixel alpha 255 |
| safe zone | 핵심 카페 문과 차양은 x=258…1032, y=215…1075 안. 중앙 캐릭터를 위해 x=323…967, y=538…1935 영역은 큰 전경 물체 없이 유지. aspectFill 시 상하 12%, 좌우 12% crop 허용 |

#### `jimin-neutral`

| 항목 | 고정 값 |
|---|---|
| 파일 | `character-jimin-neutral.png` |
| bundle path | `apps/mobile/src/screens/visual-novel/assets/temporary/character-jimin-neutral.png` |
| 장면·표정 | 지민 단독, 카페에 막 도착해 상대를 바라보는 편안한 중립 표정, 입은 자연스럽게 닫고 두 손은 몸 옆에 편하게 둠 |
| 카메라·구도 | 정면에서 아주 약한 3/4 방향, 머리부터 무릎 아래까지, 눈높이, canvas 중앙. 과장된 원근과 잘린 손 금지; 정강이 아래 crop은 두 pose에서 동일하게 유지 |
| 빛·palette | 배경과 같은 왼쪽 위 warm daylight, 부드러운 셀 셰이딩; 공통 의상 palette 유지 |
| canvas | **1536 × 2048 px**, portrait **3:4** |
| 투명도 | sRGB RGBA PNG. 캐릭터 밖은 완전 투명, 색 번짐·가짜 그림자·체커보드 금지 |
| safe zone | 머리/머리카락 x=384…1152, y=103…430; 얼굴 x=560…976, y=180…560; 두 손 x=384…1152, y=760…1350; 보이는 실루엣은 x=230…1306, y=103…1945 안. 모든 가장자리에 최소 5% 완전 투명 여백. 무릎 아래 crop과 runtime에서 패널 뒤에 가리는 아래 영역은 두 pose에서 동일하게 유지 |

#### `jimin-smile`

| 항목 | 고정 값 |
|---|---|
| 파일 | `character-jimin-smile.png` |
| bundle path | `apps/mobile/src/screens/visual-novel/assets/temporary/character-jimin-smile.png` |
| 장면·표정 | neutral과 동일한 지민. 눈을 뜬 온화한 미소, 한 손은 카페 입구를 자연스럽게 안내하고 다른 손은 몸 옆에 편하게 둠. 손가락 수와 관절 자연스럽게 |
| 카메라·구도 | neutral과 같은 크기·시점·머리 위치·발 위치. pose만 바뀌어 교체 시 캐릭터가 튀지 않음 |
| 빛·palette | neutral과 동일 |
| canvas | **1536 × 2048 px**, portrait **3:4** |
| 투명도 | sRGB RGBA PNG. 캐릭터 밖은 완전 투명, 색 번짐·가짜 그림자·체커보드 금지 |
| safe zone | neutral과 동일. 안내하는 손도 x=230…1306, y=620…1320 안; 얼굴·양손 모두 대화 패널 위에 남도록 배치 |

### 8.3 생성·후처리 검수

1. 배경을 먼저 생성하고 그 결과를 두 pose의 조명·palette reference로 사용한다.
2. neutral을 캐릭터 identity reference로 사용해 smile을 만든다. 두 파일의 canvas와 머리 위치를
   맞추고, 새 인물이나 의상 변경을 금지한다.
3. 생성기가 다른 크기로만 출력하면 중심 crop이 아니라 고품질 리사이즈 + 필요한 투명 canvas
   확장으로 정확한 최종 치수를 만든다. 캐릭터를 늘려 찌그러뜨리지 않는다.
4. PNG metadata의 생성 prompt는 런타임 계약이 아니다. 최종 파일명·pixel dimensions·alpha·
   safe zone과 금지 항목을 사람이 확인한다.
5. 임시 자산도 번들 크기 측정을 거쳐야 한다. 압축·WebP 전환은 별도 성능 판단이며, 이 계약의
   ID/의미/비율/alpha/safe zone을 보존해야 한다.

## 9. 교체 가능한 번들 인터페이스

디자인이 고정하는 경계는 다음 모양이다. 실제 타입 위치와 export 이름은 specification이
최종 결정하되, optional key·문자열 경로의 장면 직접 참조·fallback용 넷째 자산은 만들지 않는다.

```ts
type VisualNovelArtworkId =
  | "cafe-exterior-day"
  | "jimin-neutral"
  | "jimin-smile";

type VisualNovelArtworkBundle = Readonly<
  Record<VisualNovelArtworkId, VisualNovelAssetContract>
>;
```

`VisualNovelAssetContract`는 specification 계약 타입의 판별 union이며 각 멤버가 §8의 exact
`id`·`kind`·`path`·`format`·`width`·`height`·`aspectRatio`·`transparency` 리터럴을 가진다.
mapping의 세 항목은 다음과 같고 이 밖의 key는 없다.

| ID | kind | contract-relative path |
|---|---|---|
| `cafe-exterior-day` | `background` | `screens/visual-novel/assets/temporary/background-cafe-exterior-day.png` |
| `jimin-neutral` | `character` | `screens/visual-novel/assets/temporary/character-jimin-neutral.png` |
| `jimin-smile` | `character` | `screens/visual-novel/assets/temporary/character-jimin-smile.png` |

고정 mapping은 background ID에 `kind: "background"`, pose 둘에 `kind: "character"`를 넣고
각 exact path의 정적 import 결과를 별도 source resolver가 낸다. `artworkFor(id)`는 총함수다.
장면 데이터는 파일 경로나 import를 알지 않고 ID만 가진다. 최종 아트가 오면 mapping이나 장면을
바꾸지 않고 세 파일만 같은 경로에 덮어쓴다. key와 내부 id 또는 background/character kind가
뒤바뀌면 타입 fixture나 asset manifest 검증이 실패해야 한다.

`placeholder`, 원격 URL, base64, API fetch, 캐시 정책, AI 생성 호출은 런타임에 들어가지 않는다.
GPT는 개발 시 bitmap 세 개를 만드는 데만 쓰이며 제품은 번들된 정적 파일만 읽는다.

## 10. 없는 상태와 접근성

| 흔한 상태 | 여기서 없는 이유 |
|---|---|
| hover | iOS touch 흐름이며 포인터 전용 요구가 없다 |
| CSS focus ring | VoiceOver 시스템 포커스가 그리고 저장소에 `:focus` 시각 선례가 없다 |
| pressed | `brand-strong`과 구별되는 승인 surface가 없다. 임의 opacity·scale을 만들지 않는다 |
| disabled / locked | 맵 항목은 언제든 열리고 현재 가능한 조작만 렌더한다 |
| selected / branch | 선택지·분기가 없다 |
| network loading / retry | 세 자산은 로컬 bundle이다. decode fallback은 §5.3이 진다 |
| transition / animation / audio | 명시적 범위 밖이다 |

- `맵으로`, 맵 항목, `다음`, `처음부터 보기`는 각각 전체가 단일 button 탭 대상이고 기존
  `spacing-48` 이상의 터치 하한을 갖는다. DialoguePanel 자체는 button이 아니다.
- 배경·캐릭터는 접근성 트리에서 제외한다. 화자와 대사가 장면 의미의 정본이며, 이미지 로드
  실패에서도 서사와 조작 이름이 그대로 남는다.
- 완료는 `이야기 완료`, 맵의 tick + `완료됨`, 접근성 이름 접미사로 중복 표현한다.
- 완료 전이가 처음 성립할 때 `이야기 완료`를 한 번 능동 낭독하는지는 ADR-0016의 완료 전이
  규약을 따른다. replay 재완료나 완료 재진입에서 중복 낭독하지 않는다.
- 최대 Dynamic Type, Bold Text, Increase Contrast, Reduce Motion, VoiceOver에서 지원 하한 폭과
  완료 재진입을 확인한다. 이미지 안 정보는 검사 대상 의미 채널로 세지 않는다.

## 11. 디자인 고정과 구현 후 시각 검증

### 고정

- 신규 token 0건. 기존 palette·spacing·typography·radius·stroke만 쓴다.
- 별도 맵 항목, safe-area 내부 단일 화면, background/character/dialogue의 세 레이어, 진행 중
  명시적 `다음`과 완료 replay를 고정했다.
- 세 장면·세 자산 ID·파일명·pixel dimensions·alpha·safe zone과 정적 bundle 교체 경계를
  고정했다.
- 불투명 UI surface로 본문·핵심 UI의 AA 대비를 이미지와 독립시켰다.

### 구현 후 필수 시각 검증

렌더·스크린샷은 이 디자인 단계에서 실행하지 않았다. 제품 컴포넌트와 자산이 아직 없고 이
역할은 구현·테스트·asset 파일을 쓰지 않는다. 구현 후 iPhone 17 Pro와 iPhone 13 mini에서
최소 다음을 캡처한다: 세 장면, 완료 최초 전이, 완료 재진입, replay 첫 장면, 배경 오류,
캐릭터 오류, 둘 다 오류, 최대 Dynamic Type, VoiceOver focus order. 생성 자산은 별도로 원본
크기와 alpha channel, 금지된 text/logo/watermark 부재를 검사한다.
