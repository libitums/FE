# 트로피 · 스트릭 모션과 학습 완료 폭죽 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들 크기만 재었습니다.
- 기능 PR: 머리 칩 오름 재생 · 지표 모달 등장과 반복 · 학습 완료 폭죽(이 보고서와 같은 PR, [ADR-0064](../../adr/0064-stat-motion.md))
- 대상 commit: `feat/stat-motion`. 기준은 main `402694ee`(#250 병합)입니다.
- 기기: iPhone 17 Pro 시뮬레이터 — 화면 확인(e2e)도 아직 돌리지 않았습니다(`docs/e2e/motion-reward.md` 「지표 모션」).
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle` · `packages/ui-lynx/dist`(Node 22.23.2), 판정은 `pnpm size:check`.
- 측정 일시: 2026-10-16

## 시나리오

- 번들 크기: 기준 main(`402694ee`)의 실측(`budget.json` note)과 이 브랜치의 `main.lynx.bundle`을 비교했습니다.
- 항목별 몫: 모션 CSS 세 파일을 하나씩 비워 다시 빌드해 그 파일의 몫을 재었습니다.

## 이 변경이 무엇을 건드렸나

- 메인 · 백그라운드 두 스레드에 실리는 것: 칩 재생 요소(빛 · 테두리 막 · 알갱이 · 굴림 상자)와 `stat-chip-motion.css`, 지표 모달의 감싼 view와 `journey-stat-modal-motion.css`,
  학습 완료 배지 컴포넌트(`LessonCompleteBadge` — 이동 + 폭죽 조각 28)와 `lesson-complete-confetti.css`, 글 올라옴 CSS.
- 백그라운드: 오름 표식(`lib/stat-bump.ts`)과 진행 훅의 기록 · 지움, 칩 재생 타이머.
- ui-lynx: 변경 없음.
- 새 이미지 · 음원 · 의존성은 없습니다.

## 분석 결과

| 번들                                     | 크기                     |
| ---------------------------------------- | ------------------------ |
| 기준 main `402694ee`(`budget.json` note) | 1,939,651 bytes          |
| 최종(이 PR)                              | 1,969,527 bytes          |
| 기준 대비 차                             | +29,876 bytes (+1.54 %)  |
| 옛 상한 → 새 상한                        | 1,941,000 → 1,971,000 bytes |

| 항목(그 파일만 비운 빌드와의 차)   | 몫          |
| ---------------------------------- | ----------- |
| `lesson-complete-confetti.css`     | 5,326 bytes |
| `journey-stat-modal-motion.css`    | 5,225 bytes |
| `stat-chip-motion.css`             | 4,485 bytes |
| 나머지(코드 · 결선 · 작은 CSS)      | 약 14.8 kB  |

- 첫 안은 폭죽 조각마다 keyframe을 두어 그 CSS 하나가 21,165 bytes였습니다(최종 1,986,673 bytes). 조각을 회전된 축에 세우고 keyframe 여섯을 공유하게 바꿔 걷었고, 칩 알갱이도 같은 방식으로 바꿨습니다.
- ui-lynx dist 510,1xx bytes · 이미지 8,688,181 bytes — 기준과 같습니다.
- 상한 변경은 **사용자 사전 승인**(실측 기능 증가면 실측으로 올리고 사후 보고) 범위입니다.

## 결론과 후속

- 증가는 CSS 세 파일(약 15 kB)과 두 스레드의 컴포넌트 코드가 나눠 가집니다. 상한은 실측만큼 올렸습니다.
- 런타임에서 재야 할 것(미측정): 학습 완료 첫 1초의 프레임(폭죽 view 28 + 배지 + 글 올라옴이 겹침), 지표 모달이 떠 있는 동안 반복 층 넷의 지속 비용(CPU · 배터리),
  칩 재생 중 view 아홉의 잠깐 늘어남. `performance:capture`로 잽니다.

## 제한 사항

- 빌드 표본은 한 commit이고 렌더링 · 메모리 · 프레임은 미측정입니다. 이 기록은 기준값이 아니며 성능 판정을 하지 못합니다.
- 항목별 몫은 파일 하나씩 비운 빌드의 차라 서로 더해도 합계와 정확히 같지 않습니다.
