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
- ⟨2026-10-13 — 적용 기록이고 결정을 바꾸지 않는다⟩ **sink가 `null`이 아닌 조건이 「PostHog 클라이언트가 있다」에서
  「보낼 곳이 하나라도 있다」로 넓어졌다.** 진입점이 이 ADR의 세션이 낸 sink 일곱을 Airbridge tracker와 한 번 합친다
  (`productEventSinks` — [ADR-0063](0063-airbridge-events.md) D9. 같은 날 처음 넓힌 것은 Meta 앱 이벤트 로거였고
  [ADR-0057](0057-meta-app-events.md) D8, 대체됨). 호스트에 `AirbridgeEventsModule`이 등록된 빌드에서는
  `entryEventSink` · `messengerEventSink` · `visualNovelEventSink` 셋이 **PostHog 키가 없어도 함수다** — 원래 sink가
  `null`이면 PostHog 쪽은 건너뛰고 Airbridge 쪽만 부른다. 나머지 넷과, 모듈이 없는 빌드의 일곱은 이 절 그대로다.
  PostHog로 나가는 것은 달라지지 않았다 — 이벤트 이름 · 속성 · `capture` 매핑 · 「PostHog 요청 0건」의 조건은 그대로이고,
  두 전송은 서로의 예외를 막지 않는다(D11과 같은 방향). 「no-op으로 가장하지 않는다」도 그대로다 — 보낼 곳이 하나도
  없으면 여전히 `null`이다.

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
    ⟨2026-09-30 — **이제 부른다**⟩ 로그아웃 · 계정 삭제의 뒤처리(`app/account-wiring.ts`)가 세션을 지운 직후
    `reset`을 부른다([ADR-0032](0032-account-sign-out-and-deletion.md) D7). 범위는 둘 — 로그아웃 `identity`,
    삭제 `identity-and-queue`(아래 D12의 대기열까지 버린다). 순서는 대기열 버리기 → `reset()` →
    `register({ environment })` 다시 걸기다 — `@posthog/core@1.55.2`의 `reset`이 등록 속성을 지워 D13의
    `environment`가 빠지기 때문이다. 그 뒤 이벤트는 새 익명 ID이고 식별 전까지 person을 만들지 않는다.
    이를 위해 **진입점의 세션 모양이 `{ sinks, identify }`에서 `{ sinks, user }`로 바뀌었다** — `user`는
    `identify`와 `reset`을 함께 지고(`lib/analytics-user.contract.ts`), 클라이언트가 없으면 `null`이다. App prop도
    `analyticsIdentify`에서 `analyticsUser`로 같은 자리에서 바뀌었다. reset이 던져도 뒤처리는 계속된다(D11).
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
- ⟨2026-09-30⟩ **보내지 않고 버리는 때가 하나 생겼다 — 계정 삭제.** 떠난 사용자의 ID가 실린 대기열이
  다음 실행에 나가지 않게 `LynxPostHogClient.discardQueue()`가 재시도 타이머를 멈추고 메모리 대기열과
  `analytics.queue` 키를 지운다. 로그아웃은 버리지 않는다 — 이미 쌓인 이벤트는 그 사용자가 실제로 낸 것이다.
  키를 만지는 자리는 여전히 이 모듈 하나다(D3 — 결선이 키를 직접 지우지 않는다). [ADR-0032](0032-account-sign-out-and-deletion.md) D7.

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
- ⟨2026-10-12 — 3b-2 카탈로그 에피소드. 적용 기록이고 결정을 바꾸지 않는다⟩ **sink는 일곱 그대로이고 이벤트
  이름은 30개다**(`lib/analytics.contract.ts`의 `AnalyticsEventName` — 위 「23개」 뒤에 설문 둘과 아래 하나가
  더해졌다). 매핑 · 전송 · 대기열 · `environment`는 그대로다.
  - **카탈로그 표지는 기존 이름을 쓴다** — 컷 화면을 쌓기 직전 `episode_intro_viewed`, 나가기 · 시스템 뒤로
    `episode_intro_exited`(`stage: "prologue"`), 마지막 컷의 `Continue` `episode_prologue_completed`. 튜토리얼과는
    `episodeId`로 갈린다(`tutorial` vs `u01-water` …). 완료의 `prologueKind`에 값 **`"cuts"`**가 하나 늘었다
    (`EpisodePrologue["kind"] | "cuts"`). 컷 화면에는 `Skip`이 없어 `episode_intro_skipped` · `continued`는 나지 않는다.
    ⟨2026-10-14⟩ **이 마지막 문장은 3b-2 ~ 3d-2 빌드의 것이다** — 표지 유닛이 컷 앞에 표지 화면(`Skip` · `Next`)을 세우게 되어 이제 둘 다 난다.
    발생 시점은 아래 ⟨2026-10-14⟩ 기록이 진다.
  - **새 이름 `episode_content_refreshed`** — 에피소드 콘텐츠 갱신([ADR-0056](0056-episode-content-delivery.md))이
    끝났고 **매니페스트를 받았을 때만**(`manifest ≠ unavailable`), 그중 `unchanged`이면서 받은 · 잠근 · 실패한 ·
    지운 것이 모두 없는 실행은 빼고, 실행마다 최대 1회. 속성은 `manifest`(`updated` | `unchanged` | `invalid`) ·
    `fetchedCount` · `lockedCount` · `failedCount`(10진 문자열) · `lockReasons` · `failReasons`(중복 제거 · 사전순 ·
    `,` 연결, 없으면 `""`) · `persisted`. 같은 `episodeIntroEventSink`로 보낸다 — 새 sink를 만들면 sink 목록을
    펼치는 기존 테스트와 계약 다섯 곳이 행동 변화 없이 바뀐다. 정본은 `episode-intro.contract.ts`의
    `EpisodeIntroEvent`다.
  - **한계** — 매니페스트에 닿지 못한 실행(오프라인 · 404 · 설정 없음)은 세지 않는다. 404 실행에서 이벤트를 내면
    sink 호출을 정확한 목록으로 단언하는 기존 integration 테스트가 비동기 경쟁으로 깨지고, 버킷이 없던 동안은
    정보도 없었다. 그래서 「매니페스트 자체가 닿지 않는 비율」은 이 이벤트로 잴 수 없다.
  - 묻는 질문: 「튜토리얼 뒤 실제 에피소드로 넘어가는가」 = `episode_intro_viewed`(`episodeId ≠ tutorial`) 사용자 수와 그중
    `episode_prologue_completed`(`prologueKind = cuts`)까지 간 사용자 수. 「서버 에피소드가 기기에 닿는가」 =
    `episode_content_refreshed`의 `fetchedCount > 0` 비율과 `failReasons` · `lockReasons` 분포. 대시보드에 인사이트를
    더하는 것은 이 회차 범위 밖이다.
  - ⚠ sink 이름(`episodeIntroEventSink`)이 이제 갱신 이벤트까지 진다 — 이름과 책임이 어긋난다. sink를 나누는 날
    `contentEventSink`로 가른다.
- ⟨2026-10-13 — 3c 카탈로그 레슨 · 최종 테스트. 적용 기록이고 결정을 바꾸지 않는다⟩ **sink는 일곱 그대로이고 이벤트 이름은 33개다.**
  이름 목록(`AnalyticsEventName`)은 **`lib/analytics-event-names.ts`로 옮겼다** — `lib/analytics.contract.ts`는 그 타입을 다시 내보낸다(파일 300줄 상한).
  매핑 · 전송 · 대기열 · `environment`는 그대로다. 새 이름 셋의 타입 정본은 `lib/catalog-learning-event.contract.ts`이고 `EpisodeIntroEvent` union에 든다.
  - **`episode_lesson_started`** — 레슨 · 최종 노드를 눌러 시작 가드를 지난 순간(첫 화면을 쌓기 직전). 다시 하기 · 다시 풀기도 매번 난다. 속성 `episodeId` ·
    `unitKey`(`S1` … `RP`) · `unitRole`(`lesson` | `final`) · `questionCount`(제시 문항 · 턴 수) · `skippedItemCount`(건너뛴 문항 수). 수는 10진 문자열이다.
  - **`episode_lesson_finished`** — 판정 순간(마지막 활동 · 마지막 턴의 `See results`, 문항 0개면 시작 직후). 속성 `episodeId` · `unitKey` · `unitRole` ·
    `verdict`(`passed` | `failed`) · `correctCount` · `questionCount`. 레슨과 최종 테스트가 같은 이름을 쓰고 `unitRole`로 갈린다.
  - **`episode_final_passed`** — 최종 테스트 판정이 통과인 순간(`finished` 바로 뒤, 진행 기록 직전). 속성 `episodeId` · `correctCount` · `turnCount`.
  - 통과 뒤 컷은 이벤트를 내지 않는다(읽을거리 — 표지 이벤트를 다시 쓰지 않았다).
  - **한계** — 중도 이탈 지점(몇 번째 활동에서 나갔는지)은 세지 않는다(`started` − `finished` 차로만). 문항별 정오도 없다. `skippedItemCount`는 사유를 가르지 않는다.
  - 묻는 질문: 「카탈로그 학습이 실제로 진행되는가」 = 유닛별 `finished` / `started`, 통과율(`verdict = passed` 비율), `episode_final_passed` 사용자 수,
    `skippedItemCount` 분포(3d · 오디오 우선순위의 근거). 다음 에피소드 진입은 `episode_intro_viewed`(`episodeId` u02 …)로 잇는다. 대시보드 인사이트 추가는 이 회차 범위 밖이다.
  - ⚠ sink 이름과 책임의 어긋남이 더 커졌다 — 학습 이벤트까지 `episodeIntroEventSink`가 진다. 새 sink를 만들면 sink 목록을 펼치는 테스트 · 진입점 · App props가
    행동 변화 없이 바뀌어 미뤘다([ADR-0058](0058-catalog-learning-session.md) 「버린 대안」 8).
  - PostHog에 실제로 도착했는지는 보지 않았다 — unit · integration의 sink 호출까지다.
- ⟨2026-10-13 — 3d-1 단어 카드 · 짝 맞추기 · 그림 고르기. 적용 기록이고 결정을 바꾸지 않는다⟩ **새 이벤트는 없고 이름은 33개 그대로다.**
  `episode_lesson_started`에 속성 하나가 더해졌다.
  - **`shownItemCount`**(10진 문자열) — 그 유닛에서 화면에 서는 문항 수다(**채점 문항 + 단어 카드**). 최종 테스트는 턴 수와 같다.
  - **`questionCount`는 「채점 문항 수」로 뜻을 유지한다**(`started` · `finished` 둘 다). 단어 카드는 채점하지 않아 여기 들지 않는다. 3c까지는 표시 = 채점이었으므로
    과거 데이터와 같은 뜻으로 이어진다 — **`shownItemCount`가 없는 3c 이벤트는 그 값이 `questionCount`와 같다고 읽는다.** 위 3c 기록의 「제시 문항 · 턴 수」는 그 시점의 문면이다.
  - `episode_lesson_finished` · `episode_final_passed`는 모양이 그대로다. `finished`에 같은 값을 싣지 않은 이유 — 완료율은 `finished` / `started`로 보고 카드 수는 `started`에서 읽으면 된다.
  - 예: u01 `S1`의 시작 이벤트는 `shownItemCount "6"` · `questionCount "3"` · `skippedItemCount "2"`(카드 셋 + 빈칸 채우기 셋, 그림 문항 둘은 그림이 없어 건너뜀)이고
    끝 이벤트의 `questionCount`는 `"3"`이다.
  - 불변식(분석 쪽 점검용): `shownItemCount + skippedItemCount` = 그 유닛의 문항 수, `correctCount ≤ questionCount ≤ shownItemCount`.
  - 묻는 질문: 「새 유형이 들어온 전후로 레슨 완료율이 어떻게 바뀌는가」 = 유닛별 `finished(verdict = passed)` / `started`를 앱 버전 · 날짜로 가른다.
    새 유형이 든 유닛은 `shownItemCount − questionCount > 0`(카드 수)과 `skippedItemCount` 감소로 식별한다. 대시보드 인사이트 추가는 이 회차 범위 밖이다.
  - **한계** — 카드에서의 이탈과 채점 문항에서의 이탈을 가르지 못한다. 그림 로드 실패 횟수는 세지 않는다(지금 데이터에 그림 문항이 0이라 잴 것이 없다 —
    [ADR-0058](0058-catalog-learning-session.md) 적용 기록 A6). PostHog 도착은 이번에도 보지 않았다.
- ⟨2026-10-13 — 3d-2 학습자 프로필. 적용 기록이고 결정을 바꾸지 않는다⟩ **이벤트 셋이 더해져 이름이 33 → 36개다**(모양 37 → 40). 결정은 [ADR-0059](0059-learner-profile.md) D8.
  - **`learner_profile_saved`** — 이름 · 나라를 저장한 순간. 속성 `entry`(`onboarding` | `episode` | `settings`) · `change`(`created` | `updated`). 설정에서 같은 값으로 저장하면 나지 않는다.
  - **`learner_profile_skipped`** — 건너뛴 순간. 속성 `entry`(`onboarding` — 넷째 스텝을 빈 채 넘김 | `episode` — 에피소드 전 `Skip`). 에피소드 전 화면에서 **뒤로**는 건너뜀이 아니라 나지 않는다.
  - **`learner_profile_opened`** — 설정에서 `Name and country in lessons`를 연 순간(형제 `profile_opened` · `feedback_opened`와 같은 꼴). 속성 없음.
  - **값은 어떤 속성으로도 싣지 않는다** — 이름 · 나라 · 길이 · 문자 종류 같은 파생값도 없다. 계약 단계의 `fields` 속성은 「둘 다 필수」(사용자 결정)로 쓸모가 없어 뺐다.
  - sink는 새로 만들지 않았다 — 온보딩 `entryEventSink` · 에피소드 전 `episodeIntroEventSink` · 설정 `settingsEventSink`. 셋째 계약 union에 같은 이벤트 타입이 들어간다.
  - 묻는 질문: 「학습자가 이름 · 나라를 넣는가」 = 진입점별 `saved` / (`saved` + `skipped`). 건너뜀 비율이 높으면 ADR-0059 재검토 조건 5.
  - **한계** — 에피소드 전 화면이 보인 수는 세지 않는다(보임 이벤트 없음 — 뒤로 나간 수는 모른다). GitHub wiki 이벤트 사전은 저장소 밖이라 따로 고친다. PostHog 도착은 보지 않았다.
- ⟨2026-10-20 — 가입 직후 이름 · 나라(ADR-0059 D7 적용 기록). 적용 기록이고 결정을 바꾸지 않는다⟩ **`learner_profile_skipped`를 지워 이름이 하나 준다**(42 → 41, 모양 46 → 45 — 같은 날 먼저 병합된 에피소드 롤플레이(ADR-0076)의 둘과 합쳐 44 → 43, 모양 48 → 47).
  - 건너뛸 길(온보딩 넷째 스텝을 빈 채 · 에피소드 전 `Skip`)이 둘 다 없어졌다 — 이름은 늘 미리 채워지고 화면에 건너뛰기가 없다.
  - `learner_profile_saved`의 `entry`는 `signup`(가입 직후 ② 나라의 Continue) | `settings`다. `onboarding` · `episode`는 더 나지 않는다. 진입 sink로만 나고 서사 sink(`episodeIntroEventSink`)
    union에서 빠졌다.
  - `entry_screen_viewed`의 `screen`에 `learner-name` · `learner-country`가 더해졌다(로그인 → ① → ② → `language-select` 순).
  - 묻는 질문: 「가입자가 ②를 통과하는가」 = `entry_screen_viewed(learner-country)` 대비 `learner_profile_saved(entry = signup)`.
  - **한계** — 옛 앱 버전의 `skipped` 이벤트는 PostHog에 남는다(버전으로 가른다). GitHub wiki 이벤트 사전은 저장소 밖이라 따로 고친다. PostHog 도착은 보지 않았다.
- ⟨2026-10-14 — 카탈로그 표지 화면 · 시작/클리어 배너. 적용 기록이고 결정을 바꾸지 않는다⟩ **카탈로그 표지에서도 서사 이벤트 다섯이 모두 난다.**
  새 이름 · 속성 · 타입은 **0**이고 sink도 그대로다 — 이미 있는 이벤트를 카탈로그 `episodeId`로 낸다. 바뀐 것은 발생 시점이다
  (화면과 결선은 [ADR-0058](0058-catalog-learning-session.md) 적용 기록 ⟨2026-10-14⟩).

  | 이벤트 | 속성 | 카탈로그 표지에서의 발생 시점 | 바뀜 |
  |---|---|---|---|
  | `episode_intro_viewed` | `episodeId` | 표지 노드 탭이 시작 가드(와 학습자 프로필 가드)를 지나 화면을 쌓기 직전. 끝낸 표지를 다시 열어도 난다 | 불변(이제 정말 표지 화면이 선다) |
  | `episode_intro_skipped` | `episodeId` | 확인 모달에서 건너뛰기를 골랐을 때. `Skip` 버튼만으로는 나지 않는다 | **새로 난다** |
  | `episode_intro_continued` | `episodeId` · `hasPrologue: true` | 표지 화면의 `Next` | **새로 난다** |
  | `episode_intro_exited` | `episodeId` · `stage` | 표지 화면에서 뒤로(`"intro"`) · 컷에서 나가기(`"prologue"`). 시스템 뒤로 포함 | `"intro"`가 **새로 난다** |
  | `episode_prologue_completed` | `episodeId` · `prologueKind: "cuts"` | 마지막 컷의 버튼 — 배너가 서기 **전**. 건너뛰기에서는 나지 않는다 | 불변 |

  - 묻는 질문: 「카탈로그 표지를 얼마나 건너뛰는가」 = `episode_intro_skipped` ÷ `episode_intro_viewed`(`episodeId`가 카탈로그 id인 것).
    보조로 「이어 간 사람이 컷을 끝까지 보는가」 = `episode_prologue_completed` ÷ `episode_intro_continued`.
  - **분모 읽는 법** — `episode_intro_viewed`는 컷이 없는 에피소드에서도 나고(곧장 완료) 그때는 건너뛸 화면이 없다. 실데이터에는 그런 에피소드가 없다.
    학습자 프로필 가드가 서면 가드를 지난 **뒤에** 나므로 가드에서 뒤로 간 방문은 분모에 없다.
  - 한 번의 표지 방문은 `skipped` · `exited` · (`continued` → `exited(prologue)` 또는 `completed`) 가운데 하나로 끝난다.
  - `hasPrologue`가 늘 `true`인 것은 이 route가 컷이 있을 때만 쌓이기 때문이다.
  - **해석 단절** — 이 변경 이전 빌드에서는 카탈로그 id의 `skipped` · `continued` · `exited(intro)`가 0이었다(화면이 없었다). 비율은 이 변경이 든 출시 버전 이후로 걸러 본다.
  - 통과 뒤 컷과 「Episode clear!」 배너에는 이벤트가 없다. 배너가 어떻게 닫혔는지(시간 · 탭)도 재지 않는다.
  - Meta 앱 이벤트 전달([ADR-0057](0057-meta-app-events.md))은 이 이벤트들을 옮기지 않아 영향이 없다.
  - **한계** — PostHog 도착은 이번에도 보지 않았다. **GitHub wiki 이벤트 사전은 저장소 밖이라 이 변경에 들어 있지 않다** — 위 표 · `stage: "intro"` · 건너뛰기 비율의 정의 · 해석 단절을 따로 옮겨야 한다(후속). **⟨2026-10-14 사용자 결정⟩ 이미 끝낸 표지를 다시 열어 건너뛴 것은 세지 않는다** — 진행에 `intro`가 있으면 `episode_intro_skipped`를 내지 않고 맵으로만 돌아간다(진행 기록도 다시 하지 않는다). `episode_intro_viewed`는 다시 열 때도 나므로 건너뛰기 비율의 분모는 에피소드별 **첫 조회**로 잡아야 한다.
    `screens/episode-intro/episode-intro.contract.ts`의 이벤트 설명 주석은 튜토리얼만 말한다 — 카탈로그에서의 시점은 이 기록이 진다.
- ⟨2026-10-15 — 진행 저장본 먼저 · 로딩 줄. 적용 기록이고 결정을 바꾸지 않는다⟩ **이벤트 셋이 더해져 이름이 36 → 39개다**(모양 40 → 43). 결정은 [ADR-0062](0062-progress-cache-first.md) D11.
  sink는 새로 만들지 않았다 — 화면 밖 훅(`useProgressLoadEvents`)이 `episodeIntroEventSink`로 낸다(`episode_content_refreshed`와 같은 자리). 타입 정본은 `lib/progress-load-event.contract.ts`이고 `EpisodeIntroEvent` union에 든다.
  - **`progress_load_delayed`** — 기기에 저장본이 없는 사용자의 진행 조회가 1,000 ms를 넘긴 순간(상태 `checking → loading`). 속성 없음.
  - **`progress_load_failed`** — 조회가 실패해 실패 줄이 서는 전이. 속성 `attempt`(`first` — 첫 대기 중 실패 | `retry` — `Try again` 뒤 실패). 자동 재시도의 되풀이 실패는 상태가 그대로라 다시 나지 않는다.
  - **`progress_load_recovered`** — 실패 뒤 결국 들어간 전이. 속성 `trigger`(`auto` — 자동 재시도 성공 | `manual` — `Try again` 뒤 성공).
  - 상태 전이로 센다 — 탭을 오가 줄이 다시 서도 다시 세지 않는다. **저장본이 있는 사용자는 셋 다 내지 않는다**(신규 설치 · 새 기기 · 재설치에서만 난다).
  - 묻는 질문: 「로딩 줄이 얼마나 자주 뜨는가」 = `delayed` · `failed` 횟수의 추이, 「막힌 채 끝난 세션」 = `failed` − `recovered`.
  - **한계** — **분모(저장본 없이 시작한 횟수)는 재지 않는다** — 비율이 아니라 절대 횟수의 추이로 본다(이름 하나를 더하면 잴 수 있다 — ADR-0062 재검토 조건 1). 대기 시간은 싣지 않는다(값은 문자열 · 불리언뿐).
    Meta 앱 이벤트 매핑([ADR-0057](0057-meta-app-events.md))은 셋을 옮기지 않는다. PostHog 도착은 보지 않았다. GitHub wiki 이벤트 사전은 저장소 밖이라 이 변경에 들어 있지 않다(후속).
- ⟨2026-10-16 — PR ③ 카탈로그 말하기. 적용 기록이고 결정을 바꾸지 않는다⟩ **새 이벤트는 없고 이름은 39개 그대로다.** `episode_lesson_finished`에 속성 하나가 더해졌다 — 사용자 결정([ADR-0067](0067-episode-format-speaking.md) Q4).
  타입 정본은 `lib/catalog-learning-event.contract.ts`(`EpisodeLessonFinishedEvent.skippedCount`)이고 sink · 발생 시점은 그대로다.

  | 이벤트 | 속성 | 값 | 발생 시점 |
  |---|---|---|---|
  | `episode_lesson_finished` | **`skippedCount`**(새, 10진 문자열) | 그 레슨의 활동들이 **런타임에** 건너뛴 문항 수의 합 = 읽기(`SHADOW`)의 막힘 국면 `Skip` + 낱말 말하기(`SPEAK_WORD`)의 `Skip`(사용자 · 막힘). 최종 테스트 · 문항 0개 경로는 `"0"` | 그대로(레슨 판정 순간 한 번) |
  | 〃 | `questionCount`(기존) | **뜻 불변** — 계획의 채점 문항 수(건너뛴 낱말 말하기도 든다). 통과 기준의 분모(판정한 채점 문항 수)와 다를 수 있다 | 〃 |

  - **`skippedItemCount`(시작 이벤트)와 다르다** — 그쪽은 **매핑 때** 화면이 서지 않은 문항 수이고, 이쪽은 화면에 섰다가 사용자가 넘긴 수다. 이 변경부터 말하기는 매핑에서 빠지지 않아 `S5`의 `skippedItemCount`가 줄었다(u01 6 → 3).
- ⟨2026-10-20 — 학습 티켓. 적용 기록이고 결정을 바꾸지 않는다⟩ **이벤트 둘이 더해져 이름이 40 → 42개다**(모양 44 → 46). 결정은 [ADR-0075](0075-learning-tickets.md) D6.
  sink는 새로 만들지 않았다 — 앱 훅(`useLearningTickets`)이 `episodeIntroEventSink`로 낸다. 타입 정본은 `screens/tickets/tickets.contract.ts`(`TicketEvent`)이고 `EpisodeIntroEvent` union에 든다.
  - **`tickets_ran_out`** — 티켓 0에서 새 레슨을 열려 해 대화상자가 선 순간. 속성 없음.
  - **`ticket_more_tapped`** — `Get more tickets`를 누름. 속성 `surface`(`ticket_modal` | `out_of_tickets`) · `granted`(불리언 — 하루 한 장 무료를 받았는가).
  - Meta 앱 이벤트 매핑은 둘을 옮기지 않는다. PostHog 도착은 보지 않았다.
- ⟨2026-10-20 — 에피소드 롤플레이. 적용 기록이고 결정을 바꾸지 않는다⟩ **이벤트 둘이 더해져 이름이 42 → 44개다**(모양 46 → 48). 결정은 [ADR-0076](0076-episode-roleplay.md) D5.
  sink는 새로 만들지 않았다 — 열림은 롤플레이 목록 결선(`journey-wiring.ts`), 끝은 `roleplay-story-wiring.ts`가 `episodeIntroEventSink`로 낸다. 타입 정본은 `screens/roleplay-story/roleplay-story.contract.ts`(`RoleplayStoryEvent`)이고 `EpisodeIntroEvent` union에 든다.
  - **`roleplay_story_opened`** — 롤플레이 탭에서 에피소드 롤플레이 카드를 누름. 속성 `episodeId`.
  - **`roleplay_story_completed`** — 마지막 턴을 넘김. 속성 `episodeId` · `correctCount` · `judgedCount` · `skippedCount`(10진 문자열). 대사 · 들은 문장은 싣지 않는다.
  - Meta 앱 이벤트 매핑은 둘을 옮기지 않는다. PostHog 도착은 보지 않았다.
  - **읽는 법** — `S5`(말하기는 읽기만 있는 단계)의 `skippedCount > 0` ⇔ 그 기기에서 인식을 쓸 수 없었다(권한 거부 · 인식기 없음 · 인식 실패 — 읽기의 사용자 넘김은 `Next`라 세지 않는다) → **인식 불가 비율의 깨끗한 신호**.
    `S6` · `S8`의 `skippedCount`는 사용자 `Skip`이 섞인 상한이다. 그 두 단계의 판정 분모 = `questionCount − skippedCount`(한 단계에 말하기 유형이 하나뿐이라 성립 — 섞이면 ADR-0067 재검토 조건 2), 정답률 = `correctCount ÷ (questionCount − skippedCount)`.
  - **연속성** — 이 변경 전 모든 카탈로그 활동은 건너뜀 0을 냈으므로 **`skippedCount`가 없는 옛 이벤트는 `"0"`으로 읽는다.** `questionCount`의 뜻은 바뀌지 않았다.
    단, 같은 레슨의 `verdict`는 이 변경부터 판정 분모로 낸 것이다 — 낱말 말하기를 건너뛴 레슨은 옛 규칙이었다면 실패였을 수 있다.
  - 불변식(분석 쪽 점검용): `correctCount ≤ questionCount − skippedCount`는 레슨에 읽기 건너뜀이 없을 때만 참이다(읽기 건너뜀은 채점 밖이라 빼면 안 된다) — 늘 참인 것은 `correctCount ≤ questionCount`다.
  - **한계** — 막힘과 사용자 `Skip`을 가르지 않는다(`S5`만 깨끗하다). 권한 거부 · 인식기 없음 · 일반 실패도 가르지 않는다. PostHog 도착은 보지 않았다.
    **GitHub wiki 이벤트 사전은 저장소 밖이라 이 변경에 들어 있지 않다** — 위 표의 `skippedCount` 행 · 읽는 법 · 연속성을 옮겨야 한다(후속 — wiki 갱신 필요).
- ⟨2026-10-20 — 에피소드 갱신 스플래시 게이지. 적용 기록이고 결정을 바꾸지 않는다⟩ **이벤트 하나가 더해져 이름이 43 → 44개다**(모양 47 → 48). 결정은 [ADR-0078](0078-episode-update-on-splash.md) D8.
  sink는 새로 만들지 않았다 — App 루트 훅(`useEpisodeContentRefresh`)이 `episodeIntroEventSink`로 낸다(`episode_content_refreshed`와 같은 자리). 타입 정본은 `lib/episode-update-event.contract.ts`이고 `EpisodeIntroEvent` union에 든다.
  - **`episode_update_splash_closed`** — 스플래시가 나가는 순간, **실행당 최대 1회**. 매니페스트가 로고 끝 전에 답하지 않았으면 **교체가 있었을 때만** `unchecked`로 내고 아니면 내지 않는다. 속성(10진 문자열 · 문자열) `outcome`(`unchecked` · `nothing` · `complete` · `timed-out` · `failed`) · `waitMs`(로고 끝 → 나감, 로고 끝이 없었으면 `"0"`) · `splashMs`(받기 시작 → 나감) · `episodeCount`(스플래시가 기다린 새 · 바뀐 에피소드 수) · `replacedCount`(이번 시작에 활성으로 올린 수 — 시작 직후 + 나갈 때). 에피소드 id는 싣지 않는다.
  - 묻는 질문 → 읽는 법: 게이지 노출 실행 비율 = `outcome ∈ {complete, timed-out, failed}` ÷ (`unchecked`를 뺀 전체) — 분모는 「매니페스트가 로고 끝 전에 답한 실행」이다. 대기 시간 = 게이지 실행의 `waitMs` 분포(설계상 ≤ 약 3000). 3초 넘김 비율 = `timed-out` ÷ 게이지 실행. 교체된 에피소드 수 = `replacedCount`의 합 · 분포(`unchecked`는 오프라인 시작의 교체).
  - **한계** — 매니페스트가 로고 끝 뒤에 답한 실행(느린 망)은 교체가 없으면 세지 않는다 — 「느려서 게이지를 못 띄운 비율」은 잴 수 없다(ADR-0078 재검토 조건 1). Airbridge · Meta 앱 이벤트 매핑은 옮기지 않는다. PostHog 도착은 보지 않았다. GitHub wiki 이벤트 사전은 저장소 밖이라 따로 고친다(후속).

- ⟨2026-10-21 — 튜토리얼 u00. 적용 기록이고 이 ADR의 결정을 바꾸지 않는다⟩ **sink가 일곱 → 넷, 이벤트 이름이 44 → 36개다**(모양 48 → 37 — 출처별 두 모양이던 열림 이벤트 셋이 함께 빠짐). 결정은 [ADR-0081](0081-tutorial-as-catalog-episode.md) D9 · D10.
  - **지운 sink 셋** — `messengerEventSink` · `visualNovelEventSink` · `phoneCallEventSink`(그 화면이 지워짐). 남은 넷: `entryEventSink` · `notificationEventSink` · `settingsEventSink` · `episodeIntroEventSink`. 이 절 제목의 「일곱 번째 sink」와 위 「sink는 일곱」은 그때의 수다.
  - **지운 이름 여덟** — `messenger_unit_opened` · `messenger_unit_completed` · `messenger_unit_exited_incomplete` · `visual_novel_unit_opened` · `visual_novel_unit_completed` · `visual_novel_unit_exited_incomplete` · `visual_novel_unit_replay_started` · `phone_call_unit_opened`.
  - **튜토리얼의 `episodeId` 값이 `tutorial` → `u00-tutorial`** — 표지 넷(`episode_intro_*`) · 설문 둘(`episode_survey_*`)이 같은 이름으로 카탈로그 표지 결선에서 난다. 튜토리얼 단원도 이제 `episode_lesson_started` · `episode_lesson_finished { unitKey: S1 … S13 }` · `episode_final_passed`를 낸다(옛 튜토리얼에는 단원 · 최종 통과 이벤트가 없었다).
  - **`episode_prologue_completed.prologueKind`는 `"cuts"` 하나**다 — 옛 통화 · 메신저 · 비주얼 노벨 · 혼합 서사가 지워졌다(`EpisodePrologueCompletedKind = "cuts"`).
  - **연속성** — 교체 시점은 같은 사람의 `episodeId`가 `tutorial` → `u00-tutorial`로 바뀐 때다. 비교 지표는 「튜토리얼 표지 → Episode 1 표지(`u01-water`)」 전환율 하나다(ADR-0081 D9). 새 이벤트는 없다. PostHog 도착은 보지 않았다. GitHub wiki 이벤트 사전은 저장소 밖이라 따로 고친다(후속).

- ⟨2026-10-22 — 학습 문항 음성 · 「천천히」. 적용 기록이고 이 ADR의 결정을 바꾸지 않는다⟩ **이벤트 하나가 더해져 이름이 36 → 37개다.** 결정은 [ADR-0082](0082-item-audio-and-slow-playback.md) 「측정」.
  - **`episode_listen_item_answered`** — sink는 기존 `episodeIntroEventSink`(넷 그대로). 듣기 여섯 유형(`LISTEN_SELECT` · `MIN_PAIR_AB` · `REPLY_SELECT` · `LISTEN_BUILD` · `DICTATION` · `SHADOW`) 문항마다 판정이 처음 서는 순간 한 번. 소리 없는 문항은 내지 않는다.
  - **속성** — `episodeId` · `unitKey` · `itemId` · `itemType` · `result`(`correct` · `incorrect` · `practiced` · `skipped`) · `pace`(`normal` · `slow`, 판정 순간) · `slowTurnedOn`(boolean) · `replayCount` · `slowReplayCount`(사용자가 누른 다시 듣기 수, 10진 문자열 — 이 절의 다른 수 속성과 같다).
  - **읽는 법** — 「천천히」 켬 비율 = `slowTurnedOn` 참 ÷ 이벤트 수, 다시 듣기 = 두 수의 합, 정답률 변화 = 같은 에피소드 · 유형 안에서 `result`를 `pace`(또는 `slowTurnedOn`)로 갈라 비교.
  - **한계** — 분모는 판정까지 간 문항이다(판정 전에 나간 문항은 빠진다). 자동 재생 · 켤 때의 다시 재생은 세지 않는다. Airbridge · Meta 매핑은 없다. PostHog 도착은 보지 않았다. GitHub wiki 이벤트 사전은 저장소 밖이라 따로 고친다(후속).

- ⟨2026-10-22 — 학습 문항 리디자인. 적용 기록이고 이 ADR의 결정을 바꾸지 않는다⟩ **이벤트 하나가 더해져 이름이 37 → 38개다.** 결정은 [ADR-0081](0081-lesson-item-redesign.md) 「측정」.
  - **`episode_item_answered`** — sink는 기존 `episodeIntroEventSink`(넷 그대로), 타입 정본은 `lib/catalog-learning-event.contract.ts`. 채점 문항이 **처음 판정되는 순간 문항당 한 번** — 듣기 · 단어 선택(그림 · 문화 확인 포함) 고름 · 문장 순서 · 음절 조립 `Check` · 낱말 말하기 판정(`Skip`이면 `skipped`). 따라 읽기 · 단어 카드 · 문화 카드 · 짝 맞추기 · 타자 입력은 내지 않는다. 듣기 여섯 유형은 `episode_listen_item_answered`와 둘 다 낸다.
  - **속성**(문자열) — `episodeId` · `unitKey` · `itemId` · `itemType`(채점 유형 16 가운데 하나) · `result`(`correct` · `incorrect` · `skipped`) · `density`(`regular` · `compact` — 그 문항의 밀도). PII 없음.
  - **읽는 법** — 유형별 정답률 = `itemType`별 correct ÷ (correct + incorrect), 줄 배치 Check 뒤 오답률 = `itemType ∈ {LISTEN_BUILD, WORD_ORDER}`의 incorrect 비율, 대화 조립 정답률 = `TURN_ORDER`. 모두 `density`로 갈라 작은 화면 효과를 본다. 레슨 이탈은 기존 `episode_lesson_started` 대비 `episode_lesson_finished`로 읽는다.
  - **한계** — 새 이벤트라 리디자인 전 기준선이 없다(전후 비교는 이탈 · 레슨 정답률로). 판정 전에 나간 문항은 빠진다. Airbridge · Meta 매핑은 없다. PostHog 도착은 보지 않았다. GitHub wiki 이벤트 사전은 저장소 밖이라 따로 고친다(후속).

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
   ADR이 정하지 않는다. ⟨2026-09-30⟩ 그 화면이 사라지고 실제 개인정보 처리방침(Notion 공개 페이지)이
   PostHog 분석을 적는다([ADR-0033](0033-legal-documents-in-app-browser.md)). 충돌한 문장은 앱에 없다.
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
