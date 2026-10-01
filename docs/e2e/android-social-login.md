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
