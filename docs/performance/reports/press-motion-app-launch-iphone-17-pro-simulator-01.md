# 눌림 scale 확장 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들
  크기만 재었습니다.
- 기능 PR: 눌림 scale을 Button(모든 variant) · interactive Card · OptionSelector 항목 · 문장 순서
  bank 칩 · 잠기지 않은 롤플레이 카드로 넓히고(95 %, 기존 토큰), 동작 줄이기에서는 축소 대신 막
  (Button neutral · brand · 롤플레이 카드) 또는 기존 색 변화만 남기며, Lynx에서 Button 로딩
  스피너가 왼쪽에 붙고 라벨이 숨지 않던 결함을 고친 변경(ADR-0053 정정 기록 1).
- 대상 commit: 브랜치 `feat/press-motion`의 `907809ba`(번들 비교의 head — 그 뒤 문서 커밋이 `button.css`의 `prettier-ignore`
  주석 셋을 지워 ui-lynx dist가 60 bytes 줄었고, 그 밖은 문서뿐입니다). 비교 기준은 분기점 `ab1c7994`(모션 4단계 병합).
- 기기: iPhone 17 Pro 시뮬레이터 — 이 보고서는 기기에서 아무것도 재지 않았습니다. 눌림 비율 ·
  스피너 위치 · 동작 줄이기 막 색의 실측은 e2e 문서 [0.4.0 motion 토큰](../../e2e/motion-tokens.md)
  「눌림 확장 회차」 소절에 있습니다.
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: 번들 크기는 ui-lynx build 뒤 mobile build(운영 `.env.local` 설정)의 `main.lynx.bundle`과
  `packages/ui-lynx/dist`입니다. 분기점과 head를 각각 같은 설정으로 빌드했습니다.

## 시나리오

- 번들 크기: 분기점 `ab1c7994`와 `907809ba`를 각각 같은 설정으로 빌드해
  `apps/mobile/dist/main.lynx.bundle`과 `packages/ui-lynx/dist` 크기를 비교하고 `pnpm size:check`를
  돌렸습니다.
- 화면 확인: 동작 줄이기를 끄고 켠 두 상태에서 온보딩 · 에피소드 인트로 버튼, 피드백 화면의
  OptionSelector, 롤플레이 카드, playground의 Button 로딩 행을 누른 채 캡처해 폭과 색을 쟀습니다.
  수치는 e2e 문서에 있고 여기서 되풀이하지 않습니다.

## 이 변경이 무엇을 건드렸나

- ui-lynx: `button.css` · `card.css` · `option-selector.css`에 `:active` transform(토큰) · `transition`
  · 동작 줄이기 규칙, Button에 눌림 막 요소(reduced · neutral · brand일 때만 렌더)와 스피너 래퍼
  `width/height: 100%`, 라벨 숨김을 inline `opacity: 0`으로. 계약 셋(`getButtonContract` ·
  `getCardContract` · `getOptionSelectorContract`)에 `contextMotion` 인자. standard DOM은 바뀌지
  않습니다(동작 줄이기일 때만 클래스 · `data-motion` · 막).
- 앱: `sentence-order-chip.css` · `roleplay-card.css`에 같은 규칙, 순수 함수 넷(칩 · 카드의 클래스
  · 막 판정)과 두 컴포넌트의 `useMotion()` 읽기. 잠긴 롤플레이 카드에 `roleplay-card-locked`
  클래스 하나(standard DOM 변화는 이것뿐).
- 번들 밖: Storybook 스토리 셋(`apps/storybook-lynx` — 예산 밖), playground 행(dev 전용), 테스트,
  문서.
- 새 서드파티 의존 0건, 새 디자인 토큰 0건, 이미지 자산 변화 없음, 호스트 변경 없음,
  내비게이션 · `AppSession` 변경 없음.

## 분석 결과

| 산출물                              | 분기점 `ab1c7994` | `907809ba`      | 차           |
| ----------------------------------- | ----------------- | --------------- | ------------ |
| `apps/mobile/dist/main.lynx.bundle` | 1,403,255 bytes   | 1,410,167 bytes | +6,912 bytes |
| `packages/ui-lynx/dist`             | 498,496 bytes     | 505,513 bytes   | +7,017 bytes |

(문서 커밋 뒤 HEAD의 ui-lynx dist는 505,453 bytes — 상한 507,000 안.)

- 모바일 번들은 상한 1,412,000 bytes 안이지만 **여유가 약 1.8 kB**입니다. 다음 앱 런타임 변경은
  상한 조정이 따라올 가능성이 큽니다.
- ui-lynx는 앞선 상한 500,000 bytes를 5.5 kB 넘어 **507,000 bytes로 올렸습니다**
  (`devtools/bundle-size/budget.json` — 실제 증가분만 반영, 여유 약 1.5 kB). 증가분은 CSS 규칙과
  막 분기 · 계약 인자이고 전부 이 PR의 목적입니다.
- 렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다. 눌림 전환은 기존 토큰(`duration.pressed`)
  과 같은 길이라 프레임 비용이 늘 이유는 없지만, 그것을 이 보고서가 잰 것은 아닙니다.

## 해석

- **미측정 기록입니다.** 눌림 `transform` 전환(`duration.pressed`)이 다섯 대상에 늘어난 것이
  프레임 시간에 주는 비용은 판정할 수 없습니다. RoundButton · LearningUnit이 같은 전환을 이미
  쓰고 있어 비용의 **종류**는 새롭지 않지만, 한 화면에 여러 Button이 있을 때의 합은 추론입니다.
- Button 막 요소는 동작 줄이기일 때만 렌더되므로 standard 사용자의 DOM 수는 같습니다. 막이
  있는 상태의 그리기 비용은 재지 않았습니다.
- 로딩 스피너 수정은 레이아웃 속성 교체(절대 박스 100 % · `opacity: 0`)라 그리기 비용 변화는
  없다고 보지만 추론입니다.
- Android는 절차만 적었고 실행하지 않았습니다. 실기 측정은 없습니다.

## 결론과 후속

- 모바일 번들 +6,912 bytes(상한 안, 여유 약 1.8 kB). ui-lynx dist +7,017 bytes로 상한을
  507,000 bytes로 올렸습니다. 렌더링 · 메모리는 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: Android 에뮬레이터에서 e2e 「눌림 확장 회차」 Android 절차를 실행합니다. 동작 줄이기를
  켠 상태의 롤플레이 열린 카드 막과 bank 칩, 로딩 스피너는 iOS에서도 미측정이라 다음 회차가
  봅니다. 앞선 보고서들이 넘긴 Loading 중 프레임 시간 · 눌림 프레임 시간 측정은 그대로 남아
  있습니다. 모바일 번들 여유가 1.8 kB라 다음 런타임 변경은 상한 조정을 함께 봐야 합니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
