# 맵 위 · 아래 여백 · 다음 에피소드 준비 중 구획 — Pixel 8 에뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: 맵 상자의 위 · 아래 고정 여백과 카탈로그 맨 끝 「다음 에피소드 준비 중」 구획(시안 C1, [ADR-0024](../../adr/0024-journey-units-and-special-unit-placement.md) 적용 기록 2026-10-17)
- 대상 commit: `feat/map-insets-coming-soon`. 기준은 `feat/catalog-unit-bubble`(#255) 끝입니다.
- 기기: Android 에뮬레이터 Pixel 8(API 37) — 화면이 서는 것만 봤습니다(`docs/e2e/journey-map.md` 「위 · 아래 여백 · 준비 중 구획」). 수치는 남기지 않았습니다.
- OS: Android 에뮬레이터 이미지(Pixel_8 AVD)
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle`(Node 22.23.2, CI 설정 — `.env.local` 없음), 판정은 `pnpm size:check`.
- 측정 일시: 2026-10-17

## 시나리오

- 번들 크기: 기준(#255 브랜치 실측, `budget.json` note)과 이 브랜치의 `main.lynx.bundle`을 비교했습니다.

## 이 변경이 무엇을 건드렸나

- 메인 · 백그라운드 두 스레드: `CatalogComingSoonSection`(view 약 15개 — 점선 고리 다섯 · 흐림 · 카드)과 `catalog-coming-soon.css`. 맵 상자 패딩 값.
- 백그라운드: `catalogComingSoonOrdinal` · `mapContentInsets` 상수 · 문구.
- 새 이미지 · 음원 · 의존성은 없습니다.

## 분석 결과

| 번들 | 크기 |
| --- | --- |
| 기준(#255 `feat/catalog-unit-bubble`) | 2,169,219 bytes |
| 이 브랜치 | 2,176,530 bytes |
| 기준 대비 차 | +7,311 bytes (+0.34 %) |
| 옛 상한 → 새 상한 | 2,170,000 → 2,177,000 bytes |

- 상한 변경은 **사용자 사전 승인**(실측 기능 증가면 실측으로 올리고 사후 보고) 범위입니다.

## 결론과 후속

- 증가는 준비 중 구획 컴포넌트 · CSS 몫입니다. 상한은 실측만큼 올렸습니다.
- 런타임에서 재야 할 것(미측정): 맵 맨 끝까지의 스크롤 길이가 늘어 생기는 스크롤 비용(위 200 · 아래 342 + 준비 중 구획), 그러데이션 · 그림자 한 장의 그리기 비용.

## 제한 사항

- 빌드 표본은 한 commit이고 렌더링 · 메모리 · 프레임은 미측정입니다. 이 기록은 기준값이 아니며 성능 판정을 하지 못합니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
