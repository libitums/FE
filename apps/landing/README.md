# apps/landing

Duru 랜딩 페이지다. [Astro](https://astro.build)로 만든 정적 사이트이고 workspace 패키지 `@libitums/landing`이다
([ADR-0043](../../docs/adr/0043-landing-static-site.md)). 무엇을 왜 싣는지는
[스펙](../../docs/specs/landing-page.md)에 있다.

**기본은 영어(`/`), 한국어는 선택(`/ko/`)이다.** 두 주소 모두 빌드 때 HTML로 구워진다 —
검색엔진이 스크립트를 돌리지 않아도 그 언어의 본문 · 제목 · 설명을 읽는다.

⟨2026-10-22⟩ 두 번째 페이지 **웹 체험판** `/try/` · `/ko/try/`가 있다 — 앱 설치 없이 튜토리얼 u00의 첫 장면을 브라우저에서 해 본다
([ADR-0083](../../docs/adr/0083-web-trial-and-episode-core.md)). 색인하지 않는다. 아래 「웹 체험판」.

## 명령

```sh
pnpm landing:dev     # 개발 서버 (http://localhost:4321, 한국어는 /ko/)
pnpm landing:build   # apps/landing/dist 에 정적 파일을 만든다
pnpm --filter @libitums/landing preview    # 빌드 결과를 그대로 띄운다
pnpm --filter @libitums/landing typecheck  # astro check
pnpm --filter @libitums/landing test:unit         # 순수 함수 (src/seo, 문구 데이터, src/scripts/analytics-events, src/analytics/airbridge*, src/trial의 리듀서 · 모델 · 파생)
pnpm --filter @libitums/landing test:ui           # 컴포넌트 하나를 그려 마크업을 본다
pnpm --filter @libitums/landing test:integration  # 실제로 빌드해 산출 파일을 본다
pnpm --filter @libitums/landing test              # 위 셋을 차례로
pnpm test:e2e:landing                            # 브라우저 e2e (Playwright — chromium · firefox · webkit · 모바일 · analytics)
pnpm test:trial-assets                           # 체험판 사본(u00 JSON · 그림 · 효과음)이 앱 원본과 같은가 — 루트 도구, verify 안
```

2026-10-08 기준 unit 99 · ui 100 · integration 35 · e2e 190건이다. ⟨2026-10-22⟩ 체험판이 더해져 vitest 49 파일 481건(unit · ui · integration 합) ·
e2e 272건 통과 · 18 skip, 같은 날 r2(표지 제거 · 꿈 전환 · Episode clear · 사전 등록 · 전체화면) 뒤 vitest 55 파일 555건(unit 224 · ui 188 · integration 143) ·
e2e 315건 통과 · 27 skip이다. ⟨2026-10-30⟩ Airbridge Web SDK(아래 「분석」)가 더해져 vitest unit 286 · ui 200 · integration 171,
e2e는 chromium · analytics · analytics-mobile 세 프로젝트에서 128건 통과 · 1 skip(firefox · webkit · 모바일은 그날 돌리지 않았다)이다.

브라우저 e2e는 처음 한 번 `pnpm --filter @libitums/landing exec playwright install chromium firefox webkit`로 브라우저를 받는다.
**빌드는 둘, 프로젝트는 여섯이다**(`playwright.config.ts`). `SITE_URL=https://example.test` · `PUBLIC_SUPABASE_URL=https://content.example.test`(체험판 음성 · 사전 등록의 가짜 주소 — 요청은 테스트가 가로채 작은 소리 · 404 · 가짜 PostgREST 응답으로 답한다) · `PUBLIC_SUPABASE_ANON_KEY`(가짜 공개 키)로 `.e2e-dist/`에 지어 4399에 띄우고,
거기에 테스트용 측정 ID `G-E2ETEST00`과 ⟨2026-10-30⟩ 가짜 Airbridge Web SDK 토큰 `e2e-test-web-token-0000000000`(`playwright.config.ts`의 `webToken`)을 더해
`.e2e-dist-ga/`에 지어 4398에 띄운다(한 `e2e/serve.mjs` 프로세스가 둘 다 내리므로 개발 서버 4321과
부딪히지 않는다). chromium · firefox · webkit · 모바일(Pixel 7) 넷은 4399를 보고, `analytics`(Desktop Chrome) · `analytics-mobile`(Pixel 7)
둘만 4398에서 `analytics.e2e.ts` · `trial-analytics.e2e.ts` · `airbridge.e2e.ts`를 돈다 — 측정 ID · 토큰을 넣어도 `googletagmanager.com` · `static.airbridge.io` 요청은
빈 스크립트로 막으므로(`e2e/analytics.support.ts`의 `blockedHosts`) 밖으로 나가는 것은 없다. Airbridge 로더 요청은 `load` 뒤에 나가 시점이 흔들리므로 GA e2e의 외부 호스트 단언은
「gtm은 있고, 모든 호스트가 그 둘 안」이다.
산출물의 내용만 보는 `content.e2e.ts`는 chromium만 돈다. 빌드 둘은 차례로 짓는다 — 동시에 지으면 Astro의 캐시 폴더(`node_modules/.astro`)를 두 빌드가 함께 써서 간헐적으로 깨질 수 있다 — 그래서 처음 한 번의 빌드 시간이 두 배다.
**`pnpm verify`와 CI에는 들어 있지 않다** — CI에 브라우저를 받는 단계가 없다.

루트의 `pnpm build` · `pnpm typecheck` · `pnpm test`(따라서 `pnpm verify`와 CI)가 이 앱을 함께 돈다. 테스트 셋은 루트
`test:unit` · `test:ui` · `test:integration` 사슬의 끝에 붙어 있다
([ADR-0006](../../docs/adr/0006-command-interface-and-test-layers.md) 정정 기록).

## 구조

| 어디 | 무엇 |
|---|---|
| `src/site.ts` | **배포 주소의 기본값 · 서비스 이름 · 스토어 주소 · 언어별 제목/설명/공유 카드** — 운영 값은 전부 여기다 |
| `src/i18n/copy.ts` | 영어 문구(원본)와 `Copy` 타입 |
| `src/i18n/ko.ts` | 한국어 문구. `Copy`를 전부 채워야 타입 검사를 지난다 |
| `src/pages/` | `index.astro`(기본 언어 `/`) · `[lang]/index.astro`(나머지 언어 `/<코드>/`) · `try/index.astro` · `[lang]/try/index.astro`(웹 체험판) · `404.astro`(`/404.html`) · `robots.txt.ts` · `llms.txt.ts`. **여기 있는 `.ts`는 전부 주소가 된다 — 테스트 파일을 두지 않는다** |
| `src/layouts/Base.astro` | 모든 페이지가 함께 쓰는 문서 껍데기 — 문자셋 · 제목 · 설명 · `robots` · 아이콘 · 서체 · 건너뛰기 링크. 페이지마다 다른 head는 이름 붙은 슬롯 `head`로 받는다 |
| `src/seo/` | 검색 · 답변 엔진용 값을 만드는 **순수 모듈 여섯**. Astro · `site.ts` · 문구를 import하지 않고 값을 인자로 받는다. 타입은 `seo.contract.ts` |
| ↳ `site-url.ts` | `resolveSiteUrl` — 배포 주소를 고르고 검사한다(아래 「배포 주소」) |
| ↳ `head-meta.ts` | `buildHeadMeta` — canonical · hreflang · 공유 카드 그림의 절대 주소, `robots` 값 둘(`robotsIndexable` · `robotsNoindex`) |
| ↳ `faq.ts` | `buildFaq` — 질문 일곱의 순서와, 스토어 주소 유무에 따른 「받는 곳」의 답 |
| ↳ `structured-data.ts` | `buildStructuredData` — JSON-LD(`WebSite` · `SoftwareApplication` · `FAQPage`) |
| ↳ `llms-txt.ts` · `robots-txt.ts` | `/llms.txt` · `/robots.txt`의 본문. 이름으로 허용하는 수집기 목록(`answerEngineCrawlers`)도 여기다 |
| `src/components/` | `Landing.astro`가 섹션 컴포넌트를 순서대로 놓는다. props 타입은 `landing.contract.ts` |
| ↳ `SeoHead.astro` | 색인되는 페이지의 head — 공유 카드 · canonical · hreflang · JSON-LD. `Landing.astro`가 `Base`의 `head` 슬롯에 꽂는다 |
| ↳ `Faq.astro` | 보이는 FAQ. 질문마다 `<details>`이고 스크립트가 없다. `SeoHead`가 받는 것과 **같은 배열**을 그린다 |
| ↳ `NotFound.astro` | 404 본문. `noindex`이고 색인용 head와 랜딩 스크립트를 싣지 않는다. `pages/404.astro`가 기본 언어로 그린다 |
| `src/styles/` | `base.css`(토큰 잇기 · 헤더 · 푸터) · `sections.css`(히어로 · 선언문 · 받기 · 404 · 반응형) · `showcase.css`(Features · Story · Phrases · FAQ) · `phone.css`(휴대폰 목업 — 앱의 컷 화면 · 메신저 · 전화 · 따라 읽기를 구조 · 토큰 · 모션까지 옮긴 것, 보는 묶음에서만 연출이 돈다) |
| `src/analytics/gtag.ts` · `components/Analytics.astro` | GA4 측정 ID 검증 · 동의 기본값 · 초기화 스크립트 |
| ⟨2026-10-30⟩ `src/analytics/airbridge*.ts` · `components/Airbridge.astro` | Airbridge Web SDK(아래 「분석」). `airbridge.contract.ts`(타입 · `duru://journey`) · `airbridge-loader.ts`(공식 로더 스니펫 원문) · `airbridge-bootstrap.ts`(**빌드 전용** — 토큰 검사 · init 옵션 · inline 부트스트랩) · `airbridge.ts`(**브라우저 순수** — 딥링크 옵션 · 시간대 판정 · SDK 판정). 둘을 파일로 가른 것은 모듈 스크립트 번들에 로더 스니펫이 들어가지 않게 하려는 것이다(빌드 테스트 I-AB2가 잰다) |
| ⟨2026-10-30⟩ `src/scripts/airbridge-cta.ts` · `airbridge-main.ts` | 접착 — Android 카드 클릭을 SDK `openDeeplink`에 잇고 시간대에 따라 `startTracking`을 부른다(`airbridge-cta`, 의존 주입). `airbridge-main`은 `window` · `location` · `Intl`을 읽어 그 둘을 부르는 진입점이다. 토큰이 없는 빌드에는 실리지 않는다 |
| `src/scripts/analytics-events.ts` · `analytics.contract.ts` | 화면의 행동을 이벤트로 옮기는 **순수 함수 셋**(`clickEventOf` · `faqEventOf` · `sectionEventOf`)과 그 타입. DOM이 아니라 거기서 읽은 값만 받고 아무것도 import하지 않는다 — `src/seo/`와 같은 모양 |
| `src/scripts/analytics.ts` | 접착 — DOM에서 값을 읽어 위 함수에 넘기고 결과를 gtag에 전달한다. 섹션의 「한 번만」(`unobserve`)도 여기다 |
| `src/scripts/main.ts` | 스크롤 연출과 탭. 없어도 본문은 다 보인다 |
| `src/trial/` | **웹 체험판의 로직**(아래 「웹 체험판」). 순수 모듈(`trial-model*` · `trial-machine` · `trial-view` · `trial-transition`(꿈 전환 판정) · `trial-events` · `trial-copy-format` · `trial-env` · `trial-prereg`(사전 등록 정규화 · 형식 · 요청 · 상태 · env) · ⟨r3⟩ `trial-browser`(UA 분류) · `trial-samples`(수집 행 · 요청 · env) · `trial-speech`의 분류 함수 · `trial-fullscreen`의 판정)과 브라우저 접점(`trial-audio` · `trial-prefetch` · `trial-speech`의 인식기 · `trial-prereg-client`(PostgREST) · ⟨r3⟩ `trial-samples-client`(수집, keepalive · 던지지 않음) · `trial-prereg-form` · `trial-fullscreen` · `trial-controller` · `trial-dom*` · `trial-motion` · 진입 `trial-main`). 계약은 `*.contract.ts` 여섯 |
| ↳ `src/trial/content/u00-tutorial.json` | 앱 내장 u00의 **바이트 같은 사본**. 포매터 대상에서 뺐다(한 바이트도 바뀌면 동기 검사가 실패한다). 판 · 길이 · sha256 핀은 `trial-content.ts`의 `TRIAL_CONTENT` |
| `src/components/trial/` | 체험판 장면 컴포넌트(`TrialPage` · `TrialCuts` · `TrialVocabCard` · `TrialImageMatch` · `TrialReplySelect` · `TrialCultureCard` · `TrialRoleplay` · `TrialTurn` · `TrialClear` · `TrialComplete` · `TrialPrereg` 등)와 CSS 열둘(r2: `trial-transition` · `trial-clear` · `trial-prereg`). props · 문구 · test-id 타입은 `trial-components.contract.ts` |
| `src/i18n/trial-copy.ts` · `trial-ko.ts` | 체험판 문구(`TrialCopy` — 영어 원본 · 한국어 전부). 학습 내용(한국어 대사 · 영어 번역)은 콘텐츠에서 온다 |
| `src/assets/trial/images/` · `public/trial/sfx/` | 체험판 그림 12(앱 `src/assets/content/images/`의 사본 — 표는 `src/trial/trial-images.ts`) · 효과음 5(`apps/ios/Host/sfx/`의 사본) |
| `e2e/` | Playwright. 체험판은 `trial.e2e.ts`(흐름 · 말하기 · 랜딩 링크) · `trial-sound.e2e.ts`(소리 요청) · `trial-a11y.e2e.ts`(키보드 · 초점 · axe · 움직임 줄이기) · `trial-layout.e2e.ts` · `trial-reflow.e2e.ts`(폭 · 낮은 화면) · `trial-contrast.e2e.ts`(그림 위 글 대비) · `trial-analytics.e2e.ts`(GA) · `trial-transition.e2e.ts`(꿈 전환) · `trial-prereg.e2e.ts`(사전 등록, 가짜 응답) · `trial-fullscreen.e2e.ts`(모바일 전체화면, 가짜 함수) · `trial.support.ts` · `trial-fakes.support.ts`(가짜 인식기 · 버킷 · PostgREST). 랜딩은 `landing.e2e.ts`(넘침 · 제목 단계 · 키보드 · 포커스 · axe · 서체 · 404) · `content.e2e.ts`(산출물 내용, chromium만) · `layout.e2e.ts`(Features · Story · Phrases · FAQ · 휴대폰 틀) · `layout-page.e2e.ts`(머리 · 히어로 · 섹션 간격) · `layout.support.ts`(폭 상수 1440 · 390, 좌표 · 계산값 · 스크롤 도구) · `analytics.e2e.ts`(측정 ID 빌드의 `dataLayer`) · ⟨2026-10-30⟩ `airbridge.e2e.ts`(토큰 빌드의 Airbridge 결선 — 스텁 SDK · 차단 · 시간대) · `analytics.support.ts`(막는 호스트 둘과 외부 호스트 단언) · `serve.mjs`(정적 서버). 설정은 `playwright.config.ts` |
| `src/assets/content/images/` | ⟨2026-10-29⟩ 랜딩 소개 그림 — 콘텐츠 버킷 `images/<unit>/…`의 사본(같은 상대 경로 · 같은 바이트). 표는 `src/assets/images.ts`(히어로 · Features · Phrases · 맺음), Story 카드는 `src/story/episodes.ts`. Astro가 크기별로 다시 굽는다 |
| `src/story/` | ⟨2026-10-29⟩ Story 줄의 에피소드 카드 데이터 `episodes.ts`(새 것 먼저, 사람이 하나씩 더한다 — 아래 「Story 카드 더하기」) |
| `scripts/` | `fetch-content-image.mjs` — 버킷 그림 하나를 `src/assets/content/`로 받는다 |
| `public/` | 아이콘과 공유 카드 그림(`og-*.jpg`) — 그대로 복사된다 |
| ↳ `public/naver….html` · `google….html` | 네이버 서치어드바이저 · Google Search Console의 소유 확인 파일. **지우거나 고치지 않는다** — 두 곳 모두 주기적으로 다시 확인한다. 검색엔진 확인 파일(`naver*.html` · `google*.html`)만 포매터 대상에서 뺐다 — 한 글자도 바뀌면 안 된다 |

테스트 파일은 소스 옆에 두고 이름이 계층을 가른다 — `*.unit.test.ts` · `*.ui.test.ts` · `*.integration.test.ts`
(저장소의 다른 앱과 같은 규약이다. `.astro`를 그리는 ui 테스트도 JSX가 없어 확장자가 `.ts`다).
ui 테스트는 `src/components/render.support.ts`로 컴포넌트를 문자열로 그린 뒤 `jsdom`으로 파싱한다. **vitest의 환경은
node로 둔다** — `jsdom` 환경에서는 `.astro`가 서버 컴포넌트로 변환되지 않아 렌더가 깨진다.
integration(`src/seo/build.integration.test.ts`)은 임시 폴더로 `astro build`를 실제로 돌린다(주소 있음 · 없음 · 틀린 값).
ui 테스트는 섹션 컴포넌트 하나씩 고립해 영어 · 한국어 둘 다 그린다(`Landing.ui.test.ts`가 전체를 보므로 섹션 테스트는 그 섹션만).
`Download`처럼 컴포넌트가 `site.ts`의 상수(`storeLinks`)를 최상위에서 읽으면 상태마다 `vi.resetModules()` + `vi.doMock("../site", …)` +
동적 `import("./Download.astro")`로 모듈을 새로 불러 한 파일에서 두 상태를 그린다(`Download.ui.test.ts`). 선택자는 test-id · 역할 ·
속성 · id로 찾고 클래스는 쓰지 않는다 — 예외는 `.eyebrow`와, CSS가 아니라 `main.ts`가 토글하는 상태 표지라 e2e와 같은 이름으로 보는
머리의 `is-solid` 둘이다.

**이미 돌아가는 동작에 테스트를 더할 때는 변이로 red를 본다.** 새 모듈은 던지는 껍데기로 세워 red를 보일 수 있지만, 기존 컴포넌트 ·
레이아웃의 회귀 테스트는 처음부터 green이라 그 테스트가 실제로 무엇을 잡는지가 보이지 않는다. 2026-10-08의 섹션 ui 테스트 여덟 파일과
레이아웃 e2e는 케이스마다 「이 변이를 주면 이 케이스가 실패해야 한다」를 먼저 정하고(변이 32 — ui 16 · 레이아웃 16), 작업 트리에서
변이를 적용 → 그 케이스만 실행(`pnpm --filter @libitums/landing exec vitest run <파일> -t "<케이스 id>"` ·
`pnpm --filter @libitums/landing exec playwright test layout -g "<케이스 id>" --project=chromium`) → 실패가 **그 케이스의 단언**에서
났는지 메시지로 확인(test-id가 없어서 난 실패 같은 다른 이유는 red가 아니다) → `git checkout -- <파일>`로 되돌리는 순서로 봤다.
`git stash`는 쓰지 않는다 — 그 파일에 의도한 미커밋 변경이 있으면 `git diff -- <파일>`로 패치를 받아 두고 되돌린 뒤 `git apply`한다.
변이는 한 줄 고치기 · 요소 하나 지우기면 충분하다. 예: Features의 묶음 하나를 지우면 UI-FT2 · FT3 · FT4 · FT6이 `expected 3 to be 4`로,
Footer 링크의 `rel`을 지우면 UI-FO2가 `expected '' to contain 'noopener'`로 실패했다. 변이에 살아남는 케이스가 있으면 단언이
모자란 것이다 — 레이아웃 L-FT1은 처음에 미디어 열의 폭 변이를 통과시켜 「폭 = 높이 × 0.8」 단언을 더해 잡았다.

`vitest.config.ts`가 `test` 설정을 변수로 빼서 넘기는 것은 우회다 — Astro 7은 Vite 8, vitest 3은 Vite 7의 타입을 써서
리터럴로 적으면 `astro check`가 막는다. 둘 중 하나를 올릴 때 다시 본다.

## 언어 더하기

언어가 늘어도 헤더의 언어 메뉴 · 주소 · hreflang · `og:locale:alternate` · sitemap · `llms.txt`의 페이지 링크 · 404의
언어 링크는 목록을 따라 자동으로 늘어난다. 할 일은 넷이다.

1. `src/i18n/<코드>.ts`를 만들어 `Copy`를 전부 채운다(`ko.ts`를 복사해 번역한다). 빠진 키는 타입 검사가 짚는다.
   FAQ 문구(`faq…Q` · `faq…A` 열다섯 키)와 404 문구(`notFound…`)도 `Copy`의 키다. **FAQ의 질문과 답은 태그 없는
   평문으로 쓴다** — 같은 문자열이 화면과 JSON-LD에 함께 들어가므로 `<`가 섞이면 빌드가 실패한다.
2. `src/site.ts`의 `languages`에 코드를 더한다 — **첫째가 기본 언어(`/`)** 이고 나머지는 `/<코드>/`에 선다.
3. 같은 파일의 `pages`에 그 언어의 이름(`label`) · 제목 · 설명 · 공유 카드 그림(`image`)과 그 그림의 대체 문구
   (`imageAlt`)를 적는다. 빠뜨리면 타입 검사가 짚는다.
4. `public/og-<코드>.jpg`(1200×630)를 찍어 넣는다.

`/llms.txt`와 `/404.html`은 파일이 하나라 **기본 언어로만** 쓰인다. 새 언어는 거기에 링크로 걸린다.
`llms.txt`는 다른 언어의 페이지도 **영어 이름**으로 가리킨다(`Duru in Korean`) — `pages`의 `englishName`을 채운다.
본문에 영어 밖 글자가 없어 응답의 charset에 기대지 않는다.

## 분석 (GA4)

앱의 분석(PostHog)과 따로, 랜딩은 GA4로 본다 — 검색 유입과 Search Console 연동이 목적이다.

- **켜기**: 빌드 환경에 `PUBLIC_GA_MEASUREMENT_ID=G-…`(GA4 웹 데이터 스트림의 측정 ID)를 준다. **없으면 아무 스크립트도 싣지 않는다** —
  개발 서버 · 미리보기 · 테스트에서는 수집되지 않는다. 모양이 틀리면 빌드가 실패한다. 번들에 그대로 들어가는 공개 값이다.
  예외는 e2e의 `analytics` 프로젝트 하나다 — 테스트용 측정 ID `G-E2ETEST00`을 넣어 짓되 `googletagmanager.com` 요청을 빈 스크립트로
  막고, 페이지 안의 `dataLayer`에 쌓이는 것만 읽는다(위 「명령」).
- **동의 배너는 없다.** EU 27개국 · EEA · 영국 · 스위스에서는 Consent Mode 기본값으로 분석 쿠키를 꺼서 쿠키 없는 신호만 나간다
  (그 지역의 방문은 GA4에 거의 보이지 않는다). 그 밖의 지역은 평소대로 수집한다. 광고용 저장은 어디서나 꺼져 있다.
  지역 목록은 `src/analytics/gtag.ts`의 `consentDeniedRegions`다.
- **보내는 이벤트는 열셋이다**(이름의 닫힌 목록은 `src/scripts/analytics.contract.ts`의 `AnalyticsEventName`).
  - 랜딩(`src/scripts/analytics.ts`): `section_view`(섹션이 처음 보일 때, `section`) · `cta_click`(머리의 받기 버튼) ·
    `download_click`(스토어 링크, `store`) · `language_switch`(`to`) · `faq_open`(`question`) · ⟨2026-10-22⟩ `trial_link_click`(Hero · 받기 카드 아래의
    체험판 링크, `location`: `hero` · `download`). 404에는 스크립트가 없어 수집하지 않는다.
  - 체험판(`src/trial/trial-events.ts` — 전이마다 순수 함수가 정한다): `trial_start`(`speech`: supported · unsupported) · `trial_step`(그 단계에
    처음 닿을 때, `step` · `ordinal` "1" ~ "9" — prologue는 첫 탭, clear 8 · complete 9) · `trial_roleplay_result`(마지막 턴 뒤, `verdict` · `correct` · `by_speech` · `by_tiles` "0" ~ "3" ·
    `speech`: supported · unsupported · denied) · `trial_complete`(`verdict`) · ⟨r2⟩ `trial_preregister`(완료 화면 사전 등록 응답 뒤, `status`: submitted · duplicate · failed).
    ⟨r3⟩ `trial_speech_attempt`(말하기 시도마다 한 번, `turn` "1" ~ "3" · `outcome` strict · lenient · incorrect · no-speech · denied · unavailable · aborted ·
    `latency_bucket` "0-2s" … "8s+") · `trial_exit`(나가기 링크, `step`). **체험판의 모든 이벤트에 `browser`**(ios-safari · android-chrome · in-app · desktop ·
    other — `src/trial/trial-browser.ts`의 UA 순수 분류, 원문은 싣지 않는다)를 `trial-main`의 gtag 접점이 붙인다.
    `trial_start`는 Start가 아니라 **첫 탭**에 나간다. ~~`trial_store_click`~~은 지웠다(완료 화면에 스토어 링크가 없다).
    속성은 전부 문자열이고 **들은 문장 · 대사 · 고른 보기 글 · 이름 · 이메일을 싣지 않는다**(타입이 막는다). 체험판 페이지는 랜딩 `initAnalytics`를
    부르지 않고, 같은 측정 ID · 같은 동의 규칙(`Analytics.astro`)으로 `gtag("event", …)`만 보낸다.
  **어느 요소가 어떤 이벤트가 되는가는 `src/scripts/analytics-events.ts`의 순수 함수 셋이 정한다** — 눌린 링크는 스토어 링크 →
  체험판 링크(`data-trial-link`) → 머리의 받기 버튼(`#download`) → 언어 메뉴 순으로 하나만, FAQ는 열릴 때만, 섹션은 `id`가 있는 `main section`만 한 번. 함수는
  unit 24가 재고, 실제 산출물에서 `dataLayer`에 쌓이는 이름 · 속성은 GA e2e 7(`e2e/analytics.e2e.ts`, 데스크톱 · Pixel 7)이 본다.
  `section_view`의 「보였다」는 화면보다 짧은 섹션은 그 30%, 화면보다 긴 섹션은 **화면의 30%를 채웠을 때**다(`sectionThresholdOf`,
  관찰자를 섹션마다 둔다). 섹션 기준 30%만 쓰면 화면의 3.3배를 넘는 Features(넓은 화면의 연출 `340vh`, 좁은 화면은 네 묶음이
  쌓여 4~6배)가 영원히 보내지지 않는다 — 2026-10-08까지 그랬고, GA-E7이 막는다. 임계값은 관찰을 시작할 때의 높이로 정하므로
  창 크기를 바꿔도 다시 재지 않는다.
- **개인정보처리방침**에 웹사이트 분석(Google Analytics)을 적어야 한다 — 문서는 저장소 밖(Notion)에 있다.

### Airbridge Web SDK ⟨2026-10-30⟩

GA4와 따로, 랜딩은 Airbridge Web SDK도 싣는다 — **검색광고를 눌러 온 사람이 Play 카드로 설치하면 그 설치가 Airbridge에서 Google Ads 채널 · 캠페인 · 키워드로
귀속되게** 하려는 것이다(Play 카드가 일반 URL인 동안은 전부 unattributed였다). 결정과 버린 대안은
[ADR-0090](../../docs/adr/0090-landing-airbridge-web-sdk.md), 대시보드 쪽은 [Airbridge 운영 안내](../../docs/airbridge-events.md).

- **켜기**: 빌드 환경에 `PUBLIC_AIRBRIDGE_WEB_TOKEN`(Airbridge **Web SDK Token** — App SDK Token · API Token이 아니다)을 준다. 싣는 조건은 GA와 같이
  **프로덕션(색인되는 페이지 `/` · `/ko/`)이고 값이 있을 때**뿐이다 — 404 · 체험판 · 프리뷰 · 토큰 없는 빌드의 산출물에는 `airbridge` 문자열이 하나도 없다.
  값이 없으면 프로덕션이어도 실패하지 않고 싣지 않는다(선택 값). 모양이 틀리면(공백 · 16자 미만 등) 빌드가 실패하고 메시지에는 변수 이름만 싣는다.
  모양 규칙(`[A-Za-z0-9._-]{16,}`)은 이 저장소가 고른 추정이다 — 실제 토큰이 걸리면 규칙을 고친다. 아래 「배포」.
- **싣는 방식**: GA와 같은 `is:inline` 부트스트랩(공식 로더 스니펫 원문 + `airbridge.init(…)`, 6,000 bytes 안) 하나와 조건부 모듈 스크립트 `scripts/airbridge-main.ts`
  하나(Airbridge 모듈 891 bytes — 4,000 안, 로더 문자열 없음). 새로 나가는 외부 호스트는 로더 `static.airbridge.io` 하나다. 마크업은 바뀌지 않는다 — `Download.astro`
  그대로, 새 test-id 0.
- **init 옵션은 다섯 키로 닫힌다**: `app: "duru"`(대시보드 App Name — `src/site.ts`의 `airbridgeAppName`) · `webToken` · `utmParsing: true`(Google Ads 최종 URL
  접미사의 `utm_*`를 읽는다) · `defaultChannel: "k-duru.com"`(utm 없는 직접 유입) · `autoStartTrackingEnabled: false`.
- **EU 시간대에서는 추적을 시작하지 않는다.** 모듈 스크립트가 브라우저 시간대(`Intl.DateTimeFormat().resolvedOptions().timeZone`)가 `Europe/*` 또는
  EEA 대서양 영토 넷(`Atlantic/Reykjavik` · `Canary` · `Madeira` · `Faroe`)이 아닐 때만 `airbridge.startTracking()`을 부른다(`startsTrackingIn`). GA 동의 지역
  규칙과 같은 방향이되 시간대는 지역의 근사치라 터키 · 러시아 등 EU 밖 유럽도 빠진다. 시간대를 모르는 브라우저는 시작한다.
- **Android 카드 동작**: `a[data-store="android"]`의 click 리스너가 클릭 때마다 `window.airbridge`를 본다. SDK가 **떠 있을 때만**(`isSDKEnabled === true`)
  `preventDefault` + `openDeeplink({ type: "click", deeplinks: { android: "duru://journey", ios: "duru://journey", desktop: <지금 페이지 URL> },
  fallbacks: { android: "google-play", ios: <지금 페이지 URL> } })`. 스텁뿐이면(차단기 · `load` 전 · 느린 네트워크) 아무것도 하지 않아 `<a target="_blank">`가
  Play로 그대로 간다 — 그 설치는 귀속되지 않는다. 수정키(Ctrl · Cmd · Shift · Alt) · 보조 버튼 클릭도 가로채지 않는다 — 새 탭으로 열려는 의도를 지킨다.
  iOS 카드 · 체험판 링크는 결선하지 않는다.
- **GA `download_click { store: "android" }`는 그대로 나간다** — 리스너가 `stopPropagation`을 하지 않아 `scripts/analytics.ts`의 document 리스너가 같은 클릭을 받는다.
  **새 GA 이벤트 · 커스텀 웹 이벤트는 없다.** 잼은 Airbridge 대시보드의 Install 귀속(Real-time Logs · Actuals의 채널 · 캠페인 · 광고그룹 · 키워드)이고,
  `setUserID` 등 사용자 식별 API는 부르지 않는다. 대시보드 수신은 자동으로 못 본다 — [Airbridge e2e F절](../../docs/e2e/airbridge-events.md#f--웹-랜딩--설치-귀속-adr-0090)(미실행).
- 테스트: unit(토큰 · 옵션 · 시간대 · SDK 판정) · ui(토큰 유무의 출력 · `Landing`의 결선 조건 · `Download` 불변) · integration(JSDOM 클릭 결선 ·
  빌드 산출물의 문자열 · 옵션 · 예산 · 실패) · e2e `airbridge.e2e.ts`(AB-E1 ~ E4 — 스텁 SDK의 `init` · `openDeeplink` 인자 · 이동 없음 · `dataLayer` · 시간대별
  `startTracking` · 스텁 없는 클릭의 기본 이동 · 토큰 없는 빌드의 무동작, 데스크톱 · Pixel 7).

## 자주 고치는 것

- **배포 주소** — 빌드할 때의 **환경 변수 `SITE_URL`이 우선**이고, 없으면 `src/site.ts`의 `fallbackSiteUrl`이다
  (지금은 빈 값). 코드를 고치지 않고 배포 설정에서 켤 수 있다.

  ```sh
  SITE_URL=https://duru.example pnpm landing:build
  ```

  - 값은 `https://호스트[:포트]` 꼴이어야 한다. 끝 슬래시 하나는 받아 주고 지운다.
  - **둘 다 비어 있으면** 빌드는 성공하고, 절대 주소가 있어야 하는 것들이 빠진다 — canonical · hreflang · `og:url` ·
    `og:image` · `twitter:image`(와 두 그림의 대체 문구) · JSON-LD의 `url` · sitemap · `robots.txt`의 `Sitemap:` 줄.
    `llms.txt`의 페이지 링크는 루트 기준 상대 주소(`/` · `/ko/`)가 된다.
  - **틀린 값이면 빌드가 실패한다**(`example.test` · `http://…` · 경로 · 쿼리 · 해시가 붙은 값). 메시지가 어느 쪽 값인지
    (`SITE_URL` 또는 `fallbackSiteUrl`)와 받은 값을 말한다.

    ```text
    SITE_URL must be an https origin without path, query or hash (for example https://duru.example), but got "http://example.test".
    ```

  - 주소를 읽는 자리는 `astro.config.ts` 하나다. 컴포넌트와 엔드포인트는 `Astro.site`만 본다 — `fallbackSiteUrl`을
    직접 import하지 않는다.
- **스토어 주소** — `src/site.ts`의 `storeLinks`. 넣으면 그 카드가 링크가 되고 `Coming soon`이 `Download`로 바뀐다.
  **하나라도 넣으면 FAQ 「받는 곳」의 답도 바뀐다**(`faqWhereASoon` → `faqWhereAAvailable`) — 화면 · JSON-LD ·
  `llms.txt` 셋 모두에서.
- **FAQ** — 문구는 `src/i18n/copy.ts`와 `ko.ts`의 `faq…` 키, 질문의 목록과 순서는 `src/seo/faq.ts`의 `faqIds`다.
  화면의 FAQ · JSON-LD의 `FAQPage` · `llms.txt`의 FAQ가 **같은 `buildFaq` 결과**에서 나오므로 문구는 한 곳만 고친다.
  가격 · 출시일 · 사용자 수 · 평점처럼 저장소가 뒷받침하지 않는 것은 적지 않는다. `src/i18n/faq-copy.unit.test.ts`가
  문구의 모양을 지킨다 — 가격 · 평점 · 수치 낱말과 숫자가 없고, 공항 · 비행기로 못 박지 않으며, 답은 문장 둘 이하이고
  첫 문장이 `Duru`로 시작한다. **지금 문구는 초안이다**([스펙](../../docs/specs/landing-page.md) 「확인이 필요한 것」).
- **허용하는 수집기** — `src/seo/robots-txt.ts`의 `answerEngineCrawlers`. 이름을 빼면 그 수집기의 묶음이
  `robots.txt`에서 사라진다(막는 것이 아니라 `User-agent: *`의 허용으로 돌아간다).
- **검색 결과에 보이는 제목 · 설명** — `src/site.ts`의 `pages`.
- **문구** — `src/i18n/copy.ts`와 `ko.ts`의 같은 키. 키를 더하면 두 파일 모두에 있어야 한다.
  휴대폰 목업 · 첫 표현 · 맺음 인용의 한국어 대사와 뜻풀이는 앱이 학습자에게 보여 주는 그대로라 컴포넌트에 적혀 있다.
- **그림** — ⟨2026-10-29⟩ 소개 그림은 전부 **콘텐츠 버킷**(Supabase public bucket `content`, 앱이 에피소드 컷으로 보여 주는 그림)의
  사본이다. `src/assets/content/images/<unit>/<file>.webp`에 버킷과 같은 상대 경로 · 같은 바이트로 두고 **재인코딩하지 않는다**
  (크기별 변환은 Astro `<Image>` · `getImage`가 빌드 때 한다). 받는 명령:

  ```sh
  node apps/landing/scripts/fetch-content-image.mjs images/u08-umbrella/pre-6.webp
  # PUBLIC_SUPABASE_URL(없으면 apps/mobile/.env.local의 같은 키)의 버킷에서 src/assets/content/images/u08-umbrella/pre-6.webp로
  ```

  어느 그림이 어디에 서는지는 `src/assets/images.ts`(히어로 셋 · Features 배경 넷 · 목업 속 미나와 프로필 · Phrases 셋 · 맺음 인용)와
  `src/story/episodes.ts`(Story 카드)가 적는다. 그림을 바꾸면 그 자리의 대체 문구(`copy.ts` · `ko.ts`의 `…Alt` 키, Story는
  항목의 `alt`)도 **보이는 것**대로 고친다. 튜토리얼 시절의 `src/assets/img/`(공항 · 상상 속 카페 · 민서)는 없앴다.

  | 사본 | 원본 |
  |---|---|
  | `public/favicon-96x96.png` · `apple-touch-icon.png` | `assets/store/app-icon-512.png` — `sharp`로 96 · 180px 정사각형으로 줄인다 |

  `public/logo-duru.webp`(헤더 · 푸터 로고)는 스플래시의 손글씨 로고
  (`apps/mobile/src/screens/splash/assets/logo-handwriting.webp`, 애니메이션)의 **마지막 프레임**을 브랜드 주황
  `#F46B18`으로 채운 것이다. 앱 아이콘은 파비콘에만 쓴다.

  파비콘 `<link>`는 `src/seo/icon-links.ts`가 만들고 `Base.astro`가 모든 페이지에 싣는다. 배포 주소(`Astro.site`)가 있으면
  절대 주소다 — Google은 페이지의 `rel="icon"` 링크를 따라가 48px 배수의 정사각형 아이콘을 받는다. 벡터 원본이 없어
  `favicon.svg`는 아직 없다.

  `public/og-en.jpg` · `og-ko.jpg`는 히어로를 1200×630으로 찍은 것이다. 히어로 문구나 그림을 바꾸면 다시 찍는다
  (⟨2026-10-29⟩ 빌드를 `astro preview`로 띄우고 Playwright로 1200×630 뷰포트에서 머리의 섹션 링크 · 언어 메뉴 · 받기 버튼,
  히어로의 체험판 버튼 · 스크롤 안내를 CSS로 숨긴 채 찍었다 — 브라우저 컨텍스트를 `reducedMotion: "reduce"`로 두면 스크롤 연출이
  꺼져 세 패널이 모두 밝고 두 문장이 함께 보인다).

- **Story 카드 더하기** — ⟨2026-10-29⟩ 에피소드가 나올 때마다 **사람이 하나씩** 더한다(사용자 결정 — 티저는 자동 생성하지 않는다).
  1. 버킷에서 **인물이 나오지 않는** 컷 하나를 고르고 위 「그림」의 명령으로 받는다(얼굴을 먼저 보여 주면 만남의 기대가 꺾인다 —
     손 · 뒷모습 정도는 된다). u00만은 체험판 사본(`src/assets/trial/images/u00-tutorial/`)과 **바이트가 겹치지 않는** 컷을 고른다(이름이 달라도
     내용이 같으면 Vite가 빌드 결과에서 한 파일로 합치고, 그것을 `<Image>`로 변환하면 Astro가 원본을 지워 체험판이 404를 낸다 —
     `episodes.unit.test.ts`가 대조한다).
  2. `src/story/episodes.ts`의 배열 **맨 앞**에 항목을 더한다 — `id`(앱 unit id) · `number` · `when`(앱 JSON의 `day` · `time_of_day`) ·
     `title`(앱 JSON의 `title_en` · `title` 그대로) · `teaser`(살짝만 스포하는 **한 문장** — 등장인물 이름 · 답 · 결말을 말하지 않는다) ·
     `image` · `alt`(보이는 것만) · 필요하면 `focus`(4:5로 자를 때 남길 자리). 줄은 배열 순서 그대로이고 맨 앞 카드에 `New` 표가 붙는다.
     카드에는 그림과 번호만 보이고, 때 · 제목 · 티저는 호버 · 포커스 · 누름으로 비치는 숨김 층에 들어간다.
  3. `pnpm --filter @libitums/landing test:unit`(`src/story/episodes.unit.test.ts` — id 꼴 · 번호 내림차순 · 두 언어 · 세로 그림) ·
     `test:ui`(카드 수 · New 표 · 숨김 층) · `test:integration`(빌드)을 돌린다.

- **색 · 반경 · 서체** — `@libitums/design-tokens`의 CSS 변수를 `base.css`가 짧은 이름으로 잇는다. 값을 옮겨 적지 않는다.

## 확인

- **자동(vitest)** — 위 「명령」의 테스트 셋. head 태그 · JSON-LD의 모양 · 화면 FAQ와 `FAQPage`와 `llms.txt`의 문구 일치 ·
  `robots.txt` · 404 · 틀린 `SITE_URL`의 빌드 실패 · 섹션 컴포넌트 여덟의 마크업(영어 · 한국어) · 이벤트 매핑을 본다.
  **레이아웃 · 색 · 스크롤 연출은 여기서 보지 못한다**(`jsdom`은 레이아웃을 계산하지 않는다) — 레이아웃과 연출의 상태는 아래
  브라우저 e2e가 본다.
- **자동(브라우저)** — `pnpm test:e2e:landing`. `landing.e2e.ts`의 가로 넘침 · 제목 단계 · 키보드 · 포커스 표시 · axe · 서체 · 404 ·
  넓은 머리에 더해, `layout.e2e.ts` · `layout-page.e2e.ts`가 **1440 · 390px에서 배치와 연출의 상태를 좌표 · 계산값으로** 본다 —
  Features의 2단 머무름(sticky · 글 왼쪽 · 미디어 오른쪽 · 비활성 묶음 숨김 · 구간 60%에서 셋째 묶음 활성)과 좁은 화면의 1단 쌓임,
  Story 카드 폭(320px · 화면의 72%)과 화살표의 표시 · 44px · 이동과 복귀, Phrases · FAQ의 2단/1단, 휴대폰 목업이 미디어 틀 안에
  있는지, 머리 요소의 비겹침 · 한 줄, 히어로가 풀리는 지점의 머리 배경 전환, 히어로 두 문장의 같은 자리 교대, 여덟 섹션의 비겹침 ·
  안쪽 여백. `analytics.e2e.ts`는 GA 이벤트, ⟨2026-10-30⟩ `airbridge.e2e.ts`는 Airbridge 결선(위 「분석」). **여전히 보지 않는 것**: 색 · 대비 · 글꼴 · 그림의 **시각 품질**
  (스크린샷 비교를 하지 않는다), 실제 Safari · 스크린리더 낭독 · 외부 검증기.
- **체험판(자동)** — unit · ui · integration이 리듀서 전이 · 모델 · 파생(음성 단서 · 효과음 · 이벤트) · 장면 마크업(en · ko) · 컨트롤러 결선(JSDOM에서
  끝까지) · 빌드(env 검사 · sitemap 제외 · 스크립트 상한 40,000 bytes — r2 실측 39,813 · zod 없음)를 보고, Playwright `trial*.e2e.ts`가 엔진별 클릭 · 소리 요청 ·
  키보드 · axe · 레이아웃 · GA를 본다. 루트 `pnpm test:trial-assets`(TA1 ~ TA5)가 사본을 본다. **여전히 보지 않는 것**: 실기에서 소리가 실제로
  나는가 · iOS 무음 스위치 · 실제 음성 인식 · 권한 창 · VoiceOver · TalkBack — [웹 체험판 e2e](../../docs/e2e/web-trial.md) EU1 ~ EU8(미실행).
- **사람** — [랜딩 SEO · GEO e2e](../../docs/e2e/landing-seo-geo.md)의 E1~E9(Lighthouse · 구조화 데이터 검증기 ·
  스크립트 끈 화면 · 키보드 · 폭별 레이아웃 · 그림 요청 순서 · 낭독). 어느 단계가 명령으로 되고 어느 단계가 사람
  몫인지, 지금까지 무엇이 수행됐는지는 그 문서가 진다.
- 눈으로 보는 것은 시각 품질이다 — 390px · 1440px 두 폭에서 `/`와 `/ko/`를 끝까지 내려 색 · 글꼴 · 그림이 어색하지 않은지 보고,
  탭을 방향키로 옮겨 본다. 배치가 어긋나 있으면 눈으로 넘기지 말고 `layout*.e2e.ts`에 단언을 더한다.

## 웹 체험판 (`/try/` · `/ko/try/`)

앱을 설치하지 않고 튜토리얼 u00의 첫 장면을 브라우저에서 3~5분 해 보는 페이지다. 결정과 버린 대안은
[ADR-0083](../../docs/adr/0083-web-trial-and-episode-core.md)에 있고, 여기는 고칠 때 알아야 할 것만 적는다.

- **흐름**(r2): 열자마자 컷 1(표지 없음 — **첫 탭**이 소리 잠금 해제 · 시작 이벤트 · 모바일 전체화면) → 컷 1~6 → 새 단어 카드(S1) → 그림 고르기(S3) →
  대답 고르기(S9) → 문화 카드(S12) → 롤플레이 3턴(RP) → 엔딩 컷 1~4 → **Episode clear**(검정 배너 「What happens next?」 1.6초 또는 탭 — r3부터 예고 장면 없이) →
  곧바로 완료 · 이메일 사전 등록(초점은 완료 제목). 롤플레이 결과와 무관하게 끝까지 가고, 완료 화면의 문구만 결과(3턴 중 2 이상)에 따라 다르다.
- **꿈 전환**: 컷 사이 · 롤플레이 → 엔딩 · 배너 → 완료에 구름빛(`data-transition="dream"`, 600ms), 꿈 → 승무원(prologue 마지막 컷으로)에
  눈 뜨기(`wake`, 1000ms). 판정은 순수 `trialTransitionOf`, 모양은 `trial-transition.css`. 움직임 줄이기면 없다.
- **어떻게 도나**: 장면 전부를 Astro가 한 페이지에 굽고(처음엔 컷 1만 보인다) `src/trial/trial-main.ts`가 페이지 안의 JSON
  (`script#trial-model`)을 읽어 컨트롤러를 띄운다. 행동 → 순수 리듀서(`reduceTrial`) → DOM 반영 → 파생(음성 · 효과음 · 이벤트).
  **판정 · 전이는 리듀서만 한다** — DOM 코드에 계산을 넣지 않는다. 판정 함수는 앱과 같은 `@libitums/episode-core/judge`다.
- **콘텐츠는 빌드 때 읽는다** — `src/trial/content/u00-tutorial.json`(사본)을 `@libitums/episode-core/episode`의 디코더로 읽어 화면 모델을
  페이지에 굽는다. 디코드 · 모델이 실패하면 **빌드가 실패한다**. 클라이언트 스크립트에는 zod · 디코더가 없다(상한 45,900 bytes — 2026-10-22 r1 34,804 · r2 39,813 · r3 45,888).
- **사본을 고칠 때** — u00 JSON · 그림 12 · 효과음 5는 앱 원본의 바이트 그대로다. 앱 쪽이 바뀌면 같은 파일을 복사하고, JSON이면
  `TRIAL_CONTENT`(version · bytes · sha256)도 앱 매니페스트의 u00 항목과 같게 고친다. 어긋나면 `pnpm test:trial-assets`(따라서 `pnpm verify`)가 실패한다.
  그림을 다시 인코딩하지 않는다(위 「그림」의 `cwebp` 절차는 랜딩 소개 그림만이다).
- **음성** — 버킷의 `audio/<id>.m4a`를 받는다(빌드 env `PUBLIC_SUPABASE_URL`, 아래 「배포」). 첫 탭에서 Web Audio를 열고, 그 전에는 소리 요청이
  0이다. 받기 실패 · 404 · 해독 실패면 그 소리만 없고 진행은 막히지 않는다. 로컬에서 소리를 들으려면 앱 `.env.local`의 같은 값을 주고 짓는다.

  ```sh
  PUBLIC_SUPABASE_URL=https://<프로젝트>.supabase.co pnpm landing:dev
  ```

  모양이 `https://<호스트>`가 아니면(경로 · 쿼리가 붙으면) 빌드가 실패한다.
- **말하기** — 브라우저 음성 인식(`SpeechRecognition` · `webkitSpeechRecognition`, `ko-KR`). 보안 컨텍스트(`https` 또는 `localhost`)에서만
  마이크가 열린다. 인식기가 없거나(Firefox) · 권한 거부 · 실패 · `Can't speak now`면 같은 턴을 낱말 타일로 푼다.
  ⟨r3⟩ **판정은 발음 기준으로 너그럽다** — `@libitums/episode-core/judge`의 `judgeSpokenLenient`: 앱 규칙(`judgeRoleplayReply`)으로 맞으면 strict,
  아니면 발음형 자모 편집 거리(띄어쓰기 · 부호 · 군말 · 연음 · 받침 · 비음화 · 유음화 · ㅎ · 된소리 · 비슷한 모음을 같게 봄)가 문장 0.75 이상 · 마디마다 0.5 이상이면 lenient.
  둘 다 `Great`. 앱은 이 함수를 쓰지 않는다. 기준을 바꾸면 패키지의 사례 표(`spoken-lenient.unit.test.ts`)를 함께 고친다.
- **인식 글자 수집**(r3) — 말하기 판정마다 `POST <PUBLIC_SUPABASE_URL>/rest/v1/trial_speech_samples`(사전 등록과 같은 공개 키 · `keepalive`) 한 번,
  본문은 `session_id`(열 때 만든 무작위 UUID, 메모리에만) · `episode_version` · `turn_index` · `expected` · `alternatives`(최대 3 · 200자) · `outcome` ·
  `similarity` · `browser` · `locale`. 녹음은 없다. 실패는 조용히 버리고 다시 보내지 않는다. 같은 빌드에서 마이크 아래 안내 한 줄
  「What you say is saved as text to improve scoring.」이 선다(URL · 공개 키가 없는 빌드면 수집 · 안내 줄 둘 다 없다). 표 · 보관 90일은
  [`apps/supabase-functions`](../supabase-functions/README.md) 「웹 체험판 인식 글자 수집 표」.
- **문구** — `src/i18n/trial-copy.ts`(영어 원본, `TrialCopy`) · `trial-ko.ts`(한국어, 전부 채워야 타입 검사를 지난다). `{name}` 자리표시자는 `formatCopy`가 채운다.
- **랜딩 링크** — Hero와 받기 카드 아래에 `trialPathFor(language)`(`src/site.ts`) 링크.
- **사전 등록**(r2) — 완료 화면 폼이 `POST <PUBLIC_SUPABASE_URL>/rest/v1/pre_registrations`(머리 `apikey` · `Prefer: return=minimal`, 몸 `{email, locale, source}`)로
  보낸다. 201 · 409(중복)는 「등록했어요」, 그 밖 · 네트워크 · 10초는 「다시 시도」. 형식이 틀리면 요청하지 않는다. 표 · RLS는
  [`apps/supabase-functions`](../supabase-functions/README.md) 「웹 체험판 사전 등록 표」. 빌드에 `PUBLIC_SUPABASE_ANON_KEY`가 없으면(비프로덕션) 폼 대신
  「지금은 등록할 수 없어요」가 선다. 이메일은 GA · 낭독 · 로그에 싣지 않는다.
- **모바일 전체화면**(r2) — `(pointer: coarse) and (hover: none)`이면 첫 탭에 `requestFullscreen`(주소창 · 탭바 숨김), 완료 · 나가기에서 푼다.
  지원하지 않으면(iPhone Safari) 아무 일도 없다.
- **색인하지 않는다** — `noindex`, canonical · hreflang · JSON-LD 없음, sitemap에서 `/try/`를 뺀다(`astro.config.ts`의 sitemap `filter`).

## 배포 (Vercel)

랜딩과 Storybook은 **각각 다른 Vercel 프로젝트**다. Storybook은 자산 경로가 사이트 루트 기준이라 랜딩 주소 아래에 둘 수 없고,
내부 카탈로그를 공개 랜딩과 묶어 배포할 이유도 없다. 설정 파일은 `apps/landing/vercel.json` · `apps/storybook-lynx/vercel.json`이다.
`/sitemap.xml`은 Vercel이 `sitemap-index.xml`로 301 넘긴다 — Astro의 사이트맵 입구가 `sitemap-index.xml`인데 검색엔진 콘솔과 사람은
`sitemap.xml`을 먼저 넣어 보기 때문이다(Search Console에 그렇게 제출하면 404라 「읽을 수 없음」이 뜬다).

| | 랜딩 | Storybook |
|---|---|---|
| Root Directory | `apps/landing` | `apps/storybook-lynx` |
| 빌드 | Astro (자동 인식) | `pnpm build` → `dist/storybook` |
| 검색 | 프로덕션만 색인 | 전부 `noindex`(응답 헤더) |

두 프로젝트 공통 환경 변수:

- `NPM_RC` — `@libitums/*`를 받는 GitHub 토큰(`read:packages`). 값은 아래 두 줄이다. 없으면 설치가 `401`로 실패한다.

  ```ini
  @libitums:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=<PAT>
  ```

- `ENABLE_EXPERIMENTAL_COREPACK=1` — `packageManager`에 고정한 pnpm 버전을 쓰게 한다.

랜딩 프로젝트에만:

- `PUBLIC_GA_MEASUREMENT_ID` — **Production 환경에만** 넣는다. (프리뷰에서는 값이 있어도 싣지 않는다.)
- ⟨2026-10-30⟩ `PUBLIC_AIRBRIDGE_WEB_TOKEN` — Airbridge 대시보드 **[Settings] › [Tokens]의 Web SDK Token**(App SDK Token · API Token이 아니다 — 앱 호스트와 다른 값,
  번들에 그대로 들어가는 공개 값). **Production 환경에만** 넣는다 — 프리뷰는 색인되지 않는 빌드라 값이 있어도 싣지 않는다. **없으면 싣지 않을 뿐 빌드는 성공한다**
  (프로덕션에서도 — `PUBLIC_SUPABASE_*`와 다르다). 모양이 틀리면 빌드가 실패하고 출력에 값을 싣지 않는다. **아직 넣지 않았다 — 사용자 작업이다**
  (Vercel 랜딩 프로젝트 → Settings → Environment Variables). **넣기 전에 로컬에서 한 번 짓는다** — 모양 규칙(영문 · 숫자 · `.` `_` `-` 16자 이상)은 이 저장소가
  고른 추정이라, 실제 토큰이 규칙에 걸리면 Production 빌드 전체가 실패한다: `PUBLIC_AIRBRIDGE_WEB_TOKEN=<값> SITE_URL=https://k-duru.com pnpm landing:build`가
  성공하는지 보고 넣는다(걸리면 `src/analytics/airbridge-bootstrap.ts`의 규칙을 넓힌다 — ADR-0090 재검토 조건). 넣은 뒤 할 일은
  [Airbridge e2e F절](../../docs/e2e/airbridge-events.md#f--웹-랜딩--설치-귀속-adr-0090).
- `SITE_URL` — 도메인이 정해지면 Production에 넣는다. **없으면 Vercel이 주는 프로덕션 주소**(`VERCEL_PROJECT_PRODUCTION_URL`)를 쓴다.
- ⟨2026-10-22⟩ `PUBLIC_SUPABASE_URL` — 웹 체험판 음성 버킷의 Supabase 프로젝트 주소(`https://<프로젝트>.supabase.co`, 앱 `apps/mobile/.env.local`과 같은 값 ·
  번들에 그대로 들어가는 공개 값). **Production에 반드시 넣는다 — 없으면 프로덕션 빌드가 실패한다**(`VERCEL_ENV=production`일 때만 검사).
  Preview에도 넣어야 프리뷰에서 소리가 난다(없으면 프리뷰는 소리 없는 체험판으로 성공한다 — [웹 체험판 e2e](../../docs/e2e/web-trial.md)의 실기 확인은 프리뷰에서 한다).
  **아직 넣지 않았다 — 사용자 작업이다**(Vercel 랜딩 프로젝트 → Settings → Environment Variables).
- ⟨2026-10-22 r2⟩ `PUBLIC_SUPABASE_ANON_KEY` — 같은 Supabase 프로젝트의 **공개 키**(publishable `sb_publishable_…` 또는 옛 anon JWT, 앱 `.env.local`과 같은 값 ·
  번들에 그대로 들어가는 공개 값). 체험판 완료 화면의 사전 등록이 쓴다. **Production에 반드시 넣는다 — 없으면 프로덕션 빌드가 실패한다**, 모양이 틀려도
  실패한다(출력에 값을 싣지 않는다). Preview에 없으면 폼이 「지금은 등록할 수 없어요」로 선다. 넣기 전에 마이그레이션 `20261022120000_pre_registrations.sql`을
  원격에 적용해야 등록이 성공한다. **아직 넣지 않았다 — 사용자 작업이다.**

배포 환경에 따라 달라지는 것(`src/seo/deploy-env.ts`):

| | 프로덕션 | 프리뷰 (PR마다 생기는 주소) |
|---|---|---|
| `<meta name="robots">` | `index, follow, …` | `noindex` |
| `robots.txt` | 수집기 허용 + sitemap | `Disallow: /` |
| canonical · hreflang · sitemap | 있음 | 없음 |
| GA4 | 측정 ID가 있으면 실림 | 실리지 않음 |
| Airbridge Web SDK `PUBLIC_AIRBRIDGE_WEB_TOKEN` | 토큰이 있으면 실림(없으면 **싣지 않고 성공**) | 실리지 않음 |
| 체험판 음성 주소 `PUBLIC_SUPABASE_URL` | 없으면 **빌드 실패** | 없으면 소리 없는 체험판 |
| 사전 등록 공개 키 `PUBLIC_SUPABASE_ANON_KEY` | 없으면 **빌드 실패** | 없으면 폼 대신 「지금은 등록할 수 없어요」 |

올린 뒤에는 Google Search Console · 네이버 서치어드바이저에 사이트를 등록하고 `sitemap-index.xml`을 낸다.
확인 절차는 [수동 절차](../../docs/e2e/landing-seo-geo.md)의 「배포 뒤」 절에 있다.
