# ADR-0029 — 제품 이벤트를 PostHog로 보낸다 (Lynx 어댑터 · background 전용 경계 · 메모리 익명 ID · 번들 별칭)

- 상태: **제안** — 구현과 `pnpm verify` 안의 계층은 끝났다. ⚠ **기본값 여럿이 사용자가 자리에 없는
  동안 고른 것이다.** 그 목록이 아래 「사용자 확인 필요」 절이고, 확인되기 전까지 `채택`으로 올리지
  않는다.
- 날짜: 2026-09-29
- 다루는 축: **제품 분석 전송** (새 축 — 기존 ADR의 `다루는 축`이 덮지 않는다)
- 적용 기록(결정을 바꾸지 않는다):
  [ADR-0007](0007-app-internals-state-routing-data-errors.md) D2 — 분석 전송은 서버 상태가 아니라
  **나가기만 하는 전송**이라 D2의 「클라이언트 한 파일」 밖에 둔다(D4).
  [ADR-0013](0013-dependencies-and-version-notation.md) D5 — `dependencies` 두 개가 늘었다(D5).
  [ADR-0026](0026-permission-entry-conditions-and-denial-handling.md) D1 근거 ①의 *"네트워크 호출
  0건"* 이 더는 참이 아니다 — 음성 · 인식을 보내는 길은 여전히 없다(그 자리에 주석).

**왜 새 번호인가** — 없던 축을 처음 정한다(ADR-0010 D10). 그리고 이 회차의 계약은
`.agent-harness/`(추적 제외)에 있어 저장소에 남지 않는다 — 근거가 남을 자리가 여기다.
0027 · 0028은 다른 PR(전화번호 · 소셜 로그인)이 쓰고, 이 PR은 어느 쪽이 먼저 머지돼도 충돌하지
않게 그 다음 번호를 쓴다.

## 맥락

이벤트 sink 여섯(entry · messenger · visualNovel · phoneCall · notification · settings)은 화면마다
계약으로 고정돼 있었고, 제품 진입점 `app/index.tsx`가 **여섯 다 `null`** 을 넘겼다. 그래서 여러 스펙이
*"실제 집계는 0건"* 을 사실로 적고 있었다. 이 결정은 그 sink를 **PostHog**로 잇는다. 이벤트 이름과
payload는 바꾸지 않는다 — 새 이벤트도 없다.

사용자 결정(2026-09-29, 다시 묻지 않는다): **US Cloud**(`https://us.i.posthog.com`) · **익명 ID를
영속하지 않는다**(로그인 없이는 앱을 쓸 수 없어 익명 구간이 온보딩 · 로그인뿐이다) · **main에서 독립
머지** · **`@posthog/core`를 Lynx 어댑터로 감싼다**.

이 저장소의 사실(2026-09-29 실측).

1. `posthog-js` · `posthog-react-native`는 DOM · React Native 전역에 기댄다. `@posthog/core`의
   `PostHogCore`는 추상 메서드 여섯(`fetch` · 라이브러리 ID · 버전 · UA · 영속 속성 get/set)만 채우면
   선다. 생성자는 네트워크를 부르지 않는다. 자동 캡처 · 세션 리플레이는 이 패키지에 **없다**.
2. Lynx background 런타임에는 **전역 `fetch`가 없고 `lynx.fetch`만 있다**(ADR-0017 D1 기록과 같다).
   `AbortController` · `Headers` · `Request` · `Response`는 코어 JS가 전역에 심는다.
3. **사용자 JS가 들을 수 있는 앱 생명주기 신호가 없다.** 네이티브가 background 진입을 코어에 알리지만
   받는 쪽은 빈 메서드이고 ReactLynx · `@lynx-js/types`에 노출이 0건이다.
4. 기존 sink 규약 — *"no-op 함수나 메모리 배열로 수집 완료를 가장하지 않는다"*
   (`messenger.contract.ts` · `phone-call.contract.ts`의 sink 주석).
5. `@posthog/core`의 index는 로그 · 메트릭 · 트레이스 · 설문 모듈까지 끌어온다. 패키지에
   `sideEffects` 표기가 없고, exports에 `PostHogCore`만 가리키는 subpath가 없다.

## 결정

### D1. 모듈은 셋이고, SDK를 값으로 import하는 자리는 하나다

| 파일 | 성질 | 하는 것 |
|---|---|---|
| `lib/analytics-config.ts` | 순수 | `PUBLIC_POSTHOG_KEY` → 설정 또는 `null`, `PUBLIC_ANALYTICS_ENVIRONMENT` → 환경(D13) |
| `lib/analytics-events.ts` | 순수 · SDK import 0 | 이벤트 → `capture(name, properties)` 매핑, sink 여섯 결선 |
| `lib/posthog-client.ts` | **첫 줄 `import "background-only"`** | `PostHogCore` 하위 클래스 · 전송 해석 · 세션 생성 |

타입 계약은 `lib/analytics.contract.ts`다. 이벤트 이름 · properties는 **그 파일과 화면 계약 여섯이
정본**이고 사람이 읽는 카탈로그는 GitHub wiki 「[이벤트 사전](https://github.com/libitums/FE/wiki/Analytics-Events)」 페이지에 있다.
화면 계약에 이벤트가 늘거나 줄면 계약 파일의 컴파일 검사가 서고, **같은 PR에서** wiki 카탈로그를 고친다.

### D2. 키가 없으면 sink는 `null`이다 — no-op이 아니다

- 키는 빌드 환경 변수 `PUBLIC_POSTHOG_KEY`(`apps/mobile/.env.local`)다. 앞뒤 공백을 걷고
  **`phc_`로 시작하는 프로젝트 키만** 받는다. 비었거나 `phx_`(개인 API 키) 등이면 설정이 `null`이다.
- 설정이나 전송 수단 중 하나라도 `null`이면 **클라이언트를 만들지 않고 sink 여섯이 `null`** 이다.
  요청은 0건이다. 호출 지점의 `sink?.(event)`가 이미 「보내지 않음」을 뜻한다 — 맥락 4의 규약 그대로.

### D3. SDK는 background 스레드 전용이다 — **빌드가** 막는다

`posthog-client.ts` 첫 줄이 `import "background-only"`이고, 유일한 호출 지점은 진입점의

```ts
const analytics = __BACKGROUND__ ? productAnalyticsSession() : noAnalyticsSession;
```

이다. 메인 스레드 그래프가 그 모듈에 닿으면 ReactLynx 플러그인이 **빌드 오류**를 낸다
(`'background-only' cannot be imported from a main-thread module.`) — 게이트를 뺀 탐침에서 실패를
확인했다. 그래서 `pnpm build`(`verify` 안)가 이 경계를 기계적으로 지킨다. 두 스레드의 첫 렌더가
서로 다른 sink를 받지만 sink는 그려지는 속성이 아니고 이벤트 핸들러(background)에서만 불린다.

함수 지시어(`'background only'`)는 쓰지 않는다 — import가 남아 SDK를 메인 번들로 끌어들인다.

### D4. 전송은 서버 상태 클라이언트(`api-client.ts`, PR #149에서 생긴다)를 거치지 않는다

분석 전송은 받아 와 보여 줄 서버 상태가 없다 — **나가기만 한다.** ADR-0007 D2의 「클라이언트 한
파일」은 서버 상태의 무효화를 한 곳에 모으려는 규칙이라 이 전송은 그 밖이다. 대신 D2가 요구한
「Lynx `fetch`의 차이를 한 곳에서 흡수」는 `posthog-client.ts`의 어댑터가 진다.

### D5. 의존 둘 — `@posthog/core` `1.55.2` · `background-only` `0.0.1`

둘 다 `dependencies`다(ADR-0013 D3의 번들 판별). 후자는 원래 전이 의존으로만 있었는데, 직접
의존이 아니면 **vitest가 D3의 모듈을 import하지 못한다**(`Failed to resolve import`).

### D6. 번들은 별칭으로 줄이고, 상한을 올린다

`lynx.config.ts`의 `resolve.alias`에 `"@posthog/core$"` → `node_modules/@posthog/core/dist/posthog-core.mjs`.

| 구성 | `main.lynx.bundle` bytes | main 대비 |
|---|---:|---:|
| main `8470d5c` | 1,128,358 | — |
| 탐침 · index import | 1,364,039 | +235,681 |
| 탐침 · rspack 규칙 `sideEffects: false` | 1,364,039 | +235,681 (효과 0) |
| **구현 · 별칭** | **1,198,319** | **+69,961** |

상한은 `1,171,000` → **`1,259,000`**(= ⌈1,198,319 × 1.05 / 1000⌉ × 1000,
`devtools/bundle-size/budget.json`). **별칭이 빠지면 약 1,364,000이 나와 상한을 넘으므로
`size:check`가 별칭 누락을 잡는다.** 메인 스레드 구간에서 `PostHog` · `/batch/` · `phc_` 문자열은 0건이다.

### D7. 이벤트마다 곧장 보낸다 — `flushAt: 1` · background flush 없음

- `flushAt: 1` · `flushInterval: 10000`. 재시도는 SDK 기본(3회 · 3초), 요청 제한 10초.
- **background 전환 flush는 하지 않는다 — 할 수 없다**(맥락 3). 한 건씩 보내 전송 중에 잃는 창을
  이벤트 1건 · 요청 1회로 좁힌다. 사람의 탭 간격이라 요청 수 부담이 작다. 보내지 못한 이벤트는
  D12의 대기열이 맡는다.

### D8. 식별 — 실행마다 새 익명 ID, 영속하지 않는다

- 익명 `distinct_id`는 SDK가 만드는 `uuidv7`이고 **메모리 `Map`에만** 산다. 세션 ID도 같다.
  저장소에 쓰는 분석 값은 D12의 대기열 하나뿐이다. 대기열 안 이벤트에는 그 실행의 `distinct_id`가
  들어 있지만, 다음 실행은 그것을 자기 ID로 쓰지 않는다.
- `personProfiles: "identified_only"` — 익명 이벤트는 person profile을 만들지 않는다.
- `identify(userId)`는 세션 객체에 **자리만** 있고 부르는 곳이 없다. 로그인 사용자 ID가 main에
  생기면(전화번호 · 소셜 로그인 PR 뒤) 거기서 부른다.
- ⟨2026-09-29 — **이제 부른다**⟩ 로그인(소셜 · 전화번호 코드 검증)과 부팅 때의 세션 갱신이
  성공하면 진입 결선(`app/entry-wiring.ts`)이 세션을 저장한 직후 `identify`를 한 번 부른다.
  - 사용자 ID는 **액세스 토큰(JWT)의 `sub`** 다(`lib/auth-user-id.ts`). 저장하는 세션에는 사용자
    ID가 없고(ADR-0007 D1) 늘리지 않는다. 서명은 검증하지 않는다 — 접근 판정에 쓰지 않는 값이고
    토큰은 방금 서버가 준 것이다. `sub`를 못 읽으면 식별하지 않는다.
  - 식별 뒤의 이벤트는 `distinct_id`가 사용자 ID이고 person profile을 만든다. 같은 실행의 식별
    전 이벤트(온보딩 · 로그인 화면)는 SDK의 `$identify`가 그 사용자에게 잇는다.
  - **세션 갱신으로 부팅한 실행은 갱신 응답이 오기 전까지 익명이다.** 스플래시는 이벤트를 내지
    않아 그 사이에 나가는 이벤트는 없다.
  - 식별이 던져도 로그인은 막히지 않는다(D11).
  - 로그아웃이 아직 없어 `reset`을 부르는 자리가 없다. 로그아웃이 생기면 거기서 익명으로 되돌린다.
  - 검증: unit `auth-user-id`(UI1–UI3) · integration `App.entry` ID1–ID5 · `App.analytics`
    IA-ID1–IA-ID2.

### D9. 끄는 것

feature flag(`preloadFeatureFlags: false` · `disableRemoteFeatureFlags: true` ·
`sendFeatureFlagEvent: false`) · 설문(`disableSurveys: true`) · 압축(`disableCompression: true`) ·
**GeoIP(`disableGeoip: true`)**. 그래서 나가는 요청은 **`POST /batch/` 하나뿐**이다. 압축은 Lynx에
`CompressionStream`이 없어 원래 꺼지지만, vitest(Node)에는 있어 테스트에서만 본문이 gzip이 되므로
옵션으로 끈다. SDK가 붙이는 자동 속성은 `$lib` · `$lib_version` · `$session_id` ·
`$process_person_profile` · `$is_identified` · `$geoip_disable` 여섯뿐이다 — 기기 모델 · OS 버전은
없다. 앱이 모든 이벤트에 더하는 속성은 `environment` 하나다(D13).
⟨2026-09-30 — **GeoIP는 켰다**(D15). `disableGeoip: false`이고 `$geoip_disable`는 더는 붙지 않는다⟩

### D10. 전송 해석 — `globalThis.fetch` → 맨 식별자 `lynx.fetch` → `null`, 호출마다

- 호출마다 해석하고 `signal`은 넘기지 않는다(`@lynx-js/types`의 `RequestInit`에 없다).
- **`lynx`는 `globalThis.lynx`가 아니라 맨 식별자로 읽는다.** ⚠ **처음 구현은 `globalThis.lynx`를
  읽었고 기기에서 요청이 0건이었다.** iOS 시뮬레이터(Debug 호스트, 2026-09-29) 관찰 —
  background 런타임에서 `globalThis.fetch` · `globalThis.lynx`가 **둘 다 `undefined`** 이고 맨
  `lynx.fetch`만 함수다. Lynx는 `lynx`를 카드 모듈 범위에 주입할 뿐 `globalThis`에 두지 않는다.
  전송 해석이 늘 `null`을 돌려 sink가 전부 `null`이 됐다. 맨 식별자로 고쳤고(PR #149의 `api-client.ts`
  `resolveTransport`와 같은 방식 — main에는 아직 없다), 같은 관찰 빌드에서 `/batch/` 두 건이 도착했다
  ([분석 e2e](../e2e/analytics.md) 「실행 기록」).
- **vitest는 이 차이를 동작으로 볼 수 없다.** 테스트 환경에서는 `globalThis.lynx`와 맨 `lynx`가 같은
  객체라 unit · integration이 처음 구현에서도 통과했다. 되돌림은 원문 검사 unit(PC13 —
  주석을 뺀 `posthog-client.ts`에 `globalThis … lynx`가 없고 `typeof lynx` 판정이 있다)이 막고,
  실제 전송은 기기 e2e만 잰다.

### D11. 실패는 화면에 닿지 않는다

sink는 던지지 않는다 — 매핑 · `capture`를 `try`로 감싸 삼킨다. 전송 실패는 SDK가 재시도 뒤 삼키고
`console.error` 한 줄을 남긴다. 오류 경계로 올라가는 길이 없다.

### D12. 보내지 못한 이벤트 — 대기열을 저장하고, 스스로 다시 보낸다

2026-09-29 사용자 결정(「다 진행」)으로 더했다. SDK는 네트워크 오류면 이벤트를 메모리 대기열에
남기지만, 앱이 꺼지면 잃고 연결이 돌아와도 **다음 이벤트가 생겨야** 보낸다. 둘을 메운다.

- **보존** — SDK 영속 속성 중 `queue` 하나만 `StorageModule`의 `analytics.queue` 키에 따라 쓴다
  (쓸 때마다 JSON 전체, 비면 지운다). 클라이언트가 만들어질 때 남은 대기열을 올리고 곧바로 보낸다.
  깨진 값은 버린다. `maxQueueSize: 200`으로 저장 크기를 묶는다(SDK 기본 1,000).
- **재시도** — SDK가 `error`를 내고 대기열이 남아 있으면 15초 · 30초 · 1분 · 2분 · 5분 뒤 차례로
  `flush()`한다. 성공(`flush` 이벤트)하면 처음 간격부터 다시 센다. **다섯 번을 다 쓰면 멈춘다** —
  끝없는 타이머를 두지 않는다. 남은 대기열은 다음 이벤트나 다음 실행이 보낸다.
- 서버가 거절한 이벤트(네트워크 오류가 아닌 HTTP 오류)는 SDK가 대기열에서 이미 뺐다 — 다시 보내지
  않는다.
- **Lynx `fetch`는 연결 실패를 거부하지 않는다.** iOS 시뮬레이터(2026-09-29)에서 닫힌 포트로 보내면
  status **499** 응답이 돌아왔고, SDK는 이것을 HTTP 오류로 보고 이벤트를 버렸다 — 대기열 · SDK 재시도가
  기기에서는 한 번도 돌지 않았던 것이다. 어댑터가 status 0 · 499를 거부로 바꿔 네트워크 실패로 다룬다
  (unit PC19). PostHog 서버는 이 둘을 돌려주지 않는다.
- 기기 확인(같은 날, 전송 대상만 로컬 서버로 바꾼 임시 번들): 서버를 끈 채 낸 이벤트가 서버를 켜자
  새 조작 없이 재시도로 도착했고, 끈 채로 앱을 종료했다가 다시 켜자 1초 안에 원래 `distinct_id`로
  도착했다.
- 검증: unit PC14(대기열에 남았다가 다음 이벤트와 함께) · PC15(새 이벤트 없이 15초 뒤) · PC16(다섯 번
  뒤 멈춤 · 타이머 0) · PC17(저장 · 보낸 뒤 지움) · PC18(다음 실행이 곧바로 보냄 · 깨진 값) · PC19(499 · 0).
- 이 결정은 ADR-0007 D1(저장소에는 로그인 토큰만)의 **예외 하나**다. 대기열은 서버 응답도 화면
  상태도 아니고, 보내고 나면 지워져 무효화를 사람이 맡지 않는다.

### D13. 개발 · 운영은 프로젝트가 아니라 `environment` 속성으로 가른다

2026-09-29 사용자 결정. PostHog 무료 요금제는 **프로젝트가 하나**라 개발용 프로젝트를 따로 둘 수
없다. 그래서 한 프로젝트에 모으고 이벤트마다 표시를 붙인다.

- 빌드 환경 변수 `PUBLIC_ANALYTICS_ENVIRONMENT`가 **정확히 `production`일 때만** `production`이고,
  없거나 다른 값이면 전부 `development`다. 표시를 빠뜨린 빌드가 운영 수치에 섞이지 않는 쪽이 기본이다.
- 값은 클라이언트가 만들어질 때 SDK의 공통 속성으로 한 번 등록한다(`register`). 화면 계약의 이벤트
  모양과 `capture` 매핑은 바꾸지 않는다. 되살린 대기열(D12)의 이벤트는 만들어질 때의 값을 갖는다.
- **빌드 모드(`rspeedy dev` · `build`)로 가르지 않는다.** `pnpm bundle:host`가 운영 모드 빌드라,
  시뮬레이터 확인용 이벤트가 `production`으로 찍힌다.
- `production`은 **배포 번들을 만드는 곳의 `.env.local`에만** 둔다. 개발자 기기에는 두지 않는다.
- PostHog에서는 프로젝트 설정의 내부 · 테스트 사용자 필터에 `environment = production`을 걸고,
  대시보드의 인사이트는 그 필터를 켠다. 이 결정 전에 들어간 이벤트는 속성이 없어 함께 빠진다.
- 검증: unit AC5(판정) · AC6(환경 변수) · PC20(이벤트에 붙음).

### D14. 서사 표지 · 서사 이벤트 다섯이 일곱 번째 sink로 붙는다

2026-09-29. 이 ADR은 「새 이벤트는 없다」로 시작했다(맥락). 표지를 건너뛰는지 볼 이벤트가 없어
다섯을 더했다 — `episode_intro_viewed` · `episode_intro_skipped` · `episode_intro_continued` ·
`episode_intro_exited` · `episode_prologue_completed`. 정본은
`screens/episode-intro/episode-intro.contract.ts`의 `EpisodeIntroEvent`다.

- sink는 **일곱**(`episodeIntroEventSink`), 이벤트 이름은 **23개**다. 이 문서의 「여섯」 · 「18개」는
  그때의 수다.
- 매핑 · 전송 · 대기열 · `environment`(D13)는 바꾸지 않았다 — 같은 sink 함수를 하나 더 내준다.
- 표지는 앱을 켤 때마다 다시 선다(본 에피소드를 영속하지 않는다). 건너뛰기 비율은 첫 조회와
  재조회가 섞인 값이다.
- ⟨2026-09-29 — 표지가 맵의 첫 유닛이 되면서(#153) 「표지 뒤에 열 유닛」이 없어졌다.
  `episode_intro_viewed`의 `targetKind`를 뺐다. 운영 이벤트가 들어오기 전이라 지난 데이터와
  어긋나는 것은 없다. 끝낸 표지를 맵에서 다시 열어도 `episode_intro_viewed`가 난다⟩

### D15. 나라 · 주 · 시간대만 IP로 추정하고, IP는 저장하지 않는다

2026-09-30 사용자 결정. 접속하는 나라를 보고, 나중에 서버 리전을 고를 근거로 삼는다.

- 앱은 `disableGeoip: false`다 — 이벤트에 `$geoip_disable`를 붙이지 않는다. 앱이 보내는 속성은
  그대로이고, 위치는 **PostHog 서버의 GeoIP 변환**이 요청 IP로 붙인다.
- **남기는 것**: 나라 · 대륙 · 1단계 행정구역(주 · 지방) · 시간대(`$geoip_country_*` ·
  `$geoip_continent_*` · `$geoip_subdivision_1_*` · `$geoip_time_zone`). 리전은 대륙 · 권역 단위라
  나라로 충분하고, 한 나라에 리전이 여럿인 곳(미국 동 · 서부)은 주로 가른다.
- **남기지 않는 것**: 도시 · 우편번호 · 위도 · 경도 · 정확도 반경 · 2단계 행정구역. 프로젝트의 GeoIP
  변환 코드를 고쳐 이 값을 쓰지 않게 했다(PostHog Data pipelines → Transformations → GeoIP,
  2026-09-30 v2). 기본 템플릿을 다시 적용하면 되살아나므로 템플릿으로 되돌리지 않는다.
- **IP는 저장하지 않는다** — 프로젝트 설정 Discard client IP data(`anonymize_ips: true`). GeoIP
  변환은 IP를 버리기 전에 돈다.
- 리전 판단은 위치보다 **실제 응답 시간**이 정확하다. 필요해지면 로그인 요청의 소요 시간을
  이벤트로 남긴다.
- 개인정보처리방침 · App Store 개인정보 라벨(Coarse Location · Analytics)에 적는다.

## 사용자 확인 필요

⚠ 아래는 사용자가 자리에 없는 동안 고른 기본값이다. 확인되기 전까지 이 ADR은 `제안`이다.

1. ⚠ **`flushAt: 1` · background flush 없음**(D7) — 요구사항의 기본값(SDK 배치 + background flush)을
   바꿨다.
2. ⚠ **번들 상한 1,171,000 → 1,259,000**(D6).
3. ~~⚠ **GeoIP를 끈 채 시작**(D9)~~ 2026-09-30 켰다 — 나라 · 주 · 시간대만 남기고 IP는 저장하지 않는다(D15).
4. ⚠ **약관 문구와 충돌할 수 있다.** 「개인정보 보호 및 약관」 화면(`screens/terms/terms-sections.ts`)이
   *"수집한 정보는 학습자에게 맞는 콘텐츠를 보여 주는 데만 사용한다"* 고 적는다. 제품 사용 이벤트를
   외부 분석 서비스(PostHog)로 보내는 것이 이 문장과 맞는지 확인하지 않았다. 문구를 고칠지는 이
   ADR이 정하지 않는다.
5. ~~PostHog 프로젝트 키를 아직 받지 않았다.~~ 2026-09-29 받았다 — 시뮬레이터에서 실제 수신을
   확인했다([분석 e2e](../e2e/analytics.md) 실행 기록). 키는 저장소에 없다(`apps/mobile/.env.local`).
6. ⚠ **이 PR만 main에 머지된 동안 앱 실행마다 새 사용자로 집계된다**(D8) — 사용자 수 · 리텐션 ·
   코호트는 `identify`가 불리기 전까지 읽지 않는다.

## 버린 대안

| 대안 | 버린 이유 |
|---|---|
| `posthog-js` | DOM · `window` · `localStorage`에 기댄다. 자동 캡처 · 리플레이는 Lynx에서 성립하지 않는다 |
| `posthog-react-native` | React Native 전역 · AsyncStorage에 기댄다. Lynx는 React Native가 아니다 |
| SDK 기본 배치(20건 · 10초) | 들을 생명주기 신호가 없고 큐가 메모리뿐이라 모아 둔 만큼 잃는다(D7) |
| rspack 규칙 `sideEffects: false` | 설정에 들어간 것을 확인했는데 바이트가 같았다 — 효과 0(D6) |
| 키 없을 때 no-op sink | 기존 sink 규약이 금지한다. `null`이 「보내지 않음」을 타입으로 드러낸다(D2) |
| 익명 ID 영속(`StorageModule`) | 사용자 결정. 익명 구간이 온보딩 · 로그인뿐이고 저장소에는 로그인 토큰만 둔다(D8) |
| 함수 지시어 `'background only'` | import가 남아 SDK가 메인 번들에 들어간다(D3) |

## 대가

1. **실행마다 새 사용자** — 사용자 수 · 리텐션 · 코호트를 읽지 않는다. `identify`가 불리기 전까지.
   ⟨2026-09-29 — 로그인한 사용자는 식별된다(D8). **로그인하지 않고 떠난 실행은 여전히 실행마다 새
   익명 사용자**라, 가입 퍼널(Q1)의 앞 단계는 계속 「실행 횟수」로 읽는다⟩
2. **background 전환 flush 없음** — 전송 **중인** 이벤트는 앱이 죽으면 잃을 수 있다(대기열 저장은
   전송이 끝난 뒤 지우므로 대개 다음 실행이 다시 보낸다 — 이때 PostHog에 두 번 들어갈 수 있다).
3. **오프라인 재시도는 다섯 번(합 약 8분)으로 끝난다**(D12) — 그 뒤는 다음 이벤트나 다음 실행을
   기다린다. 대기열이 200건을 넘으면 가장 오래된 것부터 버린다.
4. **기기 · OS 속성 없음** — 플랫폼 비교를 못 한다. ⟨2026-09-30 — 위치는 나라 · 주 단위로 있다(D15). 도시 단위는 없다⟩
5. **옵트아웃 수단 없음** — 설정에 수집 끄기가 없다. 필요해지면 `optOut()` 자리를 새 결정으로 연다.
6. **화면 조회 · 앱 시작 이벤트 없음** — 퍼널의 분모가 진입 이벤트 · 유닛 열림에 한정된다.
7. **전송 실패는 `console.error` 한 줄로만 남는다** — 화면에 드러나지 않는다(의도).
8. **전송 해석은 vitest가 동작으로 지키지 못한다**(D10) — 맨 식별자를 `globalThis.lynx`로 되돌리면
   원문 검사(PC13)만 잡는다. 형태가 다른 되돌림(다른 전역 이름 등)은 기기 e2e만 잡는다.

9. **배포 빌드가 `PUBLIC_ANALYTICS_ENVIRONMENT=production`을 빠뜨리면 운영 이벤트가
   `development`로 찍힌다**(D13) — 대시보드가 비어 보이는 것으로 드러난다. 이미 들어간 이벤트의
   값은 고칠 수 없다.
10. **개발 이벤트도 무료 한도(월 이벤트 수)를 쓴다**(D13) — 같은 프로젝트에 쌓인다.

## 재검토 조건

- **전화번호 · 소셜 로그인 PR이 머지돼 사용자 ID가 생긴 때** → D8. `identify`를 부른다. 그때
  `api-client.ts`의 `resolveTransport`와 이 파일의 전송 해석이 **두 벌**이 되므로 합칠지 함께 본다.
  ⟨2026-09-29 — 전화번호 로그인(#149)이 main에 들어와 전송 해석이 실제로 두 벌이 됐다. 이 PR은
  main을 합치기만 하고 둘을 그대로 둔다 — 합치기는 `identify`를 잇는 변경에서 본다⟩
  ⟨2026-09-29 같은 날 뒤 — `identify`를 이으며 봤고 **합치지 않는다.** 둘은 돌려주는 모양이
  다르다(`api-client`는 본문 문자열과 제한 시간 경주, 분석은 SDK가 읽는 응답 객체). 해석 규칙
  (`globalThis.fetch` → 맨 식별자 `lynx.fetch`)만 같고, 그 규칙은 각 파일의 unit이 지킨다⟩
- **호스트가 생명주기 전역 이벤트를 보내게 된 때** → D7. background flush를 연다.
- **`@posthog/core` 버전을 올릴 때** → D6. 별칭 경로가 그대로인지, 번들을 다시 잰다.
- **PostHog 프로젝트를 둘 이상 쓸 수 있게 된 때**(요금제 변경) → D13. 개발 프로젝트를 나눌지 본다.
- **월 이벤트가 PostHog 무료 한도(프로젝트 요금제 기준)에 닿을 때** → 샘플링을 정한다.
- **사용자 확인 필요의 여섯 항목이 답을 받은 때** → 제자리에서 고치고 `채택`으로 올린다.
