# ADR-0124 — 자유 대화 답은 호스트 모듈 `ChatStreamModule`이 SSE 블록 단위로 받아 전역 이벤트로 올린다

- 상태: **채택 — 호스트 · 클라이언트 전송 계층.** 화면 변경 0. 서버 변경 0. 새 의존성 · 권한 · 저장 키 · 분석 이벤트 0.
- 날짜: 2026-11-11.
- **사용자 결정**(2026-11-10): 「네이티브 스트리밍 모듈」 · 「네이티브가 자른다(UTF-8 + 빈 줄 경계)」 · 「지금 /change로 구현」. 결정 문서: [AI 컴패니언 ↔ 메신저 UI 통합 결정](https://claude.ai/artifact/9BTvrL4GfTxvMrAUzwJr1x) 9 · 12.
- 다루는 축: 스트리밍 HTTP 응답(SSE)을 앱 JS가 조각 단위로 받는 길 — 누가 받고, 어디서 자르고, 어떻게 JS로 올리고, 언제 끝내는가.
  **다루지 않는 것**: 서버 계약(`packages/companion-contract`의 `decodeTurnEvent` — PR #401 · #409, main에 없음), 대화 출처 포트(`ChatSource`)의 서버판, 재시도 정책, 백그라운드 지속.
- 번호: 0117은 메신저 1.5(PR #410), 0118 이후는 컴패니언 PR(#400 · #401 · #409)이 다시 매길 몫으로 비워 두었다.

## 맥락

AI 컴패니언 서버의 `chat-send`는 답을 SSE 하나로 흘린다(서버는 15초마다 `: ping`). 2026-11-10 iOS 시뮬레이터(호스트 Lynx 4.0.1, 공식 `LynxHttpService`)에서 잰 결과:

| 방식 | 머리 | 본문 |
|---|---|---|
| `globalThis.fetch` | — | 없음(`undefined`) |
| `lynx.fetch` + `lynxExtension.useStreaming` | 17 ms | `body.getReader().read()`가 4,225 ms에 `done`만, 조각 0개 — **본문 유실** |
| `lynx.fetch` 일반 | 4,214 ms | 끝에 한 번에(450 B) |

앱 JS에는 `TextDecoder`도 없다(`ReadableStream`은 있다).

## 결정

### D1. 호스트 모듈 `ChatStreamModule` — `open` · `cancel`, 결과는 전역 이벤트로만

- `open(streamId, url, headers, body)` — POST. `Content-Type: application/json; charset=utf-8` · `Accept: text/event-stream`은 JS 머리 위에 고정한다(두 플랫폼이 같은 요청을 보낸다). `cancel(streamId)`. 콜백은 없다.
- iOS: `URLSession` 데이터 델리게이트(직렬 큐 하나). Android: 이미 있는 OkHttp 4.9.0. **새 의존성 0.**
- 전역 이벤트 셋(호스트 관례 — `contentSyncOpportunity` · `systemBackPressed`와 같은 길, 메인 스레드):
  - `chatStreamOpen [streamId, status]` — 머리가 오면 한 번(2xx가 아니어도).
  - `chatStreamEvent [streamId, seq, text]` — SSE 블록 하나, `seq`는 0부터 1씩.
  - `chatStreamEnd [streamId, reason, detail]` — 스트림마다 **정확히 한 번**, 그 뒤 그 id의 이벤트 없음.

### D2. 자르기는 네이티브 — 바이트에서 빈 줄 경계, 블록만 UTF-8로

- `SseEventSplitter`(iOS 구조체 · Android 클래스, 같은 규칙 · 같은 표 CSN1 ~ CSN7)가 바이트를 모아 빈 줄(`\n\n` · `\r\n\r\n` · `\r\r` — 줄 끝 셋의 조합)에서 자르고, 블록 하나만 UTF-8로 푼다. 경계가 ASCII라 다바이트 글자가 조각 사이에서 갈려도 블록 안에서 온전해진다. 블록 끝 줄바꿈은 싣지 않는다.
- 내용 줄 끝의 `\r`이 마지막 바이트면 다음 조각을 기다린다(`\r\n`일 수 있다). 빈 줄 자리의 `\r`은 그것만으로 경계다.
- 주석 블록(`: ping`)도 그대로 올린다 — 거르는 것은 JS다(D4).
- 2xx 본문이 빈 줄 없이 끝나면 남은 블록도 올린다(WHATWG SSE는 버린다). 서버가 JSON 가운데에서 닫으면 JS가 잘린 `data`를 받을 수 있다 — 서버 결선(`decodeTurnEvent`)이 견뎌야 한다(재검토 조건 2).
- **「end 뒤 event 없음」은 호스트가 지킨다** — iOS는 직렬 큐 하나, Android는 스트림 단위 잠금 안에서 「끝났는가 확인 → 보내기」를 한 번에 한다(취소는 JS 스레드, 읽기는 OkHttp 스레드).

### D3. 끝나는 까닭 일곱

| `reason` | 언제 | `detail` |
|---|---|---|
| `complete` | 2xx 본문이 끝남(남은 블록은 먼저 올린다) | `null` |
| `http-error` | 2xx가 아님 | 응답 본문, **64 KB까지**(닿으면 나머지는 받지 않고 끝낸다) |
| `timeout-connect` | 머리가 **10초** 안에 오지 않음 — 두 플랫폼 모두 스트림마다 타이머(OkHttp `connectTimeout`은 TCP · TLS까지만 재서 따로 둔다), 머리가 이미 왔으면 울려도 끝내지 않는다 | `null` |
| `timeout-idle` | 머리 뒤 바이트가 **30초** 끊김(서버 ping 15초의 두 배) | `null` |
| `network` | 그 밖의 실패 · 잘못된 요청 | `null` 또는 `invalid-request` |
| `cancelled` | `cancel` | `null` |
| `unavailable` | 호스트에 모듈이 없음 · `open`이 던짐 — JS가 스스로 낸다 | `null` |

### D4. JS 어댑터 `apps/mobile/src/lib/chat-stream.ts`

- `createChatStreamClient({ native, subscribe, newStreamId })` → `{ open(request, handlers), dispose() }`. 앱 결선은 `chatStreamClient()`(모듈 싱글턴, `NativeModules.ChatStreamModule` + `GlobalEventEmitter`).
- 첫 `open`에서 이벤트 셋을 한 번 구독한다. streamId로 나눠 `onOpen` · `onEvent` · `onEnd`로 넘기고, 모르는 id · 끝난 id · 이미 본 `seq` 이하 · 모양이 틀린 인자는 버린다. `parseSseBlock`이 블록의 `event`(없으면 `message`) · `id` · `data`(여러 줄은 `\n`)를 풀고, `data`가 없는 블록(ping)은 넘기지 않는다.
- `cancel()`은 호스트를 닫고 **바로** `onEnd("cancelled")` — 뒤에 오는 호스트 이벤트는 버린다. 모듈이 없거나 전역 이벤트 구독이 던지면(걸었던 구독은 걷는다) 마이크로태스크 뒤 `onEnd("unavailable")`. `dispose()`는 열린 호스트 스트림을 닫는다. **던지지 않는다**(핸들러가 던져도 다른 스트림은 계속).
- 끊김 · 백그라운드에서 돌아온 뒤의 처리(메시지 목록 다시 읽기)는 대화 출처 서버판의 몫이다 — 서버는 연결이 끊겨도 턴을 끝까지 처리한다.

## 버린 대안

1. **`lynx.fetch` 일반으로 끝에 한 번에 받기** — 동작은 하지만 성인 사용자의 첫 글자가 답 전체만큼 늦다. 사용자가 네이티브를 골랐다.
2. **JS가 자르기(호스트는 바이트를 base64로)** — JS에 `TextDecoder`가 없어 UTF-8 해독을 손으로 써야 하고, 다바이트 경계 처리를 JS가 진다. 사용자가 네이티브를 골랐다.
3. **콜백으로 조각 전달** — Lynx 콜백은 한 번 부르면 끝이다. 여러 번 올리는 길은 전역 이벤트뿐이다.
4. **Lynx 쪽 HTTP 서비스를 고쳐 `useStreaming` 살리기** — 공식 서비스 소스를 들여와야 하고 Lynx 올림 때마다 다시 맞춰야 한다.

## 대가

- 호스트 모듈이 하나 늘었다([호스트 모듈 표](README.md#호스트-모듈-표)). iOS · Android 두 구현이 같은 규칙을 따로 진다 — 표 CSN1 ~ CSN7을 HostTests · JUnit이 각각 잰다.
- **CI는 네이티브 테스트를 돌리지 않는다**(Android는 빌드만). 네이티브 규칙을 바꾸면 로컬에서 `xcodebuild test -only-testing:HostTests/ChatStreamModuleTests` · `./gradlew :app:testDebugUnitTest --tests '*SseEventSplitterTest'`를 돌린다.
- 아직 이 모듈을 부르는 화면이 없다 — 서버(컴패니언)가 들어온 뒤 대화 출처 서버판이 쓴다.
- 블록 버퍼에 상한이 없고 조각마다 처음부터 다시 훑는다 — 빈 줄 없이 큰 응답을 보내는 서버에는 메모리 · CPU가 늘어난다. 서버를 우리가 쓰므로 받아들였다(리뷰 S1).

## 테스트

- unit: `chat-stream.unit.test.ts` CS-U1 ~ U18(18 — U17 · U18은 리뷰 W3 · S4 뒤 red → green) · HostTests `ChatStreamModuleTests` CSN1 ~ CSN7(7) · JUnit `SseEventSplitterTest`(8).
- ui: 해당 없음(화면 0).
- integration: `chat-stream.integration.test.ts` CS-I1 ~ I3 — 실제 `GlobalEventEmitter` + 호스트 모듈 대역. 첫 실행부터 통과(logic이 결선을 만들었다 — red moot). 전달 형태를 일부러 틀리면 CS-I1이 red인 것을 확인했다.
- e2e(수동): [chat-stream-module.md](../e2e/chat-stream-module.md) CS-E1(iOS) · CS-E2(Android) 통과 — 2회차에 머리 없는 서버(E)로 두 플랫폼 `timeout-connect` 10초를 쟀다(리뷰 C1).
- 리뷰(2026-11-11, review 에이전트): FAIL → 반영 — C1 Android 머리 대기 30초 → 10초 타이머, W1 iOS 타이머 경쟁, W2 Android end 뒤 event, W3 JS 구독 실패에 던짐, W4 머리 고정, S2 · S4. S1 · S3은 위 대가 · D2에 적었다.

## 재검토 조건

1. Lynx를 올렸을 때 `lynx.fetch` + `useStreaming`이 본문을 주면 → 이 모듈을 걷을지 본다(맥락 표를 다시 잰다).
2. 대화 출처 서버판이 붙을 때 → `decodeTurnEvent` 연결 · 끊김 뒤 목록 다시 읽기 · `client_message_id` 재전송을 그 변경이 정한다.
3. 백그라운드에서 답을 계속 받아야 하면 → iOS 백그라운드 세션 · Android 서비스가 필요하다(지금은 끊기면 목록으로 복구).
