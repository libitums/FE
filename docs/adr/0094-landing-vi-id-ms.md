# ADR-0094 — 랜딩에 베트남어 · 인도네시아어 · 말레이어 페이지를 연다 (목업 · 체험판 · 서체 · DB locale)

- 상태: **채택 — 랜딩(`apps/landing`) + Supabase 마이그레이션 하나.** 앱 변경 0.
- 날짜: 2026-11-04.
- **사용자 결정**(2026-11-04): 랜딩에 말레이시아어 · 베트남어 · 인도네시아어를 더하고, **내부 미리보기 화면(Features의 휴대폰 목업)도 그 언어로** 보인다.
- 다루는 축: [ADR-0043](0043-landing-static-site.md)의 언어 목록(`/` 영어 · `/ko/` 한국어)에 셋을 더하는 것과, 그때 같이 움직여야 하는 네 가지 —
  목업 · 첫 표현 · 맺음 인용의 **뜻풀이와 화면 UI 문구**, 웹 체험판([ADR-0083](0083-web-trial-and-episode-core.md))의 문구와 사전 등록 · 수집 표의 `locale`, 베트남어 서체, 공유 카드 그림.
  **다루지 않는 것**: 앱의 말레이어 UI(없다 — [ADR-0093](0093-indonesian-localization.md)), 체험판 콘텐츠(u00) 뜻풀이의 번역(아래 D4), 번역 검수.

## 맥락

- 랜딩은 언어 목록(`src/site.ts`의 `languages`)을 따라 주소 · 언어 메뉴 · hreflang · sitemap · `llms.txt` · 404 링크가 자동으로 늘도록 만들어져 있다(README 「언어 더하기」).
  그러나 **목업 · 첫 표현 · 맺음 인용의 뜻풀이와 화면 UI 문구는 컴포넌트에 영어로 박혀 있었다** — 앱 UI가 영어 하나였을 때의 모양이다.
- 앱은 그사이 베트남어([ADR-0091](0091-vietnamese-localization.md)) · 인도네시아어([ADR-0093](0093-indonesian-localization.md)) UI를 열었다. 말레이어 UI는 없다 —
  ADR-0093은 「말레이시아 사용자도 인도네시아어를 상당 부분 읽는다」로 인도네시아어를 골랐다.
- 랜딩 서체 Jost(강조) · Pretendard(본문)에는 베트남어 글자(U+1EA0 ~ U+1EF9)가 없다 — fontsource · Pretendard 동적 서브셋의 `unicode-range`로 확인.
  글리프마다 시스템 서체로 떨어지면 한 낱말 안에서 서체가 섞인다.
- 체험판의 사전 등록 · 인식 글자 수집 표는 `locale in ('en', 'ko')`로 닫혀 있다 — 새 언어 페이지가 보내는 `vi` 등은 23514로 거부된다.

## 결정

### D1. 언어 목록 `en · ko · vi · id · ms` — 주소는 `/vi/` · `/id/` · `/ms/`, 체험판은 `/<코드>/try/`

- `src/site.ts` `languages`에 셋을 더하고 `pages`에 이름(`Tiếng Việt` · `Bahasa Indonesia` · `Bahasa Melayu`) · 영어 이름 · locale(`vi_VN` · `id_ID` · `ms_MY`) · 제목 · 설명 · 공유 카드를 적었다.
  문구표 `src/i18n/vi.ts` · `id.ts` · `ms.ts`(`Copy` 전부)와 체험판 `trial-vi.ts` · `trial-id.ts` · `trial-ms.ts`(`TrialCopy` 전부).
- 말투: vi는 앱 문구표와 같은 「bạn」, id는 앱과 같은 「kamu」(ADR-0093 D3), ms는 「anda」. Great · Not quite · Me · Next · Message 같은 낱말은 앱의 vi · id 문구표와 맞췄다.
- **번역은 초안이다** — 파일 머리에 「원어민 검수 필요」. 검수로 바뀌는 것은 값뿐이다.
- 브라우저 언어로 자동 전환하지 않는다(ADR-0043 그대로 — 주소 하나가 언어 하나).

### D2. 목업 · 첫 표현 · 맺음 인용의 **UI 문구와 뜻풀이는 문구표 키**다 — 한국어 대사는 컴포넌트에 남는다

- `Copy`에 `mock…` 26키(Episode 3. · Scene 4 / 4 · Next · Message · How will you reply? · Mute · Speaker · End · Lesson 2 / 5 · Speaking · Read the sentence out loud. · Slow ·
  You said all 3 words. · Try again · Stop speaking과 u03 대사 여덟의 뜻풀이) · `word…Gloss` 셋 · `closingGloss`를 더했다. `Features.astro` · `Words.astro` · `Closing.astro`가 읽는다.
- 값의 원칙: **앱이 그 언어 UI로 보여 주는 것**. en · vi · id는 앱 문구표의 낱말(`Tiếp` · `Tin nhắn` · `Berikutnya` · `Pesan` …)과 내장 u03 번역표의 뜻풀이 초안.
  **ko는 영어 그대로다** — 앱에 한국어 UI가 없어 한국어 페이지의 목업도 앱이 보여 주는 영어다(바뀐 것 없음).
- **ms는 앱에 없는 말레이어 UI를 목업에 보인다 — 사용자 결정**(「내부 미리보기 화면도 다」). 앱이 말레이어를 열면 그때 앱 문구표와 맞춘다. FAQ 「앱은 어떤 언어인가」는
  사실대로 「영어 · 베트남어 · 인도네시아어, 말레이어는 아직」이라고 말한다.
- 같은 FAQ의 en · ko 답도 사실에 맞게 고쳤다 — 「지금은 영어」 → 「영어 · 베트남어 · 인도네시아어」, 「영어 뜻」 → 「뜻」. 가격 · 수치 규칙(`faq-copy.unit.test.ts`)은 다섯 언어 전부에 건다.

### D3. 베트남어 페이지만 서체를 바꾼다 — 강조 League Spartan(앱과 같이) · 본문 Inter

- `html[lang="vi"]`에서 `--font-accent`를 `"League Spartan Variable"`(ADR-0091 D5와 같은 글꼴), `--font-default`를 `"Inter Variable"`(Pretendard의 바탕)로 다시 정의하고,
  체험판이 읽는 타이포 토큰(`--libitum-typography-*-font-family`) 열일곱도 같은 자리에서 그 둘로 돌린다.
- 파일은 `@fontsource-variable/league-spartan` · `@fontsource-variable/inter`(5.3.0)로 **산출물에 함께 싣는다** — 다른 호스트로 요청하지 않는다(기존 I-A19 · e2e 서체 검사 그대로).
  `unicode-range`가 있어 **다른 언어 페이지는 이 파일을 받지 않는다**. 인도네시아어 · 말레이어는 기본 라틴뿐이라 Jost · Pretendard 그대로(ADR-0093 D4와 같은 판단).
- 버린 안: 베트남어도 Pretendard → 시스템 서체 폴백에 맡기기(앱의 본문이 그렇다) — 웹은 글리프 단위 폴백이 눈에 보여 버렸다. Jost 전체를 바꾸기 — 영어 페이지의 인상을 바꿀 이유가 없다.

### D4. 체험판은 UI 문구만 그 언어다 — 콘텐츠(u00) 뜻풀이는 영어 그대로

- `/vi/try/` 등은 `TrialCopy`를 그 언어로 그리고, 사전 등록 · 수집의 `locale`에 페이지 언어를 보낸다(`PreregLocale`을 `languages`와 같게 넓혔다).
- 체험판 사본 `src/trial/content/u00-tutorial.json`은 앱 **테스트 고정본(2026-10-23판)에 바이트로 핀**돼 있고 번역표가 없다(`devtools/trial-assets`). 그래서 컷 번역 · 보기 뜻풀이는
  앱이 번역표 없는 에피소드를 보일 때와 같이 **영어**다(ADR-0091 「대가」와 같은 상태). 재검토 조건: 체험판을 u00 최신판(번역표 있음)으로 옮길 때 `episode-core`의 번역표로 뜻풀이를 바꾼다.

### D5. DB `locale` 목록을 넓힌다 — 마이그레이션 `20261104120000_web_trial_locales.sql`

- `pre_registrations` · `trial_speech_samples`의 check를 `('en', 'ko', 'vi', 'id', 'ms')`로. 열 · 권한 · 정책은 그대로. 마이그레이션 통합 테스트 MG8 · SS7이 다섯 값을 넣어 본다.
- **원격 적용은 사용자 작업이다** — 적용 전에는 새 언어 페이지의 사전 등록이 「다시 시도」로, 인식 글자 수집은 조용히 버려진다(둘 다 체험 진행은 막지 않는다).

### D6. 공유 카드 그림은 명령으로 찍는다 — `scripts/shoot-og.mjs`

- README 「그림」의 수동 절차(1200×630 · 머리 링크 · 언어 메뉴 · 받기 버튼 · 체험판 버튼 · 스크롤 안내 숨김 · `reducedMotion: reduce`)를 스크립트로 옮겼다.
  서버는 e2e의 정적 서버(`e2e/serve.mjs`)다 — Astro 7의 `astro preview`는 데몬으로 남아 스크립트가 끝나도 살아 있어 쓰지 않는다.
  `pnpm landing:build` 뒤 `node apps/landing/scripts/shoot-og.mjs vi id ms`가 `public/og-<코드>.jpg`를 쓴다. en · ko도 같은 명령으로 다시 찍을 수 있다(이번에는 그대로 둔다).

## 테스트 계획

| 계층 | 무엇 |
|---|---|
| unit | `faq-copy`: 다섯 언어 × 두 상태의 FAQ 모양(가격 · 수치 · 공항 금지 · 둘 이하 문장 · `Duru`로 시작 · 출시 전 표지 · 한글 유무 · en 베끼기 없음). `episodes`: 다섯 언어의 제목 · 때 · 티저 · 대체 문구 |
| ui | `trial-copy`: 네 언어가 en의 키 · 자리표시자와 같고 en을 베끼지 않음. `Features` FT7 · `Words` WD2/3 · `Closing` CL1: 목업 UI 문구 · 뜻풀이가 `t`를 따르고 한글이 섞이지 않음(다섯 언어). `Header` · `NotFound` · `SeoHead` · `Landing` · `TrialPage` · `TrialAccessibility`: 언어 목록을 따름 |
| integration | `build`: 다섯 페이지의 hreflang(6) · sitemap(5) · `llms.txt`(영어 이름 · 성조 글자 없음) · og 파일. `trial-build`: 다섯 체험판 페이지 · 랜딩 링크. supabase `pre-registrations` MG8 · `trial-speech-samples` SS7 |
| e2e | `landing.e2e.ts` 다섯 주소의 넘침 · 제목 단계 · 키보드 · axe · 서체, `content.e2e.ts`의 head · sitemap · `llms.txt` |
| 사람 | `/vi/`의 강조 · 본문 서체가 League Spartan · Inter로 그려지고 성조 부호가 잘리지 않는가. 번역 검수 |

## 대가

- 산출물에 서체 둘이 더해진다(베트남어 페이지만 받는다). 빌드 페이지 수 2 → 5(체험판 포함 4 → 10).
- 번역은 초안이다. 말레이어 목업은 앱에 없는 화면을 약속한다(D2 — 사용자 결정).
- 체험판의 콘텐츠 뜻풀이는 영어다(D4).

## 재검토 조건

- 앱이 말레이어 UI를 열면 → D2의 ms 목업 문구를 앱 문구표와 맞춘다.
- 체험판 사본을 번역표 있는 u00으로 올리면 → D4.
- 언어가 더 늘면 → `languages` · 문구표 둘 · `story/text/<코드>.ts` · `og-<코드>.jpg` · DB check(마이그레이션) 다섯 자리만 더한다.
  (Story 글은 다섯 언어가 되며 `episodes.ts`가 300줄 상한을 넘겨 언어별 파일로 나눴다 — `episodes.contract.ts`의 id 목록이 다섯 파일과 배열을 타입으로 묶는다.) 라틴 밖 글자면 D3처럼 서체를 본다.
