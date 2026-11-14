# 콘텐츠 수준 5 디코더 — 01

## 실행 조건

- 측정 일시: 2026-11-13T15:00:00+09:00
- 상태: 미측정 — 런타임 성능(Rendering · Memory · Trace)은 수집하지 않았다. 디코더가 받는 모양을 넓히고 매니페스트 시도 경로를 하나 더한 변경의 영향 범위를 적은 기록이다
- 기능 PR: 없음 — 로컬 브랜치 `feat/content-level-5`(커밋 전 작업 트리)
- 대상 commit: `9876e2b5` 위의 커밋하지 않은 변경
- 기기: 없음(vitest · Node 22)
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `pnpm verify`의 `pnpm build` · `pnpm size:check` 통과
- 실행 회차: 01

## 시나리오

- 단계: staging 2026-11-10판 18편(수준 5 모양, u15 `aside` 보충)과 운영 level-4판 18편을 새 디코더(`decodeEpisode`)에 넣어 성공 여부와 경고를 본다.
- 하지 않은 것: 기기 실행, 디코드 시간 측정, 받기 시간 측정.

## 이 변경이 무엇을 건드렸나

- `@libitums/episode-core`의 와이어 스키마 세 군데(`why_wrong` 합집합 · `TURN_ORDER.context` nullable · RP `tiles_gloss` optional)와 정규화 분기 둘. 문항마다 분기 하나가 늘 뿐 루프 · 할당 구조는 같다.
- `CONTENT_CLIENT_LEVEL` 4 → 5: 처음 받기에서 `manifests/level-5.json`을 먼저 시도한다. 운영에 level-5가 없는 동안은 **매니페스트 요청이 한 번(404) 늘어난다**. level-5를 올리면 다시 한 번이다.
- 화면 · 부품 · 번들 구성은 바뀌지 않았다.

## 분석 결과

```text
staging 11-10판(수준 5 모양) 18편  디코드 성공 18 · 경고 0
운영 level-4판 18편              디코드 성공 18 · 경고 unresolved-ref만(변경 전과 같음)
pnpm verify                      테스트 · 빌드 · size:check 통과
```

## 해석

- 측정 한계: 디코드 · 받기 시간은 재지 않았다. 늘어난 비용은 매니페스트 404 한 번(level-5를 올리기 전까지)과 문항당 분기 하나다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아니다.
- 후속: level-5 콘텐츠를 올린 뒤 기기 절차(`docs/e2e/content-level-5.md`)에서 첫 실행 스플래시 대기(`episode_update_splash_closed.waitMs`)를 함께 본다 — 18편 본문을 다시 받는다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
