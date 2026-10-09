# motion 토큰 2단계 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들
  크기만 재었습니다.
- 기능 PR: `@libitums/design-tokens` 0.4.0의 motion 토큰을 소비하는 변경 — Round Button · Button
  Spinner 회전, Button Loading의 라벨 숨김과 폭 유지, 동작 줄이기에서 Round Button · Learning
  Unit의 눌림 막, Typewriter 기본 간격 토큰화, 비주얼 노벨 계속 표시의 bounce 제거,
  `lint:motion` 추가(이 보고서와 같은 PR)
- 대상 commit: 브랜치 `sehyun0518/motion-stage2`의 `449854a0`(번들 비교의 head — 그 직전
  `56960511`까지가 코드이고 `449854a0`는 번들 상한 조정뿐이라 번들이 같습니다). 비교 기준은
  분기점 `49ef26be`.
- 기기: iPhone 17 Pro 시뮬레이터 — 화면 확인만 했습니다(Release Host + 내장 번들,
  `--bundle-url=main.lynx`).
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: 번들 크기는 `pnpm build`의 `main.lynx.bundle`과 `packages/ui-lynx/dist`입니다. 화면 확인에
  쓴 Release Host는 e2e 회차가 빌드한 것이고 이 보고서가 따로 빌드하지 않았습니다.

## 시나리오

- 번들 크기: 분기점 `49ef26be`와 `56960511`을 각각 `pnpm build`로 빌드해
  `apps/mobile/dist/main.lynx.bundle`과 `packages/ui-lynx/dist` 크기를 비교했습니다.
- 화면 확인: 동작 줄이기를 끄고 켠 두 상태에서 여정 맵의 둥근 단추 · 학습 유닛 눌림, dev 전용
  playground의 Button · Round Button Loading 행, 에피소드 서사 화면의 계속 표시를 연속 캡처로
  비교했습니다. 수치와 판정은 이 보고서가 아니라 e2e 문서
  [0.4.0 motion 토큰](../../e2e/motion-tokens.md)의 결과 표에 있습니다 — 여기서는 되풀이하지
  않습니다. Android 에뮬레이터의 확인도 같은 문서에 있습니다.

## 이 변경이 무엇을 건드렸나

- ui-lynx: Round Button · Button CSS에 spinner 회전 keyframe 둘과 loading 선택자의 `animation`
  규칙, 상단 투명 규칙의 특이도 조정. Button Loading 레이아웃(라벨 · 아이콘 `visibility: hidden`,
  spinner wrap 절대 배치)과 계약 필드 `contentVisibility`. Round Button · Learning Unit의 reduced
  눌림 막(`-shade` 자식 view와 CSS 규칙, 순수 함수 `hasPressedShade`). `motion` 모듈의
  `motionDurationMs`와 Typewriter의 `defaultRevealIntervalMs`. 비주얼 노벨 대사의 bounce keyframe ·
  `indicatorMotion` 필드 · `data-motion` 삭제.
- 앱: 세 화면 contract의 `reducedMotion` JSDoc 한 줄씩과 dev 전용 playground의 Round Button
  loading 행. 제품 번들에 실리는 런타임 변경은 ui-lynx를 거쳐 오는 것뿐입니다.
- devtools: `motion-literals/`(스캔 · 정책 · 검사 · allowlist)와 루트 `lint` · `test` 사슬 연결.
  번들 밖입니다.
- 새 서드파티 의존 0건, 디자인 토큰은 이미 올라간 0.4.0 그대로(새 토큰 0건), 이미지 자산 변화
  없음, 호스트 변경 없음.

## 분석 결과

| 산출물                              | 분기점 `49ef26be` | `56960511`      | 차           |
| ----------------------------------- | ----------------- | --------------- | ------------ |
| `apps/mobile/dist/main.lynx.bundle` | 1,393,438 bytes   | 1,397,400 bytes | +3,962 bytes |
| `packages/ui-lynx/dist`             | 492.9 kB          | 498.9 kB        | +6.0 kB      |

- 모바일 번들은 상한 1,412,000 bytes 안입니다(여유 약 14.6 kB). 늘어난 4.0 kB는 spinner keyframe
  둘과 animation 규칙, 막 규칙 두 벌과 조건부 자식 view, Button Loading 레이아웃, `motionDurationMs`
  입니다. 비주얼 노벨의 bounce keyframe · 필드 삭제가 일부를 상쇄했습니다.
- `packages/ui-lynx/dist`는 기존 상한 494,000 bytes를 넘어 **상한을 500,000 bytes로 올렸습니다**
  (`devtools/bundle-size/budget.json`, 같은 PR의 `449854a0`에 사유 기록). 늘어난 6.0 kB는 위 CSS ·
  JSX · 함수의 소스 · 선언 · 소스맵 증가분입니다. 패키지 dist는 소비 앱이 트리 셰이킹해 가져가므로
  이 증가가 모바일 번들에 그대로 실리지는 않습니다(위 +4.0 kB가 실제로 실린 양).
- 렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** spinner의 끝없는 `rotate` keyframe이 Loading 중 프레임 시간에 주는 효과,
  reduced에서 막 view 하나가 더 그려지는 비용, Button Loading의 절대 배치가 레이아웃에 주는
  효과는 판정할 수 없습니다.
- spinner는 Loading 상태에서만 돌고 Loading은 사용자 요청의 완료로 끝나므로, 회전 비용은 요청
  시간에 비례하는 일시 비용입니다 — 이것은 추론이고 측정이 아닙니다. 막 view는 동작 줄이기를 켠
  사용자에게만 렌더되고 상시 화면의 Round Button · Learning Unit 수만큼이라 상수에 가깝습니다 —
  같은 추론입니다.
- 화면 확인은 시뮬레이터 한 대 · Release Host 한 종류와 에뮬레이터 한 대에서 했고, 실기 측정은
  없습니다. playground는 dev 번들이라 제품 번들과 같은 산출물이 아닙니다.

## 결론과 후속

- 모바일 번들 +3,962 bytes(상한 안). ui-lynx dist +6.0 kB(상한을 500,000 bytes로 조정). 렌더링 ·
  메모리는 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: iOS 수집기로 로그인 소셜 버튼의 Loading 중 프레임 시간과 동작 줄이기 켬 상태의 여정 맵
  눌림 프레임 시간을 잽니다. 3단계(보상 · 화면 전환)가 keyframe을 더 들여오면 그때 함께 봅니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
