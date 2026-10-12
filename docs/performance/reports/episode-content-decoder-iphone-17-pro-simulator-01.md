# 에피소드 콘텐츠 디코더 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들 크기만
  재었습니다. 이 변경에는 화면이 없고 디코더를 참조하는 소비자도 아직 없어, 런타임 경로에
  실행되는 코드가 더해지지 않았습니다.
- 기능 PR: delivery-2 에피소드 JSON의 zod 와이어 스키마 · 디코더 · 도메인 모델 · 픽스처 테스트
  (이 보고서와 같은 PR). 계약은 `docs/specs/episode-content-json-contract.md`.
- 대상 commit: `main`(`aaa63732`) 위의 브랜치 `feat/episode-content-type-schema`(`5f0aa45a`)
- 기기: iPhone 17 Pro 시뮬레이터 — 실행하지 않았습니다(화면 변경 0). 기기 항목은 비교 가능하게
  앞선 기록과 같은 이름을 적습니다.
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: 번들 크기는 `pnpm --filter @libitums/mobile build`의 `main.lynx.bundle`입니다(Node 22.23.2,
  `ui-lynx` dist를 먼저 빌드). Release Host는 빌드하지 않았습니다.
- 측정 일시: 2026-10-12

## 시나리오

- 번들 크기 (a): `main`(`aaa63732`)과 이 브랜치를 각각 빌드해 `apps/mobile/dist/main.lynx.bundle`
  크기를 비교했습니다.
- 번들 크기 (b) — 잠재 비용 탐침: 백그라운드 전용 모듈 하나(`src/lib/posthog-client.ts`) 끝에
  `decodeEpisode` import 한 줄을 임시로 넣고 빌드한 뒤 `git checkout`으로 되돌렸습니다(되돌린 뒤
  diff 0). 소비자가 붙었을 때 zod/mini + 디코더가 번들에 더할 크기를 미리 재기 위해서입니다.
- 화면 확인: 없음 — 이 PR은 화면을 바꾸지 않습니다.

## 이 변경이 무엇을 건드렸나

- `src/lib/episode-content.schema.ts`(zod/mini 와이어 스키마) · `.model.ts`(도메인 타입) ·
  `.normalize.ts` · `.items.ts` · `episode-content.ts`(`decodeEpisode`). 런타임 모듈 넷은 전부
  `background-only`라 메인 스레드에는 실리지 않습니다.
- `zod` `4.6.5`를 `apps/mobile` `dependencies`에 추가. 아직 어느 앱 코드도 디코더를 import하지
  않으므로 산출물에는 들어가지 않습니다.
- 픽스처 JSON 셋은 `apps/mobile/content/`(src 밖)에 두어 번들 대상이 아닙니다.

## 분석 결과

| 번들                                   | 크기            |
| -------------------------------------- | --------------- |
| `main` (`aaa63732`)                    | 1,426,482 bytes |
| 이 브랜치 (a) — 디코더 미참조          | 1,426,482 bytes |
| 탐침 (b) — 디코더 import 한 줄 추가    | 1,452,161 bytes |
| 차 (a) − `main`                        | 0 bytes         |
| 차 (b) − (a) — zod/mini + 디코더 잠재 비용 | +25,679 bytes |

`main`과 이 브랜치의 산출물은 바이트까지 같습니다. 모바일 번들 상한(`budget.json`
1,420,000 bytes)은 **`main` 시점에 이미 6,482 bytes 넘어 있습니다**(#233 병합 뒤 `main`의 CI
「Build and bundle size」 잡도 실패) — 이 PR이 넘긴 것이 아니고, 이 PR은 상한을 올리지 않습니다.

## 결론과 후속

- 이 PR은 번들 · 런타임에 변화가 없습니다. 성능 판정을 내릴 대상이 없습니다.
- 디코더를 처음 참조하는 PR(3단계 — 콘텐츠 소스 인터페이스 · 여정 맵 개방)에서 약 +26 kB가
  더해지므로, 그 PR에서 상한 인상과 함께 이 수치를 다시 잽니다. `zod/mini` 대신 `zod`(classic)로
  바꾸면 그보다 커질 것이므로 바꾸지 않습니다.
- `main`의 기존 초과분(+6,482)은 별도 결정입니다 — 이 보고서는 사실만 적습니다.
- 디코더의 실행 시간(에피소드 하나 디코드 — 픽스처 기준 문항 78 ~ 123개)은 재지 않았습니다.
  백그라운드 스레드에서 한 번 돌고, 소비자가 붙을 때 `performance:capture`로 잽니다.

## 제한 사항

- 단일 빌드 1회씩이라 빌드 간 변동은 보지 못했습니다(두 빌드의 `main` 값이 바이트까지 같아
  결정적이라고 보지만 1회 표본입니다).
- 탐침 (b)는 소비자 PR의 실제 증가분이 아닙니다 — import 위치 · 트리 셰이킹 결과에 따라 달라질 수
  있는 상한 추정값입니다. 일반화할 수 없고, 상한 인상의 근거는 그 PR의 실측이어야 합니다.
- 렌더링 · 메모리 · 디코드 시간은 미측정입니다. 이 기록은 baseline이 아니며 성능 통과를 뜻하지
  않습니다.
