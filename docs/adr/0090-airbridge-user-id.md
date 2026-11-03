# ADR-0090 — Airbridge에 PostHog과 같은 사용자 ID를 건다 (세션이 바뀔 때마다 · 시험 계정은 지움 · 이메일 · 전화번호는 여전히 없음)

- 상태: **채택 — 클라이언트 · 두 호스트.** 서버 변경 0. **사용자 결정**(2026-10-29): 「PostHog과 Airbridge 사용자 통일」 선택지 1
  (Airbridge에 `setUserID`)로 간다.
  ⚠ **실제 앱 이름 · 토큰으로 Airbridge 대시보드에 User ID가 실리는 것은 보지 않았다** — [e2e 시나리오 F](../e2e/airbridge-events.md#f--사용자-id-adr-0090-사용자-몫).
- 날짜: 2026-10-29
- 다루는 축: Airbridge SDK의 사용자 식별 — 어떤 값을, 언제 걸고 지우는가, 시험 계정, 호스트 모듈의 두 메서드, 개인정보 선언.
  **다루지 않는 것**: 이메일 · 전화번호 · 사용자 속성 · 별칭(`setUserEmail` · `setUserPhone` · `setUserAttribute` · `setUserAlias`),
  PostHog에 어트리뷰션 속성 싣기(선택지 2), App Store Connect 개인정보 응답 · Play 데이터 보안 양식 · 개인정보 처리방침 문구(사용자 몫).
- 부분 대체: [ADR-0063](0063-airbridge-events.md) D7의 「`setUserID`를 부르지 않는다」와 「사용자 확인 필요」 6. D7의 나머지(이벤트 둘 ·
  속성은 콘텐츠 식별자뿐 · 이메일 · 전화번호 · 로그인 수단 없음)는 그대로다.

## 맥락

PostHog은 로그인 때 Supabase user id로 `identify`한다(ADR-0029 D8). Airbridge는 기기 단위로만 셌다 — 그래서 「Google Ads로 들어온
사용자의 학습량 · 리텐션」처럼 두 도구를 사람 단위로 잇는 질문에 답할 수 없었다.

## 결정

### D1. 값은 PostHog `identify`와 같은 Supabase user id(액세스 토큰의 `sub`)다

- 읽기는 `authUserIdFrom`(PostHog 식별과 같은 함수). 못 읽으면 걸지 않는다.
- 이메일 · 전화번호 · 로그인 수단은 보내지 않는다(0063 D7 유지). user id는 무작위 UUID라 그 자체로 사람을 가리키지 않는다.

### D2. 로그인 순간이 아니라 저장된 세션이 바뀔 때마다 맞춘다

- `useTesterAccess`의 effect(렌더 뒤마다 저장된 액세스 토큰을 읽는 자리)가 `createAirbridgeUserSync()`를 부른다(`lib/airbridge-user.ts`).
  사용자 ID가 **바뀔 때만** 호스트를 부른다 — ID면 `setUserID`, 없으면 `clearUser`. 첫 관찰도 바뀜으로 친다.
- 그래서 앱 시작 · 로그인 · 로그아웃 · 계정 삭제가 모두 같은 길을 지난다. SDK가 ID를 실행 사이에 기억하는지에 기대지 않고,
  이 변경 전에 로그인해 둔 설치도 다음 실행에 이어진다.
- 대가: 로그인 직후 첫 렌더가 지나야 걸린다 — 설치 · 첫 실행 이벤트(SDK 자동)에는 User ID가 없다. 가입 완료(`airbridge.user.signup`)는
  이름 · 나라 · 언어 화면 뒤에 나므로 이미 걸린 뒤다.

### D3. 시험 계정은 식별하지 않는다

- 토큰이 시험 계정이면 ID를 `null`로 보고 `clearUser`한다(ADR-0085 D4와 같은 방향 — 그쪽은 SDK 추적 자체도 멈춘다).

### D4. 호스트 모듈에 두 메서드 — `setUserID(String)` · `clearUser()`

- iOS · Android 같은 이름. SDK가 시작되지 않은 빌드에서는 아무것도 하지 않는다. 응답 · 콜백이 없다. 옛 호스트에는 메서드가 없어
  JS가 조용히 건너뛴다.

### D5. 개인정보 선언 — UserID의 목적에 Developer Advertising을 더한다

- `PrivacyInfo.xcprivacy`의 `NSPrivacyCollectedDataTypeUserID`에 `…PurposeDeveloperAdvertising`. Tracking은 false 그대로다
  ([추론] — App Store Connect의 「추적」 응답과 함께 사용자 판단, [ios-privacy](../ios-privacy.md)).

## 확인

- unit `lib/airbridge-user.unit.test.ts`(AU1 ~ AU7), integration `app/App.airbridge-user.integration.test.tsx`(AUI1 · AUI2),
  Android JUnit `AirbridgeUserIdentityTest`(N-A9), iOS `AirbridgeEventsTests`(N-I2 · N-I14).

## 사용자 몫

1. App Store Connect 개인정보 — 「사용자 ID」의 목적에 「개발자 광고 또는 마케팅」을 더한다.
2. Play Console 데이터 보안 — 「사용자 ID」 항목의 목적 · 공유 대상에 광고 · 마케팅(Airbridge)을 더한다.
3. 개인정보 처리방침 — Airbridge로 가는 항목에 계정 식별자를 더한다.
