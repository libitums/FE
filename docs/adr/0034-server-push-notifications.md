# ADR-0034 — 서버 푸시 알림 (기기 등록 · 다시 돌아오기 · 운영 공지 · 누르면 정해진 목적지)

Android의 FCM 전송 확장은 [ADR-0041](0041-android-push-transport.md)에 기록한다. 아래 결정은 iOS APNs 경로의 원래 계약이다.

- 상태: **제안** — 종류와 누름 동작은 사용자 결정이다(2026-09-30). APNs 키 · App ID 기능이 준비되기 전이라 실제 발송을
  확인하지 않았다.
- 날짜: 2026-09-30
- 다루는 축: **호스트 네이티브 능력**(ADR-0017 — 열째 모듈) · **권한**(ADR-0026 — 셋째 권한) · **들어오는 입구**(ADR-0012 D2 ·
  ADR-0026 D4 — 딥링크 금지의 경계) · **서버 저장**(첫 앱 표)
- 부분 대체:
  - [ADR-0001](0001-repository-goal-and-scope.md)의 범위 밖 표 「푸시」 한 항목과 [ADR-0012](0012-native-host-app-minimal.md) D2 「하지 않는 일」의
    **`푸시`** 한 항목. **딥링크 금지는 그대로 산다**(D4).
- 적용 기록(결정을 바꾸지 않는다):
  [ADR-0026](0026-permission-entry-conditions-and-denial-handling.md) D2 — 권한 표에 **알림** 행. D4 — 나가는 목적지 「이 앱의 설정
  페이지」를 두 번째 소비자(설정의 `Notifications`)가 쓴다.
  [ADR-0032](0032-account-sign-out-and-deletion.md) D2 — 계정을 지우면 기기 행도 CASCADE로 지워진다(함수는 표를 모른다).
  [ADR-0029](0029-product-analytics-posthog.md) — 이벤트 이름 둘(`push_notification_opened` · `notification_settings_opened`).

## 사용자 결정 (2026-09-30, 다시 묻지 않는다)

| # | 물음 | 결정 |
|---|---|---|
| U1 | 무엇을 보내나 | **다시 돌아오기**와 **운영 공지 · 새 에피소드**. 매일 학습 리마인더는 **일단 뺀다** |
| U2 | 방식 | **서버 푸시**(APNs). 기기 안 예약 알림이 아니다 |
| U3 | 누르면 | **알림별 화면**으로 간다 |
| U4 | 언제 묻나 | **진입 흐름**에서 묻는다 |

## 결정

### D1. 기기 한 대 = `push_devices` 한 행이고, 앱은 RPC 둘로만 닿는다

- 마이그레이션 `apps/supabase-functions/supabase/migrations/20260930120000_push_devices.sql`. 열: `token`(PK · 16진수) ·
  `user_id`(→ `auth.users`, **CASCADE**) · `environment`(`sandbox` · `production`) · `last_active_at` · `created_at`.
- **RLS를 켜고 정책을 두지 않는다.** 앱은 `register_push_device(p_token, p_environment)` · `unregister_push_device(p_token)`
  (둘 다 `security definer`, `auth.uid()` 기준)만 부르고, 표를 읽을 길이 없다. 발송 함수는 service role로 읽는다.
- **같은 토큰이 다른 사용자에게 묶여 있으면 새 사용자로 옮긴다** — 한 기기에서 계정을 바꾸면 알림은 지금 로그인한 사람에게만 간다.
- **등록이 곧 활동 기록이다.** 앱이 로그인한 채 켜질 때마다(이미 허용했으면) 등록을 다시 부르고, 그때 `last_active_at`이
  갱신된다. 학습 진행은 여전히 기기에만 있다(ADR-0007 D1) — 서버가 아는 것은 「마지막으로 앱을 연 때」뿐이다.

### D2. 호스트 모듈 `PushNotificationModule` — 메서드는 **넷**

| 메서드 | 하는 일 |
|---|---|
| `getStatus(callback)` | 권한만 읽는다(`not-determined` · `denied` · `authorized` · `provisional`). 다이얼로그 없음 |
| `register(callback)` | **미요청일 때만** 묻는다. 허용이면 `registerForRemoteNotifications` → 토큰(제한 10초) · 환경을 돌려준다 |
| `takeOpened(callback)` | 누른 알림의 `target`을 **한 번** 꺼낸다 |
| `openSettings()` | 이 앱의 iOS 설정 페이지(ADR-0026 D4의 목적지 그대로) |

- 토큰 환경은 **서명이 가른다** — `embedded.mobileprovision`의 `aps-environment`가 `development`면 `sandbox`, 파일이 없으면(App
  Store · TestFlight) `production`. 빌드 구성으로 가르면 Release 구성을 개발 서명으로 올린 기기가 틀린다.
- 엔타이틀먼트 `aps-environment = development`. 배포 서명은 내보낼 때 `production`으로 바뀐다.
- **ADR-0017 D1 입장 조건 셋**: (1) 제품 요구(U1~U3) — 능력 없이는 알림이 없다. (2) 대체 경로 0개 — Lynx에 APNs 등록 · 알림
  응답 API가 없다. (3) `docs/e2e/push-notifications.md`에 사람이 판정할 항목으로 적었다.

### D3. 누르면 **정해진 목적지**로 간다 — URL이 아니다

- APNs 본문의 최상위 `target` 사전 하나: `{kind: "journey-map" | "notifications" | "roleplay-list"}` 또는
  `{kind: "messenger" | "phone-call" | "visual-novel", unitId}`. 알림 목록 항목의 목적지 넷(`NotificationTarget`)에 둘을 더한
  `PushNotificationTarget`이다.
- 앱은 `app/push-target.ts`가 **이 앱에 있는 유닛 ID만** 받는다(표가 유닛 타입의 모든 값을 키로 가져 컴파일이 지킨다). 모르는
  목적지 · 없는 유닛은 **아무 데도 가지 않고** 이벤트도 내지 않는다. 빈 사전은 여정 맵이다.
- 호스트는 목적지를 **꺼낼 때까지** 든다. 앱은 **앱 구간**(진입 흐름이 끝난 뒤)에서만 꺼낸다 — 알림을 눌러 앱이 켜지면
  스플래시 · 세션 갱신 뒤 여정에 들어서는 순간 열린다. 켜진 채 누르면 호스트가 전역 이벤트 `pushNotificationOpened`로
  알리고, 앱은 같은 `takeOpened`로 꺼낸다(목적지를 싣는 자리가 하나다).
- 이동: 여정(롤플레이 목록이면 롤플레이) 탭을 루트로 접고 → 목적지. 특별 유닛은 알림 항목과 **같은 여정 콜백**을 부른다.

**ADR-0026 D4의 표로 알림 누름을 읽는다.**

| | 딥링크 (**여전히 금지**) | 알림 누름 (**이 ADR이 여는 것**) |
|---|---|---|
| 등록이 필요한가 | 그렇다(URL scheme · associated domains) | **아니다** — 아무것도 등록하지 않는다 |
| 누가 보낼 수 있나 | 누구나(링크를 만들면 된다) | **우리 APNs 키를 가진 서버만** |
| 목적지 | 임의 경로 | **닫힌 목록 여섯** — 앱이 다시 검증한다 |
| 앱 안 상태 | 링크가 화면 인자를 싣는다 | 유닛 ID 하나뿐 — 여는 방식은 알림 항목과 같다 |

### D4. 권한은 **진입 흐름의 끝**에서 묻고, 설정에서 다시 닿는다

- 여정 입장의 시작 버튼 → `enterApp` → **시스템 다이얼로그**(맵 위에 뜬다). 앱이 답을 기다리지 않는다. 앞에 우리 화면을 한
  장 더 두지 않았다(대가 — 거절률이 오를 수 있다).
- 부팅 때는 **묻지 않는다** — 이미 허용한 설치만 조용히 토큰을 올린다.
- 설정의 이동 항목 `Notifications`(계정 묶음, 프로필 다음): 미요청이면 묻고, 물었으면(허용 · 거부 모두) iOS 설정을 연다 — 끄는
  길도 거기다. 스택에 쌓이지 않는다.
- 로그아웃은 이 실행에서 등록한 토큰을 먼저 뗀다(`unregister_push_device`). 계정 삭제는 CASCADE가 지운다.
- **알림은 아무것도 막지 않는다** — 모든 실패를 삼키고, 로그인 · 화면 전환이 기다리지 않는다.

### D5. 발송은 Edge Function `send-push` 하나다

- `POST /functions/v1/send-push`, `Authorization: Bearer <service role 키>`(함수가 직접 비교 — `verify_jwt = false`).
- 본문 둘: `{kind: "reengagement", days: 3 | 7}`(문구는 함수가 든다) · `{kind: "announcement", audience: "all" | {userIds},
  title, body, target?}`(목적지가 없으면 여정 맵).
- 대상 조회는 PostgREST(service role), 다시 돌아오기는 RPC `reengagement_devices(p_days)` — 사용자의 **가장 최근**
  `last_active_at`이 정확히 `p_days`일 전 하루 안에 든 사용자. 하루 한 번 부르면 한 사람이 같은 날 수에 두 번 걸리지 않는다
  (3일에 한 번, 7일에 한 번, 그 뒤로는 없다).
- APNs는 토큰 인증(ES256, 발송 한 번에 JWT 하나) · 환경별 호스트 · 동시에 20. `410` · `BadDeviceToken` ·
  `DeviceTokenNotForTopic` · `Unregistered`면 그 토큰을 표에서 지운다. 응답은 `{devices, sent, failed, removed}`.
- 예약은 `pg_cron` + `pg_net`이 매일 10:00 UTC에 3일 · 7일을 부른다(`supabase/cron/reengagement.sql` — 마이그레이션이 아니다.
  service role 키를 Vault에서 읽는다).
- 운영 공지는 관리 화면 없이 **함수 호출**로 보낸다(README에 예시). 문구는 영어다 — 서버가 사용자의 UI 언어를 모른다.

## 버린 대안

- **기기 안 예약 알림(로컬)만** — 운영 공지를 보낼 수 없다(U2).
- **URL scheme · universal link로 목적지** — 누구나 앱 안 경로를 여는 입구가 생긴다(ADR-0012 D2).
- **우리 화면으로 먼저 묻기(프리 프롬프트)** — 화면 · 문구 · 디자인이 한 장 더 필요하다. 거절률이 문제가 되면 연다.
- **FCM · OneSignal 같은 중계** — 의존 · 계정 · 개인정보 처리자가 는다. iOS만 있어 APNs 직접으로 충분하다.
- **학습 진행을 서버로 옮겨 쉰 날 수를 정확히** — 진행 저장 축(ADR-0007 D1)을 여는 큰 결정이다. 「앱을 연 때」로 충분하다.

## 대가

- **APNs 키(.p8) · App ID의 Push Notifications 기능이 필요하다** — 개인 개발자 계정의 주인 몫이다. 기능을 켜기 전에는 **실기
  빌드의 서명이 실패한다**(엔타이틀먼트가 생겼다). 시뮬레이터는 영향이 없다.
- 「쉰 날」은 **앱을 연 날** 기준이다 — 열기만 하고 학습하지 않은 사람에게는 가지 않는다.
- 로그아웃 뒤 이 실행에서 등록하지 않은 토큰(앱을 재실행한 뒤 바로 로그아웃)은 떼지 못할 수 있다 — 부팅의 조용한 등록이
  토큰을 기억하므로 허용한 설치에서는 드물다. 남으면 다음 로그인이 새 사용자로 옮긴다.
- 알림 문구가 영어뿐이다.

## 재검토 조건

- 매일 리마인더를 다시 넣을 때(U1) — 시각 · 시간대 저장과 분 단위 예약이 는다.
- 목적지를 하나 더할 때 — `PushNotificationTarget`에 더하고, 앱 · 함수 양쪽 검증을 함께 고친다.
- Android 호스트가 설 때 — FCM이 필요하고, 표의 `environment` 열이 플랫폼을 가려야 한다.
