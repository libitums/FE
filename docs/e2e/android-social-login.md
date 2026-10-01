# Android 소셜 로그인 Maestro 확인

## 전제

Android API 35 전용 에뮬레이터를 세로 **390×844, 160 dpi, 글자 배율 1.0**으로 맞춘다.
`PUBLIC_SUPABASE_URL=https://example.invalid`와 테스트용 anon key를 넣어 만든
`bundled` APK를 설치한다. 이 주소는 실제 서버가 아니므로 세션을 만들지 않는다.
빌드·설치 명령은 [Android 호스트 README](../../apps/android/README.md#maestro-e2e)에 있다.

## A5 — 제공자별 인증 창과 모의 복귀

| 단계 | 행동 | 통과 기준 |
|---|---|---|
| A5-1 | 온보딩을 지나 Apple·Google·Facebook 버튼을 각각 누른다 | 브라우저 URL에 선택한 `provider`, `redirect_to=duru://auth-callback`, PKCE `code_challenge`가 있다 |
| A5-2 | `duru://auth-callback?code=fake`를 연다 | 앱으로 돌아와 코드 교환을 시도하고 연결 오류가 로그인 화면에 표시된다 |

`e2e/android-social-login.yaml`은 제공자와 버튼 접근성 이름을 변수로 받아 세 번 실행된다.
브라우저 URL은 접근성 트리의 문구로, 앱의 오류 화면은 390×844 화면 기준 이미지로
단언한다. 공통 버튼에 `flatten={false}`를 적용해 Android 접근성 트리에 이름을
노출한다. 화면 크기나 글자 배율을 바꾸면 기준 이미지를 갱신해야 한다.

```sh
E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:social
```

## 2026-10-01 실행 결과

커밋 `c8a47647`, API 35 ARM 전용 에뮬레이터, 390×844·160 dpi, 모의 URL의
`bundled` APK, Maestro 2.11.0에서 Apple·Google·Facebook
세 회차가 각각 통과했다. 각 회차가 제공자 URL의 PKCE challenge와 모의 딥링크 복귀 뒤
연결 오류 화면을 확인했다. 오류 화면 기준 이미지를 정상 로그인 화면에 대조했을 때는
99.5% 문턱에 미달하여 실패했다(실측 98.996%).
진입 안내·약관 문구 대비 변경 후 로그인·오류 화면 기준 이미지를 갱신했다.
공통 버튼의 Android 접근성 이름을 노출한 뒤에는 좌표 대신 각 소셜 버튼 이름으로
인증 창을 연다.

실제 제공자 계정 인증, 코드 교환 성공, 세션 저장·재시작·갱신(A3)은 포함되지 않는다.
Supabase·제공자 콘솔 설정과 테스트 계정이 준비되면 별도로 검증한다.

## Apple 계정 삭제 재인증 — 실제 제공자 설정 뒤 수동 검증

이 흐름은 Apple Services ID, Supabase Apple provider, 삭제 함수의
`APPLE_WEB_CLIENT_ID`가 같은 값으로 설정된 **전용 테스트 계정**에서만 실행한다.
Maestro의 모의 로그인 URL은 세션을 만들지 않으므로 계정 삭제 성공을 검증하지 못한다.

1. Android에서 Apple로 로그인하고 앱을 완전히 종료한 뒤 다시 열어 세션 유지 상태를 확인한다.
2. Settings → Delete account → 확인을 누른다. Apple 인증 창이 다시 열리는지 확인한다.
3. 인증 창을 취소하면 계정과 로그인 세션이 남는지 확인한다.
4. 같은 테스트 Apple ID로 다시 시도해 완료하면 앱이 로그인 전 화면으로 돌아가고 Supabase
   사용자가 삭제됐는지 확인한다. 서버 로그에 토큰·코드·사용자 ID가 없는지도 확인한다.
5. 별도의 테스트 계정에서 다른 Apple ID로 재인증하면 삭제가 거절되고 기존 계정이 남는지
   확인한다. 제공자 토큰이 반환되지 않는 환경도 삭제를 중단해야 한다.

실제 Apple 인증·철회·관리자 삭제는 아직 실행하지 않았다. 모의 unit/integration 테스트는
원래 Supabase 사용자와 Apple subject 대조, 토큰 누락·오류·취소에서의 삭제 중단을 확인한다.

## 실제 제공자 페이지 사전 검증

Google Play API 35 에뮬레이터에는 Chrome이 있다. 실제 설정을 담은 무시된
`apps/mobile/.env.local`을 준비하고 다음을 실행한다. 검사기는 URL·anon key 값을
출력하지 않고 서버의 세 제공자 활성 플래그와 빌드된 번들에 실제 URL이 포함됐는지만
확인한다. Maestro는 390×844·160 dpi에서 각 버튼을 눌러 제공자 로그인 도메인이
열리는지 검사한다. 계정 입력은 하지 않는다.

```sh
E2E_UDID=<Google Play 에뮬레이터 ID> pnpm test:e2e:android:social:live
```

2026-10-02 실행 결과: 공개 설정에서는 Apple·Google·Facebook이 모두 활성으로
보였다. Google은 `accounts.google.com`, Facebook은 `m.facebook.com` 로그인 화면에
도달했다. Apple은 제공자 화면에 도달하지 못했고 Supabase가
`validation_failed` / `Unsupported provider: missing OAuth secret`을 반환했다.
따라서 Apple Services ID의 웹 OAuth secret 설정을 고친 뒤 같은 사전 검증을
다시 통과시켜야 한다. 활성 플래그만으로 실제 인증 가능성을 판정하면 안 된다.

테스트 계정이 아직 없어 세 제공자의 실제 코드 교환·앱 복귀·세션 저장·재시작·
서버 갱신 성공은 미검증이다. 계정 준비 후 각 제공자에서 로그인 → 여정 화면 →
앱 강제 종료·재실행 → 여정 화면과 갱신 상태를 확인한다. 거부된 갱신의 세션 삭제
경로는 `apps/android/test-session-resume.sh`의 모의 서버 계측 4건이 통과했다.
