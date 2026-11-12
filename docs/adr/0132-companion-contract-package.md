# ADR-0132 — 컴패니언의 앱 ↔ 서버 계약은 `packages/companion-contract` 하나에서 정의하고, Edge Function에는 생성 사본을 둔다

- 상태: **제안** — FE 팀 리뷰 대기. M0 브랜치에 패키지 · 사본 · 동기화 테스트가 이미 있다.
- 날짜: (채택일에 적는다)
- 다루는 축: 컴패니언의 요청 · 스트림 이벤트 · 에러 코드 모양을 **어디에 한 번 적고**, 앱 · Edge Function · 운영 도구가 **어떻게 같은 모양을 받는가**.
  **다루지 않는 것**: 다른 Edge Function(`send-push` · 계정 삭제 등)의 계약 — 지금처럼 양쪽에 따로 적는다 · 앱 화면 코드.
- 이어받는 결정(결정 문장은 바꾸지 않는다 — 적용 기록만):
  [code.md](../conventions/code.md) 「앱과 코드를 나누지 않는다」에 **컴패니언 한정 예외** 한 줄 ·
  [ADR-0004](0004-package-boundaries-and-dependency-direction.md) D2(패키지는 두 번째 소비자가 있을 때 — 앱 · Edge Function · 운영 도구 셋이 처음부터 있다).

근거 표시: **[코드]** 저장소 코드 · **[사용자]** 사용자 결정 · **[추론]** 관찰 없이 이어 붙인 것.

## 맥락

1. **지금 규약은 「Edge Function은 앱과 코드를 나누지 않는다 — 같은 모양이 필요하면 양쪽에 따로 적는다」다** [코드 — code.md]. 지금까지의 함수는 요청 칸이 몇 개라 따로 적어도 어긋날 일이 적었다.
2. **컴패니언 계약은 크고 자주 바뀐다** [코드 — API 명세 §2 · §4 · §5]. 요청 하나, 스트림 이벤트 아홉 종(조각 · 교정 · 번역 · 상태 · 위기 …)과 순서 규칙, 에러 코드 열아홉. FE가 서버보다 먼저 화면을 만들 수 있게 **fixture**(재생용 이벤트 목록)도 같은 모양이어야 한다.
3. **Deno는 확장자 없는 import를 풀지 못하고, 워크스페이스 패키지를 바로 읽지 않는다** [코드 — code.md Deno 예외]. Edge Function이 패키지를 그대로 import할 수 없다.
4. **Lynx 앱은 실행 중에 파일을 읽지 못한다** [코드]. fixture는 `.sse` · `.json` 파일이 아니라 TS 모듈이어야 앱 번들에 들어간다.
5. **사용자는 계약 패키지와 fixture를 M0에 넣기로 했다** [사용자 — 2026-11-08].

## 결정

### D1. 계약의 정본은 `packages/companion-contract`다

- zod(`zod/mini`)로 스키마를 적고 타입은 스키마에서 뽑는다. 내용: `chat-send` 요청 · 스트림 전 에러 본문 · SSE 이벤트 · SSE 파서 · 턴 순서 검사 · 에러 코드 표 · RPC 응답 모양 · `CONTRACT_VERSION`.
- fixture(`fixtures.ts` · `fixtures-streams.ts`)도 이 패키지에 있고 `./fixtures`로 따로 export한다. 앱은 개발 중에만 import한다.
- 운영 도구용 JSON Schema는 `json-schema/`에 **커밋**한다. 스키마와 산출물이 어긋나면 테스트 CJ1이 실패한다.

### D2. Edge Function에는 **생성 사본**을 둔다

- `pnpm --filter @libitums/companion-contract sync:functions`가 `src/`의 테스트 아닌 파일을 `apps/supabase-functions/supabase/functions/_shared/companion-contract/`로 복사한다 — 머리에 「생성 파일, 고치지 말 것」을 달고 상대 import에 `.ts`를 붙인다. fixture · JSON Schema 생성기는 빠진다(서버에 필요 없다).
- 사본이 정본과 다르면 동기화 테스트(CC1 ~ CC3)가 실패한다 — `pnpm verify`에 들어 있다.
- zod는 Edge Function 쪽 `package.json`에도 같은 버전으로 둔다.

### D3. 예외는 **컴패니언 한정**이다

- code.md의 「나누지 않는다」 규칙은 다른 함수에 그대로 산다. 기존 함수 코드 · 테스트는 바뀌지 않는다.
- 다른 기능이 같은 길을 쓰려면 이 ADR을 고치는 것이 아니라 새로 정한다.

## 버린 대안

- **양쪽에 따로 적는다(지금 규약)** — 맥락 2. 이벤트 아홉 종과 순서 규칙을 두 번 적으면 어긋남을 사람이 잡아야 하고, fixture가 서버와 다른 모양을 가르쳐도 모른다.
- **Edge Function이 패키지를 import map으로 직접 읽는다** — 배포 번들에 워크스페이스 경로가 들어가야 하고, Supabase CLI 배포에서 동작이 확인되지 않았다 [추론]. 사본 + 테스트가 더 단순하다.
- **OpenAPI 등 언어 중립 명세에서 양쪽 코드를 생성한다** — SSE 이벤트 순서 같은 규칙은 표현이 안 되고, 생성기 하나를 더 유지해야 한다.

## 대가

- 계약을 고치면 `sync:functions`를 돌려 사본까지 커밋해야 한다(잊으면 테스트가 막는다).
- 사본 폴더가 Edge Function 리뷰 diff에 함께 뜬다 — 머리 표시로 구분한다.
- 루트 `package.json` · lockfile이 바뀌어 Android 빌드 CI가 한 번 돈다.

## 재검토 조건

- Supabase CLI 배포가 워크스페이스 패키지를 직접 번들한다는 것이 확인되면 사본을 걷는다.
- 다른 Edge Function이 같은 크기의 계약을 갖게 되면(이벤트 다섯 종 이상) code.md 규칙 자체를 다시 본다.
