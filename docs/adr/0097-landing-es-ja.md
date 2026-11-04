# ADR-0097 — 랜딩에 스페인어 · 일본어 페이지를 연다 (서체 · 번역 출처 · DB locale)

- 상태: **채택 — 랜딩(`apps/landing`) + Supabase 마이그레이션 하나.** 앱 변경 0.
- 날짜: 2026-11-04.
- **사용자 결정**(2026-11-04): 「스페인어와 일본어도 별도로 랜딩페이지 반영 작업」 — [ADR-0094](0094-landing-vi-id-ms.md)와 같은 절차(문구표 · 체험판 문구 · 목업 · Story 글 · OG ·
  체험판 번역표 · DB locale), 별도 PR.
- 다루는 축: ADR-0094의 구조에 두 언어를 더하는 것과, 두 언어가 새로 요구하는 **서체**. 구조는 바꾸지 않는다.
  **다루지 않는 것**: 앱의 es · ja UI(`entryLanguages`에는 있으나 문구표 · 번역표가 없다 — ADR-0031 「열 때 번역만 더한다」의 앱 몫), 번역 검수, 체험판 사본.

## 맥락

- ADR-0094로 언어 다섯(`en · ko · vi · id · ms`)이 같은 틀에 있다 — `languages` 목록, `Copy` · `TrialCopy` 표, Story 글 `story/text/<코드>.ts`, 체험판 번역표
  `u00-translations.ts`, `og-<코드>.jpg`, DB `locale` check. 언어를 더하는 절차는 README 「언어 더하기」 일곱 단계다.
- 앱에 vi · id 문구표는 있었지만 **es · ja는 없다** — 목업 · 체험판 번역표까지 전부 새로 옮겨야 한다(ms와 같은 처지).
- 서체(fontsource · Pretendard `unicode-range` 조사):

| 서체 | 일본어 | 스페인어 |
|---|---|---|
| Jost(강조) | 가나 · 한자 없음 | 라틴-1 전부(á í ó ú ñ ¿ ¡) |
| Pretendard(본문) | 히라가나 83/86 · 가타카나 86/90 · **신자체 한자 없음**(学 国 会 体 気 読 聞 続 私) | **á í ó ú ñ 없음**(é ü ¿ ¡만) |

  글리프 단위 폴백은 한 낱말 안에서 서체가 섞인다(ADR-0094 D3와 같은 판단).

## 결정

### D1. 언어 목록 `… · es · ja` — 주소 `/es/` · `/ja/`, 체험판 `/<코드>/try/`

- `pages.es`(`Español` · `es_ES`) · `pages.ja`(`日本語` · `ja_JP`). 문구표 `i18n/es.ts` · `ja.ts` · `trial-es.ts` · `trial-ja.ts`, Story 글 `story/text/es.ts` · `ja.ts`, 번역표 `u00Translations.es` · `ja`(47문장씩 — 257줄, 300줄 안).
- 말투: es는 친근한 「tú」, ja는 정중체(です · ます). **전부 사람이 옮긴 초안** — 원어민 검수 필요. FAQ 「앱은 어떤 언어인가」는 사실대로(es · ja UI는 아직).
- 일본어 FAQ 답은 「。」로 문장을 가르므로 `faq-copy.unit.test.ts`의 문장 분리를 「。」도 보게 넓혔다 — 답 둘 이하 규칙이 일본어에도 걸린다.

### D2. 서체 — ja는 Noto Sans JP 통째, es는 본문만 Inter

- `html[lang="ja"]`: `--font-default` · `--font-accent` · 체험판 타이포 토큰 열일곱 → `"Noto Sans JP Variable"`. 패키지 `@fontsource-variable/noto-sans-jp@5.3.1`(`wght.css`, 산출물 동봉, 다른 호스트 요청 0).
  `unicode-range` 조각이라 **일본어 글자가 있는 페이지만 받는다** — 영어 페이지의 CSS에도 규칙은 실리지만 파일은 받지 않는다(e2e가 es 페이지에서 JP 조각이 로드되지 않음을 본다).
- `html[lang="es"]`: 본문 `--font-default` → `"Inter Variable"`(ADR-0094 D3로 이미 동봉). 강조 Jost 그대로.
- 버린 안: 시스템 일본어 서체 스택(0바이트) — OS마다 인상이 달라 공유 카드 · 목업의 재현성이 없다. Pretendard JP — 패키지가 따로고 한글 페이지와 조각이 겹쳐 크기만 는다.

### D3. 목업 · 체험판 번역 — 앱에 없는 UI를 보인다(ADR-0094 D2 · D4와 같은 처지)

- 목업 26 · 표현 3 · 맺음 1 · 체험판 콘텐츠 47은 사람이 옮겼다. 앱이 es · ja UI를 열면 그때 앱 문구표와 맞춘다(재검토 조건).

### D4. DB `locale` — 마이그레이션 `20261104140000_web_trial_locales_es_ja.sql`

- 두 표의 check를 `('en','ko','vi','id','ms','es','ja')`로. MG8 · SS7의 「목록 밖」 probe는 `ja` → `fr`. **원격 적용은 사용자 작업**(직전과 같이 SQL Editor 또는 `supabase db push`).

## 테스트 계획 · 결과 (2026-11-04)

| 계층 | 무엇 | 결과 |
|---|---|---|
| unit | faq-copy(일곱 언어 · 「。」 분리) · trial-localize TL1~TL6(다섯 표) · trial-content TM9 · TM10 · episodes ST-3 | red 10 → 300 통과 |
| ui | trial-copy · NotFound(others 6) · SeoHead(alternates 6 · hreflang 8) · Record<Language> 표 셋 · `languages` 루프 | 413 통과(마크업 변경 없음 — 처음부터 green, 증거에 기록) |
| integration | build(pages 7 · I-A20 서체: `html[lang=ja|es]` 규칙 · Noto Sans JP · Inter @font-face · woff2 동봉) · trial-build(7 · IB1b) · supabase MG8 · SS7 | red 4 → 174 · 16 통과 |
| e2e(chromium) | landing(paths 7 · ja/es 서체 로드 · 외부 호스트 0 · axe) · content(hreflang 8 · sitemap 7 · llms) | 129 통과 · 1 skip(첫 실행부터 — moot) |
| 사람 | 390 · 1440 스크린샷: 넘침 0, 신자체 한자 · ñ · ¿ 정상, 목업 줄바꿈 정상 | — |

## 대가

- 산출물에 Noto Sans JP 조각이 더해진다(일본어 페이지만 받는다). 번역은 초안. 목업 · 체험판은 앱에 없는 es · ja UI를 보인다.

## 재검토 조건

- 앱이 es 또는 ja UI를 열면 → D3의 문구를 앱 문구표와 맞춘다. 앱 서체 결정(ADR-0091 재검토 조건)이 Noto Sans JP와 다르면 → D2를 맞춘다.
- 언어가 더 늘면 → README 「언어 더하기」 일곱 단계 그대로. 라틴 · 가나 밖 글자면 D2처럼 `unicode-range`를 먼저 본다.
