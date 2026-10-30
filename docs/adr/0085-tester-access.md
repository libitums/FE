# ADR-0085 — 시험 계정: 계정 표시 하나로 티켓을 쓰지 않고 모든 에피소드 · 롤플레이를 연다

- 상태: **채택 — 클라이언트.** 서버 코드 · 마이그레이션 · 호스트 변경 0. 표시를 켜는 것은 운영 DB의 계정 메타데이터 한 칸이다(사용자 몫 · 승인 뒤).
  ⚠ **기기 확인은 일부다** — 2026-10-26 iPhone 13 mini Release 빌드에 설치했다. 표시를 켠 계정에서 칩 「∞」 · 잠금 해제를 본 기록은 아직 없다.
- 날짜: 2026-10-26.
- **사용자 결정**(2026-10-26): 인스타그램 셀럽 체험용 계정은 **티켓 무제한과 잠금 해제를 함께** 준다 · 머리 칩은 **「∞」**로 보인다. 여러 명이 한 계정을 함께 쓰는 방식은 쓰지 않는다(진행 · 티켓이 섞이고 한 사람의 계정 삭제가 모두에게 미친다).
- 다루는 축: 특정 계정에만 학습 제한(티켓 · 잠금)을 푸는 방법 — 표시의 자리, 앱이 읽는 때, 판정하는 곳, 화면.
  **다루지 않는 것**: 표시를 켜고 끄는 관리 화면, 서버 쪽 강제. ⟨2026-10-26⟩ 분석 · 광고 측정에서 빼는 것은 D4로 연다.

## 결정

### D1. 표시는 Supabase 계정의 `app_metadata.duru_tester`(정확히 `true`)다

- `app_metadata`는 사용자가 바꿀 수 없고 대시보드 · 서버 키로만 고친다. 액세스 토큰(JWT)에 실려 오므로 앱은 토큰을 읽기만 한다(`lib/tester-access.ts` `testerAccessFrom`) — **서명을 검증하지 않는다**(`auth-user-id.ts`와 같은 근거).
- `user_metadata`의 같은 키는 보지 않는다 — 사용자가 고칠 수 있는 칸이다(TA1).
- 켜기: `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"duru_tester": true}' where id = '<id>';` · 끄기: `raw_app_meta_data - 'duru_tester'`. Apple 계정은 이메일이 가려지거나 비어 있으므로 로그인 시각으로 찾아 `id`로 켠다.

### D2. 앱은 세션의 토큰을 렌더 뒤마다 다시 읽고, 판정 함수는 모듈 값을 읽는다

- `use-tester-access.ts`: 저장된 세션의 액세스 토큰이 바뀌면(로그인 · 갱신 · 로그아웃) 다시 그리고, 이 렌더 안에서 `setTesterAccessActive`로 모듈 값을 맞춘다. `AppSession`이 진행 · 티켓 · 맵 판정보다 먼저 부른다.
- 표시는 **토큰이 갱신될 때** 실린다 — 앱을 다시 켜면 시작 갱신으로, 아니면 최대 한 시간 뒤. 다시 로그인하면 바로.
- 판정이 여러 화면에 흩어져 있어(티켓 비용 · 유닛 상태 · 표지 상태 · 롤플레이 열림) 인자로 꿰지 않고 `isTesterAccessActive()`를 읽는다. 대가 1.

### D3. 켜졌을 때의 동작

| 자리 | 동작 |
|---|---|
| `catalogUnitTicketCost` | 늘 0 — 맵 말풍선 · 결과 화면 「다음 레슨」의 티켓 태그가 없고, 시작이 티켓을 쓰지 않고 「티켓 없음」이 뜨지 않는다 |
| `catalogUnitStatus` · `catalogCoverStatus` | 사슬에 있는 키 · 준비된 구획이 모두 `available`. 끝낸 유닛은 `completed` 그대로, 준비 안 된 구획은 잠김 그대로 |
| `catalogRoleplaySectionsOf` | 모든 롤플레이 구획이 열림 |
| 머리 칩(`TopBar` · `StatChip.valueText`) | 숫자 대신 「∞」, 이름 「Unlimited tickets」, 누를 수 없음(모달을 열지 않음) |
| 결과 화면 「N tickets left」 줄 | 서지 않음 |

- 진행 기록 · 티켓 원장의 모양과 서버 병합은 그대로다 — 시험 계정의 원장은 쓰이지 않아 가득으로 남는다.

### D4. ⟨2026-10-26 보충⟩ 시험 계정은 PostHog · Airbridge로 추적하지 않는다 — Sentry는 그대로

- **사용자 결정**(2026-10-26): 시험 계정의 이벤트는 PostHog(제품 분석)와 Airbridge(광고 측정) 어디에도 보내지 않는다. SDK가 스스로 재는 Airbridge 설치 · 실행까지 막는다(네이티브까지). 오류 보고(Sentry)는 그대로 둔다.
- **JS**(`lib/tester-tracking.ts`, 진입점 `app/index.tsx`): sink 넷을 가장 바깥에서 감싸, 이벤트가 나가는 순간 `isTesterAccessActive()`가 참이면 버린다 — PostHog `capture`와 Airbridge `trackEvent`가 함께 빠진다. 시험 계정이면 PostHog 식별(`identify`)도 하지 않는다. 되돌리기(로그아웃 · 계정 삭제)는 그대로 넘긴다.
- **표시가 바뀔 때**(`use-tester-access.ts`의 effect가 저장소를 읽은 뒤): 켜지면 PostHog 대기열 · 식별을 버리고(`reset("identity-and-queue")`) 호스트 `AirbridgeEventsModule.setTrackingEnabled(false)`, 꺼지면(로그아웃 · 표시 해제) `setTrackingEnabled(true)`. 첫 렌더의 빈 값으로는 부르지 않는다.
- **호스트**(iOS `AirbridgeEvents.setTrackingEnabled` · Android `AirbridgeEvents.setTrackingEnabled`): `Airbridge.stopTracking()` · `startTracking()`을 부르고 값을 기억한다(iOS `UserDefaults` `airbridge.trackingStopped` · Android `SharedPreferences` `airbridge_events/tracking_stopped`). 다음 실행은 `setAutoStartTrackingEnabled(!멈춤)`으로 시작해 실행 이벤트도 재지 않는다. SDK가 시작되지 않은 빌드에서는 아무것도 하지 않는다.
- **막지 못하는 것**: 표시를 켜기 **전에** 나간 이벤트 — 설치, 가입(`entry_completed` · `airbridge.user.signup`), 로그인 직후 식별. 시험 계정은 가입한 뒤에 표시를 켜므로 이 몫은 늘 남는다. 필요하면 PostHog 사람 · Airbridge 기기를 대시보드에서 지운다. 표시가 실리는 때는 D2와 같다(토큰 갱신 — 앱 재실행 또는 재로그인).
- 옛 호스트(이 메서드가 없는 빌드)에서는 JS 쪽만 동작한다(`setHostTrackingEnabled`가 `false`).

## 근거

- 티켓 · 잠금은 원래 기기에서 판정한다([ADR-0075](0075-learning-tickets.md) — 서버는 원장을 합칠 뿐). 표시를 믿어도 지금보다 약해지는 곳이 없다.
- 버린 대안: 공개 버킷의 사용자 목록(사용자 id가 공개된다) · 공유 계정 하나(진행 · 티켓 · 계정 삭제가 섞인다) · 서버 테이블 + RPC(강제할 서버 판정이 없어 이득 없이 요청만 는다).

## 대가

1. 판정 함수가 모듈 값을 읽어 순수하지 않다 — 테스트는 끝에 `setTesterAccessActive(false)`로 되돌린다.
2. 메인 스레드 첫 렌더에는 표시가 없다(배경 스레드 렌더 뒤에 맞춰진다).
3. ~~시험 계정의 이벤트는 일반 사용자와 같이 집계된다~~ → D4로 표시가 실린 뒤의 이벤트는 빠진다. 표시 전의 설치 · 가입은 남는다.
4. (D4) 멈춤은 기기에 기억된다. 시험 계정이 로그아웃하면 다시 켜지고, 그 기기에서 다른 계정이 로그인해도 첫 판정에서 켜진다 — 다만 그 첫 실행의 실행 이벤트는 빠진다.

## 재검토 조건

- 시험 계정의 이벤트를 따로 보고 싶을 때 — D4처럼 버리지 않고 `duru_tester` 속성을 실어 PostHog 「Filter out internal and test users」로 거르는 방식으로 바꾼다.
- 시험 계정이 많아져 관리 화면이 필요할 때.
