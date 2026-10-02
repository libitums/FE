# Android Apple 계정 삭제 재인증 — API 35 에뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-10-01 KST.
- 상태: 미측정 — 실제 Apple 계정 삭제와 렌더링 시간·프레임·메모리 캡처를 수행하지 않았다.
- 기능 PR: https://github.com/libitums/FE/pull/199.
- 대상 commit: `b47d292f` 이후 Android Apple 계정 삭제 변경.
- 기기: Android 15 API 35 ARM 전용 에뮬레이터, 390×844·160 dpi.
- OS: Android 15.
- Lynx SDK: 4.0.1.
- 빌드: 모의 Supabase URL의 번들 포함 APK와 운영 설정 모바일 Lynx 번들.
- 실행 회차: 01.

## 시나리오

- 전제: 전용 에뮬레이터에서 앱 상태를 지우고 로그인 화면을 연다. 실제 Apple 계정은 연결하지 않는다.
- 단계: Maestro로 최소 호스트 진입과 Apple·Google·Facebook 모의 OAuth 콜백을 확인한다. 앱·서버 통합 테스트로 삭제 직전 Apple 재인증, 계정 대조, 철회 실패 시 중단을 확인한다.
- 관찰 구간: 온보딩부터 로그인 오류 화면까지. 실제 계정 삭제 화면의 런타임 성능은 관찰하지 않았다.

## 분석 결과

- Android 최소 호스트 Maestro 1건, 모의 소셜 로그인 3건, 작은 화면·글자 배율 2건이 통과했다.
- 모바일 계정 삭제 unit 테스트 34건과 서버 삭제 핸들러 unit/integration 테스트 73건이 통과했다.
- 운영 설정 모바일 Lynx 번들은 1,410,751 bytes로 직전 1,408,482 bytes 대비 2,269 bytes 늘었다. 새 자산과 의존성은 없다.
- 실제 Apple 인증 창, 제공자 토큰 반환, Apple 토큰 철회, Supabase 사용자 삭제는 설정과 테스트 계정이 없어 실행하지 않았다.
- 렌더링 시간·프레임·메모리 수치는 수집하지 않았다.

## 해석

모의 호출에서는 기존 Supabase 사용자와 Apple subject가 일치할 때만 철회와 삭제가 이어진다.
실제 제공자가 새로고침 토큰을 반환하는지와 실제 계정 삭제의 성능은 아직 판정할 수 없다.

## 결론과 후속

Apple Services ID와 `APPLE_WEB_CLIENT_ID`를 연결한 테스트 환경에서 취소, 다른 Apple ID,
동일 Apple ID의 성공·철회·삭제를 수동으로 검증한다. 이 검증은 실제 테스트 계정으로만 수행한다.
