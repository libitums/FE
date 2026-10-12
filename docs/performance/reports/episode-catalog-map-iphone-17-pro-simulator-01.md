# 카탈로그 에피소드 맵 · 표지 컷 화면 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들 크기와 스레드 중복만 재었습니다.
- 기능 PR: 카탈로그 에피소드를 여정 맵에 · 표지 컷 화면(3b-2, 이 보고서와 같은 PR)
- 대상 commit: `feat/episode-catalog-map`의 `d5f6ff31`
- 기기: iPhone 17 Pro 시뮬레이터 — 화면 확인(e2e)만 했고 성능 캡처는 하지 않았습니다.
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle` · `packages/ui-lynx/dist`(Node 22.23.2).
- 측정 일시: 2026-10-12

## 시나리오

- 번들 크기: 3b-1 산출(`episode-catalog-progress-iphone-17-pro-simulator-01.md`)과 이 브랜치의 `main.lynx.bundle`을 비교했습니다.
- ui-lynx 산출물: `packages/ui-lynx/dist` 전체 바이트를 상한과 비교했습니다.
- 스레드 중복 확인: 3a 보고서와 같은 방법 — 내장 에피소드에만 있는 고유 문자열 「익선 게스트하우스 여성 도미토리」의 등장 횟수를 셌습니다.
  화면 경로가 내장 JSON을 메인 스레드로 끌고 오면 두 배가 됩니다.
- 이미지: `apps/mobile/dist/static/image` 크기를 비교했습니다.

## 이 변경이 무엇을 건드렸나

- 메인 · 백그라운드 두 스레드에 실리는 것: 맵의 카탈로그 컴포넌트(`CatalogMapSections` · `CatalogEpisodeSection` · `CatalogUnavailableSection` ·
  `CatalogCoverMapItem` · `CatalogLockedUnitNode` · `CatalogEpisodeHeader` · `JourneyMapHeaderSlot`), 컷 화면 `CatalogCoverScreen`, 순수 모듈
  (`catalog-map.ts` · `catalog-title.ts` · `catalog-cover.ts`), 결선(`catalog-cover-wiring.ts` · `render-catalog-cover.tsx`), 영어 문구, CSS 둘.
- 백그라운드만: 카탈로그 로더(`episode-content-loader.ts`)와 갱신 훅 확장.
- ui-lynx: `VisualNovelDialog`의 지문 prop(`aside` · `asideTranslation`)과 `EpisodeHeader`의 `titleLines` · `titleSize`.
- 새 이미지 · 음원 · 의존성은 없습니다. 컷 그림은 서버 버킷에서 받습니다(ADR-0056 D10).

## 분석 결과

| 번들 | 크기 |
| --- | --- |
| 3b-1 산출 | 1,679,737 bytes |
| 이 브랜치(`d5f6ff31`) | 1,720,937 bytes |
| 차 | +41,200 bytes (+2.5 %) |

| ui-lynx dist | 크기 |
| --- | --- |
| 이전 상한 | 507,000 bytes |
| 이 브랜치 | 512,483 bytes(약 512.5 kB) |

- 계약 예측(+18 ~ 30 kB)보다 컸습니다. 계약 뒤에 머리 카드 줄 나눔 · 타자기 · 배경 페이드 · 독백 패널이 더해졌습니다. 항목별로 쪼개 재지는 않았습니다.
- 스레드 중복 없음: 고유 문자열은 번들에 **3회**로 3a와 같습니다. 화면 경로는 포트로만 카탈로그를 받아 내장 JSON이 메인 스레드로 새지 않았습니다.
- 이미지: `static/image` 8,688,181 bytes — 이 PR이 더한 그림은 0장입니다.
- 상한: `main.lynx.bundle` 1,680,000 → 1,722,000 bytes(여유 1,063), `packages/ui-lynx/dist` 507,000 → 513,000 bytes(여유 517)로 실측만 반영했습니다.

## 결론과 후속

- 번들 증가는 새 화면 하나와 맵 구획 컴포넌트가 두 스레드에 실린 몫입니다. 다음 내장 에피소드 · 3c 레슨 연결 때 다시 올려야 합니다.
- 런타임에서 재야 할 것: 카탈로그 첫 읽기(내장 셋 zod 디코드 — 백그라운드 effect, 스플래시 동안)와 컷 화면의 첫 그림 표시 지연(원격 그림). 3c에서
  `performance:capture`로 잽니다.

## 제한 사항

- 빌드 1회 표본이고 렌더링 · 메모리 · 디코드 시간 · 그림 로드 시간은 미측정입니다. 이 기록은 기준값이 아니며 성능 판정을 하지 못합니다.
- 원격 그림은 시뮬레이터에서 그려지는 것만 확인했습니다. 지연 · 실패 경로의 체감은 기기에서 재지 않았습니다.
