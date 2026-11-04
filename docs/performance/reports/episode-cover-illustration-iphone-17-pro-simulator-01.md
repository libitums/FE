# 여정 맵 표지 노드 뒤 에피소드 일러스트 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 맵에 에피소드당 image 요소 하나(260 × 194, 내장 webp 또는 버킷 주소)와 래퍼 `view` 하나가 늘고, 순수 파생 함수 둘이 더해진 것뿐이라 렌더 경로의 모양이 바뀌지 않는다. 그림은 Lynx image 요소가 직접 받아 그리므로 JS 스레드 일이 늘지 않는다.
- 기능 PR: 표지 일러스트 — 매니페스트 선택 키 `cover`, 표지 노드 뒤 일러스트(짝수 왼쪽 · 홀수 오른쪽), 잠김 불투명도, 표지 라벨 한 줄 `Intro`, 내장 webp 셋([ADR-0099](../../adr/0099-episode-cover-illustration.md))
- 대상 commit: 이 보고서와 같은 PR의 `feat/episode-cover-illustration` 브랜치 HEAD(origin/main `fdbb6ce6` 위)
- 기기: 측정 기기 없음(번들 크기만) — 화면 확인은 시뮬레이터 · 실기에서 사용자가 한다([e2e](../../e2e/episode-cover-illustration.md))
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle` · `dist/static/image/`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-11-04

## 시나리오

- 번들 크기: origin/main(`fdbb6ce6`, #366)을 같은 설정으로 임시 작업 트리에서 빌드한 실측과 이 변경을 비교했다.

## 이 변경이 무엇을 건드렸나

- JS: 매니페스트 디코더 · 카탈로그에 `cover` 한 줄씩, 순수 모듈 `catalog-cover-illustration.ts`(함수 둘), 표지 노드의 래퍼 + `<image>`, `SpecialUnitMapItem`의 라벨 한 줄화(「SPECIAL」 윗줄 · `eyebrow` 문구 5개 언어 삭제), CSS 규칙 6개(z-index 없음).
- 정적 그림: 내장 webp 11장(`static/image/u00-tutorial.*.webp` 11,268 · `u01-water` 19,096 · `u02-checkin` 25,228 · `u03-mina` 10,040 · `u04-directions` 12,874 · `u05-baekban` 8,416 · `u06-cafe` 12,086 · `u07-jaemin` 11,398 · `u08-umbrella` 8,040 · `u09-subway` 12,594 · `u10-laundry` 12,170 bytes, 합 143,210). `static/image` 예산 안.
- 의존성 · 음원 · 네이티브는 바뀌지 않았다.

## 분석 결과

| 산출물 | main `fdbb6ce6` | 이 변경 | 차이 |
| --- | ---: | ---: | ---: |
| `main.lynx.bundle` | 3,864,263 bytes | 3,866,861 bytes | +2,598 (+0.07 %) |
| `static/image` | 4,100 kB | 4,260 kB | +160 kB (webp 11장) |

- 상한(`main.lynx.bundle` 4,060,000 · `static/image` 11,520,000)은 그대로 둔다 — 둘 다 안이다.

## 제한 사항

- 번들만 쟀고 렌더 성능은 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- 그림 로드(기기 디스크 → 뷰)의 비용은 image 요소 몫이라 여기서 보지 않는다. 맵에 보이는 에피소드 수만큼(지금 셋) 더 그린다.

## 결론과 후속

- 표지 일러스트의 실제 배치 · 스크롤 · 오프라인 표시는 [e2e](../../e2e/episode-cover-illustration.md) EC-1 ~ EC-7로 기기에서 확인한다.
- u10까지 내장이 끝났다. u11부터는 버킷(`images/covers/`)이라 `static/image`는 더 늘지 않는다.
