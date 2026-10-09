# 동작 줄이기 파이프라인 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들
  크기만 재었습니다.
- 기능 PR: 호스트의 시스템 「동작 줄이기」를 globalProps `reducedMotion`으로 보내고, ui-lynx의 새
  `motion` 모듈(`MotionProvider` · `useMotion`)이 그 값을 컴포넌트에 내려 이동 · 확대 애니메이션을
  걷는 변경(이 보고서와 같은 PR)
- 대상 commit: 브랜치 `sehyun0518/design-system-motion-adoption`의 `d602fe08`(번들 비교의 head).
  비교 기준은 분기점 `296e2eac`. 그 뒤의 `58ce66c2`는 번들 상한 조정뿐이라 번들이 같습니다.
- 기기: iPhone 17 Pro 시뮬레이터 — 화면 확인만 했습니다(Release Host + 내장 번들,
  `--bundle-url=main.lynx`).
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: 번들 크기는 `pnpm build`의 `main.lynx.bundle`과 `packages/ui-lynx/dist`입니다. 화면 확인에
  쓴 Release Host는 e2e 회차가 빌드한 것이고 이 보고서가 따로 빌드하지 않았습니다.

## 시나리오

- 번들 크기: 분기점 `296e2eac`와 `d602fe08`을 각각 `pnpm build`로 빌드해
  `apps/mobile/dist/main.lynx.bundle`과 `packages/ui-lynx/dist` 크기를 비교했습니다.
- 화면 확인: 동작 줄이기를 끄고 켠 두 상태에서 학습 화면의 나가기 확인창(Dialog), 여정 맵 · 학습
  화면의 둥근 단추(RoundButton), 비주얼 노벨 대사의 연속 캡처를 비교했습니다. 수치와 판정은
  이 보고서가 아니라 e2e 문서 [동작 줄이기](../../e2e/motion-reduced.md)의 결과 표에 있습니다 —
  여기서는 되풀이하지 않습니다.

## 이 변경이 무엇을 건드렸나

- ui-lynx: 새 `src/motion/`(타입 · 순수 규칙 · Provider · 훅, 파일 12개 — 테스트 포함), 공개
  subpath `@libitums/ui-lynx/motion`과 root 재수출. 열한 컴포넌트의 tsx · contract가 컨텍스트를
  읽고, 넷(RoundButton · LearningUnit · PageIndicator · SettingsCell)에 `reduced` 변형 CSS 규칙이
  더해졌습니다. 죽은 `@media (prefers-reduced-motion)` 다섯 블록은 지웠습니다.
- 앱: `App.tsx`가 `MotionProvider`를 세우고, 다섯 화면이 `reducedMotion` prop을 컨텍스트로
  결정합니다. 순수 함수 `lib/reduced-motion.ts` 하나가 늘었습니다.
- iOS 호스트: `ReducedMotion.swift`(순수 페이로드)와 `ViewController`의 알림 구독. 값이 바뀔 때만
  키 하나짜리 `updateGlobalProps`를 보냅니다(bool literal `TemplateData`).
- Android 호스트: `ReducedMotion.java` · `ReducedMotionWatcher.java`(두 배율 `ContentObserver`)와
  `MainActivity`의 발행. Android 산출물은 이 보고서의 번들 비교 대상이 아닙니다.
- 새 서드파티 의존 0건, 새 디자인 토큰 0건, 이미지 자산 변화 없음.

## 분석 결과

| 산출물                          | 분기점 `296e2eac` | `d602fe08`      | 차            |
| ------------------------------- | ----------------- | --------------- | ------------- |
| `apps/mobile/dist/main.lynx.bundle` | 1,389,257 bytes   | 1,392,184 bytes | +2,927 bytes  |
| `packages/ui-lynx/dist`         | 478.4 kB          | 492.9 kB        | +14.5 kB      |

- 모바일 번들은 상한 1,412,000 bytes 안입니다(여유 약 19.8 kB). 늘어난 2.9 kB는 Provider 한 겹,
  순수 함수, 다섯 화면의 결정 한 줄씩과 네 컴포넌트의 조건부 속성 · 클래스입니다.
- `packages/ui-lynx/dist`는 기존 상한 481,000 bytes를 넘어 **상한을 494,000 bytes로 올렸습니다**
  (`devtools/bundle-size/budget.json`, 같은 PR의 `58ce66c2`에 사유 기록). 늘어난 14.5 kB는 `motion/`
  12파일과 컴포넌트 jsx · contract · css의 증가분이고, 죽은 `@media` 삭제로 CSS는 일부 줄었습니다.
  패키지 dist는 소비 앱이 트리 셰이킹해 가져가므로 이 증가가 모바일 번들에 그대로 실리지는 않습니다
  (위 +2.9 kB가 실제로 실린 양).
- 렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** `reduced`에서 애니메이션을 끊는 것이 프레임 시간이나 메모리에 주는 효과,
  `MotionProvider` 한 겹이 첫 렌더에 더하는 시간은 판정할 수 없습니다.
- 열한 컴포넌트가 `useMotion()`을 매 렌더에 부르지만 Context 읽기 하나이고 값이 바뀌는 때는
  사용자가 시스템 설정을 토글할 때뿐이라, 이론상 추가 비용은 상수에 가깝습니다 — 이것은
  추론이고 측정이 아닙니다.
- 화면 확인은 시뮬레이터 한 대 · Release Host 한 종류에서 했고, 실기 · Android 측정은 없습니다.
  Android의 시각 확인은 e2e 문서가 에뮬레이터 한 대에서 기록했습니다.

## 결론과 후속

- 모바일 번들 +2,927 bytes(상한 안). ui-lynx dist +14.5 kB(상한을 494,000 bytes로 조정). 렌더링 ·
  메모리는 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: iOS 수집기로 동작 줄이기 켬 · 끔 각각의 Dialog 열기 · 비주얼 노벨 진입 프레임 시간을
  잽니다. Android 실기에서 `ContentObserver` 발화와 재렌더 비용을 봅니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
