# 에피소드 번역 파일 분리 — 미측정 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 · 프레임 캡처를 돌리지 않았습니다.
- 기능 PR: 수준 4 매니페스트의 언어별 번역 파일을 받아 적용하고, 앱 콘텐츠 수준을 4로 올립니다 — ADR-0102.
- 대상 commit: `main` 위의 `feat/episode-translation-files`
- 기기: 측정 기기 없음.
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-11-05

## 시나리오

- 번들 크기: CI 설정 빌드 `main.lynx.bundle` 3,882.8 kB(상한 4,060.0 kB 통과). 내장 콘텐츠는 바꾸지 않았습니다(ADR-0102 D4는 미룸).
- 받는 양: 수준 4 버킷 사본(18편) 기준 한 언어 사용자는 번역 파일 18개(편당 약 10 kB)를 받습니다. 지금은 네 언어 표가 본문마다 실려 같은 사용자가 약 40 kB씩 받습니다 — 파일 크기로 계산한 값이고 기기에서 잰 값이 아닙니다.
- 런타임: 미측정. 받기 차례마다 저장된 번역 원문의 sha256을 한 번씩 계산하고(편당 약 10 kB), 카탈로그를 만들 때 저장된 파일을 디코드해 그 언어 표를 바꿉니다.

## 이 변경이 무엇을 건드렸나

- `episode-manifest.ts`(항목 `translations`), `episode-translation-files.ts` · `episode-catalog-translations.ts`(디코드 · 덧씌우기), `episode-translation-sync.ts`(받기 단계), `episode-refresh.ts`, `episode-catalog.ts`(수준 4), `episode-content-loader.ts` · `episode-cache.ts`(저장 원문 읽기), `episode-content.ts`(세션 병합의 번역표 교체), `ui-language.ts`(저장 알림), `use-episode-content-refresh.ts`.

## 분석 결과

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- 이 기록은 성능 판정이 아닙니다. 번들이 상한 안이라는 것만 압니다. sha256 계산과 카탈로그 재구성의 시간 · 메모리 비용은 재지 않아 아직 판정할 수 없습니다(미측정의 한계).

## 결론과 후속

- 미측정입니다.
- 후속: 저사양 Android에서 18편 · 한 언어 기준 받기 차례의 소요와, 설정에서 언어를 바꾼 뒤 화면에 번역이 서기까지를 봅니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
