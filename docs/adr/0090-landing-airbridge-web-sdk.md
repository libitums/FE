# ADR-0090 — 랜딩 Airbridge Web SDK: 검색광고 클릭 → Play 설치를 귀속한다

- 상태: **제안 — 랜딩(`apps/landing`).** 앱 · 서버 변경 0. 구현과 자동 테스트는 끝났으나 **실제 Web SDK Token으로 대시보드 수신을 본 적이
  없고**(Vercel에 토큰이 아직 없다 — [e2e F](../e2e/airbridge-events.md#f--웹-랜딩--설치-귀속-adr-0090) AB-M1 미실행), 토큰 모양 규칙이
  추정이다(아래 「사용자 확인 필요」).
- 날짜: 2026-10-30.
- **사용자 결정**(2026-10-30): 귀속은 **Airbridge Web SDK**로 한다(`gtag.ts`의 EU 밖 `ad_storage`를 켜는 길은 범위 밖) · 결선은 **Android(Google Play)
  카드**만 · 데스크톱 · iOS 폴백은 **랜딩 URL**(지금 보는 페이지).
- 다루는 축: 랜딩 웹→앱 귀속 — 싣는 법 · 싣는 조건 · 토큰 · init 옵션 · 추적을 시작하는 지역 · Android 카드 결선 · `openDeeplink` 옵션 · 측정.
- 바꾸는 것: [ADR-0080](0080-airbridge-deeplink.md) 「다루지 않는 것」의 **웹 랜딩**을 연다 — D2 목적지 `duru://journey`의 둘째 소비자.
  [ADR-0043](0043-landing-static-site.md)의 적용 기록(페이지 스크립트가 셋 · 외부 호스트 예외 둘째).
- 다루지 않는 것: `gtag.ts`의 `ad_storage`(사용자 명시) · Google Ads 쪽 설정(최종 URL 접미사 · 자동 태그 · 맞춤 매개변수)과 Airbridge 대시보드 설정
  (Google Ads 연동 · PAW · 룩백) — 사용자 몫 · 앱(`apps/mobile` · 호스트) 변경 · 체험판 `/try/`(완료 화면에 스토어 링크가 없다) · `k-duru.com`의 Web to
  App Connect(App Link 검증) · 개인정보처리방침(Notion — 사용자 몫).

근거 표시: **[코드]** · **[조회]** 2026-10-30 Airbridge Web SDK 공식 문서 · **[추론]**.

## 맥락

1. 받기 섹션의 Android 카드는 `<a class="store" href={storeLinks.android} target="_blank" rel="noopener noreferrer" data-store="android">` 일반 링크다 [코드].
   검색광고를 눌러 랜딩에 온 사람이 이 카드로 설치하면 Airbridge에는 웹 쪽 클릭이 없어 **전부 unattributed**다. 사용자는 Google Ads 계정 수준
   최종 URL 접미사를 Airbridge 접미사 + `utm_source=google&utm_medium=cpc&utm_campaign={_c}&utm_content={_ag}&utm_term={keyword}`로 이미 정했다 —
   Web SDK의 `utmParsing`은 `utm_source`가 있어야 동작한다 [조회].
2. 랜딩은 Astro 정적 사이트다(ADR-0043). GA4는 `is:inline` 부트스트랩으로 싣고 측정 ID는 빌드 env `PUBLIC_GA_MEASUREMENT_ID`로 받으며 없으면 싣지
   않고 모양이 틀리면 빌드가 실패한다(ADR-0043 D10) [코드]. 「다른 호스트로 요청하지 않는다」(서체 자체 포함)는 원칙에 GA가 유일한 예외였다.
   `Analytics.astro`는 측정 ID가 비면 아무것도 그리지 않고, `astro.config.ts`가 env 검사를 빌드 때 한 번 한다 [코드].
3. GA 결선은 `scripts/analytics.ts`의 **document** click 리스너가 `link.dataset.store`로 `download_click { store }`를 보낸다 [코드].
4. Airbridge Web SDK [조회]: inline 로더 스니펫은 전역 `airbridge`가 이미 있으면 만들지 않고, 없으면 호출을 큐에 쌓는 스텁(`isSDKEnabled` false)을 두고
   `window` `load` 뒤 `static.airbridge.io`의 SDK를 끼운다. SDK가 뜨면 큐를 비우고 `isSDKEnabled`가 true. `init({ app, webToken, utmParsing, defaultChannel,
   autoStartTrackingEnabled, … })`. `openDeeplink({ type: "click", deeplinks: { android, ios, desktop }, fallbacks: { android, ios } })` — `deeplinks`는
   커스텀 스킴, `fallbacks.android`는 `"google-play"` 키워드 가능. **지역에 따라 추적을 끄는 기능은 없다.** npm 로더 `airbridge-web-sdk-loader`도 있다.
5. 앱 쪽 Airbridge는 App SDK Token으로 시작하고(ADR-0063), 딥링크 목적지는 `duru://journey` · `roleplay` · `settings` 셋이며 대시보드 앱은
   `duru.airbridge.io`(ADR-0080 D2 · D4) [코드]. Web SDK Token은 **같은 [Settings] › [Tokens] 화면의 다른 값**이다 [조회].

## 결정

### D1. GA와 같은 꼴로 싣는다 — `is:inline` 부트스트랩 + 조건부 모듈 스크립트 하나

- `components/Airbridge.astro`는 토큰이 있을 때 둘을 낸다: `<script is:inline>`(공식 로더 스니펫 원문 + `airbridge.init(<JSON>)`)과 Astro가 번들하는
  `<script>import "../scripts/airbridge-main"</script>`. 토큰이 비면 출력이 없다(`Analytics.astro`와 같다).
- 로더 스니펫 원문은 `analytics/airbridge-loader.ts`의 문자열 상수 하나다. **빌드 전용 순수**(`airbridge-bootstrap.ts` — 토큰 해석 · init 옵션 · 부트스트랩)와
  **브라우저 순수**(`airbridge.ts` — 딥링크 옵션 · 시간대 판정 · SDK 판정)를 파일로 가른다 — 모듈 스크립트가 `airbridge.ts`만 import해야 로더 스니펫
  (약 2.5 KB)이 번들에 들어가지 않는다. 트리셰이킹에 기대지 않고 빌드 테스트가 「모듈 스크립트에 `static.airbridge.io` 문자열 0」을 잰다.
- 예산: inline 부트스트랩 ≤ 6,000 bytes, Airbridge 모듈 스크립트 ≤ 4,000 bytes(압축 전 — 실측 891). 새로 나가는 외부 호스트는 로더 `static.airbridge.io`
  하나다. SDK가 뜬 뒤 SDK 자신이 내는 요청은 SDK 몫이다.
- 마크업은 바꾸지 않는다 — `Download.astro` 불변, 새 test-id 0. 클릭 대상은 속성 `a[data-store="android"]`로 찾는다.

### D2. 토큰은 `PUBLIC_AIRBRIDGE_WEB_TOKEN` — 없으면 싣지 않고, 모양이 틀리면 빌드가 실패한다

- `resolveAirbridgeWebToken(env)`: trim → `""`이면 `""`(미탑재) · `^[A-Za-z0-9._-]{16,}$`가 아니면 던진다. 메시지는 변수 이름과 규칙뿐이고 **값을 싣지 않는다**
  (`resolvePreregConfig` 선례 — GA의 `resolveMeasurementId`는 값을 싣지만 이 작업은 「실제 값을 어디에도 적지 않는다」는 제약대로 뺀다).
- `astro.config.ts`가 빌드 때 한 번 검사하고, 값은 `Landing.astro`가 `import.meta.env`로 읽는다(GA와 같은 자리 · 모양). `buildAirbridgeBootstrap`도 같은
  규칙으로 한 번 더 검사해 컴포넌트가 검사 없이 불러도 안전하다.
- **프로덕션에 값이 없어도 실패하지 않는다** — 토큰은 선택 값이다(`PUBLIC_SUPABASE_*`와 다르다). 요구사항의 「값이 없으면 싣지 않는다」를 그대로 따른다.
- 모양 규칙은 Airbridge 문서에 형식이 없어 이 저장소가 고른 것이다(App Name 규칙 선례) — 「사용자 확인 필요」.

### D3. 프로덕션(색인되는 페이지)의 `/` · `/ko/`에만 싣는다

- `Landing.astro`: `indexable ? resolveAirbridgeWebToken(import.meta.env.PUBLIC_AIRBRIDGE_WEB_TOKEN) : ""` → head의 `<Analytics>` 다음에
  `{airbridgeWebToken && <Airbridge webToken={…} />}`. GA와 같은 범위다 — 404 · 체험판 · 프리뷰에는 실리지 않는다.
- **이중 가드**(Landing의 조건부 렌더 + 컴포넌트의 빈 값 가드). 조건부 `<script>`가 어떤 이유로든 호이스트돼 새면 빌드 테스트(토큰 없는 빌드 전체에
  `airbridge` 문자열 0)가 잡는다.

### D4. init은 다섯 키로 닫히고, EU 시간대에서는 추적을 시작하지 않는다

- `{ app: "duru", webToken, utmParsing: true, defaultChannel: "k-duru.com", autoStartTrackingEnabled: false }`. `app` · `defaultChannel`은 `site.ts`의
  `airbridgeAppName` · `airbridgeDefaultChannel`이다(대시보드 App Name이 다르면 한 줄). 그 밖(`cookieWindow` 3일 · `shareCookieSubdomain` 등)은 SDK 기본값.
- 모듈 스크립트가 `startsTrackingIn(Intl.DateTimeFormat().resolvedOptions().timeZone)`이 참일 때만 `airbridge.startTracking()`을 부른다 —
  `Europe/*`와 EEA · EU 영토인데 IANA 구역이 `Europe/*`가 아닌 넷(`Atlantic/Reykjavik` · `Canary` · `Madeira` · `Faroe`)은 거짓, 그 밖(`undefined` · `""`
  포함)은 참. SDK가 아직 안 떴으면 스텁이 큐에 쌓아 뒀다가 뜬 뒤 실행한다(공식 스니펫의 동작 — 모듈 스크립트가 `load`보다 먼저 돌아도 된다).
- 이유: GA는 EU · EEA · 영국 · 스위스에서 동의 없이 저장을 막는다(ADR-0043 D10). Web SDK에는 지역 기능이 없으므로 **브라우저 시간대**를 지역의
  근사치로 쓴다(사용자 미확인 — 저장소 규칙의 기본값으로 진행).
- EU 시간대에서도 Android 카드 클릭은 **`openDeeplink` 그대로**다(추적만 시작하지 않는다). 클릭 자체가 SDK의 귀속 신호라 EU에서는 귀속이 되지
  않거나 약해진다 [추론]. 대안(EU에서는 결선도 하지 않아 일반 링크)은 기록만.

### D5. Android 카드 — SDK가 떠 있을 때만 `preventDefault` + `openDeeplink`, 폴백은 랜딩 URL

- `scripts/airbridge-cta.ts`의 `initAirbridgeCta({ root, sdkOf, deeplink })`: `a[data-store="android"]`마다 click 리스너. **클릭 때마다** `sdkOf()`로
  `window.airbridge`를 본다(SDK는 `load` 뒤에 뜨므로 결선 시점에 판정하면 늘 스텁이다). `airbridgeSdkOf`는 객체이고 `isSDKEnabled === true`이고
  `openDeeplink`가 함수일 때만 그 객체, 아니면 null(스텁 · undefined · 차단).
- SDK가 있으면 `event.preventDefault()` 뒤 `sdk.openDeeplink(옵션)`. 없으면 아무것도 하지 않아 `<a target="_blank">`가 Play로 그대로 간다 — 차단기 ·
  `load` 전 클릭 · 느린 네트워크 · JS 꺼짐 모두 일반 링크다. **그 설치는 귀속되지 않는다**(대가 2).
- 수정키(Ctrl · Cmd · Shift · Alt) · 보조 버튼 클릭은 가로채지 않는다 — 새 탭 · 새 창으로 열려는 의도는 브라우저에 맡긴다(접근성 점검 A2, 2026-10-30).
  Enter로 합성된 click은 `button 0` · 수정키 없음이라 가로채진다(의도대로 — 포커스는 링크에 남는다).
- `stopPropagation` · `stopImmediatePropagation`을 하지 않는다 — `scripts/analytics.ts`의 document 리스너가 같은 클릭으로 `download_click { store: "android" }`를
  보낸다. `preventDefault`는 GA에 영향이 없다.
- 옵션 `airbridgeDeeplinkOptionsOf({ origin, pathname })`: `{ type: "click", deeplinks: { android: "duru://journey", ios: "duru://journey", desktop: landing },
  fallbacks: { android: "google-play", ios: landing } }`, `landing = origin + pathname`(쿼리 · 조각 없음 — 지금 보는 `/` 또는 `/ko/`). 언어 · 사이트 주소를
  빌드 때 박지 않고 `location`에서 읽는다. `duru://journey`는 ADR-0080 D2의 목적지 셋 중 하나(앱이 여정 탭으로 연다). iOS 딥링크도 같은 값 — iOS 앱이
  없는 동안 SDK가 폴백(랜딩)으로 보낸다. `"google-play"` 키워드는 대시보드 앱의 스토어로 보낸다 [조회].
- **데스크톱 · iOS 폴백 = 랜딩 URL은 사용자 결정이다(2026-10-30).** 대안은 Play 웹 목록 주소(`storeLinks.android`)다 — 데스크톱에서 SDK가 켜져 있으면
  Play 카드가 **같은 페이지로 돌아온다**. 접근성 점검(2026-10-30) A1 Major가 이것을 짚었다: 접근성 이름 「Android Google Play Download」가 예고하는
  목적지와 실제 결과가 다르고(WCAG 2.4.4 Link Purpose), 같은 페이지가 다시 로드되면 포커스가 문서 처음으로 돌아가 사용자가 Download 섹션으로
  되돌아가야 한다(2.4.3 Focus Order · 3.2.2 On Input). 시각 사용자에게는 「아무 일도 안 일어났다」로 보인다 [추론 — SDK 런타임은 e2e가 스텁으로 막아
  실제 리다이렉트는 보지 못했다]. 결정은 바꾸지 않고 「재검토 조건」에 올린다 — 사용자가 Play 웹 주소로 바꾸면 `airbridgeDeeplinkOptionsOf`가 `page`와
  함께 Android 주소를 받게 계약을 한 줄 넓히면 되고, `Download.astro`는 그대로다.
- iOS 카드(`storeLinks.ios`가 비어 `<div>`) · 체험판 링크는 결선하지 않는다. `storeLinks.android`가 비면 결선 대상 0, 오류 없음.

### D6. 측정 — 새 GA 이벤트 0, 잼은 Airbridge의 Install 귀속

- GA 이벤트를 더하지 않고 커스텀 웹 이벤트도 보내지 않는다. 알고 싶은 것은 **설치가 Google Ads · 캠페인 · 광고그룹 · 키워드로 귀속되는가**이고 그것은
  Airbridge Real-time Logs · Actuals 리포트의 Install(앱 쪽 SDK 자동, ADR-0063)에서 본다 — 채널 `google.adwords`(연동) 또는 `k-duru.com`(`defaultChannel` —
  광고 아닌 직접 유입), 캠페인 · 광고그룹 · 키워드는 접미사의 `utm_campaign` · `utm_content` · `utm_term`을 `utmParsing`이 읽은 값. 보조 지표는 Install 중
  `unattributed` 비율(집행 전 100% 대비)과 Real-time Logs의 Web-to-App 클릭 수 · GA `download_click { store: "android" }` 수의 비교.
- `startTracking` 뒤 SDK 자동 이벤트(웹 열림 류)는 SDK 기본값 그대로다. 귀속 신호는 Android 카드의 `openDeeplink` 하나.
- **PII 금지**: `setUserID` · 이메일 · 전화 등 사용자 식별 API를 부르지 않는다. 속성은 utm 값뿐이다. 토큰은 공개 값이지만 로그 · 오류 · 문서에 실제 값을
  적지 않는다(테스트의 가짜 값 `e2e-test-web-token-0000000000`만).
- 자동 검증은 e2e(스텁에 넘어간 `init` · `openDeeplink` 인자 · `dataLayer`)까지다. 대시보드 수신 · EU 쿠키 · 폴백 체감은 수동(e2e F AB-M1 ~ M3).

## 버린 대안

- **npm `airbridge-web-sdk-loader`** — 번들에 로더가 들어가 토큰 없는 빌드에서도 문자열이 남고, 「외부 스크립트는 로더 하나」를 번들 크기로 치른다.
  정적 사이트라 `load` 뒤 SDK를 끼우는 공식 inline 방식이 그대로 맞는다(D1).
- **로더 스니펫을 Vite 번들에** — 같은 이유. inline에만 둔다(D1).
- **시간대 판정을 inline 스크립트 안에** — 판정이 문자열 안에 들어가 unit으로 잴 수 없다. 모듈 스크립트는 어차피 클릭 결선에 필요하다(D4).
- **국가 코드 조회** — 요청 하나 더 · 서비스 의존(D4).
- **EU · EEA · 영국 · 스위스 도시 목록으로 좁히기** — 목록 유지 비용. `Europe/*` 과다 차단을 받아들인다(D4 · 대가 3).
- **클릭 결선을 `scripts/analytics.ts`에 합치기** — GA 결선이 SDK 유무를 알게 되고 토큰 없는 빌드에 문자열이 남는다(D5).
- **`Download.astro`에 `data-airbridge` 속성 · 스크립트** — 마크업 불변 요구, `data-store`로 충분하다(D5).
- **데스크톱 폴백을 Play 웹 주소로** — 사용자 결정은 랜딩 URL. 기록만(D5 · 재검토 조건).
- **프로덕션에 토큰이 없으면 빌드 실패**(`PUBLIC_SUPABASE_*` 꼴) — 토큰은 선택 값. 광고 집행 전에는 없어도 된다(D2).
- **언어 · 사이트 주소를 빌드 때 모듈에 박기** — 페이지가 곧 그 언어의 랜딩이라 `location`이 입력 하나를 줄인다(D5).
- **gtag `ad_storage`를 EU 밖에서 켜기** — 사용자가 범위 밖으로 명시했다.

## 대가

1. **외부 호스트 예외가 둘이 됐다**(`googletagmanager.com` · `static.airbridge.io`). 토큰 있는 프로덕션에만 해당한다.
2. SDK가 안 뜬 채 누른 설치(차단기 · `load` 전 클릭 · JS 꺼짐)는 귀속되지 않는다. 그 비율은 알 수 없다 — GA `download_click`과 Web-to-App 클릭 수의
   차이로 어림한다.
3. 시간대는 지역의 근사치다 — VPN · 여행자는 틀리고, `Europe/Istanbul` · `Europe/Moscow` 등 EU 밖 유럽도 추적하지 않는다(과다 차단). 시간대를 모르는
   브라우저는 시작한다.
4. 데스크톱에서 SDK가 켜져 있으면 Play 카드가 같은 페이지로 돌아온다(D5 — 사용자 결정 · 접근성 A1).
5. `autoStartTrackingEnabled: false`인 동안 SDK가 쿠키 · 요청을 내지 않는다는 것은 [추론]이다 — AB-M2가 본다.
6. 페이지 스크립트가 셋(`main.ts` · `trial-main.ts` · 조건부 `airbridge-main.ts`)이다. SDK 자체는 루트 도메인 쿠키(기본 3일)를 쓴다 — 랜딩 코드가 읽거나
   쓰는 저장소는 0이지만 개인정보처리방침에 적을 것이 는다(사용자 몫).
7. 랜딩 e2e의 `analytics` 빌드에 가짜 토큰이 실려 GA e2e의 외부 호스트 단언이 「집합 = {gtm}」에서 「gtm 포함 · 모든 호스트 ∈ {gtm, static.airbridge.io}」로
   느슨해졌다(로더 요청이 `load` 뒤라 시점이 흔들린다).

## 재검토 조건

- **실제 Web SDK Token이 모양 규칙 `[A-Za-z0-9._-]{16,}`에 걸려 빌드가 실패하면** → `airbridge-bootstrap.ts`의 규칙을 넓힌다(값은 적지 않는다).
- **데스크톱 · iOS Safari에서 Play 카드가 같은 페이지로 돌아오는 것이 체감되면**(AB-M3) → `deeplinks.desktop` · `fallbacks.ios`를 Play 웹 목록 주소로
  (D5의 대안 — 2.4.4 · 2.4.3 근거). 또는 데스크톱을 결선 대상에서 뺀다.
- **iOS 앱이 출시되면** → `deeplinks.ios`가 실제로 앱을 열게 되고 `fallbacks.ios`는 App Store여야 한다(지금은 랜딩).
- **Airbridge Web SDK가 지역 · 동의 기능을 주면** → 시간대 판정(D4)을 그것으로 바꾼다.
- **Install 중 unattributed 비율이 집행 뒤에도 내려가지 않으면** → Google Ads 연동 · 접미사 · PAW(사용자 몫)부터 본다 — 웹 쪽은 Real-time Logs의
  Web-to-App 클릭 유무로 가른다.
- 대시보드 App Name이 `duru`가 아니면 → `site.ts`의 `airbridgeAppName` 한 줄.
- 체험판 완료 화면에 스토어 링크가 생기면 → 결선 범위(D5)를 다시 본다.

## 사용자 확인 필요

- **대시보드 수신**: 실제 토큰을 Vercel Production에 넣은 뒤 AB-M1(Android 실기 · 광고 테스트 링크 → Play 설치 → Real-time Logs Install의 채널 · 캠페인)을
  한 번도 돌리지 않았다. 이 ADR이 「채택」이 되는 조건이다.
- **토큰 모양 규칙**(D2)은 실제 값을 보지 못한 채 고른 추정이다. 걸리면 규칙만 고친다.
- **EU 시간대 미추적**(D4) · **프로덕션만**(D3) · **App Name `duru`**(D4) · **체험판 제외**는 저장소 규칙에서 끌어낸 기본값이다 — 사용자가 반대하면 그 항목만
  되돌린다.
