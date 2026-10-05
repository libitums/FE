# 랜딩 SEO · GEO — 브라우저 수동 e2e

`apps/landing`(Astro 정적 사이트)의 검색 노출 · 답변 엔진 노출 작업을 **실제 브라우저와 외부 검증기**로 확인하는 절차다.
자동 E2E는 not applicable(runner/command 없음) — 이 문서를 세우는 것이 이 계층의 「테스트」다([README](README.md)).
이 흐름은 README의 공통 전제(자체 호스트 앱 · 로그인)와 **무관하다** — 브라우저에서 도는 정적 사이트다.
무엇을 왜 만들었는지는 [스펙](../specs/landing-page.md)과 [ADR-0043](../adr/0043-landing-static-site.md) D6~D9에 있고,
판정에 쓰는 값은 아래 「기대 결과」에 풀어 적었다. `AC n`은 스펙의 「검색 · 답변 엔진」 절의 수용 기준 번호다.

단위 · ui · integration 테스트가 이미 보는 것(JSON-LD 모양, 화면 FAQ = `FAQPage`, 산출 파일의 줄)은 반복하지 않는다.
여기는 **대역으로는 볼 수 없는 것**만 본다 — Lighthouse 점수, 외부 검증기, 스크립트를 끈 실제 화면, 키보드 · 보조 기술, 폭 · 그림 요청 순서.

## 표기

각 단계 앞의 표지는 누가 하는지를 말한다.

- **[명령]** — 명령으로 재현된다(`curl` · Lighthouse CLI · 헤드리스 브라우저). 적힌 그대로 돌린다.
- **[사람]** — 사람만 할 수 있다(보조 기술 낭독 · 외부 검증 사이트에 붙여 넣기 · 눈으로 보는 대비와 겹침).

## 전제 (E1~E9 공통)

- **Node 22.** `nvm use`(저장소 `.nvmrc`) 뒤 `pnpm install`.
- **배포 주소를 넣어 빌드한다.** 주소가 있어야 canonical · hreflang · sitemap이 나온다(AC4).
  `https://example.test`는 자리표시 주소다 — 이 주소로는 **링크가 실제로 열리지 않는다.** 판정은 값(글자)으로 한다.

  ```sh
  SITE_URL=https://example.test pnpm landing:build
  ```

- **빌드 결과를 띄운다.** 개발 서버(`pnpm landing:dev`, 4321)는 쓰지 않는다 — 판정 대상은 산출물이다.
  4321은 개발 서버가 쓰고 있을 수 있으니 **빈 포트(이 문서는 4399)** 로 띄운다.

  ```sh
  pnpm --filter @libitums/landing preview --port 4399 --ignore-lock &
  export B=http://localhost:4399
  ```

  다른 `astro dev` / `astro preview`가 이미 떠 있으면(예: 4321의 개발 서버) 락 때문에 거부되므로 `--ignore-lock`을 붙인다.
  이 형태는 서버를 **포그라운드로 띄우므로** 끝에 `&`로 백그라운드에 보낸다(`ready … http://localhost:4399/`가 찍히면 준비된 것).
  끝낼 때는 **4399를 듣는 이 프로세스만** 종료한다 — 다른 서버(4321 등)는 건드리지 않는다.

  ```sh
  kill $(lsof -ti tcp:4399 -sTCP:LISTEN)      # 또는 같은 셸에서 kill %1
  ```

  (`--ignore-lock` 없이 띄우면 데몬으로 떠서 곧바로 돌아오고 `pnpm exec astro preview stop`으로 끝내지만, 락이 걸린 환경에서는 쓸 수 없다.)

- **브라우저**: Chrome 최신 + Safari 또는 Firefox 중 하나. 보조 기술: macOS VoiceOver(또는 Windows NVDA).
- **환경 사실 두 가지**
  - 빌드 때 `SITE_URL`이 없으면 canonical · hreflang · `og:url` · 그림 주소 · sitemap · `Sitemap:` 줄이 **모두 빠진다**(정상 — 빌드 B).
    아래 케이스는 전부 「주소 있음」 빌드를 본다.
  - 틀린 값(`example.test` · `http://…` · 경로가 붙은 값)은 빌드가 실패해야 한다 — 이것은 integration I-C1~C3이 이미 본다.
- 이 문서의 「기대 결과」에 있는 값은 2026-10-05에 직접 따라가 확인한 것이다(어느 케이스를 어디까지 따라갔는지는 각 절의
  「직접 따라가 본 결과」에 적었다). 그날의 두 차례 수행은 문서 끝 [수행 기록](#수행-기록)에 있다 — **둘 다 에이전트의
  헤드리스 재현이고, `[사람]` 단계는 아직 아무도 수행하지 않았다.**
- **정정 기록**
  - 2026-10-05 — 첫 수행에서 드러난 **이 문서의 결함**(E3 `<details` 개수 · E5 한글 표시의 판정 대상 · E6 콘솔 기대 · E8 LCP 감사 키와 우선순위 판정 · preview 락 · 낭독 단계 누락)에 맞춰 같은 날 정정했다.
  - 2026-10-05 — 같은 수행이 **제품의 결함**도 하나 짚었다: E8에서 첫 히어로 그림(`scene-plane`)이 `fetchpriority="high"`인데도 Low로 요청됐다. 원인은 히어로 preload `<link>`에 `fetchpriority`가 없던 것이고, 제품을 고쳤다(preload에 `fetchpriority="high"`). 접근성 점검이 짚은 둘(FAQ 질문 줄 안의 장식 `svg` → CSS 가상 요소, 404 헤더의 언어 메뉴 제거)도 같은 수정에 들었다. 둘째 수행은 그 뒤의 빌드를 봤다.
  - 2026-10-05 — 둘째 수행 뒤 낡은 문장을 고쳤다: E8의 「모두 Low」 관찰, E3 · E4 · E6 · E7의 「따라가 보지 않음」, E9의 `grep` 패턴(`og:image`가 빠져 있었다)과 출력 줄 수, E8 「알려진 한계」의 우선순위 상향 관찰.

## 절차

### E1 — Lighthouse SEO 점수 · 감사 (측정)

- **무엇을 보나**: `/`와 `/ko/`가 실제 Chrome의 Lighthouse(모바일)에서 SEO 100이고 hreflang · canonical · 색인 허용 · robots.txt 감사가 통과한다.
- **대역으로 대신할 수 없는 이유**: 점수와 감사는 Lighthouse가 실제 브라우저로 페이지를 받아 계산하는 값이다 — 우리 쪽 단언은 태그의 존재만 보지, 그 태그를 도구가 유효하다고 읽는지는 보지 못한다.
- **AC**: 측정(수용 기준 본문에는 번호가 없는 점수 목표). 보조: AC4.
- **전제**: 공통 전제. preview가 떠 있다.
- **단계**
  1. **[명령]** `/`를 잰다. 저장소 밖 임시 폴더에서 돌린다(저장소 의존이 아니다).

     ```sh
     pnpm dlx lighthouse http://localhost:4399/ --only-categories=seo --form-factor=mobile \
       --output=json --output-path=/tmp/lh-en.json --chrome-flags="--headless=new" --quiet
     ```

  2. **[명령]** `/ko/`를 같은 명령으로 잰다(주소 `…/ko/`, 출력 `/tmp/lh-ko.json`).
  3. **[명령]** 점수와 감사별 결과를 읽는다.

     ```sh
     node -e 'const r=require("/tmp/lh-en.json");console.log(r.lighthouseVersion,r.categories.seo.score);for(const x of r.categories.seo.auditRefs)console.log(x.id,r.audits[x.id].score)'
     ```

  4. **[사람]**(선택, 위가 어긋났을 때만) Chrome DevTools → Lighthouse 탭 → Mode: Navigation · Device: Mobile · Categories: SEO만 → Analyze page load. 같은 결과가 나와야 한다.
- **기대 결과**
  - 두 주소 모두 `categories.seo.score`가 `1`(= 100).
  - 다음 감사의 `score`가 `1`: `is-crawlable`(색인 차단 없음) · `robots-txt`(robots.txt 유효) · `hreflang`(문서에 유효한 hreflang) · `canonical`(유효한 canonical) · `meta-description` · `document-title` · `http-status-code` · `link-text` · `crawlable-anchors` · `image-alt`.
  - `structured-data`는 `score: null`(수동 감사) — 이것은 E2가 본다.
  - 하나라도 `1`이 아니면 실패. 감사 `id`와 `displayValue`를 메모에 적는다.
- **직접 따라가 본 결과(2026-10-05, Lighthouse 13.5.0)**: `/` · `/ko/` 모두 SEO 1. 위 열 개 감사 전부 1, `structured-data`는 null. canonical이 `https://example.test/`로 페이지 호스트(localhost)와 달라도 `canonical` 감사는 통과했다.

### E2 — schema.org 검증기 (구조화 데이터)

- **무엇을 보나**: `/`와 `/ko/`의 JSON-LD가 외부 검증기에서 오류 · 경고 없이 `WebSite` · `SoftwareApplication` · `FAQPage`로 인식되고 질문이 일곱이다.
- **대역으로 대신할 수 없는 이유**: 우리 테스트는 JSON-LD가 JSON으로 파싱되고 계약의 키 집합 안인지만 본다 — schema.org의 어휘 규칙으로 유효한지는 외부 검증기만 판정한다.
- **AC**: 1.
- **전제**: 공통 전제. 외부 사이트에 접속할 수 있어야 한다.
- **단계**
  1. **[명령]** 붙여 넣을 소스를 클립보드로 복사한다(화면에서 소스 보기 → 전체 선택도 같다).

     ```sh
     curl -s http://localhost:4399/ | pbcopy      # macOS. Windows/Linux는 파일로 저장해 연다
     ```

  2. **[사람]** <https://validator.schema.org/>를 연다 → 「Code Snippet」 탭 → 붙여 넣기 → 「Run Test」.
  3. **[사람]** 결과 패널에서 「Detected」 항목과 오류 · 경고 개수를 읽는다. `FAQPage`를 펼쳐 `Question`의 수를 센다.
  4. `curl -s http://localhost:4399/ko/ | pbcopy`로 `/ko/`도 반복한다.
  5. **[사람]**(참고만) <https://search.google.com/test/rich-results>에도 같은 코드를 넣어 본다. 이 결과는 **판정에 쓰지 않는다**([스펙](../specs/landing-page.md) 「확인이 필요한 것」의 리치 결과 항목 — Google 리치 결과는 `FAQPage`를 일반 사이트에 노출하지 않는다).
- **기대 결과**
  - 두 주소 모두 오류 0 · 경고 0.
  - 인식된 타입이 정확히 `WebSite` · `SoftwareApplication` · `FAQPage` 셋.
  - `FAQPage` 아래 `Question`이 일곱, 각 질문에 `acceptedAnswer`(`Answer`)가 있다.
  - `/ko/`의 질문 · 답은 한국어, `inLanguage`는 `ko`.
  - `offers` · `aggregateRating` · `review`가 어디에도 없다(이것은 unit U-SD7이 이미 본다 — 여기서는 검증기의 「Detected」에 이 타입이 뜨지 않는지로 한 번 더 본다).
- **직접 따라가 보지 않음**(외부 사이트 · 사람 전용). 2026-10-05의 두 수행 모두 **미수행**이다 — 외부 검증기의 판정은 미확인이고, 다음 사람이 처음 돈다.

### E3 — JavaScript를 끈 FAQ (스크립트 없음)

- **무엇을 보나**: 스크립트가 꺼진 실제 브라우저에서도 FAQ 일곱 질문이 보이고 누르면 답이 열리고 다시 누르면 닫힌다.
- **대역으로 대신할 수 없는 이유**: JSDOM은 `<details>`의 여닫음과 렌더 결과(글자 잘림 · 겹침)를 계산하지 않는다 — 브라우저 엔진만 판정한다.
- **AC**: 10.
- **전제**: 공통 전제.
- **단계**
  1. **[명령]** 스크립트 없이 본문에 답이 들어 있는지 먼저 확인한다(헤드리스가 아니라 HTML 자체).

     ```sh
     curl -s $B/ | grep -o 'data-testid="faq-item"' | wc -l                    # 7
     curl -s $B/ | grep -o '<details[^>]*data-testid="faq-item"' | wc -l        # 7
     ```

     대상은 반드시 `$B/`(= `http://localhost:4399/`, 홈)다 — 404 페이지(`/no-such-page/`)에는 FAQ가 없어 0이 나온다.
     `<details` 전체를 세지 않는다: 헤더의 언어 메뉴(`<details class="lang-menu">`)도 `<details`라서 8이 나온다. FAQ 항목만(`data-testid="faq-item"`) 센다.

  2. **[사람]** Chrome → 설정 → 개인정보 및 보안 → 사이트 설정 → JavaScript → 「사이트에서 JavaScript를 사용하지 않도록 허용」(또는 DevTools → `Cmd+Shift+P` → 「Disable JavaScript」). 확인 뒤 `http://localhost:4399/`를 새로 연다.
  3. **[사람]** 아래로 내려 FAQ 섹션(머리 `FAQ` · 제목 `Questions about Duru`, 주소 `#faq`)까지 간다. 질문을 위에서부터 하나씩 누른다.
  4. **[사람]** 열린 답을 같은 질문에서 다시 눌러 닫는다. 마지막 질문(`Where can I download Duru?`)까지 반복한다.
  5. **[사람]** `/ko/`에서 2~4를 반복한다. 끝나면 JavaScript 설정을 되돌린다.
- **기대 결과**
  - 질문 일곱이 모두 보인다(`faq-item` 7 · FAQ의 `<details` 7. 언어 메뉴의 `<details class="lang-menu">`는 별개라 문서 전체 `<details`는 8이다).
  - 처음에는 모두 닫혀 있고, 누르면 그 질문의 답만 열린다(다른 항목이 자동으로 닫히지 않는다 — `name` 속성 없음).
  - 다시 누르면 닫힌다. 답의 글자가 잘리거나 다른 요소에 가려지지 않는다.
  - 마지막 답은 「not released yet」(한국어 「출시 전」)을 담는다(스토어 주소가 비어 있는 지금 — AC3).
- **직접 따라가 본 결과(2026-10-05)**: 1단계 — `faq-item` 7, FAQ `<details` 7(문서 전체 `<details`는 언어 메뉴 포함 8이라 처음 문서의 7은 틀렸다).
  2~5단계는 **헤드리스 Chromium(149)에서 재현됐다** — `/` · `/ko/` 모두 질문 일곱이 보이고 처음에 전부 닫혀 있으며, 하나를 열면 그 항목만 열리고(열린 수 1) 답이 보이고 잘리지 않으며 다시 누르면 닫혔다. 마지막 답은 「not released yet」 / 「출시 전」을 담았다.
  **사람이 실제 Chrome의 설정에서 JavaScript를 끄고 눈으로 본 것은 아니다** — 그 확인은 남아 있다.

### E4 — 키보드로 FAQ 여닫기

- **무엇을 보나**: 마우스 없이 `Tab` · `Enter` · `Space`만으로 FAQ를 여닫을 수 있고 포커스 윤곽이 보인다.
- **대역으로 대신할 수 없는 이유**: 포커스 순서 · 포커스 윤곽의 가시성 · `Enter`/`Space`의 기본 동작은 브라우저가 구현한다 — 마크업 단언은 이 동작을 보증하지 않는다.
- **AC**: 10.
- **전제**: 공통 전제. JavaScript는 **켠** 상태.
- **단계** (전부 **[사람]**)
  1. `http://localhost:4399/`를 연다. 주소창을 클릭해 포커스를 두고 `Tab`을 반복해 FAQ의 첫 질문 `What is Duru?`까지 간다(`Shift+Tab`으로 되돌아 갈 수 있다).
  2. `Enter`를 눌러 연다. 같은 질문에서 `Space`를 눌러 닫는다. 다시 `Space`로 열고 `Enter`로 닫는다.
  3. `Tab`을 눌러 다음 질문으로 간다. 일곱째 질문까지 반복한다.
  4. 질문 하나를 연 채로 `Tab`을 눌러 포커스가 어디로 가는지 본다.
  5. `/ko/`에서 반복한다.
- **기대 결과**
  - 포커스 윤곽이 `summary`(질문 줄)에 눈에 띄게 보인다.
  - `Enter`와 `Space`가 둘 다 여닫는다.
  - 포커스는 질문 순서(1 → 7)대로 옮겨 간다. 열린 답 글자는 포커스를 받지 않는다(답 안에는 링크 · 버튼이 없다). **닫힌** 답 안으로 들어가지 않는다.
- **직접 따라가 본 결과(2026-10-05)**: 사람은 따라가지 않았다. 같은 조작을 **헤드리스 Chromium(149)의 키 입력으로 재현했다** — `/` · `/ko/` 모두 첫 질문까지 `Tab` 13번, 포커스가 질문 순서(1 → 7)대로 `summary`로만 옮겨 갔고, `Enter` 열림 · `Space` 닫힘 · `Space` 열림 · `Enter` 닫힘이 모두 됐다. 첫 질문을 연 채 `Tab`을 누르면 답이 아니라 둘째 질문으로 갔고, 항목 안에 포커스를 받는 요소는 0이었다. 포커스 윤곽의 계산된 값은 `3px solid rgb(185, 66, 8)`(안쪽으로 3px)이었다.
  **남은 사람 단계**: 윤곽이 실제로 「눈에 띄게」 보이는지, Safari 또는 Firefox에서의 같은 동작, 스크린리더로 여닫을 때의 낭독(E9의 3~5단계와 함께).

### E5 — `/llms.txt` · `/robots.txt` (GEO)

- **무엇을 보나**: 두 텍스트 파일이 배포 서버가 주는 그대로 읽힌다 — 글자가 깨지지 않고 필요한 줄이 있다.
- **대역으로 대신할 수 없는 이유**: 산출 파일의 줄은 integration이 이미 본다. 여기서 보는 것은 **서버가 실제로 내려주는 응답**(상태 · `Content-Type` · 브라우저에서의 한글 표시)이다.
- **AC**: 6 · 7.
- **전제**: 공통 전제.
- **단계**
  1. **[명령]** 상태와 형식.

     ```sh
     for p in /llms.txt /robots.txt /sitemap-index.xml; do curl -s -o /dev/null -w "$p %{http_code} %{content_type}\n" $B$p; done
     ```

  2. **[명령]** `robots.txt` 본문.

     ```sh
     curl -s $B/robots.txt
     ```

  3. **[명령]** `llms.txt` 줄.

     ```sh
     curl -s $B/llms.txt | head -8
     curl -s $B/llms.txt | grep '^### '
     curl -s $B/llms.txt | grep -c '^### '
     ```

  4. **[명령]** 본문 바이트가 올바른 UTF-8이고 한국어가 들어 있는지(브라우저 표시가 아니라 **바이트**로 판정한다).

     ```sh
     curl -s $B/llms.txt | iconv -f UTF-8 -t UTF-8 >/dev/null && echo ok      # ok
     curl -s $B/llms.txt | grep -c 'Duru in Korean'                            # 1
     curl -s $B/llms.txt | perl -CSD -ne 'print if /[\x{1100}-\x{11ff}\x{3130}-\x{318f}\x{ac00}-\x{d7a3}]/' | wc -l   # 0
     ```
- **기대 결과**
  - 세 경로 모두 `200`. `/llms.txt` · `/robots.txt`는 `text/plain`, `/sitemap-index.xml`은 `text/xml`.
  - `robots.txt`는 이 줄들을 **이 순서로** 가진다(묶음마다 빈 줄 하나로 구분).

    ```text
    User-agent: *
    Allow: /

    User-agent: GPTBot
    Allow: /

    User-agent: OAI-SearchBot
    Allow: /

    User-agent: ChatGPT-User
    Allow: /

    User-agent: ClaudeBot
    Allow: /

    User-agent: PerplexityBot
    Allow: /

    User-agent: Google-Extended
    Allow: /

    Sitemap: https://example.test/sitemap-index.xml
    ```

    `Disallow`는 한 줄도 없다.
  - `llms.txt`의 첫 줄이 정확히 `# Duru`, 이어서 `> ` 요약 한 줄, `## Pages` 아래 링크가 `- [Duru — Learn Korean by living a story](https://example.test/): English` · `- [Duru in Korean](https://example.test/ko/): 한국어`.
  - `## FAQ` 아래 `### ` 질문이 **일곱**(`grep -c`가 `7`), 마지막 답이 「not released yet」을 담는다.
  - 4단계: `iconv`가 오류 없이 끝나 `ok`가 찍히고, `Duru in Korean` 줄이 하나 있고 한글이 든 줄이 `0`이다(본문은 영어로만 쓴다 — 2026-10-05 사용자 결정). 이것이 로컬의 판정이다.
  - 브라우저 표시 · `charset=utf-8` 헤더는 로컬에서 판정하지 않는다 — 아래 「배포 뒤」 절에서 실제 호스트로 본다.
- **직접 따라가 본 결과(2026-10-05)**: 1~3단계 — 세 경로 모두 200, 형식 `text/plain` · `text/plain` · `text/xml`, `robots.txt`는 위 본문과 일치, `llms.txt` 첫 줄 `# Duru`, 링크 둘 `https://example.test/…`, `### ` 일곱. 4단계(`iconv` · `grep -c '한국어'`)는 정정 때 한 번 돌려 `ok` · `1`을 확인했다.
- **알려진 한계(preview)**: `astro preview`는 정적 파일의 `Content-Type`을 호스팅 서버 규칙대로 내리므로 `/llms.txt`가 `text/plain`(**charset 없음**)이다. 그래서 로컬 Chrome에서 `/llms.txt`를 열면 한글이 깨져 보일 수 있다. **이것은 preview의 한계이고 E5의 실패가 아니다** — 본문 바이트는 올바른 UTF-8이다. 브라우저 표시는 아래 「배포 뒤」 절의 실제 호스트에서 본다.

### E6 — 404 화면

- **무엇을 보나**: 없는 주소가 실제로 404를 받고, 화면이 안내 + 홈 · 언어 링크를 주며, 콘솔이 깨끗하다.
- **대역으로 대신할 수 없는 이유**: 상태 코드는 서버 응답이고 콘솔 오류 · 링크 이동은 실제 브라우저에서만 보인다. 빌드 산출물의 `404.html` 모양은 integration I-A12가 본다.
- **AC**: 8.
- **전제**: 공통 전제.
- **단계**
  1. **[명령]** 응답과 메타.

     ```sh
     curl -s -o /dev/null -w '%{http_code} %{content_type}\n' $B/no-such-page/
     curl -s $B/no-such-page/ | grep -o '<meta name="robots"[^>]*>\|Back to Duru\|doesn.t exist\|<link rel="canonical"'
     curl -s $B/sitemap-0.xml | grep -o '<loc>[^<]*'
     ```

  2. **[사람]** Chrome에서 `http://localhost:4399/no-such-page/`를 연다. DevTools(`Cmd+Option+I`) → Console · Network 탭을 연 채로 새로 고친다.
  3. **[사람]** `Back to Duru` 링크를 누른다(홈으로 간다). 뒤로 가서 `한국어` 링크를 누른다(`/ko/`로 간다).
- **기대 결과**
  - 응답 `404 text/html`.
  - 본문에 `This page doesn’t exist`(어퍼스트로피는 `’`)가 보이고, `<meta name="robots" content="noindex">`가 있다. `<link rel="canonical"`은 **없다**(`grep`이 이 줄을 내지 않는다).
  - `Back to Duru` → `/`, `한국어` → `/ko/`.
  - 콘솔: 404 주소를 열면 **문서 자체의 404**가 「Failed to load resource: the server responded with a status of 404」 **한 줄**로 남는다 — 정상이다. **그 한 줄 외의** 콘솔 오류는 0(404 페이지에는 랜딩 스크립트가 실리지 않는다). Network 탭에서도 이 문서 요청 자체의 404 외에 실패한 요청이 없다.
  - sitemap의 `<loc>`이 정확히 둘(`https://example.test/` · `https://example.test/ko/`) — 404가 들어 있지 않다.
- **직접 따라가 본 결과(2026-10-05)**: 1단계 — `404 text/html`, `robots` `noindex` 한 줄, `Back to Duru` 한 번, `doesn’t exist` 한 번, canonical 없음, sitemap `<loc>` 둘.
  2~3단계는 **헤드리스 Chromium(149)에서 재현됐다** — 콘솔 오류는 문서 자체의 404 한 줄뿐이고 실패한 요청은 없었으며, 페이지에 스크립트가 0개였다. `Back to Duru` → `/`, `한국어` → `/ko/`로 이동했다. 둘째 수행(헤더 수정 뒤)에서는 404 페이지의 `<details>`가 0개였다 — 헤더에 언어 메뉴가 없고, 언어 링크는 본문의 `한국어` 하나다.
  **사람이 DevTools를 열고 본 것은 아니다.** Safari · Firefox는 미수행이다.

### E7 — 폭별 레이아웃 · 메뉴 · 대비

- **무엇을 보나**: 390 · 1000 · 1440px에서 가로 스크롤이 없고, 1000px에서 헤더가 한 줄에 서며, `FAQ` 메뉴가 FAQ 섹션으로 가고, FAQ 글자 대비가 4.5:1 이상이다.
- **대역으로 대신할 수 없는 이유**: JSDOM은 레이아웃을 계산하지 않는다 — 겹침 · 줄 바꿈 · 스크롤 폭 · 밑줄 상태 · 색 대비는 실제 렌더에서만 나온다.
- **AC**: 9 · 10 · 디자인.
- **전제**: 공통 전제. 스크립트는 켠 상태(스크롤 중 밑줄은 스크립트가 켠다).
- **단계**
  1. **[명령]**(가로 스크롤 판정) 폭별로 문서 폭이 창 폭을 넘는지 본다. 헤드리스 Chrome으로 되풀이할 수 있다.

     ```sh
     pnpm dlx playwright@1 install chromium    # 처음 한 번만
     node --input-type=module -e '
     import { chromium } from "playwright";
     const b = await chromium.launch();
     for (const w of [390, 1000, 1440]) for (const p of ["/", "/ko/"]) {
       const pg = await b.newPage({ viewport: { width: w, height: 900 } });
       await pg.goto("http://localhost:4399" + p);
       const o = await pg.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
       console.log(w, p, o[0] <= o[1] ? "OK" : "OVERFLOW", o);
     }
     await b.close();'
     ```

     (`playwright`을 못 찾으면 임시 폴더에서 `pnpm add playwright` 뒤 그 폴더에서 돌린다. 저장소 의존을 늘리지 않는다.)
  2. **[사람]** Chrome DevTools → 기기 도구 모음(`Cmd+Shift+M`)에서 폭을 390 · 1000 · 1440으로 바꿔 `/`와 `/ko/`를 FAQ까지 내린다.
  3. **[사람]** 1000px와 1440px에서 헤더를 본다 — 메뉴 넷(`Features` · `Story` · `Phrases` · `FAQ`) · 언어 메뉴 · 버튼이 한 줄에 서고 서로 겹치지 않는지. 메뉴의 `FAQ`를 누른다.
  4. **[사람]** 이동한 뒤 FAQ 구간에서 메뉴의 `FAQ`에 밑줄이 서는지 본다.
  5. **[사람]** FAQ 질문 · 답 글자를 DevTools로 검사(요소 선택 → 스타일 패널의 색 견본을 연다) → 「Contrast ratio」를 읽는다. 질문 줄 · 답 · 머리 글자 각각.
- **기대 결과**
  - 1단계 출력이 여섯 줄 모두 `OK`(가로 스크롤 없음).
  - 1000px에서 메뉴 넷 · 언어 메뉴 · 버튼이 한 줄이고 겹치지 않는다. 한국어(`/ko/`)도 같다.
  - `FAQ`를 누르면 `#faq`로 가고, 그 구간에서 메뉴의 `FAQ`가 밑줄로 현재 위치를 보인다.
  - FAQ 글자 대비가 **4.5:1 이상**(DevTools의 「Contrast ratio」에 체크 표시 두 개 — AA).
  - 문서 순서의 제목 단계가 건너뛰지 않는다는 것(AC9)은 ui UI-LD2와 integration I-A13이 본다 — 여기서는 눈으로 제목 위계가 어색하지 않은지만 본다.
- **직접 따라가 본 결과(2026-10-05)**: 1단계 — 여섯 줄 모두 `OK`(390 · 1000 · 1440px, `/` · `/ko/`. 문서 폭 = 창 폭).
  3~4단계의 일부를 **헤드리스 Chromium(149)의 좌표와 속성으로 재현했다** — 1000px · 1440px에서 메뉴 넷 · 언어 메뉴 · 버튼 여섯이 같은 줄(세로 중심 차이 0)이고 겹치지 않았으며(헤더 높이 64px), `FAQ`를 누르면 주소가 `#faq`가 되고 그 링크에 `aria-current="true"`와 밑줄이 섰다(영어 · 한국어 모두).
  **미수행(사람)**: 2~3단계의 눈으로 보는 확인(겹침 · 어색한 줄 바꿈 · 제목 위계), 5단계의 DevTools 「Contrast ratio」 읽기. 대비 4.5:1은 이 절차로는 **아직 판정되지 않았다.** playwright는 이 저장소의 의존이 아니라 임시 폴더에 설치해 돌렸다.

### E8 — 히어로 그림의 요청 순서

- **무엇을 보나**: 좁은 화면에서 첫 히어로 그림이 가장 먼저 · 높은 우선순위로 요청되고 나머지는 늦게 요청되며, LCP 요소가 히어로다.
- **대역으로 대신할 수 없는 이유**: `fetchpriority` · `loading` 속성의 존재는 ui UI-HR1~2와 integration I-A16이 본다. 브라우저가 **실제로 그 순서로 요청하는지**와 LCP 요소는 네트워크 · 성능 도구만 안다.
- **AC**: 범위 8(디자인 범위의 히어로 로드 우선순위). 보조: 성능 측정.
- **전제**: 공통 전제.
- **단계**
  1. **[명령]** 속성이 산출물에 그대로 있는지.

     ```sh
     curl -s $B/ | grep -o '<img[^>]*>' | grep 'scene-' | head -3
     ```

  2. **[사람]** Chrome DevTools → Network 탭 → Img 필터 → 「Disable cache」 체크 → 우선순위 열 켜기(열 머리글 우클릭 → Priority). 기기 도구 모음으로 폭을 390px로 두고 `http://localhost:4399/`를 새로 연다. **스크롤하지 않는다.**
  3. **[사람]** 요청 목록에서 `scene-plane` · `scene-street` · `scene-arrival`의 순서와 Priority 열을 읽는다. 그다음 천천히 스크롤해 나머지가 언제 요청되는지 본다.
  4. **[명령]**(LCP 요소 — 주 경로) 브라우저가 알려 주는 LCP 요소를 `PerformanceObserver`로 읽는다. Lighthouse 버전에 묶이지 않는다. Chrome DevTools 콘솔(폭 390px, 새로 고침 직후 — `buffered: true`라 늦게 붙여도 된다)에 붙여 넣는다.

     ```js
     new PerformanceObserver(l => { const e = l.getEntries().at(-1); console.log(e.element?.tagName + (e.element?.id ? '#' + e.element.id : ''), e.element?.outerHTML.slice(0, 120)); }).observe({ type: 'largest-contentful-paint', buffered: true });
     ```

     헤드리스로 되풀이하려면 Playwright에서 같은 관찰자를 `page.addInitScript`로 심고 로드 뒤 값을 읽는다(요청 우선순위는 `context.newCDPSession(page)` → `Network.enable` → `Network.requestWillBeSent`의 `request.initialPriority`로 읽는다. `scene-` 요청만 거른다).
  5. **[명령]**(보조 — Lighthouse) 같은 값을 Lighthouse로도 본다. **감사 키 이름은 버전별로 다르다**: 13.5.0에는 `largest-contentful-paint-element`가 **없고** `lcp-breakdown-insight`(`details`에 LCP 요소 노드)로 바뀌었다. 모르는 키는 `Object.keys(r.audits).filter(k => /lcp/.test(k))`로 먼저 찾는다.

     ```sh
     pnpm dlx lighthouse http://localhost:4399/ --only-categories=performance --form-factor=mobile \
       --output=json --output-path=/tmp/lh-perf.json --chrome-flags="--headless=new" --quiet
     node -e 'const r=require("/tmp/lh-perf.json");console.log(r.lighthouseVersion,Object.keys(r.audits).filter(k=>/lcp/.test(k)))'
     ```
- **기대 결과**
  - 1단계: 출력 세 줄이 `scene-plane` · `scene-street` · `scene-arrival` 순서이고(히어로 패널 셋), 첫 그림(`scene-plane`)에 `fetchpriority="high"`가 있고 `loading`이 없다. 나머지 둘(`scene-street` · `scene-arrival`)은 `loading="lazy"`이고 `fetchpriority`가 없다.
  - 3단계: DevTools Network의 **Priority 열**(또는 CDP `Network.requestWillBeSent`의 `request.initialPriority`)에서 `scene-plane`이 **High**이고 Img 요청 중 **가장 먼저** 나간다. 판정 기준은 이것이다: `scene-street` · `scene-arrival`의 우선순위가 `scene-plane`보다 **높으면 안 된다**(같거나 낮아야 한다).
  - **알려진 한계**: 좁은 화면(390px)에서는 히어로 세 패널이 **같은 자리에 겹쳐** 있어 `loading="lazy"`인 두 그림(`scene-street` · `scene-arrival`)도 **스크롤 전에 요청된다**(뷰포트 안에 있기 때문). 「스크롤 전에는 요청되지 않는다」는 기대하지 않는다 — 요청되는 것 자체는 실패가 아니다.
  - **알려진 관찰 — 요청 뒤의 우선순위 상향**: Chrome 154는 이 두 그림을 Low로 요청한 **뒤** High로 올린다(CDP의 우선순위 변경 이벤트로 관찰했다. 뷰포트 안의 그림이라고 판단한 것으로 보인다 — 추정. 첫 수행에서는 chrome-headless-shell 149에서도 같은 상향이 보였고 둘째에서는 Chrome 154에서만 보였다). 그래서 DevTools의 Priority 열에는 셋 다 High로 보일 수 있다. 판정은 **처음 요청할 때의 우선순위**(`initialPriority`)와 요청 순서로 한다: `scene-plane`이 처음부터 High이고 그림 중 가장 먼저 나가면 통과다. 나머지 둘이 나중에 High가 되는 것은 「`scene-plane`보다 높으면 안 된다」에 어긋나지 않는다(같다).
  - 진단: `scene-plane`이 High가 아니면 산출 HTML의 `<link rel="preload" as="image" href="…scene-plane…">`를 본다(1단계 옆 `curl -s $B/ | grep -o '<link[^>]*preload[^>]*>'`). 이 preload에 `fetchpriority`가 없으면 브라우저는 그 요청을 Low로 먼저 보내고 `<img fetchpriority="high">`는 이미 나간 요청을 재사용한다.
  - 4단계: LCP 요소가 첫 히어로 그림(`scene-plane`) 또는 히어로 제목(`h1#hero-title`)이다. 5단계(Lighthouse)는 같은 값을 확인하는 보조이고 키가 없으면 기록만 한다.
- **직접 따라가 본 결과(2026-10-05, 제품 수정 뒤의 빌드)**: 1단계 — `scene-plane`에 `fetchpriority="high"`, 나머지 둘에 `loading="lazy"`. preload 링크는 `<link rel="preload" as="image" href="…scene-plane…" fetchpriority="high">`.
  3단계는 사람이 DevTools로 읽지 않고 **헤드리스에서 CDP로 읽었다**(390px, 캐시 끔) — `scene-plane`의 `initialPriority`가 **High**이고 그림 요청 중 **첫째**였다. 나머지 그림(`logo-duru` · `minseo` · `scene-street` · `scene-arrival` · `scene-cafe-evening`)은 Low였다. chrome-headless-shell 149와 Chrome 154에서 같았고, Chrome 154는 요청 뒤 `scene-street` · `scene-arrival`을 High로 올렸다(위 「알려진 관찰」). lazy 둘은 스크롤 전에 요청됐다(위 「알려진 한계」 — 세 그림의 자리가 같았다).
  4단계 — LCP 요소 `H1#hero-title`. 5단계 — Lighthouse 13.5.0의 키는 `lcp-breakdown-insight` · `lcp-discovery-insight`이고 같은 요소를 가리켰다.
  **수정 전 빌드에서는 달랐다**: 첫 수행 때는 `scene-plane`을 포함한 히어로 그림이 모두 Low로 요청됐고, 그것이 위 「진단」의 원인(preload에 `fetchpriority` 없음)으로 이어졌다.
  **미수행(사람)**: 2~3단계를 실제 Chrome의 DevTools Network 탭에서 눈으로 읽는 것.

### E9 — `/ko/`의 head · 보조 기술 낭독

- **무엇을 보나**: 한국어 페이지의 `<head>` 값이 한국어 · 절대 주소로 나오고, 보조 기술이 FAQ 질문을 접힘 / 펼쳐짐 상태 · 제목 수준과 함께 읽는다.
- **대역으로 대신할 수 없는 이유**: head 값은 ui · integration이 보지만, **VoiceOver/NVDA가 `<details>/<summary>`를 어떻게 낭독하는지**는 보조 기술에서만 판정된다.
- **AC**: 4 · 10.
- **전제**: 공통 전제. VoiceOver는 `Cmd+F5`로 켠다(Safari 권장).
- **단계**
  1. **[명령]** head를 읽는다.

     ```sh
     curl -s $B/ko/ | grep -o '<meta property="og:locale[^>]*>\|<meta property="og:image"[^>]*>\|<meta name="twitter:image"[^>]*>\|<meta property="og:image:alt"[^>]*>\|<html[^>]*>'
     ```

     출력은 **여섯 줄**이다 — `<html …>` · `og:locale` · `og:locale:alternate` · `og:image` · `og:image:alt` · `twitter:image`.

  2. **[사람]** Chrome에서 `http://localhost:4399/ko/`의 소스 보기(`Cmd+Option+U`)로 `<head>`를 읽는다. 위 값을 눈으로 확인한다.
  3. **[사람]** Safari에서 `http://localhost:4399/ko/`를 열고 VoiceOver를 켠 뒤 `VO+오른쪽 화살표`로 FAQ의 첫 질문까지 이동한다. 낭독을 받아 적는다.
  4. **[사람]** `VO+Space`로 질문을 연다. 낭독을 받아 적고, 다시 `VO+Space`로 닫아 낭독을 받아 적는다.
  5. **[사람]** 같은 질문이 스크린리더에서 **「제목 수준 3」**(heading level 3)과 **「접힘/펼쳐짐」**(상태) **둘 다**로 읽히는지 본다(`summary` 안에 `h3`가 들어 있다). 첫 질문 하나를 VoiceOver + Safari로 읽고, 가능하면 NVDA(Windows) 또는 TalkBack(Android) 중 하나로도 읽는다. 읽는 방식은 도구 · 브라우저마다 다를 수 있으므로(제목만 읽고 상태를 빼거나 그 반대일 수 있다) **예상하지 말고 관찰한 그대로** 기록 틀에 적는다.
- **기대 결과**
  - `og:locale`이 `ko_KR`, `og:locale:alternate`가 `en_US`, `twitter:image`와 `og:image`가 `https://example.test/og-ko.jpg`(절대 주소), `og:image:alt`가 **한국어** 문장, `<html lang="ko">`.
  - 보조 기술이 질문을 읽을 때 「접힘」 · 「펼쳐짐」(NVDA는 「축소됨/확장됨」) 같은 **상태를 함께** 낭독하고, 열고 닫으면 상태 낭독이 바뀐다. 질문 글자가 낭독에서 빠지지 않는다.
  - 질문이 「제목 수준 3」과 「접힘/펼쳐짐」을 모두 낭독되는지 도구별로 적는다. 둘 중 하나가 빠지면 그 도구 · 브라우저 조합을 `실패`가 아니라 **관찰**로 기록하고 메모에 적는다(접근성 검토가 이후 판단한다).
  - 낭독 문구는 그대로 적어 둔다(보조 기술 · 버전마다 다르므로 정확한 낱말이 아니라 **상태를 읽는지**가 판정이다).
- **직접 따라가 본 결과(2026-10-05)**: 1단계 — `<html lang="ko">`, `og:locale` `ko_KR`, `og:locale:alternate` `en_US`, `og:image:alt` 한국어 문장, `twitter:image`와 `og:image` 모두 `https://example.test/og-ko.jpg`.
  처음 문서의 `grep` 패턴에는 `og:image`가 없어 **다섯 줄**만 나왔고(둘째 수행은 `og:image`를 따로 읽었다), 그 뒤 패턴에 `og:image`를 더했다. 고친 패턴은 같은 빌드의 산출 파일(`ko/index.html`)에 대고 여섯 줄이 나오는 것을 확인했다 — preview 응답에 대고는 아직 돌리지 않았다.
  **미수행(사람)**: 2~5단계 전부. 스크린리더가 질문을 「제목 수준 3」과 「접힘/펼쳐짐」으로 읽는지는 **미확인**이다(헤드리스 Chromium의 접근성 트리가 `h3`를 수준 3 제목으로 노출하는 것까지만 따로 확인됐다).

## 배포 뒤 (이번 e2e 밖 — 측정 항목)

배포 주소가 정해지고 사이트가 올라간 **뒤에만** 잴 수 있다. 이번 변경의 통과 · 실패에는 들어가지 않는다.

- **Search Console**: 사이트 소유 확인 뒤 sitemap(`/sitemap-index.xml`)을 제출하고 색인된 쪽 수(기대: 2쪽 — `/` · `/ko/`), 노출 · 클릭을 기록한다.
- **답변 엔진의 인용**: 대표 질문(예: 「Korean learning app that teaches through a story」)을 답변 엔진에 수동으로 물어 Duru가 인용되는지 기록한다.
- **`/llms.txt` · `/robots.txt`의 한글 표시와 헤더(E5에서 옮김)**: 실제 호스트에서 Chrome으로 두 주소를 열어 `한국어` · `이야기로 배우는 한국어`가 깨지지(`í•œêµ­ì–´` 같은 글자) 않는지 보고, 응답 헤더를 읽는다.

  ```sh
  curl -sI https://<배포 주소>/llms.txt | grep -i '^content-type'      # text/plain; charset=utf-8
  ```

  기대: 한글이 깨지지 않고 `Content-Type`이 `text/plain; charset=utf-8`이다. 깨지면 **고칠 곳은 호스팅의 헤더 설정**(`.txt` 응답에 `; charset=utf-8`)이다 — 문서 · 빌드 산출물이 아니다.
- **실제 배포 주소로 E1 · E2 · E5 다시**: `SITE_URL`을 실제 주소로 넣은 빌드를 올린 뒤, 위 케이스를 그 주소에서 한 번 더 돈다(`Content-Type`의 charset과 canonical이 실제 호스트와 같은지 포함).

## 기록 틀

수행할 때 이 표를 복사해 아래 「수행 기록」에 더하고 채운다. 이 문서의 위 값을 고치지 않는다(어긋나면 「메모」에 적고 문서를 따로 고친다).
한 항목이라도 어긋나면 `실패: <관찰>`로 적는다. **사람이 하지 않은 단계는 `미수행`으로 적는다** — 헤드리스 재현은 `[사람]` 단계를 대신하지 않는다.

```text
수행자:
일시:
커밋(git rev-parse HEAD):
빌드 주소(SITE_URL):
preview 포트:
브라우저/도구 버전: Chrome ___ · Safari 또는 Firefox ___ · Lighthouse ___ · VoiceOver/NVDA ___ · Node ___
```

| id | 통과/실패 | 관찰 값(점수 · 타입 수 · 응답 · 낭독 문구 · 대비) | 메모 |
|---|---|---|---|
| E1 Lighthouse SEO | | `/` ___ · `/ko/` ___ · 1이 아닌 감사 ___ | |
| E2 schema.org | | 오류 ___ · 경고 ___ · 타입 ___ · Question 수 ___ | |
| E3 스크립트 끔 | | `faq-item` ___ · 여닫힘 ___ | |
| E4 키보드 | | 포커스 윤곽 ___ · Enter ___ · Space ___ · 순서 ___ | |
| E5 llms · robots | | 상태/형식 ___ · `### ` 수 ___ · 한글 표시 ___ | |
| E6 404 | | 응답 ___ · 링크 ___ · 콘솔 오류 ___ | |
| E7 폭 · 메뉴 · 대비 | | 가로 스크롤 ___ · 1000px 한 줄 ___ · 대비 ___ | |
| E8 그림 요청 순서 | | scene-plane Priority ___ · 순서 ___ · LCP 요소 ___ | |
| E9 `/ko/` head · 낭독 | | head ___ · 낭독 문구 ___ · 제목 수준 3 ___ · 접힘/펼쳐짐 ___ (도구별) | |

종합 메모:

## 수행 기록

지금까지의 수행은 2026-10-05의 둘이고 **둘 다 사람이 아니라 에이전트가 헤드리스 브라우저로 재현한 것이다.**
`[사람]` 단계는 한 번도 수행되지 않았다. 전체 판정은 **부분 통과**다 — 수행한 것은 둘째에서 전부 통과했고, 아래
「미수행」이 남아 있다.

### 2026-10-05 첫째 — 수정 전 빌드

```text
수행자: test-runner 에이전트(헤드리스 재현). 사람이 아니다
일시: 2026-10-05 12:47~12:55 KST
커밋(git rev-parse HEAD): 949806c139d26588e2de570fdf1cc363e8472be0
빌드 주소(SITE_URL): https://example.test
preview 포트: 4399 (--ignore-lock — 4321에 다른 preview가 떠 있었다)
브라우저/도구 버전: chrome-headless-shell 149.0.7827.55 · Chrome 154.0.8037.97(E8 교차 확인) · Safari/Firefox 미수행 · Lighthouse 13.5.0 · VoiceOver/NVDA 미수행 · Node v22.23.2
```

| id | 통과/실패 | 관찰 값 | 메모 |
|---|---|---|---|
| E1 Lighthouse SEO | 통과 | `/` 1 · `/ko/` 1 · 1이 아닌 감사 없음(`structured-data`는 null) | |
| E2 schema.org | 미수행 | — | 외부 사이트 · 사람 전용 |
| E3 스크립트 끔 | 실패: 문서 결함 | `faq-item` 7 · 문서 전체 `<details` 8(문서의 기대는 7) · 헤드리스에서 여닫힘 됨 | 제품이 아니라 이 문서의 기대값이 틀렸다(언어 메뉴도 `<details>`). 문서를 고쳤다 |
| E4 키보드 | 부분(헤드리스분 통과) | 윤곽 `3px solid rgb(185, 66, 8)` · Enter 됨 · Space 됨 · 순서 1 → 7 | 눈 확인 · 낭독 미수행 |
| E5 llms · robots | 실패: 헤드리스 표시 | 세 경로 200 · `text/plain` · `text/plain` · `text/xml` · `### ` 7 · 헤드리스에서 `document.characterSet`이 `windows-1252`, 한글 깨짐 | preview가 charset 없이 내린다. 바이트는 UTF-8. 판정을 바이트로 바꾸고 표시 · 헤더 확인은 「배포 뒤」로 옮겼다 |
| E6 404 | 통과 | `404 text/html` · `Back to Duru` → `/` · `한국어` → `/ko/` · 콘솔은 문서 자체의 404뿐 | 그 한 줄을 정상으로 문서에 적었다 |
| E7 폭 · 메뉴 · 대비 | 부분(헤드리스분 통과) | 가로 스크롤 없음(여섯 줄 OK) · 1000px 한 줄 · 대비 미수행 | 눈 확인 미수행 |
| E8 그림 요청 순서 | **실패: 제품** | `scene-plane` initialPriority **Low**(끝까지 Low) · lazy 둘도 스크롤 전에 요청 · LCP 요소 `H1#hero-title` | preload `<link>`에 `fetchpriority`가 없었다 → 제품 수정. 문서의 Lighthouse 감사 키도 13.5.0에 없어 고쳤다 |
| E9 `/ko/` head · 낭독 | 부분(1단계 통과) | head 값 기대와 같음 · 낭독 미수행 | |

종합 메모: 통과 2 · 실패 3(제품 1 · 문서/환경 2) · 부분 3 · 미수행 1. 이 수행이 제품 수정 하나와 문서 정정 여섯을 냈다(위 「정정 기록」).

### 2026-10-05 둘째 — 수정 뒤 빌드

```text
수행자: test-runner 에이전트(헤드리스 재현). 사람이 아니다
일시: 2026-10-05 13시대 KST
커밋(git rev-parse HEAD): 11624580e414cc4e6e42d53c66ec0fb832bd944d
빌드 주소(SITE_URL): https://example.test
preview 포트: 4399 (--ignore-lock)
브라우저/도구 버전: chrome-headless-shell 149.0.7827.55 · Chrome 154.0.8037.97(E8 교차 확인) · Safari/Firefox 미수행 · Lighthouse 13.5.0 · VoiceOver/NVDA 미수행 · Node v22.23.2
```

| id | 통과/실패 | 관찰 값 | 메모 |
|---|---|---|---|
| E1 Lighthouse SEO | 통과 | `/` 1 · `/ko/` 1 · 1이 아닌 감사 없음(열 개 전부 1, `structured-data` null) | |
| E2 schema.org | **미수행** | — | 외부 사이트 · 사람 전용. 오류 · 경고 수, 인식된 타입은 미확인 |
| E3 스크립트 끔 | 통과(헤드리스 재현) | `faq-item` 7 · FAQ `<details` 7 · `/` · `/ko/` 모두 처음 닫힘 → 하나씩 열림 → 닫힘, 답이 잘리지 않음 | 사람이 실제 Chrome에서 본 것은 아니다 |
| E4 키보드 | 통과(헤드리스 재현) · 낭독 미수행 | 윤곽 `3px solid rgb(185, 66, 8)` · Enter 됨 · Space 됨 · 순서 1 → 7 · 닫힌 답으로 포커스가 새지 않음 | 윤곽의 눈 확인 · 스크린리더 미수행 |
| E5 llms · robots | 통과 | 세 경로 200 · `text/plain` · `text/plain` · `text/xml` · `robots.txt` 본문 일치 · `llms.txt` 첫 줄 `# Duru` · 절대 링크 둘 · `### ` 7 · `iconv` ok · `한국어` 1 | 브라우저의 한글 표시 · charset 헤더는 판정하지 않았다(「배포 뒤」) |
| E6 404 | 통과(헤드리스 재현) | `404 text/html` · `noindex` · canonical 없음 · sitemap `<loc>` 둘 · `Back to Duru` → `/` · `한국어` → `/ko/` · 콘솔은 문서 자체의 404 한 줄뿐 | 404 페이지의 `<details>` 0 · 스크립트 0 |
| E7 폭 · 메뉴 · 대비 | **부분** | 가로 스크롤 없음(여섯 줄 OK) · 1000px · 1440px 헤더 한 줄 · `FAQ` → `#faq`, `aria-current` · 밑줄 · **대비 미수행** | 눈으로 보는 확인 미수행 |
| E8 그림 요청 순서 | 통과(헤드리스 재현) | `scene-plane` initialPriority **High** · 그림 중 첫 요청 · 나머지 둘 Low(Chrome 154는 요청 뒤 High로 올림) · LCP 요소 `H1#hero-title` | lazy 둘은 스크롤 전에 요청됨(알려진 한계). DevTools로 사람이 읽은 것은 아니다 |
| E9 `/ko/` head · 낭독 | **부분** | head: `lang="ko"` · `ko_KR` · alternate `en_US` · 그림 둘 `https://example.test/og-ko.jpg` · `og:image:alt` 한국어 · **낭독 미수행 · 제목 수준 3 미확인 · 접힘/펼쳐짐 미확인** | 문서의 `grep` 패턴에 `og:image`가 없어 따로 읽었다 → 패턴을 고쳤다 |

**미수행 — 사람이 해야 한다**

- **E2 전체** — validator.schema.org에 붙여 넣기(`/` · `/ko/`).
- **E4 · E9의 스크린리더 낭독** — VoiceOver(Safari), 가능하면 NVDA 또는 TalkBack. 제목 수준 3과 접힘/펼쳐짐을 함께 읽는지.
- **E7의 눈으로 보는 확인과 대비** — 폭별 겹침 · 줄 바꿈, DevTools 「Contrast ratio」 4.5:1.
- **Safari 또는 Firefox** — 전제가 요구하는 둘째 브라우저에서는 어느 케이스도 돌리지 않았다.
- **E3 · E4 · E6 · E8의 `[사람]` 단계 자체** — 헤드리스로 같은 조작을 재현했을 뿐, 실제 Chrome에서 사람이 본 것은 아니다.
- **「배포 뒤」 절 전부** — 실제 호스트의 `llms.txt` 한글 표시와 charset 헤더, Search Console, 답변 엔진의 인용, 실제 주소로 E1 · E2 · E5 다시.

종합 메모: 첫째 수행에서 실패한 셋(E3 · E5 · E8)이 모두 통과했다. 같은 커밋에서 `apps/landing`의 unit 64 · ui 35 · integration 27과 typecheck, 루트 `pnpm test` · `build` · `lint` · `format:check`가 종료 0이었다. 수행 뒤 이 문서의 낡은 문장을 고쳤다(위 「정정 기록」의 셋째 줄).
