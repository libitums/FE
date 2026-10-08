# Android 푸시 호스트 E2E

[ADR-0042](../adr/0042-android-push-host.md)의 시스템 권한·알림 열기 경로를 전용 Android 15 API 35 에뮬레이터에서 Maestro로 검증한다. `google-services.json`과 실제 서버는 필요하지 않다. 모의 로그인 화면과 로컬 테스트 알림을 사용한다.

```sh
E2E_UDID=emulator-5556 pnpm test:e2e:android:push
```

스크립트는 390×844·160 dpi·글자 배율 1.0에서 모의 로그인 번들, Debug APK, 계측 APK를 빌드·설치하고 앱 데이터를 지운다. 설정의 `Notifications`를 눌러 Android 13+ 권한 대화상자를 허용한다. 다시 누르면 앱의 시스템 알림 설정이 열린다. 홈 화면에서 로컬 알림을 띄운 다음 알림을 눌러 앱의 Notifications 화면으로 돌아온다. 테스트 픽스처는 완료 후 종료한다.

2026-10-02 실행: 권한 대화상자, 앱 알림 설정, 로컬 알림 탭 뒤 화면 전이가 통과했다. Notifications 제목은 스크린샷에는 보였지만 이 에뮬레이터의 접근성 계층에서는 텍스트 노드가 노출되지 않아, Maestro는 해당 화면의 `Back to map` 접근성 버튼과 Settings 이탈을 판정한다. 수동 화면 확인도 함께 했다.

2026-10-02에는 별도 Android 계측 테스트 `LiveFcmTokenTest`로 Firebase 설정을 적용한 Google Play 에뮬레이터의 실제 토큰 발급과 브리지 반환을 확인했다. 원격 알림 수신은 아직 검증하지 못했다. 배경 data 메시지 전달, 앱 종료 뒤 탭, 로그아웃 후 해제는 서버 발송 권한을 준비한 뒤 Maestro로 검증한다. **토큰 갱신 후 재등록**은 2026-10-06에 아래 「토큰 갱신」 절이 가짜 HTTP 서비스로 **등록 요청이 나가는 것까지** 봤다 — 실 서버의 행이 새 토큰으로 바뀌는 것과 그 토큰으로의 원격 발송은 여전히 검증하지 못했다. 로컬 알림 흐름과 토큰 발급 검증을 실서비스 발송 검증으로 간주하지 않는다.

## 토큰 갱신 — `onNewToken` → 재등록 (작업 `android-push-token-refresh`)

FCM이 이 앱 프로세스에 새 토큰을 알리면(`DuruFirebaseMessagingService.onNewToken`) 살아 있는 `MainActivity`가 전역 이벤트 `pushTokenRefreshed`를 JS로 보내고, JS가 조용히(`ask: false`) 기기를 다시 등록하는지를 본다.
위 13행의 「토큰 갱신 후 재등록」은 이 작업 전의 코드에서는 **다음 부팅의 등록**일 수밖에 없었다(`onNewToken`이 없었다). 이 절이 보는 것은 그것이 아니라 **실행 중** 갱신이다 — 다음 부팅의 등록을 실제 회전으로 관찰한 기록은 여전히 없다(아래 「이 절차로 확인되지 않는 것」).
항목 정본은 작업의 test-plan `e2e`(T1 ~ T4)이고 이 절은 그 **절차**다. 결정과 남는 틈은 [ADR-0048](../adr/0048-android-push-token-refresh.md)이 진다.

**2026-10-06에 HEAD `bc9a091e` · API 37 Google Play 에뮬레이터(Pixel_8 AVD, 1080x2400 · 420 dpi) 한 대에서 실행했다.** 모든 요청은 가짜 HTTP 서비스가 받았다 — 실 서버에 닿은 실행은 없다. 아래 「실행 상태」의 「미실행」은 미실행이다. 실행하지 않은 것을 실행한 것처럼 읽지 않는다.

### 실행 상태

| 항목 | 무엇 | 기기 | 마지막 실행일 | 결과 |
|---|---|---|---|---|
| T1 | `deleteToken()` → `getToken()` 뒤 중계가 통지를 전달하고 뒤이은 `register`가 `fcm.` 토큰을 돌려준다 | Google Play 에뮬레이터 · API 37 | 2026-10-06 `bc9a091e` | **통과**(1회) — `INSTRUMENTATION_STATUS_CODE` `0`, `notified=2 tokenChanged=true`(자극은 「값이 바뀐」 회전이었다. 통지가 왜 2회였는지는 가리지 않았다). 대조로 `-e liveFcm` 없이 돌리면 `-4`(건너뜀) |
| T2 | 같은 자극 뒤 JS가 `register_push_device` 요청을 한 번 더 낸다 | Google Play 에뮬레이터 · API 37 | 2026-10-06 `bc9a091e` | **통과**(2회 · 같은 날 검증 실행 `a7178fe2` · `b721296b`에서 각 1회 더 — 두 번 모두 부팅 구간 등록 2 · 자극 뒤 등록 1 · `count_emit` 1) — 두 번 모두 자극 뒤 등록 요청 1건(`getToken ok=true` 뒤 3 ~ 5ms), `deleteToken` · `getToken` `ok=true`, 픽스처 코드 `0`. logcat에 `GlobalEventEmitter.emit.pushTokenRefreshed`가 등록 요청 직전에 찍혔다. 부팅 구간 등록은 두 번 모두 **2건**이었다(아래 T2의 주의). **요청의 본문은 보지 못했다** |
| T2 — 구현 전 | 결선 커밋(`704d56fc`)을 되돌린 빌드에서 같은 자극 | Google Play 에뮬레이터 · API 37 | 2026-10-06 (`bc9a091e`에서 `704d56fc` 되돌림) | **red 관찰(1회)** — 부팅 구간 등록 1건, 자극 성립(`deleteToken` · `getToken` `ok=true`), 50초 뒤까지 자극 뒤 등록 요청 0건. 설치한 APK의 서비스에 `onNewToken`이 없음을 `apkanalyzer`로 확인했다. FCM 호출 한도를 몰라 한 번만 돌렸다 |
| T3 | 로그아웃 상태에서 같은 자극 → 등록 요청 0 · 화면 변화 없음 · 다이얼로그 없음 | Google Play 에뮬레이터 · API 37 | 2026-10-06 `bc9a091e` · `b721296b` | **통과**(2회) — `bc9a091e`: 20초 창에 등록 요청 0, `getToken ok=true`, 같은 실행에서 `emit.pushTokenRefreshed` 1회(이벤트는 JS에 닿았다 — 이 수는 그 실행의 logcat을 손으로 grep해 얻었다), 포커스 `MainActivity`, 스크린샷 픽셀 동일 · UI 노드 동일. 그때 선 화면은 온보딩이었다. `b721296b`(검증 실행): **아래 절차를 `count_emit` 줄까지 적힌 그대로** 돌려 등록 0 · `count_emit` 1 · 포커스 `MainActivity` · 화면 픽셀 동일 · 노드 동일 · 픽스처 `OK (1 test)` |
| 늦게 성공한 등록의 해제([ADR-0048](../adr/0048-android-push-token-refresh.md) D5) | 등록 요청이 떠 있는 동안 로그아웃 · 계정 전환 → 뒤늦은 성공 뒤 `unregister_push_device` 1건 | — | — | **기기 미실행** — 이 절차의 가짜 서비스로는 일으킬 수 없다. 갱신 요청 말고는 전부 `404`를 주고(`SignedInScreenFixtureTest.java:76`) 요청마다 응답을 동기로 돌려줘 등록이 「떠 있는」 창이 없다. 지연을 넣거나 로그아웃을 끼워 넣는 수단도 없다. 이 동작의 근거는 vitest(`push-wiring.unit.test.ts`)뿐이다 |
| T4 | 회귀: `pnpm test:e2e:android:push` | **전용 에뮬레이터가 아니라** 같은 API 37 에뮬레이터(`emulator-5554`) | 2026-10-06 `bc9a091e` | **통과** — 종료 0, 두 Maestro 흐름의 전 단계 `COMPLETED`. 전용 에뮬레이터가 없어 T1 ~ T3과 같은 기기에서 돌렸다(아래 T4의 경고). 끝난 뒤 해상도 · 밀도 · 글꼴 배율 · `accelerometer_rotation`을 손으로 되돌렸다 |
| 계측 | `PushTokenRefreshHostTest`(IC1 · IC2) | API 37 · API 30(4 KB 페이지 AVD) | 2026-10-06 `bc9a091e`(API 37) · `704d56fc`(API 37 · API 30) · 검증 실행 `a7178fe2` · `b721296b`(API 37) | **통과** — 각 실행에서 코드 `0`이 2개, `-2` · `-4` 없음. 구분력: `MainActivity`의 `attach` 한 줄을 뺀 빌드(API 37)에서 IC1이 `-2`로 실패했다(변형 하나) |
| 일괄 회귀 | [출시 설정 절차](android-release-config.md) R8 ① | API 37 | 2026-10-06 `bc9a091e` · 검증 실행 `a7178fe2` · `b721296b` | 세 번 모두 `OK (43 tests)` — 통과 40 · 건너뜀 3 · 실패 0. `PushTokenRefreshHostTest` 2건이 일괄에 들어가고 `LiveFcmTokenTest` 2건은 `-e liveFcm` 없이 건너뛴다 |
| 로그아웃 해제(토큰 여럿) | T2 자극 뒤 설정에서 로그아웃 → `unregister_push_device` 요청 수 | Google Play 에뮬레이터 · API 37 | 2026-10-06 `bc9a091e` | **미실행(관찰 불가)** — 나간 요청은 `/auth/v1/logout` 1건뿐이고 `unregister_push_device`는 0건이었다. 가짜 서비스가 등록 RPC에 404를 줘 「등록 성공」 집합이 비어 있었을 것이다(**추론** — `push-wiring.ts`를 읽은 결과). 통과도 실패도 아니다. 이 동작을 덮는 것은 vitest(`push-wiring.unit.test.ts` · `App.push.integration.test.tsx`)뿐이다 |

**다시 실행하면 이 표를 같은 날 고친다**(날짜 · HEAD SHA · 기기 API · 결과). Firebase 설정(`google-services.json`)이나 Google Play 이미지가 없어 T1 ~ T3를 못 돌렸으면 「미실행 — 사유」로 적는다. 통과로 세지 않는다.

### 자극이 실제 토큰 회전을 얼마나 대표하나

실제 FCM 토큰 회전은 강제할 수 없다. 이 절은 `FirebaseMessaging.getInstance().deleteToken()` 뒤 `getToken()`으로 대신한다.

| 구간 | 근거 수준 | 비고 |
|---|---|---|
| SDK가 새 토큰을 받고 `NEW_TOKEN` 인텐트로 서비스의 `onNewToken`을 부른다 | **바이트코드 확인**(`firebase-messaging:25.1.3`의 `javap`, 작업 spec §3 F2 · F3 · F4 — 그 버전 한정) + **실측 1회**(T1, 2026-10-06 · API 37 — 통지가 왔다) | `deleteToken()`은 저장된 토큰을 지우므로 이어지는 `getToken()`은 「저장된 것이 없음」 조건으로 `blockingRegister`를 타고, 그 후속이 `invokeOnRegistrationChanged`로 `NEW_TOKEN`을 보낸다(F4 ①). SDK → 서비스 구간은 실제 회전과 같은 길이다 |
| 서버가 회전시키는 사건(7일 재등록이 다른 값을 줌 · FID 변경)이 같은 길을 탄다 | **바이트코드로 읽음. 그 사건을 일으켜 본 적 없음** | 같은 `blockingRegister` 후속이라는 읽기다. 실제 회전의 빈도 · 조건은 확인하지 못했다 |
| 새로 받은 값이 이전 값과 **실제로 다르다** | **실측 1회**(T1에서 `tokenChanged=true`). 매번 그런지는 **추론** — T2 · T3의 자극에서는 값을 비교하지 않았다 | T1이 `tokenChanged=true/false`를 logcat에 남긴다. `false`여도 통지는 「저장된 것이 없음」 조건으로 온다 — 그 경우 이 자극은 「값이 바뀐」 회전이 아니라 「다시 받은」 회전이다. 결과에 어느 쪽이었는지 적는다 |
| 서비스 → 중계 → `MainActivity` | **코드 확인 + 계측 IC1 · IC2**(아래 계측) | SDK를 건너뛰고 서비스 메서드를 직접 부른다 |
| `MainActivity` → `lynxView.sendGlobalEvent("pushTokenRefreshed")` → JS 리스너 → `syncPushDevice` | **코드 확인**(`pushNotificationOpened`와 같은 호출) · JS 쪽은 vitest · **실측 2회**(T2 — logcat의 송신 · JS 방출 줄과 뒤이은 등록 요청). **이어서 관찰하는 자동 테스트는 없다** — T2는 수동이다 | |

### 「JS까지 이벤트가 갔다」를 무엇으로 관찰하나

- **관찰 수단**: `SignedInScreenFixtureTest`의 가짜 HTTP 서비스(`AuthService`)가 요청마다 경로를 logcat에 남긴다. 앱이 `register_push_device`를 내면 `PushRefreshProbe … http /rest/v1/rpc/register_push_device` 줄이 **하나** 찍힌다. 그 줄의 수가 곧 요청 수다.
  이 줄은 JS가 이벤트를 받고 `syncPushDevice`가 `register` → RPC까지 갔다는 증거다.
- **이벤트가 JS에 닿았는지는 Lynx의 로그가 따로 보여 준다**(2026-10-06 실행에서 발견 — 이 절의 첫 판은 「그런 로그는 없다」고 적었고 틀렸다). `debug` 빌드 · Lynx 4.0.1 · API 37에서 전역 이벤트 하나에 logcat 줄 셋이 찍혔다:
  `LynxView sendGlobalEvent pushTokenRefreshed …`(태그 `LynxView`) → `LynxContext sendGlobalEvent pushTokenRefreshed …`(태그 `LynxContext`) → `call jsmodule:GlobalEventEmitter.emit.pushTokenRefreshed …`(태그 `lynx`).
  앞의 둘은 호스트가 보냈다는 것이고, 셋째가 JS 쪽 방출이다. 아래 「관찰 도구」의 `count_emit`이 셋째 줄을 센다. **이 줄은 Lynx 내부 로그다** — 다른 Lynx 버전 · `release` 빌드에서도 찍히는지는 보지 않았다. 줄이 없으면 「닿지 않았다」가 아니라 「이 수단으로는 모른다」로 읽고 등록 요청 줄로 돌아간다.
  셋째 줄은 JS 런타임이 방출을 받았다는 것까지다. 훅의 리스너가 불렸다는 것은 뒤이은 등록 요청(T2)이나 세션 판정에 막힌 0건(T3)으로 읽는다.
- **볼 수 없는 것**:
  - **요청의 본문**(`p_token` 값)과 헤더. 줄은 URL만 남긴다 — 「새 토큰으로 나갔다」는 보지 못한다. 요청이 하나 더 나갔다는 것까지다.
  - **실제 네트워크 요청.** 가짜 서비스가 호스트의 `LynxHttpService`를 대체한다. 요청은 기기 밖으로 나가지 않고 가짜 응답(RPC는 404)을 받는다. OkHttp · 프록시 · 모의 서버로 본 것이 아니다.
  - 요청이 **이 이벤트 때문에** 나갔는가는 시간 순서로만 안다: 자극 직전에 부팅 요청이 가라앉은 것을 확인하고(`wait_quiet`) logcat을 비운 뒤, 자극 뒤에 줄이 나타난다. 다른 등록 시점(R1 부팅 · R2 진입 흐름 끝 · R3 설정)은 이 절차에서 일어나지 않는다.
  - 실 서버의 `push_devices` 행. 이 절차에는 서버 · 테스트 계정이 없다.
- 모의 로그인 번들 + 가짜 HTTP는 `pnpm test:e2e:android:push`와 같은 방식이다(`https://example.invalid` · 가짜 refresh 200). 그 스크립트의 실행 경로(`SignedInScreenFixtureTest`)가 위 로그를 남긴다.

### 이 절차로 확인되지 않는 것

- **실 서버(Supabase)의 `push_devices` 행이 새 토큰으로 바뀌는 것.** 서버 · 테스트 계정이 없다. RPC는 가짜 서비스가 받는다. 요청이 서버에서 성공하는지(멱등 upsert · 다른 사용자 행 옮김)도 모른다.
- **실제 원격 발송이 새 토큰에 도착하는 것.** 이 저장소는 원격 발송 수신을 아직 검증하지 못했다(위 13행).
- **기기에서의 로그아웃 해제.** 한 실행에서 등록한 토큰이 여럿일 때 로그아웃이 각각을 떼는지는 이 절차로 볼 수 없다 — 가짜 서비스가 등록 RPC에 404를 돌려주므로 앱이 「등록 성공」으로 기억하는 토큰이 없다(위 「실행 상태」의 마지막 행). vitest가 덮는다.
- **권한 없음에서의 무요청.** T3은 권한을 허용해 두고 세션만 뺀다. 권한 판정이 막는 경우는 기기에서 보지 않는다(vitest가 본다).
- **앱이 떠 있지 않을 때의 회전.** `onNewToken`은 앱 프로세스 안의 SDK가 토큰을 다시 받을 때만 불린다(바이트코드). 이 절차의 자극도 프로세스가 살아 있는 상태에서만 준다. 프로세스가 죽어 있던 동안 바뀐 값이 다음 부팅의 등록으로 반영되는지는 이 절이 보지 않는다 — 그 경로를 실제 회전으로 관찰한 기록은 이 저장소에 없다.
- **FCM이 스스로 회전시키는 시점**(7일 경과 · 앱 버전 변경 · FID 변경)과 그 빈도. `deleteToken()`이 대신한다.
- **JS 런타임이 아직 없을 때(스플래시 전 · 번들 로드 중) 도착한 통지.** 이벤트는 쌓이지 않고 사라지는 것이 계약이다. 이 절차는 JS가 뜬 뒤에만 자극한다. 사라진 통지가 이후 R1 · R2에서 메워지는지는 보지 않는다.
- **실기.** 에뮬레이터(Google Play 이미지)만 쓴다. 제조사 스킨의 배터리 · 백그라운드 제한은 보지 못한다.
- **iOS.** 이 변경은 iOS를 바꾸지 않고 이벤트를 보내지 않는다.
- **등록 직후 같은 토큰에 대한 두 번째 요청이 서버에서 멱등으로 처리되는 것.**

### 전역 상태 영향 — 되돌릴 수 없다

- **이 절차는 기기의 FCM 토큰을 새로 발급시킨다**(`deleteToken()`). 되돌릴 수 없다 — 이전 토큰을 다시 얻는 길이 없다.
- 이전 토큰은 FCM에서 무효가 된다. 그 토큰을 서버에 등록해 둔 기기라면 그 행으로의 발송은 `UNREGISTERED`로 실패한다. **이 절차가 서버에 닿지는 않는다**(가짜 HTTP · 세션 없음) — 그러나 **이미 서버에 등록한 적이 있는 기기라면 그 행이 죽는다.** 그런 기기에서 돌리지 않는다. 이 절의 전용 에뮬레이터를 쓴다.
- 이어서 도는 다른 푸시 절차 · 계측은 새 토큰을 받는다. 특히 `LiveFcmTokenTest`는 토큰 값이 아니라 형식(`fcm\.[A-Za-z0-9_-]+`)만 보므로 영향이 없다. **토큰 값을 미리 적어 두고 쓰는 절차(원격 발송 시험)는 이 절 뒤에 값을 다시 읽어야 한다.**
- 연속으로 여러 번 돌려도 되는지(FCM 쪽 호출 한도)는 모른다. 한 번 돌릴 때마다 토큰이 바뀐다 — T1 · T2 · T3은 각각 한 번의 자극만 준다. 2026-10-06 실행에서는 3분 남짓 사이의 자극 5회(구현 전 T2 · T1 · T2 두 번 · T3)가 모두 성립했다 — 한도가 없다는 뜻이 아니다.
- **T4는 앱 데이터를 지우고(`pm clear`) 기기 설정 넷을 바꾼다**: `wm size 390x844` · `wm density 160` · `font_scale 1.0`(스크립트가 한다)과 **`accelerometer_rotation` `1` → `0`**(Maestro의 `Set orientation PORTRAIT` 단계가 한다 — 2026-10-06 실행에서 관찰). 스크립트는 어느 것도 되돌리지 않는다.
  화면 방향 절차([android-orientation.md](android-orientation.md))의 기본값(1080x2400 · 420 dpi · 자동 회전)을 전제하는 절차 앞에서 되돌려야 한다(아래 「끝난 뒤 되돌리기」).

### 전제

- **T1 ~ T3**: `apps/android/app/google-services.json`(패키지 `libitum.duru.android`)이 있어야 하고 **Google Play 이미지**이며 **API 33 이상**(`pm grant POST_NOTIFICATIONS`)인 에뮬레이터가 필요하다. 없으면 Firebase 앱이 없어 `register`가 토큰 없이 끝나므로 T1 · T2는 판정할 수 없다(미실행). 실제 서버 접근은 필요 없다.
- **T4 · 계측**: 번들 · Firebase · 네트워크 없이 돈다(T4는 Maestro가 필요하다).
- debug 빌드를 extra 없이 `am start`하면 `http://10.0.2.2:3000/main.lynx.bundle`을 읽는다. 이 절은 `am instrument`로 띄우고 `-e bundleUrl`을 준다. 손으로 앱을 다시 올릴 일이 생기면 `--es bundle-url http://10.0.2.2:18795/main.lynx.bundle`을 붙인다.
- **`pnpm verify`를 돌린 뒤에는 번들을 다시 만든다**(`pnpm bundle:android`). `pnpm verify`가 `apps/mobile/dist`를 모의 값 없는 번들로 덮어쓴다.

```sh
export PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools:$PATH"
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
ID="<adb devices 가 보여 준 Google Play 에뮬레이터 ID>"
A() { adb -s "$ID" "$@"; }    # 함수다 — `A shell …`로 부른다. 문자열 변수(`A="adb -s …"; $A shell …`)는 zsh에서 command not found가 난다
OUT=$(mktemp -d); echo "$OUT"
A shell getprop ro.build.version.sdk                   # 33 이상
A shell pm list packages | grep -c com.google.android.gms   # 1 — Google Play 서비스
```

### 이 절이 쓰는 계측 (커밋되어 있다)

T1 ~ T3의 관찰 · 자극 코드는 계측 APK 안에 있다. 손으로 고칠 파일이 없다.

- **`LiveFcmTokenTest#relayGetsNewTokenAfterDeleteToken`**(T1): `-e liveFcm true`가 없으면 건너뛴다(`-4`). 토큰 A를 받은 뒤 **자기 리스너를 중계에 붙여** 통지를 센다 — `MainActivity`의 리스너를 대체하고 되돌리지 않는다(끝에서 Activity를 닫으면 `onDestroy`의 `detach`는 자기 것이 아닌 리스너를 떼지 않으므로 상태가 남지 않는다). 이 케이스는 JS까지의 이어짐을 보지 않는다. `Tasks.await`는 테스트 스레드에서 부른다.
- **`SignedInScreenFixtureTest`**(T2 · T3): 옵션 없이 돌리면 기존 동작과 같다(세션 심기 · journey 화면 대기 · Maestro의 정지 브로드캐스트 대기). 더해진 것은 셋이다 — ① 가짜 HTTP 서비스가 요청의 **경로만** `PushRefreshProbe … http <경로>`로 logcat에 남긴다(호스트 · 쿼리 · 본문 · 헤더 · 토큰 값은 남기지 않는다). ② 픽스처가 떠 있는 동안에만 등록되는 수신기가 브로드캐스트 `com.libitum.host.test.ROTATE_FCM_TOKEN`을 받으면 앱 프로세스 안에서 `deleteToken()` → `getToken()`을 하고 `deleteToken ok=…` · `getToken ok=…`를 남긴다. ③ `-e noSession true`면 세션을 심지 않고 journey 화면 대기를 건너뛴다(T3).
- `apps/android/test-live-fcm-token.sh`는 기존 케이스(`#bridgeReturnsARealFcmRegistration`)만 돌린다 — 의미(실제 토큰 발급 확인)와 `OK (1 test)` 검사는 그대로다. T1 케이스는 아래처럼 직접 `am instrument`로 돌린다.

```sh
( cd apps/android && ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest )
A install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
A install -r apps/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
```

### 관찰 도구

T2 · T3가 쓴다. 셸 상태가 호출마다 이어지지 않으면(도구가 매번 새 셸을 연다) 한 호출 안에서 정의하고 쓴다.

```sh
probe_lines() { A logcat -d -s PushRefreshProbe:I | tr -d '\r' | grep PushRefreshProbe; }
# 등록 RPC 요청 수 — 마지막 `A logcat -c` 이후
count_reg() { probe_lines | grep -c 'rpc/register_push_device'; }
# JS 쪽 전역 이벤트 방출 수(Lynx 내부 로그 — 위 「JS까지 이벤트가 갔다」) — 마지막 `A logcat -c` 이후
count_emit() { A logcat -d | tr -d '\r' | grep -c 'GlobalEventEmitter.emit.pushTokenRefreshed'; }
# 패턴이 나타날 때까지 최대 $2 초
wait_line() { i=0; while [ "$i" -lt "$2" ]; do probe_lines | grep -q "$1" && return 0; sleep 2; i=$((i+2)); done; return 1; }
# 새 줄이 6초 동안 없을 때까지(부팅 요청이 가라앉음). 최대 $1 초
wait_quiet() { last=-1; same=0; i=0; while [ "$i" -lt "$1" ] && [ "$same" -lt 3 ]; do n=$(probe_lines | wc -l | tr -d ' '); if [ "$n" = "$last" ]; then same=$((same+1)); else same=0; fi; last=$n; i=$((i+2)); sleep 2; done; }
```

### 번들 — T2 · T3

```sh
# 저장소 루트에서. 실제 서버 주소가 번들에 들어가지 않게 모의 값으로 만든다
PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
python3 -m http.server 18795 --bind 0.0.0.0 --directory apps/mobile/dist >"$OUT/bundle-server.log" 2>&1 &
SRV_PID=$!
curl -sI http://localhost:18795/main.lynx.bundle | head -1    # 200
```

### T1 — 중계가 통지를 받는다 (SDK → 서비스 → 중계)

- **준비**: 위 빌드 · 설치. `A shell pm clear libitum.duru.android`(세션이 없어야 한다 — JS가 떠도 서버를 부르지 않는다).
- **자극**: 케이스 안에서 `register`로 토큰 A → 자기 리스너를 `attach` → `deleteToken()` 완료 대기 → `getToken()` 완료 대기 → 통지를 최대 20초 기다림 → 다시 `register`.
- **관찰**:

```sh
A logcat -c
A shell am instrument -w -r -e class com.libitum.host.LiveFcmTokenTest#relayGetsNewTokenAfterDeleteToken \
  -e liveFcm true libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner >"$OUT/t1.raw.log"
tr -d '\r' <"$OUT/t1.raw.log" | grep -E '^INSTRUMENTATION_STATUS_CODE:|^INSTRUMENTATION_STATUS: (test|stack)=|^OK|^FAILURES'
probe_lines | grep notified=
```

  `apps/android/test-live-fcm-token.sh`는 쓰지 않는다 — 그것은 기존 케이스 하나만 돌리고 `OK (1 test)`를 기대한다.
- **판정**: 테스트의 `INSTRUMENTATION_STATUS_CODE`가 **`0`**(시작의 `1`을 뺀 값). `-2`(실패)나 `-4`(`assumeTrue` 건너뜀 — `-e liveFcm true`를 빠뜨림)는 통과가 아니다. logcat에 `notified=N tokenChanged=…`가 있고 **N ≥ 1**. 뒤이은 `register`가 `fcm.` 토큰을 돌려줘 마지막 단언이 통과.
  `tokenChanged=false`면 그대로 적는다(자극이 「새 값」이 아니라 「다시 받음」이었다).
- **구현 전 기대**: red(통지 0 — `onNewToken`이 없던 기준선 `f4b35ef0`). **이 red는 관찰하지 않았다** — 구현 전 빌드로 돌린 것은 T2뿐이다. 지금 HEAD는 구현이 들어 있다.
- **이 항목이 보는 것 / 못 보는 것**: SDK가 실제로 `onNewToken`을 부르고 중계가 받는 것까지. JS · 요청은 보지 않는다.
- **판정의 한계 — `N ≥ 1`은 자극이 일으킨 통지만 세지 않을 수 있다**(리뷰 S2, **추론**). 준비의 `pm clear` 뒤 첫 토큰 발급도 통지를 낼 수 있어, 그 통지가 케이스의 리스너가 붙은 뒤에 오면 `deleteToken()`이 아무 통지를 일으키지 않아도 단언이 통과할 수 있다.
  2026-10-06 실행의 `notified=2`가 그런 통지를 포함했는지는 가리지 않았다. `deleteToken` 직전의 수와의 차이로 단언하도록 케이스를 고치는 것은 후속이다 — 그때까지 `tokenChanged=true`를 함께 본다(값이 바뀌었다는 것은 자극이 새 발급을 일으켰다는 쪽의 근거다).

### T2 — JS가 요청을 한 번 더 낸다 (중계 → 이벤트 → JS → RPC)

- **준비**: 위 빌드 · 설치 · 번들(`example.invalid` 모의 값) 서빙 · 앱 데이터 초기화와 알림 권한 허용(`pm grant`가 시스템 대화상자를 대신한다).
- **자극**: 가짜 로그인 픽스처가 떠서 앱이 앱 구간에 들어가 부팅 때 한 번 등록(R1)하고 가라앉은 뒤, 같은 앱 프로세스 안에서 `deleteToken()` → `getToken()`을 일으키는 브로드캐스트 하나.
- **관찰**:

```sh
A shell pm clear libitum.duru.android
A shell pm grant libitum.duru.android android.permission.POST_NOTIFICATIONS
A logcat -c
A shell am instrument -w -r -e class com.libitum.host.SignedInScreenFixtureTest \
  -e bundleUrl http://10.0.2.2:18795/main.lynx.bundle \
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner >"$OUT/t2-fixture.raw.log" 2>&1 &
FIX_PID=$!
# 전제: 부팅 등록이 한 번 나가야 한다 — 없으면 Firebase 설정이 없거나 JS가 뜨지 않은 것(T2 미실행)
wait_line 'rpc/register_push_device' 60 && echo "부팅 등록 확인" || echo "전제 불충족 — T2 미실행"
wait_quiet 40
echo "부팅 구간 등록 요청: $(count_reg)"
A logcat -c                                                     # 여기서부터 센다
A shell am broadcast -a com.libitum.host.test.ROTATE_FCM_TOKEN
wait_line 'getToken ok=' 60
probe_lines | grep -E 'deleteToken ok=|getToken ok='
wait_line 'rpc/register_push_device' 40
echo "자극 뒤 등록 요청: $(count_reg)"
echo "자극 뒤 JS 방출: $(count_emit)"
probe_lines                                                     # 증거로 붙인다
A logcat -d | tr -d '\r' | grep pushTokenRefreshed               # 송신 · 방출 줄 — 증거로 붙인다
A shell am broadcast -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE
wait "$FIX_PID"
```

- **판정**: 자극 뒤 `count_reg`가 **1 이상**이고(`logcat -c` 이후이므로 자극 뒤에 새로 나간 요청만 센다) `deleteToken ok=true` · `getToken ok=true` 두 줄이 있다. 둘 중 하나가 `false`면 자극이 서지 않은 것이므로 T2는 **미실행**이다(실패가 아니다).
  `count_emit`이 1 이상이면 이벤트가 JS에 닿았다는 것을 등록 요청과 따로 보인 것이다 — 결과에 함께 적는다. **통과 기준은 등록 요청이다.** `count_emit`이 0인데 등록 요청이 있으면 로그 수단이 듣지 않은 것으로 적고 통과로 판정한다.
- **부팅 구간 등록 요청은 1건일 수도 2건일 수도 있다.** 2026-10-06 실행에서 구현이 든 빌드는 두 번 모두 2건(수 ms 간격 — `…01.907` · `…01.911`)이었고 구현 전 빌드는 1건이었다.
  새로 `pm clear`한 앱의 첫 토큰 발급이 `onNewToken`을 불러 부팅 등록과 겹친 것으로 **추정한다 — 직접 가리지 않았다.** 아래 「같은 줄이 두 개 이상」이 허용하는 겹침이고 판정에 쓰지 않는다. 0건이면 전제 불충족이다(「알려진 어긋남」).
  `wait "$FIX_PID"` 뒤 `$OUT/t2-fixture.raw.log`의 `INSTRUMENTATION_STATUS_CODE`가 `0`이어야 픽스처가 정상 종료한 것이다.
- **구현 전**: red를 **1회 관찰했다**(2026-10-06 — 추가 0. `getToken ok=true`가 찍혀도 50초 뒤까지 등록 줄이 없었다). 결선 커밋을 되돌린 빌드는 서비스에 `onNewToken`이 없어 JS까지 아무것도 가지 않는다.
- **같은 줄이 두 개 이상 나올 수 있다**: 통지가 오는 순간 진행 중이던 등록과 이벤트가 부른 등록이 겹칠 수 있고 계약이 이를 허용한다(RPC는 멱등 upsert). 「정확히 1」로 판정하지 않는다 — 1 이상이다.
- **볼 수 없는 것**: 요청이 새 토큰을 싣고 나갔는가(본문 로그 없음) · 서버의 행.

### T3 — 로그아웃 상태에서는 요청도 화면 변화도 없다 (AC3)

- **준비**: T2와 같다. 단 세션을 심지 않는다(`-e noSession true`). 알림 권한은 **허용해 둔다** — 권한 판정이 아니라 세션 판정이 요청을 막는지 보려는 것이다.
- **자극**: T2와 같은 브로드캐스트.
- **관찰**:

```sh
A shell pm clear libitum.duru.android
A shell pm grant libitum.duru.android android.permission.POST_NOTIFICATIONS
A logcat -c
A shell am instrument -w -r -e class com.libitum.host.SignedInScreenFixtureTest -e noSession true \
  -e bundleUrl http://10.0.2.2:18795/main.lynx.bundle \
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner >"$OUT/t3-fixture.raw.log" 2>&1 &
FIX_PID=$!
sleep 15                                                        # 세션 없는 첫 화면이 서기를 기다린다(눈으로 확인한다)
A exec-out screencap -p >"$OUT/t3-before.png"
A shell uiautomator dump /sdcard/t3-before.xml >/dev/null; A pull /sdcard/t3-before.xml "$OUT/t3-before.xml" >/dev/null
A logcat -c
A shell am broadcast -a com.libitum.host.test.ROTATE_FCM_TOKEN
wait_line 'getToken ok=' 60
sleep 20                                                        # 「요청 없음」은 창을 정해 본다 — 20초
A exec-out screencap -p >"$OUT/t3-after.png"
A shell uiautomator dump /sdcard/t3-after.xml >/dev/null; A pull /sdcard/t3-after.xml "$OUT/t3-after.xml" >/dev/null
echo "등록 요청: $(count_reg)"; probe_lines
echo "JS 방출: $(count_emit)"                                   # 1 이상이어야 「가드가 막았다」로 읽는다
A shell dumpsys window | grep -E 'mCurrentFocus|mFocusedApp' | head -3
cmp "$OUT/t3-before.png" "$OUT/t3-after.png" && echo "화면 동일(픽셀)" || echo "화면 다름 — 눈으로 비교한다"
sed 's/ bounds="[^"]*"//g' "$OUT/t3-before.xml" | diff -q - <(sed 's/ bounds="[^"]*"//g' "$OUT/t3-after.xml") && echo "노드 동일"
A shell am broadcast -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE
wait "$FIX_PID"
```

- **판정**: `count_reg`가 **0**, `getToken ok=true`, 포커스 창이 앱의 `MainActivity`(권한 대화상자 `GrantPermissionsActivity`가 아님), 자극 전후 화면이 같다(세션이 없을 때 서는 화면 — 2026-10-06 실행에서는 온보딩이었다). 화면 비교는 상태바 시계 때문에 픽셀이 달라질 수 있어 노드 비교와 눈 확인을 함께 쓴다.
  `diff -q <(…)`는 bash · zsh 전용이다(`sh`가 아니다).
- **구현 전에도 green(가드)이다.** 이벤트가 오지 않아도 요청은 0이므로 **등록 요청 수만으로는 「가드가 이벤트를 막았다」와 「이벤트가 애초에 오지 않았다」를 가르지 못한다.**
  **`count_emit`이 그것을 가른다**: 자극 뒤 `count_emit`이 1 이상이면 이벤트는 JS에 닿았고 요청이 0인 것은 세션 판정이 막은 것이다(2026-10-06 실행 두 번 모두 방출 1 · 등록 0 — 첫 번은 logcat을 손으로 grep한 값이고, 둘째(`b721296b`)는 이 절차의 `count_emit` 줄이 낸 값이다). `count_emit`이 0이면 이 실행의 0건은 뜻이 없다 — T2가 같은 환경에서 이벤트가 닿는다는 것을 보여 준 경우에만 가드로 읽고, 그렇게 읽었다고 적는다.
- 볼 수 없는 것: 가짜 HTTP 서비스가 모든 요청을 보지만 등록 말고 다른 요청(분석 · 초기 데이터)이 보일 수 있다 — 그것은 판정에 쓰지 않는다. `count_reg`는 `rpc/register_push_device`만 센다.

### T4 — 회귀: 기존 권한 · 설정 · 로컬 알림 탭 흐름

```sh
E2E_UDID=emulator-5556 pnpm test:e2e:android:push     # 전용 에뮬레이터. Maestro 필요
echo "exit=$?"
```

- **판정**: 종료 코드 0(스크립트가 `set -e`이고 마지막에 `OK (1 test)`를 grep한다). 위 13행이 적은 흐름 — 권한 대화상자 허용 · 앱 알림 설정 · 로컬 알림 탭 뒤 화면 전이 — 이 그대로 통과한다.
- **이 항목이 보는 것**: 새 `onNewToken` · 중계 · 훅 추가가 기존 알림 흐름을 깨지 않았는가. **갱신 경로 자체는 지나지 않는다**(가짜 번들에 Firebase가 없고 이 흐름은 `deleteToken`을 부르지 않는다).
- **전역 영향**: 앱 데이터를 지우고 해상도 · 밀도 · 글꼴 배율 · 자동 회전(`accelerometer_rotation`)을 바꾼다(위 「전역 상태 영향」). 같은 계측 APK를 `install -r`로 덮어쓰므로 T2 · T3 사이에 돌리지 않는다.
- ⚠ **전용 에뮬레이터가 없으면 이 영향이 T1 ~ T3의 에뮬레이터에 닿는다.** 명령의 `emulator-5556`은 머리말의 전용 Android 15 에뮬레이터다. 그것이 없어 Google Play 에뮬레이터 하나로 겸하면(2026-10-06 실행이 그랬다 — `E2E_UDID=emulator-5554`)
  그 기기의 앱 데이터(세션 · 저장된 진행)가 지워지고 화면이 390x844 · 160 dpi로 남는다. **T1 ~ T3과 다른 절차가 끝난 뒤 마지막에 돌리고**, 돌리기 전에 `A shell settings get system accelerometer_rotation`의 값을 적어 둔 뒤 끝나면 「끝난 뒤 되돌리기」를 한다.
  그 기기에 지우면 안 되는 앱 상태가 있으면 T4를 돌리지 않고 미실행으로 적는다.

### 계측 `PushTokenRefreshHostTest` — 실행법

`apps/android/app/src/androidTest/java/com/libitum/host/PushTokenRefreshHostTest.java`(2건)는 실제 `MainActivity`가 `PushTokenRefreshRelay.PROCESS`에 붙고 떼이는 것(IC1)과, SDK 없이 서비스의 `onNewToken`을 다른 스레드에서 불러도 호스트가 멀쩡한 것(IC2)을 본다.

- **번들 · Firebase 설정 · Google Play 서비스 · 네트워크가 필요 없다.** `-e bundleUrl`을 주지 않는다(앱이 기본 번들 주소를 읽다 실패해도 이 두 케이스는 상관없다).
- **앱 저장소(`duru-storage`, 세션 포함)를 비웠다가 `@After`에서 복원한다.** 통지가 JS까지 가도 서버를 부르지 않게 하려는 것이다. 토큰 · 권한 · 기기 설정은 바꾸지 않는다.
- **건너뛰는 케이스는 없다.** 건너뜀이 생기면 기본 출력의 `OK (2 tests)`에 섞여 보이지 않으므로 `-r`로 돌려 코드를 센다. **`am instrument`는 테스트가 실패해도 종료 코드가 0이다 — 종료 코드로 판정하지 않는다.**
- IC2는 Activity가 5초 동안 살아 있는지를 보므로 5초 이상 걸린다.

```sh
( cd apps/android && ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest )
A install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
A install -r apps/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
A shell am instrument -w -r -e class com.libitum.host.PushTokenRefreshHostTest \
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner >"$OUT/ic.raw.log"
# 테스트별 최종 코드 — 시작(1)을 뺀다. 0 통과 · -2 실패 · -4 건너뜀
tr -d '\r' <"$OUT/ic.raw.log" | awk '/^INSTRUMENTATION_STATUS: test=/{t=$0} /^INSTRUMENTATION_STATUS_CODE:/{print t, $0}' | grep -v ' 1$'
tr -d '\r' <"$OUT/ic.raw.log" | grep '^INSTRUMENTATION_STATUS_CODE:' | grep -v ': 1$' | sort | uniq -c
```

| 기대 | 통과 기준 |
|---|---|
| 2건 | 코드 집계가 **`0`이 2개**, `-2` · `-4`가 0개. 이름은 `IC1_relayDeliversWhileMainActivityIsAliveAndStopsAfterItIsDestroyed` · `IC2_onNewTokenOnAnotherThreadNeverThrowsAndLeavesTheActivityAlive` |

- 실패하면 `test=` 이름과 `stack=`을 붙인다. IC1이 `detach missing`으로 실패하면 `MainActivity.onDestroy`의 `detach`가 빠진 것이다.
- **이 계측이 보지 못하는 것**: 이벤트가 JS 리스너에 닿는 것. `notifyRefreshed() == true`(중계가 Activity 리스너에 전달했다)까지다.

### 끝난 뒤 되돌리기

```sh
# 번들 서버 · 앱
A shell am force-stop libitum.duru.android
kill "$SRV_PID" 2>/dev/null                                      # 번들 서버. 셸이 바뀌었으면 18795 포트의 python3 를 찾아 끈다
```

- **FCM 토큰은 되돌릴 수 없다**(위 「전역 상태 영향」). 같은 기기에서 앞서 서버에 등록해 둔 토큰이 있었다면 그 행은 죽었다.
- **T4를 돌렸다면 화면 설정 넷을 되돌린다.** 스크립트는 되돌리지 않는다. `accelerometer_rotation`은 T4 앞에서 읽어 둔 값으로 되돌린다(아래의 `1`은 에뮬레이터 기본값이다 — 앞의 값이 `0`이었으면 `0`으로 둔다).

```sh
A shell wm size reset
A shell wm density reset
A shell settings put system font_scale 1.0
A shell settings put system accelerometer_rotation 1             # T4 앞의 값으로. Maestro 의 `Set orientation PORTRAIT`가 0으로 바꾼다
A shell settings get system accelerometer_rotation               # 확인 — 넣은 값과 다르면 위의 put 을 한 번 더 한다
```

- ⚠ **마지막 `get`이 넣은 값과 다르면 `put`을 한 번 더 하고 다시 확인한다.** 2026-10-06 검증 실행(HEAD `a7178fe2` · API 37)에서 이 블록을 세 번 돌렸고, 그중 한 번은 `put … 1` 직후의 `get`이 `0`이었으며 8초 뒤에도 `0`이었다.
  다시 `put`하자 `1`이 됐다. **원인은 가리지 못했고 재현되지 않았다** — 명령의 결함인지 에뮬레이터 쪽의 다른 쓰기인지 모른다.

- T4가 지운 앱 데이터(`pm clear`)는 되돌릴 수 없다.
- `google-services.json`은 추적하지 않는 파일이다. 이 절차가 만들지도 지우지도 않는다.

### 알려진 어긋남 · 막힐 곳

- **T1의 `Tasks.await`는 메인 스레드에서 부를 수 없다.** T1 케이스는 테스트 스레드(메인이 아님)에서 부른다. 다른 곳에 옮겨 붙이면 `IllegalStateException`이 난다.
- **T1이 `MainActivity`의 중계 리스너를 대체하므로 같은 케이스에서 JS 반응을 볼 수 없다.** JS 반응은 T2의 몫이다.
- T2의 `wait_quiet`는 「6초 동안 새 줄이 없음」을 부팅이 끝난 것으로 본다. 느린 에뮬레이터에서 부팅 등록이 그 뒤에 오면 그 요청이 자극 뒤 요청으로 센다 — 자극 전 `count_reg`(「부팅 구간 등록 요청」)가 0이면 이 가능성이 높으므로 전제 불충족으로 다시 한다. 1건과 2건은 둘 다 정상 범위다(T2의 주의).
- T2의 요청 수는 `logcat` 버퍼에서 읽는다. 버퍼가 작거나 다른 앱이 로그를 쏟으면 줄이 밀려날 수 있다 — `A logcat -G 16M`으로 키운다.
- `getToken ok=true`가 찍힌 뒤 등록 요청까지는 2026-10-06 실행 두 번에서 3ms · 5ms였다(API 37 에뮬레이터 한 대 — 다른 기기의 값은 모른다). T2는 최대 40초를 기다리고, T3의 「요청 없음」은 20초 창이다 — 더 늦게 오는 요청은 보지 못한다.
- `count_emit`이 세는 줄은 Lynx 내부 로그라 Lynx 버전이나 로그 수준이 바뀌면 사라질 수 있다. 그때는 등록 요청 줄만으로 판정하고 T3의 0건을 다시 「T2에 기대는 가드」로 읽는다.
- 이 절의 계측 · 명령은 2026-10-06에 API 37 에뮬레이터에서 적힌 대로 돌았다(위 「실행 상태」). 그 뒤에 더한 명령도 같은 날의 검증 실행 두 번(HEAD `a7178fe2` · `b721296b`, API 37)에서 기기에서 돌았다:
  - **T2의 `count_emit`**: 두 실행 모두 적힌 대로 돌았고 `1`을 냈다(부팅 구간 등록 2 · 자극 뒤 등록 1 · `count_emit` 1).
  - **T3의 `count_emit` 줄**: `b721296b`에서 적힌 그대로 돌았다(등록 0 · `count_emit` 1 · 화면 동일). 이 절의 앞선 판은 「실행된 적이 없다」고 적었다 — 그 실행으로 낡았다.
  - **되돌리기 블록**(`accelerometer_rotation` 두 줄 포함): `a7178fe2`에서 T4가 남기는 상태를 손으로 만든 뒤 세 번 돌렸다. 두 번은 바로 복귀했고 한 번은 위 「되돌리기」의 주의대로였다.
  - 두 검증 실행은 T1 · T4를 다시 돌리지 않았다. T3은 `a7178fe2`에서는 돌지 않았다.
  어긋나면 명령을 고치고 「실행 상태」에 적는다.
