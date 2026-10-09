# motion 토큰 4단계 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들
  크기만 재었습니다.
- 기능 PR: motion 토큰 4단계 — scale 리터럴 다섯 자리를 `var(--libitum-motion-scale-…)`로
  전환, `lint:motion`에 `scale-literal` 규칙과 `.ts` · `.tsx` inline style 검사 추가, 무동작 가림
  선언 여섯 자리 삭제, Storybook 동작 줄이기 스토리 일곱, LearningShell 진행 바 채움의
  `progress` · `enter` 너비 전환과 동작 줄이기 분기, 모션 정책 ADR(ADR-0053)
- 대상 commit: 브랜치 `sehyun0518/motion-stage4`의 `d649e114`(번들 비교의 head — 그 뒤
  `91262f72`는 테스트뿐이고 이 보고서와 같은 PR의 나머지는 문서뿐이라 번들이 같습니다).
  비교 기준은 분기점 `2debe051`(3단계 병합).
- 기기: iPhone 17 Pro 시뮬레이터 — 이 보고서는 기기에서 아무것도 재지 않았습니다. 화면 확인은
  4단계 e2e 회차(iOS · Android)가 하고 결과는 e2e 문서의 「4단계 회차」 소절에 적습니다(이
  보고서를 쓰는 시점에 진행 중).
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: 번들 크기는 ui-lynx build 뒤 mobile build(`PUBLIC_SUPABASE_URL` 로컬 모의 서버 설정)의
  `main.lynx.bundle`과 `packages/ui-lynx/dist`입니다. 분기점과 head를 각각 같은 설정으로
  빌드했습니다.

## 시나리오

- 번들 크기: 분기점 `2debe051`과 `d649e114`를 각각 같은 설정으로 빌드해
  `apps/mobile/dist/main.lynx.bundle`과 `packages/ui-lynx/dist` 크기를 비교하고 `pnpm size:check`를
  돌렸습니다.
- 화면 확인: 동작 줄이기를 끄고 켠 두 상태에서 여정 맵 모달의 둥근 단추 눌림(95 %), 학습 화면
  나가기 확인창의 첫 프레임(96 %), lesson-complete 통과 배지의 첫 프레임(≤ 90 %)과 켠 상태 막 색을
  2 · 3단계 결과와 **같은 수치**인지 봅니다 — 값이 토큰과 같아 달라야 하는 것이 없는 회귀입니다.
  확인창과 배지는 `@keyframes` 본문 안 `var()`가 기기에서 풀리는지의 게이트를 겸합니다. 수치와
  판정은 이 보고서가 아니라 e2e 문서 [0.4.0 motion 토큰](../../e2e/motion-tokens.md) ·
  [보상 · 문항 전환](../../e2e/motion-reward.md)의 「4단계 회차」 소절에 있습니다 — 여기서는
  되풀이하지 않습니다. 진행 바 너비 전환은 이 빌드의 유닛이 전부 문항 하나라 기기에서 볼 수
  없습니다(「미확인」).

## 이 변경이 무엇을 건드렸나

- 앱 learning: `LearningSessionHeader`가 `useMotion()`을 읽고 순수 함수
  `learningProgressFillClassName`(`learning-shell.contract.ts`)으로 진행 바 채움의 클래스를 내며
  동작 줄이기일 때만 `data-motion`을 조건부로 붙입니다. CSS는 채움에 `transition: width
  progress enter` 한 선언과 동작 줄이기 규칙(`transition: none`) 하나. `LearningShell.tsx`와
  `use-question-transition.ts`는 lint 예외 주석 넷뿐이라 동작이 같습니다. 0 %에서 채움을 그리지
  않는 조건부 렌더는 그대로입니다.
- 앱 lesson-complete: 보상 keyframe의 `scale(0.8)`을 `scale(var(--libitum-motion-scale-reward))`로.
  DOM · 클래스 · 판정 함수는 그대로입니다.
- ui-lynx: Round Button · Learning Unit `:active`의 `scale(0.95)`와 Dialog enter · exit keyframe의
  `scale(0.96)`을 토큰 변수로. Button spinner-wrap · Round Button loading · icon 래퍼 · Learning Unit
  링 `<svg>` · surface · badge의 `accessibility-elements-hidden` 여섯 줄 삭제(요소는 남고 속성만
  빠집니다 — 전부 무동작이던 선언). 그 밖 ui-lynx 런타임 변경 0.
- 번들 밖: `devtools/motion-literals`(scale 규칙 · TypeScript AST 소스 스캔 — `lint` 도구),
  Storybook 스토리 · 엔트리(`apps/storybook-lynx` — 예산 밖), 테스트, 문서.
- 새 서드파티 의존 0건, 디자인 토큰은 이미 올라간 0.4.0 그대로(새 토큰 0건), 이미지 자산 변화
  없음, 호스트 변경 없음, 내비게이션 · `AppSession` · `render-screen` 변경 없음(custom 화면 전환은
  이번에도 적용하지 않았습니다).

## 분석 결과

| 산출물                              | 분기점 `2debe051` | `d649e114`      | 차         |
| ----------------------------------- | ----------------- | --------------- | ---------- |
| `apps/mobile/dist/main.lynx.bundle` | 1,402,252 bytes   | 1,403,113 bytes | +861 bytes |
| `packages/ui-lynx/dist`             | 498,795 bytes     | 498,496 bytes   | −299 bytes |

- 모바일 번들은 상한 1,412,000 bytes 안입니다(여유 약 8.9 kB). 늘어난 861 bytes는 진행 바 전환
  선언 둘과 헤더 배선(`useMotion` · 클래스 함수 · 조건부 속성)입니다. 상한은 바꾸지 않았습니다.
  분기점 수치가 3단계 보고서의 head 1,402,294 bytes와 42 bytes 다른 것은 squash 병합 번들의
  차이입니다.
- `packages/ui-lynx/dist`는 299 bytes 줄었습니다(속성 여섯 삭제가 `var()` 문자열 길이 증가보다
  큽니다). 상한 500,000 bytes 그대로(여유 약 1.5 kB)이고 `pnpm size:check`는 둘 다 통과했습니다.
- 렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 진행 바 채움의 `width` 전환(250 ms, 문항이 바뀔 때 한 번)이 레이아웃
  스레드에 주는 비용, 무대 300 ms 전환과 같은 프레임에 겹칠 때의 효과는 판정할 수 없습니다.
  `transform` 안 `var()`는 값이 리터럴과 같아 그리기 비용이 같다고 보지만 추론이고 측정이
  아닙니다.
- 진행 바 전환은 문항 n → n+1에서만 돌고 이 빌드에는 문항이 둘 이상인 유닛이 없어 실제로는 한
  번도 시작하지 않습니다 — 그래서 이 변경의 런타임 효과는 지금 사용자가 관찰할 수 없고, 그런
  유닛이 생길 때 다시 봐야 합니다. 이것도 추론입니다.
- 화면 확인은 e2e 회차의 몫이고 이 보고서가 쓰이는 시점에 iOS · Android 회차가 진행 중이라
  기기 관찰 수치가 **아직 없습니다**. `@keyframes` 본문 안 `var()`는 구현 전 iOS 시뮬레이터
  탐색에서만 풀림을 봤고 Android는 그 회차가 처음 봅니다 — 안 풀리면 keyframe 셋만 리터럴로
  되돌리는 fallback이 있어(ADR-0053 D6) 번들 크기도 그만큼 다시 바뀝니다.
- 실기 측정은 없습니다.

## 결론과 후속

- 모바일 번들 +861 bytes(상한 안). ui-lynx dist −299 bytes(상한 그대로). 렌더링 · 메모리는
  미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 4단계 e2e 회차(iOS · Android)가 두 e2e 문서의 「4단계 회차」 소절을 채웁니다 — Dialog ·
  배지 행이 keyframe `var()`의 게이트입니다. 문항이 둘 이상인 유닛이 생기면 진행 바 채움의
  너비 전환을 기기에서 보고 iOS 수집기로 그 전환 중 프레임 시간을 잽니다. 3단계 보고서가 넘긴
  문항 전환 중 프레임 시간 · lesson-complete 첫 프레임, 2단계 보고서가 넘긴 Loading 중 프레임
  시간 · 동작 줄이기 켬 상태의 여정 맵 눌림 프레임 시간은 그대로 남아 있습니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
