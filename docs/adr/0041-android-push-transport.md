# ADR-0041 — Android 푸시 전송 계약

- 상태: 채택 (2026-10-02). [ADR-0034](0034-server-push-notifications.md)의 Android 재검토 조건을 이행한다.
- 범위: 기기 등록 계약, SQL 확장, `send-push`의 FCM HTTP v1 전송. Android 호스트와 실제 Firebase 프로젝트 연결은 별도 변경이다.

## 결정

기존 `push_devices` 표와 `register_push_device(p_token, p_environment)`·`unregister_push_device(p_token)` RPC를 그대로 쓴다. `environment`의 `sandbox`·`production`은 APNs이고, 새 `fcm`은 Android 전송이다. 기존 iOS 행은 마이그레이션 뒤에도 유효하다. 토큰과 환경의 짝은 표의 CHECK 제약으로 검사한다.

FCM 등록 토큰은 불투명 문자열이므로 `fcm.` + UTF-8 바이트의 패딩 없는 base64url 형태로 저장한다. 앱은 이 저장 토큰을 RPC에 보내고 로그아웃 때 같은 값을 해제한다. 서버는 발송 직전에 원래 토큰으로 되돌린다. 이 형태는 PostgREST의 삭제 필터에도 안전하다. APNs 토큰은 기존 16진수 형태를 유지한다.

`send-push`는 기기를 한 번 조회하고 각 환경으로 발송한다. APNs는 현재 ES256 JWT 경로를 유지한다. FCM은 서비스 계정으로 RS256 OAuth assertion을 만들고 발송 회차당 짧은 수명의 access token 하나를 얻어 HTTP v1 `messages:send`를 부른다. 제목·본문·닫힌 목적지를 높은 우선순위의 data 메시지에 문자열로 보낸다. Android의 `FirebaseMessagingService`가 전경·배경에서 `duru-updates` 채널로 알림을 즉시 만든다. 알림 탭은 비공개 Activity를 통해서만 목적지를 전달한다. FCM이 `UNREGISTERED`를 명시한 404만 해당 토큰을 지운다. `INVALID_ARGUMENT`는 본문 오류일 수도 있어 지우지 않는다.

`FIREBASE_SERVICE_ACCOUNT_JSON`은 선택적 서버 시크릿이다. 없으면 APNs는 계속 발송되고 FCM 대상만 실패 수에 들어간다. 설정한 JSON의 형식이 틀리면 전체 함수가 구성 오류를 낸다. 실제 발송에는 Firebase 프로젝트·Android 앱 등록·FCM HTTP v1 권한·서비스 계정 키가 필요하다. 키 파일은 저장소에 커밋하지 않는다.

배포 순서는 추가 마이그레이션 → Edge Function → Android 호스트다. 호스트가 아직 없으므로 이 변경의 E2E 대상은 없다. 호스트 변경에서 Maestro로 권한·알림 열기를 검증하고, 실제 외부 발송은 Firebase 설정 후 별도 확인한다.
