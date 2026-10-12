# 카탈로그 에피소드 진행 저장 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들 크기만 재었습니다. 화면 변경은 없고
  진행 상태에 필드 하나(`catalogProgress`)가 늘었을 뿐이라 렌더 경로는 같습니다.
- 기능 PR: 카탈로그 에피소드 진행을 완료 유닛 id로 저장 · 서버 키별 합집합(3b-1, 이 보고서와 같은 PR)
- 대상 commit: 3a 브랜치(`feat/episode-content-catalog`) 위의 `feat/episode-progress-catalog`
- 기기: iPhone 17 Pro 시뮬레이터 — 실행하지 않았습니다(화면 변경 0).
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: `pnpm verify`의 `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle`(Node 22.23.2).
- 측정 일시: 2026-10-12

## 시나리오

- 번들 크기: 3a 산출(1,678,971 bytes)과 이 브랜치의 `main.lynx.bundle`을 비교했습니다.

## 이 변경이 무엇을 건드렸나

- `src/lib/catalog-progress.ts`(순수 함수) · `app/learning-progress.ts`(스냅숏 읽기 · 쓰기 · 병합) · `app/use-journey-progress.ts`(상태 하나) ·
  `app/journey-progress-sync.ts`(빈 상태). 서버 SQL 마이그레이션은 번들과 무관합니다.

## 분석 결과

| 번들 | 크기 |
| --- | --- |
| 3a 산출 | 1,678,971 bytes |
| 이 브랜치 | 1,679,737 bytes |
| 차 | +766 bytes |

상한 1,680,000 안입니다(여유 263 bytes). 다음 화면 PR(3b-2)에서 상한을 다시 봐야 합니다.

## 결론과 후속

- 번들 증가는 진행 함수 몇 개분입니다. 성능 판정 대상이 없습니다.
- 진행 저장 요청 크기는 카탈로그 진행이 생길 때 에피소드당 약 70 bytes 늘어납니다 — 3b-2가 실제로 기록하기 시작하면 저장 요청 크기를 확인합니다.

## 제한 사항

- 빌드 1회 표본이고 렌더링 · 메모리 · 저장 요청 시간은 미측정입니다. 이 기록은 baseline이 아니며 성능 통과를 뜻하지 않습니다.
