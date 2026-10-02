# 서버 푸시 알림 — iOS 수동 e2e

결정과 근거는 [ADR-0034](../adr/0034-server-push-notifications.md)다. 자동 계층(unit · ui · integration)이 지는 것은
권한 · 토큰 응답의 해석, 목적지 검증, 등록 · 해제 요청, 누른 알림의 화면 전환이고(`App.push.integration.test.tsx` IP1~IP6),
**시스템 다이얼로그 · 실제 토큰 · APNs 배달 · 알림 누름은 사람이 판정한다.** 자동 E2E: not applicable.

Android FCM 전송 계약은 [ADR-0041](../adr/0041-android-push-transport.md)에서 정한다. 현재 이 문서의 A·B 절차는 iOS용이다. Android 호스트 변경에서 Maestro 권한·알림 누름 흐름을 추가한다. 실제 FCM 발송은 Firebase 프로젝트·테스트 기기가 준비된 뒤 확인한다.

## 전제

- **A(발송 없이)** — 시뮬레이터 또는 실기. 서버 표(마이그레이션)가 적용돼 있다.
- **B(발송)** — **실기만**(시뮬레이터는 APNs 토큰을 받지 않는다). App ID의 Push Notifications 기능 · APNs 키 · `send-push`
  배포 · 시크릿이 끝났다(`apps/supabase-functions/README.md` 「send-push」).

## A. 권한 · 등록

| # | 조작 | 기대 | 결과 |
|---|---|---|---|
| A1 | 새 설치 → 로그인 → 언어 → 여정 입장의 시작 | 맵이 서고 그 위에 **시스템 알림 다이얼로그**가 한 번 뜬다 | 미실행 |
| A2 | A1에서 **허용** | (실기) 대시보드 `push_devices`에 행 하나 — `user_id`가 이 사용자, `environment`가 개발 서명이면 `sandbox` | 미실행 |
| A3 | 앱을 종료했다 다시 켠다 | 다이얼로그가 **뜨지 않는다**. (실기) 같은 행의 `last_active_at`이 갱신된다 | 미실행 |
| A4 | 설정 → `Notifications` | iOS 설정의 이 앱 페이지가 열린다. 돌아오면 설정 화면 그대로 | 미실행 |
| A5 | 새 설치에서 A1을 **허용 안 함** → 설정 → `Notifications` | 다이얼로그 없이 iOS 설정이 열린다 | 미실행 |
| A6 | (실기) 허용한 채 설정 → `Sign out` → 확인 | `push_devices`에서 그 행이 사라진다 | 미실행 |
| A7 | VoiceOver로 설정을 훑는다 | `User profile, 버튼` → `Notifications, 버튼` → `Privacy Policy, 버튼` → `Terms of Use, 버튼` | 미실행 |

## B. 발송 · 누름 (실기)

| # | 조작 | 기대 | 결과 |
|---|---|---|---|
| B1 | 앱을 백그라운드에 두고 공지를 보낸다(`target` `{kind: "notifications"}`) | 배너가 뜬다. 응답 `sent: 1` | 미실행 |
| B2 | B1의 배너를 누른다 | 앱이 앞으로 오고 **알림 목록**이 열린다(다른 탭에 있었어도) | 미실행 |
| B3 | 앱을 완전히 종료한 채 `{kind: "messenger", unitId: "appointment-confirmation"}`를 보내고 누른다 | 스플래시 → 세션 갱신 → **메신저 화면** | 미실행 |
| B4 | 앱이 앞에 있을 때 보낸다 | 배너가 앱 위에 뜬다. 누르면 B2와 같다 | 미실행 |
| B5 | `target` 없이 보낸다 | 누르면 여정 맵 | 미실행 |
| B6 | 앱을 지운 뒤 같은 토큰으로 보낸다 | 응답 `removed: 1`, 표에서 그 행이 사라진다 | 미실행 |
| B7 | `last_active_at`을 SQL로 3일 전으로 옮기고 `{kind: "reengagement", days: 3}`을 보낸다 | `Your Korean journey is waiting` 배너 → 누르면 여정 맵 | 미실행 |

## 실행 기록

| 날짜 | 기기 · 빌드 | 결과 | 실행자 |
|---|---|---|---|
| 2026-09-30 | iPhone 13 mini · main `8fb4b429` Debug(개발 서명, `--bundle-url=main.lynx`) → 같은 커밋 Release(개발 서명) 덮어 설치 · 운영 Supabase | **A1 · A2 통과** — 여정 시작에서 다이얼로그 → 허용 → `push_devices` 한 행(`sandbox`). **A3 통과** — Release로 다시 켜자 다이얼로그 없이 같은 토큰의 `last_active_at` 갱신. **B1 통과** — 이 계정에만 공지(`target` 알림 목록) → 응답 `sent: 1`, 배너 표시. **B3 통과** — 앱 종료 상태에서 메신저 목적지 공지 → 누르자 스플래시 → 메신저 화면. **B2 미확인**(첫 배너를 눌렀을 때 알림 목록이 열렸는지 기록 없음). ⚠ **Debug 빌드는 알림 누름으로 켜지면 흰 화면**이다 — `localhost:3000` 번들을 찾는다(푸시 문제 아님). B3은 Release 빌드로 판정한다. B4~B7 · A4~A7 미실행 | 루트 에이전트 · 사용자 |
