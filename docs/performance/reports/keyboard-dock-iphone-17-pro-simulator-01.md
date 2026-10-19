# 자판 바닥 붙이기(셸 `keyboard-dock` 모드 · 메신저 · 타자 입력) — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 자판이 서고 걷힐 때의 다시 그림도 재지 않았습니다.
- 렌더를 재지 않은 이유: 이 변경은 새 상태 · 새 효과 · 새 모션을 더하지 않고 **배치만** 바꿉니다 — 자판이 서고 걷히는 조건은 지금의 국면 조건 그대로이고(순수 함수 `messengerReplyArea` · `typingKeyboardDock`로 옮겼을 뿐), 새 상자 셋(바깥 · 몸통 · 키 줄 묶음)은 인라인 여백만 집니다. 바깥 상자의 자식 순서가 고정이라 자판이 서고 걷혀도 몸통(카드 · `LearningShell`)이 다시 mount되지 않는다는 것은 ui 테스트(MU · TU)가 트리로 지킵니다. 셸이 렌더마다 부르는 `shellInsetsOf`는 메모이즈된 계획 조회(맵 두 번 조회)입니다 [코드].
- 기능 PR: 자판 바닥 붙이기 — 인셋 순수 함수(`lib/keyboard-dock.ts`) · 셸 모드(`app/shell-edges.ts`, `AppSession` 한 줄 결선) · 메신저 몸통 상자와 자판 분리(`MessengerScreen` · `MessengerKeyboard` · CSS) · 타자 활동 몸통 / 자판 형제 배치(`TypingActivity` · CSS) · 결선 셋(`render-screen` · `render-roleplay-screen` · `render-catalog`) — 이 보고서와 같은 PR, [ADR-0070](../../adr/0070-keyboard-dock.md)
- 대상 commit: `c4c7b89d`(구현 · 테스트 · 번들 상한까지 든 마지막 commit). 기준은 main `02dfee15`의 CI 실측(`budget.json` note — 2,190,958 bytes)입니다.
- 기기: iPhone 17 Pro 시뮬레이터 — 성능 캡처는 하지 않았습니다. 번들 수치는 기기와 무관한 빌드 산출물입니다.
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle`(Node 22.23.2), 판정은 `pnpm size:check`. 같은 commit에서 두 번 — **CI 설정**(`apps/mobile/.env.local` 없음 — CI 실행의 값)과 **로컬 설정**(`.env.local` 있음).
- 측정 일시: 2026-10-19(구현 단계)

## 시나리오

- 번들 크기: main `02dfee15`의 CI 실측(2,190,958 bytes)과 이 commit의 `main.lynx.bundle`을 두 설정으로 비교했습니다.
- 런타임: 재지 않았습니다(위 「렌더를 재지 않은 이유」). 시뮬레이터 수동 확인(배치)은 [자판 바닥 붙이기 e2e](../../e2e/keyboard-dock.md) 회차 1이 집니다.

## 이 변경이 무엇을 건드렸나

- 두 스레드에 실리는 것: 순수 모듈 둘(`shell-edges.ts` · `keyboard-dock.ts`, 약 115줄), 국면 순수 함수 둘(`messengerReplyArea` · `typingKeyboardDock`), 두 화면 트리 재구성(메신저 바깥 상자 · 몸통 · 자판 분리, 타자 바깥 상자 · 몸통 · 자판 형제 — `MessengerScreen.tsx` · `TypingActivity.tsx` 합 +221 / −185줄), 자판의 키 줄 묶음 상자, CSS 규칙 다섯(`.messenger-screen-surface` · `.messenger-screen-reply-docked` · `.messenger-keyboard-rows` · `.typing-activity` · `.typing-activity-body`).
- 새 의존성 · 이미지 · 음원 · 내장 데이터 변화는 없습니다. ui-lynx · 네이티브 호스트 · 서버 변화도 0입니다.

## 분석 결과

| 번들                                       | 크기                        |
| ------------------------------------------ | --------------------------- |
| main `02dfee15` CI 실측(`budget.json` note) | 2,190,958 bytes             |
| 이 commit — CI 설정(`.env.local` 없음)      | 2,194,952 bytes             |
| 이 commit — 로컬 설정(`.env.local` 있음)    | 2,195,141 bytes             |
| main 대비 차(CI 설정)                       | +3,994 bytes (+0.18 %)      |
| main 대비 차(로컬 설정)                     | +4,183 bytes                |
| 계약 예측                                   | 약 +1,600 ~ 2,700 bytes     |
| 옛 상한 → 새 상한(`budget.json`)            | 2,192,000 → 2,197,000 bytes |
| 상한 대비(로컬 설정)                        | 1,859 bytes 여유            |

- **증가분은 전부 코드와 CSS입니다** — 위 「두 스레드에 실리는 것」의 몫이고, 항목별로 쪼개 재지 않았습니다.
- **예측보다 약 1.3 kB 큰 이유**: 계약 예측은 두 화면 트리 변경을 「약 40줄 · +500 ~ 900 bytes」로 잡았지만, 실제로는 두 화면의 JSX가 바깥 상자 · 몸통 · 자판의 세 갈래로 **다시 짜였습니다**(메신저는 답장 자리 삼항이 `messengerReplyArea`의 네 갈래 분기로, 타자는 `LearningShell`의 `workspace` 한 prop이 형제 자판과 몸통 상자로). 번들 크기는 줄 수가 아니라 ReactLynx 스냅샷 재구성(세 갈래와 조건부 슬롯)과 두 스레드(메인 · 백그라운드)에 코드가 함께 실리는 몫에서 오며, 예측이 이 이중 적재를 덜 잡은 것으로 봅니다 [추론 — 항목별 분해 없음]. 자판이 서고 걷힐 때의 다시 그림은 재지 않았습니다. 새 의존성 · 에셋은 없어 설명되지 않는 증가 요인은 보이지 않습니다.
- 「+5 kB를 넘으면 올리기 전에 원인을 본다」에 걸리지 않아 사전 승인 규칙(큰 값을 kB로 올림 + 빌드 변동 여유 1 kB)대로 상한을 올렸습니다. 근거는 `budget.json` note가 집니다.
- 로컬 설정이 CI 설정보다 189 bytes 큽니다 — 앞선 기록의 차이(약 +189)와 같습니다.

## 해석

- 부팅 · 맵 · 다른 학습형의 경로에는 새 계산이 셸의 `shellInsetsOf` 한 번뿐입니다 — `catalog-lesson`이 아니면 계획을 조회하지 않고, 카탈로그 레슨에서는 렌더가 이미 부르는 메모이즈된 계획을 같은 입력으로 다시 읽습니다 [코드].
- 자판 국면 전환(메신저 답장 · 타자 채점과 `Next`)에서 일어나는 일은 지금과 같은 조건의 자판 mount / unmount와 몸통 인라인 여백 하나의 바뀜입니다 — 껍데기 · 카드가 다시 mount되지 않습니다(ui 테스트가 트리로 지킴). 다시 그림의 비용이 늘었다고 볼 근거는 없지만 [추론], 재지 않았습니다.
- 타자 화면에서 자판이 카드 스크롤 밖으로 나와, 카드 스크롤 영역이 자판 높이(232 + 아래 인셋)만큼 줄었습니다. 스크롤 요소 수는 같습니다.
- 측정 한계: 런타임은 미측정이라 자판이 서고 걷힐 때의 프레임 · 레이아웃 비용, 메모리에 대해서는 아직 판정할 수 없습니다. 번들 수치도 설정별 단일 빌드이고, 예측과의 차이를 항목별로 나눈 자료가 없습니다.

## 결론과 후속

- 결론: 이 commit의 `main.lynx.bundle`은 CI 설정 2,194,952 · 로컬 설정 2,195,141 bytes이고, main 대비 +3,994 bytes(CI 설정)는 전부 인셋 · 셸 모드 순수 함수와 두 화면 트리 재구성 · CSS입니다. 상한은 2,197,000 bytes입니다.
- 후속: 자판 국면 전환의 다시 그림이 의심되는 관측(메신저 답장 뒤 · 타자 `Next` 뒤 깜빡임 · 튐)이 나오면 `performance:capture`로 그 전환을 잽니다. 병합 직전에 main이 앞서 있으면 그 위에서 번들을 다시 잽니다.

## 제한 사항

- 번들 빌드 표본은 설정별 1회입니다. 항목별 바이트 분해는 하지 않았습니다.
- main 값 2,190,958은 `budget.json` note에서 옮긴 값이고 이 단계에서 main을 다시 빌드하지 않았습니다.
- 런타임 · 메모리 · 자판 국면 전환의 다시 그림은 미측정입니다.
