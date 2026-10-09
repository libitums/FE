# motion 토큰 3단계 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들
  크기만 재었습니다.
- 기능 PR: `@libitums/design-tokens` 0.4.0의 보상 · 전환 motion 토큰을 앱이 소비하는 변경 —
  lesson-complete 통과 배지의 보상 keyframe(`reward` · `enter-expressive` · `scale.reward`),
  LearningShell 문항 전환의 등장 transition(`page` · `enter`, 이동 거리 `spacing-16`)과 그 상태
  기계 · 훅, `LearningShellBody` 추출, 동작 줄이기 분기(불투명도만 `d2` · `linear`), Round Button
  막의 접근성 속성 한 줄 삭제(이 보고서와 같은 PR)
- 대상 commit: 브랜치 `sehyun0518/motion-stage3`의 `70a4b12b`(번들 비교의 head — 그 뒤
  `395be1d6`는 e2e 문서뿐이라 번들이 같습니다). 비교 기준은 분기점 `162f5648`.
- 기기: iPhone 17 Pro 시뮬레이터 — 화면 확인만 했습니다(Release Host + 내장 번들,
  `--bundle-url=main.lynx`).
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: 번들 크기는 ui-lynx build 뒤 mobile build(`PUBLIC_SUPABASE_URL` 로컬 모의 서버 설정)의
  `main.lynx.bundle`과 `packages/ui-lynx/dist`입니다. 화면 확인에 쓴 Release Host는 e2e 회차가
  빌드한 것이고 이 보고서가 따로 빌드하지 않았습니다.

## 시나리오

- 번들 크기: 분기점 `162f5648`과 `70a4b12b`를 각각 같은 설정으로 빌드해
  `apps/mobile/dist/main.lynx.bundle`과 `packages/ui-lynx/dist` 크기를 비교하고 `pnpm size:check`를
  돌렸습니다.
- 화면 확인: 동작 줄이기를 끄고 켠 두 상태에서 듣기 유닛의 문항 → 완료 장면 전환, lesson-complete
  통과 · 미통과 배지, 전환 중 입력, 여정 맵 모달의 둥근 단추 눌림을 녹화에서 프레임을 뽑아
  비교했습니다. 수치와 판정은 이 보고서가 아니라 e2e 문서
  [보상 · 문항 전환](../../e2e/motion-reward.md)의 결과 표에 있습니다 — 여기서는 되풀이하지
  않습니다. Android 에뮬레이터(Pixel 8)의 확인도 같은 문서의 Android 행에 있습니다.

## 이 변경이 무엇을 건드렸나

- 앱 lesson-complete: 순수 함수 `rewardMotionFor` · `rewardBadgeClassName`(새 파일), 화면이
  `useMotion()`으로 모드를 읽어 통과 배지에 모션 클래스와 `data-reward`를 조건부로 붙임, CSS에
  keyframe 둘(`-badge-reward` · `-badge-fade`)과 `animation` 규칙 둘. 미통과 배지의 DOM · CSS는
  그대로입니다.
- 앱 learning: 문항 전환 상태 기계(`question-transition.ts` — 키 · 초기 상태 · 리듀서 · 시간 ·
  클래스)와 훅(`use-question-transition.ts` — `setTimeout` 둘), 무대 · 작업 영역 배치를 뗀
  `LearningShellBody.tsx`(DOM · testid 순서 불변, 전환 클래스 · `data-page` · `data-motion`을 조건부로
  붙임), CSS에 primed · entering 규칙과 reduced 덮어쓰기 규칙. 넘김 자물쇠 · 타이머 · 헤더 · 액션
  행 · Dialog는 그대로입니다.
- ui-lynx: Round Button 막 `<view>`의 `accessibility-elements-hidden` 한 줄 삭제. 그 밖 ui-lynx
  변경 0.
- 새 서드파티 의존 0건, 디자인 토큰은 이미 올라간 0.4.0 그대로(새 토큰 0건), 이미지 자산 변화
  없음, 호스트 변경 없음, 내비게이션 · `AppSession` · `render-screen` 변경 없음(custom 화면
  전환은 이번에 적용하지 않았습니다).

## 분석 결과

| 산출물                              | 분기점 `162f5648` | `70a4b12b`      | 차           |
| ----------------------------------- | ----------------- | --------------- | ------------ |
| `apps/mobile/dist/main.lynx.bundle` | 1,397,447 bytes   | 1,402,294 bytes | +4,847 bytes |
| `packages/ui-lynx/dist`             | 498,866 bytes     | 498,795 bytes   | −71 bytes    |
| `apps/mobile/dist/static/image`     | 8,688.2 kB        | 8,688.2 kB      | 0            |

- 모바일 번들은 상한 1,412,000 bytes 안입니다(여유 약 9.7 kB). 늘어난 4.8 kB는 보상 keyframe
  둘과 animation 규칙, 전환 규칙 네 벌, 상태 기계 · 훅 · `LearningShellBody`의 코드입니다. 상한은
  바꾸지 않았습니다.
- `packages/ui-lynx/dist`는 71 bytes 줄었습니다(막의 속성 한 줄 삭제). 상한 500,000 bytes 그대로이고
  `pnpm size:check`는 둘 다 통과했습니다.
- 렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 배지 keyframe(400 ms 1회)과 문항 전환 transition(300 ms, 무대 · 작업
  영역의 `opacity` · `transform`)이 프레임 시간에 주는 효과, 전환마다 `setTimeout` 둘이 도는
  비용, 완료 장면 전환이 겹칠 때의 효과는 판정할 수 없습니다.
- 보상 모션은 화면당 한 번이고 전환은 문항이 바뀔 때만 300 ms 동안 돌므로 상시 비용이 아니라
  일시 비용입니다 — 이것은 추론이고 측정이 아닙니다. `LearningShellBody` 추출은 DOM을 바꾸지
  않아 레이아웃 비용이 같다고 보지만 같은 추론입니다.
- 화면 확인은 시뮬레이터 한 대 · Release Host 한 종류에서 했고, 실기 측정과 Android 확인은
  없습니다. 이 빌드의 유닛이 전부 문항 하나라 문항 → 문항 전환은 보지 못했고 문항 → 완료 장면으로
  근사했습니다(작업 영역의 전환은 미관찰).

## 결론과 후속

- 모바일 번들 +4,847 bytes(상한 안). ui-lynx dist −71 bytes(상한 그대로). 렌더링 · 메모리는
  미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: Android 에뮬레이터 회차가 e2e 문서의 Android 행(M3-A1 ~ M3-A8)을 채웁니다. iOS
  수집기로 듣기 유닛의 문항 전환 중 프레임 시간과 lesson-complete 첫 프레임을 잽니다. 2단계
  보고서가 넘긴 Loading 중 프레임 시간 · 동작 줄이기 켬 상태의 여정 맵 눌림 프레임 시간은 그대로
  남아 있습니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
